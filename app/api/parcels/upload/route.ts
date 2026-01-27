import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { sendParcelArrivalNotification } from "@/lib/twilio/notifications/parcel"

export async function POST(request: Request) {
    try {
        const formData = await request.formData()

        const residentId = formData.get("resident_id") as string
        const description = formData.get("description") as string | null
        const senderName = formData.get("sender_name") as string | null
        const courierName = formData.get("courier_name") as string | null
        const imageFile = formData.get("image") as File | null

        if (!residentId) {
            return NextResponse.json(
                { success: false, error: "Resident ID is required" },
                { status: 400 }
            )
        }

        if (!imageFile) {
            return NextResponse.json(
                { success: false, error: "Image is required" },
                { status: 400 }
            )
        }

        // Validate file is an image
        if (!imageFile.type.startsWith("image/")) {
            return NextResponse.json(
                { success: false, error: "File must be an image" },
                { status: 400 }
            )
        }

        // Generate unique filename
        const timestamp = Date.now()
        const extension = imageFile.name.split(".").pop() || "jpg"
        const fileName = `${residentId}/${timestamp}.${extension}`

        // Convert file to buffer
        const arrayBuffer = await imageFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload to Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
            .from("parcels")
            .upload(fileName, buffer, {
                contentType: imageFile.type,
                upsert: false,
            })

        if (uploadError) {
            console.error("[Parcel Upload] Storage error:", uploadError)
            return NextResponse.json(
                { success: false, error: "Failed to upload image" },
                { status: 500 }
            )
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from("parcels")
            .getPublicUrl(fileName)

        const imageUrl = urlData.publicUrl

        // Insert parcel record
        const { data: parcel, error: insertError } = await supabaseAdmin
            .from("parcels")
            .insert({
                resident_id: residentId,
                description: description || null,
                sender_name: senderName || null,
                courier_name: courierName || null,
                image_url: imageUrl,
                status: "pending",
            })
            .select(`
                *,
                profiles (
                    id,
                    name,
                    phone_number,
                    apartment_number
                )
            `)
            .single()

        if (insertError || !parcel) {
            console.error("[Parcel Upload] Insert error:", insertError)
            return NextResponse.json(
                { success: false, error: "Failed to save parcel record" },
                { status: 500 }
            )
        }

        // Send WhatsApp notification
        if (parcel.profiles?.phone_number) {
            const notifyResult = await sendParcelArrivalNotification({
                phone: parcel.profiles.phone_number,
                residentName: parcel.profiles.name || "Resident",
                apartmentNumber: parcel.profiles.apartment_number || "",
                description: parcel.description,
                senderName: parcel.sender_name,
                courierName: parcel.courier_name,
                imageUrl: parcel.image_url,
            })

            // Update notified_at timestamp
            if (notifyResult.ok) {
                await supabaseAdmin
                    .from("parcels")
                    .update({ notified_at: new Date().toISOString() })
                    .eq("id", parcel.id)
            } else {
                console.error("[Parcel Upload] Notification failed:", notifyResult.error)
            }
        }

        return NextResponse.json({
            success: true,
            parcel: parcel,
            message: "Parcel registered and resident notified",
        })
    } catch (error) {
        console.error("[Parcel Upload] Error:", error)
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        )
    }
}

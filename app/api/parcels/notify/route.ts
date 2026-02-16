import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { sendParcelArrivalNotification } from "@/lib/twilio/notifications/parcel"
import { verifyAdminAccess } from "@/lib/auth/api-auth"

export async function POST(request: Request) {
    const { authenticated, error: authError } = await verifyAdminAccess("parcels")
    if (!authenticated) {
        return NextResponse.json({ error: authError }, { status: 401 })
    }

    try {
        const { parcelId } = await request.json()

        if (!parcelId) {
            return NextResponse.json(
                { success: false, error: "Parcel ID is required" },
                { status: 400 }
            )
        }

        // Fetch parcel with resident profile
        const { data: parcel, error: fetchError } = await supabaseAdmin
            .from("parcels")
            .select(`
                *,
                profiles (
                    id,
                    name,
                    phone_number,
                    apartment_number
                )
            `)
            .eq("id", parcelId)
            .single()

        if (fetchError || !parcel) {
            console.error("[Parcel Notify] Fetch error:", fetchError)
            return NextResponse.json(
                { success: false, error: "Parcel not found" },
                { status: 404 }
            )
        }

        if (!parcel.profiles?.phone_number) {
            return NextResponse.json(
                { success: false, error: "Resident phone number not found" },
                { status: 400 }
            )
        }

        // Send WhatsApp notification
        const result = await sendParcelArrivalNotification({
            phone: parcel.profiles.phone_number,
            residentName: parcel.profiles.name || "Resident",
            apartmentNumber: parcel.profiles.apartment_number || "",
            description: parcel.description,
            senderName: parcel.sender_name,
            courierName: parcel.courier_name,
            imageUrl: parcel.image_url,
        })

        if (!result.ok) {
            console.error("[Parcel Notify] Notification failed:", result.error)
            return NextResponse.json(
                { success: false, error: "Failed to send notification" },
                { status: 500 }
            )
        }

        // Update notified_at timestamp
        await supabaseAdmin
            .from("parcels")
            .update({ notified_at: new Date().toISOString() })
            .eq("id", parcelId)

        return NextResponse.json({
            success: true,
            message: "Notification sent successfully",
        })
    } catch (error) {
        console.error("[Parcel Notify] Error:", error)
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        )
    }
}

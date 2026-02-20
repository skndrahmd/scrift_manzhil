import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { sendParcelCollectionNotification } from "@/lib/twilio/notifications/parcel"
import { verifyAdminAccess } from "@/lib/auth/api-auth"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
    const { authenticated, error: authError } = await verifyAdminAccess("parcels")
    if (!authenticated) {
        return NextResponse.json({ error: authError }, { status: 401 })
    }

    try {
        const { parcelId, collectorName, collectorPhone, collectorCnic } = await request.json()

        if (!parcelId || !collectorName || !collectorPhone || !collectorCnic) {
            return NextResponse.json(
                { success: false, error: "Parcel ID, collector name, phone, and CNIC are required" },
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
            console.error("[Parcel Collect] Fetch error:", fetchError)
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

        // Update parcel: mark as collected and store collector info
        const { data: updatedParcel, error: updateError } = await supabaseAdmin
            .from("parcels")
            .update({
                status: "collected",
                collected_at: new Date().toISOString(),
                collector_name: collectorName,
                collector_phone: collectorPhone,
                collector_cnic: collectorCnic,
            })
            .eq("id", parcelId)
            .select()
            .single()

        if (updateError) {
            console.error("[Parcel Collect] Update error:", updateError)
            return NextResponse.json(
                { success: false, error: "Failed to update parcel" },
                { status: 500 }
            )
        }

        // Send WhatsApp notification to resident
        const result = await sendParcelCollectionNotification({
            phone: parcel.profiles.phone_number,
            residentName: parcel.profiles.name || "Resident",
            collectorName,
            collectorPhone,
            collectorCnic,
        })

        if (!result.ok) {
            console.error("[Parcel Collect] Notification failed:", result.error)
            // Parcel is already marked collected — return success but warn about notification
            return NextResponse.json({
                success: true,
                parcel: updatedParcel,
                message: "Parcel marked as collected but notification failed to send",
                notificationFailed: true,
            })
        }

        return NextResponse.json({
            success: true,
            parcel: updatedParcel,
            message: "Parcel collected and resident notified",
        })
    } catch (error) {
        console.error("[Parcel Collect] Error:", error)
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        )
    }
}

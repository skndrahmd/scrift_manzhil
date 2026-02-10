import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { verifyAdminAccess } from "@/lib/api-auth"
import { sendVisitorArrivalNotification } from "@/lib/twilio/notifications/visitor"

export async function POST(request: Request) {
    try {
        const { authenticated, error: authError } = await verifyAdminAccess("visitors")
        if (!authenticated) {
            return NextResponse.json({ error: authError }, { status: 401 })
        }

        const { residentId, visitorName, carNumber, cnicImageUrl } = await request.json()

        if (!residentId) {
            return NextResponse.json(
                { success: false, error: "Resident ID is required" },
                { status: 400 }
            )
        }

        // Validate resident exists
        const { data: resident, error: residentError } = await supabaseAdmin
            .from("profiles")
            .select("id, name, phone_number, apartment_number")
            .eq("id", residentId)
            .single()

        if (residentError || !resident) {
            return NextResponse.json(
                { success: false, error: "Resident not found" },
                { status: 404 }
            )
        }

        // Calculate daily entry number
        const today = new Date().toISOString().split("T")[0]

        const { count, error: countError } = await supabaseAdmin
            .from("visitor_passes")
            .select("*", { count: "exact", head: true })
            .eq("visit_date", today)
            .not("daily_entry_number", "is", null)

        if (countError) {
            console.error("[Visitor Create] Error counting entries:", countError)
            return NextResponse.json(
                { success: false, error: "Failed to calculate entry number" },
                { status: 500 }
            )
        }

        const dailyEntryNumber = (count || 0) + 1

        // Insert visitor pass with arrived status
        const { data: visitorPass, error: insertError } = await supabaseAdmin
            .from("visitor_passes")
            .insert({
                resident_id: residentId,
                visitor_name: visitorName || null,
                car_number: carNumber || null,
                cnic_image_url: cnicImageUrl || null,
                visit_date: today,
                status: "arrived",
                daily_entry_number: dailyEntryNumber,
                notified_at: new Date().toISOString(),
                visitor_cnic: null,
                visitor_phone: null,
            })
            .select()
            .single()

        if (insertError) {
            console.error("[Visitor Create] Error inserting:", insertError)
            return NextResponse.json(
                { success: false, error: "Failed to create visitor entry" },
                { status: 500 }
            )
        }

        // Send WhatsApp notification to resident
        if (resident.phone_number) {
            const result = await sendVisitorArrivalNotification({
                phone: resident.phone_number,
                residentName: resident.name || "Resident",
                apartmentNumber: resident.apartment_number || "",
                cnicImageUrl: cnicImageUrl || null,
                visitDate: today,
                entryNumber: dailyEntryNumber,
                carNumber: carNumber || null,
            })

            if (!result.ok) {
                console.error("[Visitor Create] Failed to send notification:", result.error)
            }
        }

        return NextResponse.json({
            success: true,
            entryNumber: dailyEntryNumber,
            message: `Entry #${dailyEntryNumber} created — resident notified`,
        })
    } catch (error) {
        console.error("[Visitor Create] Error:", error)
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        )
    }
}

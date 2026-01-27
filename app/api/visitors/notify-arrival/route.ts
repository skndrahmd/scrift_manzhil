import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { sendVisitorArrivalNotification } from "@/lib/twilio/notifications/visitor"

export async function POST(request: Request) {
    try {
        const { visitorPassId } = await request.json()

        if (!visitorPassId) {
            return NextResponse.json(
                { success: false, error: "Visitor pass ID is required" },
                { status: 400 }
            )
        }

        // Fetch the visitor pass with resident profile
        const { data: visitorPass, error: fetchError } = await supabase
            .from("visitor_passes")
            .select(`
        *,
        profiles (
          id,
          name,
          phone_number,
          apartment_number
        )
      `)
            .eq("id", visitorPassId)
            .single()

        if (fetchError || !visitorPass) {
            console.error("[Visitor Notify] Error fetching visitor pass:", fetchError)
            return NextResponse.json(
                { success: false, error: "Visitor pass not found" },
                { status: 404 }
            )
        }

        // Check if already notified
        if (visitorPass.status === "arrived") {
            return NextResponse.json(
                { success: false, error: "Visitor has already been marked as arrived" },
                { status: 400 }
            )
        }

        // Update visitor pass status to arrived
        const { error: updateError } = await supabase
            .from("visitor_passes")
            .update({
                status: "arrived",
                notified_at: new Date().toISOString(),
            })
            .eq("id", visitorPassId)

        if (updateError) {
            console.error("[Visitor Notify] Error updating status:", updateError)
            return NextResponse.json(
                { success: false, error: "Failed to update visitor status" },
                { status: 500 }
            )
        }

        // Send WhatsApp notification to resident
        if (visitorPass.profiles?.phone_number) {
            const result = await sendVisitorArrivalNotification({
                phone: visitorPass.profiles.phone_number,
                residentName: visitorPass.profiles.name || "Resident",
                apartmentNumber: visitorPass.profiles.apartment_number || "",
                visitorName: visitorPass.visitor_name,
                visitorCnic: visitorPass.visitor_cnic,
                visitorPhone: visitorPass.visitor_phone,
                visitDate: visitorPass.visit_date,
            })

            if (!result.ok) {
                console.error("[Visitor Notify] Failed to send notification:", result.error)
                // Don't fail the request, just log the error
                // The status was already updated successfully
            }
        }

        return NextResponse.json({
            success: true,
            message: "Visitor marked as arrived and resident notified",
        })
    } catch (error) {
        console.error("[Visitor Notify] Error:", error)
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        )
    }
}

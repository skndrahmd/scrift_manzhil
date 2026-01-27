import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(request: Request) {
    try {
        const { parcelId, status } = await request.json()

        if (!parcelId) {
            return NextResponse.json(
                { success: false, error: "Parcel ID is required" },
                { status: 400 }
            )
        }

        if (!status || !["pending", "collected", "returned"].includes(status)) {
            return NextResponse.json(
                { success: false, error: "Invalid status. Must be 'pending', 'collected', or 'returned'" },
                { status: 400 }
            )
        }

        const updateData: Record<string, unknown> = { status }

        // Set collected_at if marking as collected
        if (status === "collected") {
            updateData.collected_at = new Date().toISOString()
        } else if (status === "pending") {
            updateData.collected_at = null
        }

        const { data: parcel, error: updateError } = await supabaseAdmin
            .from("parcels")
            .update(updateData)
            .eq("id", parcelId)
            .select()
            .single()

        if (updateError) {
            console.error("[Parcel Update Status] Error:", updateError)
            return NextResponse.json(
                { success: false, error: "Failed to update parcel status" },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            parcel: parcel,
            message: `Parcel marked as ${status}`,
        })
    } catch (error) {
        console.error("[Parcel Update Status] Error:", error)
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        )
    }
}

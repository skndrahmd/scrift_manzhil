import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
    try {
        const { data: parcels, error } = await supabaseAdmin
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
            .order("created_at", { ascending: false })

        if (error) {
            console.error("[Parcel List] Error:", error)
            return NextResponse.json(
                { success: false, error: "Failed to fetch parcels" },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            parcels: parcels || [],
        })
    } catch (error) {
        console.error("[Parcel List] Error:", error)
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        )
    }
}

import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = 'force-dynamic'

// GET /api/payment-methods - Public endpoint returning enabled payment methods
export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from("payment_methods")
            .select("*")
            .eq("is_enabled", true)
            .order("sort_order", { ascending: true })

        if (error) throw error

        return NextResponse.json({ methods: data || [] })
    } catch (error: any) {
        console.error("Error fetching payment methods:", error)
        return NextResponse.json(
            { error: error.message || "Failed to fetch payment methods" },
            { status: 500 }
        )
    }
}

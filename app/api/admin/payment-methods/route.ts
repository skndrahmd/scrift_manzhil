import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { verifyAdminAccess } from "@/lib/auth/api-auth"

export const dynamic = 'force-dynamic'

const VALID_TYPES = ['jazzcash', 'easypaisa', 'bank_transfer']

// GET /api/admin/payment-methods - List all payment methods
export async function GET() {
    const { authenticated, error: authError } = await verifyAdminAccess("settings")
    if (!authenticated) {
        return NextResponse.json({ error: authError }, { status: 401 })
    }

    try {
        const { data, error } = await supabaseAdmin
            .from("payment_methods")
            .select("*")
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

// POST /api/admin/payment-methods - Create a new payment method
export async function POST(request: NextRequest) {
    const { authenticated, error: authError } = await verifyAdminAccess("settings")
    if (!authenticated) {
        return NextResponse.json({ error: authError }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { type, account_title, account_number, bank_name, is_enabled, sort_order } = body

        if (!type || !VALID_TYPES.includes(type)) {
            return NextResponse.json(
                { error: "Invalid type. Must be jazzcash, easypaisa, or bank_transfer" },
                { status: 400 }
            )
        }

        if (!account_title || !account_number) {
            return NextResponse.json(
                { error: "Account title and account number are required" },
                { status: 400 }
            )
        }

        const { data, error } = await supabaseAdmin
            .from("payment_methods")
            .insert({
                type,
                account_title,
                account_number,
                bank_name: type === 'bank_transfer' ? bank_name : null,
                is_enabled: is_enabled ?? true,
                sort_order: sort_order ?? 0,
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ method: data })
    } catch (error: any) {
        console.error("Error creating payment method:", error)
        return NextResponse.json(
            { error: error.message || "Failed to create payment method" },
            { status: 500 }
        )
    }
}

// PUT /api/admin/payment-methods - Update a payment method
export async function PUT(request: NextRequest) {
    const { authenticated, error: authError } = await verifyAdminAccess("settings")
    if (!authenticated) {
        return NextResponse.json({ error: authError }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { id, ...updateData } = body

        if (!id) {
            return NextResponse.json(
                { error: "Payment method ID is required" },
                { status: 400 }
            )
        }

        if (updateData.type && !VALID_TYPES.includes(updateData.type)) {
            return NextResponse.json(
                { error: "Invalid type. Must be jazzcash, easypaisa, or bank_transfer" },
                { status: 400 }
            )
        }

        // Clear bank_name if type is not bank_transfer
        if (updateData.type && updateData.type !== 'bank_transfer') {
            updateData.bank_name = null
        }

        updateData.updated_at = new Date().toISOString()

        const { data, error } = await supabaseAdmin
            .from("payment_methods")
            .update(updateData)
            .eq("id", id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ method: data })
    } catch (error: any) {
        console.error("Error updating payment method:", error)
        return NextResponse.json(
            { error: error.message || "Failed to update payment method" },
            { status: 500 }
        )
    }
}

// DELETE /api/admin/payment-methods?id=xxx - Delete a payment method
export async function DELETE(request: NextRequest) {
    const { authenticated, error: authError } = await verifyAdminAccess("settings")
    if (!authenticated) {
        return NextResponse.json({ error: authError }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json(
                { error: "Payment method ID is required" },
                { status: 400 }
            )
        }

        const { error } = await supabaseAdmin
            .from("payment_methods")
            .delete()
            .eq("id", id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Error deleting payment method:", error)
        return NextResponse.json(
            { error: error.message || "Failed to delete payment method" },
            { status: 500 }
        )
    }
}

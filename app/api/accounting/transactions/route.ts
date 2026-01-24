import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = 'force-dynamic'

// GET /api/accounting/transactions - Fetch transactions with filters
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get("type")
        const startDate = searchParams.get("startDate")
        const endDate = searchParams.get("endDate")
        const profileId = searchParams.get("profileId")
        const page = parseInt(searchParams.get("page") || "1")
        const limit = parseInt(searchParams.get("limit") || "50")
        const offset = (page - 1) * limit

        let query = supabase
            .from("transactions")
            .select(`
        *,
        profiles (id, name, phone_number, apartment_number)
      `, { count: 'exact' })
            .order("transaction_date", { ascending: false })
            .order("created_at", { ascending: false })

        // Apply filters
        if (type && type !== "all") {
            query = query.eq("transaction_type", type)
        }
        if (startDate) {
            query = query.gte("transaction_date", startDate)
        }
        if (endDate) {
            query = query.lte("transaction_date", endDate)
        }
        if (profileId) {
            query = query.eq("profile_id", profileId)
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1)

        const { data, error, count } = await query

        if (error) throw error

        return NextResponse.json({
            transactions: data || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        })
    } catch (error: any) {
        console.error("Error fetching transactions:", error)
        return NextResponse.json(
            { error: error.message || "Failed to fetch transactions" },
            { status: 500 }
        )
    }
}

// POST /api/accounting/transactions - Create a new transaction
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        const {
            transaction_type,
            reference_id,
            profile_id,
            amount,
            description,
            transaction_date,
            payment_method,
            receipt_number,
            notes
        } = body

        if (!transaction_type || !amount || !transaction_date) {
            return NextResponse.json(
                { error: "Missing required fields: transaction_type, amount, transaction_date" },
                { status: 400 }
            )
        }

        const { data, error } = await supabase
            .from("transactions")
            .insert({
                transaction_type,
                reference_id,
                profile_id,
                amount,
                description,
                transaction_date,
                payment_method,
                receipt_number,
                notes
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ transaction: data })
    } catch (error: any) {
        console.error("Error creating transaction:", error)
        return NextResponse.json(
            { error: error.message || "Failed to create transaction" },
            { status: 500 }
        )
    }
}

// DELETE /api/accounting/transactions - Delete a transaction
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json(
                { error: "Transaction ID is required" },
                { status: 400 }
            )
        }

        const { error } = await supabase
            .from("transactions")
            .delete()
            .eq("id", id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Error deleting transaction:", error)
        return NextResponse.json(
            { error: error.message || "Failed to delete transaction" },
            { status: 500 }
        )
    }
}

import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = 'force-dynamic'

// GET /api/accounting/expenses - Fetch expenses with filters
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const categoryId = searchParams.get("categoryId")
        const startDate = searchParams.get("startDate")
        const endDate = searchParams.get("endDate")
        const isRecurring = searchParams.get("isRecurring")
        const page = parseInt(searchParams.get("page") || "1")
        const limit = parseInt(searchParams.get("limit") || "50")
        const offset = (page - 1) * limit

        let query = supabase
            .from("expenses")
            .select(`
        *,
        expense_categories (id, name, icon, color)
      `, { count: 'exact' })
            .order("expense_date", { ascending: false })

        // Apply filters
        if (categoryId && categoryId !== "all") {
            query = query.eq("category_id", categoryId)
        }
        if (startDate) {
            query = query.gte("expense_date", startDate)
        }
        if (endDate) {
            query = query.lte("expense_date", endDate)
        }
        if (isRecurring === "true") {
            query = query.eq("is_recurring", true)
        } else if (isRecurring === "false") {
            query = query.eq("is_recurring", false)
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1)

        const { data, error, count } = await query

        if (error) throw error

        return NextResponse.json({
            expenses: data || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        })
    } catch (error: any) {
        console.error("Error fetching expenses:", error)
        return NextResponse.json(
            { error: error.message || "Failed to fetch expenses" },
            { status: 500 }
        )
    }
}

// POST /api/accounting/expenses - Create a new expense
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        const {
            category_id,
            amount,
            description,
            expense_date,
            vendor_name,
            receipt_url,
            payment_method,
            is_recurring,
            recurrence_interval,
            next_due_date,
            notes
        } = body

        if (!amount || !description || !expense_date) {
            return NextResponse.json(
                { error: "Missing required fields: amount, description, expense_date" },
                { status: 400 }
            )
        }

        const { data, error } = await supabase
            .from("expenses")
            .insert({
                category_id,
                amount,
                description,
                expense_date,
                vendor_name,
                receipt_url,
                payment_method,
                is_recurring: is_recurring || false,
                recurrence_interval,
                next_due_date,
                notes
            })
            .select(`
        *,
        expense_categories (id, name, icon, color)
      `)
            .single()

        if (error) throw error

        // Also create a transaction record for this expense
        await supabase.from("transactions").insert({
            transaction_type: "expense",
            reference_id: data.id,
            amount: -Math.abs(amount), // Expenses are negative
            description: `Expense: ${description}`,
            transaction_date: expense_date,
            payment_method,
            notes
        })

        return NextResponse.json({ expense: data })
    } catch (error: any) {
        console.error("Error creating expense:", error)
        return NextResponse.json(
            { error: error.message || "Failed to create expense" },
            { status: 500 }
        )
    }
}

// PUT /api/accounting/expenses - Update an expense
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, ...updateData } = body

        if (!id) {
            return NextResponse.json(
                { error: "Expense ID is required" },
                { status: 400 }
            )
        }

        const { data, error } = await supabase
            .from("expenses")
            .update(updateData)
            .eq("id", id)
            .select(`
        *,
        expense_categories (id, name, icon, color)
      `)
            .single()

        if (error) throw error

        return NextResponse.json({ expense: data })
    } catch (error: any) {
        console.error("Error updating expense:", error)
        return NextResponse.json(
            { error: error.message || "Failed to update expense" },
            { status: 500 }
        )
    }
}

// DELETE /api/accounting/expenses - Delete an expense
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json(
                { error: "Expense ID is required" },
                { status: 400 }
            )
        }

        // Also delete the associated transaction
        await supabase
            .from("transactions")
            .delete()
            .eq("reference_id", id)
            .eq("transaction_type", "expense")

        const { error } = await supabase
            .from("expenses")
            .delete()
            .eq("id", id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Error deleting expense:", error)
        return NextResponse.json(
            { error: error.message || "Failed to delete expense" },
            { status: 500 }
        )
    }
}

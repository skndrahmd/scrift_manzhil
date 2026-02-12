import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = 'force-dynamic'

// GET /api/accounting/categories - Fetch all expense categories
export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from("expense_categories")
            .select("*")
            .eq("is_active", true)
            .order("name", { ascending: true })

        if (error) throw error

        return NextResponse.json({ categories: data || [] })
    } catch (error: any) {
        console.error("Error fetching expense categories:", error)
        return NextResponse.json(
            { error: error.message || "Failed to fetch categories" },
            { status: 500 }
        )
    }
}

// POST /api/accounting/categories - Create a new category
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, description, icon, color } = body

        if (!name) {
            return NextResponse.json(
                { error: "Category name is required" },
                { status: 400 }
            )
        }

        const { data, error } = await supabaseAdmin
            .from("expense_categories")
            .insert({
                name,
                description,
                icon: icon || "folder",
                color: color || "#6b7280"
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ category: data })
    } catch (error: any) {
        console.error("Error creating category:", error)
        return NextResponse.json(
            { error: error.message || "Failed to create category" },
            { status: 500 }
        )
    }
}

// PUT /api/accounting/categories - Update a category
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, ...updateData } = body

        if (!id) {
            return NextResponse.json(
                { error: "Category ID is required" },
                { status: 400 }
            )
        }

        const { data, error } = await supabaseAdmin
            .from("expense_categories")
            .update(updateData)
            .eq("id", id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ category: data })
    } catch (error: any) {
        console.error("Error updating category:", error)
        return NextResponse.json(
            { error: error.message || "Failed to update category" },
            { status: 500 }
        )
    }
}

// DELETE /api/accounting/categories - Soft delete (deactivate) a category
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json(
                { error: "Category ID is required" },
                { status: 400 }
            )
        }

        // Soft delete - just mark as inactive
        const { error } = await supabaseAdmin
            .from("expense_categories")
            .update({ is_active: false })
            .eq("id", id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Error deleting category:", error)
        return NextResponse.json(
            { error: error.message || "Failed to delete category" },
            { status: 500 }
        )
    }
}

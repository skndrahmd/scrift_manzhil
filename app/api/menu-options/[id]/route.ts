import { NextResponse } from "next/server"
import { isSuperAdmin } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = "force-dynamic"

/**
 * PATCH /api/menu-options/[id]
 * Update a single menu option's label, emoji, or is_enabled.
 * Requires super_admin role.
 *
 * Request body (all fields optional):
 * {
 *   label?: string,
 *   emoji?: string,
 *   is_enabled?: boolean
 * }
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const isAdmin = await isSuperAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = params

  try {
    const body = await req.json()
    const updateData: Record<string, any> = {}

    if (typeof body.label === "string" && body.label.trim()) {
      updateData.label = body.label.trim()
    }
    if (typeof body.emoji === "string" && body.emoji.trim()) {
      updateData.emoji = body.emoji.trim()
    }
    if (typeof body.is_enabled === "boolean") {
      updateData.is_enabled = body.is_enabled
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("menu_options")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error(`[PATCH /api/menu-options/${id}] DB error:`, error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Menu option not found" }, { status: 404 })
    }

    return NextResponse.json({ option: data })
  } catch (err) {
    console.error(`[PATCH /api/menu-options/${id}] Unexpected error:`, err)
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}

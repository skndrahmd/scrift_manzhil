import { NextResponse } from "next/server"
import { isSuperAdmin } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * GET /api/menu-options
 * Returns all menu options (including disabled) for the admin UI.
 * Requires super_admin role.
 */
export async function GET() {
  const isAdmin = await isSuperAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from("menu_options")
    .select("*")
    .order("sort_order", { ascending: true })

  if (error) {
    console.error("[GET /api/menu-options] DB error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ options: data })
}

/**
 * PUT /api/menu-options
 * Bulk update: accepts array of { id, sort_order, is_enabled } to reorder and toggle options.
 * Requires super_admin role.
 *
 * Request body:
 * {
 *   options: [
 *     { id: "uuid", sort_order: 1, is_enabled: true },
 *     { id: "uuid", sort_order: 2, is_enabled: false },
 *     ...
 *   ]
 * }
 */
export async function PUT(req: Request) {
  const isAdmin = await isSuperAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { options } = body

    if (!Array.isArray(options) || options.length === 0) {
      return NextResponse.json({ error: "options array is required" }, { status: 400 })
    }

    // Validate each item has required fields
    for (const opt of options) {
      if (!opt.id || typeof opt.sort_order !== "number" || typeof opt.is_enabled !== "boolean") {
        return NextResponse.json(
          { error: "Each option must have id (string), sort_order (number), and is_enabled (boolean)" },
          { status: 400 }
        )
      }
    }

    // Update each option individually (Supabase doesn't support bulk upsert with different values easily)
    const errors: string[] = []
    for (const opt of options) {
      const { error } = await supabaseAdmin
        .from("menu_options")
        .update({
          sort_order: opt.sort_order,
          is_enabled: opt.is_enabled,
        })
        .eq("id", opt.id)

      if (error) {
        errors.push(`Failed to update ${opt.id}: ${error.message}`)
      }
    }

    if (errors.length > 0) {
      console.error("[PUT /api/menu-options] Partial errors:", errors)
      return NextResponse.json({ error: "Some updates failed", details: errors }, { status: 500 })
    }

    // Return updated list
    const { data, error: fetchError } = await supabaseAdmin
      .from("menu_options")
      .select("*")
      .order("sort_order", { ascending: true })

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    return NextResponse.json({ options: data })
  } catch (err) {
    console.error("[PUT /api/menu-options] Unexpected error:", err)
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}

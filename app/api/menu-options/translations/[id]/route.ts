/**
 * PATCH /api/menu-options/translations/[id]
 * Update a single menu option translation.
 */

import { NextResponse } from "next/server"
import { isSuperAdmin } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const { id } = params
    const body = await req.json()
    const { translated_label } = body

    if (!translated_label || typeof translated_label !== "string" || !translated_label.trim()) {
      return NextResponse.json({ error: "translated_label is required" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("menu_option_translations")
      .update({
        translated_label: translated_label.trim(),
        is_stale: false,
        is_auto_translated: false, // Mark as manually edited
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[PATCH translation] DB error:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Translation not found" }, { status: 404 })
    }

    return NextResponse.json({ translation: data })
  } catch (error) {
    console.error("[PATCH translation] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

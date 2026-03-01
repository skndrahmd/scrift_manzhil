/**
 * GET /api/menu-options/[id]/translations
 * Returns all translations for a specific menu option.
 */

import { NextResponse } from "next/server"
import { isSuperAdmin } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const { id } = params

    const { data, error } = await supabaseAdmin
      .from("menu_option_translations")
      .select("*")
      .eq("menu_option_id", id)

    if (error) {
      console.error("[GET translations] DB error:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ translations: data || [] })
  } catch (error) {
    console.error("[GET translations] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

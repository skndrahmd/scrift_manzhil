/**
 * PATCH /api/languages/[code] — Toggle language enabled status
 * DELETE /api/languages/[code] — Remove language and all translations
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isSuperAdmin } from "@/lib/auth/api-auth"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const { code } = await params
    const body = await request.json()
    const { is_enabled } = body

    if (typeof is_enabled !== "boolean") {
      return NextResponse.json(
        { error: "is_enabled must be a boolean" },
        { status: 400 }
      )
    }

    // If enabling, check max 5
    if (is_enabled) {
      const { count } = await supabaseAdmin
        .from("enabled_languages")
        .select("id", { count: "exact", head: true })
        .eq("is_enabled", true)

      if ((count ?? 0) >= 5) {
        return NextResponse.json(
          { error: "Maximum 5 languages can be enabled at once" },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabaseAdmin
      .from("enabled_languages")
      .update({ is_enabled, updated_at: new Date().toISOString() })
      .eq("language_code", code)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Language not found" }, { status: 404 })
    }

    return NextResponse.json({ language: data })
  } catch (error) {
    console.error("[Languages API] PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const { code } = await params

    // Delete translations first (cascade should handle this, but be explicit)
    await supabaseAdmin
      .from("bot_message_translations")
      .delete()
      .eq("language_code", code)

    // Delete the language
    const { error } = await supabaseAdmin
      .from("enabled_languages")
      .delete()
      .eq("language_code", code)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Languages API] DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

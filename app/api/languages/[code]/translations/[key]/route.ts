/**
 * PATCH /api/languages/[code]/translations/[key]
 * Update the translated_text for a specific message in a specific language.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyAdminAccess } from "@/lib/auth/api-auth"
import { supabaseAdmin } from "@/lib/supabase"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; key: string }> }
) {
  try {
    const { authenticated, adminUser } = await verifyAdminAccess()

    if (!authenticated || adminUser?.role !== "super_admin") {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const { code, key } = await params
    const body = await request.json()
    const { translated_text } = body

    if (typeof translated_text !== "string") {
      return NextResponse.json(
        { error: "translated_text must be a string" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("bot_message_translations")
      .update({
        translated_text,
        is_auto_translated: false,
        updated_at: new Date().toISOString(),
        updated_by: adminUser!.id,
      })
      .eq("message_key", key)
      .eq("language_code", code)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Translation not found" }, { status: 404 })
    }

    return NextResponse.json({ translation: data })
  } catch (error) {
    console.error("[Translations API] PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

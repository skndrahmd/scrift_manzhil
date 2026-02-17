/**
 * GET /api/languages/[code]/translations
 * Returns all translations for a language, grouped by flow_group.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isSuperAdmin } from "@/lib/auth/api-auth"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const { code } = await params

    // Fetch bot messages with their translations for this language
    const { data: messages, error: msgError } = await supabaseAdmin
      .from("bot_messages")
      .select("message_key, flow_group, label, description, default_text, custom_text, variables, sort_order")
      .order("flow_group")
      .order("sort_order")

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    const { data: translations, error: transError } = await supabaseAdmin
      .from("bot_message_translations")
      .select("message_key, translated_text, is_auto_translated, updated_at")
      .eq("language_code", code)

    if (transError) {
      return NextResponse.json({ error: transError.message }, { status: 500 })
    }

    // Build a lookup map for translations
    const transMap = new Map(
      translations?.map((t) => [t.message_key, t]) || []
    )

    // Merge and group by flow_group
    const grouped: Record<string, any[]> = {}
    for (const msg of messages || []) {
      const trans = transMap.get(msg.message_key)
      const entry = {
        ...msg,
        english_text: msg.custom_text ?? msg.default_text,
        translated_text: trans?.translated_text || "",
        is_auto_translated: trans?.is_auto_translated ?? true,
        translation_updated_at: trans?.updated_at || null,
      }

      if (!grouped[msg.flow_group]) {
        grouped[msg.flow_group] = []
      }
      grouped[msg.flow_group].push(entry)
    }

    return NextResponse.json({ translations: grouped })
  } catch (error) {
    console.error("[Translations API] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

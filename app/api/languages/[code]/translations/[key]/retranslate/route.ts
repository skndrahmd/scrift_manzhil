/**
 * POST /api/languages/[code]/translations/[key]/retranslate
 * Re-translate a single message from English using Google Translate.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isSuperAdmin } from "@/lib/auth/api-auth"
import { supabaseAdmin } from "@/lib/supabase"
import { translateText } from "@/lib/google-translate"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; key: string }> }
) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const { code, key } = await params

    // Get the English text
    const { data: msg, error: msgError } = await supabaseAdmin
      .from("bot_messages")
      .select("default_text, custom_text")
      .eq("message_key", key)
      .single()

    if (msgError || !msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    const englishText = msg.custom_text ?? msg.default_text
    const translated = await translateText(englishText, code)

    // Upsert the translation
    const { data, error } = await supabaseAdmin
      .from("bot_message_translations")
      .upsert(
        {
          message_key: key,
          language_code: code,
          translated_text: translated,
          is_auto_translated: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "message_key,language_code" }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ translation: data })
  } catch (error) {
    console.error("[Translations API] Retranslate error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/languages/[code]/retranslate-all
 * Re-translates ALL bot messages for a language using Google Translate.
 * Useful after fixing placeholder protection or adding new message keys.
 * Super admin only.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isSuperAdmin } from "@/lib/auth/api-auth"
import { supabaseAdmin } from "@/lib/supabase"
import { translateBatch } from "@/lib/google-translate"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const { code } = await params

    // Verify language exists
    const { data: lang, error: langError } = await supabaseAdmin
      .from("enabled_languages")
      .select("language_code, language_name")
      .eq("language_code", code)
      .single()

    if (langError || !lang) {
      return NextResponse.json({ error: "Language not found" }, { status: 404 })
    }

    // Fetch all bot messages
    const { data: messages, error: msgError } = await supabaseAdmin
      .from("bot_messages")
      .select("message_key, default_text, custom_text")

    if (msgError || !messages) {
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
    }

    // Translate all messages (use custom_text if set, else default_text)
    const textsToTranslate = messages.map(
      (m) => m.custom_text ?? m.default_text
    )

    const translated = await translateBatch(textsToTranslate, code)

    // Upsert all translations
    const rows = messages.map((m, i) => ({
      message_key: m.message_key,
      language_code: code,
      translated_text: translated[i],
      is_auto_translated: true,
      updated_at: new Date().toISOString(),
    }))

    const { error: upsertError } = await supabaseAdmin
      .from("bot_message_translations")
      .upsert(rows, { onConflict: "message_key,language_code" })

    if (upsertError) {
      console.error("[Retranslate All] Upsert error:", upsertError)
      return NextResponse.json(
        { error: "Some translations may have failed", details: upsertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      language: lang.language_name,
      translations_count: rows.length,
    })
  } catch (error) {
    console.error("[Retranslate All] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

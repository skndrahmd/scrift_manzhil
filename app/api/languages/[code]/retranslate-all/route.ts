/**
 * POST /api/languages/[code]/retranslate-all
 * Re-translates ALL bot messages AND menu options for a language using Google Translate.
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

    // 1. Fetch all bot messages
    const { data: messages, error: msgError } = await supabaseAdmin
      .from("bot_messages")
      .select("message_key, default_text, custom_text")

    if (msgError || !messages) {
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
    }

    // 2. Translate all messages (use custom_text if set, else default_text)
    const textsToTranslate = messages.map(
      (m) => m.custom_text ?? m.default_text
    )

    const translated = await translateBatch(textsToTranslate, code)

    // 3. Upsert all bot message translations
    const messageRows = messages.map((m, i) => ({
      message_key: m.message_key,
      language_code: code,
      translated_text: translated[i],
      is_auto_translated: true,
      updated_at: new Date().toISOString(),
    }))

    const { error: upsertError } = await supabaseAdmin
      .from("bot_message_translations")
      .upsert(messageRows, { onConflict: "message_key,language_code" })

    if (upsertError) {
      console.error("[Retranslate All] Bot messages upsert error:", upsertError)
      return NextResponse.json(
        { error: "Some translations may have failed", details: upsertError.message },
        { status: 500 }
      )
    }

    // 4. Fetch all menu options
    const { data: menuOptions, error: menuError } = await supabaseAdmin
      .from("menu_options")
      .select("id, label")

    if (menuError || !menuOptions) {
      console.error("[Retranslate All] Failed to fetch menu options:", menuError)
      // Don't fail - bot messages were translated
      return NextResponse.json({
        language: lang.language_name,
        bot_translations_count: messageRows.length,
        menu_translations_count: 0,
        warning: "Bot messages translated but menu options failed",
      })
    }

    // 5. Translate all menu option labels
    const menuLabels = menuOptions.map((opt) => opt.label)
    const translatedLabels = await translateBatch(menuLabels, code)

    // 6. Upsert menu option translations
    const menuRows = menuOptions.map((opt, i) => ({
      menu_option_id: opt.id,
      language_code: code,
      translated_label: translatedLabels[i],
      is_auto_translated: true,
      is_stale: false,
      updated_at: new Date().toISOString(),
    }))

    const { error: menuUpsertError } = await supabaseAdmin
      .from("menu_option_translations")
      .upsert(menuRows, { onConflict: "menu_option_id,language_code" })

    if (menuUpsertError) {
      console.error("[Retranslate All] Menu options upsert error:", menuUpsertError)
      return NextResponse.json({
        language: lang.language_name,
        bot_translations_count: messageRows.length,
        menu_translations_count: 0,
        warning: "Bot messages translated but menu options failed",
      })
    }

    return NextResponse.json({
      language: lang.language_name,
      bot_translations_count: messageRows.length,
      menu_translations_count: menuRows.length,
    })
  } catch (error) {
    console.error("[Retranslate All] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

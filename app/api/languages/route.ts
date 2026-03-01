/**
 * GET /api/languages — List all added languages
 * POST /api/languages — Add a new language + bulk translate all bot messages
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isSuperAdmin } from "@/lib/auth/api-auth"
import { supabaseAdmin } from "@/lib/supabase"
import { translateBatch } from "@/lib/google-translate"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from("enabled_languages")
      .select("*")
      .order("sort_order")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ languages: data })
  } catch (error) {
    console.error("[Languages API] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const body = await request.json()
    const { language_code, language_name, native_name } = body

    if (!language_code || !language_name) {
      return NextResponse.json(
        { error: "language_code and language_name are required" },
        { status: 400 }
      )
    }

    // Check if language already exists
    const { data: existing } = await supabaseAdmin
      .from("enabled_languages")
      .select("id")
      .eq("language_code", language_code)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "Language already added" },
        { status: 409 }
      )
    }

    // Check max 5 enabled
    const { count } = await supabaseAdmin
      .from("enabled_languages")
      .select("id", { count: "exact", head: true })
      .eq("is_enabled", true)

    if ((count ?? 0) >= 5) {
      return NextResponse.json(
        { error: "Maximum 5 languages can be enabled. Disable one first." },
        { status: 400 }
      )
    }

    // 1. Insert the language
    const { data: lang, error: langError } = await supabaseAdmin
      .from("enabled_languages")
      .insert({
        language_code,
        language_name,
        native_name: native_name || null,
        is_enabled: true,
      })
      .select()
      .single()

    if (langError) {
      return NextResponse.json({ error: langError.message }, { status: 500 })
    }

    // 2. Fetch all bot messages
    const { data: messages, error: msgError } = await supabaseAdmin
      .from("bot_messages")
      .select("message_key, default_text, custom_text")

    if (msgError || !messages) {
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
    }

    // 3. Translate all messages (use custom_text if set, else default_text)
    const textsToTranslate = messages.map(
      (m) => m.custom_text ?? m.default_text
    )

    const translated = await translateBatch(textsToTranslate, language_code)

    // 4. Insert translations
    const rows = messages.map((m, i) => ({
      message_key: m.message_key,
      language_code,
      translated_text: translated[i],
      is_auto_translated: true,
    }))

    const { error: insertError } = await supabaseAdmin
      .from("bot_message_translations")
      .insert(rows)

    if (insertError) {
      console.error("[Languages API] Translation insert error:", insertError)
      // Language was added but translations failed — still return success with warning
      return NextResponse.json({
        language: lang,
        warning: "Language added but some translations may have failed",
      })
    }

    // 5. Fetch all menu options
    const { data: menuOptions, error: menuError } = await supabaseAdmin
      .from("menu_options")
      .select("id, label")

    if (menuError || !menuOptions) {
      console.error("[Languages API] Failed to fetch menu options:", menuError)
      // Don't fail - bot messages were translated successfully
      return NextResponse.json({
        language: lang,
        translations_count: rows.length,
        warning: "Language added but menu option translations failed",
      })
    }

    // 6. Translate all menu option labels
    const menuLabels = menuOptions.map((opt) => opt.label)
    const translatedLabels = await translateBatch(menuLabels, language_code)

    // 7. Insert menu option translations
    const menuTranslationRows = menuOptions.map((opt, i) => ({
      menu_option_id: opt.id,
      language_code,
      translated_label: translatedLabels[i],
      is_auto_translated: true,
      is_stale: false,
    }))

    const { error: menuInsertError } = await supabaseAdmin
      .from("menu_option_translations")
      .insert(menuTranslationRows)

    if (menuInsertError) {
      console.error("[Languages API] Menu option translation insert error:", menuInsertError)
      // Don't fail - bot messages were translated successfully
      return NextResponse.json({
        language: lang,
        translations_count: rows.length,
        menu_translations_count: 0,
        warning: "Language added but menu option translations failed",
      })
    }

    return NextResponse.json({
      language: lang,
      translations_count: rows.length,
      menu_translations_count: menuTranslationRows.length,
    })
  } catch (error) {
    console.error("[Languages API] POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

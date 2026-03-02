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

    // 7. Fetch all amenities
    const { data: amenities, error: amenityError } = await supabaseAdmin
      .from("amenities")
      .select("id, name")

    let amenityCount = 0
    if (amenities && amenities.length > 0) {
      // Translate all amenity names
      const amenityNames = amenities.map((a) => a.name)
      const translatedNames = await translateBatch(amenityNames, code)

      // Upsert amenity translations
      const amenityRows = amenities.map((a, i) => ({
        amenity_id: a.id,
        language_code: code,
        translated_name: translatedNames[i],
        is_auto_translated: true,
        is_stale: false,
        updated_at: new Date().toISOString(),
      }))

      const { error: amenityUpsertError } = await supabaseAdmin
        .from("amenity_translations")
        .upsert(amenityRows, { onConflict: "amenity_id,language_code" })

      if (amenityUpsertError) {
        console.error("[Retranslate All] Amenities upsert error:", amenityUpsertError)
      } else {
        amenityCount = amenityRows.length
      }
    }

    // 8. Fetch all prayer times
    const { data: prayerTimes, error: prayerError } = await supabaseAdmin
      .from("prayer_times")
      .select("id, prayer_name")

    let prayerCount = 0
    if (prayerTimes && prayerTimes.length > 0) {
      // Translate all prayer names
      const prayerNames = prayerTimes.map((p) => p.prayer_name)
      const translatedPrayers = await translateBatch(prayerNames, code)

      // Upsert prayer time translations
      const prayerRows = prayerTimes.map((p, i) => ({
        prayer_time_id: p.id,
        language_code: code,
        translated_name: translatedPrayers[i],
        is_auto_translated: true,
        is_stale: false,
        updated_at: new Date().toISOString(),
      }))

      const { error: prayerUpsertError } = await supabaseAdmin
        .from("prayer_time_translations")
        .upsert(prayerRows, { onConflict: "prayer_time_id,language_code" })

      if (prayerUpsertError) {
        console.error("[Retranslate All] Prayer times upsert error:", prayerUpsertError)
      } else {
        prayerCount = prayerRows.length
      }
    }

    return NextResponse.json({
      language: lang.language_name,
      bot_translations_count: messageRows.length,
      menu_translations_count: menuRows.length,
      amenity_translations_count: amenityCount,
      prayer_translations_count: prayerCount,
    })
  } catch (error) {
    console.error("[Retranslate All] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

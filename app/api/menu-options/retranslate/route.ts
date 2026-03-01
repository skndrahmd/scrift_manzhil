/**
 * POST /api/menu-options/retranslate
 * Retranslate menu option translations.
 *
 * Request body options:
 * - { language_code?: string } - Retranslate stale translations for a specific language (or all if not provided)
 * - { menu_option_id: string } - Retranslate ALL translations for a specific menu option
 */

import { NextResponse } from "next/server"
import { isSuperAdmin } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { translateBatch } from "@/lib/google-translate"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const { language_code, menu_option_id } = body

    // Case 1: Retranslate all translations for a specific menu option
    if (menu_option_id) {
      // Get the menu option label
      const { data: menuOpt, error: optError } = await supabaseAdmin
        .from("menu_options")
        .select("id, label")
        .eq("id", menu_option_id)
        .single()

      if (optError || !menuOpt) {
        return NextResponse.json({ error: "Menu option not found" }, { status: 404 })
      }

      // Get all enabled languages
      const { data: enabledLangs, error: langError } = await supabaseAdmin
        .from("enabled_languages")
        .select("language_code")
        .eq("is_enabled", true)

      if (langError || !enabledLangs || enabledLangs.length === 0) {
        return NextResponse.json({
          message: "No enabled languages",
          retranslated_count: 0,
        })
      }

      // Translate the label for each language
      let retranslatedCount = 0
      const errors: string[] = []

      for (const lang of enabledLangs) {
        try {
          const [translatedLabel] = await translateBatch([menuOpt.label], lang.language_code)

          // Upsert the translation
          const { error: upsertError } = await supabaseAdmin
            .from("menu_option_translations")
            .upsert({
              menu_option_id: menuOpt.id,
              language_code: lang.language_code,
              translated_label: translatedLabel,
              is_stale: false,
              is_auto_translated: true,
              updated_at: new Date().toISOString(),
            }, { onConflict: "menu_option_id,language_code" })

          if (upsertError) {
            errors.push(`Failed to upsert for ${lang.language_code}: ${upsertError.message}`)
          } else {
            retranslatedCount++
          }
        } catch (err) {
          errors.push(`Translation failed for ${lang.language_code}: ${err}`)
        }
      }

      if (errors.length > 0) {
        console.error("[Retranslate Menu Option] Errors:", errors)
        return NextResponse.json({
          message: "Partial success",
          retranslated_count: retranslatedCount,
          errors,
        })
      }

      return NextResponse.json({
        message: "Menu option retranslated for all languages",
        retranslated_count: retranslatedCount,
      })
    }

    // Case 2: Retranslate stale translations (existing behavior)
    // Build query for stale translations
    let query = supabaseAdmin
      .from("menu_option_translations")
      .select(`
        id,
        menu_option_id,
        language_code,
        translated_label,
        menu_options!inner(id, label)
      `)
      .eq("is_stale", true)

    if (language_code) {
      query = query.eq("language_code", language_code)
    }

    const { data: staleTranslations, error: fetchError } = await query

    if (fetchError) {
      console.error("[Retranslate Menu Options] Fetch error:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!staleTranslations || staleTranslations.length === 0) {
      return NextResponse.json({
        message: "No stale translations found",
        retranslated_count: 0,
      })
    }

    // Group by language for batch translation
    const byLanguage: Record<string, { id: string; menu_option_id: string; label: string }[]> = {}

    for (const t of staleTranslations) {
      const lang = t.language_code
      if (!byLanguage[lang]) {
        byLanguage[lang] = []
      }
      // Access label through the joined menu_options relation
      const menuOpt = t.menu_options as { id: string; label: string }
      byLanguage[lang].push({
        id: t.id,
        menu_option_id: t.menu_option_id,
        label: menuOpt.label,
      })
    }

    // Translate and update for each language
    let totalRetranslated = 0
    const errors: string[] = []

    for (const [lang, items] of Object.entries(byLanguage)) {
      try {
        const labels = items.map((item) => item.label)
        const translated = await translateBatch(labels, lang)

        // Update each translation
        for (let i = 0; i < items.length; i++) {
          const { error: updateError } = await supabaseAdmin
            .from("menu_option_translations")
            .update({
              translated_label: translated[i],
              is_stale: false,
              is_auto_translated: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", items[i].id)

          if (updateError) {
            errors.push(`Failed to update ${items[i].id}: ${updateError.message}`)
          } else {
            totalRetranslated++
          }
        }
      } catch (err) {
        errors.push(`Translation failed for ${lang}: ${err}`)
      }
    }

    if (errors.length > 0) {
      console.error("[Retranslate Menu Options] Errors:", errors)
      return NextResponse.json({
        message: "Partial success",
        retranslated_count: totalRetranslated,
        errors,
      })
    }

    return NextResponse.json({
      message: "All stale translations retranslated",
      retranslated_count: totalRetranslated,
    })
  } catch (error) {
    console.error("[Retranslate Menu Options] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { isSuperAdmin } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { translateBatch } from "@/lib/google-translate"

export const dynamic = "force-dynamic"

/**
 * PATCH /api/menu-options/[id]
 * Update a single menu option's label, emoji, or is_enabled.
 * Requires super_admin role.
 *
 * When label changes, automatically retranslate all translations.
 *
 * Request body (all fields optional):
 * {
 *   label?: string,
 *   emoji?: string,
 *   is_enabled?: boolean
 * }
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const isAdmin = await isSuperAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = params

  try {
    const body = await req.json()
    const updateData: Record<string, any> = {}

    if (typeof body.label === "string" && body.label.trim()) {
      updateData.label = body.label.trim()
    }
    if (typeof body.emoji === "string" && body.emoji.trim()) {
      updateData.emoji = body.emoji.trim()
    }
    if (typeof body.is_enabled === "boolean") {
      updateData.is_enabled = body.is_enabled
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("menu_options")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error(`[PATCH /api/menu-options/${id}] DB error:`, error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Menu option not found" }, { status: 404 })
    }

    // If label changed, retranslate all stale translations for this menu option
    if (updateData.label) {
      try {
        // Fetch stale translations for this menu option
        const { data: staleTrans, error: staleError } = await supabaseAdmin
          .from("menu_option_translations")
          .select("id, language_code")
          .eq("menu_option_id", id)
          .eq("is_stale", true)

        if (!staleError && staleTrans && staleTrans.length > 0) {
          // Group by language and translate
          const byLanguage: Record<string, string[]> = {}
          for (const t of staleTrans) {
            if (!byLanguage[t.language_code]) {
              byLanguage[t.language_code] = []
            }
            byLanguage[t.language_code].push(t.id)
          }

          // Translate the new label for each language
          for (const [langCode, translationIds] of Object.entries(byLanguage)) {
            try {
              const [translatedLabel] = await translateBatch([data.label], langCode)

              // Update all translations for this language
              await supabaseAdmin
                .from("menu_option_translations")
                .update({
                  translated_label: translatedLabel,
                  is_stale: false,
                  is_auto_translated: true,
                  updated_at: new Date().toISOString(),
                })
                .in("id", translationIds)

              console.log(`[PATCH /api/menu-options/${id}] Retranslated for ${langCode}`)
            } catch (transErr) {
              console.error(`[PATCH /api/menu-options/${id}] Translation error for ${langCode}:`, transErr)
              // Don't fail the request - translations remain stale for manual retranslation
            }
          }
        }
      } catch (retransErr) {
        console.error(`[PATCH /api/menu-options/${id}] Retranslation error:`, retransErr)
        // Don't fail the request - translations remain stale
      }
    }

    return NextResponse.json({ option: data })
  } catch (err) {
    console.error(`[PATCH /api/menu-options/${id}] Unexpected error:`, err)
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}

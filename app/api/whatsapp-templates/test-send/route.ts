/**
 * POST /api/whatsapp-templates/test-send — Test send a template message
 * Requires super_admin authentication.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isSuperAdmin } from "@/lib/auth/api-auth"
import { supabaseAdmin } from "@/lib/supabase"
import { sendTemplate } from "@/lib/twilio"
import { TEMPLATE_SIDS } from "@/lib/twilio/templates"
import type { TemplateType } from "@/lib/twilio/types"

export async function POST(request: NextRequest) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const body = await request.json()
    const { template_key, phone, variables } = body

    if (!template_key || !phone) {
      return NextResponse.json(
        { error: "template_key and phone are required" },
        { status: 400 }
      )
    }

    // Look up SID: DB first, then env var fallback
    let templateSid: string | undefined

    try {
      const { data } = await supabaseAdmin
        .from("whatsapp_templates")
        .select("template_sid, env_var_name")
        .eq("template_key", template_key)
        .eq("is_active", true)
        .single()

      if (data?.template_sid) {
        templateSid = data.template_sid
      } else if (data?.env_var_name) {
        templateSid = process.env[data.env_var_name]
      }
    } catch {
      // DB unavailable — fall through
    }

    // Fallback to env var mapping
    if (!templateSid) {
      templateSid = TEMPLATE_SIDS[template_key as TemplateType]
    }

    if (!templateSid) {
      return NextResponse.json(
        { error: "No SID configured for this template. Add a SID first." },
        { status: 400 }
      )
    }

    const result = await sendTemplate(phone, templateSid, variables || {})

    return NextResponse.json(result)
  } catch (error) {
    console.error("[WhatsAppTemplates API] Test send error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

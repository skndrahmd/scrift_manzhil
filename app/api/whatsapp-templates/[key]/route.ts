/**
 * PATCH /api/whatsapp-templates/[key] — Update template fields
 * DELETE /api/whatsapp-templates/[key] — Delete draft template
 * Requires super_admin authentication.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyAdminAccess } from "@/lib/auth/api-auth"
import { supabaseAdmin } from "@/lib/supabase"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { authenticated, adminUser } = await verifyAdminAccess()

    if (!authenticated || adminUser?.role !== "super_admin") {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const { key } = await params
    const body = await request.json()

    // Allowed fields to update
    const allowedFields = [
      "template_sid", "name", "description", "variables",
      "trigger_description", "trigger_source", "message_body_draft",
      "fallback_message", "is_active", "is_draft",
    ]

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    // Validate SID format if being updated
    if (updates.template_sid && typeof updates.template_sid === "string" && !updates.template_sid.startsWith("HX")) {
      return NextResponse.json({ error: "template_sid must start with HX" }, { status: 400 })
    }

    // If setting a SID on a draft, auto-flip is_draft to false
    if (updates.template_sid && !("is_draft" in updates)) {
      updates.is_draft = false
    }

    updates.updated_at = new Date().toISOString()
    updates.updated_by = adminUser!.id

    const { data, error } = await supabaseAdmin
      .from("whatsapp_templates")
      .update(updates)
      .eq("template_key", key)
      .select()
      .single()

    if (error) {
      console.error("[WhatsAppTemplates API] Update error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    return NextResponse.json({ template: data })
  } catch (error) {
    console.error("[WhatsAppTemplates API] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { authenticated, adminUser } = await verifyAdminAccess()

    if (!authenticated || adminUser?.role !== "super_admin") {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const { key } = await params

    // Only allow deletion of drafts
    const { data: template } = await supabaseAdmin
      .from("whatsapp_templates")
      .select("is_draft, env_var_name")
      .eq("template_key", key)
      .single()

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    // Core templates (with env_var_name) cannot be deleted, only deactivated
    if (template.env_var_name) {
      return NextResponse.json(
        { error: "Core templates cannot be deleted. Deactivate instead." },
        { status: 400 }
      )
    }

    if (!template.is_draft) {
      return NextResponse.json(
        { error: "Only draft templates can be deleted. Deactivate active templates instead." },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("whatsapp_templates")
      .delete()
      .eq("template_key", key)

    if (error) {
      console.error("[WhatsAppTemplates API] Delete error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[WhatsAppTemplates API] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

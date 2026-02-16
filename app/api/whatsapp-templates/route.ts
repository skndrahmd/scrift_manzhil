/**
 * GET /api/whatsapp-templates — List all templates grouped by category
 * POST /api/whatsapp-templates — Create a new template (draft)
 * Requires super_admin authentication.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isSuperAdmin, verifyAdminAccess } from "@/lib/auth/api-auth"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from("whatsapp_templates")
      .select("*")
      .order("category")
      .order("sort_order")

    if (error) {
      console.error("[WhatsAppTemplates API] Fetch error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by category
    const grouped: Record<string, typeof data> = {}
    for (const tmpl of data) {
      if (!grouped[tmpl.category]) {
        grouped[tmpl.category] = []
      }
      grouped[tmpl.category].push(tmpl)
    }

    return NextResponse.json({ templates: grouped })
  } catch (error) {
    console.error("[WhatsAppTemplates API] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authenticated, adminUser } = await verifyAdminAccess()

    if (!authenticated || adminUser?.role !== "super_admin") {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const body = await request.json()
    const { template_key, name, description, category, variables, message_body_draft, template_sid } = body

    // Validate required fields
    if (!template_key || !name || !category) {
      return NextResponse.json(
        { error: "template_key, name, and category are required" },
        { status: 400 }
      )
    }

    // Validate template_key format (snake_case)
    if (!/^[a-z][a-z0-9_]*$/.test(template_key)) {
      return NextResponse.json(
        { error: "template_key must be lowercase snake_case" },
        { status: 400 }
      )
    }

    // Validate SID format if provided
    if (template_sid && !template_sid.startsWith("HX")) {
      return NextResponse.json(
        { error: "template_sid must start with HX" },
        { status: 400 }
      )
    }

    // Check uniqueness
    const { data: existing } = await supabaseAdmin
      .from("whatsapp_templates")
      .select("id")
      .eq("template_key", template_key)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "A template with this key already exists" },
        { status: 409 }
      )
    }

    // Get max sort_order for this category
    const { data: maxSort } = await supabaseAdmin
      .from("whatsapp_templates")
      .select("sort_order")
      .eq("category", category)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxSort?.sort_order || 0) + 1

    const { data, error } = await supabaseAdmin
      .from("whatsapp_templates")
      .insert({
        template_key,
        name,
        description: description || null,
        category,
        variables: variables || [],
        message_body_draft: message_body_draft || null,
        template_sid: template_sid || null,
        is_draft: !template_sid,
        is_active: !!template_sid,
        sort_order: nextOrder,
        updated_by: adminUser!.id,
      })
      .select()
      .single()

    if (error) {
      console.error("[WhatsAppTemplates API] Create error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ template: data }, { status: 201 })
  } catch (error) {
    console.error("[WhatsAppTemplates API] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

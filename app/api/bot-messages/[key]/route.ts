/**
 * PATCH /api/bot-messages/[key]
 * Updates custom_text for a specific bot message.
 * Send { custom_text: null } to reset to default.
 * Requires super_admin authentication.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isSuperAdmin, verifyAdminAccess } from "@/lib/auth/api-auth"
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
    const { custom_text } = body

    // Validate: custom_text must be string or null
    if (custom_text !== null && typeof custom_text !== "string") {
      return NextResponse.json(
        { error: "custom_text must be a string or null" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("bot_messages")
      .update({
        custom_text: custom_text,
        updated_at: new Date().toISOString(),
        updated_by: adminUser!.id,
      })
      .eq("message_key", key)
      .select()
      .single()

    if (error) {
      console.error("[BotMessages API] Update error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    return NextResponse.json({ message: data })
  } catch (error) {
    console.error("[BotMessages API] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

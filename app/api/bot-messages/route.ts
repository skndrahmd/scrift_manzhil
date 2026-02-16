/**
 * GET /api/bot-messages
 * Returns all bot messages grouped by flow_group, sorted by sort_order.
 * Requires super_admin authentication.
 */

import { NextResponse } from "next/server"
import { isSuperAdmin } from "@/lib/auth/api-auth"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from("bot_messages")
      .select("*")
      .order("flow_group")
      .order("sort_order")

    if (error) {
      console.error("[BotMessages API] Fetch error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by flow_group
    const grouped: Record<string, typeof data> = {}
    for (const msg of data) {
      if (!grouped[msg.flow_group]) {
        grouped[msg.flow_group] = []
      }
      grouped[msg.flow_group].push(msg)
    }

    return NextResponse.json({ messages: grouped })
  } catch (error) {
    console.error("[BotMessages API] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

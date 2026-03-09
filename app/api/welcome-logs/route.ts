import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/auth/api-auth"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = 'force-dynamic'

/**
 * GET /api/welcome-logs
 * Fetch welcome message logs with filtering and pagination
 * 
 * Query params:
 *   - status: Filter by status (sent, failed)
 *   - triggered_by: Filter by trigger type (bulk-import, manual, resend)
 *   - offset: Pagination offset (default 0)
 *   - limit: Page size (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  const { authenticated, error: authError } = await verifyAdminAccess("settings")
  if (!authenticated) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const triggeredBy = searchParams.get("triggered_by")
    const offset = parseInt(searchParams.get("offset") || "0", 10)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)

    // Build query
    let query = supabaseAdmin
      .from("welcome_message_logs")
      .select("*", { count: "exact" })
      .order("sent_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    if (triggeredBy && triggeredBy !== "all") {
      query = query.eq("triggered_by", triggeredBy)
    }

    const { data: logs, error: fetchError, count } = await query

    if (fetchError) {
      console.error("Failed to fetch welcome logs:", fetchError)
      return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
    }

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      offset,
      limit,
    })
  } catch (error) {
    console.error("Welcome logs API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

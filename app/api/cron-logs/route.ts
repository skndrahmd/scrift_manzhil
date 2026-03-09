import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/auth/api-auth"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron-logs
 * Fetch cron job execution logs with filtering and pagination
 * 
 * Query params:
 *   - job_name: Filter by job name
 *   - status: Filter by status (success, partial, failed)
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
    const jobName = searchParams.get("job_name")
    const status = searchParams.get("status")
    const offset = parseInt(searchParams.get("offset") || "0", 10)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)

    // Build query
    let query = supabaseAdmin
      .from("cron_logs")
      .select("*", { count: "exact" })
      .order("started_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (jobName && jobName !== "all") {
      query = query.eq("job_name", jobName)
    }

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    const { data: logs, error: fetchError, count } = await query

    if (fetchError) {
      console.error("Failed to fetch cron logs:", fetchError)
      return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
    }

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      offset,
      limit,
    })
  } catch (error) {
    console.error("Cron logs API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

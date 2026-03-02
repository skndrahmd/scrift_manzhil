import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/auth/api-auth"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * GET /api/maintenance/logs
 * Fetch maintenance notification logs with optional filters.
 *
 * Query params:
 * - unitId: Filter by unit ID
 * - type: Filter by notification type (invoice/reminder/confirmation)
 * - status: Filter by status (sent/failed)
 * - limit: Max records to return (default: 100)
 */
export async function GET(request: NextRequest) {
  const { authenticated, error: authError } = await verifyAdminAccess("units")
  if (!authenticated) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const unitId = searchParams.get("unitId")
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "100", 10)

    let query = supabaseAdmin
      .from("maintenance_notification_logs")
      .select(
        `
        id,
        unit_id,
        profile_id,
        payment_id,
        notification_type,
        status,
        error_message,
        phone_number,
        recipient_name,
        amount,
        month_year,
        triggered_by,
        triggered_by_user,
        sent_at,
        created_at,
        units (apartment_number)
      `
      )
      .order("sent_at", { ascending: false })
      .limit(limit)

    if (unitId) {
      query = query.eq("unit_id", unitId)
    }

    if (type && type !== "all") {
      query = query.eq("notification_type", type)
    }

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      console.error("[MAINTENANCE LOGS] Fetch error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ logs: data || [] }, { status: 200 })
  } catch (error) {
    console.error("[MAINTENANCE LOGS] Exception:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch logs" },
      { status: 500 }
    )
  }
}

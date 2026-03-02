import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/auth/api-auth"
import { sendMonthlyInvoices, sendUnpaidReminders } from "@/lib/services/maintenance-notification"

/**
 * POST /api/maintenance/send-invoices
 * Manually send monthly maintenance invoices to all units or specific units.
 *
 * Request body:
 * - unitIds?: string[] - Optional array of unit IDs. If omitted, sends to ALL units.
 * - type?: 'invoice' | 'reminder' - Type of notification to send. Default: 'invoice'
 *
 * Response:
 * - total: number - Total units processed
 * - sent: number - Successfully sent notifications
 * - failed: number - Failed notifications
 * - errors: string[] - Error messages for failed sends
 */
export async function POST(request: NextRequest) {
  const { authenticated, adminUser, error: authError } = await verifyAdminAccess("units")
  if (!authenticated) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { unitIds, type = "invoice" } = body as {
      unitIds?: string[]
      type?: "invoice" | "reminder"
    }

    console.log(
      `[SEND INVOICES] Admin ${adminUser?.id} triggered ${type} send for ${unitIds?.length || "all"} units`
    )

    let result

    if (type === "reminder") {
      result = await sendUnpaidReminders({
        unitIds,
        triggeredBy: "manual",
        triggeredByUser: adminUser?.id,
      })
    } else {
      result = await sendMonthlyInvoices({
        unitIds,
        triggeredBy: "manual",
        triggeredByUser: adminUser?.id,
      })
    }

    console.log(
      `[SEND INVOICES] Complete - Sent: ${result.sent}, Failed: ${result.failed}, Total: ${result.total}`
    )

    return NextResponse.json(
      {
        success: result.failed === 0,
        total: result.total,
        sent: result.sent,
        failed: result.failed,
        errors: result.errors,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[SEND INVOICES] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send invoices",
      },
      { status: 500 }
    )
  }
}

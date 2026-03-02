import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/auth/api-auth"
import { sendUnpaidReminders } from "@/lib/services/maintenance-notification"

/**
 * POST /api/maintenance/bulk-reminder
 * Send maintenance payment reminders to specified units.
 *
 * Request body:
 * - unitIds: string[] - Array of unit IDs to send reminders to
 *
 * Response:
 * - total: number - Total units processed
 * - sent: number - Successfully sent reminders
 * - failed: number - Failed reminders
 * - errors: string[] - Error messages for failed sends
 */
export async function POST(request: NextRequest) {
  const { authenticated, adminUser, error: authError } = await verifyAdminAccess("units")
  if (!authenticated) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { unitIds } = body as { unitIds: string[] }

    if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
      return NextResponse.json(
        { error: "No unit IDs provided" },
        { status: 400 }
      )
    }

    console.log(`[BULK REMINDER] Admin ${adminUser?.id} sending reminders for ${unitIds.length} units`)

    const result = await sendUnpaidReminders({
      unitIds,
      triggeredBy: "manual",
      triggeredByUser: adminUser?.id,
    })

    console.log(
      `[BULK REMINDER] Complete - Sent: ${result.sent}, Failed: ${result.failed}, Total: ${result.total}`
    )

    return NextResponse.json(
      {
        total: result.total,
        sent: result.sent,
        failed: result.failed,
        errors: result.errors,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[BULK REMINDER] Error:", error)
    return NextResponse.json(
      { error: "Failed to send maintenance reminders" },
      { status: 500 }
    )
  }
}

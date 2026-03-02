import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/auth/api-auth"
import { smartResetStaleMaintenanceStatus } from "@/lib/services/maintenance-notification"

/**
 * POST /api/maintenance/reset-status
 * Smart reset: Only resets units with stale maintenance status.
 *
 * A unit is considered stale if:
 * - maintenance_paid = true (shows as paid)
 * - But current month's invoice has status = 'unpaid'
 *
 * This is safer than resetting all units, as it won't affect units
 * that have legitimately paid their maintenance.
 *
 * Response:
 * - success: boolean
 * - unitsReset: number - Count of stale units reset to unpaid
 * - error?: string - Error message if failed
 */
export async function POST(request: NextRequest) {
  const { authenticated, adminUser, error: authError } = await verifyAdminAccess("units")
  if (!authenticated) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    console.log(`[RESET STATUS] Admin ${adminUser?.id} triggered smart maintenance status reset`)

    const result = await smartResetStaleMaintenanceStatus()

    if (result.success) {
      console.log(`[RESET STATUS] Successfully reset ${result.unitsReset} units to unpaid status`)
      return NextResponse.json(
        {
          success: true,
          unitsReset: result.unitsReset,
          message: `Reset ${result.unitsReset} units to unpaid status`,
        },
        { status: 200 }
      )
    } else {
      console.error(`[RESET STATUS] Failed: ${result.error}`)
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("[RESET STATUS] Exception:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to reset maintenance status",
      },
      { status: 500 }
    )
  }
}

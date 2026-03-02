import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/auth/api-auth"
import { resetAllUnitsMaintenanceStatus } from "@/lib/services/maintenance-notification"

/**
 * POST /api/maintenance/reset-status
 * Manually reset all units' maintenance_paid status to false.
 *
 * This is useful when:
 * - The cron job didn't run on the 1st of the month
 * - Testing the maintenance flow
 * - Correcting stale status data
 *
 * Response:
 * - success: boolean
 * - unitsReset: number - Count of units reset to unpaid
 * - error?: string - Error message if failed
 */
export async function POST(request: NextRequest) {
  const { authenticated, adminUser, error: authError } = await verifyAdminAccess("units")
  if (!authenticated) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    console.log(`[RESET STATUS] Admin ${adminUser?.id} triggered manual maintenance status reset`)

    const result = await resetAllUnitsMaintenanceStatus()

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

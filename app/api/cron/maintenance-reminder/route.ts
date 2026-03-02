import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getPakistanTime, getPakistanISOString } from "@/lib/date"
import {
  sendMonthlyInvoices,
  sendUnpaidReminders,
  resetAllUnitsMaintenanceStatus,
  smartResetStaleMaintenanceStatus,
  getCurrentMonthYear,
} from "@/lib/services/maintenance-notification"

const CRON_KEY = process.env.CRON_SECRET

interface CronResult {
  success: boolean
  dayOfMonth: number
  unitsReset?: number
  staleUnitsReset?: number
  invoicesSent?: number
  invoicesFailed?: number
  remindersSent?: number
  remindersFailed?: number
  errors: string[]
  processedAt: string
}

async function handleMaintenanceReminder(request: NextRequest): Promise<NextResponse> {
  const provided = request.headers.get("x-cron-key")
  if (CRON_KEY && provided !== CRON_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result: CronResult = {
    success: true,
    dayOfMonth: 0,
    errors: [],
    processedAt: getPakistanISOString(),
  }

  try {
    const today = getPakistanTime()
    const dayOfMonth = today.getDate()
    result.dayOfMonth = dayOfMonth

    console.log(`[MAINTENANCE CRON] Starting maintenance cron job - Day ${dayOfMonth} of month`)

    // Smart reset: Fix any units with stale status (paid but current month invoice is unpaid)
    // This runs on every cron execution to catch edge cases
    console.log("[MAINTENANCE CRON] Checking for stale maintenance status...")
    const smartResetResult = await smartResetStaleMaintenanceStatus()
    if (smartResetResult.success && smartResetResult.unitsReset > 0) {
      result.staleUnitsReset = smartResetResult.unitsReset
      console.log(`[MAINTENANCE CRON] Smart reset: ${smartResetResult.unitsReset} stale units fixed`)
    }

    // On the 1st of the month, reset all units' maintenance_paid status to false
    if (dayOfMonth === 1) {
      console.log("[MAINTENANCE CRON] 1st of month - Resetting all units maintenance status to unpaid")
      const resetResult = await resetAllUnitsMaintenanceStatus()

      if (resetResult.success) {
        result.unitsReset = resetResult.unitsReset
        console.log(`[MAINTENANCE CRON] Successfully reset ${resetResult.unitsReset} units to unpaid status`)
      } else {
        result.errors.push(`Failed to reset units: ${resetResult.error}`)
        console.error(`[MAINTENANCE CRON] Failed to reset units: ${resetResult.error}`)
      }

      // Send monthly invoices to all units
      console.log("[MAINTENANCE CRON] Sending monthly invoices to all units")
      const invoiceResult = await sendMonthlyInvoices({
        triggeredBy: "cron",
      })

      result.invoicesSent = invoiceResult.sent
      result.invoicesFailed = invoiceResult.failed

      if (invoiceResult.errors.length > 0) {
        result.errors.push(...invoiceResult.errors)
      }

      console.log(
        `[MAINTENANCE CRON] Invoices sent: ${invoiceResult.sent}, Failed: ${invoiceResult.failed}`
      )
    }

    // From the 3rd onwards, send reminders for unpaid invoices
    if (dayOfMonth >= 3) {
      console.log("[MAINTENANCE CRON] Sending reminders for unpaid invoices")
      const reminderResult = await sendUnpaidReminders({
        triggeredBy: "cron",
      })

      result.remindersSent = reminderResult.sent
      result.remindersFailed = reminderResult.failed

      if (reminderResult.errors.length > 0) {
        result.errors.push(...reminderResult.errors)
      }

      console.log(
        `[MAINTENANCE CRON] Reminders sent: ${reminderResult.sent}, Failed: ${reminderResult.failed}`
      )
    }

    // Determine overall success
    result.success = result.errors.length === 0

    console.log(`[MAINTENANCE CRON] Completed - Success: ${result.success}`)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[MAINTENANCE CRON] Exception:", error)
    result.errors.push(errorMessage)
    result.success = false
    return NextResponse.json(result, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handleMaintenanceReminder(request)
}

export async function POST(request: NextRequest) {
  return handleMaintenanceReminder(request)
}

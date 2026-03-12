/**
 * @module maintenance-notification
 * Service for sending maintenance notifications (invoices, reminders) with logging.
 * Used by both cron jobs and manual admin triggers.
 */

import { supabaseAdmin } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/date"
import {
  sendMaintenanceInvoice,
  sendMaintenanceReminder,
  formatMonthYear,
} from "@/lib/twilio"

const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")

// Types
export type NotificationType = "invoice" | "reminder" | "confirmation"
export type TriggerSource = "cron" | "manual"

export interface NotificationLogEntry {
  unit_id: string | null
  profile_id: string | null
  payment_id: string | null
  notification_type: NotificationType
  status: "sent" | "failed"
  error_message?: string | null
  phone_number: string
  recipient_name?: string | null
  amount?: number | null
  month_year?: string | null
  triggered_by: TriggerSource
  triggered_by_user?: string | null
}

export interface SendResult {
  success: boolean
  error?: string
}

export interface BulkSendResult {
  total: number
  sent: number
  failed: number
  errors: string[]
  logs: NotificationLogEntry[]
}

/**
 * Log a notification attempt to the database
 */
export async function logNotification(entry: NotificationLogEntry): Promise<void> {
  try {
    await supabaseAdmin.from("maintenance_notification_logs").insert({
      unit_id: entry.unit_id,
      profile_id: entry.profile_id,
      payment_id: entry.payment_id,
      notification_type: entry.notification_type,
      status: entry.status,
      error_message: entry.error_message || null,
      phone_number: entry.phone_number,
      recipient_name: entry.recipient_name || null,
      amount: entry.amount || null,
      month_year: entry.month_year || null,
      triggered_by: entry.triggered_by,
      triggered_by_user: entry.triggered_by_user || null,
      sent_at: await getPakistanISOString(),
    })
  } catch (logError) {
    console.error("[MAINTENANCE NOTIFICATION] Failed to log notification:", logError)
  }
}

/**
 * Send a maintenance invoice notification with logging
 */
export async function sendInvoiceWithLogging(
  params: {
    phone: string
    name: string
    monthYear: string
    amount: number
    dueDate: string
    invoiceUrl: string
    unitId: string
    profileId: string
    paymentId: string
  },
  options: {
    triggeredBy: TriggerSource
    triggeredByUser?: string
  }
): Promise<SendResult> {
  const { phone, name, monthYear, amount, dueDate, invoiceUrl, unitId, profileId, paymentId } = params
  const { triggeredBy, triggeredByUser } = options

  try {
    const result = await sendMaintenanceInvoice({
      phone,
      name,
      monthYear,
      amount,
      dueDate,
      invoiceUrl,
    })

    const logEntry: NotificationLogEntry = {
      unit_id: unitId,
      profile_id: profileId,
      payment_id: paymentId,
      notification_type: "invoice",
      status: result.ok ? "sent" : "failed",
      error_message: result.ok ? null : result.error || "Unknown error",
      phone_number: phone,
      recipient_name: name,
      amount,
      month_year: monthYear,
      triggered_by: triggeredBy,
      triggered_by_user: triggeredByUser || null,
    }

    await logNotification(logEntry)

    return {
      success: result.ok,
      error: result.ok ? undefined : result.error,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    await logNotification({
      unit_id: unitId,
      profile_id: profileId,
      payment_id: paymentId,
      notification_type: "invoice",
      status: "failed",
      error_message: errorMessage,
      phone_number: phone,
      recipient_name: name,
      amount,
      month_year: monthYear,
      triggered_by: triggeredBy,
      triggered_by_user: triggeredByUser || null,
    })

    return { success: false, error: errorMessage }
  }
}

/**
 * Send a maintenance reminder notification with logging
 */
export async function sendReminderWithLogging(
  params: {
    phone: string
    name: string
    monthsList: string
    totalAmount: number
    invoiceUrl: string
    unitId: string
    profileId: string
    paymentId?: string
  },
  options: {
    triggeredBy: TriggerSource
    triggeredByUser?: string
  }
): Promise<SendResult> {
  const { phone, name, monthsList, totalAmount, invoiceUrl, unitId, profileId, paymentId } = params
  const { triggeredBy, triggeredByUser } = options

  try {
    const result = await sendMaintenanceReminder({
      phone,
      name,
      monthsList,
      totalAmount,
      invoiceUrl,
    })

    const logEntry: NotificationLogEntry = {
      unit_id: unitId,
      profile_id: profileId,
      payment_id: paymentId || null,
      notification_type: "reminder",
      status: result.ok ? "sent" : "failed",
      error_message: result.ok ? null : result.error || "Unknown error",
      phone_number: phone,
      recipient_name: name,
      amount: totalAmount,
      month_year: monthsList,
      triggered_by: triggeredBy,
      triggered_by_user: triggeredByUser || null,
    }

    await logNotification(logEntry)

    return {
      success: result.ok,
      error: result.ok ? undefined : result.error,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    await logNotification({
      unit_id: unitId,
      profile_id: profileId,
      payment_id: paymentId || null,
      notification_type: "reminder",
      status: "failed",
      error_message: errorMessage,
      phone_number: phone,
      recipient_name: name,
      amount: totalAmount,
      month_year: monthsList,
      triggered_by: triggeredBy,
      triggered_by_user: triggeredByUser || null,
    })

    return { success: false, error: errorMessage }
  }
}

/**
 * Reset maintenance_paid status for all units to false
 * Should be called on the 1st of each month
 */
export async function resetAllUnitsMaintenanceStatus(): Promise<{
  success: boolean
  unitsReset: number
  error?: string
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from("units")
      .update({
        maintenance_paid: false,
        last_payment_date: null,
        updated_at: await getPakistanISOString(),
      })
      .neq("id", "00000000-0000-0000-0000-000000000000") // Update all
      .select("id")

    if (error) {
      console.error("[RESET MAINTENANCE STATUS] Error resetting units:", error)
      return { success: false, unitsReset: 0, error: error.message }
    }

    const unitsReset = data?.length || 0
    console.log(`[RESET MAINTENANCE STATUS] Reset ${unitsReset} units to unpaid status`)
    return { success: true, unitsReset }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[RESET MAINTENANCE STATUS] Exception:", error)
    return { success: false, unitsReset: 0, error: errorMessage }
  }
}

/**
 * Smart reset: Only reset units that have stale maintenance status.
 * A unit is considered stale if:
 * - maintenance_paid = true (shows as paid)
 * - But current month's invoice exists with status = 'unpaid'
 * 
 * This handles edge cases where the cron job missed the 1st of the month.
 */
export async function smartResetStaleMaintenanceStatus(): Promise<{
  success: boolean
  unitsReset: number
  error?: string
}> {
  try {
    const { year: currentYear, month: currentMonth } = await getCurrentMonthYear()

    // Find units where maintenance_paid = true but current month invoice is unpaid
    const { data: staleUnits, error: fetchError } = await supabaseAdmin
      .from("units")
      .select(`
        id,
        maintenance_paid,
        maintenance_payments!inner(id, status)
      `)
      .eq("maintenance_paid", true)
      .eq("maintenance_payments.year", currentYear)
      .eq("maintenance_payments.month", currentMonth)
      .eq("maintenance_payments.status", "unpaid")

    if (fetchError) {
      console.error("[SMART RESET] Error fetching stale units:", fetchError)
      return { success: false, unitsReset: 0, error: fetchError.message }
    }

    if (!staleUnits || staleUnits.length === 0) {
      console.log("[SMART RESET] No stale units found")
      return { success: true, unitsReset: 0 }
    }

    const staleUnitIds = staleUnits.map((u: any) => u.id)
    console.log(`[SMART RESET] Found ${staleUnitIds.length} units with stale status`)

    // Reset only the stale units
    const { error: updateError } = await supabaseAdmin
      .from("units")
      .update({
        maintenance_paid: false,
        last_payment_date: null,
        updated_at: await getPakistanISOString(),
      })
      .in("id", staleUnitIds)

    if (updateError) {
      console.error("[SMART RESET] Error updating stale units:", updateError)
      return { success: false, unitsReset: 0, error: updateError.message }
    }

    console.log(`[SMART RESET] Reset ${staleUnitIds.length} stale units to unpaid status`)
    return { success: true, unitsReset: staleUnitIds.length }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[SMART RESET] Exception:", error)
    return { success: false, unitsReset: 0, error: errorMessage }
  }
}

/**
 * Ensure maintenance payment records exist for a unit
 * Creates missing monthly records from unit creation date to present
 */
export async function ensureMaintenanceRecords(
  unitId: string,
  amount: number,
  createdAt: string,
  primaryProfileId?: string | null
): Promise<void> {
  const createdDate = new Date(createdAt)
  const now = new Date()
  const items: { year: number; month: number }[] = []
  const currentDate = new Date(createdDate.getFullYear(), createdDate.getMonth(), 1)

  while (currentDate <= now) {
    items.push({ year: currentDate.getFullYear(), month: currentDate.getMonth() + 1 })
    currentDate.setMonth(currentDate.getMonth() + 1)
  }

  if (items.length === 0) return

  const { data: existing } = await supabaseAdmin
    .from("maintenance_payments")
    .select("year, month")
    .eq("unit_id", unitId)
    .in("year", Array.from(new Set(items.map((x) => x.year))))

  const key = new Set((existing || []).map((e: any) => `${e.year}-${e.month}`))
  const upserts = items
    .filter((i) => !key.has(`${i.year}-${i.month}`))
    .map((i) => ({
      unit_id: unitId,
      profile_id: primaryProfileId || null,
      year: i.year,
      month: i.month,
      amount,
      status: "unpaid",
    }))

  if (upserts.length > 0) {
    await supabaseAdmin.from("maintenance_payments").insert(upserts)
  }
}

/**
 * Get current month/year in Pakistan timezone
 */
export async function getCurrentMonthYear(): Promise<{ year: number; month: number }> {
  const now = new Date(await getPakistanISOString())
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }
}

/**
 * Format due date (10th of the month)
 */
export function formatDueDate(year: number, month: number): string {
  const dueDate = new Date(year, month - 1, 10)
  return dueDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/**
 * Send monthly invoices to specified units (or all units if unitIds not provided)
 */
export async function sendMonthlyInvoices(
  options: {
    unitIds?: string[]
    triggeredBy: TriggerSource
    triggeredByUser?: string
  }
): Promise<BulkSendResult> {
  const { unitIds, triggeredBy, triggeredByUser } = options
  const { year: currentYear, month: currentMonth } = await getCurrentMonthYear()
  const monthYearLabel = formatMonthYear(currentYear, currentMonth)
  const dueDate = formatDueDate(currentYear, currentMonth)

  const result: BulkSendResult = {
    total: 0,
    sent: 0,
    failed: 0,
    errors: [],
    logs: [],
  }

  try {
    // Fetch units with primary residents
    let query = supabaseAdmin
      .from("units")
      .select(
        "id, apartment_number, maintenance_charges, created_at, profiles(id, name, phone_number, is_primary_resident, is_active)"
      )

    if (unitIds && unitIds.length > 0) {
      query = query.in("id", unitIds)
    }

    const { data: units, error: unitsError } = await query

    if (unitsError) {
      result.errors.push(`Failed to fetch units: ${unitsError.message}`)
      return result
    }

    if (!units || units.length === 0) {
      return result
    }

    result.total = units.length

    for (const unit of units) {
      const residents = (unit.profiles as any[]) || []
      const primaryResident =
        residents.find((r) => r.is_primary_resident && r.is_active) ||
        residents.find((r) => r.is_active) ||
        null

      if (!primaryResident?.phone_number) {
        result.failed++
        result.errors.push(`Unit ${unit.apartment_number}: No primary resident with phone number`)
        continue
      }

      // Ensure maintenance records exist
      await ensureMaintenanceRecords(
        unit.id,
        unit.maintenance_charges ?? 0,
        unit.created_at,
        primaryResident.id
      )

      // Check if current month invoice exists and its status
      const { data: existingPayment } = await supabaseAdmin
        .from("maintenance_payments")
        .select("id, status")
        .eq("unit_id", unit.id)
        .eq("year", currentYear)
        .eq("month", currentMonth)
        .maybeSingle()

      let paymentId: string

      if (existingPayment) {
        // Skip if already paid for current month
        if (existingPayment.status === "paid") {
          console.log(`[MAINTENANCE INVOICE] Unit ${unit.apartment_number}: Already paid for ${monthYearLabel}, skipping invoice`)
          continue
        }
        paymentId = existingPayment.id
      } else {
        // Create new payment record
        const { data: newPayment, error: insertError } = await supabaseAdmin
          .from("maintenance_payments")
          .insert({
            unit_id: unit.id,
            profile_id: primaryResident.id,
            year: currentYear,
            month: currentMonth,
            amount: unit.maintenance_charges ?? 0,
            status: "unpaid",
          })
          .select()
          .single()

        if (insertError || !newPayment) {
          result.failed++
          result.errors.push(`Unit ${unit.apartment_number}: Failed to create payment record`)
          continue
        }

        paymentId = newPayment.id
      }

      // Send invoice
      const invoiceLink = `${APP_BASE_URL}/maintenance-invoice/${paymentId}?snapshot=unpaid`
      const sendResult = await sendInvoiceWithLogging(
        {
          phone: primaryResident.phone_number,
          name: primaryResident.name || "Resident",
          monthYear: monthYearLabel,
          amount: unit.maintenance_charges ?? 0,
          dueDate,
          invoiceUrl: invoiceLink,
          unitId: unit.id,
          profileId: primaryResident.id,
          paymentId,
        },
        { triggeredBy, triggeredByUser }
      )

      if (sendResult.success) {
        result.sent++
      } else {
        result.failed++
        result.errors.push(`Unit ${unit.apartment_number}: ${sendResult.error}`)
      }
    }

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    result.errors.push(`Exception: ${errorMessage}`)
    return result
  }
}

/**
 * Send reminders for unpaid invoices to specified units
 */
export async function sendUnpaidReminders(
  options: {
    unitIds?: string[]
    triggeredBy: TriggerSource
    triggeredByUser?: string
  }
): Promise<BulkSendResult> {
  const { unitIds, triggeredBy, triggeredByUser } = options
  const { year: currentYear, month: currentMonth } = await getCurrentMonthYear()

  const result: BulkSendResult = {
    total: 0,
    sent: 0,
    failed: 0,
    errors: [],
    logs: [],
  }

  try {
    // Fetch units with primary residents
    let query = supabaseAdmin
      .from("units")
      .select(
        "id, apartment_number, maintenance_charges, profiles(id, name, phone_number, is_primary_resident, is_active)"
      )

    if (unitIds && unitIds.length > 0) {
      query = query.in("id", unitIds)
    }

    const { data: units, error: unitsError } = await query

    if (unitsError) {
      result.errors.push(`Failed to fetch units: ${unitsError.message}`)
      return result
    }

    if (!units || units.length === 0) {
      return result
    }

    result.total = units.length

    // Fetch unpaid payments for these units (include reminder_last_sent_at for throttling)
    const { data: unpaidPayments } = await supabaseAdmin
      .from("maintenance_payments")
      .select("id, unit_id, year, month, amount, status, reminder_last_sent_at")
      .in("unit_id", units.map((u) => u.id))
      .neq("status", "paid")
      .order("year", { ascending: true })
      .order("month", { ascending: true })

    const paymentsByUnit = new Map<string, any[]>()
    ;(unpaidPayments || []).forEach((p) => {
      const arr = paymentsByUnit.get(p.unit_id) || []
      arr.push(p)
      paymentsByUnit.set(p.unit_id, arr)
    })

    // Progressive throttling: determine minimum interval based on day of month
    const now = new Date(await getPakistanISOString())
    const dayOfMonth = now.getDate()
    let reminderIntervalDays: number
    if (dayOfMonth >= 16) {
      reminderIntervalDays = 1 // Overdue urgency: daily
    } else if (dayOfMonth >= 8) {
      reminderIntervalDays = 4 // Mid-month: every 4 days
    } else {
      reminderIntervalDays = 3 // Early month (days 3-7): every 3 days
    }
    const reminderIntervalMs = reminderIntervalDays * 24 * 60 * 60 * 1000

    for (const unit of units) {
      const residents = (unit.profiles as any[]) || []
      const primaryResident =
        residents.find((r) => r.is_primary_resident && r.is_active) ||
        residents.find((r) => r.is_active) ||
        null

      if (!primaryResident?.phone_number) {
        result.failed++
        result.errors.push(`Unit ${unit.apartment_number}: No primary resident with phone number`)
        continue
      }

      const unpaid = paymentsByUnit.get(unit.id) || []

      if (unpaid.length === 0) {
        // No unpaid payments for this unit
        continue
      }

      // Progressive throttling: skip if last reminder was sent too recently
      const lastSentAt = unpaid
        .map((p) => p.reminder_last_sent_at)
        .filter(Boolean)
        .sort()
        .pop() // most recent reminder timestamp across all unpaid payments
      if (lastSentAt) {
        const timeSinceLastReminder = now.getTime() - new Date(lastSentAt).getTime()
        if (timeSinceLastReminder < reminderIntervalMs) {
          continue // Skip — reminder sent too recently for this unit
        }
      }

      const totalDue = unpaid.reduce((sum, p) => sum + Number(p.amount || 0), 0)
      const monthsList = unpaid.map((p) => formatMonthYear(p.year, p.month)).join(", ")
      const invoiceLink = `${APP_BASE_URL}/maintenance-invoice/${unpaid[0].id}?snapshot=unpaid`

      const sendResult = await sendReminderWithLogging(
        {
          phone: primaryResident.phone_number,
          name: primaryResident.name || "Resident",
          monthsList,
          totalAmount: totalDue,
          invoiceUrl: invoiceLink,
          unitId: unit.id,
          profileId: primaryResident.id,
          paymentId: unpaid[0].id,
        },
        { triggeredBy, triggeredByUser }
      )

      if (sendResult.success) {
        result.sent++
        // Update reminder timestamp
        await supabaseAdmin
          .from("maintenance_payments")
          .update({ reminder_last_sent_at: await getPakistanISOString() })
          .in(
            "id",
            unpaid.map((p) => p.id)
          )
      } else {
        result.failed++
        result.errors.push(`Unit ${unit.apartment_number}: ${sendResult.error}`)
      }
    }

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    result.errors.push(`Exception: ${errorMessage}`)
    return result
  }
}

import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/date"
import {
  sendMaintenanceInvoice,
  sendMaintenanceReminder,
  formatMonthYear,
  formatDate,
  getTodayString,
} from "@/lib/twilio"

const CRON_KEY = process.env.CRON_SECRET
const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")

async function handleMaintenanceReminder(request: NextRequest) {
  const provided = request.headers.get("x-cron-key")
  if (CRON_KEY && provided !== CRON_KEY) return new Response("Unauthorized", { status: 401 })

  try {
    const today = new Date()
    const dayOfMonth = today.getDate()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1

    // Fetch all units with their primary residents for contact info
    const { data: units, error: uErr } = await supabaseAdmin
      .from("units")
      .select("id, apartment_number, maintenance_charges, profiles(id, name, phone_number, is_primary_resident, is_active)")
    if (uErr || !units) return new Response("Units fetch error", { status: 500 })

    // Fetch all ledgers for context
    const { data: ledgers } = await supabaseAdmin
      .from("maintenance_payments")
      .select("*")
      .gte("year", currentYear - 1)

    const ledgerByUnit = new Map<string, any[]>()
    ;(ledgers || []).forEach((row) => {
      const key = row.unit_id
      if (!key) return
      const arr = ledgerByUnit.get(key) || []
      arr.push(row)
      ledgerByUnit.set(key, arr)
    })

    // Process each unit
    for (const unit of units) {
      const residents = (unit.profiles as any[]) || []
      const primaryResident =
        residents.find((r) => r.is_primary_resident && r.is_active) ||
        residents.find((r) => r.is_active) ||
        null

      // Skip units with no active residents or no phone number
      if (!primaryResident?.phone_number) continue

      const rows = ledgerByUnit.get(unit.id) || []

      // Check if current month invoice exists
      const hasCurrent = rows.some((r) => r.year === currentYear && r.month === currentMonth)

      // If it's the 1st of the month and no invoice exists, create it and send notification
      if (dayOfMonth === 1 && !hasCurrent) {
        const { data: inserted } = await supabaseAdmin
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

        if (inserted) {
          rows.push(inserted)
          ledgerByUnit.set(unit.id, rows)

          // Send invoice ready message
          const invoiceLink = `${APP_BASE_URL}/maintenance-invoice/${inserted.id}?snapshot=unpaid`
          const monthYearLabel = formatMonthYear(currentYear, currentMonth)
          const dueDate = formatDate(new Date(currentYear, currentMonth - 1, 10).toISOString().slice(0, 10))

          await sendMaintenanceInvoice({
            phone: primaryResident.phone_number,
            name: primaryResident.name || "Resident",
            monthYear: monthYearLabel,
            amount: unit.maintenance_charges ?? 0,
            dueDate,
            invoiceUrl: invoiceLink,
          })

          // Check for old unpaid invoices and send a reminder alongside the new invoice
          const oldUnpaid = rows
            .filter((r) => r.status !== "paid" && r.id !== inserted.id)
            .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year))

          if (oldUnpaid.length > 0) {
            const totalDue = oldUnpaid.reduce((sum, r) => sum + Number(r.amount || 0), 0)
            const monthsList = oldUnpaid.map((r) => formatMonthYear(r.year, r.month)).join(", ")
            const oldInvoiceLink = `${APP_BASE_URL}/maintenance-invoice/${oldUnpaid[0].id}?snapshot=unpaid`

            await sendMaintenanceReminder({
              phone: primaryResident.phone_number,
              name: primaryResident.name || "Resident",
              monthsList,
              totalAmount: totalDue,
              invoiceUrl: oldInvoiceLink,
            })
          }
        }
      }
      // From 3rd onwards, send reminders for unpaid invoices
      else if (dayOfMonth >= 3) {
        // Ensure current month invoice exists (create if not - safety check)
        if (!hasCurrent) {
          const { data: inserted } = await supabaseAdmin
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

          if (inserted) {
            rows.push(inserted)
            ledgerByUnit.set(unit.id, rows)
          }
        }

        // Get all unpaid invoices
        const unpaid = (ledgerByUnit.get(unit.id) || [])
          .filter((r) => r.status !== "paid")
          .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year))

        if (unpaid.length === 0) continue

        // Check if reminder was already sent today
        const last = unpaid.find((r) => r.reminder_last_sent_at)
        const sentToday = last && last.reminder_last_sent_at?.slice(0, 10) === getTodayString()
        // if (sentToday) continue

        // Calculate total due and format months list
        const totalDue = unpaid.reduce((sum, r) => sum + Number(r.amount || 0), 0)
        const monthsList = unpaid.map((r) => formatMonthYear(r.year, r.month)).join(", ")
        const invoiceLink = `${APP_BASE_URL}/maintenance-invoice/${unpaid[0].id}?snapshot=unpaid`

        await sendMaintenanceReminder({
          phone: primaryResident.phone_number,
          name: primaryResident.name || "Resident",
          monthsList,
          totalAmount: totalDue,
          invoiceUrl: invoiceLink,
        })

        // Update reminder timestamp for all unpaid invoices
        const ids = unpaid.map((u) => u.id)
        await supabaseAdmin
          .from("maintenance_payments")
          .update({ reminder_last_sent_at: getPakistanISOString() })
          .in("id", ids)
      }
    }

    return new Response("Maintenance reminders processed", { status: 200 })
  } catch (e) {
    console.error("maintenance-reminder error:", e)
    return new Response("Error", { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handleMaintenanceReminder(request)
}

export async function POST(request: NextRequest) {
  return handleMaintenanceReminder(request)
}

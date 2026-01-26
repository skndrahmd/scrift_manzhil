import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/dateUtils"
import {
  sendMaintenanceInvoice,
  sendMaintenanceReminder,
  formatMonthYear,
  formatDate,
  getTodayString,
} from "@/lib/twilio"

const CRON_KEY = process.env.CRON_SECRET
const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com").replace(/\/$/, "")

export async function POST(request: NextRequest) {
  const provided = request.headers.get("x-cron-key")
  if (CRON_KEY && provided !== CRON_KEY) return new Response("Unauthorized", { status: 401 })

  try {
    const today = new Date()
    const dayOfMonth = today.getDate()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1

    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, name, phone_number, maintenance_charges")
    if (pErr || !profiles) return new Response("Profiles fetch error", { status: 500 })

    // Fetch all ledgers for context
    const { data: ledgers } = await supabase
      .from("maintenance_payments")
      .select("*")
      .gte("year", currentYear - 1)

    const ledgerByProfile = new Map<string, any[]>()
    ;(ledgers || []).forEach((row) => {
      const arr = ledgerByProfile.get(row.profile_id) || []
      arr.push(row)
      ledgerByProfile.set(row.profile_id, arr)
    })

    // Process each profile
    for (const prof of profiles) {
      const rows = ledgerByProfile.get(prof.id) || []

      // Check if current month invoice exists
      const hasCurrent = rows.some((r) => r.year === currentYear && r.month === currentMonth)

      // If it's the 1st of the month and no invoice exists, create it and send notification
      if (dayOfMonth === 1 && !hasCurrent) {
        const { data: inserted } = await supabase
          .from("maintenance_payments")
          .insert({
            profile_id: prof.id,
            year: currentYear,
            month: currentMonth,
            amount: prof.maintenance_charges ?? 0,
            status: "unpaid",
          })
          .select()
          .single()

        if (inserted) {
          rows.push(inserted)
          ledgerByProfile.set(prof.id, rows)

          // Send invoice ready message
          const invoiceLink = `${APP_BASE_URL}/maintenance-invoice/${inserted.id}?snapshot=unpaid`
          const monthYearLabel = formatMonthYear(currentYear, currentMonth)
          const dueDate = formatDate(new Date(currentYear, currentMonth - 1, 10).toISOString().slice(0, 10))

          await sendMaintenanceInvoice({
            phone: prof.phone_number,
            name: prof.name || "Resident",
            monthYear: monthYearLabel,
            amount: prof.maintenance_charges ?? 0,
            dueDate,
            invoiceUrl: invoiceLink,
          })
        }
      }
      // From 3rd onwards, send reminders for unpaid invoices
      else if (dayOfMonth >= 3) {
        // Ensure current month invoice exists (create if not - safety check)
        if (!hasCurrent) {
          const { data: inserted } = await supabase
            .from("maintenance_payments")
            .insert({
              profile_id: prof.id,
              year: currentYear,
              month: currentMonth,
              amount: prof.maintenance_charges ?? 0,
              status: "unpaid",
            })
            .select()
            .single()

          if (inserted) {
            rows.push(inserted)
            ledgerByProfile.set(prof.id, rows)
          }
        }

        // Get all unpaid invoices
        const unpaid = (ledgerByProfile.get(prof.id) || [])
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
          phone: prof.phone_number,
          name: prof.name || "Resident",
          monthsList,
          totalAmount: totalDue,
          invoiceUrl: invoiceLink,
        })

        // Update reminder timestamp for all unpaid invoices
        const ids = unpaid.map((u) => u.id)
        await supabase
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

export async function GET() {
  return new Response("Use POST", { status: 200 })
}

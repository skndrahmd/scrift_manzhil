import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/dateUtils"
import { sendWhatsAppMessage, sendWhatsAppTemplate } from "@/lib/twilio"

const CRON_KEY = process.env.CRON_SECRET
const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com").replace(/\/$/, "")
const MAINTENANCE_INVOICE_TEMPLATE_SID = process.env.TWILIO_MAINTENANCE_INVOICE_TEMPLATE_SID
const MAINTENANCE_PAYMENT_REMINDER_TEMPLATE_SID = process.env.TWILIO_MAINTENANCE_PAYMENT_REMINDER_TEMPLATE_SID

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function formatMonthYear(year: number, month: number) {
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  })
}

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
      ; (ledgers || []).forEach((row) => {
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

          // Send invoice ready message using template
          const invoiceLink = `${APP_BASE_URL}/maintenance-invoice/${inserted.id}?snapshot=unpaid`
          const monthYearLabel = formatMonthYear(currentYear, currentMonth)
          const dueDate = formatDate(new Date(currentYear, currentMonth - 1, 10).toISOString().slice(0, 10))
          const amount = (prof.maintenance_charges ?? 0).toLocaleString()

          // Fallback message
          const fallbackMessage = `Hello, this is Manzhil by Scrift.

Hi ${prof.name || "Resident"}, your ${monthYearLabel} maintenance invoice is ready.

Amount: Rs. ${amount}
Due Date: ${dueDate}

📄 View Invoice: ${invoiceLink}

Please pay at your earliest convenience.
- Manzhil by Scrift Team`

          if (MAINTENANCE_INVOICE_TEMPLATE_SID) {
            await sendWhatsAppTemplate(prof.phone_number, MAINTENANCE_INVOICE_TEMPLATE_SID, {
              "1": monthYearLabel,
              "2": amount,
              "3": dueDate,
              "4": invoiceLink,
            }, fallbackMessage)
          } else {
            await sendWhatsAppMessage(prof.phone_number, fallbackMessage)
          }
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
        const sentToday = last && last.reminder_last_sent_at?.slice(0, 10) === todayStr()
        // if (sentToday) continue

        // Calculate total due and format months list
        const totalDue = unpaid.reduce((sum, r) => sum + Number(r.amount || 0), 0)
        const monthsList = unpaid.map((r) => formatMonthYear(r.year, r.month)).join(", ")
        const invoiceLink = `${APP_BASE_URL}/maintenance-invoice/${unpaid[0].id}?snapshot=unpaid`

        // Fallback message
        const fallbackMessage = `Hello, this is Manzhil by Scrift.

Hi ${prof.name || "Resident"}, ⚠️ reminder: your maintenance payment is due.

Due months: ${monthsList}
Total amount: Rs. ${totalDue.toLocaleString()}

📄 View Invoice: ${invoiceLink}

Please pay as soon as possible. Thank you.
- Manzhil by Scrift Team`

        if (MAINTENANCE_PAYMENT_REMINDER_TEMPLATE_SID) {
          await sendWhatsAppTemplate(prof.phone_number, MAINTENANCE_PAYMENT_REMINDER_TEMPLATE_SID, {
            "1": monthsList,
            "2": totalDue.toLocaleString(),
            "3": invoiceLink,
          }, fallbackMessage)
        } else {
          await sendWhatsAppMessage(prof.phone_number, fallbackMessage)
        }

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

function formatDate(dateString: string) {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

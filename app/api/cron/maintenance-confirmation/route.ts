import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/date"
import { sendMaintenancePaymentConfirmed, formatMonthYear } from "@/lib/twilio"

const CRON_KEY = process.env.CRON_SECRET
const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com").replace(/\/$/, "")

export async function POST(request: NextRequest) {
  const provided = request.headers.get("x-cron-key")
  if (CRON_KEY && provided !== CRON_KEY) return new Response("Unauthorized", { status: 401 })
  try {
    const { data: rows } = await supabase
      .from("maintenance_payments")
      .select("*, profiles:profiles!maintenance_payments_profile_id_fkey (name, phone_number)")
      .eq("status", "paid")
      .eq("confirmation_sent", false)
      .limit(1000)

    if (!rows || rows.length === 0) return new Response("No confirmations to send", { status: 200 })

    for (const row of rows as any[]) {
      const invoiceLink = `${APP_BASE_URL}/maintenance-invoice/${row.id}?snapshot=paid`
      const monthYear = formatMonthYear(row.year, row.month)

      await sendMaintenancePaymentConfirmed({
        phone: row.profiles?.phone_number,
        name: row.profiles?.name || "Resident",
        monthYear,
        amount: Number(row.amount ?? 0),
        receiptUrl: invoiceLink,
      })

      await supabase
        .from("maintenance_payments")
        .update({
          confirmation_sent: true,
          confirmation_sent_at: getPakistanISOString(),
          updated_at: getPakistanISOString(),
        })
        .eq("id", row.id)
    }

    return new Response("Maintenance confirmations sent", { status: 200 })
  } catch (e) {
    console.error("maintenance-confirmation error:", e)
    return new Response("Error", { status: 500 })
  }
}

export async function GET() {
  return new Response("Use POST", { status: 200 })
}

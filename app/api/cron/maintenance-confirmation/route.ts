import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/date"
import { sendMaintenancePaymentConfirmed, formatMonthYear } from "@/lib/twilio"
import { startCronJob, endCronJob, logCronError } from "@/lib/cron-logger"

const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com").replace(/\/$/, "")

export async function POST(request: NextRequest) {

  // Start logging
  const cronLog = await startCronJob("maintenance-confirmation")

  try {
    const { data: rows } = await supabaseAdmin
      .from("maintenance_payments")
      .select("*, profiles:profiles!maintenance_payments_profile_id_fkey (name, phone_number)")
      .eq("status", "paid")
      .eq("confirmation_sent", false)
      .limit(1000)

    if (!rows || rows.length === 0) return new Response("No confirmations to send", { status: 200 })

    for (const row of rows as any[]) {
      // Look up current primary resident for the unit (don't rely on stale profile_id)
      const { data: currentPrimary } = await supabaseAdmin
        .from("profiles")
        .select("name, phone_number")
        .eq("unit_id", row.unit_id)
        .eq("is_primary_resident", true)
        .eq("is_active", true)
        .single()

      const recipient = currentPrimary || row.profiles

      const invoiceLink = `${APP_BASE_URL}/maintenance-invoice/${row.id}?snapshot=paid`
      const monthYear = formatMonthYear(row.year, row.month)

      await sendMaintenancePaymentConfirmed({
        phone: recipient?.phone_number,
        name: recipient?.name || "Resident",
        monthYear,
        amount: Number(row.amount ?? 0),
        receiptUrl: invoiceLink,
      })

      await supabaseAdmin
        .from("maintenance_payments")
        .update({
          confirmation_sent: true,
          confirmation_sent_at: await getPakistanISOString(),
          updated_at: await getPakistanISOString(),
        })
        .eq("id", row.id)
    }

    // Log completion
    await endCronJob(cronLog, {
      status: "success",
      recordsProcessed: rows?.length || 0,
      recordsSucceeded: rows?.length || 0,
      recordsFailed: 0,
      result: {
        confirmationsSent: rows?.length || 0,
      },
    })

    return new Response("Maintenance confirmations sent", { status: 200 })
  } catch (e) {
    console.error("maintenance-confirmation error:", e)
    await logCronError(cronLog, e)
    return new Response("Error", { status: 500 })
  }
}

export async function GET() {
  return new Response("Use POST", { status: 200 })
}

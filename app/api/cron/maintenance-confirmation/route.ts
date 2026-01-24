import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/dateUtils"
import { sendWhatsAppMessage, sendWhatsAppTemplate } from "@/lib/twilio"

const CRON_KEY = process.env.CRON_SECRET
const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com").replace(/\/$/, "")
const MAINTENANCE_PAYMENT_CONFIRMED_TEMPLATE_SID = process.env.TWILIO_MAINTENANCE_PAYMENT_CONFIRMED_TEMPLATE_SID

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
      const name = row.profiles?.name || "Resident"
      const invoiceLink = `${APP_BASE_URL}/maintenance-invoice/${row.id}?snapshot=paid`
      const month = new Date(row.year, row.month - 1, 1).toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      })
      const amount = Number(row.amount ?? 0).toLocaleString("en-PK")

      if (MAINTENANCE_PAYMENT_CONFIRMED_TEMPLATE_SID) {
        // Use WhatsApp template for payment confirmation
        // Template has 7 variables: 1=Name, 2=Month, 3=Year, 4=Apartment, 5=Amount, 6=PaymentDate, 7=InvoiceLink
        const paymentDate = new Date()
        const monthName = new Date(row.year, row.month - 1, 1).toLocaleString("en-US", { month: "long" })
        
        await sendWhatsAppTemplate(row.profiles?.phone_number, MAINTENANCE_PAYMENT_CONFIRMED_TEMPLATE_SID, {
          "1": name,              // Name (Sikander Ahmed)
          "2": monthName,         // Month (December)
          "3": row.year.toString(), // Year (2025)
          "4": row.profiles?.apartment_number || "N/A", // Apartment (A-101)
          "5": amount,            // Amount (5,000) - Rs. is in template
          "6": paymentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Karachi" }), // Payment Date (Dec 23, 2025)
          "7": invoiceLink,       // Invoice link
        })
      } else {
        // Fallback to freeform message if template SID not configured
        console.warn("MAINTENANCE_PAYMENT_CONFIRMED_TEMPLATE_SID not configured, using freeform message")
        const messageLines = [
          `Hello, this is Manzhil by Scrift.`,
          ``,
          `Hi ${name}, your maintenance payment for ${String(row.month).padStart(2, "0")}-${row.year} has been received. ✅`,
          `Invoice: ${invoiceLink}`,
          "- Manzhil by Scrift Team",
        ]
        await sendWhatsAppMessage(row.profiles?.phone_number, messageLines.join("\n"))
      }

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


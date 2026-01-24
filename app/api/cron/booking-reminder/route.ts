import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/dateUtils"
import { sendWhatsAppMessage, sendWhatsAppTemplate } from "@/lib/twilio"

const CRON_KEY = process.env.CRON_SECRET
const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com").replace(/\/$/, "")
const BOOKING_PAYMENT_REMINDER_TEMPLATE_SID = process.env.TWILIO_BOOKING_PAYMENT_REMINDER_TEMPLATE_SID
const BOOKING_CANCELLED_TEMPLATE_SID = process.env.TWILIO_BOOKING_CANCELLED_TEMPLATE_SID

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00")
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`
}

function daysSinceCreation(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - created.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export async function POST(request: NextRequest) {
  const provided = request.headers.get("x-cron-key")
  if (CRON_KEY && provided !== CRON_KEY) return new Response("Unauthorized", { status: 401 })

  try {
    const { data: bookings } = await supabase
      .from("bookings")
      .select(
        `
        *,
        profiles:profiles!bookings_profile_id_fkey ( id, name, phone_number )
      `,
      )
      .eq("status", "confirmed")
      .eq("payment_status", "pending")
      .limit(1000)

    if (!bookings || bookings.length === 0) {
      return new Response("No booking reminders to send", { status: 200 })
    }

    for (const b of bookings as any[]) {
      if (!b.created_at) continue

      const daysSince = daysSinceCreation(b.created_at)
      const invoiceLink = `${APP_BASE_URL}/booking-invoice/${b.id}?payment=pending&booking=confirmed`

      // Day 0 (same day as creation): Don't send reminder
      if (daysSince === 0) {
        continue
      }

      // Day 3+: Cancel the booking
      if (daysSince >= 3) {
        await supabase
          .from("bookings")
          .update({ status: "cancelled", updated_at: getPakistanISOString() })
          .eq("id", b.id)

        if (b.profiles?.phone_number) {
          const residentName = b.profiles.name || "Resident"
          const bookingDate = fmtDate(b.booking_date)
          const startTime = fmtTime(b.start_time)
          const endTime = fmtTime(b.end_time)

          let templateSent = false
          
          if (BOOKING_CANCELLED_TEMPLATE_SID) {
            try {
              // Use WhatsApp template for cancellation notice
              // Template has 6 variables: 1=Name, 2=Date, 3=StartTime, 4=EndTime, 5=BookingID, 6=ReceiptLink
              await sendWhatsAppTemplate(b.profiles.phone_number, BOOKING_CANCELLED_TEMPLATE_SID, {
                "1": residentName,      // Name (Sikander Ahmed)
                "2": bookingDate,       // Date (December 13, 2025)
                "3": startTime,         // Start Time (11:00 AM)
                "4": endTime,           // End Time (12:00 PM)
                "5": b.id,              // Booking ID (full UUID)
                "6": invoiceLink,       // Cancellation Receipt Link
              })
              templateSent = true
            } catch (templateError) {
              console.error("Template failed, using fallback:", templateError)
            }
          }
          
          // Fallback to freeform message if template not sent
          if (!templateSent) {
            console.warn("BOOKING_CANCELLED_TEMPLATE_SID not configured or failed, using freeform message")
            const cancelLines = [
              `Your booking on ${bookingDate} (${startTime} - ${endTime}) has been cancelled due to non-payment within 3 days of booking.`,
              `Invoice: ${invoiceLink}`,
              "- Greens Three Management",
            ]
            await sendWhatsAppMessage(b.profiles.phone_number, cancelLines.join("\n"))
          }
        }
        continue
      }

      // Day 1 or Day 2: Send reminder
      const today = getPakistanISOString().slice(0, 10)
      const sentToday = b.reminder_last_sent_at && b.reminder_last_sent_at.slice(0, 10) === today
      // if (sentToday) continue

      if (b.profiles?.phone_number) {
        const amount = Number(b.booking_charges).toLocaleString()
        const bookingDate = fmtDate(b.booking_date)
        const startTime = fmtTime(b.start_time)
        const endTime = fmtTime(b.end_time)

        let templateSent = false
        
        if (BOOKING_PAYMENT_REMINDER_TEMPLATE_SID) {
          try {
            // Use WhatsApp template for payment reminder
            await sendWhatsAppTemplate(b.profiles.phone_number, BOOKING_PAYMENT_REMINDER_TEMPLATE_SID, {
              "1": amount,
              "2": bookingDate,
              "3": startTime,
              "4": endTime,
              "5": String(daysSince),
              "6": invoiceLink,
            })
            templateSent = true
          } catch (templateError) {
            console.error("Template failed, using fallback:", templateError)
          }
        }
        
        // Fallback to freeform message if template not sent
        if (!templateSent) {
          console.warn("BOOKING_PAYMENT_REMINDER_TEMPLATE_SID not configured or failed, using freeform message")
          const reminderLines = [
            `Reminder: Please pay Rs. ${amount} for your booking on ${bookingDate} (${startTime} - ${endTime}).`,
            `Payment is due within 3 days of booking. Day ${daysSince} of 3.`,
            `Invoice: ${invoiceLink}`,
            "- Greens Three Management",
          ]
          await sendWhatsAppMessage(b.profiles.phone_number, reminderLines.join("\n"))
        }
      }

      await supabase
        .from("bookings")
        .update({ reminder_last_sent_at: getPakistanISOString(), updated_at: getPakistanISOString() })
        .eq("id", b.id)
    }

    return new Response("Booking reminders processed", { status: 200 })
  } catch (e) {
    console.error("booking-reminder error:", e)
    return new Response("Error", { status: 500 })
  }
}

export async function GET() {
  return new Response("Use POST", { status: 200 })
}


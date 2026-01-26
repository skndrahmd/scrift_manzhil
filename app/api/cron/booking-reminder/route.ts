import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/dateUtils"
import {
  sendBookingReminder,
  sendBookingCancelled,
  formatDate,
  formatTime,
} from "@/lib/twilio"

const CRON_KEY = process.env.CRON_SECRET
const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com").replace(/\/$/, "")

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
          await sendBookingCancelled({
            phone: b.profiles.phone_number,
            name: b.profiles.name || "Resident",
            bookingDate: b.booking_date,
            startTime: b.start_time,
            endTime: b.end_time,
            reason: "Non-payment within 3 days of booking",
          })
        }
        continue
      }

      // Day 1 or Day 2: Send reminder
      const today = getPakistanISOString().slice(0, 10)
      const sentToday = b.reminder_last_sent_at && b.reminder_last_sent_at.slice(0, 10) === today
      // if (sentToday) continue

      if (b.profiles?.phone_number) {
        await sendBookingReminder({
          phone: b.profiles.phone_number,
          name: b.profiles.name || "Resident",
          bookingDate: b.booking_date,
          startTime: b.start_time,
          endTime: b.end_time,
        })
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

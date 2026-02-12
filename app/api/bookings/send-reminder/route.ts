import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { sendBookingReminder } from "@/lib/twilio"
import { getPakistanISOString } from "@/lib/dateUtils"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingIds } = body as { bookingIds: string[] }

    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return NextResponse.json({ error: "No booking IDs provided" }, { status: 400 })
    }

    const { data: bookings, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("*, profiles:profiles!bookings_profile_id_fkey(id, name, phone_number, apartment_number)")
      .in("id", bookingIds)
      .eq("status", "confirmed")
      .eq("payment_status", "pending")

    if (fetchError) {
      console.error("[BOOKING SEND-REMINDER] Error fetching bookings:", fetchError)
      return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 })
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ total: 0, sent: 0, failed: 0, errors: ["No eligible bookings found"] })
    }

    const results = {
      total: bookings.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const booking of bookings as any[]) {
      const profile = booking.profiles
      if (!profile?.phone_number) {
        results.failed++
        results.errors.push(`Booking ${booking.id.slice(0, 8)}: No phone number`)
        continue
      }

      try {
        const result = await sendBookingReminder({
          phone: profile.phone_number,
          name: profile.name || "Resident",
          bookingDate: booking.booking_date,
          startTime: booking.start_time,
          endTime: booking.end_time,
        })

        if (result.ok) {
          results.sent++
          await supabaseAdmin
            .from("bookings")
            .update({ reminder_last_sent_at: getPakistanISOString(), updated_at: getPakistanISOString() })
            .eq("id", booking.id)
        } else {
          results.failed++
          results.errors.push(`Booking ${booking.id.slice(0, 8)}: ${result.error || "Send failed"}`)
        }
      } catch (error) {
        results.failed++
        results.errors.push(`Booking ${booking.id.slice(0, 8)}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    console.log(`[BOOKING SEND-REMINDER] Complete - Sent: ${results.sent}, Failed: ${results.failed}`)
    return NextResponse.json(results)
  } catch (error) {
    console.error("[BOOKING SEND-REMINDER] Error:", error)
    return NextResponse.json({ error: "Failed to send booking reminders" }, { status: 500 })
  }
}

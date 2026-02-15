import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { sendBookingReminders } from "@/lib/services/booking"
import { ServiceError } from "@/lib/services/complaint"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await sendBookingReminders(body?.bookingIds)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[BOOKING SEND-REMINDER] Error:", error)
    return NextResponse.json({ error: "Failed to send booking reminders" }, { status: 500 })
  }
}

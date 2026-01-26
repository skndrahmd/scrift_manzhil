import type { NextRequest } from "next/server"

const CRON_KEY = process.env.CRON_SECRET

export async function POST(request: NextRequest) {
  const provided = request.headers.get("x-cron-key")
  if (CRON_KEY && provided !== CRON_KEY) return new Response("Unauthorized", { status: 401 })
  try {
    // Note: Booking payment confirmations are now sent immediately when payment status is updated
    // This cron job is kept for backward compatibility but may not find any records to process
    // since confirmations are sent via /api/bookings/update-payment-status

    return new Response("Booking confirmations are sent immediately on payment update", { status: 200 })
  } catch (e) {
    console.error("booking-confirmation error:", e)
    return new Response("Error", { status: 500 })
  }
}

export async function GET() {
  return new Response("Use POST", { status: 200 })
}

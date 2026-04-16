import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
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

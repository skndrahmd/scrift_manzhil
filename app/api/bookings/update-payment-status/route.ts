import type { NextRequest } from "next/server"
import { updateBookingPaymentStatus } from "@/lib/services/booking"
import { ServiceError } from "@/lib/services/complaint"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await updateBookingPaymentStatus(body?.bookingId, body?.paymentStatus)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    if (error instanceof ServiceError) {
      return new Response(
        JSON.stringify({ error: error.message, ...(error.code ? { code: error.code } : {}) }),
        { status: error.status, headers: { "Content-Type": "application/json" } }
      )
    }
    console.error("Unexpected error:", error)
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}

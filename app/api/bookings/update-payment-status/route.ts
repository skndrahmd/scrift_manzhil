import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/dateUtils"
import { sendBookingConfirmation, formatDate, formatTime } from "@/lib/twilio"

const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com").replace(/\/$/, "")

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, paymentStatus } = body

    console.log("=== UPDATE BOOKING PAYMENT STATUS ===")
    console.log("Booking ID:", bookingId)
    console.log("Payment Status:", paymentStatus)

    // Validate required fields
    if (!bookingId) {
      return new Response(JSON.stringify({ error: "Booking ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!paymentStatus) {
      return new Response(JSON.stringify({ error: "Payment status is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Validate payment status value
    const allowedStatuses = ["paid", "pending"]
    if (!allowedStatuses.includes(paymentStatus)) {
      return new Response(JSON.stringify({ error: `Payment status must be one of: ${allowedStatuses.join(", ")}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Fetch the booking with profile information
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select(
        `
        *,
        profiles (name, phone_number, apartment_number)
      `,
      )
      .eq("id", bookingId)
      .single()

    if (fetchError) {
      console.error("Error fetching booking:", fetchError)
      return new Response(JSON.stringify({ error: `Failed to fetch booking: ${fetchError.message}` }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Store original updated_at for optimistic locking
    const originalUpdatedAt = booking.updated_at

    console.log("Found booking:", booking)

    // Optimistic locking: only update if record hasn't changed since we read it
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({
        payment_status: paymentStatus,
        updated_at: getPakistanISOString(),
      })
      .eq("id", bookingId)
      .eq("updated_at", originalUpdatedAt)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating booking:", updateError)
      return new Response(JSON.stringify({ error: `Failed to update booking: ${updateError.message}` }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    // If no rows were updated, the record was modified by another process
    if (!updatedBooking) {
      return new Response(JSON.stringify({
        error: "Booking was modified by another process. Please refresh and try again.",
        code: "CONCURRENT_MODIFICATION"
      }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("Updated booking:", updatedBooking)

    // Send WhatsApp notification if payment is confirmed
    if (paymentStatus === "paid" && booking.profiles?.phone_number) {
      try {
        const invoiceUrl = `${APP_BASE_URL}/booking-invoice/${booking.id}?payment=paid&booking=confirmed`

        await sendBookingConfirmation({
          phone: booking.profiles.phone_number,
          name: booking.profiles.name || "Resident",
          bookingDate: booking.booking_date,
          startTime: booking.start_time,
          endTime: booking.end_time,
          amount: booking.booking_charges,
          bookingId: booking.id,
          invoiceUrl,
        })
        console.log("WhatsApp notification sent successfully")
      } catch (whatsappError) {
        console.error("Error sending WhatsApp notification:", whatsappError)
        // Don't fail the request if WhatsApp fails
      }

      // Create transaction record for accounting
      try {
        await supabaseAdmin.from("transactions").insert({
          transaction_type: "booking_income",
          reference_id: booking.id,
          profile_id: booking.profile_id,
          amount: booking.booking_charges,
          description: `Hall Booking - ${formatDate(booking.booking_date)}`,
          transaction_date: new Date().toISOString().split('T')[0],
          payment_method: "cash",
          notes: `Booking from ${formatTime(booking.start_time)} to ${formatTime(booking.end_time)}`
        })
        console.log("Transaction record created for booking:", booking.id)
      } catch (transactionError) {
        console.error("Error creating transaction record:", transactionError)
        // Don't fail the request if transaction record fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Booking payment status updated successfully",
        booking: updatedBooking,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Unexpected error:", error)
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

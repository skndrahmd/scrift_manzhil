import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/dateUtils"
import { sendWhatsAppMessage, sendWhatsAppTemplate } from "@/lib/twilio"

const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com").replace(/\/$/, "")
const BOOKING_PAYMENT_CONFIRMED_TEMPLATE_SID = process.env.TWILIO_BOOKING_PAYMENT_CONFIRMED_TEMPLATE_SID

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
    const { data: booking, error: fetchError } = await supabase
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

    console.log("Found booking:", booking)

    // Update the booking payment status
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        payment_status: paymentStatus,
        updated_at: getPakistanISOString(),
      })
      .eq("id", bookingId)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating booking:", updateError)
      return new Response(JSON.stringify({ error: `Failed to update booking: ${updateError.message}` }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("Updated booking:", updatedBooking)

    // Send WhatsApp notification if payment is confirmed
    if (paymentStatus === "paid" && booking.profiles?.phone_number) {
      try {
        const invoiceUrl = `${APP_BASE_URL}/booking-invoice/${booking.id}?payment=paid&booking=confirmed`
        const residentName = booking.profiles.name || "Resident"
        const amount = booking.booking_charges.toLocaleString()
        const bookingDate = formatDate(booking.booking_date)
        const startTime = formatTime(booking.start_time)
        const endTime = formatTime(booking.end_time)

        let templateSent = false

        if (BOOKING_PAYMENT_CONFIRMED_TEMPLATE_SID) {
          try {
            // Use WhatsApp template for payment confirmation
            // Template has 7 variables: 1=Name, 2=Date, 3=StartTime, 4=EndTime, 5=Amount, 6=BookingID, 7=ReceiptLink
            await sendWhatsAppTemplate(booking.profiles.phone_number, BOOKING_PAYMENT_CONFIRMED_TEMPLATE_SID, {
              "1": residentName,      // Name (Sikander Ahmed)
              "2": bookingDate,       // Date (December 15, 2024)
              "3": startTime,         // Start Time (09:00 AM)
              "4": endTime,           // End Time (01:00 PM)
              "5": amount,            // Amount (25,000)
              "6": booking.id,        // Booking ID (UUID)
              "7": invoiceUrl,        // Receipt Link
            })
            templateSent = true
          } catch (templateError) {
            console.error("Template failed, using fallback:", templateError)
          }
        }

        // Fallback to freeform message if template not sent
        if (!templateSent) {
          console.warn("BOOKING_PAYMENT_CONFIRMED_TEMPLATE_SID not configured or failed, using freeform message")
          const messageLines = [
            "✅ PAYMENT CONFIRMED!",
            "",
            `Your payment of Rs. ${amount} has been received.`,
            "",
            `Booking Date: ${bookingDate}`,
            `Time: ${startTime} - ${endTime}`,
            "",
            `📄 View Paid Invoice: ${invoiceUrl}`,
            "",
            "Thank you for your payment!",
            "- Greens Three Management",
          ]
          await sendWhatsAppMessage(booking.profiles.phone_number, messageLines.join("\n"))
        }
        console.log("WhatsApp notification sent successfully")
      } catch (whatsappError) {
        console.error("Error sending WhatsApp notification:", whatsappError)
        // Don't fail the request if WhatsApp fails
      }

      // Create transaction record for accounting
      try {
        await supabase.from("transactions").insert({
          transaction_type: "booking_income",
          reference_id: booking.id,
          profile_id: booking.profile_id,
          amount: booking.booking_charges,
          description: `Hall Booking - ${formatDate(booking.booking_date)}`,
          transaction_date: new Date().toISOString().split('T')[0],
          payment_method: "cash", // Default, can be updated to track actual method
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

function formatDate(dateString: string) {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatTime(timeString: string) {
  const [hours, minutes] = timeString.split(":")
  const hour = Number.parseInt(hours)
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${ampm}`
}

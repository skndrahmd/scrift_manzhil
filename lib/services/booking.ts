/**
 * @module booking
 * Service layer for hall booking payment management, WhatsApp confirmations
 * and reminders, and transaction record creation for accounting.
 */
import { supabaseAdmin } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/date"
import { sendBookingConfirmation, sendBookingReminder as sendBookingReminderNotification, formatDate, formatTime } from "@/lib/twilio"
import { ServiceError } from "./complaint"

const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com").replace(/\/$/, "")

/**
 * Updates a booking's payment status with optimistic locking,
 * sends WhatsApp confirmation, and creates transaction records.
 * @param bookingId - UUID of the booking record
 * @param paymentStatus - New payment status: "paid" or "pending"
 * @returns Object with `{ success, message, booking }` containing the updated booking
 * @throws {ServiceError} 400 if input is invalid, 404 if booking not found, 409 on concurrent modification
 */
export async function updateBookingPaymentStatus(bookingId: string, paymentStatus: string) {
  if (!bookingId) {
    throw new ServiceError("Booking ID is required", 400)
  }

  const allowedStatuses = ["paid", "pending"]
  if (!paymentStatus || !allowedStatuses.includes(paymentStatus)) {
    throw new ServiceError(`Payment status must be one of: ${allowedStatuses.join(", ")}`, 400)
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
    throw new ServiceError(`Failed to fetch booking: ${fetchError.message}`, 500)
  }

  if (!booking) {
    throw new ServiceError("Booking not found", 404)
  }

  // Store original updated_at for optimistic locking
  const originalUpdatedAt = booking.updated_at

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
    throw new ServiceError(`Failed to update booking: ${updateError.message}`, 500)
  }

  if (!updatedBooking) {
    throw new ServiceError(
      "Booking was modified by another process. Please refresh and try again.",
      409,
      "CONCURRENT_MODIFICATION"
    )
  }

  // If marking as unpaid, clean up any transaction records for this booking
  if (paymentStatus === "pending") {
    try {
      await supabaseAdmin
        .from("transactions")
        .delete()
        .eq("reference_id", bookingId)
        .eq("transaction_type", "booking_income")
      console.log("Cleaned up transaction records for booking:", bookingId)
    } catch (cleanupError) {
      console.error("Error cleaning up transaction records:", cleanupError)
    }
  }

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
    }

    // Create transaction record for accounting (with duplicate guard)
    try {
      const { data: existingTxn } = await supabaseAdmin
        .from("transactions")
        .select("id")
        .eq("reference_id", booking.id)
        .eq("transaction_type", "booking_income")
        .maybeSingle()

      if (!existingTxn) {
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
      } else {
        console.log("Transaction record already exists for booking:", booking.id)
      }
    } catch (transactionError) {
      console.error("Error creating transaction record:", transactionError)
    }
  }

  return {
    success: true,
    message: "Booking payment status updated successfully",
    booking: updatedBooking,
  }
}

/**
 * Sends booking payment reminders to a list of bookings
 * and updates the reminder_last_sent_at timestamp.
 * @param bookingIds - Array of booking UUIDs to send reminders for
 * @returns Summary object with `{ total, sent, failed, errors }` counts
 * @throws {ServiceError} 400 if no booking IDs provided, 500 if fetch fails
 */
export async function sendBookingReminders(bookingIds: string[]) {
  if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
    throw new ServiceError("No booking IDs provided", 400)
  }

  const { data: bookings, error: fetchError } = await supabaseAdmin
    .from("bookings")
    .select("*, profiles:profiles!bookings_profile_id_fkey(id, name, phone_number, apartment_number)")
    .in("id", bookingIds)
    .eq("status", "confirmed")
    .eq("payment_status", "pending")

  if (fetchError) {
    throw new ServiceError("Failed to fetch bookings", 500)
  }

  if (!bookings || bookings.length === 0) {
    return { total: 0, sent: 0, failed: 0, errors: ["No eligible bookings found"] }
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
      const result = await sendBookingReminderNotification({
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
  return results
}

/**
 * Booking Notifications
 * WhatsApp notifications for hall bookings
 */

import { sendWithFallback } from "../send"
import { getTemplateSid } from "../templates"
import { formatCurrency, formatDate, formatTime } from "../formatters"
import type {
  TwilioResult,
  BookingConfirmationParams,
  BookingReminderParams,
  BookingCancelledParams,
} from "../types"

/**
 * Send booking payment confirmed notification
 * Sent when a booking payment is marked as paid
 */
export async function sendBookingConfirmation(
  params: BookingConfirmationParams
): Promise<TwilioResult> {
  const { phone, name, bookingDate, startTime, endTime, amount, bookingId, invoiceUrl } = params

  const formattedAmount = await formatCurrency(amount)
  const formattedDate = formatDate(bookingDate)
  const formattedStartTime = formatTime(startTime)
  const formattedEndTime = formatTime(endTime)

  const templateSid = await getTemplateSid("booking_payment_confirmed")
  const templateVariables = {
    "1": name || "Resident",
    "2": formattedDate,
    "3": formattedStartTime,
    "4": formattedEndTime,
    "5": formattedAmount,
    "6": bookingId,
    "7": invoiceUrl,
  }

  const fallbackMessage = `✅ *Payment Confirmed*

📅 ${formattedDate} | ⏰ ${formattedStartTime} – ${formattedEndTime}
💰 ${formattedAmount} | 🎫 ID: ${bookingId}

Hi ${name || "Resident"}, your payment is received!

📄 Invoice: ${invoiceUrl}

— Manzhil`

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

/**
 * Send booking reminder notification
 * Sent before a scheduled booking
 */
export async function sendBookingReminder(
  params: BookingReminderParams
): Promise<TwilioResult> {
  const { phone, name, bookingDate, startTime, endTime, hallType } = params

  const formattedDate = formatDate(bookingDate)
  const formattedStartTime = formatTime(startTime)
  const formattedEndTime = formatTime(endTime)

  const templateSid = await getTemplateSid("booking_payment_reminder")
  const templateVariables = {
    "1": name || "Resident",
    "2": formattedDate,
    "3": formattedStartTime,
    "4": formattedEndTime,
  }

  const hallLabel = hallType ? ` (${hallType})` : ""
  const fallbackMessage = `🔔 *Booking Reminder*

📅 ${formattedDate}${hallLabel}
⏰ ${formattedStartTime} – ${formattedEndTime}

Hi ${name || "Resident"}, reminder about your upcoming booking. Please be available at the scheduled time.

— Manzhil`

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

/**
 * Send booking cancelled notification
 * Sent when a booking is cancelled
 */
export async function sendBookingCancelled(
  params: BookingCancelledParams
): Promise<TwilioResult> {
  const { phone, name, bookingDate, startTime, endTime, reason } = params

  const formattedDate = formatDate(bookingDate)
  const formattedStartTime = formatTime(startTime)
  const formattedEndTime = formatTime(endTime)

  const templateSid = await getTemplateSid("booking_cancelled")
  const templateVariables = {
    "1": name || "Resident",
    "2": formattedDate,
    "3": formattedStartTime,
    "4": formattedEndTime,
  }

  const reasonLine = reason ? `\n📝 Reason: ${reason}` : ""
  const fallbackMessage = `❌ *Booking Cancelled*

📅 ${formattedDate} | ⏰ ${formattedStartTime} – ${formattedEndTime}${reasonLine}

Hi ${name || "Resident"}, your booking has been cancelled. Contact us if you have questions.

— Manzhil`

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

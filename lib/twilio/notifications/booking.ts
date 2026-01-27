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

// Divider constant for consistent styling
const DIVIDER = "───────────────────"

/**
 * Send booking payment confirmed notification
 * Sent when a booking payment is marked as paid
 */
export async function sendBookingConfirmation(
  params: BookingConfirmationParams
): Promise<TwilioResult> {
  const { phone, name, bookingDate, startTime, endTime, amount, bookingId, invoiceUrl } = params

  const formattedAmount = formatCurrency(amount)
  const formattedDate = formatDate(bookingDate)
  const formattedStartTime = formatTime(startTime)
  const formattedEndTime = formatTime(endTime)

  const templateSid = getTemplateSid("booking_payment_confirmed")
  // Template variables: 1=Name, 2=Date, 3=StartTime, 4=EndTime, 5=Amount, 6=BookingID, 7=ReceiptLink
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

${DIVIDER}
📋 *Booking Details*
${DIVIDER}

• Date: ${formattedDate}
• Time: ${formattedStartTime} – ${formattedEndTime}
• Amount: Rs. ${formattedAmount}
• Booking ID: ${bookingId}

${DIVIDER}

Hi ${name || "Resident"}, your payment has been received successfully.

📄 View Invoice: ${invoiceUrl}

${DIVIDER}
Thank you for your payment!
— Manzhil by Scrift`

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

  const templateSid = getTemplateSid("booking_payment_reminder")
  const templateVariables = {
    "1": name || "Resident",
    "2": formattedDate,
    "3": formattedStartTime,
    "4": formattedEndTime,
  }

  const hallLabel = hallType ? ` (${hallType})` : ""
  const fallbackMessage = `🔔 *Booking Reminder*

${DIVIDER}
📅 *Upcoming Booking${hallLabel}*
${DIVIDER}

• Date: ${formattedDate}
• Time: ${formattedStartTime} – ${formattedEndTime}

${DIVIDER}

Hi ${name || "Resident"}, this is a friendly reminder about your upcoming booking.

Please ensure you're available at the scheduled time.

${DIVIDER}
— Manzhil by Scrift`

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

  const templateSid = getTemplateSid("booking_cancelled")
  const templateVariables = {
    "1": name || "Resident",
    "2": formattedDate,
    "3": formattedStartTime,
    "4": formattedEndTime,
  }

  const reasonLine = reason ? `• Reason: ${reason}\n` : ""
  const fallbackMessage = `❌ *Booking Cancelled*

${DIVIDER}
📅 *Cancelled Booking*
${DIVIDER}

• Date: ${formattedDate}
• Time: ${formattedStartTime} – ${formattedEndTime}
${reasonLine}
${DIVIDER}

Hi ${name || "Resident"}, your booking has been cancelled.

If you have any questions, please contact us.

${DIVIDER}
— Manzhil by Scrift`

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

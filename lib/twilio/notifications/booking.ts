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

  const fallbackMessage = [
    "Hello, this is Manzhil by Scrift.",
    "",
    "PAYMENT CONFIRMED!",
    "",
    `Hi ${name || "Resident"}, your payment of Rs. ${formattedAmount} has been received.`,
    "",
    `Booking Date: ${formattedDate}`,
    `Time: ${formattedStartTime} - ${formattedEndTime}`,
    "",
    `View Paid Invoice: ${invoiceUrl}`,
    "",
    "Thank you for your payment!",
    "- Manzhil by Scrift Team",
  ].join("\n")

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

  const hallLabel = hallType ? ` for the ${hallType}` : ""
  const fallbackMessage = [
    "Hello, this is Manzhil by Scrift.",
    "",
    "BOOKING REMINDER",
    "",
    `Hi ${name || "Resident"}, this is a reminder about your upcoming booking${hallLabel}.`,
    "",
    `Date: ${formattedDate}`,
    `Time: ${formattedStartTime} - ${formattedEndTime}`,
    "",
    "Please ensure you're available at the scheduled time.",
    "- Manzhil by Scrift Team",
  ].join("\n")

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

  const reasonLine = reason ? `\nReason: ${reason}` : ""
  const fallbackMessage = [
    "Hello, this is Manzhil by Scrift.",
    "",
    "BOOKING CANCELLED",
    "",
    `Hi ${name || "Resident"}, your booking has been cancelled.`,
    "",
    `Date: ${formattedDate}`,
    `Time: ${formattedStartTime} - ${formattedEndTime}`,
    reasonLine,
    "",
    "If you have any questions, please contact us.",
    "- Manzhil by Scrift Team",
  ].join("\n")

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

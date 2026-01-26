/**
 * Maintenance Notifications
 * WhatsApp notifications for maintenance payments
 */

import { sendWithFallback } from "../send"
import { getTemplateSid } from "../templates"
import { formatCurrency } from "../formatters"
import type {
  TwilioResult,
  MaintenanceInvoiceParams,
  MaintenanceReminderParams,
  MaintenancePaymentConfirmedParams,
} from "../types"

/**
 * Send maintenance invoice notification
 * Sent on the 1st of each month when a new invoice is generated
 */
export async function sendMaintenanceInvoice(
  params: MaintenanceInvoiceParams
): Promise<TwilioResult> {
  const { phone, name, monthYear, amount, dueDate, invoiceUrl } = params
  const formattedAmount = formatCurrency(amount)

  const templateSid = getTemplateSid("maintenance_invoice")
  const templateVariables = {
    "1": monthYear,
    "2": formattedAmount,
    "3": dueDate,
    "4": invoiceUrl,
  }

  const fallbackMessage = [
    "Hello, this is Manzhil by Scrift.",
    "",
    `Hi ${name || "Resident"}, your ${monthYear} maintenance invoice is ready.`,
    "",
    `Amount: Rs. ${formattedAmount}`,
    `Due Date: ${dueDate}`,
    "",
    `View Invoice: ${invoiceUrl}`,
    "",
    "Please pay at your earliest convenience.",
    "- Manzhil by Scrift Team",
  ].join("\n")

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

/**
 * Send maintenance payment reminder
 * Sent from the 3rd of each month for unpaid invoices
 */
export async function sendMaintenanceReminder(
  params: MaintenanceReminderParams
): Promise<TwilioResult> {
  const { phone, name, monthsList, totalAmount, invoiceUrl } = params
  const formattedAmount = formatCurrency(totalAmount)

  const templateSid = getTemplateSid("maintenance_payment_reminder")
  const templateVariables = {
    "1": monthsList,
    "2": formattedAmount,
    "3": invoiceUrl,
  }

  const fallbackMessage = [
    "Hello, this is Manzhil by Scrift.",
    "",
    `Hi ${name || "Resident"}, reminder: your maintenance payment is due.`,
    "",
    `Due months: ${monthsList}`,
    `Total amount: Rs. ${formattedAmount}`,
    "",
    `View Invoice: ${invoiceUrl}`,
    "",
    "Please pay as soon as possible. Thank you.",
    "- Manzhil by Scrift Team",
  ].join("\n")

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

/**
 * Send maintenance payment confirmed notification
 * Sent when a maintenance payment is marked as paid
 */
export async function sendMaintenancePaymentConfirmed(
  params: MaintenancePaymentConfirmedParams
): Promise<TwilioResult> {
  const { phone, name, monthYear, amount, receiptUrl } = params
  const formattedAmount = formatCurrency(amount)

  const templateSid = getTemplateSid("maintenance_payment_confirmed")
  const templateVariables = {
    "1": name || "Resident",
    "2": monthYear,
    "3": formattedAmount,
    "4": receiptUrl,
  }

  const fallbackMessage = [
    "Hello, this is Manzhil by Scrift.",
    "",
    "PAYMENT CONFIRMED!",
    "",
    `Hi ${name || "Resident"}, your maintenance payment of Rs. ${formattedAmount} for ${monthYear} has been received.`,
    "",
    `View Receipt: ${receiptUrl}`,
    "",
    "Thank you for your payment!",
    "- Manzhil by Scrift Team",
  ].join("\n")

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

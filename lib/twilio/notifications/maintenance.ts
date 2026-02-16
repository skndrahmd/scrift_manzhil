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

  const templateSid = await getTemplateSid("maintenance_invoice")
  const templateVariables = {
    "1": monthYear,
    "2": formattedAmount,
    "3": dueDate,
    "4": invoiceUrl,
  }

  const fallbackMessage = `📄 *Maintenance Invoice - ${monthYear}*

💰 Amount: Rs. ${formattedAmount}
📅 Due: ${dueDate}

Hi ${name || "Resident"}, your invoice is ready. Please pay at your convenience.

📄 Invoice: ${invoiceUrl}

— Manzhil`

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

  const templateSid = await getTemplateSid("maintenance_payment_reminder")
  const templateVariables = {
    "1": monthsList,
    "2": formattedAmount,
    "3": invoiceUrl,
  }

  const fallbackMessage = `⚠️ *Payment Reminder*

📅 Due: ${monthsList}
💰 Total: Rs. ${formattedAmount}

Hi ${name || "Resident"}, your payment is overdue. Please pay soon to avoid service interruptions.

📄 Invoice: ${invoiceUrl}

— Manzhil`

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

  const templateSid = await getTemplateSid("maintenance_payment_confirmed")
  const templateVariables = {
    "1": name || "Resident",
    "2": monthYear,
    "3": formattedAmount,
    "4": receiptUrl,
  }

  const fallbackMessage = `✅ *Payment Confirmed*

📅 Month: ${monthYear}
💰 Amount: Rs. ${formattedAmount}

Hi ${name || "Resident"}, your payment has been received. Thank you!

📄 Receipt: ${receiptUrl}

— Manzhil`

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

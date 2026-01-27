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

// Divider constant for consistent styling
const DIVIDER = "───────────────────"

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

  const fallbackMessage = `📄 *Maintenance Invoice*

${DIVIDER}
💰 *${monthYear} Invoice*
${DIVIDER}

• Amount: Rs. ${formattedAmount}
• Due Date: ${dueDate}

${DIVIDER}

Hi ${name || "Resident"}, your maintenance invoice for ${monthYear} is ready.

📄 View Invoice: ${invoiceUrl}

Please pay at your earliest convenience.

${DIVIDER}
— Manzhil by Scrift`

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

  const fallbackMessage = `⚠️ *Payment Reminder*

${DIVIDER}
💰 *Overdue Maintenance*
${DIVIDER}

• Due Months: ${monthsList}
• Total Amount: Rs. ${formattedAmount}

${DIVIDER}

Hi ${name || "Resident"}, your maintenance payment is overdue.

📄 View Invoice: ${invoiceUrl}

Please pay as soon as possible to avoid service interruptions.

${DIVIDER}
— Manzhil by Scrift`

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

  const fallbackMessage = `✅ *Payment Confirmed*

${DIVIDER}
💰 *Maintenance Payment*
${DIVIDER}

• Month: ${monthYear}
• Amount: Rs. ${formattedAmount}
• Status: ✅ Paid

${DIVIDER}

Hi ${name || "Resident"}, your maintenance payment has been received successfully.

📄 View Receipt: ${receiptUrl}

${DIVIDER}
Thank you for your payment!
— Manzhil by Scrift`

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

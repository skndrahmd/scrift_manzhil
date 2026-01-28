/**
 * Account Notifications
 * WhatsApp notifications for account-related events
 */

import { sendWithFallback } from "../send"
import { getTemplateSid } from "../templates"
import { formatCurrency } from "../formatters"
import type {
  TwilioResult,
  WelcomeMessageParams,
  AccountBlockedParams,
  AccountReactivatedParams,
} from "../types"

/**
 * Send welcome message to new resident
 * Sent when a new resident profile is created
 */
export async function sendWelcomeMessage(
  params: WelcomeMessageParams
): Promise<TwilioResult> {
  const { phone, name, apartmentNumber } = params

  const templateSid = getTemplateSid("welcome_message")
  const templateVariables = {
    "1": name || "Resident",
    "2": apartmentNumber,
  }

  const fallbackMessage = `👋 *Welcome to Manzhil!*

🏠 ${name || "Resident"} | Apt ${apartmentNumber}

You'll receive notifications for:
• 💰 Maintenance invoices
• 🏛️ Hall bookings
• 📋 Complaint updates

Questions? Contact management.

— Manzhil`

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

/**
 * Send account blocked notification
 * Sent when an account is blocked due to overdue payments
 */
export async function sendAccountBlocked(
  params: AccountBlockedParams
): Promise<TwilioResult> {
  const { phone, name, reason, overdueMonths, totalDue } = params

  const templateSid = getTemplateSid("account_blocked_maintenance")
  const templateVariables = {
    "1": name || "Resident",
    "2": reason,
    "3": overdueMonths || "",
    "4": totalDue ? formatCurrency(totalDue) : "",
  }

  const dueDetails = totalDue
    ? `\n📅 Overdue: ${overdueMonths}\n💰 Amount: Rs. ${formatCurrency(totalDue)}`
    : ""

  const fallbackMessage = `⚠️ *Account Restricted*

🔒 Status: Temporarily Restricted
📝 Reason: ${reason}${dueDetails}

Hi ${name || "Resident"}, your account is restricted. Contact management to resolve this.

— Manzhil`

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

/**
 * Send account reactivated notification
 * Sent when a blocked account is reactivated
 */
export async function sendAccountReactivated(
  params: AccountReactivatedParams
): Promise<TwilioResult> {
  const { phone, name, message } = params

  const templateSid = getTemplateSid("account_reactivated")
  const templateVariables = {
    "1": name || "Resident",
  }

  const customNote = message ? `\n📝 Note: ${message}` : ""

  const fallbackMessage = `✅ *Account Reactivated*

🔓 Status: Active${customNote}

Hi ${name || "Resident"}, your account is reactivated. You now have full access to all services.

— Manzhil`

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

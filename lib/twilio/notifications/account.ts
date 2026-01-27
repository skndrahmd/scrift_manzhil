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

// Divider constant for consistent styling
const DIVIDER = "───────────────────"

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

${DIVIDER}
🏠 *Your Account*
${DIVIDER}

• Name: ${name || "Resident"}
• Apartment: ${apartmentNumber}

${DIVIDER}
📋 *What's Next?*
${DIVIDER}

You will receive notifications for:
• Maintenance invoices and reminders
• Hall booking confirmations
• Complaint status updates

${DIVIDER}

If you have any questions, please contact the management office.

${DIVIDER}
— Manzhil by Scrift`

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
    ? `• Overdue: ${overdueMonths}\n• Amount: Rs. ${formatCurrency(totalDue)}`
    : ""

  const fallbackMessage = `⚠️ *Account Restricted*

${DIVIDER}
🔒 *Account Status*
${DIVIDER}

• Status: Temporarily Restricted
• Reason: ${reason}
${dueDetails}

${DIVIDER}

Hi ${name || "Resident"}, your account has been temporarily restricted.

Please contact the management office to resolve this matter.

${DIVIDER}
— Manzhil by Scrift`

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

${DIVIDER}
🔓 *Account Status*
${DIVIDER}

• Status: ✅ Active
${customNote}

${DIVIDER}

Hi ${name || "Resident"}, your account has been reactivated.

You now have full access to all services.

${DIVIDER}
Thank you!
— Manzhil by Scrift`

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

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

  const fallbackMessage = [
    "Hello, this is Manzhil by Scrift.",
    "",
    "Welcome to Manzhil!",
    "",
    `Hi ${name || "Resident"}, welcome to our building management system.`,
    "",
    `Apartment: ${apartmentNumber}`,
    "",
    "You will receive notifications for:",
    "- Maintenance invoices and reminders",
    "- Hall booking confirmations",
    "- Complaint status updates",
    "",
    "If you have any questions, please contact the management office.",
    "",
    "- Manzhil by Scrift Team",
  ].join("\n")

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

  const dueInfo = totalDue
    ? `\nOverdue months: ${overdueMonths}\nTotal due: Rs. ${formatCurrency(totalDue)}`
    : ""

  const fallbackMessage = [
    "Hello, this is Manzhil by Scrift.",
    "",
    "Account Status Update",
    "",
    `Hi ${name || "Resident"}, your account has been temporarily restricted.`,
    "",
    `Reason: ${reason}`,
    dueInfo,
    "",
    "Please contact the management office to resolve this matter.",
    "",
    "- Manzhil by Scrift Team",
  ].join("\n")

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

  const customMessage = message ? `\n${message}` : ""
  const fallbackMessage = [
    "Hello, this is Manzhil by Scrift.",
    "",
    "Account Reactivated",
    "",
    `Hi ${name || "Resident"}, your account has been reactivated.`,
    customMessage,
    "",
    "You now have full access to all services.",
    "",
    "Thank you!",
    "- Manzhil by Scrift Team",
  ].join("\n")

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

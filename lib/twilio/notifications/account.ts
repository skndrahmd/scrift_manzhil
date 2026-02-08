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
  OtpMessageParams,
  StaffInvitationParams,
} from "../types"

/**
 * Send welcome message to new resident
 * Sent when a new resident profile is created
 * Template has no variables - static welcome message
 */
export async function sendWelcomeMessage(
  params: WelcomeMessageParams
): Promise<TwilioResult> {
  const { phone, name, apartmentNumber } = params

  const templateSid = getTemplateSid("welcome_message")
  // This template has no dynamic variables - it's a static welcome message
  const templateVariables = {}

  const fallbackMessage = `Hello, welcome to Manzhil by Scrift.

Manzhil is a smart Whatsapp Powered Building Management system.

Enter 0 (Zero) to begin.`

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

/**
 * Send OTP message for admin login
 */
export async function sendOtpMessage(
  params: OtpMessageParams
): Promise<TwilioResult> {
  const { phone, otp } = params

  const templateSid = getTemplateSid("otp_message")
  const templateVariables = {
    "1": otp,
  }

  const fallbackMessage = `Hello, this is Manzhil by Scrift.

Your Manzhil login code is: ${otp}. Expires in 5 minutes. Do not share this code with anyone.`

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

/**
 * Send staff invitation message
 * Sent when a new admin/staff member is created
 */
export async function sendStaffInvitation(
  params: StaffInvitationParams
): Promise<TwilioResult> {
  const { phone, name, loginUrl } = params

  const templateSid = getTemplateSid("staff_invitation")
  const templateVariables = {
    "1": name,
    "2": loginUrl,
  }

  const fallbackMessage = `Hello, this is Manzhil by Scrift.

Hi ${name}! You've been added as an admin on Manzhil. Login at ${loginUrl} with your phone number to get started.`

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

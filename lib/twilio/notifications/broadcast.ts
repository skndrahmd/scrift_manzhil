/**
 * Broadcast Notifications
 * WhatsApp notifications for broadcast announcements
 */

import { sendWithFallback } from "../send"
import { getTemplateSid } from "../templates"
import type { TwilioResult, BroadcastAnnouncementParams } from "../types"

export interface UtilityBillParams {
  phone: string
  houseNo: string
  billUrl: string
}

/**
 * Send broadcast announcement to resident
 * Used for sending announcements to multiple residents
 */
export async function sendBroadcastAnnouncement(
  params: BroadcastAnnouncementParams
): Promise<TwilioResult> {
  const { phone, name, variable1, variable2 } = params

  // Sanitize variables for Twilio template (replace newlines with spaces)
  const sanitizedVar1 = (variable1 || "Announcement").replace(/[\r\n]+/g, " ").trim()
  const sanitizedVar2 = (variable2 || "").replace(/[\r\n]+/g, " ").trim()

  const templateSid = await getTemplateSid("broadcast_announcement")
  const templateVariables: Record<string, string> = {
    "1": sanitizedVar1,
    "2": sanitizedVar2,
  }

  // Fallback message (used if template not configured)
  const fallbackMessage = `Hello!

This is Manzhil by Scrift.

Title: ${variable1 || "Announcement"}

Body: ${variable2 || ""}

Best regards,
Manzhil`

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

/**
 * Send utility bill link to a resident via WhatsApp.
 * Reuses the broadcast_announcement template with the bill URL in variable2.
 */
export async function sendUtilityBillMessage(
  params: UtilityBillParams
): Promise<TwilioResult> {
  const { phone, houseNo, billUrl } = params

  const templateSid = await getTemplateSid("broadcast_announcement")
  const templateVariables: Record<string, string> = {
    "1": `Utility Bill - ${houseNo}`,
    "2": `Your bill is ready. Tap to view: ${billUrl}`,
  }

  const fallbackMessage = `Hello!

This is Manzhil by Scrift.

Utility Bill - ${houseNo}

Your bill is ready. Tap to view:
${billUrl}

Best regards,
Manzhil`

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

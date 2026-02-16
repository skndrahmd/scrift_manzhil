/**
 * Broadcast Notifications
 * WhatsApp notifications for broadcast announcements
 */

import { sendWithFallback } from "../send"
import { getTemplateSid } from "../templates"
import type { TwilioResult, BroadcastAnnouncementParams } from "../types"

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

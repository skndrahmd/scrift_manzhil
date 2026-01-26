/**
 * Core Twilio Send Functions
 * Low-level functions for sending WhatsApp messages
 */

import { getClient, getFromNumber, formatPhoneNumber } from "./client"
import type { TwilioResult } from "./types"

/**
 * Send a freeform WhatsApp message
 * Use this for fallback messages when templates are not configured
 */
export async function sendMessage(to: string, body: string): Promise<TwilioResult> {
  const client = getClient()
  const from = getFromNumber()

  if (!client || !from) {
    console.log("[Twilio] No-op: client or from number not configured")
    return { ok: true, sid: "noop" }
  }

  const formattedTo = formatPhoneNumber(to)

  try {
    const msg = await client.messages.create({
      from,
      to: formattedTo,
      body,
    })
    console.log(`[Twilio] Message sent: ${msg.sid}`)
    return { ok: true, sid: msg.sid }
  } catch (err: unknown) {
    const error = err as Error & { code?: string; moreInfo?: string }
    console.error("[Twilio] Send error:", error.message)
    if (error.code) console.error("[Twilio] Error code:", error.code)
    return { ok: false, error: error.message || "Unknown error" }
  }
}

/**
 * Send a WhatsApp template message using Twilio Content API
 * @param to - Phone number in E.164 format (e.g., +923001234567)
 * @param contentSid - Twilio Content Template SID (HX...)
 * @param variables - Object mapping variable numbers to values (e.g., { "1": "John", "2": "Dec 1" })
 */
export async function sendTemplate(
  to: string,
  contentSid: string,
  variables: Record<string, string>
): Promise<TwilioResult> {
  const client = getClient()
  const from = getFromNumber()

  if (!client || !from) {
    console.log("[Twilio] No-op: client or from number not configured")
    return { ok: true, sid: "noop" }
  }

  if (!contentSid) {
    console.error("[Twilio] Missing contentSid for template message")
    return { ok: false, error: "Missing contentSid" }
  }

  const formattedTo = formatPhoneNumber(to)

  try {
    const msg = await client.messages.create({
      from,
      to: formattedTo,
      contentSid,
      contentVariables: JSON.stringify(variables),
    })
    console.log(`[Twilio] Template sent: ${msg.sid}`)
    return { ok: true, sid: msg.sid }
  } catch (err: unknown) {
    const error = err as Error & { code?: string; moreInfo?: string }
    console.error("[Twilio] Template send error:", error.message)
    if (error.code) console.error("[Twilio] Error code:", error.code)
    return { ok: false, error: error.message || "Unknown error" }
  }
}

/**
 * Send a template with automatic fallback to freeform message
 * Tries template first, falls back to freeform if template fails or is not configured
 */
export async function sendWithFallback(
  to: string,
  templateSid: string | undefined,
  templateVariables: Record<string, string>,
  fallbackMessage: string
): Promise<TwilioResult> {
  // Try template first if configured
  if (templateSid) {
    const result = await sendTemplate(to, templateSid, templateVariables)
    if (result.ok) return result
    console.warn("[Twilio] Template failed, using fallback message")
  }

  // Fallback to freeform message
  return sendMessage(to, fallbackMessage)
}

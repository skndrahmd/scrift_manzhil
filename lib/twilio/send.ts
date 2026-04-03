/**
 * @module lib/twilio/send
 * Core WhatsApp message sending logic via the Twilio API.
 * Supports freeform messages, content templates, and automatic fallback.
 */

import { getClient, getFromNumber, formatPhoneNumber } from "./client"
import { hasActiveSession } from "./session-tracker"
import type { TwilioResult } from "./types"
import { createModuleLogger } from "@/lib/logger"

const log = createModuleLogger("twilio")

/**
 * Sends a freeform WhatsApp message (non-template).
 * @param to - Recipient phone number in E.164 format
 * @param body - Plain-text message body
 * @returns Result with ok status and message SID, or error details
 */
export async function sendMessage(to: string, body: string): Promise<TwilioResult> {
  const client = getClient()
  const from = getFromNumber()

  if (!client || !from) {
    log.debug("No-op: client or from number not configured")
    return { ok: true, sid: "noop" }
  }

  const formattedTo = formatPhoneNumber(to)

  try {
    const msg = await client.messages.create({
      from,
      to: formattedTo,
      body,
    })
    log.info("Message sent", { sid: msg.sid, to: formattedTo })
    return { ok: true, sid: msg.sid }
  } catch (err: unknown) {
    const error = err as Error & { code?: string; moreInfo?: string }
    log.error("Send error", { error: error.message, code: error.code })
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
    log.debug("No-op: client or from number not configured")
    return { ok: true, sid: "noop" }
  }

  if (!contentSid) {
    log.error("Missing contentSid for template message")
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
    log.info("Template sent", { sid: msg.sid, contentSid, to: formattedTo })
    return { ok: true, sid: msg.sid }
  } catch (err: unknown) {
    const error = err as Error & { code?: string; moreInfo?: string }
    log.error("Template send error", { error: error.message, code: error.code, contentSid })
    return { ok: false, error: error.message || "Unknown error" }
  }
}

/**
 * Sends a template message with automatic fallback to a freeform message.
 * @param to - Recipient phone number in E.164 format
 * @param templateSid - Twilio Content Template SID (may be undefined)
 * @param templateVariables - Variable mapping for the template
 * @param fallbackMessage - Plain-text message used if template fails or is missing
 * @returns Result with ok status and message SID, or error details
 */
export async function sendWithFallback(
  to: string,
  templateSid: string | undefined,
  templateVariables: Record<string, string>,
  fallbackMessage: string
): Promise<TwilioResult> {
  // If resident has an active session window (UIC), use freeform message
  // which is covered by the existing conversation — cheaper than opening a new BIC
  if (fallbackMessage) {
    const activeSession = await hasActiveSession(to)
    if (activeSession) {
      log.debug("Active session detected, using freeform instead of template", { to })
      return sendMessage(to, fallbackMessage)
    }
  }

  // Try template first if configured (opens BIC)
  if (templateSid) {
    const result = await sendTemplate(to, templateSid, templateVariables)
    if (result.ok) return result
    log.warn("Template failed, using fallback message", { templateSid })
  }

  // Fallback to freeform message
  return sendMessage(to, fallbackMessage)
}

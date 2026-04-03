/**
 * @module lib/twilio/client
 * Twilio client singleton with environment validation.
 * Provides the shared Twilio instance and phone number formatting helpers.
 */

import twilio from "twilio"
import type { Twilio } from "twilio"
import { createModuleLogger } from "@/lib/logger"

const log = createModuleLogger("twilio")

// Environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER

// Singleton client instance
let clientInstance: Twilio | null = null

/**
 * Gets or creates the singleton Twilio client instance.
 * @returns Twilio client, or null if credentials are not configured
 */
export function getClient(): Twilio | null {
  if (clientInstance) return clientInstance

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    log.warn("Missing credentials - TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set")
    return null
  }

  try {
    clientInstance = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    return clientInstance
  } catch (error) {
    log.error("Failed to initialize client", { error })
    return null
  }
}

/**
 * Gets the configured WhatsApp sender number with "whatsapp:" prefix.
 * @returns Formatted sender number, or null if not configured
 */
export function getFromNumber(): string | null {
  if (!TWILIO_WHATSAPP_NUMBER) {
    log.warn("TWILIO_WHATSAPP_NUMBER not configured")
    return null
  }

  return TWILIO_WHATSAPP_NUMBER.startsWith("whatsapp:")
    ? TWILIO_WHATSAPP_NUMBER
    : `whatsapp:${TWILIO_WHATSAPP_NUMBER}`
}

/**
 * Ensures a phone number has the "whatsapp:" prefix for Twilio messaging.
 * @param phone - Phone number in E.164 format (e.g. "+923001234567")
 * @returns Phone number prefixed with "whatsapp:"
 */
export function formatPhoneNumber(phone: string): string {
  return phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`
}

/**
 * Checks whether all required Twilio environment variables are set.
 * @returns True if account SID, auth token, and WhatsApp number are present
 */
export function isConfigured(): boolean {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_NUMBER)
}

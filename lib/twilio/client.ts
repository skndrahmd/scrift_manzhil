/**
 * Twilio Client Initialization
 * Singleton pattern for Twilio client with environment validation
 */

import twilio from "twilio"
import type { Twilio } from "twilio"

// Environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER

// Singleton client instance
let clientInstance: Twilio | null = null

/**
 * Get or create Twilio client instance
 * Returns null if credentials are not configured
 */
export function getClient(): Twilio | null {
  if (clientInstance) return clientInstance

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn("[Twilio] Missing credentials - TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set")
    return null
  }

  try {
    clientInstance = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    return clientInstance
  } catch (error) {
    console.error("[Twilio] Failed to initialize client:", error)
    return null
  }
}

/**
 * Get the configured WhatsApp number with proper formatting
 */
export function getFromNumber(): string | null {
  if (!TWILIO_WHATSAPP_NUMBER) {
    console.warn("[Twilio] TWILIO_WHATSAPP_NUMBER not configured")
    return null
  }

  return TWILIO_WHATSAPP_NUMBER.startsWith("whatsapp:")
    ? TWILIO_WHATSAPP_NUMBER
    : `whatsapp:${TWILIO_WHATSAPP_NUMBER}`
}

/**
 * Format phone number for WhatsApp
 * Ensures the number has the whatsapp: prefix
 */
export function formatPhoneNumber(phone: string): string {
  return phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`
}

/**
 * Check if Twilio is properly configured
 */
export function isConfigured(): boolean {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_NUMBER)
}

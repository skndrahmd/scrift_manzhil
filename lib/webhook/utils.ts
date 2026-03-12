/**
 * Webhook Utilities
 * Helper functions, validators, and formatters for the webhook system
 */

import { getConfiguredTimezone } from "@/lib/instance-settings"
import type { ValidationResult, BookingSettings, TimeSlot } from "./types"

// ============================================================================
// Command Detection
// ============================================================================

/**
 * Check if message is a back command
 */
export function isBackCommand(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  return normalized === "b" || normalized === "back"
}

/**
 * Check if message is a yes response
 */
export function isYesResponse(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  return normalized === "1" || normalized === "yes"
}

/**
 * Check if message is a no response
 */
export function isNoResponse(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  return normalized === "2" || normalized === "no"
}

/**
 * Check if message is main menu command
 */
export function isMainMenuCommand(message: string): boolean {
  return message.trim() === "0"
}

/**
 * Parse numeric selection from message
 */
export function parseSelection(message: string): number | null {
  const num = parseInt(message.trim(), 10)
  return isNaN(num) ? null : num
}

// ============================================================================
// Validators
// ============================================================================

/**
 * Validate a name (2-50 characters, letters and spaces only)
 */
export function validateName(name: string): ValidationResult {
  const trimmed = name.trim()

  if (trimmed.length < 2) {
    return { valid: false, error: "Name must be at least 2 characters long." }
  }

  if (trimmed.length > 50) {
    return { valid: false, error: "Name must be less than 50 characters." }
  }

  // Allow letters, spaces, and common name characters
  const nameRegex = /^[a-zA-Z\s.'-]+$/
  if (!nameRegex.test(trimmed)) {
    return { valid: false, error: "Name can only contain letters, spaces, and common punctuation." }
  }

  return { valid: true, normalized: trimmed }
}

/**
 * Validate a Pakistani phone number
 */
export function validatePhoneNumber(phone: string): ValidationResult {
  // Remove spaces, dashes, and other formatting
  let cleaned = phone.replace(/[\s\-()]/g, "")

  // Handle different formats
  if (cleaned.startsWith("+92")) {
    cleaned = cleaned // Already in correct format
  } else if (cleaned.startsWith("92")) {
    cleaned = "+" + cleaned
  } else if (cleaned.startsWith("0")) {
    cleaned = "+92" + cleaned.slice(1)
  } else if (cleaned.length === 10) {
    cleaned = "+92" + cleaned
  } else {
    return { valid: false, error: "Please enter a valid Pakistani phone number (e.g., 03XX-XXXXXXX)" }
  }

  // Validate format: +92 followed by 10 digits
  const phoneRegex = /^\+92[0-9]{10}$/
  if (!phoneRegex.test(cleaned)) {
    return { valid: false, error: "Please enter a valid Pakistani phone number (e.g., 03XX-XXXXXXX)" }
  }

  return { valid: true, normalized: cleaned }
}

/**
 * Validate a CNIC number
 */
export function validateCNIC(cnic: string): ValidationResult {
  // Remove dashes and spaces
  const cleaned = cnic.replace(/[\s\-]/g, "")

  // CNIC must be exactly 13 digits
  if (!/^\d{13}$/.test(cleaned)) {
    return { valid: false, error: "CNIC must be exactly 13 digits (e.g., 42101-1234567-1)" }
  }

  // Format as XXXXX-XXXXXXX-X
  const formatted = `${cleaned.slice(0, 5)}-${cleaned.slice(5, 12)}-${cleaned.slice(12)}`

  return { valid: true, normalized: formatted }
}

/**
 * Validate a staff role
 */
export function validateRole(role: string): ValidationResult {
  const validRoles = ["driver", "maid", "cook", "nanny", "guard", "other"]
  const normalized = role.trim().toLowerCase()

  if (!validRoles.includes(normalized)) {
    return {
      valid: false,
      error: `Invalid role. Please choose from: ${validRoles.join(", ")}`
    }
  }

  return { valid: true, normalized }
}

// ============================================================================
// Formatters
// ============================================================================

/**
 * Format time for display (12-hour format)
 */
export function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(":").map(Number)
  const ampm = hours >= 12 ? "PM" : "AM"
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${ampm}`
}

/**
 * Format hour for display (e.g., "9 AM", "2 PM")
 */
export function formatTimeDisplay(hour: number): string {
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour} ${ampm}`
}

/**
 * Format date for display (DD/MM/YYYY)
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/**
 * Format date and time for display
 */
export async function formatDateTime(dateString: string): Promise<string> {
  const timezone = await getConfiguredTimezone()
  const date = new Date(dateString)
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  })
}

// Re-export canonical formatCurrency from @/lib/currency
export { formatCurrency, formatCurrencyWith } from "@/lib/currency"

/**
 * Format subcategory key to display text
 */
export function formatSubcategory(subcategory: string): string {
  return subcategory
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// ============================================================================
// Time Slot Generation
// ============================================================================

/**
 * Generate available time slots for a given date
 */
export function generateTimeSlots(
  settings: BookingSettings,
  existingBookings: { start_time: string; end_time: string }[]
): TimeSlot[] {
  const slots: TimeSlot[] = []

  const startHour = parseInt(settings.start_time.split(":")[0], 10)
  const endHour = parseInt(settings.end_time.split(":")[0], 10)
  const slotDuration = settings.slot_duration_minutes / 60

  let slotIndex = 1
  for (let hour = startHour; hour < endHour; hour += slotDuration) {
    const startTime = `${String(Math.floor(hour)).padStart(2, "0")}:00:00`
    const endTime = `${String(Math.floor(hour + slotDuration)).padStart(2, "0")}:00:00`

    // Check if slot is already booked
    const isBooked = existingBookings.some(
      (booking) => booking.start_time === startTime ||
        (booking.start_time < endTime && booking.end_time > startTime)
    )

    slots.push({
      index: slotIndex,
      startTime,
      endTime,
      display: `${formatTimeDisplay(Math.floor(hour))} - ${formatTimeDisplay(Math.floor(hour + slotDuration))}`,
      isBooked,
    })

    slotIndex++
  }

  return slots
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Create XML response for Twilio webhook
 */
export function createXmlResponse(message?: string): Response {
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`

  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  })
}

/**
 * Escape special characters for XML
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

/**
 * Build a numbered list from items
 */
export function buildNumberedList(
  items: { label: string; emoji?: string }[],
  startIndex = 1
): string {
  return items
    .map((item, i) => `${startIndex + i}. ${item.emoji || ""} ${item.label}`.trim())
    .join("\n")
}

/**
 * Build a back instruction line
 */
export function backInstruction(): string {
  return "\n\nReply B to go back, or 0 for main menu"
}

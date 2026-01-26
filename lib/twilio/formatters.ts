/**
 * Formatting Utilities for Twilio Notifications
 * Centralized date, time, and currency formatting for Pakistan timezone
 */

/**
 * Format a date string for display (DD/MM/YYYY)
 * @param dateString - ISO date string or YYYY-MM-DD format
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
 * Format a date for long display (e.g., "December 15, 2024")
 * @param dateString - ISO date string or YYYY-MM-DD format
 */
export function formatDateLong(dateString: string): string {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * Format a time string for display (12-hour format with AM/PM)
 * @param timeString - Time in HH:MM format
 */
export function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(":")
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${ampm}`
}

/**
 * Format month and year for display (e.g., "November 2025")
 * @param year - Full year (e.g., 2025)
 * @param month - Month number (1-12)
 */
export function formatMonthYear(year: number, month: number): string {
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  })
}

/**
 * Format currency amount with thousands separator
 * @param amount - Numeric amount
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString()
}

/**
 * Format a Date object for Pakistan timezone display
 * @param date - Date object
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Karachi",
  })
}

/**
 * Get current date in YYYY-MM-DD format
 */
export function getTodayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/**
 * Format subcategory for display (snake_case to Title Case)
 * @param subcategory - Subcategory in snake_case format
 */
export function formatSubcategory(subcategory: string): string {
  return subcategory
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * @module formatting
 * Date formatting utilities for Pakistan Standard Time (UTC+5).
 */

/**
 * Formats a date string (YYYY-MM-DD) into DD/MM/YYYY display format.
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Formatted date string in en-GB locale (DD/MM/YYYY)
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
 * Formats a date-time string into DD/MM/YYYY HH:MM in Pakistan timezone.
 * @param dateString - ISO date-time string or parseable date string
 * @returns Formatted date-time string in en-GB locale with PKT timezone
 */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Karachi", // Pakistan Standard Time (UTC+5)
  })
}

/**
 * Returns the current date/time adjusted to Pakistan Standard Time (UTC+5).
 * @returns Date object representing the current time in PKT
 */
export function getPakistanTime(): Date {
  const now = new Date()
  // Convert to Pakistan time (UTC+5)
  const pakistanTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Karachi" }))
  return pakistanTime
}

/**
 * Returns the current Pakistan time as an ISO 8601 string.
 * @returns ISO string of the current PKT time
 */
export function getPakistanISOString(): string {
  return getPakistanTime().toISOString()
}

/**
 * Checks whether a given date falls on a configured working day.
 * @param dateString - Date string in YYYY-MM-DD format
 * @param workingDays - Array of working day numbers (1=Monday through 7=Sunday)
 * @returns True if the date's day of week is in the workingDays array
 */
export function isWorkingDay(dateString: string, workingDays: number[]): boolean {
  const date = new Date(dateString + "T00:00:00")
  const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, etc.
  const mondayBasedDay = dayOfWeek === 0 ? 7 : dayOfWeek // Convert Sunday from 0 to 7
  return workingDays.includes(mondayBasedDay)
}

/**
 * Returns the full weekday name (e.g., "Monday") for a given date string.
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Full weekday name in English
 */
export function getDayName(dateString: string): string {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-US", { weekday: "long" })
}

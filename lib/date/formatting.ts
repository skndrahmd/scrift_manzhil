/**
 * @module formatting
 * Date formatting utilities with dynamic timezone support.
 * Timezone is read from instance_settings (cached 60s).
 */

import { getConfiguredTimezone } from "@/lib/instance-settings"

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
 * Formats a date-time string into DD/MM/YYYY HH:MM in the configured timezone.
 * @param dateString - ISO date-time string or parseable date string
 * @returns Formatted date-time string in en-GB locale
 */
export async function formatDateTime(dateString: string): Promise<string> {
  const timezone = await getConfiguredTimezone()
  return formatDateTimeSync(dateString, timezone)
}

/**
 * Sync variant of formatDateTime for callers that already resolved timezone.
 */
export function formatDateTimeSync(dateString: string, timezone: string): string {
  return new Date(dateString).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  })
}

/**
 * Returns the current date/time adjusted to the configured timezone.
 * @returns Date object representing the current time in the configured timezone
 */
export async function getPakistanTime(): Promise<Date> {
  const timezone = await getConfiguredTimezone()
  return getPakistanTimeSync(timezone)
}

/**
 * Sync variant: returns current time in the given timezone.
 */
export function getPakistanTimeSync(timezone: string): Date {
  const now = new Date()
  return new Date(now.toLocaleString("en-US", { timeZone: timezone }))
}

/**
 * Returns the current configured-timezone time as an ISO 8601 string.
 * @returns ISO string of the current time in the configured timezone
 */
export async function getPakistanISOString(): Promise<string> {
  const time = await getPakistanTime()
  return time.toISOString()
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

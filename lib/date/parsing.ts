/**
 * @module parsing
 * Natural language date parsing for the WhatsApp bot.
 * Supports formats like "today", "tomorrow", "25 Dec", "DD/MM/YYYY", and bare day numbers.
 */

import { getPakistanTime } from "./formatting"

/**
 * Tests whether a message string looks like a date input.
 * @param message - Raw user message text to test
 * @returns True if the message matches any recognized date pattern
 */
export function isDateFormat(message: string): boolean {
  // Accept any text that might be a date - we'll parse it smartly
  const trimmed = message.trim().toLowerCase()

  // Check for various date patterns
  const patterns = [
    /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/,  // DD-MM-YYYY or DD/MM/YYYY
    /^\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)/i,  // 1st December, 25 Dec
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i,  // December 1, Dec 25
    /^(today|tomorrow|tmrw|tmr)$/i,  // today, tomorrow
    /^\d{1,2}$/,  // Just a day number (assume current month)
  ]

  return patterns.some(pattern => pattern.test(trimmed))
}

/**
 * Parses a natural language or formatted date string into YYYY-MM-DD format.
 * Handles "today", "tomorrow"/"tmrw"/"tmr", bare day numbers, month-day combos,
 * and DD-MM-YYYY / DD/MM/YYYY / DD.MM.YYYY formats.
 * @param dateString - User-provided date string in any supported format
 * @returns ISO date string (YYYY-MM-DD) or null if parsing fails
 */
export async function parseDate(dateString: string): Promise<string | null> {
  try {
    const trimmed = dateString.trim().toLowerCase()
    const currentDate = await getPakistanTime()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()
    const currentDay = currentDate.getDate()

    let day: number | null = null
    let month: number | null = null
    let year: number = currentYear

    // Handle "today"
    if (trimmed === "today") {
      day = currentDay
      month = currentMonth + 1
      year = currentYear
    }
    // Handle "tomorrow", "tmrw", "tmr"
    else if (trimmed === "tomorrow" || trimmed === "tmrw" || trimmed === "tmr") {
      const tomorrow = new Date(currentDate)
      tomorrow.setDate(tomorrow.getDate() + 1)
      day = tomorrow.getDate()
      month = tomorrow.getMonth() + 1
      year = tomorrow.getFullYear()
    }
    // Handle just a number (assume current month and year)
    else if (/^\d{1,2}$/.test(trimmed)) {
      day = parseInt(trimmed)
      month = currentMonth + 1
      year = currentYear

      // If the day has passed this month, assume next month
      if (day < currentDay) {
        month += 1
        if (month > 12) {
          month = 1
          year += 1
        }
      }
    }
    // Handle "1st December", "25 Dec", etc.
    else if (/^\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)/i.test(trimmed)) {
      const match = trimmed.match(/^(\d{1,2})(st|nd|rd|th)?\s+(\w+)/i)
      if (match) {
        day = parseInt(match[1])
        month = parseMonthName(match[3])

        // If date has passed this year, assume next year
        const testDate = new Date(currentYear, month - 1, day)
        if (testDate < currentDate) {
          year = currentYear + 1
        }
      }
    }
    // Handle "December 1", "Dec 25", etc.
    else if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i.test(trimmed)) {
      const match = trimmed.match(/^(\w+)\s+(\d{1,2})/i)
      if (match) {
        month = parseMonthName(match[1])
        day = parseInt(match[2])

        // If date has passed this year, assume next year
        const testDate = new Date(currentYear, month - 1, day)
        if (testDate < currentDate) {
          year = currentYear + 1
        }
      }
    }
    // Handle DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY formats
    else if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(trimmed)) {
      const cleanDate = trimmed.replace(/[/.]/g, "-")
      const parts = cleanDate.split("-").map(Number)
      day = parts[0]
      month = parts[1]
      year = parts[2]

      // Handle 2-digit year
      if (year < 100) {
        year += 2000
      }
    }

    // Validate the parsed values
    if (day === null || month === null || day < 1 || day > 31 || month < 1 || month > 12 || year < 2024) {
      return null
    }

    // Create date and validate it's a real date
    const date = new Date(year, month - 1, day)
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      return null
    }

    // Format as YYYY-MM-DD
    const formattedYear = date.getFullYear()
    const formattedMonth = String(date.getMonth() + 1).padStart(2, "0")
    const formattedDay = String(date.getDate()).padStart(2, "0")

    return `${formattedYear}-${formattedMonth}-${formattedDay}`
  } catch (error) {
    return null
  }
}

/**
 * Converts an English month name (full or abbreviated) to its 1-based number.
 * @param monthStr - Month name (e.g., "jan", "February")
 * @returns Month number (1-12), or 0 if unrecognized
 */
export function parseMonthName(monthStr: string): number {
  const months: { [key: string]: number } = {
    'jan': 1, 'january': 1,
    'feb': 2, 'february': 2,
    'mar': 3, 'march': 3,
    'apr': 4, 'april': 4,
    'may': 5,
    'jun': 6, 'june': 6,
    'jul': 7, 'july': 7,
    'aug': 8, 'august': 8,
    'sep': 9, 'september': 9,
    'oct': 10, 'october': 10,
    'nov': 11, 'november': 11,
    'dec': 12, 'december': 12,
  }

  return months[monthStr.toLowerCase()] || 0
}

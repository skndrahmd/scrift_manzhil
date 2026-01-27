/**
 * Booking Flow Handler
 * Handles community hall booking conversation flow
 */

import { supabase } from "@/lib/supabase"
import { isDateFormat, parseDate, isWorkingDay, getDayName } from "@/lib/dateUtils"
import type { Profile, UserState } from "../types"
import { getState, setState, clearState } from "../state"
import { getCachedSettings } from "../profile"
import { formatDate, formatCurrency } from "../utils"

// Divider constant for consistent styling
const DIVIDER = "───────────────────"

/**
 * Initialize booking flow
 */
export function initializeBookingFlow(phoneNumber: string): string {
  setState(phoneNumber, {
    step: "booking_date",
    type: "booking",
  })

  return `📅 *Community Hall Booking*

${DIVIDER}
📋 *Enter Booking Date*
${DIVIDER}

Please enter the date you'd like to book the hall.

*Accepted Formats:*
• DD-MM-YYYY (e.g., 25-12-2025)
• Natural language (e.g., "1st December", "Dec 25")
• Shortcuts (e.g., "today", "tomorrow")
• Just the day (e.g., "15")

${DIVIDER}
Type *B* to go back, or *0* for main menu`
}

/**
 * Handle booking flow steps
 */
export async function handleBookingFlow(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState
): Promise<string> {
  // Handle terms acceptance
  if (userState.step === "booking_policies") {
    return await handlePoliciesAcceptance(message, profile, phoneNumber, userState)
  }

  // Handle date input
  if (isDateFormat(message)) {
    return await handleDateInput(message, profile, phoneNumber)
  }

  return `❓ *Invalid Date Format*

${DIVIDER}

Please enter the date in one of these formats:

• DD-MM-YYYY (e.g., 25-12-2025)
• Natural language (e.g., "1st December", "Dec 25")
• Shortcuts (e.g., "today", "tomorrow")
• Just the day (e.g., "15")

${DIVIDER}
Type *B* to go back, or *0* for main menu`
}

/**
 * Handle date input
 */
async function handleDateInput(
  message: string,
  profile: Profile,
  phoneNumber: string
): Promise<string> {
  try {
    const parsedDate = parseDate(message)
    if (!parsedDate) {
      return `❓ *Invalid Date Format*

${DIVIDER}

Please enter the date in DD-MM-YYYY format.
Example: 25-12-2025

${DIVIDER}
Type *B* to go back, or *0* for main menu`
    }

    // Check if the date is in the past
    const today = new Date()
    const todayString =
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0")

    if (parsedDate < todayString) {
      return `⚠️ *Invalid Date*

${DIVIDER}

The selected date is in the past. Please choose a future date.

${DIVIDER}
Type *B* to go back, or *0* for main menu`
    }

    // Get booking settings to check working days
    const settings = await getCachedSettings()

    if (settings && !isWorkingDay(parsedDate, settings.working_days)) {
      const dayName = getDayName(parsedDate)
      return `⚠️ *Hall Unavailable*

${DIVIDER}

The community hall is closed on ${dayName}s.

Please choose a date from our working days and try again.

${DIVIDER}
Type *B* to go back, or *0* for main menu`
    }

    // Check if date is already booked (ONE EVENT PER DAY)
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("booking_date", parsedDate)
      .in("status", ["confirmed", "payment_pending"])

    if (existingBookings && existingBookings.length > 0) {
      return `❌ *Date Already Booked*

${DIVIDER}

The community hall is already reserved for ${formatDate(parsedDate)}.

Please choose a different date.

${DIVIDER}
Type *B* to go back, or *0* for main menu`
    }

    // Date is available, show policies
    const userState = getState(phoneNumber)
    userState.step = "booking_policies"
    userState.date = parsedDate
    setState(phoneNumber, userState)

    const bookingCharges = settings?.booking_charges || 500
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://com3-bms.vercel.app"
    const policiesLink = `${baseUrl}/policies`

    return `📋 *Booking Terms & Conditions*

${DIVIDER}
📅 *Selected Date*
${DIVIDER}

• Date: ${formatDate(parsedDate)}
• Charges: ${formatCurrency(bookingCharges)}

${DIVIDER}
📄 *Policies*
${DIVIDER}

Please review our complete booking policies:
👉 ${policiesLink}

${DIVIDER}
⚖️ *Confirmation*
${DIVIDER}

Do you agree to the terms and conditions?

1. ✅ Yes, I Agree
2. ❌ No, I Decline

${DIVIDER}
Reply *1* or *2*`
  } catch (error) {
    console.error("[Booking] Date input error:", error)
    return `❌ *Unable to Process*

${DIVIDER}

We couldn't process your date selection. Please try again.

${DIVIDER}
Reply *0* for the main menu`
  }
}

/**
 * Handle policies acceptance
 */
async function handlePoliciesAcceptance(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState
): Promise<string> {
  try {
    const choice = message.trim()

    if (choice === "1") {
      // User agreed to terms, create booking
      const settings = await getCachedSettings()
      const bookingCharges = settings?.booking_charges || 500

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert([
          {
            profile_id: profile.id,
            booking_date: userState.date,
            start_time: "09:00:00",
            end_time: "21:00:00",
            status: "confirmed",
            booking_charges: bookingCharges,
            payment_status: "pending",
          },
        ])
        .select()
        .single()

      if (bookingError) {
        console.error("[Booking] Error:", bookingError)
        if (bookingError.code === "23505") {
          return `⚠️ *Date No Longer Available*

${DIVIDER}

This date was just booked by someone else. Please choose another date.

${DIVIDER}
Reply *0* for the main menu`
        }
        return `❌ *Booking Failed*

${DIVIDER}

We couldn't complete your booking. Please try again.

${DIVIDER}
Reply *0* for the main menu`
      }

      clearState(phoneNumber)

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const invoiceUrl = `${baseUrl}/booking-invoice/${booking.id}?payment=pending&booking=confirmed`

      return `✅ *Booking Confirmed*

${DIVIDER}
📋 *Booking Details*
${DIVIDER}

• Date: ${formatDate(userState.date!)}
• Time: 9:00 AM – 9:00 PM (Full Day)
• Charges: ${formatCurrency(bookingCharges)}
• Payment: ⏳ Pending

${DIVIDER}
📌 *Important Notes*
${DIVIDER}

• Complete payment before the event date
• Cancellations require 24-hour notice
• Please leave the hall clean after use

${DIVIDER}
📄 *Invoice*
${DIVIDER}

View your invoice here:
👉 ${invoiceUrl}

${DIVIDER}
Reply *0* for the main menu`
    }

    if (choice === "2") {
      // User declined terms
      clearState(phoneNumber)
      return `❌ *Booking Cancelled*

${DIVIDER}

You must agree to the terms and conditions to book the community hall.

If you have any concerns, please contact the building management.

${DIVIDER}
Reply *0* for the main menu`
    }

    return `❓ *Invalid Response*

${DIVIDER}

Please reply with:
• *1* — Yes, I agree
• *2* — No, I decline

${DIVIDER}
Reply *0* for the main menu`
  } catch (error) {
    console.error("[Booking] Policies acceptance error:", error)
    return `❌ *Unable to Process*

${DIVIDER}

We encountered an issue. Please try again.

${DIVIDER}
Reply *0* for the main menu`
  }
}

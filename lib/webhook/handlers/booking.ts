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

/**
 * Initialize booking flow
 */
export function initializeBookingFlow(phoneNumber: string): string {
  setState(phoneNumber, {
    step: "booking_date",
    type: "booking",
  })

  return `📅 *Community Hall Booking*

Enter your booking date.

*Formats:*
• DD-MM-YYYY (e.g., 25-12-2025)
• "today", "tomorrow", "Dec 25"
• Just the day (e.g., "15")

*B* to go back, *0* for menu`
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

  return `❓ *Invalid Date*

Try formats like:
• DD-MM-YYYY (e.g., 25-12-2025)
• "today", "tomorrow"
• Just the day (e.g., "15")

*B* to go back, *0* for menu`
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
      return `❓ *Invalid Date*

Please enter in DD-MM-YYYY format.
Example: 25-12-2025

*B* to go back, *0* for menu`
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

Date is in the past. Please choose a future date.

*B* to go back, *0* for menu`
    }

    // Get booking settings to check working days
    const settings = await getCachedSettings()

    if (settings && !isWorkingDay(parsedDate, settings.working_days)) {
      const dayName = getDayName(parsedDate)
      return `⚠️ *Hall Unavailable*

Hall is closed on ${dayName}s. Please choose another date.

*B* to go back, *0* for menu`
    }

    // Check if date is already booked (ONE EVENT PER DAY)
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("booking_date", parsedDate)
      .in("status", ["confirmed", "payment_pending"])

    if (existingBookings && existingBookings.length > 0) {
      return `❌ *Date Already Booked*

Hall is reserved for ${formatDate(parsedDate)}. Please choose another date.

*B* to go back, *0* for menu`
    }

    // Date is available, show policies
    const userState = getState(phoneNumber)
    userState.step = "booking_policies"
    userState.date = parsedDate
    setState(phoneNumber, userState)

    const bookingCharges = settings?.booking_charges || 500
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://com3-bms.vercel.app"
    const policiesLink = `${baseUrl}/policies`

    return `📋 *Terms & Conditions*

📅 Date: ${formatDate(parsedDate)}
💰 Charges: ${formatCurrency(bookingCharges)}

📄 Policies: ${policiesLink}

Do you agree to the terms?

1. ✅ Yes, I Agree
2. ❌ No, I Decline

Reply *1* or *2*`
  } catch (error) {
    console.error("[Booking] Date input error:", error)
    return `❌ *Unable to Process*

Please try again.

Reply *0* for menu`
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

Just booked by someone else. Please choose another date.

Reply *0* for menu`
        }
        return `❌ *Booking Failed*

Please try again.

Reply *0* for menu`
      }

      clearState(phoneNumber)

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const invoiceUrl = `${baseUrl}/booking-invoice/${booking.id}?payment=pending&booking=confirmed`

      return `✅ *Booking Confirmed*

📅 ${formatDate(userState.date!)} | ⏰ 9AM – 9PM
💰 ${formatCurrency(bookingCharges)} | ⏳ Payment Pending

📌 Notes:
• Pay before event date
• 24hr cancellation notice required
• Leave hall clean

📄 Invoice: ${invoiceUrl}

Reply *0* for menu`
    }

    if (choice === "2") {
      // User declined terms
      clearState(phoneNumber)
      return `❌ *Booking Cancelled*

You must agree to terms to book the hall. Contact management if you have concerns.

Reply *0* for menu`
    }

    return `❓ *Invalid Response*

Reply *1* (Yes) or *2* (No)

Reply *0* for menu`
  } catch (error) {
    console.error("[Booking] Policies acceptance error:", error)
    return `❌ *Unable to Process*

Please try again.

Reply *0* for menu`
  }
}

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

Please enter the date you'd like to book the hall.

You can enter the date in any of these formats:
• DD-MM-YYYY (e.g., 25-12-2025)
• Natural language (e.g., "1st December", "Dec 25")
• Shortcuts (e.g., "today", "tomorrow")
• Just the day (e.g., "15")

Type B to go back, or 0 for main menu.`
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

  return `❓ I didn't understand that date format.

📅 Please try one of these formats:
• DD-MM-YYYY (e.g., 25-12-2025)
• Natural language (e.g., "1st December", "Dec 25")
• Shortcuts (e.g., "today", "tomorrow")
• Just the day (e.g., "15")

Type 'B' or 'back' to go back, or 0 for the main menu`
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
      return `❓ I couldn't understand that date format.

📅 Please enter the date in DD-MM-YYYY format (Example: 25-12-2025)

Type 'B' or 'back' to go back or 0 for the main menu`
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
      return `⚠️ I can't book dates in the past!

📅 Please select a future date and try again.

Type 'B' or 'back' to go back or 0 for the main menu`
    }

    // Get booking settings to check working days
    const settings = await getCachedSettings()

    if (settings && !isWorkingDay(parsedDate, settings.working_days)) {
      const dayName = getDayName(parsedDate)
      return `⚠️ The community hall is closed on ${dayName}s.

Please choose a date from our working days and try again.

Type 'B' or 'back' to go back or 0 for the main menu`
    }

    // Check if date is already booked (ONE EVENT PER DAY)
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("booking_date", parsedDate)
      .in("status", ["confirmed", "payment_pending"])

    if (existingBookings && existingBookings.length > 0) {
      return `❌ Date Already Booked

Sorry, the community hall is already booked for ${formatDate(parsedDate)}.

Someone else has reserved it for that day.

Please choose a different date or type 0 for the main menu`
    }

    // Date is available, show policies
    const userState = getState(phoneNumber)
    userState.step = "booking_policies"
    userState.date = parsedDate
    setState(phoneNumber, userState)

    const bookingCharges = settings?.booking_charges || 500
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://com3-bms.vercel.app"
    const policiesLink = `${baseUrl}/policies`

    return `📋 Community Hall Booking Policies

📅 Date: ${formatDate(parsedDate)}

📄 Please read our complete booking policies:
👉 ${policiesLink}

Do you agree to these terms and conditions?

1. ✅ Yes, I Agree
2. ❌ No, I Don't Agree

Reply with 1 or 2`
  } catch (error) {
    console.error("[Booking] Date input error:", error)
    return `❌ Unable to process that date.

Type 0 to return to the main menu`
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
          return `⚠️ Oops! That date was just taken by someone else.

Please choose another date or type 0 for the main menu`
        }
        return `❌ Unable to complete your booking.

Please try again or type 0 for the main menu`
      }

      clearState(phoneNumber)

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const invoiceUrl = `${baseUrl}/booking-invoice/${booking.id}?payment=pending&booking=confirmed`

      // Calculate payment due date (3 days from now)
      const paymentDueDate = new Date()
      paymentDueDate.setDate(paymentDueDate.getDate() + 3)

      return `✅ Booking Confirmed!

📋 Booking Details:
📅 Date: ${formatDate(userState.date!)}
🕐 Time: Full Day (9:00 AM - 9:00 PM)
💰 Charges: ${formatCurrency(bookingCharges)}
📊 Status: Payment Pending

📝 Important:
• Payment must be completed before the event date
• Cancellations must be made 24 hours in advance
• Please keep the hall clean after use

📄 View Invoice: ${invoiceUrl}

Type 0 to return to the main menu`
    }

    if (choice === "2") {
      // User declined terms
      clearState(phoneNumber)
      return `❌ Booking Cancelled

You must agree to the terms and conditions to book the community hall.

If you have any concerns, please contact the admin.

Type 0 to return to the main menu`
    }

    return `❓ Invalid Response

Please reply with:
1 - To agree to the terms
2 - To decline

Type 0 for the main menu`
  } catch (error) {
    console.error("[Booking] Policies acceptance error:", error)
    return `❌ Unable to process your response.

Type 0 to return to the main menu`
  }
}

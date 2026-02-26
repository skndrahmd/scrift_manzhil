/**
 * Booking Flow Handler
 * Handles community hall booking conversation flow
 */

import { supabase } from "@/lib/supabase"
import { isDateFormat, parseDate, isWorkingDay, getDayName, getPakistanTime } from "@/lib/date"
import type { Profile, UserState } from "../types"
import { getState, setState, clearState } from "../state"
import { getCachedSettings } from "../profile"
import { formatDate, formatCurrency } from "../utils"
import { getMessage } from "../messages"
import { MSG } from "../message-keys"

/**
 * Initialize booking flow
 */
export async function initializeBookingFlow(phoneNumber: string, language?: string): Promise<string> {
  await setState(phoneNumber, {
    step: "booking_date",
    type: "booking",
    language,
  })

  return await getMessage(MSG.BOOKING_DATE_PROMPT, undefined, language)
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
  const language = userState.language

  // Handle terms acceptance
  if (userState.step === "booking_policies") {
    return await handlePoliciesAcceptance(message, profile, phoneNumber, userState, language)
  }

  // Handle date input
  if (isDateFormat(message)) {
    return await handleDateInput(message, profile, phoneNumber, language)
  }

  return await getMessage(MSG.BOOKING_INVALID_DATE, undefined, language)
}

/**
 * Handle date input
 */
async function handleDateInput(
  message: string,
  profile: Profile,
  phoneNumber: string,
  language?: string
): Promise<string> {
  try {
    const parsedDate = parseDate(message)
    if (!parsedDate) {
      return await getMessage(MSG.BOOKING_INVALID_DATE_FORMAT, undefined, language)
    }

    // Check if the date is in the past
    const today = getPakistanTime()
    const todayString =
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0")

    if (parsedDate < todayString) {
      return await getMessage(MSG.BOOKING_DATE_PAST, undefined, language)
    }

    // Get booking settings to check working days
    const settings = await getCachedSettings()

    if (settings && !isWorkingDay(parsedDate, settings.working_days)) {
      const dayName = getDayName(parsedDate)
      return await getMessage(MSG.BOOKING_HALL_UNAVAILABLE, { day_name: dayName }, language)
    }

    // Check if date is already booked (ONE EVENT PER DAY)
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("booking_date", parsedDate)
      .in("status", ["confirmed", "payment_pending"])

    if (existingBookings && existingBookings.length > 0) {
      return await getMessage(MSG.BOOKING_DATE_TAKEN, { date: formatDate(parsedDate) }, language)
    }

    // Date is available, show policies
    const userState = await getState(phoneNumber)
    userState.step = "booking_policies"
    userState.date = parsedDate
    await setState(phoneNumber, userState)

    const bookingCharges = settings?.booking_charges || 500
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ""
    const policiesLink = `${baseUrl}/policies`

    return await getMessage(MSG.BOOKING_POLICIES, {
      date: formatDate(parsedDate),
      charges: formatCurrency(bookingCharges),
      policies_link: policiesLink,
    }, language)
  } catch (error) {
    console.error("[Booking] Date input error:", error)
    return await getMessage(MSG.ERROR_GENERIC, undefined, language)
  }
}

/**
 * Handle policies acceptance
 */
async function handlePoliciesAcceptance(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState,
  language?: string
): Promise<string> {
  try {
    const choice = message.trim()

    if (choice === "1") {
      // User agreed to terms, create booking
      const settings = await getCachedSettings()
      const bookingCharges = settings?.booking_charges || 500

      // Double-check slot availability right before insert to minimize race condition window
      const { data: checkAgain } = await supabase
        .from("bookings")
        .select("id")
        .eq("booking_date", userState.date)
        .in("status", ["confirmed", "payment_pending"])
        .limit(1)

      if (checkAgain && checkAgain.length > 0) {
        await clearState(phoneNumber)
        return await getMessage(MSG.BOOKING_DATE_NO_LONGER_AVAILABLE, undefined, language)
      }

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
          return await getMessage(MSG.BOOKING_DATE_NO_LONGER_AVAILABLE, undefined, language)
        }
        return await getMessage(MSG.BOOKING_FAILED, undefined, language)
      }

      await clearState(phoneNumber)

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ""
      const invoiceUrl = `${baseUrl}/booking-invoice/${booking.id}?payment=pending&booking=confirmed`

      return await getMessage(MSG.BOOKING_CONFIRMED, {
        date: formatDate(userState.date!),
        charges: formatCurrency(bookingCharges),
        invoice_url: invoiceUrl,
      }, language)
    }

    if (choice === "2") {
      // User declined terms
      await clearState(phoneNumber)
      return await getMessage(MSG.BOOKING_DECLINED, undefined, language)
    }

    return await getMessage(MSG.BOOKING_INVALID_RESPONSE, undefined, language)
  } catch (error) {
    console.error("[Booking] Policies acceptance error:", error)
    return await getMessage(MSG.ERROR_GENERIC, undefined, language)
  }
}

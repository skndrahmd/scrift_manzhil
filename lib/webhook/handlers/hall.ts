/**
 * Hall Management Flow Handler
 * Handles community hall management conversation flow (booking, cancel, edit, view)
 */

import { supabase } from "@/lib/supabase"
import { isDateFormat, parseDate, isWorkingDay, getDayName, getPakistanISOString } from "@/lib/dateUtils"
import type { Profile, UserState } from "../types"
import { getState, setState, clearState } from "../state"
import { getCachedSettings, getUserBookings } from "../profile"
import { formatDate, formatCurrency, isYesResponse, isNoResponse } from "../utils"
import { getHallMenu } from "../menu"

// Divider constant for consistent styling
const DIVIDER = "───────────────────"

/**
 * Initialize hall management flow
 */
export function initializeHallFlow(phoneNumber: string): string {
  setState(phoneNumber, {
    step: "hall_menu",
    type: "hall",
  })

  return getHallMenu()
}

/**
 * Handle hall flow steps
 */
export async function handleHallFlow(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState
): Promise<string> {
  const choice = message.trim()

  try {
    // Hall menu selection
    if (userState.step === "hall_menu") {
      switch (choice) {
        case "1": // New Booking
          return initializeNewBooking(phoneNumber)
        case "2": // Cancel Booking
          return await initializeCancelBooking(profile, phoneNumber)
        case "3": // Edit Booking
          return await initializeEditBooking(profile, phoneNumber)
        case "4": // View My Bookings
          return await viewMyBookings(profile, phoneNumber)
        default:
          return `❓ *Invalid Selection*

${DIVIDER}

Please choose a number from 1-4.

${DIVIDER}
Reply *0* for the main menu`
      }
    }

    // New booking flow
    if (userState.step === "hall_new_booking_date") {
      return await handleNewBookingDate(message, profile, phoneNumber, userState)
    }

    if (userState.step === "hall_new_booking_policies") {
      return await handleBookingPolicies(message, profile, phoneNumber, userState)
    }

    // Cancel booking flow
    if (userState.step === "hall_cancel_select") {
      return await handleCancelSelect(choice, profile, phoneNumber, userState)
    }

    if (userState.step === "hall_cancel_confirm") {
      return await handleCancelConfirm(message, profile, phoneNumber, userState)
    }

    // Edit booking flow
    if (userState.step === "hall_edit_select") {
      return await handleEditSelect(choice, profile, phoneNumber, userState)
    }

    if (userState.step === "hall_edit_date") {
      return await handleEditDate(message, profile, phoneNumber, userState)
    }

    return `❌ *Something Went Wrong*

${DIVIDER}

We couldn't process your request. Please try again.

${DIVIDER}
Reply *0* for the main menu`
  } catch (error) {
    console.error("[Hall] Flow error:", error)
    return `❌ *Unable to Process Request*

${DIVIDER}

We encountered an issue. Please try again shortly.

${DIVIDER}
Reply *0* for the main menu`
  }
}

/**
 * Initialize new booking flow
 */
function initializeNewBooking(phoneNumber: string): string {
  const userState = getState(phoneNumber)
  userState.step = "hall_new_booking_date"
  setState(phoneNumber, userState)

  return `📅 *New Hall Booking*

${DIVIDER}
📋 *Enter Booking Date*
${DIVIDER}

Please enter the date you'd like to book the hall.

*Accepted Formats:*
• DD-MM-YYYY (e.g., 25-12-2025)
• Natural language (e.g., "1st December", "Dec 25")
• Shortcuts (e.g., "today", "tomorrow")

${DIVIDER}
Reply *B* to go back, or *0* for main menu`
}

/**
 * Handle new booking date input
 */
async function handleNewBookingDate(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState
): Promise<string> {
  if (!isDateFormat(message)) {
    return `❓ *Invalid Date Format*

${DIVIDER}

Please enter the date in one of these formats:

• DD-MM-YYYY (e.g., 25-12-2025)
• Natural language (e.g., "1st December")
• Shortcuts (e.g., "today", "tomorrow")

${DIVIDER}
Reply *B* to go back, or *0* for main menu`
  }

  const parsedDate = parseDate(message)
  if (!parsedDate) {
    return `❓ *Invalid Date*

${DIVIDER}

We couldn't understand that date. Please try again.

${DIVIDER}
Reply *0* for the main menu`
  }

  // Check if date is in the past
  const today = new Date()
  const todayString = today.toISOString().split("T")[0]

  if (parsedDate < todayString) {
    return `⚠️ *Invalid Date*

${DIVIDER}

The selected date is in the past. Please choose a future date.

${DIVIDER}
Reply *B* to go back, or *0* for main menu`
  }

  // Check working days
  const settings = await getCachedSettings()
  if (settings && !isWorkingDay(parsedDate, settings.working_days)) {
    const dayName = getDayName(parsedDate)
    return `⚠️ *Hall Unavailable*

${DIVIDER}

The community hall is closed on ${dayName}s.

Please choose a different date.

${DIVIDER}
Reply *B* to go back, or *0* for main menu`
  }

  // Check if date is already booked
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
Reply *B* to go back, or *0* for main menu`
  }

  // Date is available, show policies
  userState.step = "hall_new_booking_policies"
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
}

/**
 * Handle booking policies acceptance
 */
async function handleBookingPolicies(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState
): Promise<string> {
  const choice = message.trim()

  if (choice === "1") {
    const settings = await getCachedSettings()
    const bookingCharges = settings?.booking_charges || 500

    const { data: booking, error } = await supabase
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

    if (error) {
      console.error("[Hall] Booking error:", error)
      if (error.code === "23505") {
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

• Complete payment within 3 days
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
    clearState(phoneNumber)
    return `❌ *Booking Cancelled*

${DIVIDER}

You must agree to the terms and conditions to book the community hall.

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
}

/**
 * Initialize cancel booking flow
 */
async function initializeCancelBooking(profile: Profile, phoneNumber: string): Promise<string> {
  const bookings = await getUserBookings(profile.id, "confirmed")

  if (!bookings || bookings.length === 0) {
    return `📋 *No Bookings Found*

${DIVIDER}

You don't have any confirmed bookings to cancel.

${DIVIDER}
Reply *0* for the main menu`
  }

  const userState = getState(phoneNumber)
  userState.step = "hall_cancel_select"
  userState.bookingList = bookings
  setState(phoneNumber, userState)

  const listText = bookings
    .map((b, i) => `${i + 1}. 📅 ${formatDate(b.booking_date)} | ${b.payment_status === "paid" ? "✅ Paid" : "⏳ Pending"}`)
    .join("\n")

  return `❌ *Cancel Booking*

${DIVIDER}
📋 *Your Bookings*
${DIVIDER}

${listText}

${DIVIDER}
Reply with number to cancel, or *0* for main menu`
}

/**
 * Handle cancel booking selection
 */
async function handleCancelSelect(
  choice: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState
): Promise<string> {
  const bookingIndex = parseInt(choice, 10)
  if (isNaN(bookingIndex) || bookingIndex < 1 || bookingIndex > userState.bookingList!.length) {
    return `❓ *Invalid Selection*

${DIVIDER}

Please choose a number from 1-${userState.bookingList!.length}

${DIVIDER}
Reply *0* for the main menu`
  }

  const selectedBooking = userState.bookingList![bookingIndex - 1]
    ; (userState as any).selectedBooking = selectedBooking
  userState.step = "hall_cancel_confirm"
  setState(phoneNumber, userState)

  let response = `⚠️ *Confirm Cancellation*

${DIVIDER}
📋 *Booking Details*
${DIVIDER}

• Date: ${formatDate(selectedBooking.booking_date)}
• Charges: ${formatCurrency(selectedBooking.booking_charges)}
• Payment: ${selectedBooking.payment_status === "paid" ? "✅ Paid" : "⏳ Pending"}`

  if (selectedBooking.payment_status === "paid") {
    response += `

${DIVIDER}
💡 *Note*
${DIVIDER}

Refund will be processed according to our cancellation policy.`
  }

  response += `

${DIVIDER}

Are you sure you want to cancel?

1. ✅ Yes, cancel
2. ❌ No, keep it

${DIVIDER}
Reply *1* or *2*`

  return response
}

/**
 * Handle cancel confirmation
 */
async function handleCancelConfirm(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState
): Promise<string> {
  if (isYesResponse(message)) {
    const selectedBooking = (userState as any).selectedBooking

    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled", updated_at: getPakistanISOString() })
      .eq("id", selectedBooking.id)

    if (error) {
      console.error("[Hall] Cancel error:", error)
      return `❌ *Cancellation Failed*

${DIVIDER}

We couldn't cancel the booking. Please try again.

${DIVIDER}
Reply *0* for the main menu`
    }

    clearState(phoneNumber)

    let response = `✅ *Booking Cancelled*

${DIVIDER}

Your booking for ${formatDate(selectedBooking.booking_date)} has been cancelled.`

    if (selectedBooking.payment_status === "paid") {
      response += `

Refund will be processed according to our cancellation policy.`
    }

    response += `

${DIVIDER}
Reply *0* for the main menu`

    return response
  }

  if (isNoResponse(message)) {
    clearState(phoneNumber)
    return `✅ *Cancellation Aborted*

${DIVIDER}

Your booking remains active. No changes were made.

${DIVIDER}
Reply *0* for the main menu`
  }

  return `❓ *Invalid Response*

${DIVIDER}

Please reply with:
• *1* — Yes, cancel
• *2* — No, keep it

${DIVIDER}
Reply *0* for the main menu`
}

/**
 * Initialize edit booking flow
 */
async function initializeEditBooking(profile: Profile, phoneNumber: string): Promise<string> {
  const bookings = await getUserBookings(profile.id, "confirmed")

  if (!bookings || bookings.length === 0) {
    return `📋 *No Bookings Found*

${DIVIDER}

You don't have any confirmed bookings to edit.

${DIVIDER}
Reply *0* for the main menu`
  }

  const userState = getState(phoneNumber)
  userState.step = "hall_edit_select"
  userState.bookingList = bookings
  setState(phoneNumber, userState)

  const listText = bookings.map((b, i) => `${i + 1}. 📅 ${formatDate(b.booking_date)}`).join("\n")

  return `✏️ *Edit Booking*

${DIVIDER}
📋 *Your Bookings*
${DIVIDER}

${listText}

${DIVIDER}
Reply with number to reschedule, or *0* for main menu`
}

/**
 * Handle edit booking selection
 */
async function handleEditSelect(
  choice: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState
): Promise<string> {
  const bookingIndex = parseInt(choice, 10)
  if (isNaN(bookingIndex) || bookingIndex < 1 || bookingIndex > userState.bookingList!.length) {
    return `❓ *Invalid Selection*

${DIVIDER}

Please choose a number from 1-${userState.bookingList!.length}

${DIVIDER}
Reply *0* for the main menu`
  }

  const selectedBooking = userState.bookingList![bookingIndex - 1]
    ; (userState as any).selectedBooking = selectedBooking
  userState.step = "hall_edit_date"
  setState(phoneNumber, userState)

  return `✏️ *Reschedule Booking*

${DIVIDER}
📅 *Current Date*
${DIVIDER}

${formatDate(selectedBooking.booking_date)}

${DIVIDER}

Please enter the new date:

${DIVIDER}
Reply *B* to go back, or *0* for main menu`
}

/**
 * Handle edit date input
 */
async function handleEditDate(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState
): Promise<string> {
  if (!isDateFormat(message)) {
    return `❓ *Invalid Date Format*

${DIVIDER}

Please enter the date in DD-MM-YYYY format.
Example: 25-12-2025

${DIVIDER}
Reply *B* to go back, or *0* for main menu`
  }

  const parsedDate = parseDate(message)
  if (!parsedDate) {
    return `❓ *Invalid Date*

${DIVIDER}

We couldn't understand that date. Please try again.

${DIVIDER}
Reply *0* for the main menu`
  }

  // Check if date is in the past
  const today = new Date().toISOString().split("T")[0]
  if (parsedDate < today) {
    return `⚠️ *Invalid Date*

${DIVIDER}

The selected date is in the past. Please choose a future date.

${DIVIDER}
Reply *B* to go back, or *0* for main menu`
  }

  // Check if date is already booked
  const selectedBooking = (userState as any).selectedBooking
  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("id")
    .eq("booking_date", parsedDate)
    .in("status", ["confirmed", "payment_pending"])
    .neq("id", selectedBooking.id)

  if (existingBookings && existingBookings.length > 0) {
    return `❌ *Date Already Booked*

${DIVIDER}

That date is already reserved. Please choose a different date.

${DIVIDER}
Reply *0* for the main menu`
  }

  // Update booking
  const { error } = await supabase
    .from("bookings")
    .update({ booking_date: parsedDate, updated_at: getPakistanISOString() })
    .eq("id", selectedBooking.id)

  if (error) {
    console.error("[Hall] Edit error:", error)
    return `❌ *Update Failed*

${DIVIDER}

We couldn't update the booking. Please try again.

${DIVIDER}
Reply *0* for the main menu`
  }

  clearState(phoneNumber)
  return `✅ *Booking Updated*

${DIVIDER}
📅 *Rescheduled*
${DIVIDER}

• From: ${formatDate(selectedBooking.booking_date)}
• To: ${formatDate(parsedDate)}

Your booking has been successfully rescheduled.

${DIVIDER}
Reply *0* for the main menu`
}

/**
 * View user's bookings
 */
async function viewMyBookings(profile: Profile, phoneNumber: string): Promise<string> {
  const bookings = await getUserBookings(profile.id)

  if (!bookings || bookings.length === 0) {
    return `📋 *No Bookings Found*

${DIVIDER}

You don't have any bookings yet.

You can create a new booking from the Hall menu.

${DIVIDER}
Reply *0* for the main menu`
  }

  const listText = bookings
    .map((b) => {
      const statusEmoji =
        b.status === "confirmed" ? "✅" : b.status === "cancelled" ? "❌" : "⏳"
      const paymentEmoji = b.payment_status === "paid" ? "💰" : "⏳"
      return `📅 ${formatDate(b.booking_date)}
   • Status: ${statusEmoji} ${b.status}
   • Payment: ${paymentEmoji} ${b.payment_status}`
    })
    .join("\n\n")

  clearState(phoneNumber)
  return `📋 *Your Bookings*

${DIVIDER}

${listText}

${DIVIDER}
Reply *0* for the main menu`
}

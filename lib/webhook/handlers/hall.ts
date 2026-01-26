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
          return `❓ That's not a valid option. Please choose a number from 1-4.

Type 0 for the main menu`
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

    return "❌ Oops! Something went wrong. Type 0 to return to the main menu."
  } catch (error) {
    console.error("[Hall] Flow error:", error)
    return `❌ I'm sorry, I had trouble processing your request.

Please try again or type 0 for the main menu`
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

Please enter the date you'd like to book the hall.

You can enter the date in any of these formats:
• DD-MM-YYYY (e.g., 25-12-2025)
• Natural language (e.g., "1st December", "Dec 25")
• Shortcuts (e.g., "today", "tomorrow")

Type B to go back, or 0 for main menu.`
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
    return `❓ I didn't understand that date format.

📅 Please try one of these formats:
• DD-MM-YYYY (e.g., 25-12-2025)
• Natural language (e.g., "1st December")
• Shortcuts (e.g., "today", "tomorrow")

Type 'B' to go back, or 0 for the main menu`
  }

  const parsedDate = parseDate(message)
  if (!parsedDate) {
    return `❓ I couldn't understand that date.

Please try again or type 0 for the main menu`
  }

  // Check if date is in the past
  const today = new Date()
  const todayString = today.toISOString().split("T")[0]

  if (parsedDate < todayString) {
    return `⚠️ I can't book dates in the past!

Please select a future date.

Type 'B' to go back, or 0 for the main menu`
  }

  // Check working days
  const settings = await getCachedSettings()
  if (settings && !isWorkingDay(parsedDate, settings.working_days)) {
    const dayName = getDayName(parsedDate)
    return `⚠️ The community hall is closed on ${dayName}s.

Please choose a different date.

Type 'B' to go back, or 0 for the main menu`
  }

  // Check if date is already booked
  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("id")
    .eq("booking_date", parsedDate)
    .in("status", ["confirmed", "payment_pending"])

  if (existingBookings && existingBookings.length > 0) {
    return `❌ Date Already Booked

Sorry, the community hall is already booked for ${formatDate(parsedDate)}.

Please choose a different date or type 0 for the main menu`
  }

  // Date is available, show policies
  userState.step = "hall_new_booking_policies"
  userState.date = parsedDate
  setState(phoneNumber, userState)

  const bookingCharges = settings?.booking_charges || 500
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://com3-bms.vercel.app"
  const policiesLink = `${baseUrl}/policies`

  return `📋 Community Hall Booking Policies

📅 Date: ${formatDate(parsedDate)}
💰 Charges: ${formatCurrency(bookingCharges)}

📄 Please read our complete booking policies:
👉 ${policiesLink}

Do you agree to these terms and conditions?

1. ✅ Yes, I Agree
2. ❌ No, I Don't Agree

Reply with 1 or 2`
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
        return `⚠️ Oops! That date was just taken by someone else.

Please choose another date or type 0 for the main menu`
      }
      return `❌ Unable to complete your booking.

Please try again or type 0 for the main menu`
    }

    clearState(phoneNumber)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const invoiceUrl = `${baseUrl}/booking-invoice/${booking.id}?payment=pending&booking=confirmed`

    return `✅ Booking Confirmed!

📋 Booking Details:
📅 Date: ${formatDate(userState.date!)}
🕐 Time: Full Day (9:00 AM - 9:00 PM)
💰 Charges: ${formatCurrency(bookingCharges)}
📊 Status: Payment Pending

📝 Important:
• Payment must be completed within 3 days
• Cancellations must be made 24 hours in advance
• Please keep the hall clean after use

📄 View Invoice: ${invoiceUrl}

Type 0 to return to the main menu`
  }

  if (choice === "2") {
    clearState(phoneNumber)
    return `❌ Booking Cancelled

You must agree to the terms and conditions to book the community hall.

Type 0 to return to the main menu`
  }

  return `❓ Invalid Response

Please reply with:
1 - To agree to the terms
2 - To decline`
}

/**
 * Initialize cancel booking flow
 */
async function initializeCancelBooking(profile: Profile, phoneNumber: string): Promise<string> {
  const bookings = await getUserBookings(profile.id, "confirmed")

  if (!bookings || bookings.length === 0) {
    return `📋 You don't have any confirmed bookings to cancel.

Type 0 to return to the main menu`
  }

  const userState = getState(phoneNumber)
  userState.step = "hall_cancel_select"
  userState.bookingList = bookings
  setState(phoneNumber, userState)

  const listText = bookings
    .map((b, i) => `${i + 1}. 📅 ${formatDate(b.booking_date)} | ${b.payment_status === "paid" ? "✅ Paid" : "⏳ Pending"}`)
    .join("\n")

  return `❌ *Cancel Booking*

Select the booking to cancel:

${listText}

Reply with the number, or type 0 for main menu`
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
    return `❓ That's not a valid selection.

Please choose a number from 1-${userState.bookingList!.length}

Type 0 for the main menu`
  }

  const selectedBooking = userState.bookingList![bookingIndex - 1]
  ;(userState as any).selectedBooking = selectedBooking
  userState.step = "hall_cancel_confirm"
  setState(phoneNumber, userState)

  return `⚠️ Are you sure you want to cancel this booking?

📅 Date: ${formatDate(selectedBooking.booking_date)}
💰 Charges: ${formatCurrency(selectedBooking.booking_charges)}
📊 Payment: ${selectedBooking.payment_status === "paid" ? "Paid" : "Pending"}

${selectedBooking.payment_status === "paid" ? "⚠️ Note: Refund will be processed according to our cancellation policy." : ""}

Reply with:
1 - Yes, cancel
2 - No, keep booking`
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
      return `❌ I'm sorry, I couldn't cancel the booking right now.

Please try again or type 0 for the main menu`
    }

    clearState(phoneNumber)
    return `✅ Booking Cancelled

Your booking for ${formatDate(selectedBooking.booking_date)} has been cancelled.

${selectedBooking.payment_status === "paid" ? "Your refund will be processed according to our cancellation policy." : ""}

Type 0 to return to the main menu`
  }

  if (isNoResponse(message)) {
    clearState(phoneNumber)
    return `Cancellation aborted. Your booking remains active.

Type 0 to return to the main menu`
  }

  return `❓ Invalid Response

Please reply with:
1 - Yes
2 - No`
}

/**
 * Initialize edit booking flow
 */
async function initializeEditBooking(profile: Profile, phoneNumber: string): Promise<string> {
  const bookings = await getUserBookings(profile.id, "confirmed")

  if (!bookings || bookings.length === 0) {
    return `📋 You don't have any confirmed bookings to edit.

Type 0 to return to the main menu`
  }

  const userState = getState(phoneNumber)
  userState.step = "hall_edit_select"
  userState.bookingList = bookings
  setState(phoneNumber, userState)

  const listText = bookings.map((b, i) => `${i + 1}. 📅 ${formatDate(b.booking_date)}`).join("\n")

  return `✏️ *Edit Booking*

Select the booking to reschedule:

${listText}

Reply with the number, or type 0 for main menu`
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
    return `❓ That's not a valid selection.

Please choose a number from 1-${userState.bookingList!.length}

Type 0 for the main menu`
  }

  const selectedBooking = userState.bookingList![bookingIndex - 1]
  ;(userState as any).selectedBooking = selectedBooking
  userState.step = "hall_edit_date"
  setState(phoneNumber, userState)

  return `✏️ Editing booking for ${formatDate(selectedBooking.booking_date)}

Please enter the new date:

Type 'B' to go back, or 0 for main menu`
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
    return `❓ I didn't understand that date format.

Please try DD-MM-YYYY format (e.g., 25-12-2025)

Type 'B' to go back, or 0 for the main menu`
  }

  const parsedDate = parseDate(message)
  if (!parsedDate) {
    return `❓ I couldn't understand that date.

Please try again or type 0 for the main menu`
  }

  // Check if date is in the past
  const today = new Date().toISOString().split("T")[0]
  if (parsedDate < today) {
    return `⚠️ I can't book dates in the past!

Please select a future date.`
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
    return `❌ That date is already booked.

Please choose a different date or type 0 for the main menu`
  }

  // Update booking
  const { error } = await supabase
    .from("bookings")
    .update({ booking_date: parsedDate, updated_at: getPakistanISOString() })
    .eq("id", selectedBooking.id)

  if (error) {
    console.error("[Hall] Edit error:", error)
    return `❌ I'm sorry, I couldn't update the booking.

Please try again or type 0 for the main menu`
  }

  clearState(phoneNumber)
  return `✅ Booking Updated!

Your booking has been rescheduled from ${formatDate(selectedBooking.booking_date)} to ${formatDate(parsedDate)}.

Type 0 to return to the main menu`
}

/**
 * View user's bookings
 */
async function viewMyBookings(profile: Profile, phoneNumber: string): Promise<string> {
  const bookings = await getUserBookings(profile.id)

  if (!bookings || bookings.length === 0) {
    return `📋 You don't have any bookings yet.

You can create a new booking from the Hall menu.

Type 0 to return to the main menu`
  }

  const listText = bookings
    .map((b) => {
      const statusEmoji =
        b.status === "confirmed" ? "✅" : b.status === "cancelled" ? "❌" : "⏳"
      const paymentEmoji = b.payment_status === "paid" ? "💰" : "⏳"
      return `📅 ${formatDate(b.booking_date)}
   Status: ${statusEmoji} ${b.status}
   Payment: ${paymentEmoji} ${b.payment_status}`
    })
    .join("\n\n")

  clearState(phoneNumber)
  return `📋 *Your Bookings*

${listText}

Type 0 to return to the main menu`
}

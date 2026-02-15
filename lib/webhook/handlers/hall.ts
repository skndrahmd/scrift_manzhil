/**
 * Hall Management Flow Handler
 * Handles community hall management conversation flow (booking, cancel, edit, view)
 */

import { supabase } from "@/lib/supabase"
import { isDateFormat, parseDate, isWorkingDay, getDayName, getPakistanISOString } from "@/lib/date"
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
          return `❓ *Invalid Selection*

Please choose 1-4.

Reply *0* for menu`
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

Please try again.

Reply *0* for menu`
  } catch (error) {
    console.error("[Hall] Flow error:", error)
    return `❌ *Unable to Process*

Please try again shortly.

Reply *0* for menu`
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

Enter your booking date.

*Formats:*
• DD-MM-YYYY (e.g., 25-12-2025)
• "today", "tomorrow", "Dec 25"

*B* to go back, *0* for menu`
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
    return `❓ *Invalid Date*

Try formats like:
• DD-MM-YYYY (e.g., 25-12-2025)
• "today", "tomorrow"

*B* to go back, *0* for menu`
  }

  const parsedDate = parseDate(message)
  if (!parsedDate) {
    return `❓ *Invalid Date*

We couldn't understand that. Please try again.

Reply *0* for menu`
  }

  // Check if date is in the past
  const today = new Date()
  const todayString = today.toISOString().split("T")[0]

  if (parsedDate < todayString) {
    return `⚠️ *Invalid Date*

Date is in the past. Please choose a future date.

*B* to go back, *0* for menu`
  }

  // Check working days
  const settings = await getCachedSettings()
  if (settings && !isWorkingDay(parsedDate, settings.working_days)) {
    const dayName = getDayName(parsedDate)
    return `⚠️ *Hall Unavailable*

Hall is closed on ${dayName}s. Please choose another date.

*B* to go back, *0* for menu`
  }

  // Check if date is already booked
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
  userState.step = "hall_new_booking_policies"
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
• Pay within 3 days
• 24hr cancellation notice
• Leave hall clean

📄 Invoice: ${invoiceUrl}

Reply *0* for menu`
  }

  if (choice === "2") {
    clearState(phoneNumber)
    return `❌ *Booking Cancelled*

You must agree to terms to book.

Reply *0* for menu`
  }

  return `❓ *Invalid Response*

Reply *1* (Yes) or *2* (No)

Reply *0* for menu`
}

/**
 * Initialize cancel booking flow
 */
async function initializeCancelBooking(profile: Profile, phoneNumber: string): Promise<string> {
  const bookings = await getUserBookings(profile.id, "confirmed")

  if (!bookings || bookings.length === 0) {
    return `📋 *No Bookings Found*

You don't have any confirmed bookings to cancel.

Reply *0* for menu`
  }

  const userState = getState(phoneNumber)
  userState.step = "hall_cancel_select"
  userState.bookingList = bookings
  setState(phoneNumber, userState)

  const listText = bookings
    .map((b, i) => `${i + 1}. 📅 ${formatDate(b.booking_date)} | ${b.payment_status === "paid" ? "✅ Paid" : "⏳ Pending"}`)
    .join("\n")

  return `❌ *Cancel Booking*

${listText}

Reply with number to cancel, or *0* for menu`
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

Please choose 1-${userState.bookingList!.length}

Reply *0* for menu`
  }

  const selectedBooking = userState.bookingList![bookingIndex - 1]
    ; (userState as any).selectedBooking = selectedBooking
  userState.step = "hall_cancel_confirm"
  setState(phoneNumber, userState)

  let response = `⚠️ *Confirm Cancellation*

📅 Date: ${formatDate(selectedBooking.booking_date)}
💰 Charges: ${formatCurrency(selectedBooking.booking_charges)}
💳 Payment: ${selectedBooking.payment_status === "paid" ? "✅ Paid" : "⏳ Pending"}`

  if (selectedBooking.payment_status === "paid") {
    response += `

💡 Note: Refund per cancellation policy.`
  }

  response += `

Cancel this booking?

1. ✅ Yes, cancel
2. ❌ No, keep

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

Please try again.

Reply *0* for menu`
    }

    clearState(phoneNumber)

    let response = `✅ *Booking Cancelled*

Your booking for ${formatDate(selectedBooking.booking_date)} has been cancelled.`

    if (selectedBooking.payment_status === "paid") {
      response += `

Refund per cancellation policy.`
    }

    response += `

Reply *0* for menu`

    return response
  }

  if (isNoResponse(message)) {
    clearState(phoneNumber)
    return `✅ *Cancellation Aborted*

Your booking remains active. No changes made.

Reply *0* for menu`
  }

  return `❓ *Invalid Response*

Reply *1* (Yes) or *2* (No)

Reply *0* for menu`
}

/**
 * Initialize edit booking flow
 */
async function initializeEditBooking(profile: Profile, phoneNumber: string): Promise<string> {
  const bookings = await getUserBookings(profile.id, "confirmed")

  if (!bookings || bookings.length === 0) {
    return `📋 *No Bookings Found*

You don't have any confirmed bookings to edit.

Reply *0* for menu`
  }

  const userState = getState(phoneNumber)
  userState.step = "hall_edit_select"
  userState.bookingList = bookings
  setState(phoneNumber, userState)

  const listText = bookings.map((b, i) => `${i + 1}. 📅 ${formatDate(b.booking_date)}`).join("\n")

  return `✏️ *Edit Booking*

${listText}

Reply with number to reschedule, or *0* for menu`
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

Please choose 1-${userState.bookingList!.length}

Reply *0* for menu`
  }

  const selectedBooking = userState.bookingList![bookingIndex - 1]
    ; (userState as any).selectedBooking = selectedBooking
  userState.step = "hall_edit_date"
  setState(phoneNumber, userState)

  return `✏️ *Reschedule Booking*

📅 Current: ${formatDate(selectedBooking.booking_date)}

Enter the new date:

*B* to go back, *0* for menu`
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
    return `❓ *Invalid Date*

Enter in DD-MM-YYYY format.
Example: 25-12-2025

*B* to go back, *0* for menu`
  }

  const parsedDate = parseDate(message)
  if (!parsedDate) {
    return `❓ *Invalid Date*

We couldn't understand that. Please try again.

Reply *0* for menu`
  }

  // Check if date is in the past
  const today = new Date().toISOString().split("T")[0]
  if (parsedDate < today) {
    return `⚠️ *Invalid Date*

Date is in the past. Please choose a future date.

*B* to go back, *0* for menu`
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

That date is reserved. Please choose another.

Reply *0* for menu`
  }

  // Update booking
  const { error } = await supabase
    .from("bookings")
    .update({ booking_date: parsedDate, updated_at: getPakistanISOString() })
    .eq("id", selectedBooking.id)

  if (error) {
    console.error("[Hall] Edit error:", error)
    return `❌ *Update Failed*

Please try again.

Reply *0* for menu`
  }

  clearState(phoneNumber)
  return `✅ *Booking Updated*

📅 From: ${formatDate(selectedBooking.booking_date)}
📅 To: ${formatDate(parsedDate)}

Successfully rescheduled!

Reply *0* for menu`
}

/**
 * View user's bookings
 */
async function viewMyBookings(profile: Profile, phoneNumber: string): Promise<string> {
  const bookings = await getUserBookings(profile.id)

  if (!bookings || bookings.length === 0) {
    return `📋 *No Bookings Found*

You don't have any bookings yet. Create one from the Hall menu.

Reply *0* for menu`
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

${listText}

Reply *0* for menu`
}

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
import { getMessage } from "../messages"
import { MSG } from "../message-keys"
import { HALL_MENU_OPTIONS } from "../config"

/**
 * Initialize hall management flow
 */
export async function initializeHallFlow(phoneNumber: string): Promise<string> {
  setState(phoneNumber, {
    step: "hall_menu",
    type: "hall",
  })

  const options = HALL_MENU_OPTIONS.map(
    (opt) => `${opt.key}. ${opt.emoji} ${opt.label}`
  ).join("\n")

  return await getMessage(MSG.HALL_MENU, { options })
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
          return await initializeNewBooking(phoneNumber)
        case "2": // Cancel Booking
          return await initializeCancelBooking(profile, phoneNumber)
        case "3": // Edit Booking
          return await initializeEditBooking(profile, phoneNumber)
        case "4": // View My Bookings
          return await viewMyBookings(profile, phoneNumber)
        default:
          return await getMessage(MSG.HALL_INVALID_MENU_SELECTION)
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

    return await getMessage(MSG.ERROR_SOMETHING_WRONG)
  } catch (error) {
    console.error("[Hall] Flow error:", error)
    return await getMessage(MSG.ERROR_GENERIC)
  }
}

/**
 * Initialize new booking flow
 */
async function initializeNewBooking(phoneNumber: string): Promise<string> {
  const userState = getState(phoneNumber)
  userState.step = "hall_new_booking_date"
  setState(phoneNumber, userState)

  return await getMessage(MSG.HALL_NEW_BOOKING_DATE)
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
    return await getMessage(MSG.HALL_INVALID_DATE)
  }

  const parsedDate = parseDate(message)
  if (!parsedDate) {
    return await getMessage(MSG.HALL_INVALID_DATE_PARSE)
  }

  // Check if date is in the past
  const today = new Date()
  const todayString = today.toISOString().split("T")[0]

  if (parsedDate < todayString) {
    return await getMessage(MSG.HALL_DATE_PAST)
  }

  // Check working days
  const settings = await getCachedSettings()
  if (settings && !isWorkingDay(parsedDate, settings.working_days)) {
    const dayName = getDayName(parsedDate)
    return await getMessage(MSG.HALL_UNAVAILABLE, { day_name: dayName })
  }

  // Check if date is already booked
  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("id")
    .eq("booking_date", parsedDate)
    .in("status", ["confirmed", "payment_pending"])

  if (existingBookings && existingBookings.length > 0) {
    return await getMessage(MSG.HALL_DATE_TAKEN, { date: formatDate(parsedDate) })
  }

  // Date is available, show policies
  userState.step = "hall_new_booking_policies"
  userState.date = parsedDate
  setState(phoneNumber, userState)

  const bookingCharges = settings?.booking_charges || 500
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://com3-bms.vercel.app"
  const policiesLink = `${baseUrl}/policies`

  return await getMessage(MSG.HALL_POLICIES, {
    date: formatDate(parsedDate),
    charges: formatCurrency(bookingCharges),
    policies_link: policiesLink,
  })
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
        return await getMessage(MSG.HALL_DATE_NO_LONGER_AVAILABLE)
      }
      return await getMessage(MSG.HALL_BOOKING_FAILED)
    }

    clearState(phoneNumber)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const invoiceUrl = `${baseUrl}/booking-invoice/${booking.id}?payment=pending&booking=confirmed`

    return await getMessage(MSG.HALL_BOOKING_CONFIRMED, {
      date: formatDate(userState.date!),
      charges: formatCurrency(bookingCharges),
      invoice_url: invoiceUrl,
    })
  }

  if (choice === "2") {
    clearState(phoneNumber)
    return await getMessage(MSG.HALL_BOOKING_DECLINED)
  }

  return await getMessage(MSG.HALL_INVALID_RESPONSE)
}

/**
 * Initialize cancel booking flow
 */
async function initializeCancelBooking(profile: Profile, phoneNumber: string): Promise<string> {
  const bookings = await getUserBookings(profile.id, "confirmed")

  if (!bookings || bookings.length === 0) {
    return await getMessage(MSG.HALL_NO_BOOKINGS_CANCEL)
  }

  const userState = getState(phoneNumber)
  userState.step = "hall_cancel_select"
  userState.bookingList = bookings
  setState(phoneNumber, userState)

  const listText = bookings
    .map((b, i) => `${i + 1}. 📅 ${formatDate(b.booking_date)} | ${b.payment_status === "paid" ? "✅ Paid" : "⏳ Pending"}`)
    .join("\n")

  return await getMessage(MSG.HALL_CANCEL_LIST, { list: listText })
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
    return await getMessage(MSG.STATUS_INVALID_SELECTION, {
      max: userState.bookingList!.length,
    })
  }

  const selectedBooking = userState.bookingList![bookingIndex - 1]
    ; (userState as any).selectedBooking = selectedBooking
  userState.step = "hall_cancel_confirm"
  setState(phoneNumber, userState)

  let response = await getMessage(MSG.HALL_CANCEL_CONFIRM, {
    date: formatDate(selectedBooking.booking_date),
    charges: formatCurrency(selectedBooking.booking_charges),
    payment_status: selectedBooking.payment_status === "paid" ? "✅ Paid" : "⏳ Pending",
  })

  if (selectedBooking.payment_status === "paid") {
    response += "\n\n" + await getMessage(MSG.HALL_CANCEL_REFUND_NOTE)
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
      return await getMessage(MSG.HALL_CANCEL_FAILED)
    }

    clearState(phoneNumber)

    let response = await getMessage(MSG.HALL_CANCELLED, {
      date: formatDate(selectedBooking.booking_date),
    })

    if (selectedBooking.payment_status === "paid") {
      response += "\n\n" + await getMessage(MSG.HALL_CANCELLED_REFUND)
    }

    response += "\n\nReply *0* for menu"

    return response
  }

  if (isNoResponse(message)) {
    clearState(phoneNumber)
    return await getMessage(MSG.HALL_CANCEL_ABORTED)
  }

  return await getMessage(MSG.HALL_INVALID_RESPONSE)
}

/**
 * Initialize edit booking flow
 */
async function initializeEditBooking(profile: Profile, phoneNumber: string): Promise<string> {
  const bookings = await getUserBookings(profile.id, "confirmed")

  if (!bookings || bookings.length === 0) {
    return await getMessage(MSG.HALL_NO_BOOKINGS_EDIT)
  }

  const userState = getState(phoneNumber)
  userState.step = "hall_edit_select"
  userState.bookingList = bookings
  setState(phoneNumber, userState)

  const listText = bookings.map((b, i) => `${i + 1}. 📅 ${formatDate(b.booking_date)}`).join("\n")

  return await getMessage(MSG.HALL_EDIT_LIST, { list: listText })
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
    return await getMessage(MSG.STATUS_INVALID_SELECTION, {
      max: userState.bookingList!.length,
    })
  }

  const selectedBooking = userState.bookingList![bookingIndex - 1]
    ; (userState as any).selectedBooking = selectedBooking
  userState.step = "hall_edit_date"
  setState(phoneNumber, userState)

  return await getMessage(MSG.HALL_EDIT_DATE_PROMPT, {
    current_date: formatDate(selectedBooking.booking_date),
  })
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
    return await getMessage(MSG.HALL_EDIT_INVALID_DATE)
  }

  const parsedDate = parseDate(message)
  if (!parsedDate) {
    return await getMessage(MSG.HALL_EDIT_INVALID_DATE_PARSE)
  }

  // Check if date is in the past
  const today = new Date().toISOString().split("T")[0]
  if (parsedDate < today) {
    return await getMessage(MSG.HALL_EDIT_DATE_PAST)
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
    return await getMessage(MSG.HALL_EDIT_DATE_TAKEN)
  }

  // Update booking
  const { error } = await supabase
    .from("bookings")
    .update({ booking_date: parsedDate, updated_at: getPakistanISOString() })
    .eq("id", selectedBooking.id)

  if (error) {
    console.error("[Hall] Edit error:", error)
    return await getMessage(MSG.HALL_EDIT_FAILED)
  }

  clearState(phoneNumber)
  return await getMessage(MSG.HALL_EDIT_SUCCESS, {
    old_date: formatDate(selectedBooking.booking_date),
    new_date: formatDate(parsedDate),
  })
}

/**
 * View user's bookings
 */
async function viewMyBookings(profile: Profile, phoneNumber: string): Promise<string> {
  const bookings = await getUserBookings(profile.id)

  if (!bookings || bookings.length === 0) {
    return await getMessage(MSG.HALL_NO_BOOKINGS_VIEW)
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
  return await getMessage(MSG.HALL_VIEW_BOOKINGS, { list: listText })
}

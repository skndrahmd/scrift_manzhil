/**
 * Hall Management Flow Handler
 * Handles community hall management conversation flow (booking, cancel, edit, view)
 */

import { supabase } from "@/lib/supabase"
import { isDateFormat, parseDate, isWorkingDay, getDayName, getPakistanISOString, getPakistanTime } from "@/lib/date"
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
export async function initializeHallFlow(phoneNumber: string, language?: string): Promise<string> {
  await setState(phoneNumber, {
    step: "hall_menu",
    type: "hall",
    language,
  })

  const options = HALL_MENU_OPTIONS.map(
    (opt) => `${opt.key}. ${opt.emoji} ${opt.label}`
  ).join("\n")

  return await getMessage(MSG.HALL_MENU, { options }, language)
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
  const language = userState.language

  try {
    // Hall menu selection
    if (userState.step === "hall_menu") {
      switch (choice) {
        case "1": // New Booking
          return await initializeNewBooking(phoneNumber, language)
        case "2": // Cancel Booking
          return await initializeCancelBooking(profile, phoneNumber, language)
        case "3": // Edit Booking
          return await initializeEditBooking(profile, phoneNumber, language)
        case "4": // View My Bookings
          return await viewMyBookings(profile, phoneNumber, language)
        default:
          return await getMessage(MSG.HALL_INVALID_MENU_SELECTION, undefined, language)
      }
    }

    // New booking flow
    if (userState.step === "hall_new_booking_date") {
      return await handleNewBookingDate(message, profile, phoneNumber, userState, language)
    }

    if (userState.step === "hall_new_booking_policies") {
      return await handleBookingPolicies(message, profile, phoneNumber, userState, language)
    }

    // Cancel booking flow
    if (userState.step === "hall_cancel_select") {
      return await handleCancelSelect(choice, profile, phoneNumber, userState, language)
    }

    if (userState.step === "hall_cancel_confirm") {
      return await handleCancelConfirm(message, profile, phoneNumber, userState, language)
    }

    // Edit booking flow
    if (userState.step === "hall_edit_select") {
      return await handleEditSelect(choice, profile, phoneNumber, userState, language)
    }

    if (userState.step === "hall_edit_date") {
      return await handleEditDate(message, profile, phoneNumber, userState, language)
    }

    return await getMessage(MSG.ERROR_SOMETHING_WRONG, undefined, language)
  } catch (error) {
    console.error("[Hall] Flow error:", error)
    return await getMessage(MSG.ERROR_GENERIC, undefined, language)
  }
}

/**
 * Initialize new booking flow
 */
async function initializeNewBooking(phoneNumber: string, language?: string): Promise<string> {
  const userState = await getState(phoneNumber)
  userState.step = "hall_new_booking_date"
  await setState(phoneNumber, userState)

  return await getMessage(MSG.HALL_NEW_BOOKING_DATE, undefined, language)
}

/**
 * Handle new booking date input
 */
async function handleNewBookingDate(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState,
  language?: string
): Promise<string> {
  if (!isDateFormat(message)) {
    return await getMessage(MSG.HALL_INVALID_DATE, undefined, language)
  }

  const parsedDate = await parseDate(message)
  if (!parsedDate) {
    return await getMessage(MSG.HALL_INVALID_DATE_PARSE, undefined, language)
  }

  // Check if date is in the past
  const today = await getPakistanTime()
  const todayString =
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0")

  if (parsedDate < todayString) {
    return await getMessage(MSG.HALL_DATE_PAST, undefined, language)
  }

  // Check working days
  const settings = await getCachedSettings()
  if (settings && !isWorkingDay(parsedDate, settings.working_days)) {
    const dayName = getDayName(parsedDate)
    return await getMessage(MSG.HALL_UNAVAILABLE, { day_name: dayName }, language)
  }

  // Check if date is already booked
  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("id")
    .eq("booking_date", parsedDate)
    .in("status", ["confirmed", "payment_pending"])

  if (existingBookings && existingBookings.length > 0) {
    return await getMessage(MSG.HALL_DATE_TAKEN, { date: formatDate(parsedDate) }, language)
  }

  // Date is available, show policies
  userState.step = "hall_new_booking_policies"
  userState.date = parsedDate
  await setState(phoneNumber, userState)

  const bookingCharges = settings?.booking_charges || 500
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ""
  const policiesLink = `${baseUrl}/policies`

  return await getMessage(MSG.HALL_POLICIES, {
    date: formatDate(parsedDate),
    charges: await formatCurrency(bookingCharges),
    policies_link: policiesLink,
  }, language)
}

/**
 * Handle booking policies acceptance
 */
async function handleBookingPolicies(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState,
  language?: string
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
        return await getMessage(MSG.HALL_DATE_NO_LONGER_AVAILABLE, undefined, language)
      }
      return await getMessage(MSG.HALL_BOOKING_FAILED, undefined, language)
    }

    await clearState(phoneNumber)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ""
    const invoiceUrl = `${baseUrl}/booking-invoice/${booking.id}?payment=pending&booking=confirmed`

    return await getMessage(MSG.HALL_BOOKING_CONFIRMED, {
      date: formatDate(userState.date!),
      charges: await formatCurrency(bookingCharges),
      invoice_url: invoiceUrl,
    }, language)
  }

  if (choice === "2") {
    await clearState(phoneNumber)
    return await getMessage(MSG.HALL_BOOKING_DECLINED, undefined, language)
  }

  return await getMessage(MSG.HALL_INVALID_RESPONSE, undefined, language)
}

/**
 * Initialize cancel booking flow
 */
async function initializeCancelBooking(profile: Profile, phoneNumber: string, language?: string): Promise<string> {
  const bookings = await getUserBookings(profile.id, "confirmed")

  if (!bookings || bookings.length === 0) {
    return await getMessage(MSG.HALL_NO_BOOKINGS_CANCEL, undefined, language)
  }

  const userState = await getState(phoneNumber)
  userState.step = "hall_cancel_select"
  userState.bookingList = bookings
  await setState(phoneNumber, userState)

  const listText = bookings
    .map((b, i) => `${i + 1}. 📅 ${formatDate(b.booking_date)} | ${b.payment_status === "paid" ? "✅ Paid" : "⏳ Pending"}`)
    .join("\n")

  return await getMessage(MSG.HALL_CANCEL_LIST, { list: listText }, language)
}

/**
 * Handle cancel booking selection
 */
async function handleCancelSelect(
  choice: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState,
  language?: string
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
  await setState(phoneNumber, userState)

  let response = await getMessage(MSG.HALL_CANCEL_CONFIRM, {
    date: formatDate(selectedBooking.booking_date),
    charges: await formatCurrency(selectedBooking.booking_charges),
    payment_status: selectedBooking.payment_status === "paid" ? "✅ Paid" : "⏳ Pending",
  }, language)

  if (selectedBooking.payment_status === "paid") {
    response += "\n\n" + await getMessage(MSG.HALL_CANCEL_REFUND_NOTE, undefined, language)
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
  userState: UserState,
  language?: string
): Promise<string> {
  if (isYesResponse(message)) {
    const selectedBooking = (userState as any).selectedBooking

    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled", updated_at: await getPakistanISOString() })
      .eq("id", selectedBooking.id)

    if (error) {
      console.error("[Hall] Cancel error:", error)
      return await getMessage(MSG.HALL_CANCEL_FAILED, undefined, language)
    }

    await clearState(phoneNumber)

    let response = await getMessage(MSG.HALL_CANCELLED, {
      date: formatDate(selectedBooking.booking_date),
    }, language)

    if (selectedBooking.payment_status === "paid") {
      response += "\n\n" + await getMessage(MSG.HALL_CANCELLED_REFUND, undefined, language)
    }

    response += "\n\nReply *0* for menu"

    return response
  }

  if (isNoResponse(message)) {
    await clearState(phoneNumber)
    return await getMessage(MSG.HALL_CANCEL_ABORTED, undefined, language)
  }

  return await getMessage(MSG.HALL_INVALID_RESPONSE, undefined, language)
}

/**
 * Initialize edit booking flow
 */
async function initializeEditBooking(profile: Profile, phoneNumber: string, language?: string): Promise<string> {
  const bookings = await getUserBookings(profile.id, "confirmed")

  if (!bookings || bookings.length === 0) {
    return await getMessage(MSG.HALL_NO_BOOKINGS_EDIT, undefined, language)
  }

  const userState = await getState(phoneNumber)
  userState.step = "hall_edit_select"
  userState.bookingList = bookings
  await setState(phoneNumber, userState)

  const listText = bookings.map((b, i) => `${i + 1}. 📅 ${formatDate(b.booking_date)}`).join("\n")

  return await getMessage(MSG.HALL_EDIT_LIST, { list: listText }, language)
}

/**
 * Handle edit booking selection
 */
async function handleEditSelect(
  choice: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState,
  language?: string
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
  await setState(phoneNumber, userState)

  return await getMessage(MSG.HALL_EDIT_DATE_PROMPT, {
    current_date: formatDate(selectedBooking.booking_date),
  }, language)
}

/**
 * Handle edit date input
 */
async function handleEditDate(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState,
  language?: string
): Promise<string> {
  if (!isDateFormat(message)) {
    return await getMessage(MSG.HALL_EDIT_INVALID_DATE, undefined, language)
  }

  const parsedDate = await parseDate(message)
  if (!parsedDate) {
    return await getMessage(MSG.HALL_EDIT_INVALID_DATE_PARSE, undefined, language)
  }

  // Check if date is in the past
  const todayPk = await getPakistanTime()
  const today =
    todayPk.getFullYear() +
    "-" +
    String(todayPk.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(todayPk.getDate()).padStart(2, "0")
  if (parsedDate < today) {
    return await getMessage(MSG.HALL_EDIT_DATE_PAST, undefined, language)
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
    return await getMessage(MSG.HALL_EDIT_DATE_TAKEN, undefined, language)
  }

  // Update booking
  const { error } = await supabase
    .from("bookings")
    .update({ booking_date: parsedDate, updated_at: await getPakistanISOString() })
    .eq("id", selectedBooking.id)

  if (error) {
    console.error("[Hall] Edit error:", error)
    return await getMessage(MSG.HALL_EDIT_FAILED, undefined, language)
  }

  await clearState(phoneNumber)
  return await getMessage(MSG.HALL_EDIT_SUCCESS, {
    old_date: formatDate(selectedBooking.booking_date),
    new_date: formatDate(parsedDate),
  }, language)
}

/**
 * View user's bookings
 */
async function viewMyBookings(profile: Profile, phoneNumber: string, language?: string): Promise<string> {
  const bookings = await getUserBookings(profile.id)

  if (!bookings || bookings.length === 0) {
    return await getMessage(MSG.HALL_NO_BOOKINGS_VIEW, undefined, language)
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

  await clearState(phoneNumber)
  return await getMessage(MSG.HALL_VIEW_BOOKINGS, { list: listText }, language)
}

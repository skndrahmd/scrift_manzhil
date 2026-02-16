/**
 * @module lib/webhook/router
 * WhatsApp webhook message router. Dispatches incoming resident messages
 * to the appropriate conversational flow handler based on menu selection and state.
 */

import type { Profile, MediaInfo } from "./types"
import { getState, setState, clearState } from "./state"
import { isBackCommand, isMainMenuCommand } from "./utils"
import {
  getMainMenu,
  getProfileInfo,
  getMaintenanceStatus,
  getEmergencyContacts,
} from "./menu"
import {
  initializeComplaintFlow,
  handleComplaintFlow,
  initializeBookingFlow,
  handleBookingFlow,
  initializeStaffFlow,
  handleStaffFlow,
  initializeFeedbackFlow,
  handleFeedbackFlow,
  initializeHallFlow,
  handleHallFlow,
  initializeStatusFlow,
  handleStatusFlow,
  initializeCancelFlow,
  handleCancelFlow,
  initializeVisitorFlow,
  handleVisitorFlow,
} from "./handlers"
import { getMessage } from "./messages"
import { MSG } from "./message-keys"

/**
 * Processes an incoming WhatsApp message and routes it to the correct handler.
 * @param message - Raw message text from the resident
 * @param profile - Authenticated resident profile
 * @param phoneNumber - Sender's phone number (used as state key)
 * @param mediaInfo - Optional media attachment info (e.g. CNIC image)
 * @returns Response message string to send back via WhatsApp
 */
export async function processMessage(
  message: string,
  profile: Profile,
  phoneNumber: string,
  mediaInfo?: MediaInfo
): Promise<string> {
  try {
    const trimmedMessage = message.trim()
    const userState = getState(phoneNumber)

    console.log("[Webhook] Processing:", { message: trimmedMessage, step: userState.step, type: userState.type, hasMedia: !!mediaInfo })

    // Handle back command
    if (isBackCommand(trimmedMessage)) {
      return await handleBackCommand(phoneNumber, userState, profile)
    }

    // Handle main menu command - Universal "0"
    if (isMainMenuCommand(trimmedMessage)) {
      clearState(phoneNumber)
      return await getMainMenu(profile.name)
    }

    // Route based on current state
    if (userState.step === "initial" || userState.step === "main_menu") {
      return await handleMainMenu(trimmedMessage, profile, phoneNumber)
    }

    // Route to specific flow handlers
    switch (userState.type) {
      case "complaint":
        return await handleComplaintFlow(trimmedMessage, profile, phoneNumber, userState)
      case "booking":
        return await handleBookingFlow(trimmedMessage, profile, phoneNumber, userState)
      case "staff":
        return await handleStaffFlow(trimmedMessage, profile, phoneNumber, userState)
      case "feedback":
        return await handleFeedbackFlow(trimmedMessage, profile, phoneNumber, userState)
      case "hall":
        return await handleHallFlow(trimmedMessage, profile, phoneNumber, userState)
      case "status":
        return await handleStatusFlow(trimmedMessage, profile, phoneNumber, userState)
      case "cancel":
        return await handleCancelFlow(trimmedMessage, profile, phoneNumber, userState)
      case "visitor":
        return await handleVisitorFlow(trimmedMessage, profile, phoneNumber, userState)
      default:
        return await getMainMenu(profile.name)
    }
  } catch (error) {
    console.error("[Webhook] Process message error:", error)
    return await getMessage(MSG.ERROR_GENERIC)
  }
}

/**
 * Handle main menu selections
 */
async function handleMainMenu(
  message: string,
  profile: Profile,
  phoneNumber: string
): Promise<string> {
  const choice = message.trim()

  switch (choice) {
    case "1": // Register Complaint
      return await initializeComplaintFlow(phoneNumber)

    case "2": // Check Complaint Status
      return await initializeStatusFlow(profile, phoneNumber)

    case "3": // Cancel Complaint
      return await initializeCancelFlow(profile, phoneNumber)

    case "4": // My Staff Management
      return await initializeStaffFlow(phoneNumber)

    case "5": // Check Maintenance Dues
      return await getMaintenanceStatus(profile)

    case "6": // Community Hall
      return await initializeHallFlow(phoneNumber)

    case "7": // Visitor Entry Pass
      return await initializeVisitorFlow(phoneNumber)

    case "8": // View My Profile
      return await getProfileInfo(profile)

    case "9": // Suggestions/Feedback
      return await initializeFeedbackFlow(phoneNumber)

    case "10": // Emergency Contacts
      return await getEmergencyContacts()

    default:
      const menu = await getMainMenu(profile.name)
      return await getMessage(MSG.INVALID_MAIN_MENU, { menu })
  }
}

/**
 * Handle back command - navigate to previous step
 */
async function handleBackCommand(
  phoneNumber: string,
  userState: any,
  profile: Profile
): Promise<string> {
  // Define back navigation based on current step
  const backNavigation: Record<string, { step: string; messageKey: typeof MSG[keyof typeof MSG] }> = {
    // Complaint flow
    complaint_subcategory: {
      step: "complaint_category",
      messageKey: MSG.COMPLAINT_CATEGORY_MENU,
    },
    complaint_description: {
      step: "complaint_subcategory",
      messageKey: userState.complaint?.category === "building"
        ? MSG.BACK_COMPLAINT_SUBCATEGORY_BUILDING
        : MSG.BACK_COMPLAINT_SUBCATEGORY_APARTMENT,
    },

    // Staff flow
    staff_add_phone: {
      step: "staff_add_name",
      messageKey: MSG.BACK_STAFF_ADD_NAME,
    },
    staff_add_cnic: {
      step: "staff_add_phone",
      messageKey: MSG.BACK_STAFF_ADD_PHONE,
    },
    staff_add_role_select: {
      step: "staff_add_cnic",
      messageKey: MSG.BACK_STAFF_ADD_CNIC,
    },
    staff_add_role_custom: {
      step: "staff_add_role_select",
      messageKey: MSG.BACK_STAFF_ADD_ROLE,
    },

    // Booking flow
    booking_policies: {
      step: "booking_date",
      messageKey: MSG.BACK_BOOKING_DATE,
    },

    // Hall flow
    hall_new_booking_date: {
      step: "hall_menu",
      messageKey: MSG.BACK_HALL_MENU,
    },
    hall_new_booking_policies: {
      step: "hall_new_booking_date",
      messageKey: MSG.BACK_HALL_BOOKING_DATE,
    },

    // Visitor flow
    visitor_car_number: {
      step: "visitor_name",
      messageKey: MSG.BACK_VISITOR_NAME,
    },
    visitor_date: {
      step: "visitor_car_number",
      messageKey: MSG.BACK_VISITOR_CAR,
    },
  }

  const nav = backNavigation[userState.step]

  if (nav) {
    userState.step = nav.step
    setState(phoneNumber, userState)

    // For complaint category, use the full menu function with variables
    if (nav.messageKey === MSG.COMPLAINT_CATEGORY_MENU) {
      const { COMPLAINT_CATEGORIES } = await import("./config")
      return await getMessage(MSG.COMPLAINT_CATEGORY_MENU, {
        apartment_emoji: COMPLAINT_CATEGORIES.apartment.emoji,
        apartment_label: COMPLAINT_CATEGORIES.apartment.label,
        building_emoji: COMPLAINT_CATEGORIES.building.emoji,
        building_label: COMPLAINT_CATEGORIES.building.label,
      })
    }

    return await getMessage(nav.messageKey)
  }

  // Default: return to main menu
  clearState(phoneNumber)
  return await getMainMenu(profile.name)
}

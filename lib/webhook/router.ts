/**
 * @module lib/webhook/router
 * WhatsApp webhook message router. Dispatches incoming resident messages
 * to the appropriate conversational flow handler based on menu selection and state.
 */

import type { Profile, MediaInfo } from "./types"
import { getState, setState, clearState, isSessionExpired } from "./state"
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
  initializePaymentFlow,
  handlePaymentFlow,
} from "./handlers"
import { getMessage } from "./messages"
import { MSG } from "./message-keys"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * Get enabled languages. Returns empty array if none enabled.
 */
async function getEnabledLanguages(): Promise<
  { language_code: string; language_name: string; native_name: string | null }[]
> {
  try {
    const { data } = await supabaseAdmin
      .from("enabled_languages")
      .select("language_code, language_name, native_name")
      .eq("is_enabled", true)
      .order("sort_order")

    return data || []
  } catch {
    return []
  }
}

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

    // Handle main menu command - Universal "0" (checked first so it always works)
    if (isMainMenuCommand(trimmedMessage)) {
      clearState(phoneNumber)

      // Check if any languages are enabled
      const enabledLanguages = await getEnabledLanguages()

      if (enabledLanguages.length > 0) {
        // Build language selection menu
        const options = [
          "1. English",
          ...enabledLanguages.map(
            (lang, i) =>
              `${i + 2}. ${lang.native_name || lang.language_name} (${lang.language_name})`
          ),
        ].join("\n")

        setState(phoneNumber, { step: "language_selection" })

        return `🌐 *Select your language:*\n\n${options}\n\nReply 1-${enabledLanguages.length + 1}`
      }

      return await getMainMenu(profile.name)
    }

    // Check session timeout — expire active flows after 5 minutes of inactivity
    if (
      userState.step !== "initial" &&
      userState.step !== "main_menu" &&
      userState.step !== "language_selection" &&
      isSessionExpired(phoneNumber)
    ) {
      const language = userState.language
      clearState(phoneNumber)
      return await getMessage(MSG.SESSION_EXPIRED, undefined, language)
    }

    // Handle back command
    if (isBackCommand(trimmedMessage)) {
      return await handleBackCommand(phoneNumber, userState, profile)
    }

    // Handle language selection
    if (userState.step === "language_selection") {
      const enabledLanguages = await getEnabledLanguages()
      const choice = parseInt(trimmedMessage, 10)

      if (choice === 1) {
        // English selected — no language in state
        clearState(phoneNumber)
        return await getMainMenu(profile.name)
      }

      const langIndex = choice - 2
      if (langIndex >= 0 && langIndex < enabledLanguages.length) {
        const selectedLang = enabledLanguages[langIndex]
        setState(phoneNumber, {
          step: "initial",
          language: selectedLang.language_code,
        })
        return await getMainMenu(profile.name, selectedLang.language_code)
      }

      // Invalid choice
      return `Please reply with a number between 1 and ${enabledLanguages.length + 1}`
    }

    // Route based on current state
    if (userState.step === "initial" || userState.step === "main_menu") {
      return await handleMainMenu(trimmedMessage, profile, phoneNumber, userState.language)
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
      case "payment":
        return await handlePaymentFlow(trimmedMessage, profile, phoneNumber, userState, mediaInfo)
      default:
        return await getMainMenu(profile.name, userState.language)
    }
  } catch (error) {
    console.error("[Webhook] Process message error:", error)
    const userState = getState(phoneNumber)
    return await getMessage(MSG.ERROR_GENERIC, undefined, userState?.language)
  }
}

/**
 * Handle main menu selections
 */
async function handleMainMenu(
  message: string,
  profile: Profile,
  phoneNumber: string,
  language?: string
): Promise<string> {
  const choice = message.trim()

  switch (choice) {
    case "1": // Register Complaint
      return await initializeComplaintFlow(phoneNumber, language)

    case "2": // Check Complaint Status
      return await initializeStatusFlow(profile, phoneNumber, language)

    case "3": // Cancel Complaint
      return await initializeCancelFlow(profile, phoneNumber, language)

    case "4": // My Staff Management
      return await initializeStaffFlow(phoneNumber, language)

    case "5": // Check Maintenance Dues
      return await getMaintenanceStatus(profile, language)

    case "6": // Community Hall
      return await initializeHallFlow(phoneNumber, language)

    case "7": // Visitor Entry Pass
      return await initializeVisitorFlow(phoneNumber, language)

    case "8": // View My Profile
      return await getProfileInfo(profile, language)

    case "9": // Suggestions/Feedback
      return await initializeFeedbackFlow(phoneNumber, language)

    case "10": // Emergency Contacts
      return await getEmergencyContacts(language)

    case "11": // Submit Payment
      return await initializePaymentFlow(profile, phoneNumber, language)

    default:
      const menu = await getMainMenu(profile.name, language)
      return await getMessage(MSG.INVALID_MAIN_MENU, { menu }, language)
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
  const language = userState.language

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

    // Payment flow
    payment_selection: {
      step: "payment_type_selection",
      messageKey: MSG.BACK_PAYMENT_TYPE,
    },
    payment_receipt_upload: {
      step: "payment_type_selection",
      messageKey: MSG.BACK_PAYMENT_TYPE,
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
      }, language)
    }

    return await getMessage(nav.messageKey, undefined, language)
  }

  // Default: return to main menu
  clearState(phoneNumber)
  return await getMainMenu(profile.name, language)
}

/**
 * Webhook Router
 * Main message processing and routing logic
 */

import type { Profile } from "./types"
import { getState, setState, clearState } from "./state"
import { isBackCommand, isMainMenuCommand } from "./utils"
import {
  getMainMenu,
  getProfileInfo,
  getMaintenanceStatus,
  getEmergencyContacts,
  getComplaintCategoryMenu,
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
} from "./handlers"

/**
 * Process incoming message and route to appropriate handler
 */
export async function processMessage(
  message: string,
  profile: Profile,
  phoneNumber: string
): Promise<string> {
  try {
    const trimmedMessage = message.trim()
    const userState = getState(phoneNumber)

    console.log("[Webhook] Processing:", { message: trimmedMessage, step: userState.step, type: userState.type })

    // Handle back command
    if (isBackCommand(trimmedMessage)) {
      return handleBackCommand(phoneNumber, userState, profile)
    }

    // Handle main menu command - Universal "0"
    if (isMainMenuCommand(trimmedMessage)) {
      clearState(phoneNumber)
      return getMainMenu(profile.name)
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
      default:
        return getMainMenu(profile.name)
    }
  } catch (error) {
    console.error("[Webhook] Process message error:", error)
    return `❌ Unable to process your message.

Please try again or type 0 to return to the main menu.`
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
      return initializeComplaintFlow(phoneNumber)

    case "2": // Check Complaint Status
      return await initializeStatusFlow(profile, phoneNumber)

    case "3": // Cancel Complaint
      return await initializeCancelFlow(profile, phoneNumber)

    case "4": // My Staff Management
      return initializeStaffFlow(phoneNumber)

    case "5": // Check Maintenance Dues
      return getMaintenanceStatus(profile)

    case "6": // Community Hall
      return initializeHallFlow(phoneNumber)

    case "7": // View My Profile
      return getProfileInfo(profile)

    case "8": // Suggestions/Feedback
      return initializeFeedbackFlow(phoneNumber)

    case "9": // Emergency Contacts
      return getEmergencyContacts()

    default:
      return `❓ I didn't understand that option.

Please reply with a number from 1-9.

${getMainMenu(profile.name)}`
  }
}

/**
 * Handle back command - navigate to previous step
 */
function handleBackCommand(
  phoneNumber: string,
  userState: any,
  profile: Profile
): string {
  // Define back navigation based on current step
  const backNavigation: Record<string, { step: string; message: () => string }> = {
    // Complaint flow
    complaint_subcategory: {
      step: "complaint_category",
      message: getComplaintCategoryMenu,
    },
    complaint_description: {
      step: "complaint_subcategory",
      message: () => {
        if (userState.complaint?.category === "building") {
          return `🔙 Taking you back!

What kind of building issue would you like to report?

1. 🛗 Lift/Elevator
2. 💪 Gym
3. 🎱 Snooker Room
4. 🎮 Play Area
5. 🚗 Parking
6. 🔒 Security Complaint
7. 🔧 Plumbing
8. ⚡ Electric
9. 🔨 Civil
10. 🤝 Collaboration Corner
11. 🪑 Seating Area
12. 📋 Other

Reply with the number, or type 'B' to go back`
        }
        return `🔙 Taking you back!

What kind of issue are you facing in your apartment?

1. 🔧 Plumbing
2. ⚡ Electric
3. 🔨 Civil
4. 🅿️ My Parking Complaint
5. 🔧 Other

Reply with the number, or type 'B' to go back`
      },
    },

    // Staff flow
    staff_add_phone: {
      step: "staff_add_name",
      message: () => `🔙 Taking you back!

Please enter the staff member's full name:`,
    },
    staff_add_cnic: {
      step: "staff_add_phone",
      message: () => `🔙 Taking you back!

Please enter the staff member's phone number:`,
    },
    staff_add_role_select: {
      step: "staff_add_cnic",
      message: () => `🔙 Taking you back!

Please enter the CNIC number:`,
    },
    staff_add_role_custom: {
      step: "staff_add_role_select",
      message: () => `🔙 Taking you back!

Please choose the role:

1. 🚗 Driver
2. 👨‍🍳 Cook
3. 🧹 Maid
4. 🔧 Plumber
5. ⚡ Electrician
6. 🛠️ Maintenance
7. 🔒 Security Guard
8. 📋 Other (Specify)

Reply with the number (1-8)`,
    },

    // Booking flow
    booking_policies: {
      step: "booking_date",
      message: () => `🔙 Taking you back!

Please enter the date you'd like to book the hall:`,
    },

    // Hall flow
    hall_new_booking_date: {
      step: "hall_menu",
      message: () => `🔙 Taking you back!

🏛️ *Community Hall Management*

What would you like to do?

1. 📅 New Booking
2. ❌ Cancel Booking
3. ✏️ Edit Booking
4. 📋 View My Bookings

Reply with the number, or 0 for main menu`,
    },
    hall_new_booking_policies: {
      step: "hall_new_booking_date",
      message: () => `🔙 Taking you back!

Please enter the date you'd like to book:`,
    },
  }

  const nav = backNavigation[userState.step]

  if (nav) {
    userState.step = nav.step
    setState(phoneNumber, userState)
    return nav.message()
  }

  // Default: return to main menu
  clearState(phoneNumber)
  return getMainMenu(profile.name)
}

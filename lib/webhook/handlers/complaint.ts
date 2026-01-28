/**
 * Complaint Flow Handler
 * Handles complaint registration conversation flow
 */

import { supabase } from "@/lib/supabase"
import { sendWhatsAppMessage, sendWhatsAppTemplate } from "@/lib/twilio"
import type { Profile, UserState } from "../types"
import { getState, setState, clearState } from "../state"
import { COMPLAINT_NOTIFICATION_NUMBERS, TEMPLATE_SIDS } from "../config"
import { formatSubcategory } from "../utils"
import { getComplaintCategoryMenu } from "../menu"

/**
 * Initialize complaint flow
 */
export function initializeComplaintFlow(phoneNumber: string): string {
  setState(phoneNumber, {
    step: "complaint_category",
    type: "complaint",
    complaint: {},
  })

  return getComplaintCategoryMenu()
}

/**
 * Handle complaint flow steps
 */
export async function handleComplaintFlow(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState
): Promise<string> {
  const choice = message.trim()

  switch (userState.step) {
    case "complaint_category":
      return handleCategorySelection(choice, phoneNumber, userState)

    case "complaint_subcategory":
      return await handleSubcategorySelection(choice, profile, phoneNumber, userState)

    case "complaint_description":
      userState.complaint!.description = message
      return await createComplaint(profile, userState, phoneNumber)

    default:
      return `❌ *Something Went Wrong*

We couldn't process your request. Please try again.

Reply *0* for menu`
  }
}

/**
 * Handle category selection (apartment vs building)
 */
function handleCategorySelection(
  choice: string,
  phoneNumber: string,
  userState: UserState
): string {
  if (choice === "1") {
    userState.complaint!.category = "apartment"
    userState.step = "complaint_subcategory"
    setState(phoneNumber, userState)

    return `🏠 *Apartment Complaint*

1. 🔧 Plumbing
2. ⚡ Electric
3. 🔨 Civil
4. 🅿️ My Parking Complaint
5. 🔧 Other

Reply 1-5, or *B* to go back`
  }

  if (choice === "2") {
    userState.complaint!.category = "building"
    userState.step = "complaint_subcategory"
    setState(phoneNumber, userState)

    return `🏢 *Building Complaint*

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

Reply 1-12, or *B* to go back`
  }

  return `❓ *Invalid Selection*

Reply *1* for Apartment or *2* for Building

*B* to go back, *0* for menu`
}

/**
 * Handle subcategory selection
 */
async function handleSubcategorySelection(
  choice: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState
): Promise<string> {
  const isBuilding = userState.complaint!.category === "building"

  const subcategories = isBuilding
    ? [
      "lift_elevator",
      "gym",
      "snooker_room",
      "play_area",
      "parking",
      "security",
      "plumbing",
      "electric",
      "civil",
      "collaboration_corner",
      "seating_area",
      "other",
    ]
    : ["plumbing", "electric", "civil", "my_parking", "other"]

  const maxChoice = subcategories.length
  const choiceNum = parseInt(choice, 10)

  if (choiceNum >= 1 && choiceNum <= maxChoice) {
    userState.complaint!.subcategory = subcategories[choiceNum - 1]

    // Determine if description is needed:
    // - Building: ALL options need description
    // - Apartment: option 4 (my parking) and option 5 (other) need description
    const needsDescription = isBuilding || choiceNum === 4 || choiceNum === 5

    if (needsDescription) {
      userState.step = "complaint_description"
      setState(phoneNumber, userState)
      return `📝 *Add Description*

Please describe the issue briefly.

Reply *B* to go back`
    }

    // Create complaint directly for apartment predefined categories
    return await createComplaint(profile, userState, phoneNumber)
  }

  const rangeText = isBuilding ? "1-12" : "1-5"
  return `❓ *Invalid Selection*

Please choose ${rangeText}.

Reply *B* to go back`
}

/**
 * Create the complaint in database
 */
async function createComplaint(
  profile: Profile,
  userState: UserState,
  phoneNumber: string
): Promise<string> {
  try {
    const complaint = userState.complaint!

    // Generate group key for similar complaints
    const groupKey = `${complaint.category}_${complaint.subcategory}`

    // Prepare description with tower info if applicable
    let finalDescription = complaint.description || null
    if (complaint.tower && finalDescription) {
      finalDescription = `${complaint.tower} - ${finalDescription}`
    } else if (complaint.tower) {
      finalDescription = complaint.tower
    }

    // Insert complaint
    const { data: complaintData, error } = await supabase
      .from("complaints")
      .insert([
        {
          profile_id: profile.id,
          category: complaint.category,
          subcategory: complaint.subcategory,
          description: finalDescription,
          group_key: groupKey,
          status: "pending",
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("[Complaint] Creation error:", error)
      return `❌ *Unable to Register Complaint*

We couldn't register your complaint. Please try again.

Reply *0* for menu`
    }

    // Clear state
    clearState(phoneNumber)

    const categoryText = complaint.category === "apartment" ? "Apartment" : "Building"
    const subcategoryText = formatSubcategory(complaint.subcategory!)

    // Format registration timestamp in Pakistan time
    const registeredAt = new Date(complaintData.created_at)
    const formattedDateTime = registeredAt.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Karachi",
    })

    // Send notification to staff about new complaint
    await sendNewComplaintNotification(complaintData, profile)

    // Try to send confirmation template to resident
    if (TEMPLATE_SIDS.complaintRegistered) {
      const result = await sendWhatsAppTemplate(phoneNumber, TEMPLATE_SIDS.complaintRegistered, {
        "1": profile.name || "Resident",
        "2": complaintData.complaint_id,
        "3": categoryText,
        "4": subcategoryText,
        "5": finalDescription || "No description provided",
        "6": formattedDateTime,
      })
      if (result.ok) {
        // Template sent successfully, return empty string to avoid duplicate
        return ""
      }
      console.warn("[Complaint] Template failed, using fallback message")
    }

    // Fallback confirmation message
    return `✅ *Complaint Registered*

📋 ID: ${complaintData.complaint_id}
🔧 Type: ${subcategoryText}
📝 ${finalDescription || "No description"}
📅 Registered: ${formattedDateTime}

Your complaint has been forwarded to maintenance. We'll notify you of updates.

Reply *0* for menu`
  } catch (error) {
    console.error("[Complaint] Create error:", error)
    return `❌ *Unable to Create Complaint*

We encountered an issue. Please try again.

Reply *0* for menu`
  }
}

/**
 * Send notification to staff about new complaint
 */
async function sendNewComplaintNotification(
  complaint: any,
  profile: Profile
): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://com3-bms.vercel.app"

    // Format category and subcategory
    const categoryText =
      complaint.category === "apartment" ? "Apartment Complaint" : "Building Complaint"
    const subcategoryText = formatSubcategory(complaint.subcategory)

    // Format date and time
    const registeredAt = new Date(complaint.created_at)
    const formattedDate = registeredAt.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Karachi",
    })
    const formattedTime = registeredAt.toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Karachi",
    })

    // Sanitize description for template
    const sanitizedDescription = (complaint.description || "No description provided")
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 500)

    // Template variables
    const templateVariables = {
      "1": complaint.complaint_id || "N/A",
      "2": profile.name || "Unknown",
      "3": profile.apartment_number || "N/A",
      "4": categoryText,
      "5": subcategoryText,
      "6": sanitizedDescription,
      "7": formattedDate,
      "8": formattedTime,
      "9": `${baseUrl}/admin`,
    }

    // Send to all notification recipients
    for (const recipient of COMPLAINT_NOTIFICATION_NUMBERS) {
      let templateSent = false

      // Try template if configured
      if (TEMPLATE_SIDS.newComplaint) {
        const result = await sendWhatsAppTemplate(recipient, TEMPLATE_SIDS.newComplaint, templateVariables)
        if (result.ok) {
          templateSent = true
          console.log(
            `[Complaint] Template sent to ${recipient} for ${complaint.complaint_id}`
          )
        } else {
          console.warn(`[Complaint] Template failed for ${recipient}, using fallback`)
        }
      }

      // Fallback to plain text message
      if (!templateSent) {
        try {
          const fallbackMessage = `🆕 *New Complaint*

📋 ID: ${complaint.complaint_id || "N/A"}
👤 ${profile.name || "Unknown"} (${profile.apartment_number || "N/A"})
🔧 ${categoryText} - ${subcategoryText}
📝 ${sanitizedDescription}
📅 ${formattedDate} at ${formattedTime}

🔗 Admin: ${baseUrl}/admin

— Manzhil`

          await sendWhatsAppMessage(recipient, fallbackMessage)
          console.log(
            `[Complaint] Fallback sent to ${recipient} for ${complaint.complaint_id}`
          )
        } catch (fallbackError) {
          console.error(`[Complaint] Failed to send fallback to ${recipient}:`, fallbackError)
        }
      }
    }
  } catch (error) {
    console.error("[Complaint] Notification error:", error)
    // Don't throw - we don't want to fail complaint creation if notification fails
  }
}

/**
 * Complaint Flow Handler
 * Handles complaint registration conversation flow
 */

import { supabase } from "@/lib/supabase"
import { getConfiguredTimezone } from "@/lib/instance-settings"
import { sendWhatsAppMessage, sendWhatsAppTemplate } from "@/lib/twilio"
import type { Profile, UserState } from "../types"
import { getState, setState, clearState } from "../state"
import { getComplaintRecipients, TEMPLATE_SIDS } from "../config"
import { formatSubcategory } from "../utils"
import { getMessage } from "../messages"
import { MSG } from "../message-keys"
import { getComplaintCategoryMenu, getApartmentSubcategoryMenu, getBuildingSubcategoryMenu } from "../menu"

/**
 * Initialize complaint flow
 */
export async function initializeComplaintFlow(phoneNumber: string, language?: string): Promise<string> {
  await setState(phoneNumber, {
    step: "complaint_category",
    type: "complaint",
    complaint: {},
    language,
  })

  return await getComplaintCategoryMenu(language)
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
  const language = userState.language

  switch (userState.step) {
    case "complaint_category":
      return await handleCategorySelection(choice, phoneNumber, userState, language)

    case "complaint_subcategory":
      return await handleSubcategorySelection(choice, profile, phoneNumber, userState, language)

    case "complaint_description":
      userState.complaint!.description = message
      return await createComplaint(profile, userState, phoneNumber, language)

    default:
      return await getMessage(MSG.COMPLAINT_FLOW_ERROR, undefined, language)
  }
}

/**
 * Handle category selection (apartment vs building)
 */
async function handleCategorySelection(
  choice: string,
  phoneNumber: string,
  userState: UserState,
  language?: string
): Promise<string> {
  if (choice === "1") {
    userState.complaint!.category = "apartment"
    userState.step = "complaint_subcategory"
    await setState(phoneNumber, userState)

    return await getApartmentSubcategoryMenu(language)
  }

  if (choice === "2") {
    userState.complaint!.category = "building"
    userState.step = "complaint_subcategory"
    await setState(phoneNumber, userState)

    return await getBuildingSubcategoryMenu(language)
  }

  return await getMessage(MSG.COMPLAINT_INVALID_CATEGORY, undefined, language)
}

/**
 * Handle subcategory selection
 */
async function handleSubcategorySelection(
  choice: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState,
  language?: string
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
      await setState(phoneNumber, userState)
      return await getMessage(MSG.COMPLAINT_DESCRIPTION_PROMPT, undefined, language)
    }

    // Create complaint directly for apartment predefined categories
    return await createComplaint(profile, userState, phoneNumber, language)
  }

  const rangeText = isBuilding ? "1-12" : "1-5"
  return await getMessage(MSG.COMPLAINT_INVALID_SUBCATEGORY, { range: rangeText }, language)
}

/**
 * Create the complaint in database
 */
async function createComplaint(
  profile: Profile,
  userState: UserState,
  phoneNumber: string,
  language?: string
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
      return await getMessage(MSG.COMPLAINT_CREATION_ERROR, undefined, language)
    }

    // Clear state
    await clearState(phoneNumber)

    const categoryText = complaint.category === "apartment" ? "Apartment" : "Building"
    const subcategoryText = formatSubcategory(complaint.subcategory!)

    // Format registration timestamp in configured timezone
    const timezone = await getConfiguredTimezone()
    const registeredAt = new Date(complaintData.created_at)
    const formattedDateTime = registeredAt.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
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
    return await getMessage(MSG.COMPLAINT_REGISTERED, {
      complaint_id: complaintData.complaint_id,
      subcategory: subcategoryText,
      description: finalDescription || "No description",
      date_time: formattedDateTime,
    }, language)
  } catch (error) {
    console.error("[Complaint] Create error:", error)
    return await getMessage(MSG.COMPLAINT_CREATION_ERROR, undefined, language)
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ""

    // Get dynamic complaint notification recipients from database
    const complaintRecipients = await getComplaintRecipients()
    console.log(`[NEW COMPLAINT NOTIFICATION] Found ${complaintRecipients.length} recipients`)

    if (complaintRecipients.length === 0) {
      console.warn("[NEW COMPLAINT NOTIFICATION] No recipients configured for complaint notifications")
      return
    }

    // Format category and subcategory
    const categoryText =
      complaint.category === "apartment" ? "Apartment Complaint" : "Building Complaint"
    const subcategoryText = formatSubcategory(complaint.subcategory)

    // Format date and time
    const registeredAt = new Date(complaint.created_at)
    const timezone = await getConfiguredTimezone()
    const formattedDate = registeredAt.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: timezone,
    })
    const formattedTime = registeredAt.toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
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

    console.log(`[NEW COMPLAINT NOTIFICATION] Template SID configured: ${TEMPLATE_SIDS.newComplaint ? 'Yes' : 'No'}`)

    // Send to all notification recipients
    for (const recipient of complaintRecipients) {
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
          const fallbackMessage = await getMessage(MSG.COMPLAINT_NOTIFICATION_FALLBACK, {
            complaint_id: complaint.complaint_id || "N/A",
            name: profile.name || "Unknown",
            apartment_number: profile.apartment_number || "N/A",
            category: categoryText,
            subcategory: subcategoryText,
            description: sanitizedDescription,
            date: formattedDate,
            time: formattedTime,
            admin_url: `${baseUrl}/admin`,
          })

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

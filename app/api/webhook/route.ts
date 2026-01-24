import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { isDateFormat, parseDate, isWorkingDay, getDayName, getPakistanISOString, getPakistanTime } from "@/lib/dateUtils"
import { sendWhatsAppMessage, sendWhatsAppTemplate } from "@/lib/twilio"

// Complaint notification recipients
const COMPLAINT_NOTIFICATION_NUMBERS = [
  // "+923091335646", 
  // "+923075496364",
  "+923071288183",
  "+923422546249",
  "+923242927342"
]

// Template SIDs (update these after templates are approved)
const NEW_COMPLAINT_TEMPLATE_SID = process.env.TWILIO_NEW_COMPLAINT_TEMPLATE_SID
const PENDING_COMPLAINT_TEMPLATE_SID = process.env.TWILIO_PENDING_COMPLAINT_TEMPLATE_SID
const COMPLAINT_REGISTERED_TEMPLATE_SID = process.env.TWILIO_COMPLAINT_REGISTERED_TEMPLATE_SID
const ACCOUNT_BLOCKED_TEMPLATE_SID = process.env.TWILIO_ACCOUNT_BLOCKED_TEMPLATE_SID
const ACCOUNT_REACTIVATED_TEMPLATE_SID = process.env.TWILIO_ACCOUNT_REACTIVATED_TEMPLATE_SID

// Enhanced user state for both booking and complaints
const userStates = new Map<
  string,
  {
    step: string
    type?: "booking" | "complaint" | "cancel" | "status" | "staff" | "feedback" | "hall"
    date?: string
    slots?: any[]
    complaint?: {
      category?: string
      subcategory?: string
      description?: string
      tower?: string
    }
    cancelItems?: any[]
    statusItems?: any[]
    staff?: any
    staffList?: any[]
    booking?: any
    bookingList?: any[]
  }
>()

// Cache for booking settings (refreshed every 5 minutes)
let settingsCache: { data: any; timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Helper functions for standardized responses
function isBackCommand(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  return normalized === "b" || normalized === "back"
}

function isYesResponse(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  return normalized === "1" || normalized === "yes"
}

function isNoResponse(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  return normalized === "2" || normalized === "no"
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== WEBHOOK CALLED ===")

    const body = await request.formData()
    const from = body.get("From") as string
    const messageBody = body.get("Body") as string
    const profileName = body.get("ProfileName") as string
    const numMedia = body.get("NumMedia") as string
    const mediaContentType = body.get("MediaContentType0") as string

    const phoneNumber = from.replace("whatsapp:", "")
    console.log("From:", from)
    console.log("Body:", messageBody)
    console.log("NumMedia:", numMedia)
    console.log("MediaContentType:", mediaContentType)

    // Check for media messages (images, voice notes, videos, documents, etc.)
    if (numMedia && parseInt(numMedia) > 0) {
      const errorMessage = `❌ Unsupported Message Type

I can only process text messages at the moment.

Please send your message as text, or type 0 to return to the main menu.`

      try {
        await sendWhatsAppMessage(phoneNumber, errorMessage)
      } catch (sendError) {
        console.error("Error sending media error message:", sendError)
      }

      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
        {
          status: 200,
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
          },
        },
      )
    }

    // Check if message body is empty (media-only message)
    if (!messageBody || messageBody.trim() === "") {
      const errorMessage = `❌ Empty Message

Please send a text message, or type 0 to return to the main menu.`

      try {
        await sendWhatsAppMessage(phoneNumber, errorMessage)
      } catch (sendError) {
        console.error("Error sending empty message error:", sendError)
      }

      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
        {
          status: 200,
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
          },
        },
      )
    }

    // Check if user is registered and active
    const profile = await getProfile(phoneNumber)
    if (!profile) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>👋 Welcome to Greens Three Building Management System.

❌ Your number is not registered in the system. Please contact the administration to register your number for access to services.

📞 Admin Contact: [Contact Admin]</Message></Response>`,
        {
          status: 200,
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
          },
        },
      )
    }

    if (!profile.is_active) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>⚠️ Your account is currently inactive.

Please contact the administration to reactivate your account for continued access to services.

📞 Admin Contact: [Contact Admin]</Message></Response>`,
        {
          status: 200,
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
          },
        },
      )
    }

    // Check if maintenance payment is overdue by 2 months
    if (profile.last_payment_date) {
      const lastPaymentDate = new Date(profile.last_payment_date)
      const currentDate = new Date()
      const monthsDiff = (currentDate.getFullYear() - lastPaymentDate.getFullYear()) * 12 +
        (currentDate.getMonth() - lastPaymentDate.getMonth())

      if (monthsDiff >= 2) {
        let templateSent = false

        // Try to send account blocked template
        try {
          if (ACCOUNT_BLOCKED_TEMPLATE_SID) {
            // Template variables: 1=Name, 2=Apartment, 3=TotalDue, 4=OverdueMonths
            await sendWhatsAppTemplate(phoneNumber, ACCOUNT_BLOCKED_TEMPLATE_SID, {
              "1": profile.name || "Resident",
              "2": profile.apartment_number || "N/A",
              "3": (profile.maintenance_charges * monthsDiff).toLocaleString(),
              "4": monthsDiff.toString(),
            })
            templateSent = true
          }
        } catch (templateError) {
          console.error("Failed to send account blocked template:", templateError)
        }

        // Fallback to freeform message if template not sent
        if (!templateSent) {
          const fallbackMessage = `🚫 Access Temporarily Blocked

Access to services is temporarily restricted due to unpaid maintenance fees for the last 2 months.

💳 Last Payment: ${new Date(profile.last_payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Karachi' })}
💰 Outstanding Amount: Rs. ${profile.maintenance_charges * monthsDiff}

Please clear your dues to regain access to the chatbot services.

📞 Contact Admin: [Contact Admin]`

          try {
            await sendWhatsAppMessage(phoneNumber, fallbackMessage)
          } catch (fallbackError) {
            console.error("Failed to send fallback message:", fallbackError)
          }
        }

        // Return empty response since message was sent via API
        return new Response("", {
          status: 200,
        })
      }
    } else if (!profile.maintenance_paid) {
      // If no payment date exists and maintenance is not paid, check account age
      const accountCreatedDate = new Date(profile.created_at)
      const currentDate = new Date()
      const monthsSinceCreation = (currentDate.getFullYear() - accountCreatedDate.getFullYear()) * 12 +
        (currentDate.getMonth() - accountCreatedDate.getMonth())

      if (monthsSinceCreation >= 2) {
        let templateSent = false

        // Try to send account blocked template
        try {
          if (ACCOUNT_BLOCKED_TEMPLATE_SID) {
            // Template variables: 1=Name, 2=Apartment, 3=TotalDue, 4=OverdueMonths
            await sendWhatsAppTemplate(phoneNumber, ACCOUNT_BLOCKED_TEMPLATE_SID, {
              "1": profile.name || "Resident",
              "2": profile.apartment_number || "N/A",
              "3": (profile.maintenance_charges * monthsSinceCreation).toLocaleString(),
              "4": monthsSinceCreation.toString(),
            })
            templateSent = true
          }
        } catch (templateError) {
          console.error("Failed to send account blocked template:", templateError)
        }

        // Fallback to freeform message if template not sent
        if (!templateSent) {
          const fallbackMessage = `🚫 Access Temporarily Blocked

Access to services is temporarily restricted due to unpaid maintenance fees for the last 2 months.

💰 Outstanding Amount: Rs. ${profile.maintenance_charges * monthsSinceCreation}

Please clear your dues to regain access to the chatbot services.

📞 Contact Admin: [Contact Admin]`

          try {
            await sendWhatsAppMessage(phoneNumber, fallbackMessage)
          } catch (fallbackError) {
            console.error("Failed to send fallback message:", fallbackError)
          }
        }

        // Return empty response since message was sent via API
        return new Response("", {
          status: 200,
        })
      }
    }

    // Process message
    const response = await processMessage(messageBody, profile, phoneNumber)
    console.log("Sending response:", response)

    // Send response via Twilio API (for production WhatsApp senders)
    // Skip if response is empty (template was already sent)
    if (response && response.trim() !== "") {
      try {
        const result = await sendWhatsAppMessage(phoneNumber, response)
        console.log("Message send result:", result)

        if (!result.ok) {
          console.error("Failed to send WhatsApp message:", result.error)
        }
      } catch (sendError) {
        console.error("Error sending WhatsApp message:", sendError)
      }
    } else {
      console.log("Skipping empty response (template was already sent)")
    }

    // Return empty 200 response (Twilio doesn't need TwiML for WhatsApp senders)
    return new Response("", {
      status: 200,
    })
  } catch (error) {
    console.error("Error:", error)
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>❌ A system error has occurred.

Please try again. If the issue persists, contact the administration.

Type 0 to return to the main menu.</Message></Response>`
    return new Response(errorTwiml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
      },
    })
  }
}

export async function GET() {
  console.log("GET request to webhook")
  return new Response("Webhook endpoint is working", { status: 200 })
}

async function getProfile(phoneNumber: string) {
  try {
    console.log("Getting profile for:", phoneNumber)

    // Optimized: Only fetch required fields
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, phone_number, name, apartment_number, is_active, maintenance_paid, maintenance_charges, last_payment_date, cnic, building_block, created_at")
      .eq("phone_number", phoneNumber)
      .single()

    if (error && error.code === "PGRST116") {
      console.log("Profile not found")
      return null
    } else if (error) {
      console.error("Profile fetch error:", error)
      return null
    }

    console.log("Profile:", profile)
    return profile
  } catch (error) {
    console.error("Profile error:", error)
    return null
  }
}

// Cached settings to avoid repeated DB queries
async function getCachedSettings() {
  const now = Date.now()

  // Return cached data if still valid
  if (settingsCache && (now - settingsCache.timestamp) < CACHE_DURATION) {
    return settingsCache.data
  }

  // Fetch fresh data
  const { data: settings } = await supabase
    .from("booking_settings")
    .select("start_time, end_time, slot_duration_minutes, working_days, booking_charges")
    .single()

  // Update cache
  settingsCache = {
    data: settings,
    timestamp: now
  }

  return settings
}

async function processMessage(message: string, profile: any, phoneNumber: string) {
  try {
    const trimmedMessage = message.trim()
    const userState = userStates.get(phoneNumber) || { step: "initial" }

    console.log("Processing:", { message: trimmedMessage, step: userState.step })

    // Handle back command (accepts "B", "b", or "back")
    if (isBackCommand(trimmedMessage)) {
      return handleBackCommand(phoneNumber, userState, profile)
    }

    // Handle main menu command - Universal selector "0"
    if (trimmedMessage === "0") {
      userStates.delete(phoneNumber)
      return getMainMenu(profile.name)
    }

    // Handle main menu selection
    if (userState.step === "initial" || userState.step === "main_menu") {
      return await handleMainMenu(trimmedMessage, profile, phoneNumber)
    }

    // Handle complaint flow
    if (userState.type === "complaint") {
      return await handleComplaintFlow(trimmedMessage, profile, phoneNumber, userState)
    }

    // Handle booking flow
    if (userState.type === "booking") {
      return await handleBookingFlow(trimmedMessage, profile, phoneNumber, userState)
    }

    // Handle cancel flow
    if (userState.type === "cancel") {
      return await handleCancelFlow(trimmedMessage, profile, phoneNumber, userState)
    }

    // Handle status flow
    if (userState.type === "status") {
      return await handleStatusFlow(trimmedMessage, profile, phoneNumber, userState)
    }

    // Handle feedback flow
    if (userState.type === "feedback") {
      return await handleFeedbackFlow(trimmedMessage, profile, phoneNumber, userState)
    }

    // Handle staff management flow
    if (userState.type === "staff") {
      return await handleStaffFlow(trimmedMessage, profile, phoneNumber, userState)
    }

    // Handle hall management flow
    if (userState.type === "hall") {
      return await handleHallFlow(trimmedMessage, profile, phoneNumber, userState)
    }

    // Default welcome
    return getMainMenu(profile.name)
  } catch (error) {
    console.error("Process message error:", error)
    return "❌ Unable to process your message.\n\nPlease try again or type 0 to return to the main menu."
  }
}

function handleBackCommand(phoneNumber: string, userState: any, profile: any) {
  // Go back to previous menu based on current step
  if (userState.step === "complaint_subcategory") {
    userState.step = "complaint_category"
    userStates.set(phoneNumber, userState)
    return `🔙 Taking you back!

Please select the type of complaint:

1. 🏠 My Apartment Complaint
2. 🏢 Building Complaint

Reply with 1 or 2, or type 0 for the main menu`
  } else if (userState.step === "complaint_tower_select") {
    userState.step = "complaint_subcategory"
    userStates.set(phoneNumber, userState)
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

Reply with the number (1-12) or type 'B' or 'back' to go back`
  } else if (userState.step === "complaint_description") {
    userState.step = "complaint_subcategory"
    userStates.set(phoneNumber, userState)

    // Check if it's a building or apartment complaint
    const isBuilding = userState.complaint?.category === "building"

    if (isBuilding) {
      return `🔙 No problem!

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

Reply with the number (1-12) or type 'B' or 'back' to go back`
    } else {
      return `🔙 No problem!

What kind of issue are you facing?

1. 🔧 Plumbing
2. ⚡ Electric
3. 🔨 Civil
4. 🅿️ My Parking Complaint
5. 🔧 Other

Reply with the number (1-5) or type 'B' or 'back' to go back`
    }
  } else if (userState.step === "waiting_for_slot") {
    userState.step = "booking_date"
    userState.date = undefined
    userState.slots = undefined
    userStates.set(phoneNumber, userState)
    return "🔙 Let me help you pick another date!\n\n📅 Please enter the date you'd like to book (DD-MM-YYYY format)\n\nExample: 25-12-2025\n\nType 0 to return to the main menu"
  } else if (userState.step === "cancel_selection") {
    userState.step = "cancel_list"
    userStates.set(phoneNumber, userState)
    return userState.cancelItems ? displayCancelOptions(userState.cancelItems) : "❌ You don't have any items to cancel.\n\nType 0 to return to the main menu"
  } else if (userState.step === "status_selection") {
    userState.step = "status_list"
    userStates.set(phoneNumber, userState)
    return userState.statusItems ? displayStatusOptions(userState.statusItems) : "📊 You don't have any items to check.\n\nType 0 to return to the main menu"
  } else {
    userStates.delete(phoneNumber)
    return getMainMenu(profile.name)
  }
}

function getMainMenu(name: string) {
  return `👋 Welcome to Greens Three, ${name}.

Please select a service from the menu below:

1. 📝 Register Complaint
2. 🔍 Check Complaint Status
3. ❌ Cancel Complaint
4. 👥 My Staff Management
5. 💳 Check Maintenance Dues
6. 🏛️ Community Hall
7. 👤 View My Profile
8. 💡 Suggestions/Feedback
9. 🚨 Emergency Contacts

Reply with the number (1-9)`
}

function getProfileInfo(profile: any) {
  return `👤 Here's your profile information:

📛 Name: ${profile.name}
📱 Phone: ${profile.phone_number}
🏠 Apartment: ${profile.apartment_number}
${profile.building_block ? `🏢 Building: ${profile.building_block}\n` : ""}${profile.cnic ? `🆔 CNIC: ${profile.cnic}\n` : ""}
Type 0 to return to the main menu`
}

function getMaintenanceStatus(profile: any) {
  const status = profile.maintenance_paid ? "PAID" : "UNPAID"
  const statusEmoji = profile.maintenance_paid ? "✅" : "❌"

  let response = `💳 Let me check your maintenance status...

${statusEmoji} Status: ${status}
💰 Monthly Charges: Rs. ${profile.maintenance_charges}`

  if (profile.last_payment_date) {
    response += `\n📅 Last Payment: ${formatDate(profile.last_payment_date)}`
  }

  if (!profile.maintenance_paid) {
    response += `\n\n⚠️ Payment is pending. Please settle your maintenance charges to avoid service disruption.`
  } else {
    response += `\n\n✅ Your maintenance payments are current.`
  }

  response += `\n\nType 0 to return to the main menu`

  return response
}

function getEmergencyContacts() {
  return `🚨 Emergency Contacts

📞 Important Numbers:

1. +923091335646
2. +923075496364


Type 0 to return to the main menu`
}

async function initializeComplaintStatusCheck(profile: any, phoneNumber: string) {
  try {
    const { data: complaints } = await supabase
      .from("complaints")
      .select("id, complaint_id, category, subcategory, description, status, created_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10)

    if (!complaints || complaints.length === 0) {
      return `📊 Complaint Status

You don't have any complaints registered yet.

Type 0 to return to the main menu`
    }

    let response = `📊 Your Complaints

Here are your recent complaints:\n\n`

    complaints.forEach((complaint, index) => {
      const statusEmoji = complaint.status === "resolved" ? "✅" : complaint.status === "in-progress" ? "🔄" : "⏳"
      response += `${index + 1}. ${statusEmoji} ${complaint.complaint_id}\n`
      response += `   ${complaint.subcategory}\n`
      response += `   Status: ${complaint.status.toUpperCase()}\n`
      response += `   Date: ${formatDateTime(complaint.created_at)}\n\n`
    })

    response += `Type 0 to return to the main menu`
    return response
  } catch (error) {
    console.error("Error fetching complaints:", error)
    return "❌ Unable to fetch your complaints.\n\nType 0 to return to the main menu"
  }
}

async function initializeComplaintCancelFlow(profile: any, phoneNumber: string) {
  try {
    const { data: complaints } = await supabase
      .from("complaints")
      .select("id, complaint_id, category, subcategory, description, status, created_at")
      .eq("profile_id", profile.id)
      .in("status", ["pending", "in-progress"])
      .order("created_at", { ascending: false })
      .limit(10)

    if (!complaints || complaints.length === 0) {
      return `❌ Cancel Complaint

You don't have any active complaints to cancel.

Type 0 to return to the main menu`
    }

    userStates.set(phoneNumber, {
      step: "complaint_cancel_select",
      type: "cancel",
      cancelItems: complaints,
    })

    let response = `❌ Cancel Complaint

Select the complaint you want to cancel:\n\n`

    complaints.forEach((complaint, index) => {
      response += `${index + 1}. ${complaint.complaint_id}\n`
      response += `   ${complaint.subcategory}\n`
      response += `   Status: ${complaint.status.toUpperCase()}\n\n`
    })

    response += `Reply with the number (1-${complaints.length}) or type 0 for the main menu`
    return response
  } catch (error) {
    console.error("Error fetching complaints:", error)
    return "❌ Unable to fetch your complaints.\n\nType 0 to return to the main menu"
  }
}

async function handleComplaintFlow(message: string, profile: any, phoneNumber: string, userState: any) {
  const choice = message.trim()

  switch (userState.step) {
    case "complaint_category":
      if (choice === "1") {
        userState.complaint.category = "apartment"
        userState.step = "complaint_subcategory"
        userStates.set(phoneNumber, userState)
        return `Great! Now, what kind of issue are you facing in your apartment?

1. 🔧 Plumbing
2. ⚡ Electric
3. 🔨 Civil
4. 🅿️ My Parking Complaint
5. 🔧 Other

Reply with the number (1-5) or type 'B' or 'back' to go back`
      } else if (choice === "2") {
        userState.complaint.category = "building"
        userState.step = "complaint_subcategory"
        userStates.set(phoneNumber, userState)
        return `Got it! What kind of building issue would you like to report?

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

Reply with the number (1-12) or type 'B' or 'back' to go back`
      } else {
        return "❓ I didn't understand that. Please reply with:\n\n1 - For My Apartment Complaint\n2 - For Building Complaint\n\nType 'B' or 'back' to go back or 0 for the main menu"
      }

    case "complaint_subcategory":
      const isBuilding = userState.complaint.category === "building"

      // Different subcategories for building vs apartment
      const subcategories = isBuilding
        ? ["lift_elevator", "gym", "snooker_room", "play_area", "parking", "security", "plumbing", "electric", "civil", "collaboration_corner", "seating_area", "other"]
        : ["plumbing", "electric", "civil", "my_parking", "other"]

      const subcategoryNames = isBuilding
        ? ["Lift/Elevator", "Gym", "Snooker Room", "Play Area", "Parking", "Security", "Plumbing", "Electric", "Civil", "Collaboration Corner", "Seating Area", "Other"]
        : ["Plumbing", "Electric", "Civil", "My Parking", "Other"]

      const maxChoice = subcategories.length
      const choiceNum = Number.parseInt(choice)

      if (choiceNum >= 1 && choiceNum <= maxChoice) {
        userState.complaint.subcategory = subcategories[choiceNum - 1]

        // Determine if description is needed:
        // - Building: ALL options need description
        // - Apartment: option 4 (my parking) and option 5 (other) need description
        const needsDescription = isBuilding || choiceNum === 4 || choiceNum === 5

        if (needsDescription) {
          userState.step = "complaint_description"
          userStates.set(phoneNumber, userState)
          return "📝 Please tell me more about the issue. Write a short description:\n\nType 'B' or 'back' if you want to go back"
        } else {
          // Create complaint directly for apartment predefined categories
          return await createComplaint(profile, userState, phoneNumber)
        }
      } else {
        const rangeText = isBuilding ? "1-11" : "1-5"
        return `❓ That's not a valid option. Please choose a number from ${rangeText}.\n\nType 'B' or 'back' to go back`
      }

    case "complaint_description":
      userState.complaint.description = message
      return await createComplaint(profile, userState, phoneNumber)

    default:
      return "❌ Oops! Something went wrong. Type 0 to return to the main menu."
  }
}

async function createComplaint(profile: any, userState: any, phoneNumber: string) {
  try {
    // Generate group key for similar complaints
    const groupKey = `${userState.complaint.category}_${userState.complaint.subcategory}`

    // Prepare description with tower info if applicable
    let finalDescription = userState.complaint.description || null
    if (userState.complaint.tower && finalDescription) {
      finalDescription = `${userState.complaint.tower} - ${finalDescription}`
    } else if (userState.complaint.tower) {
      finalDescription = userState.complaint.tower
    }

    // Insert complaint (ID will be generated by database trigger)
    const { data: complaintData, error } = await supabase
      .from("complaints")
      .insert([
        {
          profile_id: profile.id,
          category: userState.complaint.category,
          subcategory: userState.complaint.subcategory,
          description: finalDescription,
          group_key: groupKey,
          status: "pending",
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Complaint creation error:", error)
      return "❌ Unable to register your complaint right now. Please try again.\n\nType 0 to return to the main menu"
    }

    // Clear state
    userStates.delete(phoneNumber)

    const categoryText = userState.complaint.category === "apartment" ? "apartment" : "building"

    // Format subcategory text - replace underscores with spaces and capitalize
    const subcategoryText = userState.complaint.subcategory
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    // Format registration timestamp in Pakistan time (UTC+5)
    const registeredAt = new Date(complaintData.created_at)
    const formattedDateTime = registeredAt.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Karachi'
    })

    // Send notification to staff about new complaint
    await sendNewComplaintNotification(complaintData, profile)

    // Send confirmation to resident using template
    try {
      if (COMPLAINT_REGISTERED_TEMPLATE_SID) {
        // Template variables: 1=Name, 2=ComplaintID, 3=Category, 4=Type, 5=Description, 6=RegisteredTime
        await sendWhatsAppTemplate(phoneNumber, COMPLAINT_REGISTERED_TEMPLATE_SID, {
          "1": profile.name || "Resident",
          "2": complaintData.complaint_id,
          "3": categoryText.charAt(0).toUpperCase() + categoryText.slice(1),
          "4": subcategoryText,
          "5": finalDescription || "No description provided",
          "6": formattedDateTime,
        })

        // Template sent successfully, return empty string to avoid duplicate message
        return ""
      }
    } catch (templateError) {
      console.error("Failed to send complaint registered template:", templateError)
    }

    // Fallback: Return confirmation message if template failed
    if (userState.complaint.subcategory === "other") {
      return `✅ Your complaint has been registered and forwarded to the maintenance team.

🎫 Complaint ID: ${complaintData.complaint_id}
📋 Category: ${categoryText.charAt(0).toUpperCase() + categoryText.slice(1)} - ${subcategoryText}
📅 Registered: ${formattedDateTime}

The management team has been notified and will address this matter promptly.

Type 0 to return to the main menu`
    } else {
      return `✅ Your complaint about the ${subcategoryText.toLowerCase()} issue in your ${categoryText} has been registered.

🎫 Complaint ID: ${complaintData.complaint_id}
📅 Registered: ${formattedDateTime}

The maintenance team has been notified and will resolve this as soon as possible.

Type 0 to return to the main menu`
    }
  } catch (error) {
    console.error("Create complaint error:", error)
    return "❌ Unable to create your complaint. Please try again.\n\nType 0 to return to the main menu"
  }
}


async function handleBookingFlow(message: string, profile: any, phoneNumber: string, userState: any) {
  // Handle terms acceptance
  if (userState.step === "booking_policies") {
    return await handlePoliciesAcceptance(message, profile, phoneNumber, userState)
  }

  // Handle date input
  if (isDateFormat(message)) {
    return await handleDateInput(message, profile, phoneNumber)
  }

  return "❓ I didn't understand that date format.\n\n📅 Please try one of these formats:\n• DD-MM-YYYY (e.g., 25-12-2025)\n• Natural language (e.g., \"1st December\", \"Dec 25\")\n• Shortcuts (e.g., \"today\", \"tomorrow\")\n• Just the day (e.g., \"15\")\n\nType 'B' or 'back' to go back, or 0 for the main menu"
}

async function handleSlotSelection(message: string, profile: any, phoneNumber: string, userState: any) {
  try {
    const slotNumber = Number.parseInt(message)

    if (isNaN(slotNumber) || slotNumber < 1 || slotNumber > userState.slots.length) {
      return `❓ That's not a valid slot number.\n\nPlease choose a number from 1-${userState.slots.length}\n\nType 'back' to select another date`
    }

    const selectedSlot = userState.slots[slotNumber - 1]

    // Double-check availability before booking
    const { data: conflictCheck } = await supabase
      .from("bookings")
      .select("id")
      .eq("booking_date", userState.date)
      .eq("start_time", selectedSlot.start_time)
      .eq("end_time", selectedSlot.end_time)
      .eq("status", "confirmed")

    if (conflictCheck && conflictCheck.length > 0) {
      return `⚠️ This slot has just been booked.\n\nPlease choose another available slot or type 'back' to select a different date`
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert([
        {
          profile_id: profile.id,
          booking_date: userState.date,
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
          status: "confirmed",
          booking_charges: 500, // Default hall booking charge
          payment_status: "pending",
        },
      ])
      .select()
      .single()

    if (bookingError) {
      console.error("Booking error:", bookingError)
      if (bookingError.code === "23505") {
        return "⚠️ Oops! That slot was just taken by someone else.\n\nPlease choose another slot or type 'back'"
      }
      return "❌ Unable to complete your booking.\n\nPlease try again or type 'back'"
    }

    userStates.delete(phoneNumber)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const invoiceUrl = `${baseUrl}/booking-invoice/${booking.id}?payment=pending&booking=confirmed`

    // Calculate payment due date (3 days from now)
    const paymentDueDate = new Date()
    paymentDueDate.setDate(paymentDueDate.getDate() + 3)

    return `✅ Excellent! I've confirmed your booking!

📅 Date: ${formatDate(userState.date)}
⏰ Time: ${selectedSlot.display}
👤 Name: ${profile.name}
🏠 Apartment: ${profile.apartment_number}

💰 PAYMENT DETAILS:
💵 Amount: Rs. 500
📆 Due Date: ${formatDate(paymentDueDate.toISOString().split("T")[0])}

⚠️ Important: Payment must be received within 3 days. Unpaid bookings will be automatically cancelled.

📄 View Invoice: ${invoiceUrl}

Type 0 to return to the main menu`
  } catch (error) {
    console.error("Slot selection error:", error)
    return "❌ Unable to process your selection.\n\nType 0 to return to the main menu"
  }
}

async function handleDateInput(message: string, profile: any, phoneNumber: string) {
  try {
    const parsedDate = parseDate(message)
    if (!parsedDate) {
      return "❓ I couldn't understand that date format.\n\n📅 Please enter the date in DD-MM-YYYY format (Example: 25-12-2025)\n\nType 'B' or 'back' to go back or 0 for the main menu"
    }

    // Check if the date is in the past
    const today = new Date()
    const inputDate = new Date(parsedDate + "T00:00:00")
    const todayString =
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0")

    if (parsedDate < todayString) {
      return `⚠️ I can't book dates in the past!\n\n📅 Please select a future date and try again.\n\nType 'B' or 'back' to go back or 0 for the main menu`
    }

    // Get booking settings to check working days (cached)
    const settings = await getCachedSettings()

    if (settings && !isWorkingDay(parsedDate, settings.working_days)) {
      const dayName = getDayName(parsedDate)
      return `⚠️ The community hall is closed on ${dayName}s.\n\nPlease choose a date from our working days and try again.\n\nType 'B' or 'back' to go back or 0 for the main menu`
    }

    // Check if date is already booked (ONE EVENT PER DAY)
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("booking_date", parsedDate)
      .in("status", ["confirmed", "payment_pending"])

    if (existingBookings && existingBookings.length > 0) {
      return `❌ Date Already Booked\n\nSorry, the community hall is already booked for ${formatDate(parsedDate)}.\n\nSomeone else has reserved it for that day.\n\nPlease choose a different date or type 0 for the main menu`
    }

    // Date is available, show policies
    const userState = userStates.get(phoneNumber) || { step: "initial" }
    userState.step = "booking_policies"
    userState.date = parsedDate
    userStates.set(phoneNumber, userState)

    const bookingCharges = settings?.booking_charges || 500
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://com3-bms.vercel.app"
    const policiesLink = `${baseUrl}/policies`

    return `📋 Community Hall Booking Policies

📅 Date: ${formatDate(parsedDate)}

📄 Please read our complete booking policies:
👉 ${policiesLink}

Do you agree to these terms and conditions?

1. ✅ Yes, I Agree
2. ❌ No, I Don't Agree

Reply with 1 or 2`
  } catch (error) {
    console.error("Date input error:", error)
    return "❌ Unable to process that date.\n\nType 0 to return to the main menu"
  }
}

async function handlePoliciesAcceptance(message: string, profile: any, phoneNumber: string, userState: any) {
  try {
    const choice = message.trim()

    if (choice === "1") {
      // User agreed to terms, create booking
      const settings = await getCachedSettings()
      const bookingCharges = settings?.booking_charges || 500

      const { data: booking, error: bookingError } = await supabase
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

      if (bookingError) {
        console.error("Booking error:", bookingError)
        if (bookingError.code === "23505") {
          return "⚠️ Oops! That date was just taken by someone else.\n\nPlease choose another date or type 0 for the main menu"
        }
        return "❌ Unable to complete your booking.\n\nPlease try again or type 0 for the main menu"
      }

      userStates.delete(phoneNumber)

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const invoiceUrl = `${baseUrl}/booking-invoice/${booking.id}?payment=pending&booking=confirmed`

      // Calculate payment due date (3 days from now)
      const paymentDueDate = new Date()
      paymentDueDate.setDate(paymentDueDate.getDate() + 3)

      return `✅ Booking Confirmed!\n\n📋 Booking Details:\n📅 Date: ${formatDate(userState.date)}\n🕐 Time: Full Day (9:00 AM - 9:00 PM)\n💰 Charges: Rs. ${bookingCharges}\n📊 Status: Payment Pending\n\n📝 Important:\n• Payment must be completed before the event date\n• Cancellations must be made 24 hours in advance\n• Please keep the hall clean after use\n\n📄 View Invoice: ${invoiceUrl}\n\nType 0 to return to the main menu`
    } else if (choice === "2") {
      // User declined terms
      userStates.delete(phoneNumber)
      return `❌ Booking Cancelled\n\nYou must agree to the terms and conditions to book the community hall.\n\nIf you have any concerns, please contact the admin.\n\nType 0 to return to the main menu`
    } else {
      return "❓ Invalid Response\n\nPlease reply with:\n1 - To agree to the terms\n2 - To decline\n\nType 0 for the main menu"
    }
  } catch (error) {
    console.error("Policies acceptance error:", error)
    return "❌ Unable to process your response.\n\nType 0 to return to the main menu"
  }
}

async function handleMainMenu(message: string, profile: any, phoneNumber: string) {
  const choice = message.trim()

  switch (choice) {
    case "1": // Register Complaint
      userStates.set(phoneNumber, { step: "complaint_category", type: "complaint", complaint: {} })
      return `📝 Let me help you register a complaint!

What type of complaint would you like to register?

1. 🏠 My Apartment Complaint
2. 🏢 Building Complaint

Reply with 1 or 2, or type 0 for the main menu`

    case "2": // Check Complaint Status
      return await initializeComplaintStatusCheck(profile, phoneNumber)

    case "3": // Cancel Complaint
      return await initializeComplaintCancelFlow(profile, phoneNumber)

    case "4": // My Staff Management
      userStates.set(phoneNumber, { step: "staff_menu", type: "staff" })
      return `👥 Staff Management

What would you like to do?

1. ➕ Add New Staff Member
2. 🗑️ Delete Staff Member
3. ✏️ Edit Staff Member Information
4. 👀 View My Staff

Reply with the number (1-4) or type 0 for the main menu`

    case "5": // Check Maintenance Dues
      return getMaintenanceStatus(profile)

    case "6": // Community Hall
      userStates.set(phoneNumber, { step: "hall_menu", type: "hall" })
      return `🏛️ Community Hall Management

What would you like to do?

1. 🆕 New Booking
2. ❌ Cancel Booking
3. ✏️ Edit Booking
4. 📜 View My Bookings

Reply with the number (1-4) or type 0 for the main menu`

    case "7": // View My Profile
      return getProfileInfo(profile)

    case "8": // Suggestions/Feedback
      userStates.set(phoneNumber, { step: "feedback_input", type: "feedback" })
      return `💡 I'd love to hear your suggestions or feedback!

Please share your thoughts, ideas, or any feedback you have about our building, services, or facilities.

Type your message below:`

    case "9": // Emergency Contacts
      return getEmergencyContacts()

    default:
      return `❓ I didn't understand that option.

👋 Welcome to Greens Three, ${profile.name}.

Please select a service from the menu below:

1. 📝 Register Complaint
2. 🔍 Check Complaint Status
3. ❌ Cancel Complaint
4. 👥 My Staff Management
5. 💳 Check Maintenance Dues
6. 🏛️ Community Hall
7. 👤 View My Profile
8. 💡 Suggestions/Feedback
9. 🚨 Emergency Contacts

Reply with the number (1-9)`

    //       return `Invalid option. Please select:

    // 1. Register Complaint
    // 2. Book Community Hall
    // 3. Check Status
    // 4. Cancel Booking/Complaint
    // 5. View My Profile
    // 6. Check Maintenance Status

    // Reply with the number (1-6)`
  }
}

async function initializeStatusCheck(profile: any, phoneNumber: string) {
  try {
    // Get recent bookings and complaints (optimized: only fetch needed fields)
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, booking_date, start_time, end_time, status, payment_status, booking_charges, created_at")
      .eq("profile_id", profile.id)
      .in("status", ["confirmed", "payment_pending"])
      .order("created_at", { ascending: false })
      .limit(10)

    const { data: complaints } = await supabase
      .from("complaints")
      .select("id, complaint_id, category, subcategory, description, status, created_at")
      .eq("profile_id", profile.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(10)

    const allItems: any = []

    if (complaints && complaints.length > 0) {
      complaints.forEach((complaint) => {
        allItems.push({
          type: "complaint",
          id: complaint.complaint_id,
          display: `${complaint.complaint_id} - ${complaint.status.toUpperCase()}`,
          data: complaint,
        })
      })
    }

    if (bookings && bookings.length > 0) {
      bookings.forEach((booking) => {
        const paymentStatus = booking.payment_status === "paid" ? "✅" : "💰"
        allItems.push({
          type: "booking",
          id: booking.booking_date,
          display: `${formatDate(booking.booking_date)} - ${booking.status.toUpperCase()} ${paymentStatus}`,
          data: booking,
        })
      })
    }

    if (allItems.length === 0) {
      return "📊 I checked your records and you don't have any recent bookings or complaints.\n\nType 0 to return to the main menu"
    }

    userStates.set(phoneNumber, {
      step: "status_list",
      type: "status",
      statusItems: allItems,
    })

    return displayStatusOptions(allItems)
  } catch (error) {
    console.error("Status check error:", error)
    return "❌ Unable to check your status.\n\nPlease try again or type 0 for the main menu"
  }
}

function displayStatusOptions(items: any[]) {
  let response = "📊 Status Summary:\n\n"

  const complaints = items.filter((item) => item.type === "complaint")
  const bookings = items.filter((item) => item.type === "booking")

  if (complaints.length > 0) {
    response += "📝 COMPLAINTS:\n"
    complaints.forEach((item, index) => {
      response += `${index + 1}. ${item.display}\n`
    })
    response += "\n"
  }

  if (bookings.length > 0) {
    response += "🏛️ BOOKINGS:\n"
    const startIndex = complaints.length
    bookings.forEach((item, index) => {
      response += `${startIndex + index + 1}. ${item.display}\n`
    })
    response += "\n"
  }

  response += "Select a number to view details or type 0 for the main menu"

  return response
}

async function handleStatusFlow(message: string, profile: any, phoneNumber: string, userState: any) {
  const choice = Number.parseInt(message.trim())

  if (userState.step === "status_list") {
    if (isNaN(choice) || choice < 1 || choice > userState.statusItems.length) {
      return `❓ That's not a valid selection.\n\nPlease choose a number from 1-${userState.statusItems.length}\n\nType 0 for the main menu`
    }

    const selectedItem = userState.statusItems[choice - 1]

    if (selectedItem.type === "complaint") {
      const complaint = selectedItem.data
      let response = `📝 Here are the details for your complaint:

🎫 Complaint ID: ${complaint.complaint_id}
📋 Category: ${complaint.category.charAt(0).toUpperCase() + complaint.category.slice(1)} - ${complaint.subcategory.charAt(0).toUpperCase() + complaint.subcategory.slice(1)}
📊 Status: ${complaint.status.toUpperCase()}
📅 Created: ${formatDateTime(complaint.created_at)}`

      if (complaint.description) {
        response += `\n\n📄 Description:\n${complaint.description}`
      }

      response += `\n\nType 0 to return to the main menu`
      userStates.delete(phoneNumber)
      return response
    } else if (selectedItem.type === "booking") {
      const booking = selectedItem.data
      const paymentStatus = booking.payment_status === "paid" ? "PAID ✅" : "PENDING 💰"
      let response = `🏛️ Here are your booking details:

📅 Date: ${formatDate(booking.booking_date)}
⏰ Time: ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}
📊 Status: ${booking.status.toUpperCase()}
💳 Payment: ${paymentStatus}
💰 Amount: Rs. ${booking.booking_charges}`

      // Calculate payment due date (3 days from creation) if payment is pending
      if (booking.payment_status === "pending") {
        const createdDate = new Date(booking.created_at)
        const dueDate = new Date(createdDate)
        dueDate.setDate(dueDate.getDate() + 3)
        response += `\n⚠️ Payment Due: ${formatDate(dueDate.toISOString().split("T")[0])}`
      }

      response += `\n📆 Created: ${formatDateTime(booking.created_at)}`
      response += `\n\nType 0 to return to the main menu`
      userStates.delete(phoneNumber)
      return response
    }
  }

  return "❓ I didn't understand that selection.\n\nType 0 to return to the main menu"
}

async function initializeCancelFlow(profile: any, phoneNumber: string) {
  try {
    // Get active bookings and complaints (optimized: only fetch needed fields)
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, booking_date, start_time, end_time, status")
      .eq("profile_id", profile.id)
      .eq("status", "confirmed")
      .gte("booking_date", getPakistanISOString().split("T")[0])
      .order("booking_date", { ascending: true })

    const { data: complaints } = await supabase
      .from("complaints")
      .select("id, complaint_id, subcategory, status")
      .eq("profile_id", profile.id)
      .in("status", ["pending", "in-progress"])
      .order("created_at", { ascending: false })

    const allItems: any = []

    if (complaints && complaints.length > 0) {
      complaints.forEach((complaint) => {
        allItems.push({
          type: "complaint",
          id: complaint.id,
          display: `${complaint.complaint_id} - ${complaint.subcategory}`,
          data: complaint,
        })
      })
    }

    if (bookings && bookings.length > 0) {
      bookings.forEach((booking) => {
        allItems.push({
          type: "booking",
          id: booking.id,
          display: `${formatDate(booking.booking_date)} at ${formatTime(booking.start_time)}`,
          data: booking,
        })
      })
    }

    if (allItems.length === 0) {
      return "✅ Good news! You don't have any active bookings or complaints to cancel.\n\nType 0 to return to the main menu"
    }

    userStates.set(phoneNumber, {
      step: "cancel_list",
      type: "cancel",
      cancelItems: allItems,
    })

    return displayCancelOptions(allItems)
  } catch (error) {
    console.error("Cancel options error:", error)
    return "❌ I'm sorry, I had trouble getting your cancellation options.\n\nPlease try again or type 0 for the main menu"
  }
}

function displayCancelOptions(items: any[]) {
  let response = "❌ Here are the items you can cancel:\n\n"

  const complaints = items.filter((item) => item.type === "complaint")
  const bookings = items.filter((item) => item.type === "booking")

  if (complaints.length > 0) {
    response += "📝 COMPLAINTS:\n"
    complaints.forEach((item, index) => {
      response += `${index + 1}. ${item.display}\n`
    })
    response += "\n"
  }

  if (bookings.length > 0) {
    response += "🏛️ BOOKINGS:\n"
    const startIndex = complaints.length
    bookings.forEach((item, index) => {
      response += `${startIndex + index + 1}. ${item.display}\n`
    })
    response += "\n"
  }

  response += "Select a number to cancel or type 0 for the main menu"

  return response
}

async function handleCancelFlow(message: string, profile: any, phoneNumber: string, userState: any) {
  const choice = Number.parseInt(message.trim())

  if (userState.step === "complaint_cancel_select") {
    if (isNaN(choice) || choice < 1 || choice > userState.cancelItems.length) {
      return `❓ That's not a valid selection.\n\nPlease choose a number from 1-${userState.cancelItems.length}\n\nType 0 for the main menu`
    }

    const selectedComplaint = userState.cancelItems[choice - 1]
    userState.step = "complaint_cancel_confirm"
    userState.selectedItem = { type: "complaint", id: selectedComplaint.id, data: selectedComplaint }
    userStates.set(phoneNumber, userState)

    return `⚠️ Are you sure you want to cancel this complaint?

🎫 ${selectedComplaint.complaint_id}
📝 ${selectedComplaint.subcategory}
📊 Status: ${selectedComplaint.status.toUpperCase()}

Reply with:
1 - Yes, cancel it
2 - No, keep it`
  } else if (userState.step === "complaint_cancel_confirm") {
    if (isYesResponse(message)) {
      return await processCancellation(userState.selectedItem, phoneNumber)
    } else if (isNoResponse(message)) {
      userStates.delete(phoneNumber)
      return getMainMenu(profile.name)
    } else {
      return "❓ Invalid Response\n\nPlease reply with:\n1 - Yes\n2 - No"
    }
  } else if (userState.step === "cancel_list") {
    if (isNaN(choice) || choice < 1 || choice > userState.cancelItems.length) {
      return `❓ That's not a valid selection.\n\nPlease choose a number from 1-${userState.cancelItems.length}\n\nType 0 for the main menu`
    }

    const selectedItem = userState.cancelItems[choice - 1]

    userState.step = "cancel_confirmation"
    userState.selectedItem = selectedItem
    userStates.set(phoneNumber, userState)

    if (selectedItem.type === "complaint") {
      return `⚠️ Are you sure you want me to cancel this complaint?

🎫 ${selectedItem.data.complaint_id} - ${selectedItem.data.subcategory.charAt(0).toUpperCase() + selectedItem.data.subcategory.slice(1)}
📊 Status: ${selectedItem.data.status.toUpperCase()}

Reply with:\n1 - Yes, cancel it\n2 - No, keep it`
    } else if (selectedItem.type === "booking") {
      return `⚠️ Are you sure you want me to cancel this booking?

📅 Date: ${formatDate(selectedItem.data.booking_date)}
⏰ Time: ${formatTime(selectedItem.data.start_time)} - ${formatTime(selectedItem.data.end_time)}
💰 Amount: Rs. ${selectedItem.data.booking_charges}

Reply with:\n1 - Yes, cancel it\n2 - No, keep it`
    }
  } else if (userState.step === "cancel_confirmation") {
    if (isYesResponse(message)) {
      return await processCancellation(userState.selectedItem, phoneNumber)
    } else if (isNoResponse(message)) {
      userState.step = "cancel_list"
      userStates.set(phoneNumber, userState)
      return displayCancelOptions(userState.cancelItems)
    } else {
      return "❓ Invalid Response\n\nPlease reply with:\n1 - Yes\n2 - No"
    }
  }

  return "❓ I didn't understand that.\n\nType 0 to return to the main menu"
}

async function processCancellation(item: any, phoneNumber: string) {
  try {
    if (item.type === "complaint") {
      const { error } = await supabase
        .from("complaints")
        .update({ status: "cancelled", updated_at: getPakistanISOString() })
        .eq("id", item.id)

      if (error) {
        return "❌ I'm sorry, I couldn't cancel your complaint right now.\n\nPlease try again or type 0 for the main menu"
      } else {
        userStates.delete(phoneNumber)
        return `✅ Done! I've cancelled complaint ${item.data.complaint_id} for you.\n\nType 0 to return to the main menu`
      }
    } else if (item.type === "booking") {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled", updated_at: getPakistanISOString() })
        .eq("id", item.id)

      if (error) {
        return "❌ I'm sorry, I couldn't cancel your booking right now.\n\nPlease try again or type 0 for the main menu"
      } else {
        userStates.delete(phoneNumber)
        return `✅ Done! I've cancelled your booking for ${formatDate(item.data.booking_date)}.\n\nType 0 to return to the main menu`
      }
    }
  } catch (error) {
    console.error("Cancellation error:", error)
    return "❌ I'm sorry, I had trouble processing the cancellation.\n\nPlease try again or type 0 for the main menu"
  }
}

async function handleFeedbackFlow(message: string, profile: any, phoneNumber: string, userState: any) {
  try {
    if (userState.step === "feedback_input") {
      // Save feedback to database
      const { error } = await supabase
        .from("feedback")
        .insert([
          {
            profile_id: profile.id,
            message: message,
            status: "new",
            created_at: getPakistanISOString(),
            updated_at: getPakistanISOString(),
          },
        ])

      if (error) {
        console.error("Feedback creation error:", error)
        return "❌ I'm sorry, I couldn't save your feedback right now. Please try again.\n\nType 0 to return to the main menu"
      }

      // Clear state
      userStates.delete(phoneNumber)

      return `✅ Thank you so much for your feedback!

I've received your message and will make sure it reaches the right people. Your input helps us improve our services and make Com-3 a better place for everyone.

If you have any urgent concerns, feel free to register a complaint instead.

Type 0 to return to the main menu`
    }

    return "❌ Oops! Something went wrong. Type 0 to return to the main menu."
  } catch (error) {
    console.error("Feedback flow error:", error)
    return "❌ I'm sorry, I had trouble processing your feedback.\n\nPlease try again or type 0 for the main menu"
  }
}

async function createStaffMember(profile: any, userState: any, phoneNumber: string) {
  try {
    // Save to database
    const { error } = await supabase
      .from("staff")
      .insert([
        {
          profile_id: profile.id,
          name: userState.staff.name,
          cnic: userState.staff.cnic,
          phone_number: userState.staff.phone_number,
          role: userState.staff.role,
          created_at: getPakistanISOString(),
          updated_at: getPakistanISOString(),
        },
      ])

    if (error) {
      console.error("Staff creation error:", error)
      return "❌ I'm sorry, I couldn't add the staff member right now. Please try again.\n\nType 0 to return to the main menu"
    }

    userStates.delete(phoneNumber)
    return `✅ Perfect! I've successfully added ${userState.staff.name} to your staff list.

📋 Staff Details:
👤 Name: ${userState.staff.name}
🆔 CNIC: ${userState.staff.cnic}
📱 Phone: ${userState.staff.phone_number}
💼 Role: ${userState.staff.role}

📝 Next Steps:
Please have their CNIC ready and deliver to the maintenance department for issuance of physical card.

Type 0 to return to the main menu`
  } catch (error) {
    console.error("Staff creation error:", error)
    return "❌ I'm sorry, I had trouble adding the staff member.\n\nType 0 to return to the main menu"
  }
}

async function handleStaffFlow(message: string, profile: any, phoneNumber: string, userState: any) {
  const choice = message.trim()

  try {
    // Staff menu selection
    if (userState.step === "staff_menu") {
      if (choice === "1") {
        // Add new staff
        userState.step = "staff_add_name"
        userState.staff = {}
        userStates.set(phoneNumber, userState)
        return `➕ Let's add a new staff member!

Please enter the staff member's full name:`
      } else if (choice === "2") {
        // Delete staff
        return await initializeDeleteStaff(profile, phoneNumber)
      } else if (choice === "3") {
        // Edit staff
        return await initializeEditStaff(profile, phoneNumber)
      } else if (choice === "4") {
        // View staff
        return await viewStaffList(profile, phoneNumber)
      } else {
        return "❓ That's not a valid option. Please choose a number from 1-4.\n\nType 0 for the main menu"
      }
    }

    // Add staff flow
    if (userState.step === "staff_add_name") {
      const nameValidation = validateName(message)
      if (!nameValidation.valid) {
        return nameValidation.error!
      }

      userState.staff.name = message.trim()
      userState.step = "staff_add_phone"
      userStates.set(phoneNumber, userState)
      return `Great! Now, please enter the staff member's phone number:\n\nExamples:\n• 03001234567\n• +923001234567\n\nType 'B' or 'back' to go back`
    }

    if (userState.step === "staff_add_phone") {
      const phoneValidation = validatePhoneNumber(message)
      if (!phoneValidation.valid) {
        return phoneValidation.error!
      }

      // Check for duplicate phone number
      const { data: existingStaff } = await supabase
        .from("staff")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("phone_number", phoneValidation.normalized!)
        .single()

      if (existingStaff) {
        return "⚠️ Duplicate Entry\n\nThis phone number is already registered in your staff list.\n\nPlease use a different number or type 0 for the main menu"
      }

      userState.staff.phone_number = phoneValidation.normalized!
      userState.step = "staff_add_cnic"
      userStates.set(phoneNumber, userState)
      return `Perfect! Now, please enter the CNIC number:\n\nYou can enter it with or without dashes:\n• 12345-1234567-1\n• 1234512345671\n\nType 'B' or 'back' to go back`
    }

    if (userState.step === "staff_add_cnic") {
      const cnicValidation = validateCNIC(message)
      if (!cnicValidation.valid) {
        return cnicValidation.error!
      }

      userState.staff.cnic = cnicValidation.normalized!
      userState.step = "staff_add_role_select"
      userStates.set(phoneNumber, userState)
      return `👔 Select Staff Role\n\nPlease choose the role:\n\n1. 🚗 Driver\n2. 👨‍🍳 Cook\n3. 🧹 Maid\n4. 🔧 Plumber\n5. ⚡ Electrician\n6. 🛠️ Maintenance\n7. 🔒 Security Guard\n8. 📋 Other (Specify)\n\nReply with the number (1-8) or type 'B' or 'back' to go back`
    }

    if (userState.step === "staff_add_role_select") {
      const roleChoice = message.trim()
      const roles = ["Driver", "Cook", "Maid", "Plumber", "Electrician", "Maintenance", "Security Guard"]

      if (roleChoice >= "1" && roleChoice <= "7") {
        userState.staff.role = roles[Number.parseInt(roleChoice) - 1]
        return await createStaffMember(profile, userState, phoneNumber)
      } else if (roleChoice === "8") {
        userState.step = "staff_add_role_custom"
        userStates.set(phoneNumber, userState)
        return `📋 Custom Role\n\nPlease specify the role:\n(Only letters and spaces, 3-30 characters)\n\nExample: Gardener, Cleaner, Helper\n\nType your role below:`
      } else {
        return "❓ That's not a valid option. Please choose a number from 1-8.\n\nType 'B' or 'back' to go back"
      }
    }

    if (userState.step === "staff_add_role_custom") {
      const roleValidation = validateRole(message)
      if (!roleValidation.valid) {
        return roleValidation.error!
      }

      userState.staff.role = message.trim()
      return await createStaffMember(profile, userState, phoneNumber)
    }

    // Delete staff flow
    if (userState.step === "staff_delete_list") {
      const staffIndex = Number.parseInt(choice)
      if (isNaN(staffIndex) || staffIndex < 1 || staffIndex > userState.staffList.length) {
        return `❓ That's not a valid selection.\n\nPlease choose a number from 1-${userState.staffList.length}\n\nType 0 for the main menu`
      }

      const selectedStaff = userState.staffList[staffIndex - 1]
      userState.selectedStaff = selectedStaff
      userState.step = "staff_delete_confirm"
      userStates.set(phoneNumber, userState)

      return `⚠️ Are you sure you want to delete this staff member?

👤 Name: ${selectedStaff.name}
🆔 CNIC: ${selectedStaff.cnic}
📱 Phone: ${selectedStaff.phone_number}

Reply with:\n1 - Yes, delete\n2 - No, cancel`
    }

    if (userState.step === "staff_delete_confirm") {
      if (isYesResponse(message)) {
        const { error } = await supabase
          .from("staff")
          .delete()
          .eq("id", userState.selectedStaff.id)

        if (error) {
          console.error("Staff deletion error:", error)
          return "❌ I'm sorry, I couldn't delete the staff member right now. Please try again.\n\nType 0 for the main menu"
        }

        userStates.delete(phoneNumber)
        return `✅ Done! I've removed ${userState.selectedStaff.name} from your staff list.\n\nType 0 to return to the main menu`
      } else if (isNoResponse(message)) {
        userStates.delete(phoneNumber)
        return "Deletion cancelled. Your staff list remains unchanged.\n\nType 0 to return to the main menu"
      } else {
        return "❓ Invalid Response\n\nPlease reply with:\n1 - Yes\n2 - No"
      }
    }

    // Edit staff flow
    if (userState.step === "staff_edit_list") {
      const staffIndex = Number.parseInt(choice)
      if (isNaN(staffIndex) || staffIndex < 1 || staffIndex > userState.staffList.length) {
        return `❓ That's not a valid selection.\n\nPlease choose a number from 1-${userState.staffList.length}\n\nType 0 for the main menu`
      }

      const selectedStaff = userState.staffList[staffIndex - 1]
      userState.selectedStaff = selectedStaff
      userState.step = "staff_edit_field"
      userStates.set(phoneNumber, userState)

      return `✏️ Editing: ${selectedStaff.name}

What would you like to update?

1. 👤 Name
2. 🆔 CNIC
3. 📱 Phone Number

Reply with the number (1-3)`
    }

    if (userState.step === "staff_edit_field") {
      if (choice === "1") {
        userState.editField = "name"
        userState.step = "staff_edit_value"
        userStates.set(phoneNumber, userState)
        return `Please enter the new name for ${userState.selectedStaff.name}:`
      } else if (choice === "2") {
        userState.editField = "cnic"
        userState.step = "staff_edit_value"
        userStates.set(phoneNumber, userState)
        return `Please enter the new CNIC (13 digits):\n\nExample: 1234567890123`
      } else if (choice === "3") {
        userState.editField = "phone_number"
        userState.step = "staff_edit_value"
        userStates.set(phoneNumber, userState)
        return `Please enter the new phone number:\n\nExample: 03001234567`
      } else {
        return "❓ That's not a valid option. Please choose 1, 2, or 3."
      }
    }

    if (userState.step === "staff_edit_value") {
      let newValue = message.trim()
      let fieldName = ""

      // Validate based on field type
      if (userState.editField === "cnic") {
        newValue = newValue.replace(/[-\s]/g, "")
        if (!/^\d{13}$/.test(newValue)) {
          return "❌ Invalid CNIC format. Please enter exactly 13 digits.\n\nExample: 1234567890123"
        }
        fieldName = "CNIC"
      } else if (userState.editField === "phone_number") {
        newValue = newValue.replace(/[-\s]/g, "")
        if (!/^03\d{9}$/.test(newValue)) {
          return "❌ Invalid phone number format. Please enter a valid Pakistani mobile number.\n\nExample: 03001234567"
        }
        fieldName = "Phone Number"
      } else {
        fieldName = "Name"
      }

      // Update in database
      const { error } = await supabase
        .from("staff")
        .update({ [userState.editField]: newValue, updated_at: getPakistanISOString() })
        .eq("id", userState.selectedStaff.id)

      if (error) {
        console.error("Staff update error:", error)
        return "❌ I'm sorry, I couldn't update the staff member right now. Please try again.\n\nType 0 for the main menu"
      }

      userStates.delete(phoneNumber)
      return `✅ Perfect! I've updated the ${fieldName} for ${userState.selectedStaff.name}.

Type 0 to return to the main menu`
    }

    return "❌ Oops! Something went wrong. Type 0 to return to the main menu."
  } catch (error) {
    console.error("Staff flow error:", error)
    return "❌ I'm sorry, I had trouble processing your request.\n\nPlease try again or type 0 for the main menu"
  }
}

async function viewStaffList(profile: any, phoneNumber: string) {
  try {
    const { data: staffList, error } = await supabase
      .from("staff")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Staff fetch error:", error)
      return "❌ I'm sorry, I had trouble fetching your staff list.\n\nType 0 for the main menu"
    }

    if (!staffList || staffList.length === 0) {
      return "📋 You don't have any staff members registered yet.\n\nYou can add a new staff member from the Staff Management menu.\n\nType 0 to return to the main menu"
    }

    let response = `👀 Your Staff Members:\n\n`
    staffList.forEach((staff, index) => {
      response += `${index + 1}. 👤 ${staff.name}\n   💼 Role: ${staff.role || 'Not specified'}\n   🆔 CNIC: ${staff.cnic}\n   📱 Phone: ${staff.phone_number}\n\n`
    })

    response += `Type 0 to return to the main menu`

    userStates.delete(phoneNumber)
    return response
  } catch (error) {
    console.error("View staff error:", error)
    return "❌ I'm sorry, I had trouble fetching your staff list.\n\nType 0 for the main menu"
  }
}

async function initializeDeleteStaff(profile: any, phoneNumber: string) {
  try {
    const { data: staffList, error } = await supabase
      .from("staff")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Staff fetch error:", error)
      return "❌ I'm sorry, I had trouble fetching your staff list.\n\nType 0 for the main menu"
    }

    if (!staffList || staffList.length === 0) {
      return "📋 You don't have any staff members to delete.\n\nType 0 to return to the main menu"
    }

    userStates.set(phoneNumber, {
      step: "staff_delete_list",
      type: "staff",
      staffList: staffList,
    })

    let response = `🗑️ Select a staff member to delete:\n\n`
    staffList.forEach((staff, index) => {
      response += `${index + 1}. ${staff.name} (${staff.phone_number})\n`
    })

    response += `\nReply with the number or type 0 for the main menu`
    return response
  } catch (error) {
    console.error("Initialize delete staff error:", error)
    return "❌ I'm sorry, I had trouble fetching your staff list.\n\nType 0 for the main menu"
  }
}

async function initializeEditStaff(profile: any, phoneNumber: string) {
  try {
    const { data: staffList, error } = await supabase
      .from("staff")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Staff fetch error:", error)
      return "❌ I'm sorry, I had trouble fetching your staff list.\n\nType 0 for the main menu"
    }

    if (!staffList || staffList.length === 0) {
      return "📋 You don't have any staff members to edit.\n\nType 0 to return to the main menu"
    }

    userStates.set(phoneNumber, {
      step: "staff_edit_list",
      type: "staff",
      staffList: staffList,
    })

    let response = `✏️ Select a staff member to edit:\n\n`
    staffList.forEach((staff, index) => {
      response += `${index + 1}. ${staff.name} (${staff.phone_number})\n`
    })

    response += `\nReply with the number or type 0 for the main menu`
    return response
  } catch (error) {
    console.error("Initialize edit staff error:", error)
    return "❌ I'm sorry, I had trouble fetching your staff list.\n\nType 0 for the main menu"
  }
}

function generateTimeSlots(settings: any, existingBookings: any[]) {
  const slots = []
  const startHour = Number.parseInt(settings.start_time.split(":")[0])
  const endHour = Number.parseInt(settings.end_time.split(":")[0])
  const durationHours = Math.floor(settings.slot_duration_minutes / 60)

  for (let hour = startHour; hour < endHour; hour += durationHours) {
    const nextHour = hour + durationHours
    if (nextHour > endHour) break

    const startTime = `${hour.toString().padStart(2, "0")}:00:00`
    const endTime = `${nextHour.toString().padStart(2, "0")}:00:00`

    // Check if this slot is booked (only show available slots)
    const isBooked = existingBookings.some(
      (booking) => booking.start_time === startTime && booking.end_time === endTime,
    )

    // Only add available slots to the list
    if (!isBooked) {
      slots.push({
        start_time: startTime,
        end_time: endTime,
        is_available: true,
        display: `${formatTimeDisplay(hour)} - ${formatTimeDisplay(nextHour)}`,
      })
    }
  }

  return slots
}

async function handleHallFlow(message: string, profile: any, phoneNumber: string, userState: any) {
  const choice = message.trim()

  try {
    // Hall submenu
    if (userState.step === "hall_menu") {
      switch (choice) {
        case "1": // New Booking
          userStates.set(phoneNumber, { step: "booking_date", type: "booking" })
          return "🏛️ Great! Let me help you book the community hall.\n\n📅 Please enter the date you'd like to book.\n\nType 0 to return to the main menu"

        case "2": // Cancel Booking
          return await initializeHallCancelFlow(profile, phoneNumber)

        case "3": // Edit Booking
          return await initializeHallEditFlow(profile, phoneNumber)

        case "4": // View My Bookings
          return await viewMyBookings(profile, phoneNumber)

        default:
          return `❓ I didn't understand that option.\n\n🏛️ Community Hall Management\n\nWhat would you like to do?\n\n1. 🆕 New Booking\n2. ❌ Cancel Booking\n3. ✏️ Edit Booking\n4. 📜 View My Bookings\n\nReply with the number (1-4) or type 0 for the main menu`
      }
    }

    // Handle booking cancellation
    if (userState.step === "hall_cancel_select") {
      const selectedIndex = Number.parseInt(choice)
      if (isNaN(selectedIndex) || selectedIndex < 1 || selectedIndex > userState.bookingList.length) {
        return `❓ That's not a valid selection.\n\nPlease choose a number from 1-${userState.bookingList.length}\n\nType 0 for the main menu`
      }

      const selectedBooking = userState.bookingList[selectedIndex - 1]
      userState.step = "hall_cancel_confirm"
      userState.booking = selectedBooking
      userStates.set(phoneNumber, userState)

      return `⚠️ Are you sure you want to cancel this booking?

📅 Date: ${formatDate(selectedBooking.booking_date)}
⏰ Time: ${formatTime(selectedBooking.start_time)} - ${formatTime(selectedBooking.end_time)}
💰 Amount: Rs. ${selectedBooking.booking_charges}
📊 Status: ${selectedBooking.status.toUpperCase()}

Reply with:\n1 - Yes, cancel it\n2 - No, keep it`
    }

    if (userState.step === "hall_cancel_confirm") {
      if (isYesResponse(choice)) {
        const { error } = await supabase
          .from("bookings")
          .update({ status: "cancelled", updated_at: getPakistanISOString() })
          .eq("id", userState.booking.id)

        if (error) {
          console.error("Booking cancellation error:", error)
          return "❌ I'm sorry, I couldn't cancel your booking right now.\n\nPlease try again or type 0 for the main menu"
        }

        userStates.delete(phoneNumber)
        return `✅ Done! I've cancelled your booking for ${formatDate(userState.booking.booking_date)}.\n\nType 0 to return to the main menu`
      } else if (isNoResponse(choice)) {
        userStates.delete(phoneNumber)
        return getMainMenu(profile.name)
      } else {
        return "❓ Invalid Response\n\nPlease reply with:\n1 - Yes\n2 - No"
      }
    }

    // Handle booking edit
    if (userState.step === "hall_edit_select") {
      const selectedIndex = Number.parseInt(choice)
      if (isNaN(selectedIndex) || selectedIndex < 1 || selectedIndex > userState.bookingList.length) {
        return `❓ That's not a valid selection.\n\nPlease choose a number from 1-${userState.bookingList.length}\n\nType 0 for the main menu`
      }

      const selectedBooking = userState.bookingList[selectedIndex - 1]
      userState.step = "hall_edit_choice"
      userState.booking = selectedBooking
      userStates.set(phoneNumber, userState)

      return `✏️ Edit Booking

Current Details:
📅 Date: ${formatDate(selectedBooking.booking_date)}
⏰ Time: Full Day (9:00 AM - 9:00 PM)

You can only change the date of your booking.

1. 📅 Change Date

Reply with 1 to change the date or type 0 for the main menu`
    }

    if (userState.step === "hall_edit_choice") {
      if (choice === "1") {
        userState.step = "hall_edit_date"
        userStates.set(phoneNumber, userState)
        return "📅 Please enter the new date you'd like to book:\n\n• DD-MM-YYYY (e.g., 25-12-2025)\n• Natural language (e.g., \"1st December\")\n• Shortcuts (e.g., \"today\", \"tomorrow\")\n\nType 0 to return to the main menu"
      } else {
        return "❓ Please reply with 1 to change the date\n\nType 0 for the main menu"
      }
    }

    if (userState.step === "hall_edit_date") {
      const parsedDate = parseDate(choice)
      if (!parsedDate) {
        return "❌ I couldn't understand that date format.\n\nPlease try again using DD-MM-YYYY (e.g., 25-12-2025)\n\nType 0 for the main menu"
      }

      const settings = await getCachedSettings()
      if (!isWorkingDay(parsedDate, settings.working_days)) {
        return `❌ Sorry, the community hall is closed on ${getDayName(parsedDate)}s.\n\nPlease choose a different date or type 0 for the main menu`
      }

      // Check if new date is already booked (excluding current booking)
      const { data: existingBookings } = await supabase
        .from("bookings")
        .select("id")
        .eq("booking_date", parsedDate)
        .in("status", ["confirmed", "payment_pending"])
        .neq("id", userState.booking.id)

      if (existingBookings && existingBookings.length > 0) {
        return `❌ Date Already Booked\n\nSorry, the community hall is already booked for ${formatDate(parsedDate)}.\n\nPlease choose a different date or type 0 for the main menu`
      }

      // Update booking with new date
      const { error } = await supabase
        .from("bookings")
        .update({
          booking_date: parsedDate,
          updated_at: getPakistanISOString()
        })
        .eq("id", userState.booking.id)

      if (error) {
        console.error("Booking update error:", error)
        return "❌ I'm sorry, I couldn't update your booking right now.\n\nPlease try again or type 0 for the main menu"
      }

      userStates.delete(phoneNumber)
      return `✅ Perfect! I've updated your booking to ${formatDate(parsedDate)}.\n\nType 0 to return to the main menu`
    }


    return "❓ I didn't understand that.\n\nType 0 to return to the main menu"
  } catch (error) {
    console.error("Hall flow error:", error)
    return "❌ I'm sorry, I had trouble processing your request.\n\nType 0 to return to the main menu"
  }
}

async function initializeHallCancelFlow(profile: any, phoneNumber: string) {
  try {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("profile_id", profile.id)
      .in("status", ["confirmed", "payment_pending"])
      .gte("booking_date", new Date().toISOString().split('T')[0])
      .order("booking_date", { ascending: true })

    if (!bookings || bookings.length === 0) {
      return `❌ Cancel Booking

You don't have any upcoming bookings to cancel.

Type 0 to return to the main menu`
    }

    userStates.set(phoneNumber, {
      step: "hall_cancel_select",
      type: "hall",
      bookingList: bookings,
    })

    let response = `❌ Cancel Booking

Select the booking you want to cancel:\n\n`

    bookings.forEach((booking, index) => {
      response += `${index + 1}. 📅 ${formatDate(booking.booking_date)}\n`
      response += `   ⏰ ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}\n`
      response += `   💰 Rs. ${booking.booking_charges}\n\n`
    })

    response += `Reply with the number (1-${bookings.length}) or type 0 for the main menu`
    return response
  } catch (error) {
    console.error("Error fetching bookings:", error)
    return "❌ I had trouble fetching your bookings.\n\nType 0 to return to the main menu"
  }
}

async function initializeHallEditFlow(profile: any, phoneNumber: string) {
  try {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("profile_id", profile.id)
      .in("status", ["confirmed", "payment_pending"])
      .gte("booking_date", new Date().toISOString().split('T')[0])
      .order("booking_date", { ascending: true })

    if (!bookings || bookings.length === 0) {
      return `✏️ Edit Booking

You don't have any upcoming bookings to edit.

Type 0 to return to the main menu`
    }

    userStates.set(phoneNumber, {
      step: "hall_edit_select",
      type: "hall",
      bookingList: bookings,
    })

    let response = `✏️ Edit Booking

Select the booking you want to edit:\n\n`

    bookings.forEach((booking, index) => {
      response += `${index + 1}. 📅 ${formatDate(booking.booking_date)}\n`
      response += `   ⏰ ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}\n`
      response += `   💰 Rs. ${booking.booking_charges}\n\n`
    })

    response += `Reply with the number (1-${bookings.length}) or type 0 for the main menu`
    return response
  } catch (error) {
    console.error("Error fetching bookings:", error)
    return "❌ I had trouble fetching your bookings.\n\nType 0 to return to the main menu"
  }
}

async function viewMyBookings(profile: any, phoneNumber: string) {
  try {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("profile_id", profile.id)
      .order("booking_date", { ascending: false })
      .limit(20)

    if (!bookings || bookings.length === 0) {
      return `📜 My Bookings

You don't have any bookings yet.

Type 0 to return to the main menu`
    }

    const upcoming = bookings.filter(b => b.booking_date >= new Date().toISOString().split('T')[0] && b.status !== 'cancelled')
    const past = bookings.filter(b => b.booking_date < new Date().toISOString().split('T')[0] || b.status === 'cancelled')

    let response = `📜 My Bookings\n\n`

    if (upcoming.length > 0) {
      response += `🔜 Upcoming Bookings:\n\n`
      upcoming.forEach((booking) => {
        const statusEmoji = booking.payment_status === 'paid' ? '✅' : '⏳'
        response += `${statusEmoji} ${formatDate(booking.booking_date)}\n`
        response += `   ⏰ ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}\n`
        response += `   💰 Rs. ${booking.booking_charges} (${booking.payment_status})\n\n`
      })
    }

    if (past.length > 0) {
      response += `📋 Past Bookings:\n\n`
      past.slice(0, 5).forEach((booking) => {
        const statusEmoji = booking.status === 'cancelled' ? '❌' : '✅'
        response += `${statusEmoji} ${formatDate(booking.booking_date)}\n`
        response += `   ⏰ ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}\n`
        response += `   Status: ${booking.status}\n\n`
      })
    }

    response += `Type 0 to return to the main menu`
    return response
  } catch (error) {
    console.error("Error fetching bookings:", error)
    return "❌ I had trouble fetching your bookings.\n\nType 0 to return to the main menu"
  }
}

async function showAvailableSlots(date: string, phoneNumber: string, userState: any) {
  try {
    const settings = await getCachedSettings()
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("start_time, end_time")
      .eq("booking_date", date)
      .in("status", ["confirmed", "payment_pending"])

    const slots = generateTimeSlots(settings, existingBookings || [])

    if (slots.length === 0) {
      return `❌ Sorry, there are no available time slots for ${formatDate(date)}.\n\nPlease choose a different date or type 0 for the main menu`
    }

    userState.slots = slots
    userStates.set(phoneNumber, userState)

    let response = `⏰ Available Time Slots for ${formatDate(date)}:\n\n`
    slots.forEach((slot: any, index: number) => {
      response += `${index + 1}. ${slot.display}\n`
    })
    response += `\nReply with the number (1-${slots.length}) or type 0 for the main menu`

    return response
  } catch (error) {
    console.error("Error fetching slots:", error)
    return "❌ I had trouble fetching available slots.\n\nType 0 to return to the main menu"
  }
}

// Validation helper functions for staff management
function validateName(name: string): { valid: boolean; error?: string } {
  const trimmedName = name.trim()

  if (!trimmedName) {
    return { valid: false, error: "❌ Empty Input\n\nPlease enter a valid name.\n\nType 0 to return to the main menu" }
  }

  if (trimmedName.length < 3) {
    return { valid: false, error: "❌ Name Too Short\n\nName must be at least 3 characters long.\n\nPlease try again or type 0 for the main menu" }
  }

  if (trimmedName.length > 50) {
    return { valid: false, error: "❌ Name Too Long\n\nName must not exceed 50 characters.\n\nPlease try again or type 0 for the main menu" }
  }

  // Allow letters, spaces, apostrophes, and hyphens
  if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) {
    return { valid: false, error: "❌ Invalid Name Format\n\nNames should only contain letters and spaces.\nMinimum 3 characters, maximum 50 characters.\n\nPlease try again or type 0 for the main menu" }
  }

  return { valid: true }
}

function validatePhoneNumber(phone: string): { valid: boolean; normalized?: string; error?: string } {
  // Remove all spaces, dashes, and special characters
  const cleaned = phone.replace(/[\s\-()]/g, "")

  if (!cleaned) {
    return { valid: false, error: "❌ Empty Input\n\nPlease enter a valid phone number.\n\nType 0 to return to the main menu" }
  }

  // Check if it contains only numbers (and possibly + at start)
  if (!/^[\+]?\d+$/.test(cleaned)) {
    return { valid: false, error: "❌ Invalid Phone Number\n\nPhone number should only contain numbers.\n\nPlease enter a valid Pakistani phone number:\n• Format: 03XXXXXXXXX (11 digits)\n• Or: +923XXXXXXXXX (13 characters)\n\nExample: 03001234567\n\nPlease try again or type 0 for the main menu" }
  }

  // Normalize to +92 format
  let normalized = cleaned

  if (cleaned.startsWith("03") && cleaned.length === 11) {
    // Convert 03XXXXXXXXX to +923XXXXXXXXX
    normalized = "+92" + cleaned.substring(1)
  } else if (cleaned.startsWith("+92") && cleaned.length === 13) {
    // Already in correct format
    normalized = cleaned
  } else if (cleaned.startsWith("92") && cleaned.length === 12) {
    // Convert 92XXXXXXXXXX to +92XXXXXXXXXX
    normalized = "+" + cleaned
  } else {
    return { valid: false, error: "❌ Invalid Phone Number\n\nPlease enter a valid Pakistani phone number:\n• Format: 03XXXXXXXXX (11 digits)\n• Or: +923XXXXXXXXX (13 characters)\n\nExample: 03001234567\n\nPlease try again or type 0 for the main menu" }
  }

  return { valid: true, normalized }
}

function validateCNIC(cnic: string): { valid: boolean; normalized?: string; error?: string } {
  // Remove all dashes, spaces, and special characters
  const cleaned = cnic.replace(/[\s\-]/g, "")

  if (!cleaned) {
    return { valid: false, error: "❌ Empty Input\n\nPlease enter a valid CNIC.\n\nType 0 to return to the main menu" }
  }

  // Check if it contains only numbers
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, error: "❌ Invalid CNIC Format\n\nCNIC should only contain numbers.\n\nPlease try again or type 0 for the main menu" }
  }

  // Check if exactly 13 digits
  if (cleaned.length !== 13) {
    return { valid: false, error: "❌ Invalid CNIC\n\nCNIC must be exactly 13 digits.\nYou can enter it with or without dashes.\n\nExamples:\n• 12345-1234567-1\n• 1234512345671\n\nPlease try again or type 0 for the main menu" }
  }

  return { valid: true, normalized: cleaned }
}

function validateRole(role: string): { valid: boolean; error?: string } {
  const trimmedRole = role.trim()

  if (!trimmedRole) {
    return { valid: false, error: "❌ Empty Input\n\nPlease enter a valid role.\n\nType 0 to return to the main menu" }
  }

  if (trimmedRole.length < 3) {
    return { valid: false, error: "❌ Role Too Short\n\nRole must be at least 3 characters long.\n\nPlease try again or type 0 for the main menu" }
  }

  if (trimmedRole.length > 30) {
    return { valid: false, error: "❌ Role Too Long\n\nRole must not exceed 30 characters.\n\nPlease try again or type 0 for the main menu" }
  }

  // Allow only letters and spaces
  if (!/^[a-zA-Z\s]+$/.test(trimmedRole)) {
    return { valid: false, error: "❌ Invalid Role Format\n\nRole should only contain letters and spaces.\nNo numbers or special characters allowed.\n\nExamples: Gardener, Cleaner, Helper\n\nPlease try again or type 0 for the main menu" }
  }

  return { valid: true }
}

function formatTimeDisplay(hour: number) {
  if (hour === 0) return "12:00 AM"
  if (hour < 12) return `${hour}:00 AM`
  if (hour === 12) return "12:00 PM"
  return `${hour - 12}:00 PM`
}

function formatTime(timeString: string) {
  const [hours, minutes] = timeString.split(":")
  const hour = Number.parseInt(hours)
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${ampm}`
}

function formatDate(dateString: string) {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Karachi"
  })
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Karachi"
  })
}

// Send notification when new complaint is created
async function sendNewComplaintNotification(complaint: any, profile: any) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://com3-bms.vercel.app"

    // Format category and subcategory
    const categoryText = complaint.category === "apartment" ? "Apartment Complaint" : "Building Complaint"
    const subcategoryText = complaint.subcategory
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    // Format date and time
    const registeredAt = new Date(complaint.created_at)
    const formattedDate = registeredAt.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Karachi'
    })
    const formattedTime = registeredAt.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Karachi'
    })

    // Sanitize description for template (remove newlines, limit length)
    const sanitizedDescription = (complaint.description || "No description provided")
      .replace(/\n/g, " ") // Replace newlines with spaces
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .trim()
      .substring(0, 500) // Limit to 500 characters

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
      "9": `${baseUrl}/admin`
    }

    // Only send if template SID is configured
    if (!NEW_COMPLAINT_TEMPLATE_SID) {
      console.warn("[NEW COMPLAINT] Template SID not configured, skipping notifications")
      return
    }

    // Send to all notification recipients
    for (const recipient of COMPLAINT_NOTIFICATION_NUMBERS) {
      try {
        await sendWhatsAppTemplate(recipient, NEW_COMPLAINT_TEMPLATE_SID, templateVariables)
        console.log(`[NEW COMPLAINT] Notification sent to ${recipient} for ${complaint.complaint_id}`)
      } catch (error) {
        console.error(`[NEW COMPLAINT] Failed to send to ${recipient}:`, error)
      }
    }
  } catch (error) {
    console.error("[NEW COMPLAINT] Notification error:", error)
    // Don't throw - we don't want to fail complaint creation if notification fails
  }
}

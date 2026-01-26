/**
 * WhatsApp Webhook Route
 * Handles incoming WhatsApp messages via Twilio
 *
 * This route has been refactored to use the modular webhook system.
 * All conversation logic is now in lib/webhook/
 */

import type { NextRequest } from "next/server"
import { sendWhatsAppMessage } from "@/lib/twilio"
import {
  processMessage,
  getProfile,
  createXmlResponse,
} from "@/lib/webhook"

export async function POST(request: NextRequest) {
  try {
    console.log("=== WEBHOOK CALLED ===")

    const body = await request.formData()
    const from = body.get("From") as string
    const messageBody = body.get("Body") as string
    const numMedia = body.get("NumMedia") as string

    const phoneNumber = from.replace("whatsapp:", "")
    console.log("[Webhook] From:", phoneNumber)
    console.log("[Webhook] Body:", messageBody)

    // Check for media messages (images, voice notes, videos, documents, etc.)
    if (numMedia && parseInt(numMedia) > 0) {
      const errorMessage = `❌ Unsupported Message Type

I can only process text messages at the moment.

Please send your message as text, or type 0 to return to the main menu.`

      try {
        await sendWhatsAppMessage(phoneNumber, errorMessage)
      } catch (sendError) {
        console.error("[Webhook] Error sending media error message:", sendError)
      }

      return createXmlResponse()
    }

    // Check if message body is empty
    if (!messageBody || messageBody.trim() === "") {
      const errorMessage = `❌ Empty Message

Please send a text message, or type 0 to return to the main menu.`

      try {
        await sendWhatsAppMessage(phoneNumber, errorMessage)
      } catch (sendError) {
        console.error("[Webhook] Error sending empty message error:", sendError)
      }

      return createXmlResponse()
    }

    // Check if user is registered and active
    const profile = await getProfile(phoneNumber)

    if (!profile) {
      return createXmlResponse(`Hello, this is Manzhil by Scrift.

❌ This number is not registered in the system. Please contact the administration to register for access to services.

📞 Admin Contact: [Contact Admin]`)
    }

    if (!profile.is_active) {
      return createXmlResponse(`⚠️ Your account is currently inactive.

Please contact the administration if you believe this is an error.

📞 Admin Contact: [Contact Admin]`)
    }

    // Process the message through the router
    const response = await processMessage(messageBody, profile, phoneNumber)

    // If response is empty (template was sent), return empty XML
    if (!response) {
      return createXmlResponse()
    }

    // Send response via WhatsApp
    try {
      await sendWhatsAppMessage(phoneNumber, response)
    } catch (sendError) {
      console.error("[Webhook] Error sending response:", sendError)
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

    // Build fallback message based on subcategory type
    const fallbackMessage = userState.complaint.subcategory === "other"
      ? `✅ Your complaint has been registered and forwarded to the maintenance team.

🎫 Complaint ID: ${complaintData.complaint_id}
📋 Category: ${categoryText.charAt(0).toUpperCase() + categoryText.slice(1)} - ${subcategoryText}
📅 Registered: ${formattedDateTime}

The management team has been notified and will address this matter promptly.

Type 0 to return to the main menu`
      : `✅ Your complaint about the ${subcategoryText.toLowerCase()} issue in your ${categoryText} has been registered.

🎫 Complaint ID: ${complaintData.complaint_id}
📅 Registered: ${formattedDateTime}

The maintenance team has been notified and will resolve this as soon as possible.

Type 0 to return to the main menu`

    // Send confirmation to resident using template with fallback
    if (COMPLAINT_REGISTERED_TEMPLATE_SID) {
      const result = await sendWhatsAppTemplate(phoneNumber, COMPLAINT_REGISTERED_TEMPLATE_SID, {
        "1": profile.name || "Resident",
        "2": complaintData.complaint_id,
        "3": categoryText.charAt(0).toUpperCase() + categoryText.slice(1),
        "4": subcategoryText,
        "5": finalDescription || "No description provided",
        "6": formattedDateTime,
      }, fallbackMessage)

      // Return empty string since message was sent via API (either template or fallback)
      return ""
    }

    // No template SID configured, return fallback for TwiML response
    return fallbackMessage
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

    return createXmlResponse()
  } catch (error) {
    console.error("[Webhook] Unexpected error:", error)
    return createXmlResponse(`❌ An error occurred. Please try again or type 0 for the main menu.`)
  }
}

export async function GET() {
  return new Response("WhatsApp Webhook - Use POST", { status: 200 })
}

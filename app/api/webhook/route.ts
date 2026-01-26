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
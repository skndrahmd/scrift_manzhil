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
      const errorMessage = `❌ *Unsupported Message*

I can only process text messages. Please send text or type *0* for menu.`

      try {
        await sendWhatsAppMessage(phoneNumber, errorMessage)
      } catch (sendError) {
        console.error("[Webhook] Error sending media error message:", sendError)
      }

      return createXmlResponse()
    }

    // Check if message body is empty
    if (!messageBody || messageBody.trim() === "") {
      const errorMessage = `❌ *Empty Message*

Please send a text message, or type *0* for menu.`

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
      return createXmlResponse(`👋 Hello! This is Manzhil.

❌ This number is not registered. Please contact administration to register.

📞 Contact Admin`)
    }

    if (!profile.is_active) {
      return createXmlResponse(`⚠️ *Account Inactive*

Please contact administration if this is an error.

📞 Contact Admin`)
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
    return createXmlResponse(`❌ An error occurred. Try again or type *0* for menu.`)
  }
}

export async function GET() {
  return new Response("WhatsApp Webhook - Use POST", { status: 200 })
}
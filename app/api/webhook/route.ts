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
import { getMessage } from "@/lib/webhook/messages"
import { MSG } from "@/lib/webhook/message-keys"
import { recordInboundMessage } from "@/lib/twilio/session-tracker"

export async function POST(request: NextRequest) {
  try {
    console.log("=== WEBHOOK CALLED ===")

    const body = await request.formData()
    const from = body.get("From") as string
    const messageBody = body.get("Body") as string
    const numMedia = body.get("NumMedia") as string

    // Extract media info if present
    const mediaUrl = body.get("MediaUrl0") as string | null
    const mediaContentType = body.get("MediaContentType0") as string | null

    const phoneNumber = from.replace("whatsapp:", "")
    console.log("[Webhook] From:", phoneNumber)
    console.log("[Webhook] Body:", messageBody)
    console.log("[Webhook] NumMedia:", numMedia)
    console.log("[Webhook] MediaUrl:", mediaUrl)

    // Record inbound message for session window tracking (cost optimization)
    recordInboundMessage(phoneNumber)

    // Check if user is registered and active first
    const profile = await getProfile(phoneNumber)

    if (!profile) {
      const msg = await getMessage(MSG.WELCOME_UNREGISTERED)
      return createXmlResponse(msg)
    }

    if (!profile.is_active) {
      const msg = await getMessage(MSG.ACCOUNT_INACTIVE)
      return createXmlResponse(msg)
    }

    // Handle media messages
    if (numMedia && parseInt(numMedia) > 0 && mediaUrl) {
      // Check if it's an image
      if (mediaContentType && mediaContentType.startsWith("image/")) {
        // Pass media info to handler for visitor flow
        const mediaInfo = {
          url: mediaUrl,
          contentType: mediaContentType,
        }

        const response = await processMessage(
          messageBody || "",
          profile,
          phoneNumber,
          mediaInfo
        )

        if (!response) {
          return createXmlResponse()
        }

        try {
          await sendWhatsAppMessage(phoneNumber, response)
        } catch (sendError) {
          console.error("[Webhook] Error sending response:", sendError)
        }

        return createXmlResponse()
      } else {
        // Non-image media (voice notes, videos, documents, etc.)
        const errorMessage = await getMessage(MSG.ERROR_UNSUPPORTED_FILE)

        try {
          await sendWhatsAppMessage(phoneNumber, errorMessage)
        } catch (sendError) {
          console.error("[Webhook] Error sending media error:", sendError)
        }

        return createXmlResponse()
      }
    }

    // Check if message body is empty
    if (!messageBody || messageBody.trim() === "") {
      const errorMessage = await getMessage(MSG.ERROR_EMPTY_MESSAGE)

      try {
        await sendWhatsAppMessage(phoneNumber, errorMessage)
      } catch (sendError) {
        console.error("[Webhook] Error sending empty message error:", sendError)
      }

      return createXmlResponse()
    }

    // Process the message through the router (no media)
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
    const msg = await getMessage(MSG.ERROR_UNEXPECTED)
    return createXmlResponse(msg)
  }
}

export async function GET() {
  return new Response("WhatsApp Webhook - Use POST", { status: 200 })
}

import type { NextRequest } from "next/server"
import twilio from "twilio"

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER
const TWILIO_WELCOME_TEMPLATE_SID = process.env.TWILIO_WELCOME_TEMPLATE_SID

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone_number, apartment_number } = body

    if (!name || !phone_number || !apartment_number) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Format phone number if needed
    const formattedPhone = phone_number.startsWith("+") ? phone_number : `+${phone_number}`

    // Check required Twilio credentials (template SID is optional)
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
      console.error("Missing Twilio credentials", {
        hasSID: !!TWILIO_ACCOUNT_SID,
        hasToken: !!TWILIO_AUTH_TOKEN,
        hasNumber: !!TWILIO_WHATSAPP_NUMBER,
      })
      return new Response(
        JSON.stringify({ error: "Twilio configuration error - missing credentials" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    const from = TWILIO_WHATSAPP_NUMBER.startsWith("whatsapp:")
      ? TWILIO_WHATSAPP_NUMBER
      : `whatsapp:${TWILIO_WHATSAPP_NUMBER}`
    const to = formattedPhone.startsWith("whatsapp:") ? formattedPhone : `whatsapp:${formattedPhone}`

    let message
    let templateSent = false

    // Try to send using template if configured
    if (TWILIO_WELCOME_TEMPLATE_SID) {
      try {
        console.log("Sending template message:", { from, to, name, apartment_number, templateSid: TWILIO_WELCOME_TEMPLATE_SID })

        message = await client.messages.create({
          from,
          to,
          contentSid: TWILIO_WELCOME_TEMPLATE_SID,
          contentVariables: JSON.stringify({
            "1": name,
            "2": apartment_number,
          }),
        })

        templateSent = true
        console.log("✅ Template message sent successfully!")
        console.log("Message SID:", message.sid)
        console.log("Status:", message.status)
      } catch (templateError) {
        console.error("Failed to send template, using fallback:", templateError)
      }
    }

    // Fallback to plain text message if template not sent
    if (!templateSent) {
      console.log("Sending fallback welcome message:", { from, to, name, apartment_number })

      const fallbackMessage = `Hello, this is Manzhil by Scrift.

Welcome ${name}!

Your account has been successfully registered for apartment ${apartment_number}.

You can now access all building management services through this WhatsApp number.

To get started, send any message to see the main menu.

- Manzhil by Scrift Team`

      message = await client.messages.create({
        from,
        to,
        body: fallbackMessage,
      })

      console.log("✅ Fallback welcome message sent successfully!")
      console.log("Message SID:", message.sid)
      console.log("Status:", message.status)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Welcome message sent successfully",
        sid: message.sid,
        usedTemplate: templateSent,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("Welcome message error:", error)
    return new Response(
      JSON.stringify({ error: "Unable to send welcome message" }), 
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
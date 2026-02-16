import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { sendWelcomeMessage, isConfigured } from "@/lib/twilio"
import { verifyAdminAccess } from "@/lib/auth/api-auth"

export async function POST(request: NextRequest) {
  const { authenticated, error: authError } = await verifyAdminAccess("residents")
  if (!authenticated) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

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

    // Check Twilio is configured
    if (!isConfigured()) {
      console.error("Twilio not configured")
      return new Response(
        JSON.stringify({ error: "Twilio configuration error - missing credentials" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    console.log("Sending welcome message:", { name, apartment_number, phone: formattedPhone })

    const result = await sendWelcomeMessage({
      phone: formattedPhone,
      name,
      apartmentNumber: apartment_number,
    })

    if (!result.ok) {
      throw new Error(result.error || "Failed to send welcome message")
    }

    console.log("Welcome message sent successfully:", result.sid)

    return new Response(
      JSON.stringify({
        success: true,
        message: "Welcome message sent successfully",
        sid: result.sid,
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

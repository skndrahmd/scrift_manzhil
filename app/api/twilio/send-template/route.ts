import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { sendTemplate, TEMPLATE_SIDS } from "@/lib/twilio"
import type { TemplateType } from "@/lib/twilio"
import { verifyAdminAccess } from "@/lib/auth/api-auth"

interface SendTemplateRequest {
  to: string
  templateType: TemplateType
  variables: Record<string, string>
}

export async function POST(request: NextRequest) {
  const { authenticated, error: authError } = await verifyAdminAccess("settings")
  if (!authenticated) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    const body = await request.json() as SendTemplateRequest
    const { to, templateType, variables } = body

    if (!to || !templateType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, templateType" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const templateSid = TEMPLATE_SIDS[templateType]

    if (!templateSid) {
      return new Response(
        JSON.stringify({ error: `Template SID not found for type: ${templateType}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Convert variables object to numbered format for Twilio
    const contentVariables: Record<string, string> = {}
    const values = Object.values(variables)
    values.forEach((value, index) => {
      contentVariables[(index + 1).toString()] = value
    })

    console.log(`[TWILIO TEMPLATE] Sending ${templateType} to ${to}`)
    console.log(`[TWILIO TEMPLATE] Variables:`, contentVariables)

    const result = await sendTemplate(to, templateSid, contentVariables)

    if (!result.ok) {
      throw new Error(result.error || "Failed to send template")
    }

    console.log(`[TWILIO TEMPLATE] Message sent successfully:`, result.sid)

    return new Response(
      JSON.stringify({
        success: true,
        messageSid: result.sid,
        templateType,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[TWILIO TEMPLATE] Error:", error)
    return new Response(
      JSON.stringify({
        error: "Failed to send template message",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}

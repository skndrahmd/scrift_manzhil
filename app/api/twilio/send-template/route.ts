import type { NextRequest } from "next/server"
import { sendWhatsAppTemplate } from "@/lib/twilio"

// Template SID mapping
const TEMPLATE_SIDS = {
  // Maintenance
  maintenance_invoice: process.env.TWILIO_MAINTENANCE_INVOICE_TEMPLATE_SID,
  maintenance_payment_reminder: process.env.TWILIO_MAINTENANCE_PAYMENT_REMINDER_TEMPLATE_SID,
  maintenance_payment_confirmed: process.env.TWILIO_MAINTENANCE_PAYMENT_CONFIRMED_TEMPLATE_SID,
  
  // Booking
  booking_payment_confirmed: process.env.TWILIO_BOOKING_PAYMENT_CONFIRMED_TEMPLATE_SID,
  booking_payment_reminder: process.env.TWILIO_BOOKING_PAYMENT_REMINDER_TEMPLATE_SID,
  booking_cancelled: process.env.TWILIO_BOOKING_CANCELLED_TEMPLATE_SID,
  
  // Complaint
  complaint_registered: process.env.TWILIO_COMPLAINT_REGISTERED_TEMPLATE_SID,
  complaint_in_progress: process.env.TWILIO_COMPLAINT_IN_PROGRESS_TEMPLATE_SID,
  complaint_completed: process.env.TWILIO_COMPLAINT_COMPLETED_TEMPLATE_SID,
  complaint_rejected: process.env.TWILIO_COMPLAINT_REJECTED_TEMPLATE_SID,
  
  // General
  welcome_message: process.env.TWILIO_WELCOME_TEMPLATE_SID,
  account_blocked_maintenance: process.env.TWILIO_ACCOUNT_BLOCKED_TEMPLATE_SID,
  account_reactivated: process.env.TWILIO_ACCOUNT_REACTIVATED_TEMPLATE_SID,
}

type TemplateType = keyof typeof TEMPLATE_SIDS

interface SendTemplateRequest {
  to: string
  templateType: TemplateType
  variables: Record<string, string>
}

export async function POST(request: NextRequest) {
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
    // If variables are already numbered (e.g., {name: "John", date: "Dec 1"}), convert to {1: "John", 2: "Dec 1"}
    const contentVariables: Record<string, string> = {}
    const values = Object.values(variables)
    values.forEach((value, index) => {
      contentVariables[(index + 1).toString()] = value
    })

    console.log(`[TWILIO TEMPLATE] Sending ${templateType} to ${to}`)
    console.log(`[TWILIO TEMPLATE] Variables:`, contentVariables)

    const result = await sendWhatsAppTemplate(to, templateSid, contentVariables)

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

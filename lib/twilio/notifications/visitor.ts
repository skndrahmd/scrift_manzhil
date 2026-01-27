/**
 * Visitor Notifications
 * WhatsApp notifications for visitor arrivals
 */

import { sendWithFallback } from "../send"
import { getTemplateSid } from "../templates"
import { formatDate } from "../formatters"
import type { TwilioResult } from "../types"

// Divider constant for consistent styling
const DIVIDER = "───────────────────"

export interface VisitorArrivalParams {
    phone: string
    residentName: string
    apartmentNumber: string
    visitorName: string
    visitorCnic: string
    visitorPhone: string
    visitDate: string
}

/**
 * Send visitor arrival notification to resident
 * Sent when admin marks a visitor as arrived
 */
export async function sendVisitorArrivalNotification(
    params: VisitorArrivalParams
): Promise<TwilioResult> {
    const {
        phone,
        residentName,
        apartmentNumber,
        visitorName,
        visitorCnic,
        visitorPhone,
        visitDate
    } = params

    const formattedDate = formatDate(visitDate)

    const templateSid = getTemplateSid("visitor_arrival")
    const templateVariables = {
        "1": residentName || "Resident",
        "2": visitorName,
        "3": visitorCnic,
        "4": visitorPhone,
    }

    const fallbackMessage = `🔔 *Visitor Arrival Notification*

${DIVIDER}
👤 *Your Visitor Has Arrived*
${DIVIDER}

• Visitor Name: ${visitorName}
• CNIC: ${visitorCnic}
• Phone: ${visitorPhone}
• Visit Date: ${formattedDate}

${DIVIDER}
🏠 *Your Details*
${DIVIDER}

• Name: ${residentName}
• Apartment: ${apartmentNumber}

${DIVIDER}

Hi ${residentName || "Resident"}, your visitor has arrived at the building entrance.

Please proceed to receive your guest or inform the security if any changes are needed.

${DIVIDER}
— Manzhil by Scrift`

    return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

/**
 * Visitor Notifications
 * WhatsApp notifications for visitor arrivals
 */

import { sendWithFallback } from "../send"
import { getTemplateSid } from "../templates"
import { formatDate } from "../formatters"
import type { TwilioResult } from "../types"

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

    const fallbackMessage = `🔔 *Visitor Arrived!*

👤 ${visitorName}
📞 ${visitorPhone}
📅 ${formattedDate}

Hi ${residentName || "Resident"} (${apartmentNumber}), your visitor is at the entrance. Please receive your guest.

— Manzhil`

    return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

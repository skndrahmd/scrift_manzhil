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
        visitDate,
    } = params

    const formattedDate = formatDate(visitDate)

    const templateSid = await getTemplateSid("visitor_arrival")
    const templateVariables = {
        "1": residentName || "Resident",
        "2": apartmentNumber || "N/A",
        "3": formattedDate,
    }

    const fallbackMessage = `Hello, this is Manzhil by Scrift.

Hi ${residentName || "Resident"}, your visitor has arrived at the entrance.

📅 ${formattedDate}

Please receive your guest.

— Manzhil`

    return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

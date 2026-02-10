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
    cnicImageUrl: string | null
    visitDate: string
    entryNumber: number
    carNumber?: string | null
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
        cnicImageUrl,
        visitDate,
        entryNumber,
        carNumber
    } = params

    const formattedDate = formatDate(visitDate)

    const templateSid = getTemplateSid("visitor_arrival")
    const templateVariables = {
        "1": residentName || "Resident",
        "2": apartmentNumber || "N/A",
        "3": formattedDate,
        "4": String(entryNumber),
    }

    const carLine = carNumber ? `\n🚗 Car: ${carNumber}` : ""

    const fallbackMessage = `🔔 *Visitor Arrived!*
🎫 Entry #${entryNumber}

📅 ${formattedDate}${carLine}

Hi ${residentName || "Resident"} (${apartmentNumber}), your visitor is at the entrance.

${cnicImageUrl ? `🪪 CNIC: ${cnicImageUrl}` : ""}

Please receive your guest.

— Manzhil`

    return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

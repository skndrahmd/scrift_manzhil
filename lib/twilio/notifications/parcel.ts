/**
 * Parcel Notifications
 * WhatsApp notifications for parcel/delivery arrivals
 */

import { sendWithFallback } from "../send"
import { getTemplateSid } from "../templates"
import type { TwilioResult } from "../types"

// Divider constant for consistent styling
const DIVIDER = "───────────────────"

export interface ParcelArrivalParams {
    phone: string
    residentName: string
    apartmentNumber: string
    description: string | null
    senderName: string | null
    courierName: string | null
    imageUrl: string
}

/**
 * Send parcel arrival notification to resident
 * Sent when admin registers a new parcel
 */
export async function sendParcelArrivalNotification(
    params: ParcelArrivalParams
): Promise<TwilioResult> {
    const {
        phone,
        residentName,
        apartmentNumber,
        description,
        senderName,
        courierName,
        imageUrl
    } = params

    // Build description line
    const descLine = description ? `• Description: ${description}` : ""
    const senderLine = senderName ? `• From: ${senderName}` : ""
    const courierLine = courierName ? `• Courier: ${courierName}` : ""

    const templateSid = getTemplateSid("parcel_arrival")
    const templateVariables = {
        "1": residentName || "Resident",
        "2": description || "Package",
        "3": imageUrl,
    }

    const fallbackMessage = `📦 *Parcel Arrival Notification*

${DIVIDER}
🎁 *You Have a Delivery!*
${DIVIDER}

${descLine}
${senderLine}
${courierLine}

${DIVIDER}
🏠 *Your Details*
${DIVIDER}

• Name: ${residentName}
• Apartment: ${apartmentNumber}

${DIVIDER}
📸 *View Your Parcel*
${DIVIDER}

${imageUrl}

${DIVIDER}

Hi ${residentName || "Resident"}, a parcel has arrived for you at the building reception.

Please collect it at your earliest convenience.

${DIVIDER}
— Manzhil by Scrift`

    return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

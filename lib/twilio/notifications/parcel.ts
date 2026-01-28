/**
 * Parcel Notifications
 * WhatsApp notifications for parcel/delivery arrivals
 */

import { sendWithFallback } from "../send"
import { getTemplateSid } from "../templates"
import type { TwilioResult } from "../types"

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

    // Build optional details
    const details = [
        description ? `📝 ${description}` : null,
        courierName ? `🚚 ${courierName}` : null,
        senderName ? `📍 From: ${senderName}` : null,
    ].filter(Boolean).join(" | ")

    const templateSid = getTemplateSid("parcel_arrival")
    const templateVariables = {
        "1": residentName || "Resident",
        "2": description || "Package",
        "3": imageUrl,
    }

    const fallbackMessage = `📦 *Parcel Arrived!*

${details || "📝 Package"}

Hi ${residentName || "Resident"} (${apartmentNumber}), your parcel is at reception!

📸 Photo: ${imageUrl}

— Manzhil`

    return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

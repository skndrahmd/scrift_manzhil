/**
 * Visitor Entry Pass Flow Handler
 * 3-step flow: Upload CNIC image → Enter car number (optional) → Enter date → Auto-save
 */

import { supabaseAdmin } from "@/lib/supabase"
import { isDateFormat, parseDate } from "@/lib/dateUtils"
import type { Profile, UserState, VisitorData, MediaInfo } from "../types"
import { setState, clearState } from "../state"
import { formatDate } from "../utils"

/**
 * Initialize visitor registration flow
 */
export function initializeVisitorFlow(phoneNumber: string): string {
    setState(phoneNumber, {
        step: "visitor_cnic_image",
        type: "visitor",
        visitor: {},
    })

    return `🎫 *Visitor Entry Pass*

Send a *photo of visitor's CNIC* 📸

*B* to go back, *0* for menu`
}

/**
 * Handle visitor flow steps
 */
export async function handleVisitorFlow(
    message: string,
    profile: Profile,
    phoneNumber: string,
    userState: UserState,
    mediaInfo?: MediaInfo
): Promise<string> {
    const step = userState.step
    const visitor = userState.visitor || {}

    switch (step) {
        case "visitor_cnic_image":
            return await handleCNICImageUpload(message, phoneNumber, visitor, profile, mediaInfo)

        case "visitor_car_number":
            return handleCarNumberInput(message, phoneNumber, visitor)

        case "visitor_date":
            return await handleDateInputAndSave(message, profile, phoneNumber, visitor)

        default:
            return initializeVisitorFlow(phoneNumber)
    }
}

/**
 * Handle CNIC image upload
 */
async function handleCNICImageUpload(
    message: string,
    phoneNumber: string,
    visitor: VisitorData,
    profile: Profile,
    mediaInfo?: MediaInfo
): Promise<string> {
    // Check if we received an image
    if (!mediaInfo || !mediaInfo.url) {
        return `📸 *Please send an image*

Send a photo of the visitor's CNIC.

*B* to go back, *0* for menu`
    }

    try {
        console.log("[Visitor] Downloading image from Twilio:", mediaInfo.url)

        // Download image from Twilio (requires auth)
        const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN

        const response = await fetch(mediaInfo.url, {
            headers: {
                Authorization: `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64")}`,
            },
        })

        if (!response.ok) {
            console.error("[Visitor] Failed to download image:", response.status)
            return `❌ *Upload Failed*

Please try sending the image again.

*B* to go back, *0* for menu`
        }

        const imageBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(imageBuffer)

        // Generate unique filename
        const timestamp = Date.now()
        const extension = mediaInfo.contentType.split("/")[1] || "jpg"
        const fileName = `${profile.id}/${timestamp}.${extension}`

        console.log("[Visitor] Uploading to Supabase:", fileName)

        // Upload to Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
            .from("visitor-cnics")
            .upload(fileName, buffer, {
                contentType: mediaInfo.contentType,
                upsert: false,
            })

        if (uploadError) {
            console.error("[Visitor] Storage error:", uploadError)
            return `❌ *Upload Failed*

Please try sending the image again.

*B* to go back, *0* for menu`
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from("visitor-cnics")
            .getPublicUrl(fileName)

        const imageUrl = urlData.publicUrl
        console.log("[Visitor] Image uploaded:", imageUrl)

        // Save URL to state and move to car number step
        setState(phoneNumber, {
            step: "visitor_car_number",
            type: "visitor",
            visitor: { ...visitor, cnic_image_url: imageUrl },
        })

        return `✅ *CNIC Image Saved*

🚗 Enter the visitor's *car number* (license plate).

Type *skip* if no vehicle.

*B* to go back, *0* for menu`
    } catch (error) {
        console.error("[Visitor] Image upload error:", error)
        return `❌ *Upload Failed*

Please try sending the image again.

*B* to go back, *0* for menu`
    }
}

/**
 * Handle car number input (optional step)
 */
function handleCarNumberInput(
    message: string,
    phoneNumber: string,
    visitor: VisitorData
): string {
    const input = message.trim()
    const isSkip = input.toLowerCase() === "skip" || input === "-"

    const updatedVisitor = {
        ...visitor,
        car_number: isSkip ? undefined : input,
    }

    setState(phoneNumber, {
        step: "visitor_date",
        type: "visitor",
        visitor: updatedVisitor,
    })

    const carAck = isSkip ? "" : `🚗 Car: ${input}\n`

    return `${carAck}📅 Enter *date of visit*.
Formats: DD-MM-YYYY, "tomorrow", "next Monday"

*B* to go back, *0* for menu`
}

/**
 * Handle date input and auto-save
 */
async function handleDateInputAndSave(
    message: string,
    profile: Profile,
    phoneNumber: string,
    visitor: VisitorData
): Promise<string> {
    if (!isDateFormat(message)) {
        return `❌ *Invalid Date*

Try: DD-MM-YYYY, "tomorrow", "next Monday"

*B* to go back, *0* for menu`
    }

    const parsedDateStr = parseDate(message)
    if (!parsedDateStr) {
        return `❌ *Invalid Date*

Couldn't understand that date. Try again.

*B* to go back, *0* for menu`
    }

    // Convert string to Date for comparison
    const parsedDate = new Date(parsedDateStr)

    // Check if date is in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (parsedDate < today) {
        return `❌ *Invalid Date*

Visit date cannot be in the past.

*B* to go back, *0* for menu`
    }

    // Check if date is too far in the future (30 days)
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 30)
    if (parsedDate > maxDate) {
        return `❌ *Invalid Date*

Visitor passes can only be registered up to 30 days in advance.

*B* to go back, *0* for menu`
    }

    try {
        // Auto-save to database
        const { data, error } = await supabaseAdmin
            .from("visitor_passes")
            .insert({
                resident_id: profile.id,
                cnic_image_url: visitor.cnic_image_url,
                car_number: visitor.car_number || null,
                visit_date: parsedDateStr,
                status: "pending",
                // These fields are now optional
                visitor_name: null,
                visitor_cnic: null,
                visitor_phone: null,
            })
            .select()
            .single()

        if (error) {
            console.error("[Visitor] Error saving visitor pass:", error)
            return `❌ *Registration Failed*

Please try again later.

Reply *0* for menu`
        }

        clearState(phoneNumber)
        const formattedDate = formatDate(parsedDateStr)
        const carLine = visitor.car_number ? `\n🚗 Car: ${visitor.car_number}` : ""

        return `✅ *Visitor Pass Created!*

📸 CNIC: Saved${carLine}
📅 Visit: ${formattedDate}

Security has been notified. You'll receive a message when your visitor arrives.

Reply *0* for menu`
    } catch (error) {
        console.error("[Visitor] Error:", error)
        clearState(phoneNumber)
        return `❌ *Registration Failed*

An unexpected error occurred.

Reply *0* for menu`
    }
}

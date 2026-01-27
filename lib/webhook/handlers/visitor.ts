/**
 * Visitor Entry Pass Flow Handler
 * Handles visitor registration conversation flow
 */

import { supabase } from "@/lib/supabase"
import { isDateFormat, parseDate } from "@/lib/dateUtils"
import type { Profile, UserState, VisitorData } from "../types"
import { setState, clearState } from "../state"
import { formatDate, validateCNIC, validatePhoneNumber, validateName } from "../utils"

// Divider constant for consistent styling
const DIVIDER = "───────────────────"

/**
 * Initialize visitor registration flow
 */
export function initializeVisitorFlow(phoneNumber: string): string {
    setState(phoneNumber, {
        step: "visitor_name",
        type: "visitor",
        visitor: {},
    })

    return `🎫 *Visitor Entry Pass*

${DIVIDER}
📋 *Register Your Visitor*
${DIVIDER}

Please enter your visitor's *full name*.

${DIVIDER}
Type *B* to go back, or *0* for main menu`
}

/**
 * Handle visitor flow steps
 */
export async function handleVisitorFlow(
    message: string,
    profile: Profile,
    phoneNumber: string,
    userState: UserState
): Promise<string> {
    const step = userState.step
    const visitor = userState.visitor || {}

    switch (step) {
        case "visitor_name":
            return handleNameInput(message, phoneNumber, visitor)

        case "visitor_cnic":
            return handleCNICInput(message, phoneNumber, visitor)

        case "visitor_phone":
            return handlePhoneInput(message, phoneNumber, visitor)

        case "visitor_date":
            return handleDateInput(message, phoneNumber, visitor)

        case "visitor_confirm":
            return await handleConfirmation(message, profile, phoneNumber, visitor)

        default:
            return initializeVisitorFlow(phoneNumber)
    }
}

/**
 * Handle visitor name input
 */
function handleNameInput(
    message: string,
    phoneNumber: string,
    visitor: VisitorData
): string {
    const validation = validateName(message)

    if (!validation.valid) {
        return `❌ *Invalid Name*

${DIVIDER}

${validation.error}

Please enter a valid full name (letters and spaces only).

${DIVIDER}
Type *B* to go back, or *0* for main menu`
    }

    setState(phoneNumber, {
        step: "visitor_cnic",
        type: "visitor",
        visitor: { ...visitor, name: validation.normalized },
    })

    return `✅ *Name Recorded*

${DIVIDER}
👤 *Visitor:* ${validation.normalized}
${DIVIDER}

Please enter your visitor's *CNIC number*.

*Format:* 13 digits without dashes
Example: 4210112345678

${DIVIDER}
Type *B* to go back, or *0* for main menu`
}

/**
 * Handle visitor CNIC input
 */
function handleCNICInput(
    message: string,
    phoneNumber: string,
    visitor: VisitorData
): string {
    const validation = validateCNIC(message)

    if (!validation.valid) {
        return `❌ *Invalid CNIC*

${DIVIDER}

${validation.error}

Please enter a valid 13-digit CNIC number.
Example: 4210112345678

${DIVIDER}
Type *B* to go back, or *0* for main menu`
    }

    setState(phoneNumber, {
        step: "visitor_phone",
        type: "visitor",
        visitor: { ...visitor, cnic: validation.normalized },
    })

    return `✅ *CNIC Recorded*

${DIVIDER}
👤 *Visitor:* ${visitor.name}
🪪 *CNIC:* ${validation.normalized}
${DIVIDER}

Please enter your visitor's *phone number*.

*Format:* 03XXXXXXXXX or +923XXXXXXXXX

${DIVIDER}
Type *B* to go back, or *0* for main menu`
}

/**
 * Handle visitor phone input
 */
function handlePhoneInput(
    message: string,
    phoneNumber: string,
    visitor: VisitorData
): string {
    const validation = validatePhoneNumber(message)

    if (!validation.valid) {
        return `❌ *Invalid Phone Number*

${DIVIDER}

${validation.error}

Please enter a valid phone number.
Example: 03001234567

${DIVIDER}
Type *B* to go back, or *0* for main menu`
    }

    setState(phoneNumber, {
        step: "visitor_date",
        type: "visitor",
        visitor: { ...visitor, phone: validation.normalized },
    })

    return `✅ *Phone Recorded*

${DIVIDER}
👤 *Visitor:* ${visitor.name}
🪪 *CNIC:* ${visitor.cnic}
📱 *Phone:* ${validation.normalized}
${DIVIDER}

Please enter the *date of visit*.

*Accepted Formats:*
• DD-MM-YYYY (e.g., 25-01-2026)
• Natural language (e.g., "tomorrow", "next Monday")
• Just the day (e.g., "28")

${DIVIDER}
Type *B* to go back, or *0* for main menu`
}

/**
 * Handle visit date input
 */
function handleDateInput(
    message: string,
    phoneNumber: string,
    visitor: VisitorData
): string {
    if (!isDateFormat(message)) {
        return `❌ *Invalid Date*

${DIVIDER}

Please enter the date in one of these formats:
• DD-MM-YYYY (e.g., 25-01-2026)
• Natural language (e.g., "tomorrow", "next Monday")
• Just the day (e.g., "28")

${DIVIDER}
Type *B* to go back, or *0* for main menu`
    }

    const parsedDateStr = parseDate(message)
    if (!parsedDateStr) {
        return `❌ *Invalid Date*

${DIVIDER}

Could not understand the date. Please try again.

${DIVIDER}
Type *B* to go back, or *0* for main menu`
    }

    // Convert string to Date for comparison
    const parsedDate = new Date(parsedDateStr)

    // Check if date is in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (parsedDate < today) {
        return `❌ *Invalid Date*

${DIVIDER}

The visit date cannot be in the past.
Please enter a future date.

${DIVIDER}
Type *B* to go back, or *0* for main menu`
    }

    // Check if date is too far in the future (30 days)
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 30)
    if (parsedDate > maxDate) {
        return `❌ *Invalid Date*

${DIVIDER}

Visitor passes can only be registered up to 30 days in advance.

${DIVIDER}
Type *B* to go back, or *0* for main menu`
    }

    const dateStr = parsedDateStr
    const formattedDate = formatDate(dateStr)

    setState(phoneNumber, {
        step: "visitor_confirm",
        type: "visitor",
        visitor: { ...visitor, date: dateStr },
    })

    return `✅ *Date Recorded*

${DIVIDER}
📋 *Visitor Entry Pass Summary*
${DIVIDER}

👤 *Visitor Name:* ${visitor.name}
🪪 *CNIC:* ${visitor.cnic}
📱 *Phone:* ${visitor.phone}
📅 *Visit Date:* ${formattedDate}

${DIVIDER}

Please confirm this visitor entry pass:

*1.* ✅ Confirm & Register
*2.* ❌ Cancel

${DIVIDER}
Type *B* to go back, or *0* for main menu`
}

/**
 * Handle confirmation
 */
async function handleConfirmation(
    message: string,
    profile: Profile,
    phoneNumber: string,
    visitor: VisitorData
): Promise<string> {
    const choice = message.trim()

    if (choice === "2") {
        clearState(phoneNumber)
        return `❌ *Registration Cancelled*

${DIVIDER}

Your visitor entry pass registration has been cancelled.

${DIVIDER}
Reply *0* for the main menu`
    }

    if (choice !== "1") {
        return `❓ *Invalid Choice*

${DIVIDER}

Please select:
*1.* ✅ Confirm & Register
*2.* ❌ Cancel

${DIVIDER}
Type *B* to go back, or *0* for main menu`
    }

    try {
        // Save to database
        const { data, error } = await supabase
            .from("visitor_passes")
            .insert({
                resident_id: profile.id,
                visitor_name: visitor.name,
                visitor_cnic: visitor.cnic,
                visitor_phone: visitor.phone,
                visit_date: visitor.date,
                status: "pending",
            })
            .select()
            .single()

        if (error) {
            console.error("[Visitor] Error saving visitor pass:", error)
            return `❌ *Registration Failed*

${DIVIDER}

Sorry, we couldn't register your visitor pass.
Please try again later.

${DIVIDER}
Reply *0* for the main menu`
        }

        clearState(phoneNumber)
        const formattedDate = formatDate(visitor.date || "")

        return `✅ *Visitor Pass Registered!*

${DIVIDER}
🎫 *Entry Pass Details*
${DIVIDER}

👤 *Visitor:* ${visitor.name}
🪪 *CNIC:* ${visitor.cnic}
📱 *Phone:* ${visitor.phone}
📅 *Visit Date:* ${formattedDate}

${DIVIDER}

Your visitor has been registered successfully.
The security will be notified about this visit.

You will receive a notification when your visitor arrives.

${DIVIDER}
Reply *0* for the main menu`
    } catch (error) {
        console.error("[Visitor] Error:", error)
        clearState(phoneNumber)
        return `❌ *Registration Failed*

${DIVIDER}

An unexpected error occurred.
Please try again later.

${DIVIDER}
Reply *0* for the main menu`
    }
}

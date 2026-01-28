/**
 * Visitor Entry Pass Flow Handler
 * Handles visitor registration conversation flow
 */

import { supabase } from "@/lib/supabase"
import { isDateFormat, parseDate } from "@/lib/dateUtils"
import type { Profile, UserState, VisitorData } from "../types"
import { setState, clearState } from "../state"
import { formatDate, validateCNIC, validatePhoneNumber, validateName } from "../utils"

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

Enter your visitor's *full name*.

*B* to go back, *0* for menu`
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

${validation.error}

Enter a valid full name (letters and spaces only).

*B* to go back, *0* for menu`
    }

    setState(phoneNumber, {
        step: "visitor_cnic",
        type: "visitor",
        visitor: { ...visitor, name: validation.normalized },
    })

    return `✅ *Name Recorded*

👤 ${validation.normalized}

Enter visitor's *CNIC* (13 digits).
Example: 4210112345678

*B* to go back, *0* for menu`
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

${validation.error}

Enter 13-digit CNIC.
Example: 4210112345678

*B* to go back, *0* for menu`
    }

    setState(phoneNumber, {
        step: "visitor_phone",
        type: "visitor",
        visitor: { ...visitor, cnic: validation.normalized },
    })

    return `✅ *CNIC Recorded*

👤 ${visitor.name}
🪪 ${validation.normalized}

Enter visitor's *phone number*.
Format: 03XXXXXXXXX

*B* to go back, *0* for menu`
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
        return `❌ *Invalid Phone*

${validation.error}

Enter valid phone number.
Example: 03001234567

*B* to go back, *0* for menu`
    }

    setState(phoneNumber, {
        step: "visitor_date",
        type: "visitor",
        visitor: { ...visitor, phone: validation.normalized },
    })

    return `✅ *Phone Recorded*

👤 ${visitor.name}
🪪 ${visitor.cnic}
📱 ${validation.normalized}

Enter *date of visit*.
Formats: DD-MM-YYYY, "tomorrow", "next Monday"

*B* to go back, *0* for menu`
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

    const dateStr = parsedDateStr
    const formattedDate = formatDate(dateStr)

    setState(phoneNumber, {
        step: "visitor_confirm",
        type: "visitor",
        visitor: { ...visitor, date: dateStr },
    })

    return `✅ *Date Recorded*

📋 *Visitor Entry Pass*

👤 ${visitor.name}
🪪 ${visitor.cnic}
📱 ${visitor.phone}
📅 ${formattedDate}

Confirm registration?

*1.* ✅ Confirm
*2.* ❌ Cancel

*B* to go back, *0* for menu`
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

Visitor entry pass cancelled.

Reply *0* for menu`
    }

    if (choice !== "1") {
        return `❓ *Invalid Choice*

*1.* ✅ Confirm
*2.* ❌ Cancel

*B* to go back, *0* for menu`
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

Please try again later.

Reply *0* for menu`
        }

        clearState(phoneNumber)
        const formattedDate = formatDate(visitor.date || "")

        return `✅ *Visitor Pass Registered!*

👤 ${visitor.name}
🪪 ${visitor.cnic}
📱 ${visitor.phone}
📅 ${formattedDate}

Security will be notified. You'll get a message when your visitor arrives.

Reply *0* for menu`
    } catch (error) {
        console.error("[Visitor] Error:", error)
        clearState(phoneNumber)
        return `❌ *Registration Failed*

An unexpected error occurred. Try again later.

Reply *0* for menu`
    }
}

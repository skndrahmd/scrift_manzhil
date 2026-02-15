/**
 * Visitor Entry Pass Flow Handler
 * 3-step flow: Enter visitor name → Enter car number → Enter date → Auto-save
 */

import { supabaseAdmin } from "@/lib/supabase"
import { isDateFormat, parseDate } from "@/lib/date"
import type { Profile, UserState, VisitorData } from "../types"
import { setState, clearState } from "../state"
import { formatDate } from "../utils"

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

Enter the *visitor's name* ✍️

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

        case "visitor_car_number":
            return handleCarNumberInput(message, phoneNumber, visitor)

        case "visitor_date":
            return await handleDateInputAndSave(message, profile, phoneNumber, visitor)

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
    const name = message.trim()

    if (name.length < 2) {
        return `❌ *Name too short*

Please enter the visitor's full name (at least 2 characters).

*B* to go back, *0* for menu`
    }

    setState(phoneNumber, {
        step: "visitor_car_number",
        type: "visitor",
        visitor: { ...visitor, visitor_name: name },
    })

    return `✅ Name: ${name}

🚗 Enter the visitor's *car number* (license plate).

*B* to go back, *0* for menu`
}

/**
 * Handle car number input
 */
function handleCarNumberInput(
    message: string,
    phoneNumber: string,
    visitor: VisitorData
): string {
    const input = message.trim()

    if (input.length < 2) {
        return `❌ *Car number too short*

Please enter a valid car number / license plate.

*B* to go back, *0* for menu`
    }

    const updatedVisitor = {
        ...visitor,
        car_number: input,
    }

    setState(phoneNumber, {
        step: "visitor_date",
        type: "visitor",
        visitor: updatedVisitor,
    })

    return `🚗 Car: ${input}

📅 Enter *date of visit*.
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
                visitor_name: visitor.visitor_name || null,
                car_number: visitor.car_number || null,
                visit_date: parsedDateStr,
                status: "pending",
                cnic_image_url: null,
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
        const passId = data.id.substring(0, 5)

        return `✅ *Visitor Pass Created!*

Forward this to your visitor:

—————————————
🎫 *Visitor Pass*
🆔 Pass ID: *${passId}*
👤 Name: ${visitor.visitor_name}${carLine}
📅 Date: ${formattedDate}

Show this message at the gate.
—————————————

Reply *0* for menu`
    } catch (error) {
        console.error("[Visitor] Error:", error)
        clearState(phoneNumber)
        return `❌ *Registration Failed*

An unexpected error occurred.

Reply *0* for menu`
    }
}

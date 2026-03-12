/**
 * Visitor Entry Pass Flow Handler
 * 3-step flow: Enter visitor name → Enter car number → Enter date → Auto-save
 */

import { supabaseAdmin } from "@/lib/supabase"
import { isDateFormat, parseDate, getPakistanTime } from "@/lib/date"
import type { Profile, UserState, VisitorData } from "../types"
import { setState, clearState } from "../state"
import { formatDate } from "../utils"
import { getMessage } from "../messages"
import { MSG } from "../message-keys"

/**
 * Initialize visitor registration flow
 */
export async function initializeVisitorFlow(phoneNumber: string, language?: string): Promise<string> {
    await setState(phoneNumber, {
        step: "visitor_name",
        type: "visitor",
        visitor: {},
        language,
    })

    return await getMessage(MSG.VISITOR_NAME_PROMPT, undefined, language)
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
    const language = userState.language

    switch (step) {
        case "visitor_name":
            return await handleNameInput(message, phoneNumber, visitor, language)

        case "visitor_car_number":
            return await handleCarNumberInput(message, phoneNumber, visitor, language)

        case "visitor_date":
            return await handleDateInputAndSave(message, profile, phoneNumber, visitor, language)

        default:
            return await initializeVisitorFlow(phoneNumber, language)
    }
}

/**
 * Handle visitor name input
 */
async function handleNameInput(
    message: string,
    phoneNumber: string,
    visitor: VisitorData,
    language?: string
): Promise<string> {
    const name = message.trim()

    if (name.length < 2) {
        return await getMessage(MSG.VISITOR_NAME_TOO_SHORT, undefined, language)
    }

    await setState(phoneNumber, {
        step: "visitor_car_number",
        type: "visitor",
        visitor: { ...visitor, visitor_name: name },
        language,
    })

    return await getMessage(MSG.VISITOR_CAR_PROMPT, { name }, language)
}

/**
 * Handle car number input
 */
async function handleCarNumberInput(
    message: string,
    phoneNumber: string,
    visitor: VisitorData,
    language?: string
): Promise<string> {
    const input = message.trim()

    if (input.length < 2) {
        return await getMessage(MSG.VISITOR_CAR_TOO_SHORT, undefined, language)
    }

    const updatedVisitor = {
        ...visitor,
        car_number: input,
    }

    await setState(phoneNumber, {
        step: "visitor_date",
        type: "visitor",
        visitor: updatedVisitor,
        language,
    })

    return await getMessage(MSG.VISITOR_DATE_PROMPT, { car_number: input }, language)
}

/**
 * Handle date input and auto-save
 */
async function handleDateInputAndSave(
    message: string,
    profile: Profile,
    phoneNumber: string,
    visitor: VisitorData,
    language?: string
): Promise<string> {
    if (!isDateFormat(message)) {
        return await getMessage(MSG.VISITOR_INVALID_DATE, undefined, language)
    }

    const parsedDateStr = parseDate(message)
    if (!parsedDateStr) {
        return await getMessage(MSG.VISITOR_INVALID_DATE_PARSE, undefined, language)
    }

    // Convert string to Date for comparison
    const parsedDate = new Date(parsedDateStr)

    // Check if date is in the past
    const today = await getPakistanTime()
    today.setHours(0, 0, 0, 0)
    if (parsedDate < today) {
        return await getMessage(MSG.VISITOR_DATE_PAST, undefined, language)
    }

    // Check if date is too far in the future (30 days)
    const maxDate = await getPakistanTime()
    maxDate.setDate(maxDate.getDate() + 30)
    if (parsedDate > maxDate) {
        return await getMessage(MSG.VISITOR_DATE_TOO_FAR, undefined, language)
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
            return await getMessage(MSG.VISITOR_CREATION_ERROR, undefined, language)
        }

        await clearState(phoneNumber)
        const formattedDate = formatDate(parsedDateStr)
        const carLine = visitor.car_number ? `\n🚗 Car: ${visitor.car_number}` : ""
        const passId = data.id.substring(0, 5)

        return await getMessage(MSG.VISITOR_CREATED, {
            pass_id: passId,
            visitor_name: visitor.visitor_name || "",
            car_line: carLine,
            date: formattedDate,
        }, language)
    } catch (error) {
        console.error("[Visitor] Error:", error)
        await clearState(phoneNumber)
        return await getMessage(MSG.VISITOR_UNEXPECTED_ERROR, undefined, language)
    }
}

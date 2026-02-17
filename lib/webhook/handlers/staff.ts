/**
 * Staff Management Flow Handler
 * Handles staff management conversation flow
 */

import { supabase } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/date"
import type { Profile, UserState } from "../types"
import { getState, setState, clearState } from "../state"
import { validateName, validatePhoneNumber, validateCNIC, isYesResponse, isNoResponse } from "../utils"
import { getMessage } from "../messages"
import { MSG } from "../message-keys"
import { getStaffRoleMenu } from "../menu"
import {
  STAFF_MENU_OPTIONS,
  STAFF_ROLES,
} from "../config"

/**
 * Initialize staff management flow
 */
export async function initializeStaffFlow(phoneNumber: string, language?: string): Promise<string> {
  setState(phoneNumber, {
    step: "staff_menu",
    type: "staff",
    staff: {},
    staffList: [],
    language,
  })

  const options = STAFF_MENU_OPTIONS.map(
    (opt) => `${opt.key}. ${opt.emoji} ${opt.label}`
  ).join("\n")

  return await getMessage(MSG.STAFF_MENU, { options }, language)
}

/**
 * Handle staff flow steps
 */
export async function handleStaffFlow(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState
): Promise<string> {
  const choice = message.trim()
  const language = userState.language

  // Guard: profile must be linked to a unit
  if (!profile.unit_id) {
    clearState(phoneNumber)
    return await getMessage(MSG.STAFF_NO_UNIT, undefined, language)
  }

  try {
    // Staff menu selection
    if (userState.step === "staff_menu") {
      return await handleStaffMenuSelection(choice, profile, phoneNumber, userState, language)
    }

    // Add staff flow
    if (userState.step?.startsWith("staff_add_")) {
      return await handleAddStaffFlow(message, profile, phoneNumber, userState, language)
    }

    // Delete staff flow
    if (userState.step?.startsWith("staff_delete_")) {
      return await handleDeleteStaffFlow(message, profile, phoneNumber, userState, language)
    }

    // Edit staff flow
    if (userState.step?.startsWith("staff_edit_")) {
      return await handleEditStaffFlow(message, profile, phoneNumber, userState, language)
    }

    return await getMessage(MSG.ERROR_SOMETHING_WRONG, undefined, language)
  } catch (error) {
    console.error("[Staff] Flow error:", error)
    return await getMessage(MSG.ERROR_GENERIC, undefined, language)
  }
}

/**
 * Handle staff menu selection
 */
async function handleStaffMenuSelection(
  choice: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState,
  language?: string
): Promise<string> {
  switch (choice) {
    case "1": // Add new staff
      userState.step = "staff_add_name"
      userState.staff = {}
      setState(phoneNumber, userState)
      return await getMessage(MSG.STAFF_ADD_NAME, undefined, language)

    case "2": // View staff
      return await viewStaffList(profile, phoneNumber, language)

    case "3": // Edit staff
      return await initializeEditStaff(profile, phoneNumber, language)

    case "4": // Delete staff
      return await initializeDeleteStaff(profile, phoneNumber, language)

    default:
      return await getMessage(MSG.STAFF_INVALID_MENU, undefined, language)
  }
}

/**
 * Handle add staff flow
 */
async function handleAddStaffFlow(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState,
  language?: string
): Promise<string> {
  const choice = message.trim()

  if (userState.step === "staff_add_name") {
    const nameValidation = validateName(message)
    if (!nameValidation.valid) {
      return nameValidation.error!
    }

    userState.staff!.name = message.trim()
    userState.step = "staff_add_phone"
    setState(phoneNumber, userState)
    return await getMessage(MSG.STAFF_ADD_PHONE, undefined, language)
  }

  if (userState.step === "staff_add_phone") {
    const phoneValidation = validatePhoneNumber(message)
    if (!phoneValidation.valid) {
      return phoneValidation.error!
    }

    // Check for duplicate phone number
    const { data: existingStaff } = await supabase
      .from("staff")
      .select("id")
      .eq("unit_id", profile.unit_id!)
      .eq("phone_number", phoneValidation.normalized!)
      .single()

    if (existingStaff) {
      return await getMessage(MSG.STAFF_DUPLICATE_PHONE, undefined, language)
    }

    userState.staff!.phone = phoneValidation.normalized!
    userState.step = "staff_add_cnic"
    setState(phoneNumber, userState)
    return await getMessage(MSG.STAFF_ADD_CNIC, undefined, language)
  }

  if (userState.step === "staff_add_cnic") {
    const cnicValidation = validateCNIC(message)
    if (!cnicValidation.valid) {
      return cnicValidation.error!
    }

    userState.staff!.cnic = cnicValidation.normalized!
    userState.step = "staff_add_role_select"
    setState(phoneNumber, userState)

    return await getStaffRoleMenu(language)
  }

  if (userState.step === "staff_add_role_select") {
    const roles = ["Driver", "Cook", "Maid", "Plumber", "Electrician", "Maintenance", "Security Guard"]

    if (choice >= "1" && choice <= "7") {
      userState.staff!.role = roles[parseInt(choice, 10) - 1]
      return await createStaffMember(profile, userState, phoneNumber, language)
    }

    if (choice === "8") {
      userState.step = "staff_add_role_custom"
      setState(phoneNumber, userState)
      return await getMessage(MSG.STAFF_ADD_ROLE_CUSTOM, undefined, language)
    }

    return await getMessage(MSG.STAFF_INVALID_ROLE, { max: "8" }, language)
  }

  if (userState.step === "staff_add_role_custom") {
    if (message.trim().length < 3 || message.trim().length > 30) {
      return await getMessage(MSG.STAFF_INVALID_CUSTOM_ROLE, undefined, language)
    }

    userState.staff!.role = message.trim()
    return await createStaffMember(profile, userState, phoneNumber, language)
  }

  return await getMessage(MSG.ERROR_SOMETHING_WRONG, undefined, language)
}

/**
 * Create staff member in database
 */
async function createStaffMember(
  profile: Profile,
  userState: UserState,
  phoneNumber: string,
  language?: string
): Promise<string> {
  try {
    const staff = userState.staff!

    const { error } = await supabase.from("staff").insert([
      {
        unit_id: profile.unit_id,
        name: staff.name,
        cnic: staff.cnic,
        phone_number: staff.phone,
        role: staff.role,
        created_at: getPakistanISOString(),
        updated_at: getPakistanISOString(),
      },
    ])

    if (error) {
      console.error("[Staff] Creation error:", error)
      return await getMessage(MSG.STAFF_ADD_ERROR, undefined, language)
    }

    clearState(phoneNumber)
    return await getMessage(MSG.STAFF_ADDED, {
      name: staff.name || "",
      cnic: staff.cnic || "",
      phone: staff.phone || "",
      role: staff.role || "",
    }, language)
  } catch (error) {
    console.error("[Staff] Creation error:", error)
    return await getMessage(MSG.STAFF_ADD_ERROR, undefined, language)
  }
}

/**
 * View staff list
 */
async function viewStaffList(profile: Profile, phoneNumber: string, language?: string): Promise<string> {
  try {
    const { data: staffList, error } = await supabase
      .from("staff")
      .select("*")
      .eq("unit_id", profile.unit_id!)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[Staff] Fetch error:", error)
      return await getMessage(MSG.STAFF_VIEW_ERROR, undefined, language)
    }

    if (!staffList || staffList.length === 0) {
      return await getMessage(MSG.STAFF_VIEW_EMPTY, undefined, language)
    }

    const listText = staffList
      .map(
        (s, i) => `${i + 1}. 👤 ${s.name}
   • Role: ${s.role}
   • Phone: ${s.phone_number}`
      )
      .join("\n\n")

    clearState(phoneNumber)
    return await getMessage(MSG.STAFF_VIEW_LIST, { list: listText }, language)
  } catch (error) {
    console.error("[Staff] View error:", error)
    return await getMessage(MSG.STAFF_VIEW_ERROR, undefined, language)
  }
}

/**
 * Initialize delete staff flow
 */
async function initializeDeleteStaff(profile: Profile, phoneNumber: string, language?: string): Promise<string> {
  try {
    const { data: staffList, error } = await supabase
      .from("staff")
      .select("*")
      .eq("unit_id", profile.unit_id!)
      .order("created_at", { ascending: false })

    if (error || !staffList || staffList.length === 0) {
      return await getMessage(MSG.STAFF_DELETE_EMPTY, undefined, language)
    }

    const userState = getState(phoneNumber)
    userState.step = "staff_delete_list"
    userState.staffList = staffList
    setState(phoneNumber, userState)

    const listText = staffList.map((s, i) => `${i + 1}. ${s.name} (${s.role})`).join("\n")

    return await getMessage(MSG.STAFF_DELETE_LIST, { list: listText }, language)
  } catch (error) {
    console.error("[Staff] Delete init error:", error)
    return await getMessage(MSG.STAFF_VIEW_ERROR, undefined, language)
  }
}

/**
 * Handle delete staff flow
 */
async function handleDeleteStaffFlow(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState,
  language?: string
): Promise<string> {
  const choice = message.trim()

  if (userState.step === "staff_delete_list") {
    const staffIndex = parseInt(choice, 10)
    if (isNaN(staffIndex) || staffIndex < 1 || staffIndex > userState.staffList!.length) {
      return await getMessage(MSG.STATUS_INVALID_SELECTION, {
        max: userState.staffList!.length,
      })
    }

    const selectedStaff = userState.staffList![staffIndex - 1]
      ; (userState as any).selectedStaff = selectedStaff
    userState.step = "staff_delete_confirm"
    setState(phoneNumber, userState)

    return await getMessage(MSG.STAFF_DELETE_CONFIRM, {
      name: selectedStaff.name,
      cnic: selectedStaff.cnic,
      phone: selectedStaff.phone_number,
    }, language)
  }

  if (userState.step === "staff_delete_confirm") {
    if (isYesResponse(message)) {
      const selectedStaff = (userState as any).selectedStaff
      const { error } = await supabase.from("staff").delete().eq("id", selectedStaff.id)

      if (error) {
        console.error("[Staff] Deletion error:", error)
        return await getMessage(MSG.STAFF_DELETE_FAILED, undefined, language)
      }

      clearState(phoneNumber)
      return await getMessage(MSG.STAFF_DELETED, { name: selectedStaff.name }, language)
    }

    if (isNoResponse(message)) {
      clearState(phoneNumber)
      return await getMessage(MSG.STAFF_DELETE_CANCELLED, undefined, language)
    }

    return await getMessage(MSG.CANCEL_INVALID_RESPONSE, undefined, language)
  }

  return await getMessage(MSG.ERROR_SOMETHING_WRONG, undefined, language)
}

/**
 * Initialize edit staff flow
 */
async function initializeEditStaff(profile: Profile, phoneNumber: string, language?: string): Promise<string> {
  try {
    const { data: staffList, error } = await supabase
      .from("staff")
      .select("*")
      .eq("unit_id", profile.unit_id!)
      .order("created_at", { ascending: false })

    if (error || !staffList || staffList.length === 0) {
      return await getMessage(MSG.STAFF_EDIT_EMPTY, undefined, language)
    }

    const userState = getState(phoneNumber)
    userState.step = "staff_edit_list"
    userState.staffList = staffList
    setState(phoneNumber, userState)

    const listText = staffList.map((s, i) => `${i + 1}. ${s.name} (${s.role})`).join("\n")

    return await getMessage(MSG.STAFF_EDIT_LIST, { list: listText }, language)
  } catch (error) {
    console.error("[Staff] Edit init error:", error)
    return await getMessage(MSG.STAFF_VIEW_ERROR, undefined, language)
  }
}

/**
 * Handle edit staff flow
 */
async function handleEditStaffFlow(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState,
  language?: string
): Promise<string> {
  const choice = message.trim()

  if (userState.step === "staff_edit_list") {
    const staffIndex = parseInt(choice, 10)
    if (isNaN(staffIndex) || staffIndex < 1 || staffIndex > userState.staffList!.length) {
      return await getMessage(MSG.STATUS_INVALID_SELECTION, {
        max: userState.staffList!.length,
      })
    }

    const selectedStaff = userState.staffList![staffIndex - 1]
      ; (userState as any).selectedStaff = selectedStaff
    userState.step = "staff_edit_field"
    setState(phoneNumber, userState)

    return await getMessage(MSG.STAFF_EDIT_FIELD_SELECT, { name: selectedStaff.name }, language)
  }

  if (userState.step === "staff_edit_field") {
    const fields: Record<string, string> = { "1": "name", "2": "cnic", "3": "phone_number" }

    if (fields[choice]) {
      ; (userState as any).editField = fields[choice]
      userState.step = "staff_edit_value"
      setState(phoneNumber, userState)

      const selectedStaff = (userState as any).selectedStaff
      if (choice === "1") {
        return await getMessage(MSG.STAFF_EDIT_NAME_PROMPT, { name: selectedStaff.name }, language)
      } else if (choice === "2") {
        return await getMessage(MSG.STAFF_EDIT_CNIC_PROMPT, undefined, language)
      } else {
        return await getMessage(MSG.STAFF_EDIT_PHONE_PROMPT, undefined, language)
      }
    }

    return await getMessage(MSG.STATUS_INVALID_SELECTION, { max: "3" }, language)
  }

  if (userState.step === "staff_edit_value") {
    let newValue = message.trim()
    const editField = (userState as any).editField
    const selectedStaff = (userState as any).selectedStaff

    // Validate based on field type
    if (editField === "cnic") {
      newValue = newValue.replace(/[-\s]/g, "")
      if (!/^\d{13}$/.test(newValue)) {
        return await getMessage(MSG.STAFF_EDIT_INVALID_CNIC, undefined, language)
      }
    } else if (editField === "phone_number") {
      newValue = newValue.replace(/[-\s]/g, "")
      if (!/^03\d{9}$/.test(newValue)) {
        return await getMessage(MSG.STAFF_EDIT_INVALID_PHONE, undefined, language)
      }
    }

    // Update in database
    const { error } = await supabase
      .from("staff")
      .update({ [editField]: newValue, updated_at: getPakistanISOString() })
      .eq("id", selectedStaff.id)

    if (error) {
      console.error("[Staff] Update error:", error)
      return await getMessage(MSG.STAFF_EDIT_FAILED, undefined, language)
    }

    const fieldNames: Record<string, string> = {
      name: "Name",
      cnic: "CNIC",
      phone_number: "Phone",
    }

    clearState(phoneNumber)
    return await getMessage(MSG.STAFF_EDIT_SUCCESS, {
      field_name: fieldNames[editField],
      new_value: newValue,
    }, language)
  }

  return await getMessage(MSG.ERROR_SOMETHING_WRONG, undefined, language)
}

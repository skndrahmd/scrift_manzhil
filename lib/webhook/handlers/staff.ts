/**
 * Staff Management Flow Handler
 * Handles staff management conversation flow
 */

import { supabase } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/dateUtils"
import type { Profile, UserState } from "../types"
import { getState, setState, clearState } from "../state"
import { validateName, validatePhoneNumber, validateCNIC, isYesResponse, isNoResponse } from "../utils"
import { getStaffMenu } from "../menu"

// Divider constant for consistent styling
const DIVIDER = "───────────────────"

/**
 * Initialize staff management flow
 */
export function initializeStaffFlow(phoneNumber: string): string {
  setState(phoneNumber, {
    step: "staff_menu",
    type: "staff",
    staff: {},
    staffList: [],
  })

  return getStaffMenu()
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

  try {
    // Staff menu selection
    if (userState.step === "staff_menu") {
      return await handleStaffMenuSelection(choice, profile, phoneNumber, userState)
    }

    // Add staff flow
    if (userState.step?.startsWith("staff_add_")) {
      return await handleAddStaffFlow(message, profile, phoneNumber, userState)
    }

    // Delete staff flow
    if (userState.step?.startsWith("staff_delete_")) {
      return await handleDeleteStaffFlow(message, profile, phoneNumber, userState)
    }

    // Edit staff flow
    if (userState.step?.startsWith("staff_edit_")) {
      return await handleEditStaffFlow(message, profile, phoneNumber, userState)
    }

    return `❌ *Something Went Wrong*

${DIVIDER}

We couldn't process your request. Please try again.

${DIVIDER}
Reply *0* for the main menu`
  } catch (error) {
    console.error("[Staff] Flow error:", error)
    return `❌ *Unable to Process Request*

${DIVIDER}

We encountered an issue. Please try again shortly.

${DIVIDER}
Reply *0* for the main menu`
  }
}

/**
 * Handle staff menu selection
 */
async function handleStaffMenuSelection(
  choice: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState
): Promise<string> {
  switch (choice) {
    case "1": // Add new staff
      userState.step = "staff_add_name"
      userState.staff = {}
      setState(phoneNumber, userState)
      return `➕ *Add New Staff*

${DIVIDER}

Please enter the staff member's full name:

${DIVIDER}
Reply *B* to go back, or *0* for main menu`

    case "2": // View staff
      return await viewStaffList(profile, phoneNumber)

    case "3": // Edit staff
      return await initializeEditStaff(profile, phoneNumber)

    case "4": // Delete staff
      return await initializeDeleteStaff(profile, phoneNumber)

    default:
      return `❓ *Invalid Selection*

${DIVIDER}

Please choose a number from 1-4.

${DIVIDER}
Reply *0* for the main menu`
  }
}

/**
 * Handle add staff flow
 */
async function handleAddStaffFlow(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState
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
    return `📱 *Enter Phone Number*

${DIVIDER}

Please enter the staff member's phone number.

*Examples:*
• 03001234567
• +923001234567

${DIVIDER}
Reply *B* to go back`
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
      .eq("profile_id", profile.id)
      .eq("phone_number", phoneValidation.normalized!)
      .single()

    if (existingStaff) {
      return `⚠️ *Duplicate Entry*

${DIVIDER}

This phone number is already registered in your staff list.

Please use a different number.

${DIVIDER}
Reply *0* for the main menu`
    }

    userState.staff!.phone = phoneValidation.normalized!
    userState.step = "staff_add_cnic"
    setState(phoneNumber, userState)
    return `🆔 *Enter CNIC Number*

${DIVIDER}

Please enter the CNIC number.

*Examples:*
• 12345-1234567-1
• 1234512345671

${DIVIDER}
Reply *B* to go back`
  }

  if (userState.step === "staff_add_cnic") {
    const cnicValidation = validateCNIC(message)
    if (!cnicValidation.valid) {
      return cnicValidation.error!
    }

    userState.staff!.cnic = cnicValidation.normalized!
    userState.step = "staff_add_role_select"
    setState(phoneNumber, userState)
    return `👔 *Select Staff Role*

${DIVIDER}

1. 🚗 Driver
2. 👨‍🍳 Cook
3. 🧹 Maid
4. 🔧 Plumber
5. ⚡ Electrician
6. 🛠️ Maintenance
7. 🔒 Security Guard
8. 📋 Other (Specify)

${DIVIDER}
Reply with number (1-8), or *B* to go back`
  }

  if (userState.step === "staff_add_role_select") {
    const roles = ["Driver", "Cook", "Maid", "Plumber", "Electrician", "Maintenance", "Security Guard"]

    if (choice >= "1" && choice <= "7") {
      userState.staff!.role = roles[parseInt(choice, 10) - 1]
      return await createStaffMember(profile, userState, phoneNumber)
    }

    if (choice === "8") {
      userState.step = "staff_add_role_custom"
      setState(phoneNumber, userState)
      return `📋 *Custom Role*

${DIVIDER}

Please specify the role.
(Only letters and spaces, 3-30 characters)

*Examples:* Gardener, Cleaner, Helper

${DIVIDER}
Reply *B* to go back`
    }

    return `❓ *Invalid Selection*

${DIVIDER}

Please choose a number from 1-8.

${DIVIDER}
Reply *B* to go back`
  }

  if (userState.step === "staff_add_role_custom") {
    if (message.trim().length < 3 || message.trim().length > 30) {
      return `❌ *Invalid Role*

${DIVIDER}

Role must be between 3 and 30 characters.

Please try again.

${DIVIDER}
Reply *B* to go back`
    }

    userState.staff!.role = message.trim()
    return await createStaffMember(profile, userState, phoneNumber)
  }

  return `❌ *Something Went Wrong*

${DIVIDER}

We couldn't process your request. Please try again.

${DIVIDER}
Reply *0* for the main menu`
}

/**
 * Create staff member in database
 */
async function createStaffMember(
  profile: Profile,
  userState: UserState,
  phoneNumber: string
): Promise<string> {
  try {
    const staff = userState.staff!

    const { error } = await supabase.from("staff").insert([
      {
        profile_id: profile.id,
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
      return `❌ *Unable to Add Staff*

${DIVIDER}

We couldn't add the staff member. Please try again.

${DIVIDER}
Reply *0* for the main menu`
    }

    clearState(phoneNumber)
    return `✅ *Staff Member Added*

${DIVIDER}
📋 *Staff Details*
${DIVIDER}

• Name: ${staff.name}
• CNIC: ${staff.cnic}
• Phone: ${staff.phone}
• Role: ${staff.role}

${DIVIDER}
📌 *Next Steps*
${DIVIDER}

Please have their CNIC ready and deliver to the maintenance department for issuance of physical card.

${DIVIDER}
Reply *0* for the main menu`
  } catch (error) {
    console.error("[Staff] Creation error:", error)
    return `❌ *Unable to Add Staff*

${DIVIDER}

We encountered an issue. Please try again.

${DIVIDER}
Reply *0* for the main menu`
  }
}

/**
 * View staff list
 */
async function viewStaffList(profile: Profile, phoneNumber: string): Promise<string> {
  try {
    const { data: staffList, error } = await supabase
      .from("staff")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[Staff] Fetch error:", error)
      return `❌ *Unable to Load Staff*

${DIVIDER}

We encountered an issue loading your staff list.

${DIVIDER}
Reply *0* for the main menu`
    }

    if (!staffList || staffList.length === 0) {
      return `📋 *No Staff Found*

${DIVIDER}

You don't have any staff members registered yet.

You can add a new staff member from the Staff Management menu.

${DIVIDER}
Reply *0* for the main menu`
    }

    const listText = staffList
      .map(
        (s, i) => `${i + 1}. 👤 ${s.name}
   • Role: ${s.role}
   • Phone: ${s.phone_number}`
      )
      .join("\n\n")

    clearState(phoneNumber)
    return `📋 *Your Staff List*

${DIVIDER}

${listText}

${DIVIDER}
Reply *0* for the main menu`
  } catch (error) {
    console.error("[Staff] View error:", error)
    return `❌ *Unable to Load Staff*

${DIVIDER}

We encountered an issue. Please try again.

${DIVIDER}
Reply *0* for the main menu`
  }
}

/**
 * Initialize delete staff flow
 */
async function initializeDeleteStaff(profile: Profile, phoneNumber: string): Promise<string> {
  try {
    const { data: staffList, error } = await supabase
      .from("staff")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })

    if (error || !staffList || staffList.length === 0) {
      return `📋 *No Staff Found*

${DIVIDER}

You don't have any staff members to delete.

${DIVIDER}
Reply *0* for the main menu`
    }

    const userState = getState(phoneNumber)
    userState.step = "staff_delete_list"
    userState.staffList = staffList
    setState(phoneNumber, userState)

    const listText = staffList.map((s, i) => `${i + 1}. ${s.name} (${s.role})`).join("\n")

    return `🗑️ *Remove Staff Member*

${DIVIDER}
📋 *Your Staff*
${DIVIDER}

${listText}

${DIVIDER}
Reply with number to remove, or *0* for main menu`
  } catch (error) {
    console.error("[Staff] Delete init error:", error)
    return `❌ *Unable to Load Staff*

${DIVIDER}

We encountered an issue. Please try again.

${DIVIDER}
Reply *0* for the main menu`
  }
}

/**
 * Handle delete staff flow
 */
async function handleDeleteStaffFlow(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState
): Promise<string> {
  const choice = message.trim()

  if (userState.step === "staff_delete_list") {
    const staffIndex = parseInt(choice, 10)
    if (isNaN(staffIndex) || staffIndex < 1 || staffIndex > userState.staffList!.length) {
      return `❓ *Invalid Selection*

${DIVIDER}

Please choose a number from 1-${userState.staffList!.length}

${DIVIDER}
Reply *0* for the main menu`
    }

    const selectedStaff = userState.staffList![staffIndex - 1]
      ; (userState as any).selectedStaff = selectedStaff
    userState.step = "staff_delete_confirm"
    setState(phoneNumber, userState)

    return `⚠️ *Confirm Removal*

${DIVIDER}
📋 *Staff Details*
${DIVIDER}

• Name: ${selectedStaff.name}
• CNIC: ${selectedStaff.cnic}
• Phone: ${selectedStaff.phone_number}

${DIVIDER}

Are you sure you want to remove this staff member?

1. ✅ Yes, remove
2. ❌ No, cancel

${DIVIDER}
Reply *1* or *2*`
  }

  if (userState.step === "staff_delete_confirm") {
    if (isYesResponse(message)) {
      const selectedStaff = (userState as any).selectedStaff
      const { error } = await supabase.from("staff").delete().eq("id", selectedStaff.id)

      if (error) {
        console.error("[Staff] Deletion error:", error)
        return `❌ *Removal Failed*

${DIVIDER}

We couldn't remove the staff member. Please try again.

${DIVIDER}
Reply *0* for the main menu`
      }

      clearState(phoneNumber)
      return `✅ *Staff Member Removed*

${DIVIDER}

${selectedStaff.name} has been removed from your staff list.

${DIVIDER}
Reply *0* for the main menu`
    }

    if (isNoResponse(message)) {
      clearState(phoneNumber)
      return `✅ *Removal Cancelled*

${DIVIDER}

Your staff list remains unchanged.

${DIVIDER}
Reply *0* for the main menu`
    }

    return `❓ *Invalid Response*

${DIVIDER}

Please reply with:
• *1* — Yes, remove
• *2* — No, cancel

${DIVIDER}
Reply *0* for the main menu`
  }

  return `❌ *Something Went Wrong*

${DIVIDER}

We couldn't process your request. Please try again.

${DIVIDER}
Reply *0* for the main menu`
}

/**
 * Initialize edit staff flow
 */
async function initializeEditStaff(profile: Profile, phoneNumber: string): Promise<string> {
  try {
    const { data: staffList, error } = await supabase
      .from("staff")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })

    if (error || !staffList || staffList.length === 0) {
      return `📋 *No Staff Found*

${DIVIDER}

You don't have any staff members to edit.

${DIVIDER}
Reply *0* for the main menu`
    }

    const userState = getState(phoneNumber)
    userState.step = "staff_edit_list"
    userState.staffList = staffList
    setState(phoneNumber, userState)

    const listText = staffList.map((s, i) => `${i + 1}. ${s.name} (${s.role})`).join("\n")

    return `✏️ *Edit Staff Member*

${DIVIDER}
📋 *Your Staff*
${DIVIDER}

${listText}

${DIVIDER}
Reply with number to edit, or *0* for main menu`
  } catch (error) {
    console.error("[Staff] Edit init error:", error)
    return `❌ *Unable to Load Staff*

${DIVIDER}

We encountered an issue. Please try again.

${DIVIDER}
Reply *0* for the main menu`
  }
}

/**
 * Handle edit staff flow
 */
async function handleEditStaffFlow(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState
): Promise<string> {
  const choice = message.trim()

  if (userState.step === "staff_edit_list") {
    const staffIndex = parseInt(choice, 10)
    if (isNaN(staffIndex) || staffIndex < 1 || staffIndex > userState.staffList!.length) {
      return `❓ *Invalid Selection*

${DIVIDER}

Please choose a number from 1-${userState.staffList!.length}

${DIVIDER}
Reply *0* for the main menu`
    }

    const selectedStaff = userState.staffList![staffIndex - 1]
      ; (userState as any).selectedStaff = selectedStaff
    userState.step = "staff_edit_field"
    setState(phoneNumber, userState)

    return `✏️ *Edit: ${selectedStaff.name}*

${DIVIDER}
📋 *Select Field to Update*
${DIVIDER}

1. 👤 Name
2. 🆔 CNIC
3. 📱 Phone Number

${DIVIDER}
Reply with number (1-3)`
  }

  if (userState.step === "staff_edit_field") {
    const fields: Record<string, string> = { "1": "name", "2": "cnic", "3": "phone_number" }
    const prompts: Record<string, string> = {
      "1": `📝 *Update Name*

${DIVIDER}

Please enter the new name for ${(userState as any).selectedStaff.name}:

${DIVIDER}
Reply *B* to go back`,
      "2": `🆔 *Update CNIC*

${DIVIDER}

Please enter the new CNIC (13 digits).

*Example:* 1234567890123

${DIVIDER}
Reply *B* to go back`,
      "3": `📱 *Update Phone*

${DIVIDER}

Please enter the new phone number.

*Example:* 03001234567

${DIVIDER}
Reply *B* to go back`,
    }

    if (fields[choice]) {
      ; (userState as any).editField = fields[choice]
      userState.step = "staff_edit_value"
      setState(phoneNumber, userState)
      return prompts[choice]
    }

    return `❓ *Invalid Selection*

${DIVIDER}

Please choose 1, 2, or 3.

${DIVIDER}
Reply *0* for the main menu`
  }

  if (userState.step === "staff_edit_value") {
    let newValue = message.trim()
    const editField = (userState as any).editField
    const selectedStaff = (userState as any).selectedStaff

    // Validate based on field type
    if (editField === "cnic") {
      newValue = newValue.replace(/[-\s]/g, "")
      if (!/^\d{13}$/.test(newValue)) {
        return `❌ *Invalid CNIC*

${DIVIDER}

Please enter exactly 13 digits.

*Example:* 1234567890123

${DIVIDER}
Reply *B* to go back`
      }
    } else if (editField === "phone_number") {
      newValue = newValue.replace(/[-\s]/g, "")
      if (!/^03\d{9}$/.test(newValue)) {
        return `❌ *Invalid Phone Number*

${DIVIDER}

Please enter a valid Pakistani mobile number.

*Example:* 03001234567

${DIVIDER}
Reply *B* to go back`
      }
    }

    // Update in database
    const { error } = await supabase
      .from("staff")
      .update({ [editField]: newValue, updated_at: getPakistanISOString() })
      .eq("id", selectedStaff.id)

    if (error) {
      console.error("[Staff] Update error:", error)
      return `❌ *Update Failed*

${DIVIDER}

We couldn't update the staff member. Please try again.

${DIVIDER}
Reply *0* for the main menu`
    }

    const fieldNames: Record<string, string> = {
      name: "Name",
      cnic: "CNIC",
      phone_number: "Phone Number",
    }

    clearState(phoneNumber)
    return `✅ *Staff Updated*

${DIVIDER}

${fieldNames[editField]} for ${selectedStaff.name} has been updated.

${DIVIDER}
Reply *0* for the main menu`
  }

  return `❌ *Something Went Wrong*

${DIVIDER}

We couldn't process your request. Please try again.

${DIVIDER}
Reply *0* for the main menu`
}

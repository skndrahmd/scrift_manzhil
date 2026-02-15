/**
 * Staff Management Flow Handler
 * Handles staff management conversation flow
 */

import { supabase } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/date"
import type { Profile, UserState } from "../types"
import { getState, setState, clearState } from "../state"
import { validateName, validatePhoneNumber, validateCNIC, isYesResponse, isNoResponse } from "../utils"
import { getStaffMenu } from "../menu"

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

  // Guard: profile must be linked to a unit
  if (!profile.unit_id) {
    clearState(phoneNumber)
    return `Unable to manage staff. Your profile is not linked to a unit.\n\nPlease contact building management.\n\nReply *0* for menu`
  }

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

Please try again.

Reply *0* for menu`
  } catch (error) {
    console.error("[Staff] Flow error:", error)
    return `❌ *Unable to Process*

Please try again shortly.

Reply *0* for menu`
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

Enter staff member's full name:

*B* to go back, *0* for menu`

    case "2": // View staff
      return await viewStaffList(profile, phoneNumber)

    case "3": // Edit staff
      return await initializeEditStaff(profile, phoneNumber)

    case "4": // Delete staff
      return await initializeDeleteStaff(profile, phoneNumber)

    default:
      return `❓ *Invalid Selection*

Please choose 1-4.

Reply *0* for menu`
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

Format: 03001234567

*B* to go back`
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
      return `⚠️ *Duplicate Entry*

This phone is already in your staff list.

Reply *0* for menu`
    }

    userState.staff!.phone = phoneValidation.normalized!
    userState.step = "staff_add_cnic"
    setState(phoneNumber, userState)
    return `🆔 *Enter CNIC*

Format: 13 digits
Example: 1234512345671

*B* to go back`
  }

  if (userState.step === "staff_add_cnic") {
    const cnicValidation = validateCNIC(message)
    if (!cnicValidation.valid) {
      return cnicValidation.error!
    }

    userState.staff!.cnic = cnicValidation.normalized!
    userState.step = "staff_add_role_select"
    setState(phoneNumber, userState)
    return `👔 *Select Role*

1. 🚗 Driver
2. 👨‍🍳 Cook
3. 🧹 Maid
4. 🔧 Plumber
5. ⚡ Electrician
6. 🛠️ Maintenance
7. 🔒 Security Guard
8. 📋 Other

Reply 1-8, or *B* to go back`
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

Enter role name (3-30 characters):
Examples: Gardener, Helper

*B* to go back`
    }

    return `❓ *Invalid Selection*

Please choose 1-8.

*B* to go back`
  }

  if (userState.step === "staff_add_role_custom") {
    if (message.trim().length < 3 || message.trim().length > 30) {
      return `❌ *Invalid Role*

Must be 3-30 characters.

*B* to go back`
    }

    userState.staff!.role = message.trim()
    return await createStaffMember(profile, userState, phoneNumber)
  }

  return `❌ *Something Went Wrong*

Please try again.

Reply *0* for menu`
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
      return `❌ *Unable to Add Staff*

Please try again.

Reply *0* for menu`
    }

    clearState(phoneNumber)
    return `✅ *Staff Member Added*

👤 ${staff.name}
🆔 ${staff.cnic}
📱 ${staff.phone}
👔 ${staff.role}

📌 Please submit their CNIC to maintenance for card issuance.

Reply *0* for menu`
  } catch (error) {
    console.error("[Staff] Creation error:", error)
    return `❌ *Unable to Add Staff*

Please try again.

Reply *0* for menu`
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
      .eq("unit_id", profile.unit_id!)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[Staff] Fetch error:", error)
      return `❌ *Unable to Load Staff*

Please try again.

Reply *0* for menu`
    }

    if (!staffList || staffList.length === 0) {
      return `📋 *No Staff Found*

You haven't added any staff yet.

Reply *0* for menu`
    }

    const listText = staffList
      .map(
        (s, i) => `${i + 1}. 👤 ${s.name}
   • Role: ${s.role}
   • Phone: ${s.phone_number}`
      )
      .join("\n\n")

    clearState(phoneNumber)
    return `📋 *Your Staff*

${listText}

Reply *0* for menu`
  } catch (error) {
    console.error("[Staff] View error:", error)
    return `❌ *Unable to Load Staff*

Please try again.

Reply *0* for menu`
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
      .eq("unit_id", profile.unit_id!)
      .order("created_at", { ascending: false })

    if (error || !staffList || staffList.length === 0) {
      return `📋 *No Staff Found*

No staff members to delete.

Reply *0* for menu`
    }

    const userState = getState(phoneNumber)
    userState.step = "staff_delete_list"
    userState.staffList = staffList
    setState(phoneNumber, userState)

    const listText = staffList.map((s, i) => `${i + 1}. ${s.name} (${s.role})`).join("\n")

    return `🗑️ *Remove Staff*

${listText}

Reply with number to remove, or *0* for menu`
  } catch (error) {
    console.error("[Staff] Delete init error:", error)
    return `❌ *Unable to Load Staff*

Please try again.

Reply *0* for menu`
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

Please choose 1-${userState.staffList!.length}

Reply *0* for menu`
    }

    const selectedStaff = userState.staffList![staffIndex - 1]
      ; (userState as any).selectedStaff = selectedStaff
    userState.step = "staff_delete_confirm"
    setState(phoneNumber, userState)

    return `⚠️ *Confirm Removal*

👤 ${selectedStaff.name}
🆔 ${selectedStaff.cnic}
📱 ${selectedStaff.phone_number}

Remove this staff member?

1. ✅ Yes, remove
2. ❌ No, cancel

Reply *1* or *2*`
  }

  if (userState.step === "staff_delete_confirm") {
    if (isYesResponse(message)) {
      const selectedStaff = (userState as any).selectedStaff
      const { error } = await supabase.from("staff").delete().eq("id", selectedStaff.id)

      if (error) {
        console.error("[Staff] Deletion error:", error)
        return `❌ *Removal Failed*

Please try again.

Reply *0* for menu`
      }

      clearState(phoneNumber)
      return `✅ *Staff Removed*

${selectedStaff.name} removed from your list.

Reply *0* for menu`
    }

    if (isNoResponse(message)) {
      clearState(phoneNumber)
      return `✅ *Removal Cancelled*

Staff list unchanged.

Reply *0* for menu`
    }

    return `❓ *Invalid Response*

Reply *1* (Yes) or *2* (No)

Reply *0* for menu`
  }

  return `❌ *Something Went Wrong*

Please try again.

Reply *0* for menu`
}

/**
 * Initialize edit staff flow
 */
async function initializeEditStaff(profile: Profile, phoneNumber: string): Promise<string> {
  try {
    const { data: staffList, error } = await supabase
      .from("staff")
      .select("*")
      .eq("unit_id", profile.unit_id!)
      .order("created_at", { ascending: false })

    if (error || !staffList || staffList.length === 0) {
      return `📋 *No Staff Found*

No staff members to edit.

Reply *0* for menu`
    }

    const userState = getState(phoneNumber)
    userState.step = "staff_edit_list"
    userState.staffList = staffList
    setState(phoneNumber, userState)

    const listText = staffList.map((s, i) => `${i + 1}. ${s.name} (${s.role})`).join("\n")

    return `✏️ *Edit Staff*

${listText}

Reply with number to edit, or *0* for menu`
  } catch (error) {
    console.error("[Staff] Edit init error:", error)
    return `❌ *Unable to Load Staff*

Please try again.

Reply *0* for menu`
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

Please choose 1-${userState.staffList!.length}

Reply *0* for menu`
    }

    const selectedStaff = userState.staffList![staffIndex - 1]
      ; (userState as any).selectedStaff = selectedStaff
    userState.step = "staff_edit_field"
    setState(phoneNumber, userState)

    return `✏️ *Edit: ${selectedStaff.name}*

1. 👤 Name
2. 🆔 CNIC
3. 📱 Phone

Reply 1-3`
  }

  if (userState.step === "staff_edit_field") {
    const fields: Record<string, string> = { "1": "name", "2": "cnic", "3": "phone_number" }
    const prompts: Record<string, string> = {
      "1": `📝 *Update Name*

Enter new name for ${(userState as any).selectedStaff.name}:

*B* to go back`,
      "2": `🆔 *Update CNIC*

Enter new 13-digit CNIC:

*B* to go back`,
      "3": `📱 *Update Phone*

Enter new phone (e.g., 03001234567):

*B* to go back`,
    }

    if (fields[choice]) {
      ; (userState as any).editField = fields[choice]
      userState.step = "staff_edit_value"
      setState(phoneNumber, userState)
      return prompts[choice]
    }

    return `❓ *Invalid Selection*

Please choose 1, 2, or 3.

Reply *0* for menu`
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

Enter exactly 13 digits.

*B* to go back`
      }
    } else if (editField === "phone_number") {
      newValue = newValue.replace(/[-\s]/g, "")
      if (!/^03\d{9}$/.test(newValue)) {
        return `❌ *Invalid Phone*

Enter valid mobile number (e.g., 03001234567).

*B* to go back`
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

Please try again.

Reply *0* for menu`
    }

    const fieldNames: Record<string, string> = {
      name: "Name",
      cnic: "CNIC",
      phone_number: "Phone",
    }

    clearState(phoneNumber)
    return `✅ *Staff Updated*

${fieldNames[editField]} changed to: ${newValue}

Reply *0* for menu`
  }

  return `❌ *Something Went Wrong*

Please try again.

Reply *0* for menu`
}

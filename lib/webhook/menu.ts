/**
 * Menu Functions
 * Display menus and information screens
 */

import type { Profile } from "./types"
import {
  MAIN_MENU_OPTIONS,
  HALL_MENU_OPTIONS,
  STAFF_MENU_OPTIONS,
  EMERGENCY_CONTACTS,
  COMPLAINT_CATEGORIES,
  STAFF_ROLES,
} from "./config"
import { formatDate, formatCurrency, buildNumberedList } from "./utils"
import { getMessage } from "./messages"
import { MSG } from "./message-keys"

/**
 * Get main menu display
 */
export async function getMainMenu(name: string): Promise<string> {
  const options = MAIN_MENU_OPTIONS.map(
    (opt) => `${opt.key}. ${opt.emoji} ${opt.label}`
  ).join("\n")

  return await getMessage(MSG.MAIN_MENU, { name, options })
}

/**
 * Get user profile info display
 */
export async function getProfileInfo(profile: Profile): Promise<string> {
  const paymentStatus = profile.maintenance_paid ? "✅ Paid" : "❌ Unpaid"
  const lastPayment = profile.last_payment_date
    ? formatDate(profile.last_payment_date)
    : "No payment recorded"

  return await getMessage(MSG.PROFILE_INFO, {
    name: profile.name,
    apartment_number: profile.apartment_number,
    phone_number: profile.phone_number,
    building_block: profile.building_block || "Not specified",
    payment_status: paymentStatus,
    maintenance_charges: formatCurrency(profile.maintenance_charges || 0),
    last_payment: lastPayment,
  })
}

/**
 * Get maintenance status display
 */
export async function getMaintenanceStatus(profile: Profile): Promise<string> {
  const paymentStatus = profile.maintenance_paid ? "✅ Paid" : "❌ Unpaid"
  const lastPayment = profile.last_payment_date
    ? formatDate(profile.last_payment_date)
    : "No payment recorded"

  let statusMessage = await getMessage(MSG.MAINTENANCE_STATUS, {
    apartment_number: profile.apartment_number,
    maintenance_charges: formatCurrency(profile.maintenance_charges || 0),
    payment_status: paymentStatus,
    last_payment: lastPayment,
  })

  if (!profile.maintenance_paid) {
    statusMessage += "\n\n" + await getMessage(MSG.MAINTENANCE_PAYMENT_DUE)
  }

  statusMessage += "\n\nReply *0* for menu"

  return statusMessage
}

/**
 * Get emergency contacts display
 */
export async function getEmergencyContacts(): Promise<string> {
  const contacts = EMERGENCY_CONTACTS.map(
    (c) => `• ${c.name}: ${c.number}`
  ).join("\n")

  return await getMessage(MSG.EMERGENCY_CONTACTS, { contacts })
}

/**
 * Get hall booking menu
 */
export async function getHallMenu(): Promise<string> {
  const options = HALL_MENU_OPTIONS.map(
    (opt) => `${opt.key}. ${opt.emoji} ${opt.label}`
  ).join("\n")

  return await getMessage(MSG.HALL_MENU, { options })
}

/**
 * Get staff management menu
 */
export async function getStaffMenu(): Promise<string> {
  const options = STAFF_MENU_OPTIONS.map(
    (opt) => `${opt.key}. ${opt.emoji} ${opt.label}`
  ).join("\n")

  return await getMessage(MSG.STAFF_MENU, { options })
}

/**
 * Get complaint category selection menu
 */
export async function getComplaintCategoryMenu(): Promise<string> {
  return await getMessage(MSG.COMPLAINT_CATEGORY_MENU, {
    apartment_emoji: COMPLAINT_CATEGORIES.apartment.emoji,
    apartment_label: COMPLAINT_CATEGORIES.apartment.label,
    building_emoji: COMPLAINT_CATEGORIES.building.emoji,
    building_label: COMPLAINT_CATEGORIES.building.label,
  })
}

/**
 * Get apartment complaint subcategory menu
 */
export async function getApartmentSubcategoryMenu(): Promise<string> {
  const subcategories = COMPLAINT_CATEGORIES.apartment.subcategories
    .map((s, i) => `${i + 1}. ${s.emoji} ${s.label}`)
    .join("\n")

  return await getMessage(MSG.COMPLAINT_APARTMENT_SUBCATEGORY, {
    subcategories,
    max: String(COMPLAINT_CATEGORIES.apartment.subcategories.length),
  })
}

/**
 * Get building complaint subcategory menu
 */
export async function getBuildingSubcategoryMenu(): Promise<string> {
  const subcategories = COMPLAINT_CATEGORIES.building.subcategories
    .map((s, i) => `${i + 1}. ${s.emoji} ${s.label}`)
    .join("\n")

  return await getMessage(MSG.COMPLAINT_BUILDING_SUBCATEGORY, {
    subcategories,
    max: String(COMPLAINT_CATEGORIES.building.subcategories.length),
  })
}

/**
 * Get tower selection menu
 */
export function getTowerSelectionMenu(): string {
  return `🏗️ *Select Tower*

1. Tower A
2. Tower B
3. Tower C
4. Tower D

Reply 1-4, or *B* to go back`
}

/**
 * Get staff role selection menu
 */
export async function getStaffRoleMenu(): Promise<string> {
  const roles = STAFF_ROLES.map((r, i) => `${i + 1}. ${r.emoji} ${r.label}`).join("\n")

  return await getMessage(MSG.STAFF_ADD_ROLE, {
    roles,
    max: String(STAFF_ROLES.length),
  })
}

/**
 * Format booking list for display
 */
export function formatBookingsList(bookings: any[]): string {
  if (bookings.length === 0) {
    return "You don't have any bookings."
  }

  return bookings
    .map((b, i) => {
      const date = formatDate(b.booking_date)
      const status = b.status === "confirmed" ? "✅" : b.status === "pending" ? "⏳" : "❌"
      return `${i + 1}. ${date} | ${status} ${b.status}`
    })
    .join("\n")
}

/**
 * Format complaints list for display
 */
export function formatComplaintsList(complaints: any[]): string {
  if (complaints.length === 0) {
    return "You don't have any active complaints."
  }

  return complaints
    .map((c, i) => {
      const status =
        c.status === "pending"
          ? "⏳ Pending"
          : c.status === "in_progress"
            ? "🔄 In Progress"
            : c.status === "completed"
              ? "✅ Completed"
              : "❌ Rejected"
      const date = formatDate(c.created_at)
      return `${i + 1}. ${c.category} - ${c.subcategory}\n   Status: ${status} | Created: ${date}`
    })
    .join("\n\n")
}

/**
 * Format staff list for display
 */
export function formatStaffList(staff: any[]): string {
  if (staff.length === 0) {
    return "You haven't added any staff members yet."
  }

  return staff
    .map((s, i) => {
      return `${i + 1}. ${s.name}\n   Role: ${s.role} | Phone: ${s.phone_number}`
    })
    .join("\n\n")
}

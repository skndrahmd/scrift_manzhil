/**
 * Menu Functions
 * Display menus and information screens
 * Labels are fetched via getLabels() so they are translated when a language is active.
 */

import type { Profile } from "./types"
import {
  MAIN_MENU_OPTIONS,
  HALL_MENU_OPTIONS,
  STAFF_MENU_OPTIONS,
  EMERGENCY_CONTACTS,
  COMPLAINT_CATEGORIES,
} from "./config"
import { formatDate, formatCurrency } from "./utils"
import { getMessage, getLabels } from "./messages"
import { MSG } from "./message-keys"

/**
 * Ensure labels array matches config length exactly.
 * If labels are corrupted (wrong count), fall back to config labels entirely
 * to prevent shifted menus. Logs a warning for debugging.
 */
function safeLabels(
  labels: string[],
  config: { label: string }[],
  menuName: string
): string[] {
  if (labels.length === config.length) return labels

  console.warn(
    `[${menuName}] Label count mismatch: expected ${config.length}, got ${labels.length}. Using fallback labels.`
  )
  return config.map((item, i) => labels[i] || item.label)
}

/**
 * Get main menu display
 */
export async function getMainMenu(name: string, language?: string): Promise<string> {
  const rawLabels = await getLabels(MSG.LABELS_MAIN_MENU_OPTIONS, language)
  const labels = safeLabels(rawLabels, MAIN_MENU_OPTIONS, "MainMenu")
  const options = MAIN_MENU_OPTIONS.map(
    (opt, i) => `${opt.key}. ${opt.emoji} ${labels[i]}`
  ).join("\n")

  return await getMessage(MSG.MAIN_MENU, {
    name,
    options,
    max_option: String(MAIN_MENU_OPTIONS.length),
  }, language)
}

/**
 * Get user profile info display
 */
export async function getProfileInfo(profile: Profile, language?: string): Promise<string> {
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
  }, language)
}

/**
 * Get maintenance status display
 */
export async function getMaintenanceStatus(profile: Profile, language?: string): Promise<string> {
  const paymentStatus = profile.maintenance_paid ? "✅ Paid" : "❌ Unpaid"
  const lastPayment = profile.last_payment_date
    ? formatDate(profile.last_payment_date)
    : "No payment recorded"

  let statusMessage = await getMessage(MSG.MAINTENANCE_STATUS, {
    apartment_number: profile.apartment_number,
    maintenance_charges: formatCurrency(profile.maintenance_charges || 0),
    payment_status: paymentStatus,
    last_payment: lastPayment,
  }, language)

  if (!profile.maintenance_paid) {
    statusMessage += "\n\n" + await getMessage(MSG.MAINTENANCE_PAYMENT_DUE, undefined, language)
  }

  const replyMenu = await getMessage(MSG.LABELS_REPLY_MENU, undefined, language)
  statusMessage += "\n\n" + replyMenu

  return statusMessage
}

/**
 * Get emergency contacts display
 */
export async function getEmergencyContacts(language?: string): Promise<string> {
  const contacts = EMERGENCY_CONTACTS.map(
    (c) => `• ${c.name}: ${c.number}`
  ).join("\n")

  return await getMessage(MSG.EMERGENCY_CONTACTS, { contacts }, language)
}

/**
 * Get hall booking menu
 */
export async function getHallMenu(language?: string): Promise<string> {
  const rawLabels = await getLabels(MSG.LABELS_HALL_MENU_OPTIONS, language)
  const labels = safeLabels(rawLabels, HALL_MENU_OPTIONS, "HallMenu")
  const options = HALL_MENU_OPTIONS.map(
    (opt, i) => `${opt.key}. ${opt.emoji} ${labels[i]}`
  ).join("\n")

  return await getMessage(MSG.HALL_MENU, { options }, language)
}

/**
 * Get staff management menu
 */
export async function getStaffMenu(language?: string): Promise<string> {
  const rawLabels = await getLabels(MSG.LABELS_STAFF_MENU_OPTIONS, language)
  const labels = safeLabels(rawLabels, STAFF_MENU_OPTIONS, "StaffMenu")
  const options = STAFF_MENU_OPTIONS.map(
    (opt, i) => `${opt.key}. ${opt.emoji} ${labels[i]}`
  ).join("\n")

  return await getMessage(MSG.STAFF_MENU, { options }, language)
}

/**
 * Get complaint category selection menu
 */
export async function getComplaintCategoryMenu(language?: string): Promise<string> {
  const labels = await getLabels(MSG.LABELS_COMPLAINT_CATEGORIES, language)
  return await getMessage(MSG.COMPLAINT_CATEGORY_MENU, {
    apartment_emoji: COMPLAINT_CATEGORIES.apartment.emoji,
    apartment_label: labels[0] || COMPLAINT_CATEGORIES.apartment.label,
    building_emoji: COMPLAINT_CATEGORIES.building.emoji,
    building_label: labels[1] || COMPLAINT_CATEGORIES.building.label,
  }, language)
}

/**
 * Get apartment complaint subcategory menu
 */
export async function getApartmentSubcategoryMenu(language?: string): Promise<string> {
  const labels = await getLabels(MSG.LABELS_APARTMENT_SUBCATEGORIES, language)
  const subcategories = COMPLAINT_CATEGORIES.apartment.subcategories
    .map((s, i) => `${i + 1}. ${s.emoji} ${labels[i] || s.label}`)
    .join("\n")

  return await getMessage(MSG.COMPLAINT_APARTMENT_SUBCATEGORY, {
    subcategories,
    max: String(COMPLAINT_CATEGORIES.apartment.subcategories.length),
  }, language)
}

/**
 * Get building complaint subcategory menu
 */
export async function getBuildingSubcategoryMenu(language?: string): Promise<string> {
  const labels = await getLabels(MSG.LABELS_BUILDING_SUBCATEGORIES, language)
  const subcategories = COMPLAINT_CATEGORIES.building.subcategories
    .map((s, i) => `${i + 1}. ${s.emoji} ${labels[i] || s.label}`)
    .join("\n")

  return await getMessage(MSG.COMPLAINT_BUILDING_SUBCATEGORY, {
    subcategories,
    max: String(COMPLAINT_CATEGORIES.building.subcategories.length),
  }, language)
}

/**
 * Get tower selection menu
 */
export async function getTowerSelectionMenu(language?: string): Promise<string> {
  const labels = await getLabels(MSG.LABELS_TOWER_SELECTION, language)
  const options = ["A", "B", "C", "D"]
    .map((key, i) => `${i + 1}. ${labels[i] || `Tower ${key}`}`)
    .join("\n")

  return `🏗️ *Select Tower*

${options}

Reply 1-4, or *B* to go back`
}

/**
 * Get staff role selection menu
 * Note: The role list here (8 items) matches the handler's selection logic,
 * which differs from the STAFF_ROLES config (6 items used elsewhere).
 */
export async function getStaffRoleMenu(language?: string): Promise<string> {
  const ROLE_EMOJIS = ["🚗", "👨‍🍳", "🧹", "🔧", "⚡", "🛠️", "🔒", "📋"]
  const labels = await getLabels(MSG.LABELS_STAFF_ROLES, language)
  const roles = labels
    .map((label, i) => `${i + 1}. ${ROLE_EMOJIS[i] || "📋"} ${label}`)
    .join("\n")

  return await getMessage(MSG.STAFF_ADD_ROLE, {
    roles,
    max: String(labels.length),
  }, language)
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

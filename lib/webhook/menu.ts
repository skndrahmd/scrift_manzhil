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

// Divider constant for consistent styling
const DIVIDER = "───────────────────"

/**
 * Get main menu display
 */
export function getMainMenu(name: string): string {
  const options = MAIN_MENU_OPTIONS.map(
    (opt) => `${opt.key}. ${opt.emoji} ${opt.label}`
  ).join("\n")

  return `Hello ${name}! 👋

Welcome to *Manzhil* — Your Building Management Assistant

${DIVIDER}

${options}

${DIVIDER}

Reply with your choice (1-8)`
}

/**
 * Get user profile info display
 */
export function getProfileInfo(profile: Profile): string {
  const paymentStatus = profile.maintenance_paid ? "✅ Paid" : "❌ Unpaid"
  const lastPayment = profile.last_payment_date
    ? formatDate(profile.last_payment_date)
    : "No payment recorded"

  return `👤 *Your Profile*

${DIVIDER}
📋 *Personal Details*
${DIVIDER}

• Name: ${profile.name}
• Apartment: ${profile.apartment_number}
• Phone: ${profile.phone_number}
• Building: ${profile.building_block || "Not specified"}

${DIVIDER}
💰 *Maintenance Status*
${DIVIDER}

• Status: ${paymentStatus}
• Monthly Charges: ${formatCurrency(profile.maintenance_charges || 0)}
• Last Payment: ${lastPayment}

${DIVIDER}
Reply *0* for the main menu`
}

/**
 * Get maintenance status display
 */
export function getMaintenanceStatus(profile: Profile): string {
  const paymentStatus = profile.maintenance_paid ? "✅ Paid" : "❌ Unpaid"
  const lastPayment = profile.last_payment_date
    ? formatDate(profile.last_payment_date)
    : "No payment recorded"

  let statusMessage = `💰 *Maintenance Status*

${DIVIDER}
📋 *Payment Details*
${DIVIDER}

• Apartment: ${profile.apartment_number}
• Monthly Charges: ${formatCurrency(profile.maintenance_charges || 0)}
• Status: ${paymentStatus}
• Last Payment: ${lastPayment}`

  if (!profile.maintenance_paid) {
    statusMessage += `

${DIVIDER}
⚠️ *Payment Due*
${DIVIDER}

Your maintenance payment is pending. Please complete the payment at your earliest convenience to avoid service interruptions.`
  }

  statusMessage += `

${DIVIDER}
Reply *0* for the main menu`

  return statusMessage
}

/**
 * Get emergency contacts display
 */
export function getEmergencyContacts(): string {
  const contacts = EMERGENCY_CONTACTS.map(
    (c) => `• ${c.name}: ${c.number}`
  ).join("\n")

  return `🆘 *Emergency Contacts*

${DIVIDER}

${contacts}

${DIVIDER}
Reply *0* for the main menu`
}

/**
 * Get hall booking menu
 */
export function getHallMenu(): string {
  const options = HALL_MENU_OPTIONS.map(
    (opt) => `${opt.key}. ${opt.emoji} ${opt.label}`
  ).join("\n")

  return `🏛️ *Community Hall Management*

${DIVIDER}

${options}

${DIVIDER}
Reply with your choice, or *0* for main menu`
}

/**
 * Get staff management menu
 */
export function getStaffMenu(): string {
  const options = STAFF_MENU_OPTIONS.map(
    (opt) => `${opt.key}. ${opt.emoji} ${opt.label}`
  ).join("\n")

  return `👥 *Staff Management*

${DIVIDER}

${options}

${DIVIDER}
Reply with your choice, or *0* for main menu`
}

/**
 * Get complaint category selection menu
 */
export function getComplaintCategoryMenu(): string {
  return `📝 *Register a Complaint*

${DIVIDER}
📂 *Select Category*
${DIVIDER}

1. ${COMPLAINT_CATEGORIES.apartment.emoji} ${COMPLAINT_CATEGORIES.apartment.label}
2. ${COMPLAINT_CATEGORIES.building.emoji} ${COMPLAINT_CATEGORIES.building.label}

${DIVIDER}
Reply *1* or *2*, or *0* for main menu`
}

/**
 * Get apartment complaint subcategory menu
 */
export function getApartmentSubcategoryMenu(): string {
  const subcategories = COMPLAINT_CATEGORIES.apartment.subcategories
    .map((s, i) => `${i + 1}. ${s.emoji} ${s.label}`)
    .join("\n")

  return `🏠 *Apartment Complaint*

${DIVIDER}
📋 *Select Issue Type*
${DIVIDER}

${subcategories}

${DIVIDER}
Reply with number, or *B* to go back`
}

/**
 * Get building complaint subcategory menu
 */
export function getBuildingSubcategoryMenu(): string {
  const subcategories = COMPLAINT_CATEGORIES.building.subcategories
    .map((s, i) => `${i + 1}. ${s.emoji} ${s.label}`)
    .join("\n")

  return `🏢 *Building Complaint*

${DIVIDER}
📋 *Select Issue Type*
${DIVIDER}

${subcategories}

${DIVIDER}
Reply with number, or *B* to go back`
}

/**
 * Get tower selection menu
 */
export function getTowerSelectionMenu(): string {
  return `🏗️ *Select Tower*

${DIVIDER}

1. Tower A
2. Tower B
3. Tower C
4. Tower D

${DIVIDER}
Reply with number, or *B* to go back`
}

/**
 * Get staff role selection menu
 */
export function getStaffRoleMenu(): string {
  const roles = STAFF_ROLES.map((r, i) => `${i + 1}. ${r.emoji} ${r.label}`).join("\n")

  return `👤 *Select Staff Role*

${DIVIDER}

${roles}

${DIVIDER}
Reply with number, or *B* to go back`
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

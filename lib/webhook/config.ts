/**
 * Webhook Configuration
 * Centralized configuration for the WhatsApp webhook system
 */

import { getComplaintNotificationRecipients } from "@/lib/admin/notifications"

/**
 * Get dynamic complaint notification recipients from the admin panel
 * Returns empty array if no recipients are configured
 */
export async function getComplaintRecipients(): Promise<string[]> {
  return getComplaintNotificationRecipients()
}

/**
 * Template SIDs from environment variables
 */
export const TEMPLATE_SIDS = {
  newComplaint: process.env.TWILIO_NEW_COMPLAINT_TEMPLATE_SID,
  pendingComplaint: process.env.TWILIO_PENDING_COMPLAINT_TEMPLATE_SID,
  complaintRegistered: process.env.TWILIO_COMPLAINT_REGISTERED_TEMPLATE_SID,
  accountBlocked: process.env.TWILIO_ACCOUNT_BLOCKED_TEMPLATE_SID,
  accountReactivated: process.env.TWILIO_ACCOUNT_REACTIVATED_TEMPLATE_SID,
}

/**
 * Cache duration for booking settings (5 minutes)
 */
export const SETTINGS_CACHE_DURATION = 5 * 60 * 1000

/**
 * Complaint categories and their subcategories
 */
export const COMPLAINT_CATEGORIES = {
  apartment: {
    label: "My Apartment Complaint",
    emoji: "🏠",
    subcategories: [
      { key: "plumbing", label: "Plumbing", emoji: "🔧" },
      { key: "electric", label: "Electric", emoji: "⚡" },
      { key: "civil", label: "Civil", emoji: "🔨" },
      { key: "appliances", label: "Appliances", emoji: "🔌" },
      { key: "other", label: "Other", emoji: "📋" },
    ],
  },
  building: {
    label: "Building Complaint",
    emoji: "🏢",
    subcategories: [
      { key: "lift_elevator", label: "Lift/Elevator", emoji: "🛗" },
      { key: "gym", label: "Gym", emoji: "💪" },
      { key: "snooker_room", label: "Snooker Room", emoji: "🎱" },
      { key: "play_area", label: "Play Area", emoji: "🎮" },
      { key: "parking", label: "Parking", emoji: "🚗" },
      { key: "security", label: "Security Complaint", emoji: "🔒" },
      { key: "plumbing", label: "Plumbing", emoji: "🔧" },
      { key: "electric", label: "Electric", emoji: "⚡" },
      { key: "civil", label: "Civil", emoji: "🔨" },
      { key: "collaboration_corner", label: "Collaboration Corner", emoji: "🤝" },
      { key: "seating_area", label: "Seating Area", emoji: "🪑" },
      { key: "other", label: "Other", emoji: "📋" },
    ],
  },
}

/**
 * Building towers for complaint location
 */
export const BUILDING_TOWERS = [
  { key: "A", label: "Tower A" },
  { key: "B", label: "Tower B" },
  { key: "C", label: "Tower C" },
  { key: "D", label: "Tower D" },
]

/**
 * Staff roles
 */
export const STAFF_ROLES = [
  { key: "driver", label: "Driver", emoji: "🚗" },
  { key: "maid", label: "Maid", emoji: "🧹" },
  { key: "cook", label: "Cook", emoji: "👨‍🍳" },
  { key: "nanny", label: "Nanny", emoji: "👶" },
  { key: "guard", label: "Guard", emoji: "💂" },
  { key: "other", label: "Other", emoji: "👤" },
]

/**
 * Main menu options
 */
export const MAIN_MENU_OPTIONS = [
  { key: "1", label: "Register Complaint", emoji: "📝" },
  { key: "2", label: "Check Complaint Status", emoji: "🔍" },
  { key: "3", label: "Cancel Complaint", emoji: "❌" },
  { key: "4", label: "My Staff Management", emoji: "👥" },
  { key: "5", label: "Check Maintenance Dues", emoji: "💰" },
  { key: "6", label: "Community Hall", emoji: "🏛️" },
  { key: "7", label: "Visitor Entry Pass", emoji: "🎫" },
  { key: "8", label: "View My Profile", emoji: "👤" },
  { key: "9", label: "Suggestions/Feedback", emoji: "💬" },
  { key: "10", label: "Emergency Contacts", emoji: "🆘" },
]

/**
 * Hall menu options
 */
export const HALL_MENU_OPTIONS = [
  { key: "1", label: "New Booking", emoji: "📅" },
  { key: "2", label: "Cancel Booking", emoji: "❌" },
  { key: "3", label: "Edit Booking", emoji: "✏️" },
  { key: "4", label: "View My Bookings", emoji: "📋" },
]

/**
 * Staff menu options
 */
export const STAFF_MENU_OPTIONS = [
  { key: "1", label: "Add Staff Member", emoji: "➕" },
  { key: "2", label: "View My Staff", emoji: "👁️" },
  { key: "3", label: "Edit Staff Member", emoji: "✏️" },
  { key: "4", label: "Remove Staff Member", emoji: "🗑️" },
]

/**
 * Emergency contacts
 */
export const EMERGENCY_CONTACTS = [
  { name: "Security Office", number: "+92-XXX-XXXXXXX" },
  { name: "Maintenance", number: "+92-XXX-XXXXXXX" },
  { name: "Management", number: "+92-XXX-XXXXXXX" },
  { name: "Fire Emergency", number: "16" },
  { name: "Police", number: "15" },
  { name: "Ambulance", number: "115" },
]

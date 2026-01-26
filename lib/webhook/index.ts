/**
 * Webhook Module Index
 * Main entry point for the WhatsApp webhook conversation system
 *
 * Usage:
 *   import { processMessage, getProfile } from "@/lib/webhook"
 */

// Main router
export { processMessage } from "./router"

// Profile and settings
export {
  getProfile,
  getCachedSettings,
  clearSettingsCache,
  hasUnpaidMaintenance,
  getActiveComplaints,
  getUserBookings,
  getUserStaff,
  getBookingsForDate,
} from "./profile"

// State management
export {
  getState,
  setState,
  updateState,
  clearState,
  hasActiveFlow,
  getAllStates,
  clearAllStates,
} from "./state"

// Menu functions
export {
  getMainMenu,
  getProfileInfo,
  getMaintenanceStatus,
  getEmergencyContacts,
  getHallMenu,
  getStaffMenu,
  getComplaintCategoryMenu,
  getApartmentSubcategoryMenu,
  getBuildingSubcategoryMenu,
  getTowerSelectionMenu,
  getStaffRoleMenu,
  formatBookingsList,
  formatComplaintsList,
  formatStaffList,
} from "./menu"

// Utilities
export {
  isBackCommand,
  isYesResponse,
  isNoResponse,
  isMainMenuCommand,
  parseSelection,
  validateName,
  validatePhoneNumber,
  validateCNIC,
  validateRole,
  formatTime,
  formatTimeDisplay,
  formatDate,
  formatDateTime,
  formatCurrency,
  formatSubcategory,
  generateTimeSlots,
  createXmlResponse,
  escapeXml,
  buildNumberedList,
  backInstruction,
} from "./utils"

// Configuration
export {
  COMPLAINT_NOTIFICATION_NUMBERS,
  TEMPLATE_SIDS,
  SETTINGS_CACHE_DURATION,
  COMPLAINT_CATEGORIES,
  BUILDING_TOWERS,
  STAFF_ROLES,
  MAIN_MENU_OPTIONS,
  HALL_MENU_OPTIONS,
  STAFF_MENU_OPTIONS,
  EMERGENCY_CONTACTS,
} from "./config"

// Types
export type {
  FlowType,
  ComplaintData,
  BookingData,
  StaffData,
  UserState,
  TimeSlot,
  Profile,
  BookingSettings,
  ValidationResult,
  HandlerResponse,
  FlowHandler,
} from "./types"

// Individual handlers (for advanced usage)
export {
  initializeComplaintFlow,
  handleComplaintFlow,
  initializeBookingFlow,
  handleBookingFlow,
  initializeStaffFlow,
  handleStaffFlow,
  initializeFeedbackFlow,
  handleFeedbackFlow,
  initializeHallFlow,
  handleHallFlow,
  initializeStatusFlow,
  handleStatusFlow,
  initializeCancelFlow,
  handleCancelFlow,
} from "./handlers"

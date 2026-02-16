/**
 * Twilio Module Index
 * Main entry point for all Twilio-related functionality
 *
 * Usage:
 *   import { sendBookingConfirmation } from "@/lib/twilio"
 *   import { sendMessage, sendTemplate } from "@/lib/twilio"
 *   import type { TwilioResult } from "@/lib/twilio"
 */

// Re-export types
export type {
  TwilioResult,
  TemplateType,
  BaseNotificationParams,
  MaintenanceInvoiceParams,
  MaintenanceReminderParams,
  MaintenancePaymentConfirmedParams,
  BookingConfirmationParams,
  BookingReminderParams,
  BookingCancelledParams,
  ComplaintRegisteredParams,
  ComplaintStatusParams,
  WelcomeMessageParams,
  AccountBlockedParams,
  AccountReactivatedParams,
  WhatsAppTemplate,
  TemplateVariable,
} from "./types"

// Re-export client utilities
export { getClient, getFromNumber, formatPhoneNumber, isConfigured } from "./client"

// Re-export template utilities
export { TEMPLATE_SIDS, getTemplateSid, isTemplateConfigured, getConfiguredTemplates } from "./templates"

// Re-export core send functions
export { sendMessage, sendTemplate, sendWithFallback } from "./send"

// Re-export formatters
export {
  formatDate,
  formatDateLong,
  formatTime,
  formatMonthYear,
  formatCurrency,
  formatDateTime,
  getTodayString,
  formatSubcategory,
} from "./formatters"

// Re-export all notification functions
export {
  // Maintenance
  sendMaintenanceInvoice,
  sendMaintenanceReminder,
  sendMaintenancePaymentConfirmed,
  // Booking
  sendBookingConfirmation,
  sendBookingReminder,
  sendBookingCancelled,
  // Complaint
  sendComplaintRegistered,
  sendComplaintInProgress,
  sendComplaintCompleted,
  sendComplaintRejected,
  sendComplaintPending,
  // Account
  sendWelcomeMessage,
  sendAccountBlocked,
  sendAccountReactivated,
} from "./notifications"

// Legacy exports for backward compatibility during migration
// These can be removed once all API routes are updated
export { sendMessage as sendWhatsAppMessage } from "./send"
export { sendTemplate as sendWhatsAppTemplate } from "./send"

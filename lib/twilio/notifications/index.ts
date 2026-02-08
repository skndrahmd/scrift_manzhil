/**
 * Notifications Index
 * Re-exports all notification modules for easy importing
 */

// Maintenance notifications
export {
  sendMaintenanceInvoice,
  sendMaintenanceReminder,
  sendMaintenancePaymentConfirmed,
} from "./maintenance"

// Booking notifications
export {
  sendBookingConfirmation,
  sendBookingReminder,
  sendBookingCancelled,
} from "./booking"

// Complaint notifications
export {
  sendComplaintRegistered,
  sendComplaintInProgress,
  sendComplaintCompleted,
  sendComplaintRejected,
  sendComplaintPending,
} from "./complaint"

// Account notifications
export {
  sendWelcomeMessage,
  sendAccountBlocked,
  sendAccountReactivated,
  sendOtpMessage,
  sendStaffInvitation,
} from "./account"

// Broadcast notifications
export { sendBroadcastAnnouncement } from "./broadcast"

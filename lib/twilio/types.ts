/**
 * Twilio Types & Interfaces
 * Centralized type definitions for WhatsApp notifications
 */

// Result type for all Twilio operations
export interface TwilioResult {
  ok: boolean
  sid?: string
  error?: string
}

// Template types matching env var names
export type TemplateType =
  | "maintenance_invoice"
  | "maintenance_payment_reminder"
  | "maintenance_payment_confirmed"
  | "booking_payment_confirmed"
  | "booking_payment_reminder"
  | "booking_cancelled"
  | "complaint_registered"
  | "complaint_in_progress"
  | "complaint_completed"
  | "complaint_rejected"
  | "welcome_message"
  | "account_blocked_maintenance"
  | "account_reactivated"
  | "broadcast_announcement"
  | "parcel_arrival"
  | "visitor_arrival"
  | "otp_message"
  | "staff_invitation"

// Base notification params (common to all)
export interface BaseNotificationParams {
  phone: string
  name: string
}

// Maintenance notification params
export interface MaintenanceInvoiceParams extends BaseNotificationParams {
  monthYear: string
  amount: number
  dueDate: string
  invoiceUrl: string
}

export interface MaintenanceReminderParams extends BaseNotificationParams {
  monthsList: string
  totalAmount: number
  invoiceUrl: string
}

export interface MaintenancePaymentConfirmedParams extends BaseNotificationParams {
  monthYear: string
  amount: number
  receiptUrl: string
}

// Booking notification params
export interface BookingConfirmationParams extends BaseNotificationParams {
  bookingDate: string
  startTime: string
  endTime: string
  amount: number
  bookingId: string
  invoiceUrl: string
}

export interface BookingReminderParams extends BaseNotificationParams {
  bookingDate: string
  startTime: string
  endTime: string
  hallType?: string
}

export interface BookingCancelledParams extends BaseNotificationParams {
  bookingDate: string
  startTime: string
  endTime: string
  reason?: string
}

// Complaint notification params
export interface ComplaintRegisteredParams extends BaseNotificationParams {
  complaintId: string
  category: string
  subcategory: string
  registeredTime: string
}

export interface ComplaintStatusParams extends BaseNotificationParams {
  complaintId: string
  subcategory: string
  registeredTime: string
  resolvedTime?: string
}

// Account notification params
export interface WelcomeMessageParams extends BaseNotificationParams {
  apartmentNumber: string
}

export interface AccountBlockedParams extends BaseNotificationParams {
  reason: string
  overdueMonths?: string
  totalDue?: number
}

export interface AccountReactivatedParams extends BaseNotificationParams {
  message?: string
}

// Broadcast notification params
export interface BroadcastAnnouncementParams extends BaseNotificationParams {
  variable1?: string  // Title
  variable2?: string  // Body
}

// OTP notification params
export interface OtpMessageParams {
  phone: string
  otp: string
}

// Staff invitation notification params
export interface StaffInvitationParams {
  phone: string
  name: string
  loginUrl: string
}

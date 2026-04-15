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
  | "parcel_collection"
  | "visitor_arrival"
  | "otp_message"
  | "staff_invitation"
  | "daily_report"
  | "pending_complaint"
  | "payment_approved"
  | "payment_rejected"
  | "admin_complaint_status_update"
  | "payment_received_admin"

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
  comment?: string
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

// WhatsApp Template Management types
export interface TemplateVariable {
  key: string        // "1", "2", etc. (Twilio numbered placeholders)
  label: string      // Human-readable: "Resident Name"
  description: string // "Full name of the resident"
  example: string    // "John Doe"
}

export interface WhatsAppTemplate {
  id: string
  template_key: string
  name: string
  description: string | null
  category: string
  template_sid: string | null
  env_var_name: string | null
  variables: TemplateVariable[]
  trigger_description: string | null
  trigger_source: string | null
  message_body_draft: string | null
  fallback_message: string | null
  is_active: boolean
  is_draft: boolean
  sort_order: number
  created_at: string
  updated_at: string
  updated_by: string | null
}

// Admin complaint status update notification params
export interface AdminComplaintStatusParams extends BaseNotificationParams {
  complaintId: string
  residentName: string
  apartmentNumber: string
  complaintType: string
  oldStatus: string
  newStatus: string
  updateTime: string
}

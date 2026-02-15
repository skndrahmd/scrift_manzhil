/**
 * @module lib/twilio/templates
 * Centralized registry of Twilio Content Template SIDs.
 * Maps template types to environment-configured HX SIDs.
 */

import type { TemplateType } from "./types"

/**
 * Template SID mapping - loads from environment variables
 * All template SIDs are HX... format from Twilio Content API
 */
export const TEMPLATE_SIDS: Record<TemplateType, string | undefined> = {
  // Maintenance templates
  maintenance_invoice: process.env.TWILIO_MAINTENANCE_INVOICE_TEMPLATE_SID,
  maintenance_payment_reminder: process.env.TWILIO_MAINTENANCE_PAYMENT_REMINDER_TEMPLATE_SID,
  maintenance_payment_confirmed: process.env.TWILIO_MAINTENANCE_PAYMENT_CONFIRMED_TEMPLATE_SID,

  // Booking templates
  booking_payment_confirmed: process.env.TWILIO_BOOKING_PAYMENT_CONFIRMED_TEMPLATE_SID,
  booking_payment_reminder: process.env.TWILIO_BOOKING_PAYMENT_REMINDER_TEMPLATE_SID,
  booking_cancelled: process.env.TWILIO_BOOKING_CANCELLED_TEMPLATE_SID,

  // Complaint templates
  complaint_registered: process.env.TWILIO_COMPLAINT_REGISTERED_TEMPLATE_SID,
  complaint_in_progress: process.env.TWILIO_COMPLAINT_IN_PROGRESS_TEMPLATE_SID,
  complaint_completed: process.env.TWILIO_COMPLAINT_COMPLETED_TEMPLATE_SID,
  complaint_rejected: process.env.TWILIO_COMPLAINT_REJECTED_TEMPLATE_SID,

  // Account templates
  welcome_message: process.env.TWILIO_WELCOME_TEMPLATE_SID,
  account_blocked_maintenance: process.env.TWILIO_ACCOUNT_BLOCKED_TEMPLATE_SID,
  account_reactivated: process.env.TWILIO_ACCOUNT_REACTIVATED_TEMPLATE_SID,

  // Broadcast templates
  broadcast_announcement: process.env.TWILIO_BROADCAST_ANNOUNCEMENT_TEMPLATE_SID,

  // Auth templates
  otp_message: process.env.TWILIO_OTP_TEMPLATE_SID,
  staff_invitation: process.env.TWILIO_STAFF_INVITATION_TEMPLATE_SID,
}

/**
 * Retrieves the Twilio Content Template SID for a given template type.
 * @param type - Template type key (e.g. "welcome_message", "maintenance_invoice")
 * @returns HX-prefixed SID string, or undefined if not configured
 */
export function getTemplateSid(type: TemplateType): string | undefined {
  return TEMPLATE_SIDS[type]
}

/**
 * Checks whether a template SID is set in environment variables.
 * @param type - Template type key to check
 * @returns True if the template SID is defined and non-empty
 */
export function isTemplateConfigured(type: TemplateType): boolean {
  return !!TEMPLATE_SIDS[type]
}

/**
 * Returns all template types that have a SID configured (useful for debugging).
 * @returns Array of TemplateType keys with non-empty SIDs
 */
export function getConfiguredTemplates(): TemplateType[] {
  return (Object.keys(TEMPLATE_SIDS) as TemplateType[]).filter(
    (key) => !!TEMPLATE_SIDS[key]
  )
}

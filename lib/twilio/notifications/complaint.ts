/**
 * Complaint Notifications
 * WhatsApp notifications for complaint status updates
 */

import { sendWithFallback } from "../send"
import { getTemplateSid } from "../templates"
import { formatSubcategory } from "../formatters"
import type { TwilioResult, ComplaintRegisteredParams, ComplaintStatusParams } from "../types"

/**
 * Send complaint registered notification
 * Sent when a new complaint is submitted
 */
export async function sendComplaintRegistered(
  params: ComplaintRegisteredParams
): Promise<TwilioResult> {
  const { phone, name, complaintId, category, subcategory, registeredTime } = params
  const subcategoryDisplay = formatSubcategory(subcategory)

  const templateSid = getTemplateSid("complaint_registered")
  // Template variables: 1=Name, 2=Subcategory, 3=ComplaintID, 4=RegisteredTime
  const templateVariables = {
    "1": name || "Resident",
    "2": subcategoryDisplay,
    "3": complaintId,
    "4": registeredTime,
  }

  const fallbackMessage = [
    "Hello, this is Manzhil by Scrift.",
    "",
    "Complaint Registered",
    "",
    `Hi ${name || "Resident"}, your ${subcategoryDisplay} complaint (${complaintId}) has been registered on ${registeredTime}.`,
    "",
    "The team will review and address this matter shortly.",
    "",
    "- Manzhil by Scrift Team",
  ].join("\n")

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

/**
 * Send complaint in-progress notification
 * Sent when a complaint status changes to in-progress
 */
export async function sendComplaintInProgress(
  params: ComplaintStatusParams
): Promise<TwilioResult> {
  const { phone, name, complaintId, subcategory, registeredTime } = params
  const subcategoryDisplay = formatSubcategory(subcategory)

  const templateSid = getTemplateSid("complaint_in_progress")
  // Template variables: 1=Name, 2=Subcategory, 3=ComplaintID, 4=RegisteredTime
  const templateVariables = {
    "1": name || "Resident",
    "2": subcategoryDisplay,
    "3": complaintId,
    "4": registeredTime,
  }

  const fallbackMessage = [
    "Hello, this is Manzhil by Scrift.",
    "",
    "Complaint In Progress",
    "",
    `Hi ${name || "Resident"}, your ${subcategoryDisplay} complaint (${complaintId}) registered on ${registeredTime} is now in progress.`,
    "",
    "The maintenance team is actively working to resolve this matter.",
    "",
    "- Manzhil by Scrift Team",
  ].join("\n")

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

/**
 * Send complaint completed notification
 * Sent when a complaint is resolved
 */
export async function sendComplaintCompleted(
  params: ComplaintStatusParams
): Promise<TwilioResult> {
  const { phone, name, complaintId, subcategory, registeredTime, resolvedTime } = params
  const subcategoryDisplay = formatSubcategory(subcategory)

  const templateSid = getTemplateSid("complaint_completed")
  // Template variables: 1=Name, 2=Subcategory, 3=ComplaintID, 4=RegisteredTime, 5=ResolvedTime
  const templateVariables = {
    "1": name || "Resident",
    "2": subcategoryDisplay,
    "3": complaintId,
    "4": registeredTime,
    "5": resolvedTime || new Date().toLocaleString(),
  }

  const fallbackMessage = [
    "Hello, this is Manzhil by Scrift.",
    "",
    "Complaint Resolved",
    "",
    `Hi ${name || "Resident"}, your ${subcategoryDisplay} complaint (${complaintId}) registered on ${registeredTime} has been resolved at ${resolvedTime || "now"}.`,
    "",
    "If you require further assistance, please contact us.",
    "",
    "- Manzhil by Scrift Team",
  ].join("\n")

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

/**
 * Send complaint rejected/cancelled notification
 * Sent when a complaint is cancelled
 */
export async function sendComplaintRejected(
  params: ComplaintStatusParams
): Promise<TwilioResult> {
  const { phone, name, complaintId, subcategory, registeredTime } = params
  const subcategoryDisplay = formatSubcategory(subcategory)

  const templateSid = getTemplateSid("complaint_rejected")
  // Template variables: 1=Name, 2=Subcategory, 3=ComplaintID, 4=RegisteredTime
  const templateVariables = {
    "1": name || "Resident",
    "2": subcategoryDisplay,
    "3": complaintId,
    "4": registeredTime,
  }

  const fallbackMessage = [
    "Hello, this is Manzhil by Scrift.",
    "",
    "Complaint Cancelled",
    "",
    `Hi ${name || "Resident"}, your ${subcategoryDisplay} complaint (${complaintId}) registered on ${registeredTime} has been cancelled.`,
    "",
    "If this was unexpected or you require further assistance, please contact us.",
    "",
    "- Manzhil by Scrift Team",
  ].join("\n")

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

/**
 * Send complaint pending notification
 * Sent for status update to pending (rarely used)
 */
export async function sendComplaintPending(
  params: ComplaintStatusParams
): Promise<TwilioResult> {
  const { phone, name, complaintId, subcategory, registeredTime } = params
  const subcategoryDisplay = formatSubcategory(subcategory)

  // No specific template for pending status, use fallback
  const fallbackMessage = [
    "Hello, this is Manzhil by Scrift.",
    "",
    "Complaint Status Update",
    "",
    `Hi ${name || "Resident"}, your ${subcategoryDisplay} complaint (${complaintId}) registered on ${registeredTime} is currently pending review.`,
    "",
    "The team will address this matter shortly.",
    "",
    "- Manzhil by Scrift Team",
  ].join("\n")

  // Use sendWithFallback with undefined template to always use fallback
  return sendWithFallback(phone, undefined, {}, fallbackMessage)
}

/**
 * Complaint Notifications
 * WhatsApp notifications for complaint status updates
 */

import { sendWithFallback } from "../send"
import { getTemplateSid } from "../templates"
import { formatSubcategory } from "../formatters"
import type { TwilioResult, ComplaintRegisteredParams, ComplaintStatusParams, AdminComplaintStatusParams } from "../types"

/**
 * Send complaint registered notification
 * Sent when a new complaint is submitted
 */
export async function sendComplaintRegistered(
  params: ComplaintRegisteredParams
): Promise<TwilioResult> {
  const { phone, name, complaintId, category, subcategory, registeredTime } = params
  const subcategoryDisplay = formatSubcategory(subcategory)

  const templateSid = await getTemplateSid("complaint_registered")
  const templateVariables = {
    "1": name || "Resident",
    "2": subcategoryDisplay,
    "3": complaintId,
    "4": registeredTime,
  }

  const fallbackMessage = `✅ *Complaint Registered*

📋 ID: ${complaintId}
🔧 Type: ${subcategoryDisplay}
📅 Registered: ${registeredTime}

Hi ${name || "Resident"}, your complaint has been submitted. We'll address it shortly.

— Manzhil`

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

  const templateSid = await getTemplateSid("complaint_in_progress")
  const templateVariables = {
    "1": name || "Resident",
    "2": subcategoryDisplay,
    "3": complaintId,
    "4": registeredTime,
  }

  const fallbackMessage = `🔧 *Complaint In Progress*

📋 ID: ${complaintId}
🔧 Type: ${subcategoryDisplay}
📅 Registered: ${registeredTime}

Hi ${name || "Resident"}, your complaint is now being worked on.

— Manzhil`

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

  const templateSid = await getTemplateSid("complaint_completed")
  const templateVariables = {
    "1": name || "Resident",
    "2": subcategoryDisplay,
    "3": complaintId,
    "4": registeredTime,
    "5": resolvedTime || new Date().toLocaleString(),
  }

  const fallbackMessage = `✅ *Complaint Resolved*

📋 ID: ${complaintId}
🔧 Type: ${subcategoryDisplay}
📅 Registered: ${registeredTime}
✅ Resolved: ${resolvedTime || "Now"}

Hi ${name || "Resident"}, your complaint has been resolved. Contact us if you need further help.

— Manzhil`

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

  const templateSid = await getTemplateSid("complaint_rejected")
  const templateVariables = {
    "1": name || "Resident",
    "2": subcategoryDisplay,
    "3": complaintId,
    "4": registeredTime,
  }

  const fallbackMessage = `❌ *Complaint Cancelled*

📋 ID: ${complaintId}
🔧 Type: ${subcategoryDisplay}
📅 Registered: ${registeredTime}

Hi ${name || "Resident"}, your complaint has been cancelled. Contact us if this was unexpected.

— Manzhil`

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

  const fallbackMessage = `⏳ *Complaint Status Update*

📋 ID: ${complaintId}
🔧 Type: ${subcategoryDisplay}
📅 Registered: ${registeredTime}
📊 Status: Pending Review

Hi ${name || "Resident"}, your complaint is pending review. We'll address it shortly.

— Manzhil`

  return sendWithFallback(phone, undefined, {}, fallbackMessage)
}

/**
 * Send admin complaint status update notification
 * Sent to admins when a complaint status changes
 */
export async function sendAdminComplaintStatusUpdate(
  params: AdminComplaintStatusParams
): Promise<TwilioResult> {
  const { phone, name, complaintId, residentName, apartmentNumber, complaintType, oldStatus, newStatus, updateTime } = params
  const complaintTypeDisplay = formatSubcategory(complaintType)

  // Format status for display
  const formatStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      "pending": "Pending",
      "in-progress": "In Progress",
      "completed": "Completed",
      "cancelled": "Cancelled"
    }
    return statusMap[status] || status
  }

  const templateSid = await getTemplateSid("admin_complaint_status_update")
  const templateVariables = {
    "1": name || "Admin",
    "2": complaintId,
    "3": residentName || "Resident",
    "4": apartmentNumber,
    "5": complaintTypeDisplay,
    "6": formatStatus(oldStatus),
    "7": formatStatus(newStatus),
    "8": updateTime,
  }

  const fallbackMessage = `📋 *Complaint Status Updated*

Complaint ID: ${complaintId}
Resident: ${residentName || "Resident"} (Apt ${apartmentNumber})
Type: ${complaintTypeDisplay}

Status: ${formatStatus(oldStatus)} → ${formatStatus(newStatus)}
Updated: ${updateTime}

— Manzhil`

  return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}

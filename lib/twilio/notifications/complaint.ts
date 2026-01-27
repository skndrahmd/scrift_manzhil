/**
 * Complaint Notifications
 * WhatsApp notifications for complaint status updates
 */

import { sendWithFallback } from "../send"
import { getTemplateSid } from "../templates"
import { formatSubcategory } from "../formatters"
import type { TwilioResult, ComplaintRegisteredParams, ComplaintStatusParams } from "../types"

// Divider constant for consistent styling
const DIVIDER = "───────────────────"

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

  const fallbackMessage = `✅ *Complaint Registered*

${DIVIDER}
📋 *Your Complaint*
${DIVIDER}

• ID: ${complaintId}
• Type: ${subcategoryDisplay}
• Registered: ${registeredTime}

${DIVIDER}

Hi ${name || "Resident"}, your complaint has been submitted successfully.

Our team will review and address this matter shortly.

${DIVIDER}
— Manzhil by Scrift`

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

  const fallbackMessage = `🔧 *Complaint In Progress*

${DIVIDER}
📋 *Complaint Details*
${DIVIDER}

• ID: ${complaintId}
• Type: ${subcategoryDisplay}
• Registered: ${registeredTime}

${DIVIDER}
📊 *Status Update*
${DIVIDER}

Hi ${name || "Resident"}, your complaint is now being addressed.

Our maintenance team is actively working to resolve this matter.

${DIVIDER}
— Manzhil by Scrift`

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

  const fallbackMessage = `✅ *Complaint Resolved*

${DIVIDER}
📋 *Complaint Details*
${DIVIDER}

• ID: ${complaintId}
• Type: ${subcategoryDisplay}
• Registered: ${registeredTime}
• Resolved: ${resolvedTime || "Now"}

${DIVIDER}

Hi ${name || "Resident"}, your complaint has been successfully resolved.

If you require further assistance, please contact us.

${DIVIDER}
— Manzhil by Scrift`

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

  const fallbackMessage = `❌ *Complaint Cancelled*

${DIVIDER}
📋 *Complaint Details*
${DIVIDER}

• ID: ${complaintId}
• Type: ${subcategoryDisplay}
• Registered: ${registeredTime}

${DIVIDER}

Hi ${name || "Resident"}, your complaint has been cancelled.

If this was unexpected or you require further assistance, please contact us.

${DIVIDER}
— Manzhil by Scrift`

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

${DIVIDER}
📋 *Complaint Details*
${DIVIDER}

• ID: ${complaintId}
• Type: ${subcategoryDisplay}
• Registered: ${registeredTime}
• Status: Pending Review

${DIVIDER}

Hi ${name || "Resident"}, your complaint is currently pending review.

Our team will address this matter shortly.

${DIVIDER}
— Manzhil by Scrift`

  // Use sendWithFallback with undefined template to always use fallback
  return sendWithFallback(phone, undefined, {}, fallbackMessage)
}

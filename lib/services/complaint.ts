/**
 * @module complaint
 * Service layer for complaint status management with optimistic locking
 * and WhatsApp notification dispatch to residents and admins.
 */
import { supabaseAdmin } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/date"
import { getComplaintStatusUpdateRecipients } from "@/lib/admin/notifications"
import {
  sendComplaintInProgress,
  sendComplaintCompleted,
  sendComplaintRejected,
  sendComplaintPending,
  sendAdminComplaintStatusUpdate,
  formatDateTime,
} from "@/lib/twilio"

const ALLOWED_STATUSES = ["pending", "in-progress", "completed", "cancelled"] as const
type ComplaintStatus = (typeof ALLOWED_STATUSES)[number]

/**
 * Custom error class for service-layer failures with HTTP status codes.
 * Used across all service modules for consistent error handling.
 */
export class ServiceError extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

/**
 * Updates a complaint's status with optimistic locking and sends
 * the appropriate WhatsApp notification to the resident.
 * @param complaintId - UUID of the complaint record to update
 * @param status - New status: "pending" | "in-progress" | "completed" | "cancelled"
 * @returns Object with `{ success: true }` on successful update
 * @throws {ServiceError} 400 if payload is invalid, 404 if complaint not found, 409 on concurrent modification
 */
export async function updateComplaintStatus(complaintId: string, status: string) {
  if (!complaintId || !status || !ALLOWED_STATUSES.includes(status as ComplaintStatus)) {
    throw new ServiceError("Invalid request payload", 400)
  }

  // Fetch complaint data
  const { data: complaint, error: fetchError } = await supabaseAdmin
    .from("complaints")
    .select(
      `
      id,
      complaint_id,
      status,
      category,
      subcategory,
      description,
      profile_id,
      created_at,
      updated_at
    `
    )
    .eq("id", complaintId)
    .single()

  if (fetchError || !complaint) {
    throw new ServiceError("Complaint not found", 404)
  }

  // Store original updated_at for optimistic locking
  const originalUpdatedAt = complaint.updated_at

  // Fetch profile separately (more reliable than join)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("name, phone_number, apartment_number")
    .eq("id", complaint.profile_id)
    .single()

  if (profileError) {
    console.error("[COMPLAINT UPDATE] Profile fetch error:", profileError)
  }

  // Store old status before update
  const oldStatus = complaint.status

  // Optimistic locking: only update if record hasn't changed since we read it
  const { data: updateResult, error: updateError } = await supabaseAdmin
    .from("complaints")
    .update({ status, updated_at: getPakistanISOString() })
    .eq("id", complaintId)
    .eq("updated_at", originalUpdatedAt)
    .select()

  if (updateError) throw updateError

  // If no rows were updated, the record was modified by another process
  if (!updateResult || updateResult.length === 0) {
    throw new ServiceError(
      "Record was modified by another process. Please refresh and try again.",
      409,
      "CONCURRENT_MODIFICATION"
    )
  }

  // Send WhatsApp notification
  if (profile?.phone_number) {
    const createdAt = new Date(complaint.created_at || Date.now())
    const resolvedAt = new Date()
    const createdTime = formatDateTime(createdAt)
    const resolvedTime = formatDateTime(resolvedAt)

    const notificationParams = {
      phone: profile.phone_number,
      name: profile.name || "Resident",
      complaintId: complaint.complaint_id,
      subcategory: complaint.subcategory,
      registeredTime: createdTime,
      resolvedTime: resolvedTime,
    }

    try {
      if (status === "completed") {
        await sendComplaintCompleted(notificationParams)
      } else if (status === "in-progress") {
        await sendComplaintInProgress(notificationParams)
      } else if (status === "cancelled") {
        await sendComplaintRejected(notificationParams)
      } else {
        await sendComplaintPending(notificationParams)
      }
      console.log("[COMPLAINT UPDATE] WhatsApp notification sent successfully")
    } catch (notifyError) {
      console.error("[COMPLAINT UPDATE] Failed to send complaint status notification:", notifyError)
    }
  } else {
    console.warn("[COMPLAINT UPDATE] No phone number found for profile, skipping notification")
  }

  // Notify admins who opted in for complaint status updates
  try {
    const adminRecipients = await getComplaintStatusUpdateRecipients()
    if (adminRecipients.length > 0) {
      const updateTime = formatDateTime(new Date())
      const adminNotificationParams = {
        complaintId: complaint.complaint_id,
        residentName: profile?.name || "Resident",
        apartmentNumber: profile?.apartment_number || "N/A",
        complaintType: complaint.subcategory,
        oldStatus,
        newStatus: status,
        updateTime,
      }

      // Send notifications to all opted-in admins
      const notificationPromises = adminRecipients.map(async (phone) => {
        try {
          await sendAdminComplaintStatusUpdate({
            phone,
            name: "Admin",
            ...adminNotificationParams,
          })
        } catch (err) {
          console.error(`[COMPLAINT UPDATE] Failed to notify admin ${phone}:`, err)
        }
      })

      await Promise.all(notificationPromises)
      console.log(`[COMPLAINT UPDATE] Notified ${adminRecipients.length} admins about status change`)
    }
  } catch (adminNotifyError) {
    console.error("[COMPLAINT UPDATE] Failed to send admin notifications:", adminNotifyError)
  }

  return { success: true }
}

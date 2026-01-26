/**
 * Status and Cancel Flow Handlers
 * Handles complaint status checking and cancellation flows
 */

import { supabase } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/dateUtils"
import type { Profile, UserState } from "../types"
import { getState, setState, clearState } from "../state"
import { formatDate, formatSubcategory, isYesResponse, isNoResponse } from "../utils"
import { getActiveComplaints } from "../profile"

/**
 * Initialize status check flow
 */
export async function initializeStatusFlow(
  profile: Profile,
  phoneNumber: string
): Promise<string> {
  const complaints = await getActiveComplaints(profile.id)

  if (!complaints || complaints.length === 0) {
    return `📋 You don't have any active complaints.

All your complaints have been resolved or you haven't registered any yet.

Type 0 to return to the main menu`
  }

  setState(phoneNumber, {
    step: "status_select",
    type: "status",
    statusItems: complaints,
  })

  const listText = complaints
    .map((c, i) => {
      const statusEmoji =
        c.status === "pending" ? "⏳" : c.status === "in_progress" ? "🔄" : "✅"
      return `${i + 1}. ${statusEmoji} ${formatSubcategory(c.subcategory)}
   ID: ${c.complaint_id}`
    })
    .join("\n\n")

  return `🔍 *Check Complaint Status*

Your active complaints:

${listText}

Reply with the number to view details, or type 0 for main menu`
}

/**
 * Handle status flow steps
 */
export async function handleStatusFlow(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState
): Promise<string> {
  const choice = message.trim()

  if (userState.step === "status_select") {
    const complaintIndex = parseInt(choice, 10)
    if (
      isNaN(complaintIndex) ||
      complaintIndex < 1 ||
      complaintIndex > userState.statusItems!.length
    ) {
      return `❓ That's not a valid selection.

Please choose a number from 1-${userState.statusItems!.length}

Type 0 for the main menu`
    }

    const complaint = userState.statusItems![complaintIndex - 1]
    clearState(phoneNumber)

    const statusText =
      complaint.status === "pending"
        ? "⏳ Pending - Awaiting review"
        : complaint.status === "in_progress"
        ? "🔄 In Progress - Being worked on"
        : complaint.status === "completed"
        ? "✅ Completed - Issue resolved"
        : "❌ Rejected"

    const registeredAt = new Date(complaint.created_at)
    const formattedDate = registeredAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Karachi",
    })

    return `📋 *Complaint Details*

🎫 ID: ${complaint.complaint_id}
📂 Category: ${complaint.category === "apartment" ? "Apartment" : "Building"}
🔧 Type: ${formatSubcategory(complaint.subcategory)}
📝 Description: ${complaint.description || "No description provided"}

📊 Status: ${statusText}
📅 Registered: ${formattedDate}

${complaint.admin_notes ? `📝 Admin Notes: ${complaint.admin_notes}` : ""}

Type 0 to return to the main menu`
  }

  return "❌ Oops! Something went wrong. Type 0 to return to the main menu."
}

/**
 * Initialize cancel complaint flow
 */
export async function initializeCancelFlow(
  profile: Profile,
  phoneNumber: string
): Promise<string> {
  // Only fetch pending complaints (can't cancel in_progress or completed)
  const { data: complaints, error } = await supabase
    .from("complaints")
    .select("*")
    .eq("profile_id", profile.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (error || !complaints || complaints.length === 0) {
    return `📋 You don't have any pending complaints that can be cancelled.

Only pending complaints (not yet being worked on) can be cancelled.

Type 0 to return to the main menu`
  }

  setState(phoneNumber, {
    step: "cancel_select",
    type: "cancel",
    cancelItems: complaints,
  })

  const listText = complaints
    .map(
      (c, i) => `${i + 1}. ${formatSubcategory(c.subcategory)}
   ID: ${c.complaint_id}
   Registered: ${formatDate(c.created_at)}`
    )
    .join("\n\n")

  return `❌ *Cancel Complaint*

Select the complaint to cancel:

${listText}

Reply with the number, or type 0 for main menu`
}

/**
 * Handle cancel flow steps
 */
export async function handleCancelFlow(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState
): Promise<string> {
  const choice = message.trim()

  if (userState.step === "cancel_select") {
    const complaintIndex = parseInt(choice, 10)
    if (
      isNaN(complaintIndex) ||
      complaintIndex < 1 ||
      complaintIndex > userState.cancelItems!.length
    ) {
      return `❓ That's not a valid selection.

Please choose a number from 1-${userState.cancelItems!.length}

Type 0 for the main menu`
    }

    const selectedComplaint = userState.cancelItems![complaintIndex - 1]
    ;(userState as any).selectedComplaint = selectedComplaint
    userState.step = "cancel_confirm"
    setState(phoneNumber, userState)

    return `⚠️ Are you sure you want to cancel this complaint?

🎫 ID: ${selectedComplaint.complaint_id}
🔧 Type: ${formatSubcategory(selectedComplaint.subcategory)}
📝 Description: ${selectedComplaint.description || "No description"}

Reply with:
1 - Yes, cancel it
2 - No, keep it`
  }

  if (userState.step === "cancel_confirm") {
    if (isYesResponse(message)) {
      const selectedComplaint = (userState as any).selectedComplaint

      const { error } = await supabase
        .from("complaints")
        .update({
          status: "cancelled",
          updated_at: getPakistanISOString(),
        })
        .eq("id", selectedComplaint.id)

      if (error) {
        console.error("[Status] Cancel error:", error)
        return `❌ I'm sorry, I couldn't cancel the complaint right now.

Please try again or type 0 for the main menu`
      }

      clearState(phoneNumber)
      return `✅ Complaint Cancelled

Your complaint (${selectedComplaint.complaint_id}) has been cancelled.

Type 0 to return to the main menu`
    }

    if (isNoResponse(message)) {
      clearState(phoneNumber)
      return `Cancellation aborted. Your complaint remains active.

Type 0 to return to the main menu`
    }

    return `❓ Invalid Response

Please reply with:
1 - Yes
2 - No`
  }

  return "❌ Oops! Something went wrong. Type 0 to return to the main menu."
}

/**
 * Status and Cancel Flow Handlers
 * Handles complaint status checking and cancellation flows
 */

import { supabase } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/date"
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
    return `📋 *No Active Complaints*

You don't have any active complaints. All resolved or none registered yet.

Reply *0* for menu`
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

  return `🔍 *Complaint Status*

${listText}

Reply with number to view, or *0* for menu`
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
      return `❓ *Invalid Selection*

Please choose 1-${userState.statusItems!.length}

Reply *0* for menu`
    }

    const complaint = userState.statusItems![complaintIndex - 1]
    clearState(phoneNumber)

    const statusText =
      complaint.status === "pending"
        ? "⏳ Pending — Awaiting review"
        : complaint.status === "in_progress"
          ? "🔄 In Progress — Being worked on"
          : complaint.status === "completed"
            ? "✅ Completed — Issue resolved"
            : "❌ Cancelled"

    const registeredAt = new Date(complaint.created_at)
    const formattedDate = registeredAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Karachi",
    })

    let response = `📋 *Complaint Details*

🎫 ID: ${complaint.complaint_id}
🔧 Type: ${formatSubcategory(complaint.subcategory)}
📝 ${complaint.description || "No description"}
📅 Registered: ${formattedDate}

📊 Status: ${statusText}`

    if ((complaint as any).admin_notes) {
      response += `

📝 Admin Notes: ${(complaint as any).admin_notes}`
    }

    response += `

Reply *0* for menu`

    return response
  }

  return `❌ *Something Went Wrong*

Please try again.

Reply *0* for menu`
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
    return `📋 *No Cancellable Complaints*

No pending complaints to cancel. Only pending complaints can be cancelled.

Reply *0* for menu`
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

${listText}

Reply with number to cancel, or *0* for menu`
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
      return `❓ *Invalid Selection*

Please choose 1-${userState.cancelItems!.length}

Reply *0* for menu`
    }

    const selectedComplaint = userState.cancelItems![complaintIndex - 1]
      ; (userState as any).selectedComplaint = selectedComplaint
    userState.step = "cancel_confirm"
    setState(phoneNumber, userState)

    return `⚠️ *Confirm Cancellation*

📋 ID: ${selectedComplaint.complaint_id}
🔧 Type: ${formatSubcategory(selectedComplaint.subcategory)}
📝 ${selectedComplaint.description || "No description"}

Cancel this complaint?

1. ✅ Yes, cancel
2. ❌ No, keep

Reply *1* or *2*`
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
        return `❌ *Cancellation Failed*

Please try again.

Reply *0* for menu`
      }

      clearState(phoneNumber)
      return `✅ *Complaint Cancelled*

Complaint ${selectedComplaint.complaint_id} has been cancelled.

Reply *0* for menu`
    }

    if (isNoResponse(message)) {
      clearState(phoneNumber)
      return `✅ *Cancellation Aborted*

Your complaint remains active. No changes made.

Reply *0* for menu`
    }

    return `❓ *Invalid Response*

Reply *1* (Yes) or *2* (No)

Reply *0* for menu`
  }

  return `❌ *Something Went Wrong*

Please try again.

Reply *0* for menu`
}

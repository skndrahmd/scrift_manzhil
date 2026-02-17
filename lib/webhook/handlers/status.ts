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
import { getMessage } from "../messages"
import { MSG } from "../message-keys"

/**
 * Initialize status check flow
 */
export async function initializeStatusFlow(
  profile: Profile,
  phoneNumber: string,
  language?: string
): Promise<string> {
  const complaints = await getActiveComplaints(profile.id)

  if (!complaints || complaints.length === 0) {
    return await getMessage(MSG.STATUS_NO_COMPLAINTS, undefined, language)
  }

  setState(phoneNumber, {
    step: "status_select",
    type: "status",
    statusItems: complaints,
    language,
  })

  const listText = complaints
    .map((c, i) => {
      const statusEmoji =
        c.status === "pending" ? "⏳" : c.status === "in_progress" ? "🔄" : "✅"
      return `${i + 1}. ${statusEmoji} ${formatSubcategory(c.subcategory)}
   ID: ${c.complaint_id}`
    })
    .join("\n\n")

  return await getMessage(MSG.STATUS_LIST, { list: listText }, language)
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
  const language = userState.language

  if (userState.step === "status_select") {
    const complaintIndex = parseInt(choice, 10)
    if (
      isNaN(complaintIndex) ||
      complaintIndex < 1 ||
      complaintIndex > userState.statusItems!.length
    ) {
      return await getMessage(MSG.STATUS_INVALID_SELECTION, {
        max: userState.statusItems!.length,
      }, language)
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

    let response = await getMessage(MSG.STATUS_DETAIL, {
      complaint_id: complaint.complaint_id,
      subcategory: formatSubcategory(complaint.subcategory),
      description: complaint.description || "No description",
      date: formattedDate,
      status_text: statusText,
    }, language)

    if ((complaint as any).admin_notes) {
      response += `

📝 Admin Notes: ${(complaint as any).admin_notes}`
    }

    response += `

Reply *0* for menu`

    return response
  }

  return await getMessage(MSG.ERROR_SOMETHING_WRONG, undefined, language)
}

/**
 * Initialize cancel complaint flow
 */
export async function initializeCancelFlow(
  profile: Profile,
  phoneNumber: string,
  language?: string
): Promise<string> {
  // Only fetch pending complaints (can't cancel in_progress or completed)
  const { data: complaints, error } = await supabase
    .from("complaints")
    .select("*")
    .eq("profile_id", profile.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (error || !complaints || complaints.length === 0) {
    return await getMessage(MSG.CANCEL_NO_COMPLAINTS, undefined, language)
  }

  setState(phoneNumber, {
    step: "cancel_select",
    type: "cancel",
    cancelItems: complaints,
    language,
  })

  const listText = complaints
    .map(
      (c, i) => `${i + 1}. ${formatSubcategory(c.subcategory)}
   ID: ${c.complaint_id}
   Registered: ${formatDate(c.created_at)}`
    )
    .join("\n\n")

  return await getMessage(MSG.CANCEL_LIST, { list: listText }, language)
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
  const language = userState.language

  if (userState.step === "cancel_select") {
    const complaintIndex = parseInt(choice, 10)
    if (
      isNaN(complaintIndex) ||
      complaintIndex < 1 ||
      complaintIndex > userState.cancelItems!.length
    ) {
      return await getMessage(MSG.STATUS_INVALID_SELECTION, {
        max: userState.cancelItems!.length,
      }, language)
    }

    const selectedComplaint = userState.cancelItems![complaintIndex - 1]
      ; (userState as any).selectedComplaint = selectedComplaint
    userState.step = "cancel_confirm"
    setState(phoneNumber, userState)

    return await getMessage(MSG.CANCEL_CONFIRM, {
      complaint_id: selectedComplaint.complaint_id,
      subcategory: formatSubcategory(selectedComplaint.subcategory),
      description: selectedComplaint.description || "No description",
    }, language)
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
        return await getMessage(MSG.CANCEL_FAILED, undefined, language)
      }

      clearState(phoneNumber)
      return await getMessage(MSG.CANCEL_SUCCESS, {
        complaint_id: selectedComplaint.complaint_id,
      }, language)
    }

    if (isNoResponse(message)) {
      clearState(phoneNumber)
      return await getMessage(MSG.CANCEL_ABORTED, undefined, language)
    }

    return await getMessage(MSG.CANCEL_INVALID_RESPONSE, undefined, language)
  }

  return await getMessage(MSG.ERROR_SOMETHING_WRONG, undefined, language)
}

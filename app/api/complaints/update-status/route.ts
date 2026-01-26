import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/dateUtils"
import {
  sendComplaintInProgress,
  sendComplaintCompleted,
  sendComplaintRejected,
  sendComplaintPending,
  formatDateTime,
} from "@/lib/twilio"

const ALLOWED_STATUSES = ["pending", "in-progress", "completed", "cancelled"] as const
type ComplaintStatus = (typeof ALLOWED_STATUSES)[number]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const complaintId = body?.complaintId as string | undefined
    const status = body?.status as ComplaintStatus | undefined

    if (!complaintId || !status || !ALLOWED_STATUSES.includes(status)) {
      return new Response(JSON.stringify({ error: "Invalid request payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Fetch complaint data
    const { data: complaint, error: fetchError } = await supabase
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
        created_at
      `
      )
      .eq("id", complaintId)
      .single()

    if (fetchError || !complaint) {
      console.error("[COMPLAINT UPDATE] Complaint not found:", fetchError)
      return new Response(JSON.stringify({ error: "Complaint not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Fetch profile separately (more reliable than join)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("name, phone_number")
      .eq("id", complaint.profile_id)
      .single()

    if (profileError) {
      console.error("[COMPLAINT UPDATE] Profile fetch error:", profileError)
    }

    const { error: updateError } = await supabase
      .from("complaints")
      .update({ status, updated_at: getPakistanISOString() })
      .eq("id", complaintId)

    if (updateError) throw updateError

    console.log("[COMPLAINT UPDATE] Profile data:", {
      hasProfile: !!profile,
      phone_number: profile?.phone_number,
      name: profile?.name,
      complaintId: complaint.complaint_id,
      newStatus: status
    })

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

      console.log("[COMPLAINT UPDATE] Sending notification:", {
        to: profile.phone_number,
        complaintId: complaint.complaint_id,
        status,
      })

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

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Complaint status update error:", error)
    return new Response(JSON.stringify({ error: "Unable to update complaint status" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

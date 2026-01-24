import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/dateUtils"
import { sendWhatsAppMessage, sendWhatsAppTemplate } from "@/lib/twilio"

const COMPLAINT_IN_PROGRESS_TEMPLATE_SID = process.env.TWILIO_COMPLAINT_IN_PROGRESS_TEMPLATE_SID
const COMPLAINT_COMPLETED_TEMPLATE_SID = process.env.TWILIO_COMPLAINT_COMPLETED_TEMPLATE_SID
const COMPLAINT_REJECTED_TEMPLATE_SID = process.env.TWILIO_COMPLAINT_REJECTED_TEMPLATE_SID

const ALLOWED_STATUSES = ["pending", "in-progress", "completed", "cancelled"] as const
type ComplaintStatus = (typeof ALLOWED_STATUSES)[number]

function statusLabel(status: ComplaintStatus) {
  switch (status) {
    case "pending":
      return "Pending"
    case "in-progress":
      return "In Progress"
    case "completed":
      return "Completed"
    case "cancelled":
      return "Cancelled"
    default:
      return status
  }
}

type ComplaintWithProfiles = {
  id: string
  complaint_id: string
  status: ComplaintStatus
  category: string
  subcategory: string
  description: string
  profile_id: string
  profiles: { name: string; phone_number: string }[] // array from Supabase
}

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

    // 🔍 DEBUG: Log profile data
    console.log("[COMPLAINT UPDATE] Profile data:", {
      hasProfile: !!profile,
      phone_number: profile?.phone_number,
      name: profile?.name,
      complaintId: complaint.complaint_id,
      newStatus: status
    })

    if (profile?.phone_number) {
      const residentName = profile.name || "Resident"
      const complaintId = complaint.complaint_id
      
      // Format subcategory for display
      const subcategoryDisplay = complaint.subcategory
        .split('_')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      
      // Format timestamps
      const createdAt = new Date(complaint.created_at || Date.now())
      const resolvedAt = new Date()
      
      const formatTime = (date: Date) => {
        return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Karachi'
        })
      }
      
      const createdTime = formatTime(createdAt)
      const resolvedTime = formatTime(resolvedAt)
      
      console.log("[COMPLAINT UPDATE] Attempting to send WhatsApp message:", {
        to: profile.phone_number,
        complaintId,
        status,
        subcategory: subcategoryDisplay
      })

      try {
        let templateSent = false
        
        // Try to send template based on status
        if (status === "completed" && COMPLAINT_COMPLETED_TEMPLATE_SID) {
          try {
            // Template variables: 1=Name, 2=Subcategory, 3=ComplaintID, 4=RegisteredTime, 5=ResolvedTime
            await sendWhatsAppTemplate(profile.phone_number, COMPLAINT_COMPLETED_TEMPLATE_SID, {
              "1": residentName,
              "2": subcategoryDisplay,
              "3": complaintId,
              "4": createdTime,
              "5": resolvedTime,
            })
            templateSent = true
          } catch (templateError) {
            console.error("[COMPLAINT UPDATE] Template failed, using fallback:", templateError)
          }
        } else if (status === "in-progress" && COMPLAINT_IN_PROGRESS_TEMPLATE_SID) {
          try {
            // Template variables: 1=Name, 2=Subcategory, 3=ComplaintID, 4=RegisteredTime
            await sendWhatsAppTemplate(profile.phone_number, COMPLAINT_IN_PROGRESS_TEMPLATE_SID, {
              "1": residentName,
              "2": subcategoryDisplay,
              "3": complaintId,
              "4": createdTime,
            })
            templateSent = true
          } catch (templateError) {
            console.error("[COMPLAINT UPDATE] Template failed, using fallback:", templateError)
          }
        } else if (status === "cancelled" && COMPLAINT_REJECTED_TEMPLATE_SID) {
          try {
            // Template variables: 1=Name, 2=Subcategory, 3=ComplaintID, 4=RegisteredTime
            await sendWhatsAppTemplate(profile.phone_number, COMPLAINT_REJECTED_TEMPLATE_SID, {
              "1": residentName,
              "2": subcategoryDisplay,
              "3": complaintId,
              "4": createdTime,
            })
            templateSent = true
          } catch (templateError) {
            console.error("[COMPLAINT UPDATE] Template failed, using fallback:", templateError)
          }
        }
        
        // Fallback to freeform message if template not sent
        if (!templateSent) {
          let fullMessage = ""
          
          if (status === "completed") {
            fullMessage = `✅ Complaint Resolved

Your ${subcategoryDisplay} complaint (${complaintId}) registered on ${createdTime} has been resolved at ${resolvedTime}.

If you require further assistance, please contact the management.

- Greens Three Management`
          } else if (status === "in-progress") {
            fullMessage = `🔄 Complaint In Progress

Your ${subcategoryDisplay} complaint (${complaintId}) registered on ${createdTime} is now in progress.

The maintenance team is actively working to resolve this matter.

- Greens Three Management`
          } else if (status === "cancelled") {
            fullMessage = `❌ Complaint Cancelled

Your ${subcategoryDisplay} complaint (${complaintId}) registered on ${createdTime} has been cancelled.

If this was unexpected or you require further assistance, please contact the management.

- Greens Three Management`
          } else {
            // pending status
            fullMessage = `📋 Complaint Status Update

Your ${subcategoryDisplay} complaint (${complaintId}) registered on ${createdTime} is currently pending review.

The management team will address this matter shortly.

- Greens Three Management`
          }
          
          await sendWhatsAppMessage(profile.phone_number, fullMessage)
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

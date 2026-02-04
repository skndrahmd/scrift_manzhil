import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { sendTemplate, sendMessage, formatSubcategory } from "@/lib/twilio"
import { getReminderRecipients } from "@/lib/admin/notifications"

const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://com3-bms.vercel.app").replace(/\/$/, "")
const PENDING_COMPLAINT_TEMPLATE_SID = process.env.TWILIO_PENDING_COMPLAINT_TEMPLATE_SID

export async function POST(request: NextRequest) {
  try {
    console.log("[PENDING COMPLAINTS] Starting reminder check...")

    // Get dynamic reminder recipients
    const REMINDER_RECIPIENTS = await getReminderRecipients()
    console.log(`[PENDING COMPLAINTS] Sending to ${REMINDER_RECIPIENTS.length} recipients`)

    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    // Fetch complaints that are pending for more than 24 hours
    const { data: pendingComplaints, error } = await supabase
      .from("complaints")
      .select("*, profiles(name, apartment_number)")
      .eq("status", "pending")
      .lt("created_at", twentyFourHoursAgo.toISOString())
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[PENDING COMPLAINTS] Error fetching complaints:", error)
      return new Response(
        JSON.stringify({ error: "Failed to fetch pending complaints" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    if (!pendingComplaints || pendingComplaints.length === 0) {
      console.log("[PENDING COMPLAINTS] No pending complaints found")
      return new Response(
        JSON.stringify({ success: true, message: "No pending complaints", count: 0 }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    console.log(`[PENDING COMPLAINTS] Found ${pendingComplaints.length} pending complaints`)

    // Send reminder for each pending complaint
    let sentCount = 0
    for (const complaint of pendingComplaints) {
      try {
        // Calculate hours pending
        const createdAt = new Date(complaint.created_at)
        const now = new Date()
        const hoursPending = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60))

        // Format category and subcategory
        const categoryText = complaint.category === "apartment" ? "Apartment Complaint" : "Building Complaint"
        const subcategoryText = formatSubcategory(complaint.subcategory)

        // Format registration date
        const formattedDate = createdAt.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'Asia/Karachi'
        })

        // Sanitize description for template (remove newlines, limit length)
        const sanitizedDescription = (complaint.description || "No description provided")
          .replace(/\n/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 500)

        // Template variables
        const templateVariables = {
          "1": complaint.complaint_id || "N/A",
          "2": complaint.profiles?.name || "Unknown",
          "3": complaint.profiles?.apartment_number || "N/A",
          "4": categoryText,
          "5": subcategoryText,
          "6": sanitizedDescription,
          "7": formattedDate,
          "8": String(hoursPending),
          "9": `${APP_BASE_URL}/admin`
        }

        // Fallback message
        const DIVIDER = "───────────────────"
        const fallbackMessage = `⚠️ *Pending Complaint Alert*

${DIVIDER}
📋 *Complaint Details*
${DIVIDER}

• ID: ${complaint.complaint_id}
• Resident: ${complaint.profiles?.name || "Unknown"}
• Apartment: ${complaint.profiles?.apartment_number || "N/A"}
• Category: ${categoryText}
• Type: ${subcategoryText}

${DIVIDER}
⏱️ *Status*
${DIVIDER}

• Registered: ${formattedDate}
• Pending for: *${hoursPending} hours*

📝 ${sanitizedDescription}

${DIVIDER}

Please review and address this complaint.

🔗 Admin Panel: ${APP_BASE_URL}/admin

${DIVIDER}
— Manzhil by Scrift`

        // Send reminder to all recipients
        for (const recipient of REMINDER_RECIPIENTS) {
          try {
            if (PENDING_COMPLAINT_TEMPLATE_SID) {
              const result = await sendTemplate(recipient, PENDING_COMPLAINT_TEMPLATE_SID, templateVariables)
              if (result.ok) {
                console.log(`[PENDING COMPLAINTS] Reminder sent to ${recipient} for ${complaint.complaint_id} (${hoursPending}h pending)`)
                continue
              }
            }
            // Fallback to plain text
            await sendMessage(recipient, fallbackMessage)
            console.log(`[PENDING COMPLAINTS] Sent fallback message to ${recipient} for ${complaint.complaint_id}`)
          } catch (error) {
            console.error(`[PENDING COMPLAINTS] Failed to send to ${recipient}:`, error)
          }
        }
        sentCount++
      } catch (error) {
        console.error(`[PENDING COMPLAINTS] Failed to send reminder for ${complaint.complaint_id}:`, error)
      }
    }

    console.log(`[PENDING COMPLAINTS] Sent ${sentCount}/${pendingComplaints.length} reminders`)

    return new Response(
      JSON.stringify({
        success: true,
        totalPending: pendingComplaints.length,
        remindersSent: sentCount
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("[PENDING COMPLAINTS] Error:", error)
    return new Response(
      JSON.stringify({ error: "Failed to process pending complaints" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}

// GET endpoint for Vercel cron jobs
export async function GET(request: NextRequest) {
  return POST(request)
}

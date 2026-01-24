import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { sendWhatsAppTemplate, sendWhatsAppMessage } from "@/lib/twilio"

const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://com3-bms.vercel.app").replace(/\/$/, "")
const PENDING_COMPLAINT_TEMPLATE_SID = process.env.TWILIO_PENDING_COMPLAINT_TEMPLATE_SID || "HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

// Reminder recipients (maintenance team)
const REMINDER_RECIPIENTS = ["+923071288183", "+923000777454", "+923232244009", "+923422546249", "+923242927342"]

export async function POST(request: NextRequest) {
  try {
    console.log("[PENDING COMPLAINTS] Starting reminder check...")

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
        const subcategoryText = complaint.subcategory
          .split('_')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')

        // Format registration date
        const formattedDate = createdAt.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'Asia/Karachi'
        })

        // Sanitize description for template (remove newlines, limit length)
        const sanitizedDescription = (complaint.description || "No description provided")
          .replace(/\n/g, " ") // Replace newlines with spaces
          .replace(/\s+/g, " ") // Replace multiple spaces with single space
          .trim()
          .substring(0, 500) // Limit to 500 characters

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

        // Send reminder to all recipients
        for (const recipient of REMINDER_RECIPIENTS) {
          try {
            await sendWhatsAppTemplate(recipient, PENDING_COMPLAINT_TEMPLATE_SID, templateVariables)
            console.log(`[PENDING COMPLAINTS] Reminder sent to ${recipient} for ${complaint.complaint_id} (${hoursPending}h pending)`)
          } catch (error) {
            console.error(`[PENDING COMPLAINTS] Failed to send template to ${recipient}:`, error)
            // Fallback to plain text message
            try {
              const fallbackMessage = `Hello, this is Manzhil by Scrift.

⚠️ Pending Complaint Alert

Complaint ID: ${complaint.complaint_id}
Resident: ${complaint.profiles?.name || "Unknown"} (${complaint.profiles?.apartment_number || "N/A"})
Category: ${categoryText} - ${subcategoryText}
Description: ${sanitizedDescription}

Registered: ${formattedDate}
Pending for: ${hoursPending} hours

Please review and address this complaint.

View in Admin Panel: ${APP_BASE_URL}/admin

- Manzhil by Scrift Team`

              await sendWhatsAppMessage(recipient, fallbackMessage)
              console.log(`[PENDING COMPLAINTS] Sent fallback message to ${recipient} for ${complaint.complaint_id}`)
            } catch (fallbackError) {
              console.error(`[PENDING COMPLAINTS] Failed to send fallback to ${recipient}:`, fallbackError)
            }
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

import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { sendMessage, formatSubcategory } from "@/lib/twilio"
import { getReminderRecipients } from "@/lib/admin/notifications"
import { startCronJob, endCronJob, logCronError } from "@/lib/cron-logger"
import { getConfiguredTimezone } from "@/lib/instance-settings"

const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")

export async function POST(request: NextRequest) {
  // Start logging
  const cronLog = await startCronJob("pending-complaints")

  try {
    console.log("[PENDING COMPLAINTS] Starting reminder check...")

    const timezone = await getConfiguredTimezone()

    // Get dynamic reminder recipients
    const REMINDER_RECIPIENTS = await getReminderRecipients()
    console.log(`[PENDING COMPLAINTS] Sending to ${REMINDER_RECIPIENTS.length} recipients`)

    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    // Fetch complaints that are pending for more than 24 hours
    // Also filter out complaints updated in last 24h (already triggered inline admin notification)
    const { data: pendingComplaints, error } = await supabaseAdmin
      .from("complaints")
      .select("*, profiles(name, apartment_number)")
      .eq("status", "pending")
      .lt("created_at", twentyFourHoursAgo.toISOString())
      .lt("updated_at", twentyFourHoursAgo.toISOString())
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
      await endCronJob(cronLog, {
        status: "skipped" as any,
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
        result: { totalPending: 0, recipients: REMINDER_RECIPIENTS.length },
      })
      return new Response(
        JSON.stringify({ success: true, message: "No pending complaints", count: 0 }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    console.log(`[PENDING COMPLAINTS] Found ${pendingComplaints.length} pending complaints`)

    // Build a single digest message with all pending complaints
    const now = new Date()
    const DIVIDER = "───────────────────"

    const complaintLines = pendingComplaints.map((complaint) => {
      const createdAt = new Date(complaint.created_at)
      const hoursPending = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60))
      const categoryText = complaint.category === "apartment" ? "Apt" : "Bldg"
      const subcategoryText = formatSubcategory(complaint.subcategory)

      return `• *${complaint.complaint_id}* — ${complaint.profiles?.name || "Unknown"} (${complaint.profiles?.apartment_number || "N/A"}) | ${categoryText}: ${subcategoryText} | ⏱️ ${hoursPending}h`
    })

    const digestMessage = `⚠️ *Pending Complaints Digest*

${DIVIDER}
📋 *${pendingComplaints.length} complaint${pendingComplaints.length > 1 ? "s" : ""} pending > 24h*
${DIVIDER}

${complaintLines.join("\n\n")}

${DIVIDER}

Please review and address these complaints.

🔗 Admin Panel: ${APP_BASE_URL}/admin/complaints

${DIVIDER}
— Manzhil by Scrift`

    // Send one digest message per admin recipient
    let sentCount = 0
    for (const recipient of REMINDER_RECIPIENTS) {
      try {
        await sendMessage(recipient, digestMessage)
        sentCount++
        console.log(`[PENDING COMPLAINTS] Digest sent to ${recipient} (${pendingComplaints.length} complaints)`)
      } catch (error) {
        console.error(`[PENDING COMPLAINTS] Failed to send digest to ${recipient}:`, error)
      }
    }

    console.log(`[PENDING COMPLAINTS] Sent digest to ${sentCount}/${REMINDER_RECIPIENTS.length} recipients`)

    // Log completion
    await endCronJob(cronLog, {
      status: sentCount === REMINDER_RECIPIENTS.length ? "success" : "partial",
      recordsProcessed: pendingComplaints.length,
      recordsSucceeded: sentCount,
      recordsFailed: REMINDER_RECIPIENTS.length - sentCount,
      result: {
        totalPending: pendingComplaints.length,
        digestsSent: sentCount,
        recipients: REMINDER_RECIPIENTS.length,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        totalPending: pendingComplaints.length,
        digestsSent: sentCount,
        recipients: REMINDER_RECIPIENTS.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("[PENDING COMPLAINTS] Error:", error)
    await logCronError(cronLog, error)
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

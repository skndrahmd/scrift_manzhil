import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { sendWelcomeMessage, isConfigured } from "@/lib/twilio"
import { verifyAdminAccess } from "@/lib/auth/api-auth"
import { logWelcomeMessage } from "@/lib/cron-logger"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * POST /api/residents/resend-welcome
 * Resend welcome messages to failed recipients
 * 
 * Body:
 *   - log_ids: string[] - Array of welcome_message_logs IDs to resend
 *   - or phone_numbers: string[] - Array of phone numbers to resend to
 */
export async function POST(request: NextRequest) {
  const { authenticated, adminUser, error: authError } = await verifyAdminAccess("residents")
  if (!authenticated) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { log_ids, phone_numbers } = body

    // Validate input
    if (!log_ids && !phone_numbers) {
      return NextResponse.json(
        { error: "Either log_ids or phone_numbers is required" },
        { status: 400 }
      )
    }

    // Check Twilio is configured
    if (!isConfigured()) {
      return NextResponse.json(
        { error: "Twilio configuration error - missing credentials" },
        { status: 500 }
      )
    }

    // Fetch failed logs if log_ids provided
    let logsToResend: Array<{
      id: string
      resident_id: string | null
      resident_name: string | null
      phone_number: string
      apartment_number: string | null
    }> = []

    if (log_ids && Array.isArray(log_ids)) {
      const { data: logs, error: fetchError } = await supabaseAdmin
        .from("welcome_message_logs")
        .select("id, resident_id, resident_name, phone_number, apartment_number")
        .in("id", log_ids)
        .eq("status", "failed")

      if (fetchError) {
        console.error("Failed to fetch logs:", fetchError)
        return NextResponse.json(
          { error: "Failed to fetch logs" },
          { status: 500 }
        )
      }
      logsToResend = logs || []
    } else if (phone_numbers && Array.isArray(phone_numbers)) {
      // Get the most recent failed log for each phone number
      const { data: logs, error: fetchError } = await supabaseAdmin
        .from("welcome_message_logs")
        .select("id, resident_id, resident_name, phone_number, apartment_number")
        .in("phone_number", phone_numbers)
        .eq("status", "failed")
        .order("sent_at", { ascending: false })

      if (fetchError) {
        console.error("Failed to fetch logs:", fetchError)
        return NextResponse.json(
          { error: "Failed to fetch logs" },
          { status: 500 }
        )
      }

      // Deduplicate by phone number (keep most recent)
      const seenPhones = new Set<string>()
      logsToResend = (logs || []).filter((log) => {
        if (seenPhones.has(log.phone_number)) {
          return false
        }
        seenPhones.add(log.phone_number)
        return true
      })
    }

    if (logsToResend.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No failed messages to resend",
        results: { total: 0, succeeded: 0, failed: 0 },
      })
    }

    // Resend welcome messages
    const results = {
      total: logsToResend.length,
      succeeded: 0,
      failed: 0,
      details: [] as Array<{
        id: string
        phone: string
        status: "sent" | "failed"
        error?: string
      }>,
    }

    for (const log of logsToResend) {
      try {
        // Format phone number if needed
        const formattedPhone = log.phone_number.startsWith("+")
          ? log.phone_number
          : `+${log.phone_number}`

        const result = await sendWelcomeMessage({
          phone: formattedPhone,
          name: log.resident_name || "Resident",
          apartmentNumber: log.apartment_number || "",
        })

        // Log the attempt
        await logWelcomeMessage({
          residentId: log.resident_id,
          residentName: log.resident_name,
          phoneNumber: formattedPhone,
          apartmentNumber: log.apartment_number,
          status: result.ok ? "sent" : "failed",
          errorMessage: result.ok ? null : result.error || "Unknown error",
          twilioSid: result.ok ? result.sid : null,
          triggeredBy: "resend",
          triggeredByUser: adminUser?.phone_number || null,
        })

        if (result.ok) {
          results.succeeded++
          results.details.push({
            id: log.id,
            phone: formattedPhone,
            status: "sent",
          })
        } else {
          results.failed++
          results.details.push({
            id: log.id,
            phone: formattedPhone,
            status: "failed",
            error: result.error || "Unknown error",
          })
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        results.failed++
        results.details.push({
          id: log.id,
          phone: log.phone_number,
          status: "failed",
          error: errorMessage,
        })

        // Log the failure
        await logWelcomeMessage({
          residentId: log.resident_id,
          residentName: log.resident_name,
          phoneNumber: log.phone_number,
          apartmentNumber: log.apartment_number,
          status: "failed",
          errorMessage,
          triggeredBy: "resend",
          triggeredByUser: adminUser?.phone_number || null,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Resent ${results.succeeded}/${results.total} welcome messages`,
      results,
    })
  } catch (error) {
    console.error("Resend welcome error:", error)
    return NextResponse.json(
      { error: "Failed to resend welcome messages" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { sendBroadcastAnnouncement } from "@/lib/twilio/notifications"

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function POST(request: NextRequest) {
  try {
    const { variables, recipientIds } = await request.json()

    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return NextResponse.json(
        { error: "No recipients specified" },
        { status: 400 }
      )
    }

    // Fetch recipient details
    const { data: recipients, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("id, name, phone_number, apartment_number")
      .in("id", recipientIds)
      .eq("is_active", true)

    if (fetchError) {
      console.error("[Broadcast] Error fetching recipients:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch recipients" },
        { status: 500 }
      )
    }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: "No active recipients found" },
        { status: 400 }
      )
    }

    const results: {
      recipientId: string
      name: string
      phone: string
      apartment: string
      success: boolean
      error?: string
    }[] = []

    // Send messages with rate limiting (1 second between messages)
    for (const recipient of recipients) {
      const result = await sendBroadcastAnnouncement({
        phone: recipient.phone_number,
        name: recipient.name,
        variable1: variables?.["1"] || "",
        variable2: variables?.["2"] || "",
      })

      results.push({
        recipientId: recipient.id,
        name: recipient.name,
        phone: recipient.phone_number,
        apartment: recipient.apartment_number,
        success: result.ok,
        error: result.error,
      })

      // Rate limit: 1 second between messages
      if (recipients.indexOf(recipient) < recipients.length - 1) {
        await delay(1000)
      }
    }

    const successCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length

    console.log(`[Broadcast] Sent ${successCount} messages, ${failedCount} failed`)

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failedCount,
      },
    })
  } catch (error) {
    console.error("[Broadcast] Error:", error)
    return NextResponse.json(
      { error: "Failed to send broadcast" },
      { status: 500 }
    )
  }
}

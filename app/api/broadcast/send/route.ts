import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin, BROADCAST_LIMITS } from "@/lib/supabase"
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

    // Check daily limit
    const now = new Date()
    const startOfDay = new Date(now)
    startOfDay.setUTCHours(0, 0, 0, 0)

    const { data: todayLogs, error: logsError } = await supabaseAdmin
      .from("broadcast_logs")
      .select("sent_at, success_count")
      .gte("sent_at", startOfDay.toISOString())
      .order("sent_at", { ascending: false })

    // Only check limits if table exists
    if (!logsError || logsError.code !== "42P01") {
      if (logsError) {
        console.error("[Broadcast] Error fetching logs:", logsError)
        return NextResponse.json(
          { error: "Failed to check usage limits" },
          { status: 500 }
        )
      }

      const messagesToday = todayLogs?.reduce(
        (sum, log) => sum + (log.success_count || 0),
        0
      ) || 0

      // Check if adding these recipients would exceed daily limit
      if (messagesToday + recipientIds.length > BROADCAST_LIMITS.DAILY_MESSAGE_LIMIT) {
        const remaining = BROADCAST_LIMITS.DAILY_MESSAGE_LIMIT - messagesToday
        return NextResponse.json(
          {
            error: `Daily limit exceeded. Only ${remaining} messages remaining today.`,
            code: "DAILY_LIMIT_EXCEEDED",
            remaining,
          },
          { status: 429 }
        )
      }

      // Check cooldown between broadcasts
      const lastBroadcastAt = todayLogs?.[0]?.sent_at
      if (lastBroadcastAt) {
        const lastBroadcastTime = new Date(lastBroadcastAt).getTime()
        const cooldownEnd = lastBroadcastTime + BROADCAST_LIMITS.MIN_BROADCAST_INTERVAL_MS
        const nowMs = now.getTime()

        if (nowMs < cooldownEnd) {
          const remainingSeconds = Math.ceil((cooldownEnd - nowMs) / 1000)
          const remainingMinutes = Math.ceil(remainingSeconds / 60)
          return NextResponse.json(
            {
              error: `Please wait ${remainingMinutes} minute(s) before sending another broadcast.`,
              code: "COOLDOWN_ACTIVE",
              cooldownEndsAt: new Date(cooldownEnd).toISOString(),
              remainingSeconds,
            },
            { status: 429 }
          )
        }
      }
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

    // Send messages with batch rate limiting
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i]

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

      // Rate limit: 3 seconds between messages (safer for WhatsApp)
      if (i < recipients.length - 1) {
        await delay(BROADCAST_LIMITS.MESSAGE_DELAY_MS)
      }

      // Longer pause after each batch of 20 messages
      if (
        (i + 1) % BROADCAST_LIMITS.BATCH_SIZE === 0 &&
        i < recipients.length - 1
      ) {
        console.log(`[Broadcast] Batch ${Math.floor((i + 1) / BROADCAST_LIMITS.BATCH_SIZE)} complete, pausing for ${BROADCAST_LIMITS.BATCH_DELAY_MS / 1000}s...`)
        await delay(BROADCAST_LIMITS.BATCH_DELAY_MS)
      }
    }

    const successCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length

    console.log(`[Broadcast] Sent ${successCount} messages, ${failedCount} failed`)

    // Log the broadcast (if table exists)
    if (!logsError || logsError.code !== "42P01") {
      const { error: logError } = await supabaseAdmin
        .from("broadcast_logs")
        .insert({
          recipient_count: recipients.length,
          success_count: successCount,
          failed_count: failedCount,
          message_title: variables?.["1"] || null,
          message_body: variables?.["2"] || null,
        })

      if (logError) {
        console.error("[Broadcast] Error logging broadcast:", logError)
        // Don't fail the request, just log the error
      }
    }

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

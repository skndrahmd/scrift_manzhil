/**
 * @module broadcast
 * Service layer for sending broadcast WhatsApp announcements with
 * daily rate limiting, cooldown enforcement, and batch processing.
 */
import { supabaseAdmin, BROADCAST_LIMITS } from "@/lib/supabase"
import { sendBroadcastAnnouncement } from "@/lib/twilio/notifications"
import { ServiceError } from "./complaint"

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Checks current broadcast usage against daily limits.
 * Returns remaining message count and cooldown status.
 * @returns Object with `{ messagesToday, remaining, todayLogs, logsError }`
 * @throws {ServiceError} 500 if the broadcast_logs table query fails
 */
export async function checkBroadcastUsage() {
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setUTCHours(0, 0, 0, 0)

  const { data: todayLogs, error: logsError } = await supabaseAdmin
    .from("broadcast_logs")
    .select("sent_at, success_count")
    .gte("sent_at", startOfDay.toISOString())
    .order("sent_at", { ascending: false })

  if (logsError && logsError.code !== "42P01") {
    throw new ServiceError("Failed to check usage limits", 500)
  }

  const messagesToday = todayLogs?.reduce(
    (sum, log) => sum + (log.success_count || 0),
    0
  ) || 0

  const remaining = BROADCAST_LIMITS.DAILY_MESSAGE_LIMIT - messagesToday

  return { messagesToday, remaining, todayLogs, logsError }
}

/**
 * Sends a broadcast announcement to the specified recipients
 * with rate limiting and batch processing.
 * @param variables - Template variables keyed by position (e.g., `{ "1": "Title", "2": "Body" }`)
 * @param recipientIds - Array of profile UUIDs to send the broadcast to
 * @returns Object with `{ success, results, summary }` containing per-recipient outcomes
 * @throws {ServiceError} 400 if no recipients specified, 429 if daily limit or cooldown exceeded, 500 on fetch failure
 */
export async function sendBroadcast(
  variables: Record<string, string>,
  recipientIds: string[]
) {
  if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
    throw new ServiceError("No recipients specified", 400)
  }

  // Check daily limit
  const { remaining, todayLogs, logsError } = await checkBroadcastUsage()

  if (!logsError || logsError.code !== "42P01") {
    if (remaining < recipientIds.length) {
      throw new ServiceError(
        `Daily limit exceeded. Only ${remaining} messages remaining today.`,
        429
      )
    }

    // Check cooldown between broadcasts
    const lastBroadcastAt = todayLogs?.[0]?.sent_at
    if (lastBroadcastAt) {
      const lastBroadcastTime = new Date(lastBroadcastAt).getTime()
      const cooldownEnd = lastBroadcastTime + BROADCAST_LIMITS.MIN_BROADCAST_INTERVAL_MS
      const nowMs = Date.now()

      if (nowMs < cooldownEnd) {
        const remainingSeconds = Math.ceil((cooldownEnd - nowMs) / 1000)
        const remainingMinutes = Math.ceil(remainingSeconds / 60)
        throw new ServiceError(
          `Please wait ${remainingMinutes} minute(s) before sending another broadcast.`,
          429
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
    throw new ServiceError("Failed to fetch recipients", 500)
  }

  if (!recipients || recipients.length === 0) {
    throw new ServiceError("No active recipients found", 400)
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

    // Rate limit: 3 seconds between messages
    if (i < recipients.length - 1) {
      await delay(BROADCAST_LIMITS.MESSAGE_DELAY_MS)
    }

    // Longer pause after each batch
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

  // Log the broadcast
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
    }
  }

  return {
    success: true,
    results,
    summary: {
      total: results.length,
      success: successCount,
      failed: failedCount,
    },
  }
}

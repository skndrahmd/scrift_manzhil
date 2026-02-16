import { NextResponse } from "next/server"
import { supabaseAdmin, BROADCAST_LIMITS } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Get start of current day in UTC
    const now = new Date()
    const startOfDay = new Date(now)
    startOfDay.setUTCHours(0, 0, 0, 0)

    // Query broadcast logs for today
    const { data: todayLogs, error: logsError } = await supabaseAdmin
      .from("broadcast_logs")
      .select("sent_at, recipient_count, success_count")
      .gte("sent_at", startOfDay.toISOString())
      .order("sent_at", { ascending: false })

    if (logsError) {
      // If table doesn't exist yet, return defaults
      if (logsError.code === "42P01") {
        return NextResponse.json({
          messagesToday: 0,
          dailyLimit: BROADCAST_LIMITS.DAILY_MESSAGE_LIMIT,
          remaining: BROADCAST_LIMITS.DAILY_MESSAGE_LIMIT,
          percentUsed: 0,
          lastBroadcastAt: null,
          cooldownEndsAt: null,
          canSend: true,
          cooldownRemaining: 0,
        })
      }
      console.error("[Broadcast Usage] Error fetching logs:", logsError)
      return NextResponse.json(
        { error: "Failed to fetch usage data" },
        { status: 500 }
      )
    }

    // Calculate total messages sent today
    const messagesToday = todayLogs?.reduce(
      (sum, log) => sum + (log.success_count || 0),
      0
    ) || 0

    // Get last broadcast time
    const lastBroadcastAt = todayLogs?.[0]?.sent_at || null

    // Calculate cooldown
    let cooldownEndsAt: string | null = null
    let canSend = true
    let cooldownRemaining = 0

    if (lastBroadcastAt) {
      const lastBroadcastTime = new Date(lastBroadcastAt).getTime()
      const cooldownEnd = lastBroadcastTime + BROADCAST_LIMITS.MIN_BROADCAST_INTERVAL_MS
      const nowMs = now.getTime()

      if (nowMs < cooldownEnd) {
        cooldownEndsAt = new Date(cooldownEnd).toISOString()
        canSend = false
        cooldownRemaining = Math.ceil((cooldownEnd - nowMs) / 1000) // seconds remaining
      }
    }

    const remaining = Math.max(0, BROADCAST_LIMITS.DAILY_MESSAGE_LIMIT - messagesToday)
    const percentUsed = Math.min(
      100,
      Math.round((messagesToday / BROADCAST_LIMITS.DAILY_MESSAGE_LIMIT) * 100)
    )

    return NextResponse.json({
      messagesToday,
      dailyLimit: BROADCAST_LIMITS.DAILY_MESSAGE_LIMIT,
      remaining,
      percentUsed,
      lastBroadcastAt,
      cooldownEndsAt,
      canSend: canSend && remaining > 0,
      cooldownRemaining,
    })
  } catch (error) {
    console.error("[Broadcast Usage] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    )
  }
}

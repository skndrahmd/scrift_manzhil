/**
 * @module lib/twilio/session-tracker
 * Tracks WhatsApp conversation session windows for cost optimization.
 *
 * WhatsApp charges differently based on conversation type:
 * - User-Initiated Conversations (UIC): When a resident messages the bot, a 24h session opens.
 *   All messages within that window are covered by one cheaper charge.
 * - Business-Initiated Conversations (BIC): Template messages outside the 24h window
 *   each open a new, more expensive conversation.
 *
 * By tracking when residents last messaged us, we can send freeform messages
 * (covered by the existing UIC window) instead of templates when possible.
 */

import { supabaseAdmin } from "@/lib/supabase"

/**
 * Records an inbound message from a resident, creating or updating their session window.
 * Should be called in the webhook handler when a message is received.
 */
export async function recordInboundMessage(phone: string): Promise<void> {
  try {
    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    await supabaseAdmin
      .from("session_windows")
      .upsert(
        {
          phone_number: phone,
          last_inbound_at: now,
          session_expires_at: expiresAt,
        },
        { onConflict: "phone_number" }
      )
  } catch (error) {
    // Non-critical — log and continue, don't break webhook processing
    console.error("[SessionTracker] Failed to record inbound message:", error)
  }
}

/**
 * Checks whether a phone number has an active UIC session window.
 * Returns true if the session hasn't expired yet.
 */
export async function hasActiveSession(phone: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from("session_windows")
      .select("session_expires_at")
      .eq("phone_number", phone)
      .single()

    if (error || !data) return false

    return new Date(data.session_expires_at) > new Date()
  } catch {
    return false
  }
}

/**
 * Deletes expired session records. Can be called periodically for cleanup.
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from("session_windows")
      .delete()
      .lt("session_expires_at", new Date().toISOString())
      .select("phone_number")

    if (error) {
      console.error("[SessionTracker] Cleanup error:", error)
      return 0
    }

    return data?.length || 0
  } catch {
    return 0
  }
}

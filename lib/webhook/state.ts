/**
 * @module lib/webhook/state
 * Database-backed conversation state management for WhatsApp webhook flows.
 * Tracks each user's current step and collected data by phone number.
 * Persists across serverless function invocations via Supabase.
 */

import type { UserState } from "./types"
import { SESSION_TIMEOUT_MS } from "./config"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * Gets the current conversation state for a user from the database.
 * @param phoneNumber - User's phone number key
 * @returns Current UserState, or a fresh "initial" state if none exists
 */
export async function getState(phoneNumber: string): Promise<UserState> {
  const { data, error } = await supabaseAdmin
    .from("bot_sessions")
    .select("state")
    .eq("phone_number", phoneNumber)
    .single()

  if (error || !data) {
    return { step: "initial" }
  }

  return data.state as UserState
}

/**
 * Replaces the conversation state for a user in the database.
 * Automatically stamps `lastActivity` with the current time.
 * @param phoneNumber - User's phone number key
 * @param state - New state to store
 */
export async function setState(phoneNumber: string, state: UserState): Promise<void> {
  const stateWithTimestamp = {
    ...state,
    lastActivity: Date.now(),
  }

  await supabaseAdmin
    .from("bot_sessions")
    .upsert(
      {
        phone_number: phoneNumber,
        state: stateWithTimestamp,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "phone_number" }
    )
}

/**
 * Merges partial updates into the user's existing conversation state.
 * Automatically stamps `lastActivity` with the current time.
 * @param phoneNumber - User's phone number key
 * @param updates - Partial state fields to merge
 * @returns The merged UserState after update
 */
export async function updateState(
  phoneNumber: string,
  updates: Partial<UserState>
): Promise<UserState> {
  const current = await getState(phoneNumber)
  const newState = { ...current, ...updates, lastActivity: Date.now() }

  await supabaseAdmin
    .from("bot_sessions")
    .upsert(
      {
        phone_number: phoneNumber,
        state: newState,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "phone_number" }
    )

  return newState
}

/**
 * Clears the conversation state for a user, resetting them to initial.
 * @param phoneNumber - User's phone number key
 */
export async function clearState(phoneNumber: string): Promise<void> {
  await supabaseAdmin
    .from("bot_sessions")
    .delete()
    .eq("phone_number", phoneNumber)
}

/**
 * Checks whether a user has an active (non-initial) conversation flow.
 * @param phoneNumber - User's phone number key
 * @returns True if the user is mid-flow
 */
export async function hasActiveFlow(phoneNumber: string): Promise<boolean> {
  const state = await getState(phoneNumber)
  return state.step !== "initial"
}

/**
 * Checks whether a user's session has expired due to inactivity.
 * A session is expired if the last activity was more than SESSION_TIMEOUT_MS ago.
 * Returns false if the user has no state or no recorded lastActivity.
 * @param phoneNumber - User's phone number key
 * @returns True if the session has expired
 */
export async function isSessionExpired(phoneNumber: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("bot_sessions")
    .select("last_activity")
    .eq("phone_number", phoneNumber)
    .single()

  if (error || !data?.last_activity) return false

  const lastActivity = new Date(data.last_activity).getTime()
  return Date.now() - lastActivity > SESSION_TIMEOUT_MS
}

/**
 * Cleans up expired sessions (older than SESSION_TIMEOUT_MS).
 * Can be called periodically via cron job.
 * @returns Number of sessions cleaned up
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS).toISOString()

  const { data, error } = await supabaseAdmin
    .from("bot_sessions")
    .delete()
    .lt("last_activity", cutoff)
    .select("phone_number")

  if (error) {
    console.error("[BotSessions] Cleanup error:", error)
    return 0
  }

  return data?.length || 0
}

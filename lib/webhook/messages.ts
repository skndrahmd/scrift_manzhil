/**
 * Bot Message System
 * Loads customizable messages from the database with in-memory caching.
 * Falls back to hardcoded defaults if the database is unavailable.
 */

import { supabaseAdmin } from "@/lib/supabase"
import { MESSAGE_DEFAULTS } from "./message-defaults"
import type { MessageKey } from "./message-keys"

interface CachedMessage {
  default_text: string
  custom_text: string | null
}

/**
 * Load all messages from the database.
 * No caching — always fetches fresh data so admin edits are reflected instantly.
 */
async function loadMessages(): Promise<Map<string, CachedMessage>> {
  try {
    const { data, error } = await supabaseAdmin
      .from("bot_messages")
      .select("message_key, default_text, custom_text")

    if (error) {
      console.error("[BotMessages] Failed to load from DB:", error)
      return new Map()
    }

    const messages = new Map<string, CachedMessage>()
    for (const row of data) {
      messages.set(row.message_key, {
        default_text: row.default_text,
        custom_text: row.custom_text,
      })
    }

    return messages
  } catch (error) {
    console.error("[BotMessages] Load error:", error)
    return new Map()
  }
}

/**
 * Get a message by key with variable interpolation.
 * Priority: custom_text (from DB) > default_text (from DB) > hardcoded default.
 *
 * @param key - The message key (use MSG constants)
 * @param variables - Optional key-value pairs for {variable} interpolation
 * @returns The resolved message string
 */
export async function getMessage(
  key: MessageKey,
  variables?: Record<string, string | number | undefined>
): Promise<string> {
  const cache = await loadMessages()
  const cached = cache.get(key)

  let text: string

  if (cached) {
    text = cached.custom_text ?? cached.default_text
  } else {
    // Fall back to hardcoded defaults
    text = MESSAGE_DEFAULTS[key] ?? key
  }

  // Interpolate variables
  if (variables) {
    for (const [varName, value] of Object.entries(variables)) {
      text = text.replace(
        new RegExp(`\\{${varName}\\}`, "g"),
        String(value ?? "")
      )
    }
  }

  return text
}

/**
 * Get a message synchronously using only the hardcoded defaults.
 * Use this when you cannot await (e.g., in non-async contexts).
 */
export function getMessageSync(
  key: MessageKey,
  variables?: Record<string, string | number | undefined>
): string {
  let text = MESSAGE_DEFAULTS[key] ?? key

  if (variables) {
    for (const [varName, value] of Object.entries(variables)) {
      text = text.replace(
        new RegExp(`\\{${varName}\\}`, "g"),
        String(value ?? "")
      )
    }
  }

  return text
}


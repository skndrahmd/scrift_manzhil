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
 * Get a message by key with variable interpolation and optional language.
 * Priority:
 *   1. If language provided: bot_message_translations for that language
 *   2. custom_text (from bot_messages)
 *   3. default_text (from bot_messages)
 *   4. Hardcoded MESSAGE_DEFAULTS fallback
 *
 * @param key - The message key (use MSG constants)
 * @param variables - Optional key-value pairs for {variable} interpolation
 * @param language - Optional language code (e.g., "ur", "ar"). Undefined = English.
 * @returns The resolved message string
 */
export async function getMessage(
  key: MessageKey,
  variables?: Record<string, string | number | undefined>,
  language?: string
): Promise<string> {
  let text: string | undefined

  // If a non-English language is requested, try the translations table
  if (language) {
    try {
      const { data } = await supabaseAdmin
        .from("bot_message_translations")
        .select("translated_text")
        .eq("message_key", key)
        .eq("language_code", language)
        .single()

      if (data?.translated_text) {
        text = data.translated_text
      }
    } catch {
      // Fall through to English
    }
  }

  // Fall back to English (existing logic)
  if (!text) {
    const cache = await loadMessages()
    const cached = cache.get(key)

    if (cached) {
      text = cached.custom_text ?? cached.default_text
    } else {
      text = MESSAGE_DEFAULTS[key] ?? key
    }
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
 * Get a list of translatable labels by key.
 * Labels are stored as newline-delimited strings in bot_messages.
 * Returns an array of trimmed, non-empty strings.
 */
export async function getLabels(
  key: MessageKey,
  language?: string
): Promise<string[]> {
  const text = await getMessage(key, undefined, language)
  return text.split("\n").map((s) => s.trim()).filter(Boolean)
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


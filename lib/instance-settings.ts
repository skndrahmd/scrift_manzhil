/**
 * @module instance-settings
 * Server-side instance settings cache. Reads timezone, currency, and other
 * configurable values from the `instance_settings` database table with a
 * 60-second in-memory cache. Falls back to hardcoded defaults if DB is unavailable.
 */

import { supabaseAdmin } from "@/lib/supabase"

export interface InstanceSettings {
  timezone: string
  currencyCode: string
  currencySymbol: string
}

const DEFAULTS: InstanceSettings = {
  timezone: "Asia/Karachi",
  currencyCode: "PKR",
  currencySymbol: "Rs.",
}

const CACHE_DURATION_MS = 60_000 // 60 seconds

let cachedSettings: InstanceSettings | null = null
let cacheTimestamp = 0

/**
 * Returns instance settings from DB (cached for 60s).
 * Falls back to defaults if the DB query fails.
 */
export async function getInstanceSettings(): Promise<InstanceSettings> {
  const now = Date.now()
  if (cachedSettings && now - cacheTimestamp < CACHE_DURATION_MS) {
    return cachedSettings
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("instance_settings")
      .select("key, value")

    if (error || !data) {
      console.error("Failed to fetch instance settings:", error)
      cachedSettings = DEFAULTS
      cacheTimestamp = now
      return DEFAULTS
    }

    const map = new Map(data.map((row: { key: string; value: string }) => [row.key, row.value]))

    cachedSettings = {
      timezone: map.get("timezone") ?? DEFAULTS.timezone,
      currencyCode: map.get("currency_code") ?? DEFAULTS.currencyCode,
      currencySymbol: map.get("currency_symbol") ?? DEFAULTS.currencySymbol,
    }
    cacheTimestamp = now
    return cachedSettings
  } catch (err) {
    console.error("Instance settings fetch error:", err)
    return DEFAULTS
  }
}

/**
 * Clears the in-memory cache. Call after admin updates settings.
 */
export function clearInstanceSettingsCache(): void {
  cachedSettings = null
  cacheTimestamp = 0
}

/**
 * Convenience: returns just the configured timezone string.
 */
export async function getConfiguredTimezone(): Promise<string> {
  const settings = await getInstanceSettings()
  return settings.timezone
}

/** Exported defaults for use in tests and client-side fallback */
export const INSTANCE_DEFAULTS = DEFAULTS

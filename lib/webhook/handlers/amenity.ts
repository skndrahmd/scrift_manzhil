/**
 * Amenity Flow Handler
 * Handles the amenity timings display flow in WhatsApp bot
 */

import { getState, setState, clearState } from "../state"
import { getMessage } from "../messages"
import { MSG } from "../message-keys"
import { supabaseAdmin } from "@/lib/supabase"

interface Amenity {
  id: string
  name: string
  is_active: boolean
  is_under_maintenance: boolean
  open_time: string | null
  close_time: string | null
  sort_order: number
}

interface PrayerTime {
  id: string
  prayer_name: string
  prayer_time: string | null
  sort_order: number
}

interface PrayerTimesSettings {
  is_enabled: boolean
}

/**
 * Format time from HH:MM:SS to 12-hour format
 */
function formatTime(time: string | null): string {
  if (!time) return "N/A"
  
  const [hours, minutes] = time.split(":")
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour % 12 || 12
  
  return `${hour12}:${minutes} ${ampm}`
}

/**
 * Fetch all active amenities from database with optional translations
 */
async function getActiveAmenities(language?: string): Promise<Amenity[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("amenities")
      .select("id, name, is_active, is_under_maintenance, open_time, close_time, sort_order")
      .eq("is_active", true)
      .order("sort_order")

    if (error) {
      console.error("[Amenity] Fetch error:", error)
      return []
    }

    // If language is provided, fetch translations
    if (language && data && data.length > 0) {
      const amenityIds = data.map((a) => a.id)
      const { data: translations } = await supabaseAdmin
        .from("amenity_translations")
        .select("amenity_id, translated_name")
        .eq("language_code", language)
        .in("amenity_id", amenityIds)

      const translationMap = new Map<string, string>()
      if (translations) {
        for (const t of translations) {
          translationMap.set(t.amenity_id, t.translated_name)
        }
      }

      // Apply translations
      return data.map((a) => ({
        ...a,
        name: translationMap.get(a.id) || a.name,
      }))
    }

    return data || []
  } catch (error) {
    console.error("[Amenity] Fetch exception:", error)
    return []
  }
}

/**
 * Fetch prayer times settings and times with optional translations
 */
async function getPrayerTimes(language?: string): Promise<{ times: PrayerTime[]; isEnabled: boolean }> {
  try {
    // Fetch settings
    const { data: settings } = await supabaseAdmin
      .from("prayer_times_settings")
      .select("is_enabled")
      .eq("id", 1)
      .single()

    // Fetch prayer times
    const { data: times } = await supabaseAdmin
      .from("prayer_times")
      .select("id, prayer_name, prayer_time, sort_order")
      .order("sort_order")

    // If language is provided, fetch translations
    if (language && times && times.length > 0) {
      const prayerIds = times.map((p) => p.id)
      const { data: translations } = await supabaseAdmin
        .from("prayer_time_translations")
        .select("prayer_time_id, translated_name")
        .eq("language_code", language)
        .in("prayer_time_id", prayerIds)

      const translationMap = new Map<string, string>()
      if (translations) {
        for (const t of translations) {
          translationMap.set(t.prayer_time_id, t.translated_name)
        }
      }

      // Apply translations
      return {
        times: times.map((p) => ({
          ...p,
          prayer_name: translationMap.get(p.id) || p.prayer_name,
        })),
        isEnabled: settings?.is_enabled || false,
      }
    }

    return {
      times: times || [],
      isEnabled: settings?.is_enabled || false,
    }
  } catch (error) {
    console.error("[Amenity] Prayer times fetch error:", error)
    return { times: [], isEnabled: false }
  }
}

/**
 * Build prayer times display string
 */
function buildPrayerTimesDisplay(prayerTimes: PrayerTime[]): string {
  const prayerEmojis: Record<string, string> = {
    Fajr: "🌅",
    Zuhr: "☀️",
    Asr: "🌤️",
    Maghrib: "🌇",
    Isha: "🌙",
  }

  return prayerTimes
    .map((p) => {
      const emoji = prayerEmojis[p.prayer_name] || "🕌"
      const time = p.prayer_time ? formatTime(p.prayer_time) : "Not set"
      return `${emoji} *${p.prayer_name}:* ${time}`
    })
    .join("\n")
}

/**
 * Initialize amenity flow - show list of amenities
 */
export async function initializeAmenityFlow(
  phoneNumber: string,
  language?: string
): Promise<string> {
  const amenities = await getActiveAmenities(language)
  const prayerTimes = await getPrayerTimes(language)

  // Build options list
  const options: string[] = []
  const amenityIds: { id: string; name: string; type: "amenity" | "prayer_times" }[] = []

  // Add regular amenities
  amenities.forEach((a, i) => {
    options.push(`${i + 1}. 🏟️ ${a.name}`)
    amenityIds.push({ id: a.id, name: a.name, type: "amenity" })
  })

  // Add Prayer Times option if enabled
  if (prayerTimes.isEnabled) {
    const prayerOptionNum = options.length + 1
    options.push(`${prayerOptionNum}. 🕌 Prayer Times`)
    amenityIds.push({ id: "prayer_times", name: "Prayer Times", type: "prayer_times" })
  }

  if (options.length === 0) {
    return await getMessage(MSG.AMENITY_NO_AMENITIES, undefined, language)
  }

  // Store amenities in state for selection
  await setState(phoneNumber, {
    step: "amenity_selection",
    type: "amenity",
    amenities: amenityIds,
  })

  return await getMessage(MSG.AMENITY_MENU, {
    options: options.join("\n"),
    max: String(options.length),
  }, language)
}

/**
 * Handle amenity flow steps
 */
export async function handleAmenityFlow(
  message: string,
  profile: any,
  phoneNumber: string,
  userState: any
): Promise<string> {
  const language = userState.language

  // Handle amenity selection
  if (userState.step === "amenity_selection") {
    const choice = parseInt(message.trim(), 10)
    const amenities = userState.amenities || []

    if (isNaN(choice) || choice < 1 || choice > amenities.length) {
      return await getMessage(MSG.AMENITY_INVALID_SELECTION, {
        max: String(amenities.length),
      }, language)
    }

    const selectedAmenity = amenities[choice - 1]

    // Handle Prayer Times selection
    if (selectedAmenity.type === "prayer_times") {
      await clearState(phoneNumber)
      
      const prayerTimes = await getPrayerTimes(language)
      
      if (!prayerTimes.isEnabled) {
        return await getMessage(MSG.PRAYER_TIMES_DISABLED, undefined, language)
      }

      const prayersDisplay = buildPrayerTimesDisplay(prayerTimes.times)
      
      return await getMessage(MSG.PRAYER_TIMES_DISPLAY, {
        prayers: prayersDisplay,
      }, language)
    }

    // Fetch full amenity details
    const { data: amenity, error } = await supabaseAdmin
      .from("amenities")
      .select("*, amenity_translations!left(translated_name)")
      .eq("id", selectedAmenity.id)
      .eq("amenity_translations.language_code", language || "")
      .single()

    if (error || !amenity) {
      console.error("[Amenity] Fetch detail error:", error)
      return await getMessage(MSG.ERROR_GENERIC, undefined, language)
    }

    // Use translated name if available
    const amenityName = (amenity as any).amenity_translations?.[0]?.translated_name || amenity.name

    // Clear state after showing amenity info
    await clearState(phoneNumber)

    // Check if under maintenance
    if (amenity.is_under_maintenance) {
      return await getMessage(MSG.AMENITY_UNDER_MAINTENANCE, {
        name: amenityName,
        maintenance_note: "Please check back later or contact management for updates.",
      }, language)
    }

    // Show timings
    const timings = amenity.open_time && amenity.close_time
      ? `${formatTime(amenity.open_time)} – ${formatTime(amenity.close_time)}`
      : "Timings not available"

    return await getMessage(MSG.AMENITY_TIMINGS, {
      name: amenityName,
      timings,
    }, language)
  }

  // Default: restart flow
  return await initializeAmenityFlow(phoneNumber, language)
}

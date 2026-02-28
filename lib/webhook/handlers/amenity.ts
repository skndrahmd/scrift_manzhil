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
 * Fetch all active amenities from database
 */
async function getActiveAmenities(): Promise<Amenity[]> {
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

    return data || []
  } catch (error) {
    console.error("[Amenity] Fetch exception:", error)
    return []
  }
}

/**
 * Initialize amenity flow - show list of amenities
 */
export async function initializeAmenityFlow(
  phoneNumber: string,
  language?: string
): Promise<string> {
  const amenities = await getActiveAmenities()

  if (amenities.length === 0) {
    return await getMessage(MSG.AMENITY_NO_AMENITIES, undefined, language)
  }

  // Store amenities in state for selection
  await setState(phoneNumber, {
    step: "amenity_selection",
    type: "amenity",
    amenities: amenities.map((a) => ({ id: a.id, name: a.name })),
  })

  // Build options list
  const options = amenities
    .map((a, i) => `${i + 1}. 🏟️ ${a.name}`)
    .join("\n")

  return await getMessage(MSG.AMENITY_MENU, {
    options,
    max: String(amenities.length),
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

    // Fetch full amenity details
    const { data: amenity, error } = await supabaseAdmin
      .from("amenities")
      .select("*")
      .eq("id", selectedAmenity.id)
      .single()

    if (error || !amenity) {
      console.error("[Amenity] Fetch detail error:", error)
      return await getMessage(MSG.ERROR_GENERIC, undefined, language)
    }

    // Clear state after showing amenity info
    await clearState(phoneNumber)

    // Check if under maintenance
    if (amenity.is_under_maintenance) {
      return await getMessage(MSG.AMENITY_UNDER_MAINTENANCE, {
        name: amenity.name,
        maintenance_note: "Please check back later or contact management for updates.",
      }, language)
    }

    // Show timings
    const timings = amenity.open_time && amenity.close_time
      ? `${formatTime(amenity.open_time)} – ${formatTime(amenity.close_time)}`
      : "Timings not available"

    return await getMessage(MSG.AMENITY_TIMINGS, {
      name: amenity.name,
      timings,
    }, language)
  }

  // Default: restart flow
  return await initializeAmenityFlow(phoneNumber, language)
}

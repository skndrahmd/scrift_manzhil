/**
 * Profile and Settings Functions
 * Database queries for user profiles and booking settings
 */

import { supabase } from "@/lib/supabase"
import type { Profile, BookingSettings } from "./types"
import { SETTINGS_CACHE_DURATION } from "./config"

// Cache for booking settings
let settingsCache: { data: BookingSettings | null; timestamp: number } | null = null

/**
 * Get user profile by phone number
 */
export async function getProfile(phoneNumber: string): Promise<Profile | null> {
  try {
    console.log("[Webhook] Getting profile for:", phoneNumber)

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "id, phone_number, name, apartment_number, is_active, cnic, building_block, created_at, unit_id, units:units!profiles_unit_id_fkey(maintenance_paid, maintenance_charges, last_payment_date)"
      )
      .eq("phone_number", phoneNumber)
      .single()

    if (error && error.code === "PGRST116") {
      console.log("[Webhook] Profile not found")
      return null
    } else if (error) {
      console.error("[Webhook] Profile fetch error:", error)
      return null
    }

    console.log("[Webhook] Profile found:", profile?.name)
    // Flatten unit maintenance fields onto the profile object so downstream
    // code (menu.ts etc.) can continue reading profile.maintenance_paid etc.
    const unit = (profile as any).units
    return {
      ...profile,
      maintenance_paid: unit?.maintenance_paid ?? false,
      maintenance_charges: unit?.maintenance_charges ?? 0,
      last_payment_date: unit?.last_payment_date ?? null,
    } as Profile
  } catch (error) {
    console.error("[Webhook] Profile error:", error)
    return null
  }
}

/**
 * Get cached booking settings
 * Returns cached data if within cache duration, otherwise fetches fresh
 */
export async function getCachedSettings(): Promise<BookingSettings | null> {
  const now = Date.now()

  // Return cached data if still valid
  if (settingsCache && now - settingsCache.timestamp < SETTINGS_CACHE_DURATION) {
    return settingsCache.data
  }

  // Fetch fresh data
  const { data: settings, error } = await supabase
    .from("booking_settings")
    .select("start_time, end_time, slot_duration_minutes, working_days, booking_charges")
    .single()

  if (error) {
    console.error("[Webhook] Settings fetch error:", error)
    return null
  }

  // Update cache
  settingsCache = {
    data: settings as BookingSettings,
    timestamp: now,
  }

  return settings as BookingSettings
}

/**
 * Clear settings cache (useful for testing or after settings update)
 */
export function clearSettingsCache(): void {
  settingsCache = null
}

/**
 * Check if user has unpaid maintenance
 */
export async function hasUnpaidMaintenance(profileId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("maintenance_payments")
    .select("id")
    .eq("profile_id", profileId)
    .eq("status", "unpaid")
    .limit(1)

  if (error) {
    console.error("[Webhook] Maintenance check error:", error)
    return false
  }

  return data && data.length > 0
}

/**
 * Get user's active complaints
 */
export async function getActiveComplaints(profileId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("complaints")
    .select("*")
    .eq("profile_id", profileId)
    .in("status", ["pending", "in_progress"])
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[Webhook] Complaints fetch error:", error)
    return []
  }

  return data || []
}

/**
 * Get user's bookings
 */
export async function getUserBookings(
  profileId: string,
  status?: string
): Promise<any[]> {
  let query = supabase
    .from("bookings")
    .select("*")
    .eq("profile_id", profileId)
    .order("booking_date", { ascending: true })

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    console.error("[Webhook] Bookings fetch error:", error)
    return []
  }

  return data || []
}

/**
 * Get user's staff members (by unit)
 */
export async function getUserStaff(unitId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("unit_id", unitId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[Webhook] Staff fetch error:", error)
    return []
  }

  return data || []
}

/**
 * Get existing bookings for a date
 */
export async function getBookingsForDate(date: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("start_time, end_time")
    .eq("booking_date", date)
    .in("status", ["confirmed", "pending"])

  if (error) {
    console.error("[Webhook] Date bookings fetch error:", error)
    return []
  }

  return data || []
}

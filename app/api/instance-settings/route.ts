import { NextResponse } from "next/server"
import { verifyAdminAccess, isSuperAdmin } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { clearInstanceSettingsCache } from "@/lib/instance-settings"

const ALLOWED_KEYS = ["timezone", "currency_code", "currency_symbol"] as const

export async function GET() {
  const { authenticated, error } = await verifyAdminAccess("settings")
  if (!authenticated) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const { data, error: dbError } = await supabaseAdmin
    .from("instance_settings")
    .select("key, value")

  if (dbError) {
    // If table doesn't exist yet, return defaults so the UI isn't broken
    if (dbError.code === "PGRST205") {
      return NextResponse.json({
        timezone: "Asia/Karachi",
        currency_code: "PKR",
        currency_symbol: "Rs.",
      })
    }
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  const settings: Record<string, string> = {}
  for (const row of data ?? []) {
    settings[row.key] = row.value
  }

  return NextResponse.json(settings)
}

export async function PATCH(request: Request) {
  const { authenticated, error } = await verifyAdminAccess("settings")
  if (!authenticated) {
    return NextResponse.json({ error }, { status: 401 })
  }

  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 })
  }

  const body = await request.json()

  // Check if financial data exists — lock currency/timezone if so
  const lockedKeys = ["timezone", "currency_code", "currency_symbol"]
  const hasLockedKey = Object.keys(body).some((k) => lockedKeys.includes(k))

  if (hasLockedKey) {
    const [{ count: paymentsCount }, { count: bookingsCount }] = await Promise.all([
      supabaseAdmin.from("maintenance_payments").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("bookings").select("id", { count: "exact", head: true }),
    ])

    if ((paymentsCount ?? 0) > 0 || (bookingsCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "Currency and timezone settings are locked because payment records exist in the system." },
        { status: 403 }
      )
    }
  }

  // Validate only allowed keys and their values
  const updates: { key: string; value: string }[] = []
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.includes(key as typeof ALLOWED_KEYS[number])) {
      return NextResponse.json({ error: `Invalid setting key: ${key}` }, { status: 400 })
    }
    if (typeof value !== "string" || !value.trim()) {
      return NextResponse.json({ error: `Invalid value for ${key}` }, { status: 400 })
    }
    const trimmed = value.trim()
    // Validate currency_code: exactly 3 uppercase letters
    if (key === "currency_code" && !/^[A-Z]{3}$/.test(trimmed)) {
      return NextResponse.json({ error: "Currency code must be exactly 3 uppercase letters (e.g., PKR, USD, EUR)" }, { status: 400 })
    }
    // Validate currency_symbol: 1-5 characters
    if (key === "currency_symbol" && (trimmed.length < 1 || trimmed.length > 5)) {
      return NextResponse.json({ error: "Currency symbol must be 1-5 characters (e.g., Rs., $)" }, { status: 400 })
    }
    updates.push({ key, value: trimmed })
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No settings to update" }, { status: 400 })
  }

  // Update each setting
  for (const { key, value } of updates) {
    const { error: updateError } = await supabaseAdmin
      .from("instance_settings")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", key)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  }

  clearInstanceSettingsCache()

  return NextResponse.json({ success: true })
}

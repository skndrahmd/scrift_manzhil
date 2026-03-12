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

  // Validate only allowed keys
  const updates: { key: string; value: string }[] = []
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.includes(key as typeof ALLOWED_KEYS[number])) {
      return NextResponse.json({ error: `Invalid setting key: ${key}` }, { status: 400 })
    }
    if (typeof value !== "string" || !value.trim()) {
      return NextResponse.json({ error: `Invalid value for ${key}` }, { status: 400 })
    }
    updates.push({ key, value: value.trim() })
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

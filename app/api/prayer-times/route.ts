import { NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

// GET - Fetch all prayer times and settings
export async function GET() {
  const { authenticated, error } = await verifyAdminAccess("settings")
  if (!authenticated) {
    return NextResponse.json({ error }, { status: 401 })
  }

  try {
    // Fetch prayer times
    const { data: prayerTimes, error: prayerError } = await supabaseAdmin
      .from("prayer_times")
      .select("*")
      .order("sort_order", { ascending: true })

    if (prayerError) {
      console.error("Failed to fetch prayer times:", prayerError)
      return NextResponse.json({ error: prayerError.message }, { status: 500 })
    }

    // Fetch settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("prayer_times_settings")
      .select("*")
      .eq("id", 1)
      .single()

    if (settingsError && settingsError.code !== "PGRST116") {
      console.error("Failed to fetch prayer times settings:", settingsError)
      return NextResponse.json({ error: settingsError.message }, { status: 500 })
    }

    return NextResponse.json({
      prayerTimes: prayerTimes || [],
      settings: settings || { is_enabled: false },
    })
  } catch (err) {
    console.error("Error fetching prayer times:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH - Update prayer time or settings
export async function PATCH(req: Request) {
  const { authenticated, error } = await verifyAdminAccess("settings")
  if (!authenticated) {
    return NextResponse.json({ error }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { id, prayer_time, is_enabled } = body

    // Update master toggle
    if (is_enabled !== undefined) {
      const { error: settingsError } = await supabaseAdmin
        .from("prayer_times_settings")
        .upsert({ id: 1, is_enabled }, { onConflict: "id" })

      if (settingsError) {
        console.error("Failed to update prayer times settings:", settingsError)
        return NextResponse.json({ error: settingsError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, is_enabled })
    }

    // Update individual prayer time
    if (id && prayer_time !== undefined) {
      const { data, error: updateError } = await supabaseAdmin
        .from("prayer_times")
        .update({ prayer_time })
        .eq("id", id)
        .select()
        .single()

      if (updateError) {
        console.error("Failed to update prayer time:", updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ prayerTime: data })
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  } catch (err) {
    console.error("Error updating prayer times:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

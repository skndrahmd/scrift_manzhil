import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { profileId, months = 12 } = await request.json()

    if (!profileId) return new Response("profileId required", { status: 400 })

    // Optimized: Only fetch maintenance_charges field
    const { data: profile } = await supabase
      .from("profiles")
      .select("maintenance_charges")
      .eq("id", profileId)
      .single()
    if (!profile) return new Response("Profile not found", { status: 404 })

    const amount = profile.maintenance_charges || 0

    const now = new Date()
    
    // Generate all year-month combinations we need to check
    const monthsToCheck: Array<{ year: number; month: number }> = []
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      monthsToCheck.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1
      })
    }

    // Optimized: Fetch all existing payments at once (fixes N+1 problem)
    const { data: existingPayments } = await supabase
      .from("maintenance_payments")
      .select("year, month")
      .eq("profile_id", profileId)
      .in("year", [...new Set(monthsToCheck.map(m => m.year))])

    // Create a Set of existing year-month combinations for fast lookup
    const existingSet = new Set(
      (existingPayments || []).map(p => `${p.year}-${p.month}`)
    )

    // Build insert array for missing months
    const toInsert: any[] = []
    for (const { year, month } of monthsToCheck) {
      if (!existingSet.has(`${year}-${month}`)) {
        toInsert.push({ profile_id: profileId, year, month, amount, status: "unpaid" })
      }
    }

    if (toInsert.length > 0) {
      await supabase.from("maintenance_payments").insert(toInsert)
    }

    return new Response("ok", { status: 200 })
  } catch (e) {
    console.error("ensure-months error:", e)
    return new Response("error", { status: 500 })
  }
}

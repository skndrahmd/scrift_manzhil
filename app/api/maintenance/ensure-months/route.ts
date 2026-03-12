import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getPakistanTime } from "@/lib/date"
import { verifyAdminAccess } from "@/lib/auth/api-auth"

export async function POST(request: NextRequest) {
  const { authenticated, error: authError } = await verifyAdminAccess("units")
  if (!authenticated) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    const { unitId, months = 12 } = await request.json()

    if (!unitId) return new Response("unitId required", { status: 400 })

    // Fetch maintenance_charges from units table
    const { data: unit } = await supabaseAdmin
      .from("units")
      .select("maintenance_charges")
      .eq("id", unitId)
      .single()
    if (!unit) return new Response("Unit not found", { status: 404 })

    const amount = unit.maintenance_charges || 0

    // Fetch primary resident for this unit
    const { data: primaryResident } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("unit_id", unitId)
      .eq("is_primary_resident", true)
      .eq("is_active", true)
      .single()

    const primaryProfileId = primaryResident?.id || null

    const now = await getPakistanTime()

    // Generate all year-month combinations we need to check
    const monthsToCheck: Array<{ year: number; month: number }> = []
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      monthsToCheck.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1
      })
    }

    // Fetch all existing payments at once by unit_id
    const { data: existingPayments } = await supabaseAdmin
      .from("maintenance_payments")
      .select("year, month")
      .eq("unit_id", unitId)
      .in("year", [...new Set(monthsToCheck.map(m => m.year))])

    // Create a Set of existing year-month combinations for fast lookup
    const existingSet = new Set(
      (existingPayments || []).map(p => `${p.year}-${p.month}`)
    )

    // Build insert array for missing months
    const toInsert: any[] = []
    for (const { year, month } of monthsToCheck) {
      if (!existingSet.has(`${year}-${month}`)) {
        toInsert.push({ unit_id: unitId, profile_id: primaryProfileId, year, month, amount, status: "unpaid" })
      }
    }

    if (toInsert.length > 0) {
      await supabaseAdmin.from("maintenance_payments").insert(toInsert)
    }

    return new Response("ok", { status: 200 })
  } catch (e) {
    console.error("ensure-months error:", e)
    return new Response("error", { status: 500 })
  }
}

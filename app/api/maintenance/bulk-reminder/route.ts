import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { sendMessage, formatCurrency } from "@/lib/twilio"
import { verifyAdminAccess } from "@/lib/auth/api-auth"

export async function POST(request: NextRequest) {
  const { authenticated, error: authError } = await verifyAdminAccess("units")
  if (!authenticated) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { unitIds } = body as { unitIds: string[] }

    if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
      return new Response(JSON.stringify({ error: "No unit IDs provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log(`[BULK MAINTENANCE REMINDER] Sending reminders for ${unitIds.length} units`)

    // Fetch units with their primary residents
    const { data: units, error: unitError } = await supabaseAdmin
      .from("units")
      .select("id, apartment_number, maintenance_charges, last_payment_date, maintenance_paid, profiles(id, name, phone_number, is_primary_resident, is_active)")
      .in("id", unitIds)

    if (unitError) {
      console.error("[BULK MAINTENANCE REMINDER] Error fetching units:", unitError)
      return new Response(JSON.stringify({ error: "Failed to fetch units" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!units || units.length === 0) {
      return new Response(JSON.stringify({ error: "No valid units found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    const results = {
      total: units.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Send reminders to primary resident of each unit
    for (const unit of units) {
      const residents = (unit.profiles as any[]) || []
      const primaryResident =
        residents.find((r) => r.is_primary_resident && r.is_active) ||
        residents.find((r) => r.is_active) ||
        null

      if (!primaryResident?.phone_number) {
        console.warn(`[BULK MAINTENANCE REMINDER] No primary resident with phone for unit ${unit.apartment_number}`)
        results.failed++
        results.errors.push(`Unit ${unit.apartment_number}: No primary resident with phone number`)
        continue
      }

      try {
        const residentName = primaryResident.name || "Resident"
        const monthlyCharges = unit.maintenance_charges || 0

        // Calculate overdue months if last payment date exists
        let overdueMonths = 0
        let lastPaymentText = ""

        if (unit.last_payment_date) {
          const lastPayment = new Date(unit.last_payment_date)
          const currentDate = new Date()
          overdueMonths = (currentDate.getFullYear() - lastPayment.getFullYear()) * 12 +
            (currentDate.getMonth() - lastPayment.getMonth())

          lastPaymentText = `\nLast Payment: ${lastPayment.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'Asia/Karachi'
          })}`
        }

        const totalDue = overdueMonths > 0 ? monthlyCharges * overdueMonths : monthlyCharges

        const message = [
          "Hello, this is Manzhil by Scrift.",
          "",
          "Maintenance Payment Reminder",
          "",
          `Hi ${residentName}, this is a payment reminder for Unit ${unit.apartment_number}.${lastPaymentText}`,
          "",
          "Payment Details:",
          `Monthly Charges: Rs. ${formatCurrency(monthlyCharges)}`,
          overdueMonths > 0 ? `Overdue Months: ${overdueMonths}\nTotal Due: Rs. ${formatCurrency(totalDue)}` : "",
          "",
          "Please make your payment at your earliest convenience to avoid any service interruptions.",
          "",
          "If you've already paid, please disregard this message.",
          "",
          "Thank you for your cooperation!",
          "- Manzhil by Scrift Team",
        ].filter(Boolean).join("\n")

        const result = await sendMessage(primaryResident.phone_number, message)

        if (result.ok) {
          console.log(`[BULK MAINTENANCE REMINDER] Sent to ${primaryResident.name} for unit ${unit.apartment_number}`)
          results.sent++
        } else {
          console.error(`[BULK MAINTENANCE REMINDER] Failed to send for unit ${unit.apartment_number}:`, result.error)
          results.failed++
          results.errors.push(`Unit ${unit.apartment_number}: ${result.error || 'Unknown error'}`)
        }
      } catch (error) {
        console.error(`[BULK MAINTENANCE REMINDER] Error sending for unit ${unit.apartment_number}:`, error)
        results.failed++
        results.errors.push(`Unit ${unit.apartment_number}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    console.log(`[BULK MAINTENANCE REMINDER] Complete - Sent: ${results.sent}, Failed: ${results.failed}`)

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("[BULK MAINTENANCE REMINDER] Error:", error)
    return new Response(
      JSON.stringify({ error: "Failed to send maintenance reminders" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}

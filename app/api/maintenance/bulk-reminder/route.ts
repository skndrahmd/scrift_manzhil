import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { sendMessage, formatCurrency } from "@/lib/twilio"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { profileIds } = body as { profileIds: string[] }

    if (!profileIds || !Array.isArray(profileIds) || profileIds.length === 0) {
      return new Response(JSON.stringify({ error: "No profile IDs provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log(`[BULK MAINTENANCE REMINDER] Sending reminders to ${profileIds.length} residents`)

    // Fetch profiles for selected residents
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, phone_number, maintenance_charges, last_payment_date, maintenance_paid")
      .in("id", profileIds)
      .eq("is_active", true)

    if (profileError) {
      console.error("[BULK MAINTENANCE REMINDER] Error fetching profiles:", profileError)
      return new Response(JSON.stringify({ error: "Failed to fetch profiles" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ error: "No valid profiles found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    const results = {
      total: profiles.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Send reminders to each selected resident
    for (const profile of profiles) {
      if (!profile.phone_number) {
        console.warn(`[BULK MAINTENANCE REMINDER] No phone number for profile ${profile.id}`)
        results.failed++
        results.errors.push(`${profile.name}: No phone number`)
        continue
      }

      try {
        const residentName = profile.name || "Resident"
        const monthlyCharges = profile.maintenance_charges || 0

        // Calculate overdue months if last payment date exists
        let overdueMonths = 0
        let lastPaymentText = ""

        if (profile.last_payment_date) {
          const lastPayment = new Date(profile.last_payment_date)
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
          `Hi ${residentName}, this is a payment reminder.${lastPaymentText}`,
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

        const result = await sendMessage(profile.phone_number, message)

        if (result.ok) {
          console.log(`[BULK MAINTENANCE REMINDER] Sent to ${profile.name} (${profile.phone_number})`)
          results.sent++
        } else {
          console.error(`[BULK MAINTENANCE REMINDER] Failed to send to ${profile.name}:`, result.error)
          results.failed++
          results.errors.push(`${profile.name}: ${result.error || 'Unknown error'}`)
        }
      } catch (error) {
        console.error(`[BULK MAINTENANCE REMINDER] Error sending to ${profile.name}:`, error)
        results.failed++
        results.errors.push(`${profile.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

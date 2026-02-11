import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/dateUtils"
import { sendMaintenancePaymentConfirmed, formatMonthYear } from "@/lib/twilio"

const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com").replace(/\/$/, "")

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const paymentId = body?.paymentId as string | undefined
    const isPaid = body?.isPaid as boolean | undefined

    if (!paymentId || typeof isPaid !== "boolean") {
      return new Response(JSON.stringify({ error: "Invalid request payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { data: payment, error: fetchError } = await supabase
      .from("maintenance_payments")
      .select(
        `
        *,
        updated_at,
        profiles:profiles!maintenance_payments_profile_id_fkey (
          id,
          name,
          phone_number,
          apartment_number
        )
      `,
      )
      .eq("id", paymentId)
      .single()

    if (fetchError || !payment) {
      return new Response(JSON.stringify({ error: "Payment record not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Store original updated_at for optimistic locking
    const originalUpdatedAt = payment.updated_at

    const updates: Record<string, unknown> = {
      status: isPaid ? "paid" : "unpaid",
      updated_at: getPakistanISOString(),
    }

    if (isPaid) {
      updates.paid_date = getPakistanISOString().split("T")[0]
      updates.confirmation_sent = true
      updates.confirmation_sent_at = getPakistanISOString()
    } else {
      updates.paid_date = null
      updates.confirmation_sent = false
      updates.confirmation_sent_at = null
    }

    // Optimistic locking: only update if record hasn't changed since we read it
    const { data: updateResult, error: updateError } = await supabase
      .from("maintenance_payments")
      .update(updates)
      .eq("id", paymentId)
      .eq("updated_at", originalUpdatedAt)
      .select()

    if (updateError) {
      throw updateError
    }

    // If no rows were updated, the record was modified by another process
    if (!updateResult || updateResult.length === 0) {
      return new Response(JSON.stringify({
        error: "Record was modified by another process. Please refresh and try again.",
        code: "CONCURRENT_MODIFICATION"
      }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Update the units table to keep maintenance_paid in sync
    const unitId = (payment as any).unit_id
    if (unitId) {
      const { error: unitUpdateError } = await supabase
        .from("units")
        .update({
          maintenance_paid: isPaid,
          last_payment_date: isPaid ? getPakistanISOString().split("T")[0] : null,
          updated_at: getPakistanISOString(),
        })
        .eq("id", unitId)

      if (unitUpdateError) {
        console.error("Failed to update unit maintenance status:", unitUpdateError)
      }
    }

    if (isPaid && payment.profiles?.phone_number) {
      const monthYear = formatMonthYear(payment.year, payment.month)
      const invoiceLink = `${APP_BASE_URL}/maintenance-invoice/${payment.id}?snapshot=paid`

      try {
        await sendMaintenancePaymentConfirmed({
          phone: payment.profiles.phone_number,
          name: payment.profiles.name || "Resident",
          monthYear,
          amount: Number(payment.amount ?? 0),
          receiptUrl: invoiceLink,
        })
      } catch (notifyError) {
        console.error("Failed to send maintenance payment notification:", notifyError)
      }

      // Create transaction record for accounting
      try {
        const monthName = new Date(payment.year, payment.month - 1, 1).toLocaleString("en-US", { month: "long" })
        await supabase.from("transactions").insert({
          transaction_type: "maintenance_income",
          reference_id: payment.id,
          profile_id: payment.profiles?.id || (payment as any).profile_id,
          amount: Number(payment.amount),
          description: `Maintenance - ${monthName} ${payment.year}`,
          transaction_date: new Date().toISOString().split('T')[0],
          payment_method: "cash",
          notes: `Apartment: ${payment.profiles?.apartment_number || 'N/A'}`
        })
        console.log("Transaction record created for maintenance payment:", payment.id)
      } catch (transactionError) {
        console.error("Error creating transaction record:", transactionError)
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Maintenance status update error:", error)
    return new Response(JSON.stringify({ error: "Unable to update maintenance status" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

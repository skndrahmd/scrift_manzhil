/**
 * @module maintenance
 * Service layer for maintenance payment status updates, unit record syncing,
 * transaction accounting, and WhatsApp payment confirmation notifications.
 */
import { supabaseAdmin } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/date"
import { sendMaintenancePaymentConfirmed, formatMonthYear } from "@/lib/twilio"
import { ServiceError } from "./complaint"

const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")

/**
 * Updates a maintenance payment status (paid/unpaid), syncs the unit record,
 * handles transaction accounting, and sends WhatsApp confirmation.
 * @param paymentId - UUID of the maintenance payment record
 * @param isPaid - True to mark as paid (creates transaction), false to mark as unpaid (cleans up transaction)
 * @returns Object with `{ success: true }` on successful update
 * @throws {ServiceError} 400 if payload is invalid, 404 if payment not found, 409 on concurrent modification
 */
export async function updateMaintenancePaymentStatus(paymentId: string, isPaid: boolean) {
  if (!paymentId || typeof isPaid !== "boolean") {
    throw new ServiceError("Invalid request payload", 400)
  }

  const { data: payment, error: fetchError } = await supabaseAdmin
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
    throw new ServiceError("Payment record not found", 404)
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
  const { data: updateResult, error: updateError } = await supabaseAdmin
    .from("maintenance_payments")
    .update(updates)
    .eq("id", paymentId)
    .eq("updated_at", originalUpdatedAt)
    .select()

  if (updateError) {
    throw updateError
  }

  if (!updateResult || updateResult.length === 0) {
    throw new ServiceError(
      "Record was modified by another process. Please refresh and try again.",
      409,
      "CONCURRENT_MODIFICATION"
    )
  }

  // If marking as unpaid, clean up any transaction records for this payment
  if (!isPaid) {
    try {
      await supabaseAdmin
        .from("transactions")
        .delete()
        .eq("reference_id", paymentId)
        .eq("transaction_type", "maintenance_income")
      console.log("Cleaned up transaction records for maintenance payment:", paymentId)
    } catch (cleanupError) {
      console.error("Error cleaning up transaction records:", cleanupError)
    }
  }

  // Update the units table to keep maintenance_paid in sync
  const unitId = (payment as any).unit_id
  if (unitId) {
    const { error: unitUpdateError } = await supabaseAdmin
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

    // Create transaction record for accounting (with duplicate guard)
    try {
      const { data: existingTxn } = await supabaseAdmin
        .from("transactions")
        .select("id")
        .eq("reference_id", payment.id)
        .eq("transaction_type", "maintenance_income")
        .maybeSingle()

      if (!existingTxn) {
        const monthName = new Date(payment.year, payment.month - 1, 1).toLocaleString("en-US", { month: "long" })
        await supabaseAdmin.from("transactions").insert({
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
      } else {
        console.log("Transaction record already exists for maintenance payment:", payment.id)
      }
    } catch (transactionError) {
      console.error("Error creating transaction record:", transactionError)
    }
  }

  return { success: true }
}

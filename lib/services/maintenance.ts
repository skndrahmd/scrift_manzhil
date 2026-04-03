/**
 * @module maintenance
 * Service layer for maintenance payment status updates, unit record syncing,
 * transaction accounting, and WhatsApp payment confirmation notifications.
 */
import { supabaseAdmin } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/date"
import { sendMaintenancePaymentConfirmed, formatMonthYear } from "@/lib/twilio"
import { ServiceError } from "./complaint"
import { createModuleLogger } from "@/lib/logger"

const log = createModuleLogger("maintenance")

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

  // Look up current primary resident for the unit (don't rely on stale profile_id)
  const { data: currentPrimary } = await supabaseAdmin
    .from("profiles")
    .select("id, name, phone_number, apartment_number")
    .eq("unit_id", (payment as any).unit_id)
    .eq("is_primary_resident", true)
    .eq("is_active", true)
    .single()

  const confirmationRecipient = currentPrimary || payment.profiles

  // Store original updated_at for optimistic locking
  const originalUpdatedAt = payment.updated_at

  const updates: Record<string, unknown> = {
    status: isPaid ? "paid" : "unpaid",
    updated_at: await getPakistanISOString(),
  }

  if (isPaid) {
    updates.paid_date = (await getPakistanISOString()).split("T")[0]
    updates.confirmation_sent = true
    updates.confirmation_sent_at = await getPakistanISOString()
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
      log.debug("Cleaned up transaction records", { paymentId })
    } catch (cleanupError) {
      log.error("Error cleaning up transaction records", { paymentId, error: cleanupError })
    }
  }

  // Update the units table to keep maintenance_paid in sync
  const unitId = (payment as any).unit_id
  if (unitId) {
    const { error: unitUpdateError } = await supabaseAdmin
      .from("units")
      .update({
        maintenance_paid: isPaid,
        last_payment_date: isPaid ? (await getPakistanISOString()).split("T")[0] : null,
        updated_at: await getPakistanISOString(),
      })
      .eq("id", unitId)

    if (unitUpdateError) {
      log.error("Failed to update unit maintenance status", { unitId, error: unitUpdateError })
    }
  }

  if (isPaid && confirmationRecipient?.phone_number) {
    const monthYear = formatMonthYear(payment.year, payment.month)
    const invoiceLink = `${APP_BASE_URL}/maintenance-invoice/${payment.id}?snapshot=paid`

    try {
      await sendMaintenancePaymentConfirmed({
        phone: confirmationRecipient.phone_number,
        name: confirmationRecipient.name || "Resident",
        monthYear,
        amount: Number(payment.amount ?? 0),
        receiptUrl: invoiceLink,
      })
    } catch (notifyError) {
      log.error("Failed to send maintenance payment notification", { paymentId, error: notifyError })
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
          profile_id: confirmationRecipient?.id || (payment as any).profile_id,
          amount: Number(payment.amount),
          description: `Maintenance - ${monthName} ${payment.year}`,
          transaction_date: new Date().toISOString().split('T')[0],
          payment_method: "cash",
          notes: `Apartment: ${confirmationRecipient?.apartment_number || 'N/A'}`
        })
        log.debug("Transaction record created", { paymentId })
      } else {
        log.debug("Transaction record already exists", { paymentId })
      }
    } catch (transactionError) {
      log.error("Error creating transaction record", { paymentId, error: transactionError })
    }
  }

  return { success: true }
}

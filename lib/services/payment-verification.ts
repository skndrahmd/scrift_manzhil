/**
 * @module payment-verification
 * Service layer for payment verification review (approve/reject).
 * Delegates to existing maintenance and booking services on approval.
 */
import { supabaseAdmin } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/date"
import { sendWithFallback } from "@/lib/twilio/send"
import { getTemplateSid } from "@/lib/twilio/templates"
import { getMessage } from "@/lib/webhook/messages"
import { MSG } from "@/lib/webhook/message-keys"
import { updateMaintenancePaymentStatus } from "./maintenance"
import { updateBookingPaymentStatus } from "./booking"
import { ServiceError } from "./complaint"

/**
 * Approves or rejects a payment verification, updating the underlying payment
 * record on approval and notifying the resident via WhatsApp.
 * @param verificationId - UUID of the payment_verifications record
 * @param status - "approved" or "rejected"
 * @param adminUserId - UUID of the reviewing admin
 * @param rejectionReason - Required when rejecting
 */
export async function updatePaymentVerificationStatus(
  verificationId: string,
  status: "approved" | "rejected",
  adminUserId: string,
  rejectionReason?: string
) {
  if (!verificationId || !status) {
    throw new ServiceError("Invalid request payload", 400)
  }

  if (status === "rejected" && !rejectionReason?.trim()) {
    throw new ServiceError("Rejection reason is required", 400)
  }

  // Fetch the verification with resident info
  const { data: verification, error: fetchError } = await supabaseAdmin
    .from("payment_verifications")
    .select(`
      *,
      profiles:resident_id (id, name, phone_number, apartment_number),
      units:unit_id (apartment_number)
    `)
    .eq("id", verificationId)
    .single()

  if (fetchError || !verification) {
    throw new ServiceError("Verification record not found", 404)
  }

  if (verification.status !== "pending") {
    throw new ServiceError("Verification has already been reviewed", 409)
  }

  // Build description for notifications
  const profile = verification.profiles as any
  const unit = verification.units as any
  const apartmentNumber = unit?.apartment_number || profile?.apartment_number || "N/A"
  const amount = Number(verification.amount ?? 0)

  let description = ""
  if (verification.payment_type === "maintenance") {
    // Fetch month info for description
    if (verification.maintenance_payment_id) {
      const { data: mp } = await supabaseAdmin
        .from("maintenance_payments")
        .select("month, year")
        .eq("id", verification.maintenance_payment_id)
        .single()
      if (mp) {
        const monthName = new Date(mp.year, mp.month - 1, 1).toLocaleString("en-US", { month: "long" })
        description = `Maintenance - ${monthName} ${mp.year}`
      } else {
        description = "Maintenance Payment"
      }
    } else {
      description = "Maintenance Payment"
    }
  } else {
    description = "Hall Booking"
  }

  // Update verification record
  const updates: Record<string, unknown> = {
    status,
    reviewed_by: adminUserId,
    reviewed_at: getPakistanISOString(),
  }

  if (status === "rejected") {
    updates.rejection_reason = rejectionReason!.trim()
  }

  const { error: updateError } = await supabaseAdmin
    .from("payment_verifications")
    .update(updates)
    .eq("id", verificationId)
    .eq("status", "pending") // Optimistic lock on pending status

  if (updateError) {
    throw new ServiceError("Failed to update verification", 500)
  }

  if (status === "approved") {
    // Mark the underlying payment as paid using existing service functions
    try {
      if (verification.payment_type === "maintenance" && verification.maintenance_payment_id) {
        await updateMaintenancePaymentStatus(verification.maintenance_payment_id, true)
      } else if (verification.payment_type === "booking" && verification.booking_id) {
        await updateBookingPaymentStatus(verification.booking_id, "paid")
      }
    } catch (paymentError) {
      console.error("[PaymentVerification] Error updating underlying payment:", paymentError)
      // The verification is already approved — the underlying payment update failing
      // should not roll back the verification. Log and continue.
    }

    // Send approval WhatsApp (the existing services already send confirmations,
    // but we also send our custom approval message)
    if (profile?.phone_number) {
      try {
        const templateSid = await getTemplateSid("payment_approved")
        const fallback = await getMessage(MSG.PAYMENT_APPROVED, { description, amount: String(amount) })
        await sendWithFallback(
          profile.phone_number,
          templateSid,
          { "1": profile.name || "Resident", "2": description, "3": String(amount) },
          fallback
        )
      } catch (notifyError) {
        console.error("[PaymentVerification] Failed to send approval notification:", notifyError)
      }
    }
  } else {
    // Send rejection WhatsApp
    if (profile?.phone_number) {
      try {
        const templateSid = await getTemplateSid("payment_rejected")
        const fallback = await getMessage(MSG.PAYMENT_REJECTED, {
          description,
          reason: rejectionReason!.trim(),
        })
        await sendWithFallback(
          profile.phone_number,
          templateSid,
          { "1": profile.name || "Resident", "2": description, "3": rejectionReason!.trim() },
          fallback
        )
      } catch (notifyError) {
        console.error("[PaymentVerification] Failed to send rejection notification:", notifyError)
      }
    }
  }

  return { success: true }
}

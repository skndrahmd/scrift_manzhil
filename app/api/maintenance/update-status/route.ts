import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/dateUtils"
import { sendWhatsAppMessage, sendWhatsAppTemplate } from "@/lib/twilio"

const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com").replace(/\/$/, "")
const MAINTENANCE_PAYMENT_CONFIRMED_TEMPLATE_SID = process.env.TWILIO_MAINTENANCE_PAYMENT_CONFIRMED_TEMPLATE_SID

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

    const { error: updateError } = await supabase.from("maintenance_payments").update(updates).eq("id", paymentId)

    if (updateError) {
      throw updateError
    }

    // Also update the profiles table to keep maintenance_paid in sync
    const profileId = payment.profiles?.id || (payment as any).profile_id
    if (profileId) {
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          maintenance_paid: isPaid,
          last_payment_date: isPaid ? getPakistanISOString().split("T")[0] : null,
          updated_at: getPakistanISOString(),
        })
        .eq("id", profileId)

      if (profileUpdateError) {
        console.error("Failed to update profile maintenance status:", profileUpdateError)
        // Don't throw - payment update succeeded, this is just for UI sync
      }
    }

    if (isPaid && payment.profiles?.phone_number) {
      const amount = Number(payment.amount ?? 0).toLocaleString("en-PK")
      const month = new Date(payment.year, payment.month - 1, 1).toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      })
      const invoiceLink = `${APP_BASE_URL}/maintenance-invoice/${payment.id}?snapshot=paid`
      const residentName = payment.profiles.name || "Resident"

      try {
        const paymentDate = new Date()
        const monthName = new Date(payment.year, payment.month - 1, 1).toLocaleString("en-US", { month: "long" })

        // Fallback message
        const fallbackMessage = `Hello, this is Manzhil by Scrift.

Hi ${residentName}, your maintenance payment for ${month} (Rs. ${amount}) has been received and confirmed.
Thank you for keeping your dues current.
Invoice: ${invoiceLink}
- Manzhil by Scrift Team`

        if (MAINTENANCE_PAYMENT_CONFIRMED_TEMPLATE_SID) {
          // Use WhatsApp template with fallback
          await sendWhatsAppTemplate(payment.profiles.phone_number, MAINTENANCE_PAYMENT_CONFIRMED_TEMPLATE_SID, {
            "1": residentName,
            "2": monthName,
            "3": payment.year.toString(),
            "4": payment.profiles.apartment_number || "N/A",
            "5": amount,
            "6": paymentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Karachi" }),
            "7": invoiceLink,
          }, fallbackMessage)
        } else {
          // No template configured, send fallback directly
          await sendWhatsAppMessage(payment.profiles.phone_number, fallbackMessage)
        }
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
          payment_method: "cash", // Default, can be updated to track actual method
          notes: `Apartment: ${payment.profiles?.apartment_number || 'N/A'}`
        })
        console.log("Transaction record created for maintenance payment:", payment.id)
      } catch (transactionError) {
        console.error("Error creating transaction record:", transactionError)
        // Don't fail the request if transaction record fails
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


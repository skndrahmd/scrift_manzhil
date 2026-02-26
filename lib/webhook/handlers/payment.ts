/**
 * Payment Receipt Flow Handler
 * Guides residents through submitting payment receipts for verification.
 * Flow: select type → pick pending payment → view accounts → upload receipt image
 */

import { supabaseAdmin } from "@/lib/supabase"
import { sendWhatsAppMessage } from "@/lib/twilio"
import type { Profile, UserState, MediaInfo } from "../types"
import { setState, clearState } from "../state"
import { formatCurrency } from "../utils"
import { getMessage, getLabels } from "../messages"
import { MSG } from "../message-keys"
import { getComplaintRecipients } from "../config"

/**
 * Initialize payment receipt flow
 */
export async function initializePaymentFlow(
  profile: Profile,
  phoneNumber: string,
  language?: string
): Promise<string> {
  // Check if any payment methods are enabled
  const { data: methods } = await supabaseAdmin
    .from("payment_methods")
    .select("id")
    .eq("is_enabled", true)
    .limit(1)

  if (!methods || methods.length === 0) {
    return await getMessage(MSG.PAYMENT_NO_METHODS, undefined, language)
  }

  await setState(phoneNumber, {
    step: "payment_type_selection",
    type: "payment",
    payment: {},
    language,
  })

  const labels = await getLabels(MSG.LABELS_PAYMENT_MENU_OPTIONS, language)
  const options = [
    `1. 💰 ${labels[0] || "Maintenance"}`,
    `2. 🏛️ ${labels[1] || "Hall Booking"}`,
  ].join("\n")

  return await getMessage(MSG.PAYMENT_MENU, { options }, language)
}

/**
 * Handle payment flow steps
 */
export async function handlePaymentFlow(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState,
  mediaInfo?: MediaInfo
): Promise<string> {
  const choice = message.trim()
  const language = userState.language

  switch (userState.step) {
    case "payment_type_selection":
      return await handleTypeSelection(choice, profile, phoneNumber, userState, language)

    case "payment_selection":
      return await handlePaymentSelection(choice, profile, phoneNumber, userState, language)

    case "payment_receipt_upload":
      return await handleReceiptUpload(profile, phoneNumber, userState, mediaInfo, language)

    default:
      return await getMessage(MSG.ERROR_GENERIC, undefined, language)
  }
}

/**
 * Handle payment type selection (maintenance vs booking)
 */
async function handleTypeSelection(
  choice: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState,
  language?: string
): Promise<string> {
  let paymentType: "maintenance" | "booking"

  if (choice === "1") {
    paymentType = "maintenance"
  } else if (choice === "2") {
    paymentType = "booking"
  } else {
    return await getMessage(MSG.PAYMENT_MENU, {
      options: "1. 💰 Maintenance\n2. 🏛️ Hall Booking",
    }, language)
  }

  userState.payment = { ...userState.payment, payment_type: paymentType }

  if (paymentType === "maintenance") {
    return await handleMaintenancePending(profile, phoneNumber, userState, language)
  } else {
    return await handleBookingPending(profile, phoneNumber, userState, language)
  }
}

/**
 * Fetch and display pending maintenance payments
 */
async function handleMaintenancePending(
  profile: Profile,
  phoneNumber: string,
  userState: UserState,
  language?: string
): Promise<string> {
  if (!profile.unit_id) {
    return await getMessage(MSG.PAYMENT_NO_PENDING, { type: "maintenance" }, language)
  }

  const { data: payments } = await supabaseAdmin
    .from("maintenance_payments")
    .select("id, year, month, amount, status")
    .eq("unit_id", profile.unit_id)
    .eq("status", "unpaid")
    .order("year", { ascending: true })
    .order("month", { ascending: true })

  if (!payments || payments.length === 0) {
    await clearState(phoneNumber)
    return await getMessage(MSG.PAYMENT_NO_PENDING, { type: "maintenance" }, language)
  }

  // If only one pending payment, auto-select it
  if (payments.length === 1) {
    const p = payments[0]
    const monthName = new Date(p.year, p.month - 1).toLocaleString("en-US", { month: "long" })
    const description = `Maintenance - ${monthName} ${p.year}`

    userState.payment = {
      ...userState.payment,
      selected_payment_id: p.id,
      amount: p.amount,
      description,
      unit_id: profile.unit_id,
    }
    userState.step = "payment_receipt_upload"
    await setState(phoneNumber, userState)

    return await showPaymentMethods(p.amount, description, language)
  }

  // Multiple pending payments — show list
  const list = payments.map((p, i) => {
    const monthName = new Date(p.year, p.month - 1).toLocaleString("en-US", { month: "long" })
    return `${i + 1}. ${monthName} ${p.year} — ${formatCurrency(p.amount)}`
  }).join("\n")

  // Store payment list in state for selection
  userState.payment = {
    ...userState.payment,
    unit_id: profile.unit_id,
  }
  userState.step = "payment_selection"
  // Store the payments list data for later reference
  userState.statusItems = payments
  await setState(phoneNumber, userState)

  return await getMessage(MSG.PAYMENT_SELECT, { list }, language)
}

/**
 * Fetch and display pending booking payments
 */
async function handleBookingPending(
  profile: Profile,
  phoneNumber: string,
  userState: UserState,
  language?: string
): Promise<string> {
  const { data: bookings } = await supabaseAdmin
    .from("bookings")
    .select("id, booking_date, booking_charges, payment_status")
    .eq("profile_id", profile.id)
    .eq("payment_status", "pending")
    .order("booking_date", { ascending: true })

  if (!bookings || bookings.length === 0) {
    await clearState(phoneNumber)
    return await getMessage(MSG.PAYMENT_NO_PENDING, { type: "booking" }, language)
  }

  // If only one pending booking, auto-select it
  if (bookings.length === 1) {
    const b = bookings[0]
    const dateStr = new Date(b.booking_date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Karachi",
    })
    const description = `Hall Booking - ${dateStr}`

    userState.payment = {
      ...userState.payment,
      selected_payment_id: b.id,
      amount: b.booking_charges,
      description,
      unit_id: profile.unit_id || undefined,
    }
    userState.step = "payment_receipt_upload"
    await setState(phoneNumber, userState)

    return await showPaymentMethods(b.booking_charges, description, language)
  }

  // Multiple pending bookings — show list
  const list = bookings.map((b, i) => {
    const dateStr = new Date(b.booking_date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Karachi",
    })
    return `${i + 1}. ${dateStr} — ${formatCurrency(b.booking_charges)}`
  }).join("\n")

  userState.payment = {
    ...userState.payment,
    unit_id: profile.unit_id || undefined,
  }
  userState.step = "payment_selection"
  userState.statusItems = bookings
  await setState(phoneNumber, userState)

  return await getMessage(MSG.PAYMENT_SELECT, { list }, language)
}

/**
 * Handle payment selection from list
 */
async function handlePaymentSelection(
  choice: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState,
  language?: string
): Promise<string> {
  const items = userState.statusItems || []
  const choiceNum = parseInt(choice, 10)

  if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > items.length) {
    const list = items.map((item: any, i: number) => {
      if (userState.payment?.payment_type === "maintenance") {
        const monthName = new Date(item.year, item.month - 1).toLocaleString("en-US", { month: "long" })
        return `${i + 1}. ${monthName} ${item.year} — ${formatCurrency(item.amount)}`
      } else {
        const dateStr = new Date(item.booking_date).toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Karachi",
        })
        return `${i + 1}. ${dateStr} — ${formatCurrency(item.booking_charges)}`
      }
    }).join("\n")
    return await getMessage(MSG.PAYMENT_SELECT, { list }, language)
  }

  const selected = items[choiceNum - 1]
  let amount: number
  let description: string

  if (userState.payment?.payment_type === "maintenance") {
    const monthName = new Date(selected.year, selected.month - 1).toLocaleString("en-US", { month: "long" })
    description = `Maintenance - ${monthName} ${selected.year}`
    amount = selected.amount
  } else {
    const dateStr = new Date(selected.booking_date).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Karachi",
    })
    description = `Hall Booking - ${dateStr}`
    amount = selected.booking_charges
  }

  const paymentId = selected.id

  // Check for existing pending verification
  const referenceColumn = userState.payment?.payment_type === "maintenance"
    ? "maintenance_payment_id"
    : "booking_id"

  const { data: existing } = await supabaseAdmin
    .from("payment_verifications")
    .select("id")
    .eq(referenceColumn, paymentId)
    .eq("status", "pending")
    .limit(1)

  if (existing && existing.length > 0) {
    await clearState(phoneNumber)
    return await getMessage(MSG.PAYMENT_ALREADY_SUBMITTED, undefined, language)
  }

  userState.payment = {
    ...userState.payment,
    selected_payment_id: paymentId,
    amount,
    description,
    unit_id: profile.unit_id || undefined,
  }
  userState.step = "payment_receipt_upload"
  // Clear the items list — no longer needed
  userState.statusItems = undefined
  await setState(phoneNumber, userState)

  return await showPaymentMethods(amount, description, language)
}

/**
 * Show enabled payment methods with account details
 */
async function showPaymentMethods(
  amount: number,
  description: string,
  language?: string
): Promise<string> {
  const { data: methods } = await supabaseAdmin
    .from("payment_methods")
    .select("type, account_title, account_number, bank_name")
    .eq("is_enabled", true)
    .order("sort_order", { ascending: true })

  if (!methods || methods.length === 0) {
    return await getMessage(MSG.PAYMENT_NO_METHODS, undefined, language)
  }

  const typeLabels: Record<string, string> = {
    jazzcash: "JazzCash",
    easypaisa: "EasyPaisa",
    bank_transfer: "Bank Transfer",
  }

  const methodsText = methods.map((m) => {
    const label = typeLabels[m.type] || m.type
    let line = `💳 *${label}*\n   Name: ${m.account_title}\n   Account: ${m.account_number}`
    if (m.bank_name) {
      line += `\n   Bank: ${m.bank_name}`
    }
    return line
  }).join("\n\n")

  return await getMessage(MSG.PAYMENT_METHODS_LIST, {
    amount: formatCurrency(amount),
    description,
    methods: methodsText,
  }, language)
}

/**
 * Handle receipt image upload
 */
async function handleReceiptUpload(
  profile: Profile,
  phoneNumber: string,
  userState: UserState,
  mediaInfo?: MediaInfo,
  language?: string
): Promise<string> {
  if (!mediaInfo) {
    return await getMessage(MSG.PAYMENT_SEND_IMAGE, undefined, language)
  }

  const payment = userState.payment
  if (!payment?.selected_payment_id || !payment.amount) {
    await clearState(phoneNumber)
    return await getMessage(MSG.ERROR_GENERIC, undefined, language)
  }

  try {
    // Check for existing pending verification before uploading
    const referenceColumn = payment.payment_type === "maintenance"
      ? "maintenance_payment_id"
      : "booking_id"

    const { data: existing } = await supabaseAdmin
      .from("payment_verifications")
      .select("id")
      .eq(referenceColumn, payment.selected_payment_id)
      .eq("status", "pending")
      .limit(1)

    if (existing && existing.length > 0) {
      await clearState(phoneNumber)
      return await getMessage(MSG.PAYMENT_ALREADY_SUBMITTED, undefined, language)
    }

    // Download image from Twilio (requires basic auth)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID
    const twilioToken = process.env.TWILIO_AUTH_TOKEN

    const imageResponse = await fetch(mediaInfo.url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64")}`,
      },
    })

    if (!imageResponse.ok) {
      console.error("[Payment] Failed to download image from Twilio:", imageResponse.status)
      return await getMessage(MSG.PAYMENT_UPLOAD_ERROR, undefined, language)
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

    // Determine file extension from content type
    const ext = mediaInfo.contentType.split("/")[1] || "jpg"
    const fileName = `${profile.id}/${Date.now()}.${ext}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("payment-receipts")
      .upload(fileName, imageBuffer, {
        contentType: mediaInfo.contentType,
        upsert: false,
      })

    if (uploadError) {
      console.error("[Payment] Upload error:", uploadError)
      return await getMessage(MSG.PAYMENT_UPLOAD_ERROR, undefined, language)
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("payment-receipts")
      .getPublicUrl(fileName)

    const receiptUrl = urlData.publicUrl

    // Create payment verification record
    const verificationData: Record<string, any> = {
      payment_type: payment.payment_type,
      unit_id: payment.unit_id || profile.unit_id,
      resident_id: profile.id,
      amount: payment.amount,
      receipt_image_url: receiptUrl,
      status: "pending",
    }

    if (payment.payment_type === "maintenance") {
      verificationData.maintenance_payment_id = payment.selected_payment_id
    } else {
      verificationData.booking_id = payment.selected_payment_id
    }

    const { error: insertError } = await supabaseAdmin
      .from("payment_verifications")
      .insert(verificationData)

    if (insertError) {
      console.error("[Payment] Insert verification error:", insertError)
      return await getMessage(MSG.PAYMENT_UPLOAD_ERROR, undefined, language)
    }

    await clearState(phoneNumber)

    // Notify admins asynchronously (don't block response)
    notifyAdminsOfReceipt(profile, payment.description || "", payment.amount).catch(
      (err) => console.error("[Payment] Admin notification error:", err)
    )

    return await getMessage(MSG.PAYMENT_RECEIPT_RECEIVED, {
      description: payment.description || "",
      amount: formatCurrency(payment.amount),
    }, language)
  } catch (error) {
    console.error("[Payment] Receipt upload error:", error)
    return await getMessage(MSG.PAYMENT_UPLOAD_ERROR, undefined, language)
  }
}

/**
 * Notify admins about a new payment receipt submission
 */
async function notifyAdminsOfReceipt(
  profile: Profile,
  description: string,
  amount: number
): Promise<void> {
  try {
    const recipients = await getComplaintRecipients()
    if (recipients.length === 0) return

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ""
    const message = `💳 *New Payment Receipt*

👤 ${profile.name} (${profile.apartment_number})
📝 ${description}
💰 ${formatCurrency(amount)}

A resident has submitted a payment receipt for verification.

🔗 Admin: ${baseUrl}/admin`

    for (const recipient of recipients) {
      try {
        await sendWhatsAppMessage(recipient, message)
      } catch (err) {
        console.error(`[Payment] Failed to notify ${recipient}:`, err)
      }
    }
  } catch (error) {
    console.error("[Payment] Notification error:", error)
  }
}

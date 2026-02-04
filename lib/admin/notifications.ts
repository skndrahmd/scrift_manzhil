import { supabaseAdmin } from "@/lib/supabase"

/**
 * Fallback notification recipients (legacy hardcoded numbers)
 * Used when no recipients are configured in admin_users table
 */
const FALLBACK_COMPLAINT_RECIPIENTS = [
  "+923071288183",
  "+923422546249",
  "+923242927342",
]

const FALLBACK_REMINDER_RECIPIENTS = [
  "+923071288183",
  "+923000777454",
  "+923232244009",
  "+923422546249",
  "+923242927342",
]

/**
 * Get phone numbers of admins who should receive complaint notifications
 * Falls back to hardcoded numbers if no recipients are configured
 */
export async function getComplaintNotificationRecipients(): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("admin_users")
      .select("phone_number")
      .eq("receive_complaint_notifications", true)
      .eq("is_active", true)
      .not("phone_number", "is", null)

    if (error) {
      console.error("[NOTIFICATIONS] Error fetching complaint recipients:", error)
      return FALLBACK_COMPLAINT_RECIPIENTS
    }

    const recipients = data
      ?.map(row => row.phone_number)
      .filter((num): num is string => num !== null && num.length > 0)

    // If no recipients configured, use fallback
    if (!recipients || recipients.length === 0) {
      console.log("[NOTIFICATIONS] No complaint recipients configured, using fallback")
      return FALLBACK_COMPLAINT_RECIPIENTS
    }

    return recipients
  } catch (error) {
    console.error("[NOTIFICATIONS] Exception fetching complaint recipients:", error)
    return FALLBACK_COMPLAINT_RECIPIENTS
  }
}

/**
 * Get phone numbers of admins who should receive reminder notifications
 * (e.g., pending complaint reminders)
 * Falls back to hardcoded numbers if no recipients are configured
 */
export async function getReminderRecipients(): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("admin_users")
      .select("phone_number")
      .eq("receive_reminder_notifications", true)
      .eq("is_active", true)
      .not("phone_number", "is", null)

    if (error) {
      console.error("[NOTIFICATIONS] Error fetching reminder recipients:", error)
      return FALLBACK_REMINDER_RECIPIENTS
    }

    const recipients = data
      ?.map(row => row.phone_number)
      .filter((num): num is string => num !== null && num.length > 0)

    // If no recipients configured, use fallback
    if (!recipients || recipients.length === 0) {
      console.log("[NOTIFICATIONS] No reminder recipients configured, using fallback")
      return FALLBACK_REMINDER_RECIPIENTS
    }

    return recipients
  } catch (error) {
    console.error("[NOTIFICATIONS] Exception fetching reminder recipients:", error)
    return FALLBACK_REMINDER_RECIPIENTS
  }
}

/**
 * Get all notification recipients (union of complaint and reminder recipients)
 */
export async function getAllNotificationRecipients(): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("admin_users")
      .select("phone_number")
      .eq("is_active", true)
      .not("phone_number", "is", null)
      .or("receive_complaint_notifications.eq.true,receive_reminder_notifications.eq.true")

    if (error) {
      console.error("[NOTIFICATIONS] Error fetching all recipients:", error)
      // Return union of fallbacks
      return [...new Set([...FALLBACK_COMPLAINT_RECIPIENTS, ...FALLBACK_REMINDER_RECIPIENTS])]
    }

    const recipients = data
      ?.map(row => row.phone_number)
      .filter((num): num is string => num !== null && num.length > 0)

    if (!recipients || recipients.length === 0) {
      return [...new Set([...FALLBACK_COMPLAINT_RECIPIENTS, ...FALLBACK_REMINDER_RECIPIENTS])]
    }

    return [...new Set(recipients)]
  } catch (error) {
    console.error("[NOTIFICATIONS] Exception fetching all recipients:", error)
    return [...new Set([...FALLBACK_COMPLAINT_RECIPIENTS, ...FALLBACK_REMINDER_RECIPIENTS])]
  }
}

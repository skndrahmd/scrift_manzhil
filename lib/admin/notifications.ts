/**
 * @module lib/admin/notifications
 * Dynamic admin notification recipient fetching.
 * Queries active admins by notification preference toggles for
 * complaints, reminders, and combined recipient lists.
 */

import { supabaseAdmin } from "@/lib/supabase"

/**
 * Fetches phone numbers of active admins opted-in to complaint notifications.
 * @returns Array of E.164 phone numbers, or empty array if none configured
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
      return []
    }

    const recipients = data
      ?.map(row => row.phone_number)
      .filter((num): num is string => num !== null && num.length > 0)

    if (!recipients || recipients.length === 0) {
      console.warn("[NOTIFICATIONS] No complaint notification recipients configured in admin panel")
      return []
    }

    console.log(`[NOTIFICATIONS] Found ${recipients.length} complaint notification recipients`)
    return recipients
  } catch (error) {
    console.error("[NOTIFICATIONS] Exception fetching complaint recipients:", error)
    return []
  }
}

/**
 * Fetches phone numbers of active admins opted-in to reminder notifications.
 * @returns Array of E.164 phone numbers, or empty array if none configured
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
      return []
    }

    const recipients = data
      ?.map(row => row.phone_number)
      .filter((num): num is string => num !== null && num.length > 0)

    if (!recipients || recipients.length === 0) {
      console.warn("[NOTIFICATIONS] No reminder notification recipients configured in admin panel")
      return []
    }

    console.log(`[NOTIFICATIONS] Found ${recipients.length} reminder notification recipients`)
    return recipients
  } catch (error) {
    console.error("[NOTIFICATIONS] Exception fetching reminder recipients:", error)
    return []
  }
}

/**
 * Fetches the deduplicated union of complaint and reminder notification recipients.
 * @returns Array of unique E.164 phone numbers, or empty array if none configured
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
      return []
    }

    const recipients = data
      ?.map(row => row.phone_number)
      .filter((num): num is string => num !== null && num.length > 0)

    if (!recipients || recipients.length === 0) {
      console.warn("[NOTIFICATIONS] No notification recipients configured in admin panel")
      return []
    }

    console.log(`[NOTIFICATIONS] Found ${recipients.length} total notification recipients`)
    return [...new Set(recipients)]
  } catch (error) {
    console.error("[NOTIFICATIONS] Exception fetching all recipients:", error)
    return []
  }
}

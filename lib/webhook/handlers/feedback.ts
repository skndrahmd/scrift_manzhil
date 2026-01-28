/**
 * Feedback Flow Handler
 * Handles suggestions/feedback conversation flow
 */

import { supabase } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/dateUtils"
import type { Profile, UserState } from "../types"
import { setState, clearState } from "../state"

/**
 * Initialize feedback flow
 */
export function initializeFeedbackFlow(phoneNumber: string): string {
  setState(phoneNumber, {
    step: "feedback_input",
    type: "feedback",
  })

  return `💬 *Share Your Feedback*

We value your input! Share suggestions or thoughts about our services.

Type your message, or *0* for menu`
}

/**
 * Handle feedback flow steps
 */
export async function handleFeedbackFlow(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState
): Promise<string> {
  try {
    if (userState.step === "feedback_input") {
      // Save feedback to database
      const { error } = await supabase.from("feedback").insert([
        {
          profile_id: profile.id,
          message: message,
          status: "new",
          created_at: getPakistanISOString(),
          updated_at: getPakistanISOString(),
        },
      ])

      if (error) {
        console.error("[Feedback] Creation error:", error)
        return `❌ *Unable to Save Feedback*

Please try again.

Reply *0* for menu`
      }

      // Clear state
      clearState(phoneNumber)

      return `✅ *Feedback Received*

Thank you! Your feedback has been forwarded to management.

💡 For urgent issues, register a complaint from the main menu.

Reply *0* for menu`
    }

    return `❌ *Something Went Wrong*

Please try again.

Reply *0* for menu`
  } catch (error) {
    console.error("[Feedback] Flow error:", error)
    return `❌ *Unable to Process*

Please try again shortly.

Reply *0* for menu`
  }
}

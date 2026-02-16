/**
 * Feedback Flow Handler
 * Handles suggestions/feedback conversation flow
 */

import { supabase } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/date"
import type { Profile, UserState } from "../types"
import { setState, clearState } from "../state"
import { getMessage } from "../messages"
import { MSG } from "../message-keys"

/**
 * Initialize feedback flow
 */
export async function initializeFeedbackFlow(phoneNumber: string): Promise<string> {
  setState(phoneNumber, {
    step: "feedback_input",
    type: "feedback",
  })

  return await getMessage(MSG.FEEDBACK_PROMPT)
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
        return await getMessage(MSG.FEEDBACK_ERROR)
      }

      // Clear state
      clearState(phoneNumber)

      return await getMessage(MSG.FEEDBACK_RECEIVED)
    }

    return await getMessage(MSG.ERROR_SOMETHING_WRONG)
  } catch (error) {
    console.error("[Feedback] Flow error:", error)
    return await getMessage(MSG.ERROR_GENERIC)
  }
}

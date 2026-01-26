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

  return `💬 *Suggestions & Feedback*

We value your input! Please share your suggestions, feedback, or any thoughts you have about our services or the building.

Your message will be reviewed by our management team.

Type your message below, or type 0 to return to the main menu.`
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
        return `❌ I'm sorry, I couldn't save your feedback right now. Please try again.

Type 0 to return to the main menu`
      }

      // Clear state
      clearState(phoneNumber)

      return `✅ Thank you so much for your feedback!

I've received your message and will make sure it reaches the right people. Your input helps us improve our services and make the building a better place for everyone.

If you have any urgent concerns, feel free to register a complaint instead.

Type 0 to return to the main menu`
    }

    return "❌ Oops! Something went wrong. Type 0 to return to the main menu."
  } catch (error) {
    console.error("[Feedback] Flow error:", error)
    return `❌ I'm sorry, I had trouble processing your feedback.

Please try again or type 0 for the main menu`
  }
}

/**
 * Feedback Flow Handler
 * Handles suggestions/feedback conversation flow
 */

import { supabase } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/dateUtils"
import type { Profile, UserState } from "../types"
import { setState, clearState } from "../state"

// Divider constant for consistent styling
const DIVIDER = "───────────────────"

/**
 * Initialize feedback flow
 */
export function initializeFeedbackFlow(phoneNumber: string): string {
  setState(phoneNumber, {
    step: "feedback_input",
    type: "feedback",
  })

  return `💬 *Share Your Feedback*

${DIVIDER}

We value your input! Please share your suggestions, feedback, or any thoughts about our services or the building.

Your message will be reviewed by our management team.

${DIVIDER}

Type your message below, or *0* for main menu`
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

${DIVIDER}

We encountered an issue while saving your feedback. Please try again in a moment.

${DIVIDER}
Reply *0* for the main menu`
      }

      // Clear state
      clearState(phoneNumber)

      return `✅ *Feedback Received*

${DIVIDER}

Thank you for sharing your thoughts with us. Your feedback has been forwarded to the management team for review.

We appreciate your input — it helps us improve our services.

${DIVIDER}

💡 For urgent issues, please register a complaint from the main menu.

${DIVIDER}
Reply *0* for the main menu`
    }

    return `❌ *Something Went Wrong*

${DIVIDER}

We couldn't process your request. Please try again.

${DIVIDER}
Reply *0* for the main menu`
  } catch (error) {
    console.error("[Feedback] Flow error:", error)
    return `❌ *Unable to Process Request*

${DIVIDER}

We encountered an issue while processing your feedback. Please try again shortly.

${DIVIDER}
Reply *0* for the main menu`
  }
}

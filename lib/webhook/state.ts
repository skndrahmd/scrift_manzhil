/**
 * Webhook State Management
 * Manages conversation state for each user
 */

import type { UserState } from "./types"

/**
 * In-memory state storage for user conversations
 * Key: phone number, Value: conversation state
 */
const userStates = new Map<string, UserState>()

/**
 * Get user's current state
 */
export function getState(phoneNumber: string): UserState {
  return userStates.get(phoneNumber) || { step: "initial" }
}

/**
 * Set user's state
 */
export function setState(phoneNumber: string, state: UserState): void {
  userStates.set(phoneNumber, state)
}

/**
 * Update user's state (merges with existing)
 */
export function updateState(phoneNumber: string, updates: Partial<UserState>): UserState {
  const current = getState(phoneNumber)
  const newState = { ...current, ...updates }
  setState(phoneNumber, newState)
  return newState
}

/**
 * Clear user's state (reset to initial)
 */
export function clearState(phoneNumber: string): void {
  userStates.delete(phoneNumber)
}

/**
 * Check if user has an active conversation flow
 */
export function hasActiveFlow(phoneNumber: string): boolean {
  const state = userStates.get(phoneNumber)
  return state !== undefined && state.step !== "initial"
}

/**
 * Get all active states (for debugging)
 */
export function getAllStates(): Map<string, UserState> {
  return new Map(userStates)
}

/**
 * Clear all states (for testing)
 */
export function clearAllStates(): void {
  userStates.clear()
}

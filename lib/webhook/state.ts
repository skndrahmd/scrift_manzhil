/**
 * @module lib/webhook/state
 * In-memory conversation state management for WhatsApp webhook flows.
 * Tracks each user's current step and collected data by phone number.
 */

import type { UserState } from "./types"

/**
 * In-memory state storage for user conversations
 * Key: phone number, Value: conversation state
 */
const userStates = new Map<string, UserState>()

/**
 * Gets the current conversation state for a user.
 * @param phoneNumber - User's phone number key
 * @returns Current UserState, or a fresh "initial" state if none exists
 */
export function getState(phoneNumber: string): UserState {
  return userStates.get(phoneNumber) || { step: "initial" }
}

/**
 * Replaces the conversation state for a user.
 * @param phoneNumber - User's phone number key
 * @param state - New state to store
 */
export function setState(phoneNumber: string, state: UserState): void {
  userStates.set(phoneNumber, state)
}

/**
 * Merges partial updates into the user's existing conversation state.
 * @param phoneNumber - User's phone number key
 * @param updates - Partial state fields to merge
 * @returns The merged UserState after update
 */
export function updateState(phoneNumber: string, updates: Partial<UserState>): UserState {
  const current = getState(phoneNumber)
  const newState = { ...current, ...updates }
  setState(phoneNumber, newState)
  return newState
}

/**
 * Clears the conversation state for a user, resetting them to initial.
 * @param phoneNumber - User's phone number key
 */
export function clearState(phoneNumber: string): void {
  userStates.delete(phoneNumber)
}

/**
 * Checks whether a user has an active (non-initial) conversation flow.
 * @param phoneNumber - User's phone number key
 * @returns True if the user is mid-flow
 */
export function hasActiveFlow(phoneNumber: string): boolean {
  const state = userStates.get(phoneNumber)
  return state !== undefined && state.step !== "initial"
}

/**
 * Returns a snapshot of all active conversation states (for debugging).
 * @returns Cloned Map of phone numbers to UserState
 */
export function getAllStates(): Map<string, UserState> {
  return new Map(userStates)
}

/**
 * Clears all conversation states across all users (for testing only).
 */
export function clearAllStates(): void {
  userStates.clear()
}

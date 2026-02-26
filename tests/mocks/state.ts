/**
 * Mock for webhook state module
 * Provides in-memory state for testing (simulates database-backed state)
 */
import { vi } from 'vitest'

// In-memory state store for tests
const stateStore = new Map<string, any>()

export const getState = vi.fn(async (phoneNumber: string) => {
  return stateStore.get(phoneNumber) || { step: 'initial' }
})

export const setState = vi.fn(async (phoneNumber: string, state: any) => {
  stateStore.set(phoneNumber, { ...state, lastActivity: Date.now() })
})

export const updateState = vi.fn(async (phoneNumber: string, updates: any) => {
  const current = stateStore.get(phoneNumber) || { step: 'initial' }
  const newState = { ...current, ...updates, lastActivity: Date.now() }
  stateStore.set(phoneNumber, newState)
  return newState
})

export const clearState = vi.fn(async (phoneNumber: string) => {
  stateStore.delete(phoneNumber)
})

export const hasActiveFlow = vi.fn(async (phoneNumber: string) => {
  const state = stateStore.get(phoneNumber)
  return state !== undefined && state.step !== 'initial'
})

export const isSessionExpired = vi.fn(async (phoneNumber: string) => {
  const state = stateStore.get(phoneNumber)
  if (!state?.lastActivity) return false
  return Date.now() - state.lastActivity > 5 * 60 * 1000 // 5 minutes
})

export const cleanupExpiredSessions = vi.fn(async () => {
  return 0
})

// Helper to reset state between tests
export const __resetState = () => {
  stateStore.clear()
}

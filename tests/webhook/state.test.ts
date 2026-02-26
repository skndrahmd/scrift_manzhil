/**
 * Tests for conversation state management
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  getState,
  setState,
  updateState,
  clearState,
  hasActiveFlow,
  isSessionExpired,
  getAllStates,
  clearAllStates,
} from '@/lib/webhook/state'
import { SESSION_TIMEOUT_MS } from '@/lib/webhook/config'

describe('Conversation State Management', () => {
  beforeEach(() => {
    clearAllStates()
  })

  describe('getState', () => {
    it('returns initial state for unknown phone', () => {
      const state = getState('+923001234567')
      expect(state).toEqual({ step: 'initial' })
    })

    it('returns stored state after setState', () => {
      setState('+923001234567', { step: 'complaint_category', type: 'complaint' })
      const state = getState('+923001234567')
      expect(state.step).toBe('complaint_category')
      expect(state.type).toBe('complaint')
    })
  })

  describe('setState', () => {
    it('stores state for a phone number', () => {
      setState('+923001234567', { step: 'booking_date', type: 'booking' })
      expect(getState('+923001234567').step).toBe('booking_date')
    })

    it('overwrites previous state', () => {
      setState('+923001234567', { step: 'step1' })
      setState('+923001234567', { step: 'step2' })
      expect(getState('+923001234567').step).toBe('step2')
    })
  })

  describe('updateState', () => {
    it('merges partial updates into existing state', () => {
      setState('+923001234567', { step: 'complaint_category', type: 'complaint' })
      const updated = updateState('+923001234567', { step: 'complaint_subcategory' })
      expect(updated.step).toBe('complaint_subcategory')
      expect(updated.type).toBe('complaint')
    })

    it('creates state if none exists', () => {
      const updated = updateState('+923001234567', { step: 'booking_date', type: 'booking' })
      expect(updated.step).toBe('booking_date')
      expect(updated.type).toBe('booking')
    })

    it('preserves nested data during merge', () => {
      setState('+923001234567', {
        step: 'complaint_description',
        type: 'complaint',
        complaint: { category: 'apartment', subcategory: 'plumbing' },
      })
      const updated = updateState('+923001234567', { step: 'complaint_submit' })
      expect(updated.complaint?.category).toBe('apartment')
      expect(updated.complaint?.subcategory).toBe('plumbing')
    })
  })

  describe('clearState', () => {
    it('resets state to initial', () => {
      setState('+923001234567', { step: 'some_step', type: 'complaint' })
      clearState('+923001234567')
      expect(getState('+923001234567')).toEqual({ step: 'initial' })
    })

    it('does nothing for unknown phone', () => {
      clearState('+923009999999')
      expect(getState('+923009999999')).toEqual({ step: 'initial' })
    })
  })

  describe('hasActiveFlow', () => {
    it('returns false for unknown phone', () => {
      expect(hasActiveFlow('+923001234567')).toBe(false)
    })

    it('returns false for initial state', () => {
      setState('+923001234567', { step: 'initial' })
      expect(hasActiveFlow('+923001234567')).toBe(false)
    })

    it('returns true for active flow', () => {
      setState('+923001234567', { step: 'complaint_category', type: 'complaint' })
      expect(hasActiveFlow('+923001234567')).toBe(true)
    })
  })

  describe('getAllStates', () => {
    it('returns empty map initially', () => {
      const states = getAllStates()
      expect(states.size).toBe(0)
    })

    it('returns all active states', () => {
      setState('+923001111111', { step: 'step1' })
      setState('+923002222222', { step: 'step2' })
      const states = getAllStates()
      expect(states.size).toBe(2)
    })

    it('returns a copy (not the original)', () => {
      setState('+923001111111', { step: 'step1' })
      const states = getAllStates()
      states.clear()
      expect(getAllStates().size).toBe(1)
    })
  })

  describe('clearAllStates', () => {
    it('removes all states', () => {
      setState('+923001111111', { step: 'step1' })
      setState('+923002222222', { step: 'step2' })
      clearAllStates()
      expect(getAllStates().size).toBe(0)
      expect(hasActiveFlow('+923001111111')).toBe(false)
    })
  })

  describe('lastActivity timestamp', () => {
    it('setState auto-stamps lastActivity', () => {
      const before = Date.now()
      setState('+923001234567', { step: 'complaint_category', type: 'complaint' })
      const after = Date.now()
      const state = getState('+923001234567')
      expect(state.lastActivity).toBeGreaterThanOrEqual(before)
      expect(state.lastActivity).toBeLessThanOrEqual(after)
    })

    it('updateState auto-stamps lastActivity', () => {
      setState('+923001234567', { step: 'step1' })
      const before = Date.now()
      updateState('+923001234567', { step: 'step2' })
      const after = Date.now()
      const state = getState('+923001234567')
      expect(state.lastActivity).toBeGreaterThanOrEqual(before)
      expect(state.lastActivity).toBeLessThanOrEqual(after)
    })
  })

  describe('isSessionExpired', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns false for unknown phone (no state)', () => {
      expect(isSessionExpired('+923009999999')).toBe(false)
    })

    it('returns false for recently active session', () => {
      setState('+923001234567', { step: 'complaint_category', type: 'complaint' })
      expect(isSessionExpired('+923001234567')).toBe(false)
    })

    it('returns true when session exceeds timeout', () => {
      vi.useFakeTimers()
      setState('+923001234567', { step: 'complaint_category', type: 'complaint' })

      // Advance time past the timeout
      vi.advanceTimersByTime(SESSION_TIMEOUT_MS + 1000)

      expect(isSessionExpired('+923001234567')).toBe(true)
      vi.useRealTimers()
    })

    it('returns false when session is exactly at timeout boundary', () => {
      vi.useFakeTimers()
      setState('+923001234567', { step: 'booking_date', type: 'booking' })

      // Advance time to exactly the timeout (not past it)
      vi.advanceTimersByTime(SESSION_TIMEOUT_MS)

      expect(isSessionExpired('+923001234567')).toBe(false)
      vi.useRealTimers()
    })

    it('resets expiry after new interaction (updateState)', () => {
      vi.useFakeTimers()
      setState('+923001234567', { step: 'step1', type: 'complaint' })

      // Advance 4 minutes (not expired yet)
      vi.advanceTimersByTime(4 * 60 * 1000)
      expect(isSessionExpired('+923001234567')).toBe(false)

      // User interacts — resets the timer
      updateState('+923001234567', { step: 'step2' })

      // Advance another 4 minutes (total 8 from start, but only 4 from last interaction)
      vi.advanceTimersByTime(4 * 60 * 1000)
      expect(isSessionExpired('+923001234567')).toBe(false)

      // Advance 2 more minutes (6 from last interaction — expired)
      vi.advanceTimersByTime(2 * 60 * 1000)
      expect(isSessionExpired('+923001234567')).toBe(true)
      vi.useRealTimers()
    })
  })
})

/**
 * Tests for conversation state management
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getState,
  setState,
  updateState,
  clearState,
  hasActiveFlow,
  getAllStates,
  clearAllStates,
} from '@/lib/webhook/state'

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
})

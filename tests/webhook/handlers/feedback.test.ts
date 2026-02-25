/**
 * Tests for Feedback Flow Handler
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { supabase } from '@/lib/supabase'
import { clearAllStates, getState } from '@/lib/webhook/state'
import { initializeFeedbackFlow, handleFeedbackFlow } from '@/lib/webhook/handlers/feedback'
import type { Profile, UserState } from '@/lib/webhook/types'

const PHONE = '+923001234567'

const mockProfile: Profile = {
  id: 'profile-1',
  phone_number: PHONE,
  name: 'Test User',
  apartment_number: 'A-101',
  is_active: true,
  maintenance_paid: true,
  maintenance_charges: 5000,
  last_payment_date: null,
  cnic: null,
  building_block: 'A',
  unit_id: 'unit-1',
  created_at: '2024-01-01T00:00:00Z',
}

describe('Feedback Flow Handler', () => {
  beforeEach(() => {
    clearAllStates()
    vi.clearAllMocks()
    ;(supabase as any).__reset()
  })

  describe('initializeFeedbackFlow', () => {
    it('sets state and returns prompt message', async () => {
      const result = await initializeFeedbackFlow(PHONE)

      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')

      const state = getState(PHONE)
      expect(state.step).toBe('feedback_input')
      expect(state.type).toBe('feedback')
    })

    it('passes language to state', async () => {
      await initializeFeedbackFlow(PHONE, 'ur')

      const state = getState(PHONE)
      expect(state.language).toBe('ur')
    })
  })

  describe('handleFeedbackFlow', () => {
    it('saves feedback and returns confirmation on success', async () => {
      const userState: UserState = { step: 'feedback_input', type: 'feedback' }
      ;(supabase as any).__setResult('feedback', { data: null, error: null })

      const result = await handleFeedbackFlow('Great management!', mockProfile, PHONE, userState)

      expect(result).toBeTruthy()
      // State should be cleared after success
      const state = getState(PHONE)
      expect(state.step).toBe('initial')

      // Verify insert was called
      const builder = (supabase as any).__getBuilder('feedback')
      expect(builder.insert).toHaveBeenCalled()
    })

    it('returns error message on DB error', async () => {
      const userState: UserState = { step: 'feedback_input', type: 'feedback' }
      ;(supabase as any).__setResult('feedback', {
        data: null,
        error: { message: 'DB error', code: '42000' },
      })

      const result = await handleFeedbackFlow('Great service!', mockProfile, PHONE, userState)

      expect(result).toBeTruthy()
      // State should NOT be cleared on error
      // (the handler doesn't clear state on DB error, the state stays as-is)
    })

    it('returns error for unknown step', async () => {
      const userState: UserState = { step: 'unknown_step', type: 'feedback' }

      const result = await handleFeedbackFlow('Hello', mockProfile, PHONE, userState)

      expect(result).toBeTruthy()
    })

    it('handles exceptions gracefully', async () => {
      const userState: UserState = { step: 'feedback_input', type: 'feedback' }
      // Force an exception by making from() throw
      ;(supabase.from as any).mockImplementationOnce(() => {
        throw new Error('Unexpected error')
      })

      const result = await handleFeedbackFlow('Test', mockProfile, PHONE, userState)

      expect(result).toBeTruthy()
    })
  })
})

/**
 * Tests for conversation state management (database-backed)
 * Uses the global mock from tests/setup.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getState,
  setState,
  updateState,
  clearState,
  hasActiveFlow,
  isSessionExpired,
  cleanupExpiredSessions,
} from '@/lib/webhook/state'
import { SESSION_TIMEOUT_MS } from '@/lib/webhook/config'
import { supabaseAdmin } from '@/lib/supabase'

describe('Conversation State Management (Database)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(supabaseAdmin as any).__reset()
  })

  describe('getState', () => {
    it('returns initial state for unknown phone', async () => {
      ;(supabaseAdmin as any).__setResult('bot_sessions', {
        data: null,
        error: { code: 'PGRST116' },
      })

      const state = await getState('+923001234567')
      expect(state).toEqual({ step: 'initial' })
    })

    it('returns stored state from database', async () => {
      ;(supabaseAdmin as any).__setResult('bot_sessions', {
        data: { state: { step: 'complaint_category', type: 'complaint' } },
        error: null,
      })

      const state = await getState('+923001234567')
      expect(state.step).toBe('complaint_category')
      expect(state.type).toBe('complaint')
    })
  })

  describe('setState', () => {
    it('stores state for a phone number', async () => {
      ;(supabaseAdmin as any).__setResult('bot_sessions', {
        data: { state: { step: 'booking_date', type: 'booking' } },
        error: null,
      })

      await setState('+923001234567', { step: 'booking_date', type: 'booking' })
      const state = await getState('+923001234567')

      expect(state.step).toBe('booking_date')
    })

    it('overwrites previous state', async () => {
      ;(supabaseAdmin as any).__setResult('bot_sessions', {
        data: { state: { step: 'step2' } },
        error: null,
      })

      await setState('+923001234567', { step: 'step1' })
      await setState('+923001234567', { step: 'step2' })
      const state = await getState('+923001234567')

      expect(state.step).toBe('step2')
    })
  })

  describe('updateState', () => {
    it('merges partial updates into existing state', async () => {
      ;(supabaseAdmin as any).__setResult('bot_sessions', {
        data: { state: { step: 'complaint_category', type: 'complaint' } },
        error: null,
      })

      const updated = await updateState('+923001234567', { step: 'complaint_subcategory' })

      expect(updated.step).toBe('complaint_subcategory')
      expect(updated.type).toBe('complaint')
    })

    it('creates state if none exists', async () => {
      ;(supabaseAdmin as any).__setResult('bot_sessions', {
        data: null,
        error: { code: 'PGRST116' },
      })

      const updated = await updateState('+923001234567', { step: 'booking_date', type: 'booking' })

      expect(updated.step).toBe('booking_date')
      expect(updated.type).toBe('booking')
    })
  })

  describe('clearState', () => {
    it('deletes state from database', async () => {
      ;(supabaseAdmin as any).__setResult('bot_sessions', { data: null, error: null })

      // Should not throw
      await clearState('+923001234567')
    })
  })

  describe('hasActiveFlow', () => {
    it('returns false for unknown phone', async () => {
      ;(supabaseAdmin as any).__setResult('bot_sessions', {
        data: null,
        error: { code: 'PGRST116' },
      })

      const result = await hasActiveFlow('+923001234567')
      expect(result).toBe(false)
    })

    it('returns false for initial state', async () => {
      ;(supabaseAdmin as any).__setResult('bot_sessions', {
        data: { state: { step: 'initial' } },
        error: null,
      })

      const result = await hasActiveFlow('+923001234567')
      expect(result).toBe(false)
    })

    it('returns true for active flow', async () => {
      ;(supabaseAdmin as any).__setResult('bot_sessions', {
        data: { state: { step: 'complaint_category', type: 'complaint' } },
        error: null,
      })

      const result = await hasActiveFlow('+923001234567')
      expect(result).toBe(true)
    })
  })

  describe('isSessionExpired', () => {
    it('returns false for unknown phone (no state)', async () => {
      ;(supabaseAdmin as any).__setResult('bot_sessions', {
        data: null,
        error: { code: 'PGRST116' },
      })

      const result = await isSessionExpired('+923009999999')
      expect(result).toBe(false)
    })

    it('returns false for recently active session', async () => {
      ;(supabaseAdmin as any).__setResult('bot_sessions', {
        data: { last_activity: new Date().toISOString() },
        error: null,
      })

      const result = await isSessionExpired('+923001234567')
      expect(result).toBe(false)
    })

    it('returns true when session exceeds timeout', async () => {
      const oldTime = new Date(Date.now() - SESSION_TIMEOUT_MS - 1000).toISOString()
      ;(supabaseAdmin as any).__setResult('bot_sessions', {
        data: { last_activity: oldTime },
        error: null,
      })

      const result = await isSessionExpired('+923001234567')
      expect(result).toBe(true)
    })

    it('returns false when session is exactly at timeout boundary', async () => {
      const boundaryTime = new Date(Date.now() - SESSION_TIMEOUT_MS + 1000).toISOString()
      ;(supabaseAdmin as any).__setResult('bot_sessions', {
        data: { last_activity: boundaryTime },
        error: null,
      })

      const result = await isSessionExpired('+923001234567')
      expect(result).toBe(false)
    })
  })

  describe('cleanupExpiredSessions', () => {
    it('deletes expired sessions and returns count', async () => {
      ;(supabaseAdmin as any).__setResult('bot_sessions', {
        data: [{ phone_number: '+923001111111' }, { phone_number: '+923002222222' }],
        error: null,
      })

      const count = await cleanupExpiredSessions()
      expect(count).toBe(2)
    })

    it('returns 0 on error', async () => {
      ;(supabaseAdmin as any).__setResult('bot_sessions', {
        data: null,
        error: { message: 'DB error' },
      })

      const count = await cleanupExpiredSessions()
      expect(count).toBe(0)
    })
  })
})

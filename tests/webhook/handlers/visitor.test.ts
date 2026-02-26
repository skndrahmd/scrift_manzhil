/**
 * Tests for Visitor Entry Pass Flow Handler
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { supabaseAdmin } from '@/lib/supabase'
import { clearState, getState, setState } from '@/lib/webhook/state'
import { initializeVisitorFlow, handleVisitorFlow } from '@/lib/webhook/handlers/visitor'
import type { Profile, UserState } from '@/lib/webhook/types'

// Mock date functions
vi.mock('@/lib/date', () => ({
  isDateFormat: vi.fn((msg: string) => /^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(msg.trim())),
  parseDate: vi.fn((msg: string) => {
    // Simple parser for tests — expects DD/MM/YYYY
    const parts = msg.trim().split(/[\/-]/)
    if (parts.length !== 3) return null
    const day = parts[0].padStart(2, '0')
    const month = parts[1].padStart(2, '0')
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2]
    return `${year}-${month}-${day}`
  }),
  getPakistanTime: vi.fn(() => new Date('2024-06-15T12:00:00+05:00')),
  getPakistanISOString: vi.fn(() => '2024-06-15T12:00:00+05:00'),
  formatDateTimePK: vi.fn(() => 'Jun 15, 2024'),
}))

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

describe('Visitor Flow Handler', () => {
  beforeEach(async () => {
    await clearState()
    vi.clearAllMocks()
    ;(supabaseAdmin as any).__reset()
  })

  describe('initializeVisitorFlow', () => {
    it('sets state and returns name prompt', async () => {
      const result = await initializeVisitorFlow(PHONE)

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('visitor_name')
      expect(state.type).toBe('visitor')
      expect(state.visitor).toEqual({})
    })

    it('passes language to state', async () => {
      await initializeVisitorFlow(PHONE, 'ur')
      expect((await getState(PHONE)).language).toBe('ur')
    })
  })

  describe('handleVisitorFlow — name input', () => {
    const nameState = (): UserState => ({
      step: 'visitor_name',
      type: 'visitor',
      visitor: {},
    })

    it('accepts valid name and moves to car number step', async () => {
      await setState(PHONE, nameState())
      const result = await handleVisitorFlow('Ahmed Khan', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('visitor_car_number')
      expect(state.visitor?.visitor_name).toBe('Ahmed Khan')
    })

    it('rejects name shorter than 2 characters', async () => {
      await setState(PHONE, nameState())
      const result = await handleVisitorFlow('A', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('visitor_name')
    })
  })

  describe('handleVisitorFlow — car number input', () => {
    const carState = (): UserState => ({
      step: 'visitor_car_number',
      type: 'visitor',
      visitor: { visitor_name: 'Ahmed Khan' },
    })

    it('accepts valid car number and moves to date step', async () => {
      await setState(PHONE, carState())
      const result = await handleVisitorFlow('ABC-123', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('visitor_date')
      expect(state.visitor?.car_number).toBe('ABC-123')
    })

    it('rejects car number shorter than 2 characters', async () => {
      await setState(PHONE, carState())
      const result = await handleVisitorFlow('A', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('visitor_car_number')
    })
  })

  describe('handleVisitorFlow — date input and save', () => {
    const dateState = (): UserState => ({
      step: 'visitor_date',
      type: 'visitor',
      visitor: { visitor_name: 'Ahmed Khan', car_number: 'ABC-123' },
    })

    it('saves visitor pass on valid future date', async () => {
      await setState(PHONE, dateState())

      ;(supabaseAdmin as any).__setResult('visitor_passes', {
        data: { id: 'pass-12345-abcdef', visitor_name: 'Ahmed Khan' },
        error: null,
      })

      const result = await handleVisitorFlow('20/06/2024', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('initial')
    })

    it('rejects invalid date format', async () => {
      await setState(PHONE, dateState())
      const result = await handleVisitorFlow('not-a-date', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('visitor_date')
    })

    it('rejects date in the past', async () => {
      await setState(PHONE, dateState())
      // getPakistanTime returns June 15, 2024 — use a date before that
      const result = await handleVisitorFlow('10/06/2024', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('visitor_date')
    })

    it('rejects date too far in the future (>30 days)', async () => {
      await setState(PHONE, dateState())
      // getPakistanTime returns June 15, 2024 — >30 days is after July 15
      const result = await handleVisitorFlow('20/07/2024', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('visitor_date')
    })

    it('returns error on DB save failure', async () => {
      await setState(PHONE, dateState())

      ;(supabaseAdmin as any).__setResult('visitor_passes', {
        data: null,
        error: { message: 'Insert failed', code: '42000' },
      })

      const result = await handleVisitorFlow('20/06/2024', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
    })
  })

  describe('handleVisitorFlow — default step', () => {
    it('re-initializes flow on unknown step', async () => {
      await setState(PHONE, { step: 'unknown_step', type: 'visitor', visitor: {} })
      const result = await handleVisitorFlow('Hello', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      // Should re-initialize to visitor_name
      const state = await getState(PHONE)
      expect(state.step).toBe('visitor_name')
    })
  })
})

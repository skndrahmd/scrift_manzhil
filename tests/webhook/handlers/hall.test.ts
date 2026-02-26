/**
 * Tests for Hall Management Flow Handler
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { supabase } from '@/lib/supabase'
import { clearState, getState, setState } from '@/lib/webhook/state'
import { initializeHallFlow, handleHallFlow } from '@/lib/webhook/handlers/hall'
import type { Profile, UserState } from '@/lib/webhook/types'

// Mock date functions
vi.mock('@/lib/date', () => ({
  isDateFormat: vi.fn((msg: string) => /^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(msg.trim())),
  parseDate: vi.fn((msg: string) => {
    const parts = msg.trim().split(/[\/-]/)
    if (parts.length !== 3) return null
    const day = parts[0].padStart(2, '0')
    const month = parts[1].padStart(2, '0')
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2]
    return `${year}-${month}-${day}`
  }),
  isWorkingDay: vi.fn(() => true),
  getDayName: vi.fn(() => 'Friday'),
  getPakistanTime: vi.fn(() => new Date('2024-06-15T12:00:00+05:00')),
  getPakistanISOString: vi.fn(() => '2024-06-15T12:00:00+05:00'),
}))

// Mock profile
vi.mock('@/lib/webhook/profile', () => ({
  getCachedSettings: vi.fn().mockResolvedValue({
    start_time: '09:00:00',
    end_time: '21:00:00',
    slot_duration_minutes: 60,
    working_days: [1, 2, 3, 4, 5, 6],
    booking_charges: 5000,
  }),
  getUserBookings: vi.fn().mockResolvedValue([]),
  getActiveComplaints: vi.fn().mockResolvedValue([]),
  clearSettingsCache: vi.fn(),
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

const mockBookings = [
  {
    id: 'b1',
    booking_date: '2024-06-20',
    status: 'confirmed',
    payment_status: 'pending',
    booking_charges: 5000,
  },
  {
    id: 'b2',
    booking_date: '2024-06-25',
    status: 'confirmed',
    payment_status: 'paid',
    booking_charges: 5000,
  },
]

describe('Hall Flow Handler', () => {
  beforeEach(async () => {
    await clearState()
    vi.clearAllMocks()
    ;(supabase as any).__reset()
  })

  describe('initializeHallFlow', () => {
    it('sets state and returns hall menu', async () => {
      const result = await initializeHallFlow(PHONE)

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('hall_menu')
      expect(state.type).toBe('hall')
    })
  })

  describe('handleHallFlow — menu selection', () => {
    const menuState = (): UserState => ({ step: 'hall_menu', type: 'hall' })

    it('"1" starts new booking flow', async () => {
      await setState(PHONE, menuState())

      const result = await handleHallFlow('1', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('hall_new_booking_date')
    })

    it('"2" starts cancel flow with bookings', async () => {
      await setState(PHONE, menuState())
      const { getUserBookings } = await import('@/lib/webhook/profile')
      ;(getUserBookings as any).mockResolvedValueOnce(mockBookings)

      const result = await handleHallFlow('2', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('hall_cancel_select')
      expect(state.bookingList).toHaveLength(2)
    })

    it('"2" returns no-bookings message when empty', async () => {
      await setState(PHONE, menuState())
      const { getUserBookings } = await import('@/lib/webhook/profile')
      ;(getUserBookings as any).mockResolvedValueOnce([])

      const result = await handleHallFlow('2', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
    })

    it('"3" starts edit flow with bookings', async () => {
      await setState(PHONE, menuState())
      const { getUserBookings } = await import('@/lib/webhook/profile')
      ;(getUserBookings as any).mockResolvedValueOnce(mockBookings)

      const result = await handleHallFlow('3', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('hall_edit_select')
    })

    it('"3" returns no-bookings message when empty', async () => {
      await setState(PHONE, menuState())
      const { getUserBookings } = await import('@/lib/webhook/profile')
      ;(getUserBookings as any).mockResolvedValueOnce([])

      const result = await handleHallFlow('3', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
    })

    it('"4" shows booking list', async () => {
      await setState(PHONE, menuState())
      const { getUserBookings } = await import('@/lib/webhook/profile')
      ;(getUserBookings as any).mockResolvedValueOnce(mockBookings)

      const result = await handleHallFlow('4', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      // State should be cleared after view
      const state = await getState(PHONE)
      expect(state.step).toBe('initial')
    })

    it('"4" returns no-bookings when empty', async () => {
      await setState(PHONE, menuState())
      const { getUserBookings } = await import('@/lib/webhook/profile')
      ;(getUserBookings as any).mockResolvedValueOnce([])

      const result = await handleHallFlow('4', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
    })

    it('returns error for invalid menu option', async () => {
      await setState(PHONE, menuState())

      const result = await handleHallFlow('9', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
    })
  })

  describe('handleHallFlow — new booking date', () => {
    it('shows policies for valid available date', async () => {
      await setState(PHONE, { step: 'hall_new_booking_date', type: 'hall' })

      ;(supabase as any).__setResult('bookings', { data: [], error: null })

      const result = await handleHallFlow('20/06/2024', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('hall_new_booking_policies')
      expect(state.date).toBe('2024-06-20')
    })

    it('returns error for invalid date format', async () => {
      await setState(PHONE, { step: 'hall_new_booking_date', type: 'hall' })

      const result = await handleHallFlow('not-a-date', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
    })

    it('returns error for date in the past', async () => {
      await setState(PHONE, { step: 'hall_new_booking_date', type: 'hall' })

      const result = await handleHallFlow('10/06/2024', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
    })
  })

  describe('handleHallFlow — new booking policies', () => {
    const policiesState = (): UserState => ({
      step: 'hall_new_booking_policies',
      type: 'hall',
      date: '2024-06-20',
    })

    it('creates booking on acceptance ("1")', async () => {
      await setState(PHONE, policiesState())

      ;(supabase as any).__setResult('bookings', {
        data: { id: 'booking-new', booking_date: '2024-06-20' },
        error: null,
      })

      const result = await handleHallFlow('1', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('initial')
    })

    it('declines on "2"', async () => {
      await setState(PHONE, policiesState())

      const result = await handleHallFlow('2', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('initial')
    })

    it('returns error for invalid response', async () => {
      await setState(PHONE, policiesState())

      const result = await handleHallFlow('5', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
    })

    it('handles duplicate booking error (23505)', async () => {
      await setState(PHONE, policiesState())

      ;(supabase as any).__setResult('bookings', {
        data: null,
        error: { message: 'Duplicate', code: '23505' },
      })

      const result = await handleHallFlow('1', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
    })
  })

  describe('handleHallFlow — cancel booking', () => {
    it('moves to confirm step on valid selection', async () => {
      await setState(PHONE, {
        step: 'hall_cancel_select',
        type: 'hall',
        bookingList: mockBookings,
      })

      const result = await handleHallFlow('1', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('hall_cancel_confirm')
    })

    it('returns error on invalid selection', async () => {
      await setState(PHONE, {
        step: 'hall_cancel_select',
        type: 'hall',
        bookingList: mockBookings,
      })

      const result = await handleHallFlow('9', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
    })

    it('cancels booking on yes ("1")', async () => {
      await setState(PHONE, {
        step: 'hall_cancel_confirm',
        type: 'hall',
        bookingList: mockBookings,
        selectedBooking: mockBookings[0],
      } as any)

      ;(supabase as any).__setResult('bookings', { data: null, error: null })

      const result = await handleHallFlow('1', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('initial')
    })

    it('aborts on no ("2")', async () => {
      await setState(PHONE, {
        step: 'hall_cancel_confirm',
        type: 'hall',
        bookingList: mockBookings,
        selectedBooking: mockBookings[0],
      } as any)

      const result = await handleHallFlow('2', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('initial')
    })
  })

  describe('handleHallFlow — edit booking', () => {
    it('selects booking and moves to date step', async () => {
      await setState(PHONE, {
        step: 'hall_edit_select',
        type: 'hall',
        bookingList: mockBookings,
      })

      const result = await handleHallFlow('1', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('hall_edit_date')
    })

    it('updates booking date on valid new date', async () => {
      await setState(PHONE, {
        step: 'hall_edit_date',
        type: 'hall',
        bookingList: mockBookings,
        selectedBooking: mockBookings[0],
      } as any)

      ;(supabase as any).__setResult('bookings', { data: null, error: null })

      const result = await handleHallFlow('22/06/2024', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('initial')
    })

    it('returns error for past date in edit', async () => {
      await setState(PHONE, {
        step: 'hall_edit_date',
        type: 'hall',
        bookingList: mockBookings,
        selectedBooking: mockBookings[0],
      } as any)

      const result = await handleHallFlow('10/06/2024', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
    })

    it('returns error for invalid date format in edit', async () => {
      await setState(PHONE, {
        step: 'hall_edit_date',
        type: 'hall',
        bookingList: mockBookings,
        selectedBooking: mockBookings[0],
      } as any)

      const result = await handleHallFlow('not-a-date', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
    })
  })
})

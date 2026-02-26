/**
 * Tests for Booking Flow Handler
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { supabase } from '@/lib/supabase'
import { clearState, getState, setState } from '@/lib/webhook/state'
import { initializeBookingFlow, handleBookingFlow } from '@/lib/webhook/handlers/booking'
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

describe('Booking Flow Handler', () => {
  beforeEach(async () => {
    await clearState()
    vi.clearAllMocks()
    ;(supabase as any).__reset()
  })

  describe('initializeBookingFlow', () => {
    it('sets state and returns date prompt', async () => {
      const result = await initializeBookingFlow(PHONE)

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('booking_date')
      expect(state.type).toBe('booking')
    })
  })

  describe('handleBookingFlow — date input', () => {
    it('shows policies for valid available date', async () => {
      await setState(PHONE, { step: 'booking_date', type: 'booking' })

      // No existing bookings
      ;(supabase as any).__setResult('bookings', { data: [], error: null })

      const result = await handleBookingFlow('20/06/2024', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('booking_policies')
      expect(state.date).toBe('2024-06-20')
    })

    it('returns error for date in the past', async () => {
      await setState(PHONE, { step: 'booking_date', type: 'booking' })

      const result = await handleBookingFlow('10/06/2024', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      // State should remain on booking_date
      const state = await getState(PHONE)
      expect(state.step).toBe('booking_date')
    })

    it('returns error for non-working day', async () => {
      await setState(PHONE, { step: 'booking_date', type: 'booking' })

      const { isWorkingDay } = await import('@/lib/date')
      ;(isWorkingDay as any).mockReturnValueOnce(false)

      ;(supabase as any).__setResult('bookings', { data: [], error: null })

      const result = await handleBookingFlow('20/06/2024', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
    })

    it('returns error for already-booked date', async () => {
      await setState(PHONE, { step: 'booking_date', type: 'booking' })

      ;(supabase as any).__setResult('bookings', {
        data: [{ id: 'booking-1' }],
        error: null,
      })

      const result = await handleBookingFlow('20/06/2024', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
    })

    it('returns error for invalid date format', async () => {
      await setState(PHONE, { step: 'booking_date', type: 'booking' })

      const result = await handleBookingFlow('not-a-date', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
    })
  })

  describe('handleBookingFlow — policies acceptance', () => {
    const policiesState = (): UserState => ({
      step: 'booking_policies',
      type: 'booking',
      date: '2024-06-20',
    })

    it('creates booking on acceptance ("1")', async () => {
      await setState(PHONE, policiesState())

      // Double-check: no existing bookings
      ;(supabase as any).__setResult('bookings', {
        data: { id: 'booking-new', booking_date: '2024-06-20' },
        error: null,
      })

      const result = await handleBookingFlow('1', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('initial')
    })

    it('declines booking on "2"', async () => {
      await setState(PHONE, policiesState())

      const result = await handleBookingFlow('2', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('initial')
    })

    it('returns error for invalid response', async () => {
      await setState(PHONE, policiesState())

      const result = await handleBookingFlow('5', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
    })

    it('handles duplicate booking error (code 23505)', async () => {
      await setState(PHONE, policiesState())

      // First query (double-check) returns empty
      const mockBuilder = (supabase as any).__getBuilder('bookings') || (() => {
        ;(supabase as any).__setResult('bookings', {
          data: null,
          error: { message: 'Duplicate', code: '23505' },
        })
        return (supabase as any).__getBuilder('bookings')
      })()

      ;(supabase as any).__setResult('bookings', {
        data: null,
        error: { message: 'Duplicate', code: '23505' },
      })

      const result = await handleBookingFlow('1', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
    })
  })
})

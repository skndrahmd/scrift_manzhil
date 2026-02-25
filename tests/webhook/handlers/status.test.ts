/**
 * Tests for Status and Cancel Flow Handlers
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { supabase } from '@/lib/supabase'
import { clearAllStates, getState, setState } from '@/lib/webhook/state'
import {
  initializeStatusFlow,
  handleStatusFlow,
  initializeCancelFlow,
  handleCancelFlow,
} from '@/lib/webhook/handlers/status'
import type { Profile, UserState } from '@/lib/webhook/types'

// Mock profile
vi.mock('@/lib/webhook/profile', () => ({
  getActiveComplaints: vi.fn().mockResolvedValue([]),
  getCachedSettings: vi.fn().mockResolvedValue(null),
  getUserBookings: vi.fn().mockResolvedValue([]),
  clearSettingsCache: vi.fn(),
}))

// Mock date
vi.mock('@/lib/date', () => ({
  getPakistanISOString: vi.fn(() => '2024-06-15T12:00:00+05:00'),
  getPakistanTime: vi.fn(() => new Date('2024-06-15T12:00:00+05:00')),
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

const mockComplaints = [
  {
    id: 'c1',
    complaint_id: 'CMP-001',
    category: 'apartment',
    subcategory: 'plumbing',
    description: 'Leaking pipe',
    status: 'pending',
    created_at: '2024-06-10T10:00:00Z',
  },
  {
    id: 'c2',
    complaint_id: 'CMP-002',
    category: 'building',
    subcategory: 'lift_elevator',
    description: 'Not working',
    status: 'in_progress',
    created_at: '2024-06-12T10:00:00Z',
  },
]

describe('Status Flow Handler', () => {
  beforeEach(() => {
    clearAllStates()
    vi.clearAllMocks()
    ;(supabase as any).__reset()
  })

  describe('initializeStatusFlow', () => {
    it('returns complaint list when complaints exist', async () => {
      const { getActiveComplaints } = await import('@/lib/webhook/profile')
      ;(getActiveComplaints as any).mockResolvedValueOnce(mockComplaints)

      const result = await initializeStatusFlow(mockProfile, PHONE)

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('status_select')
      expect(state.type).toBe('status')
      expect(state.statusItems).toHaveLength(2)
    })

    it('returns no-complaints message when empty', async () => {
      const { getActiveComplaints } = await import('@/lib/webhook/profile')
      ;(getActiveComplaints as any).mockResolvedValueOnce([])

      const result = await initializeStatusFlow(mockProfile, PHONE)

      expect(result).toBeTruthy()
      // State should not be set (no flow started)
      const state = getState(PHONE)
      expect(state.step).toBe('initial')
    })
  })

  describe('handleStatusFlow', () => {
    it('returns complaint detail on valid selection', async () => {
      setState(PHONE, {
        step: 'status_select',
        type: 'status',
        statusItems: mockComplaints,
      })

      const result = await handleStatusFlow('1', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      // State should be cleared after viewing detail
      const state = getState(PHONE)
      expect(state.step).toBe('initial')
    })

    it('returns error on invalid selection number', async () => {
      setState(PHONE, {
        step: 'status_select',
        type: 'status',
        statusItems: mockComplaints,
      })

      const result = await handleStatusFlow('5', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      // State should remain (still selecting)
      const state = getState(PHONE)
      expect(state.step).toBe('status_select')
    })

    it('returns error on non-numeric selection', async () => {
      setState(PHONE, {
        step: 'status_select',
        type: 'status',
        statusItems: mockComplaints,
      })

      const result = await handleStatusFlow('abc', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
    })

    it('returns error for unknown step', async () => {
      const userState: UserState = { step: 'unknown', type: 'status', statusItems: [] }

      const result = await handleStatusFlow('1', mockProfile, PHONE, userState)

      expect(result).toBeTruthy()
    })
  })
})

describe('Cancel Complaint Flow Handler', () => {
  beforeEach(() => {
    clearAllStates()
    vi.clearAllMocks()
    ;(supabase as any).__reset()
  })

  describe('initializeCancelFlow', () => {
    it('returns list when pending complaints exist', async () => {
      const pendingComplaints = [mockComplaints[0]] // only the pending one

      ;(supabase as any).__setResult('complaints', {
        data: pendingComplaints,
        error: null,
      })

      const result = await initializeCancelFlow(mockProfile, PHONE)

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('cancel_select')
      expect(state.type).toBe('cancel')
      expect(state.cancelItems).toHaveLength(1)
    })

    it('returns no-complaints message when none pending', async () => {
      ;(supabase as any).__setResult('complaints', {
        data: [],
        error: null,
      })

      const result = await initializeCancelFlow(mockProfile, PHONE)

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('initial')
    })

    it('returns no-complaints message on DB error', async () => {
      ;(supabase as any).__setResult('complaints', {
        data: null,
        error: { message: 'DB error' },
      })

      const result = await initializeCancelFlow(mockProfile, PHONE)

      expect(result).toBeTruthy()
    })
  })

  describe('handleCancelFlow — select complaint', () => {
    it('moves to confirm step on valid selection', async () => {
      setState(PHONE, {
        step: 'cancel_select',
        type: 'cancel',
        cancelItems: [mockComplaints[0]],
      })

      const result = await handleCancelFlow('1', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('cancel_confirm')
    })

    it('returns error on invalid selection', async () => {
      setState(PHONE, {
        step: 'cancel_select',
        type: 'cancel',
        cancelItems: [mockComplaints[0]],
      })

      const result = await handleCancelFlow('5', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
    })
  })

  describe('handleCancelFlow — confirm cancellation', () => {
    const confirmState = (): any => ({
      step: 'cancel_confirm',
      type: 'cancel',
      cancelItems: [mockComplaints[0]],
      selectedComplaint: mockComplaints[0],
    })

    it('cancels complaint on "1" (yes)', async () => {
      setState(PHONE, confirmState())

      ;(supabase as any).__setResult('complaints', { data: null, error: null })

      const result = await handleCancelFlow('1', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('initial')
    })

    it('aborts on "2" (no)', async () => {
      setState(PHONE, confirmState())

      const result = await handleCancelFlow('2', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('initial')
    })

    it('returns error on invalid response', async () => {
      setState(PHONE, confirmState())

      const result = await handleCancelFlow('maybe', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
    })

    it('returns error on DB failure during cancellation', async () => {
      setState(PHONE, confirmState())

      ;(supabase as any).__setResult('complaints', {
        data: null,
        error: { message: 'Update failed' },
      })

      const result = await handleCancelFlow('1', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
    })
  })
})

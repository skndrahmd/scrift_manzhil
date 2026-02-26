/**
 * Tests for Complaint Flow Handler
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { supabase } from '@/lib/supabase'
import { getState, setState, clearState } from '@/lib/webhook/state'
import { initializeComplaintFlow, handleComplaintFlow } from '@/lib/webhook/handlers/complaint'
import type { Profile, UserState } from '@/lib/webhook/types'

// Mock menu functions
vi.mock('@/lib/webhook/menu', () => ({
  getComplaintCategoryMenu: vi.fn().mockResolvedValue('Select category:\n1. Apartment\n2. Building'),
  getApartmentSubcategoryMenu: vi.fn().mockResolvedValue('Select subcategory:\n1. Plumbing\n2. Electric\n3. Civil\n4. My Parking\n5. Other'),
  getBuildingSubcategoryMenu: vi.fn().mockResolvedValue('Select subcategory:\n1. Lift\n2. Gym\n...12. Other'),
  getMainMenu: vi.fn().mockResolvedValue('Main menu'),
  getHallMenu: vi.fn().mockResolvedValue('Hall menu'),
  getStaffMenu: vi.fn().mockResolvedValue('Staff menu'),
  getStaffRoleMenu: vi.fn().mockResolvedValue('Role menu'),
  getProfileInfo: vi.fn().mockResolvedValue('Profile info'),
  getMaintenanceStatus: vi.fn().mockResolvedValue('Maintenance status'),
  getEmergencyContacts: vi.fn().mockResolvedValue('Emergency contacts'),
  formatBookingsList: vi.fn().mockReturnValue('Bookings list'),
  formatComplaintsList: vi.fn().mockReturnValue('Complaints list'),
  formatStaffList: vi.fn().mockReturnValue('Staff list'),
}))

// Mock config
vi.mock('@/lib/webhook/config', async (importOriginal) => {
  const original = await importOriginal() as any
  return {
    ...original,
    getComplaintRecipients: vi.fn().mockResolvedValue([]),
    TEMPLATE_SIDS: {
      newComplaint: undefined,
      complaintRegistered: undefined,
    },
  }
})

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

describe('Complaint Flow Handler', () => {
  beforeEach(async () => {
    await clearState()
    vi.clearAllMocks()
    ;(supabase as any).__reset()
  })

  describe('initializeComplaintFlow', () => {
    it('sets state and returns category menu', async () => {
      const result = await initializeComplaintFlow(PHONE)

      expect(result).toContain('category')
      const state = await getState(PHONE)
      expect(state.step).toBe('complaint_category')
      expect(state.type).toBe('complaint')
      expect(state.complaint).toEqual({})
    })

    it('passes language to state', async () => {
      await initializeComplaintFlow(PHONE, 'ur')
      const state = await getState(PHONE)
      expect(state.language).toBe('ur')
    })
  })

  describe('handleComplaintFlow — category selection', () => {
    it('selects apartment category on "1"', async () => {
      await setState(PHONE, { step: 'complaint_category', type: 'complaint', complaint: {} })
      const userState = await getState(PHONE)

      const result = await handleComplaintFlow('1', mockProfile, PHONE, userState)

      expect(result).toContain('subcategory')
      const state = await getState(PHONE)
      expect(state.step).toBe('complaint_subcategory')
      expect(state.complaint?.category).toBe('apartment')
    })

    it('selects building category on "2"', async () => {
      await setState(PHONE, { step: 'complaint_category', type: 'complaint', complaint: {} })
      const userState = await getState(PHONE)

      const result = await handleComplaintFlow('2', mockProfile, PHONE, userState)

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('complaint_subcategory')
      expect(state.complaint?.category).toBe('building')
    })

    it('returns error on invalid category', async () => {
      await setState(PHONE, { step: 'complaint_category', type: 'complaint', complaint: {} })
      const userState = await getState(PHONE)

      const result = await handleComplaintFlow('5', mockProfile, PHONE, userState)

      expect(result).toBeTruthy()
      // State should remain on category step
      const state = await getState(PHONE)
      expect(state.step).toBe('complaint_category')
    })
  })

  describe('handleComplaintFlow — apartment subcategory selection', () => {
    it('creates complaint directly for plumbing (option 1, no description needed)', async () => {
      await setState(PHONE, {
        step: 'complaint_subcategory',
        type: 'complaint',
        complaint: { category: 'apartment' },
      })
      const userState = await getState(PHONE)

      // Mock complaint insert success
      ;(supabase as any).__setResult('complaints', {
        data: {
          complaint_id: 'CMP-001',
          category: 'apartment',
          subcategory: 'plumbing',
          created_at: '2024-06-15T10:00:00Z',
        },
        error: null,
      })

      const result = await handleComplaintFlow('1', mockProfile, PHONE, userState)

      expect(result).toBeTruthy()
      // State should be cleared after creation
      const state = await getState(PHONE)
      expect(state.step).toBe('initial')
    })

    it('moves to description step for "other" (option 5)', async () => {
      await setState(PHONE, {
        step: 'complaint_subcategory',
        type: 'complaint',
        complaint: { category: 'apartment' },
      })
      const userState = await getState(PHONE)

      const result = await handleComplaintFlow('5', mockProfile, PHONE, userState)

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('complaint_description')
      expect(state.complaint?.subcategory).toBe('other')
    })

    it('moves to description step for "my_parking" (option 4)', async () => {
      await setState(PHONE, {
        step: 'complaint_subcategory',
        type: 'complaint',
        complaint: { category: 'apartment' },
      })
      const userState = await getState(PHONE)

      const result = await handleComplaintFlow('4', mockProfile, PHONE, userState)

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('complaint_description')
      expect(state.complaint?.subcategory).toBe('my_parking')
    })

    it('returns error for invalid subcategory', async () => {
      await setState(PHONE, {
        step: 'complaint_subcategory',
        type: 'complaint',
        complaint: { category: 'apartment' },
      })
      const userState = await getState(PHONE)

      const result = await handleComplaintFlow('9', mockProfile, PHONE, userState)

      expect(result).toBeTruthy()
      // Should still be on subcategory step
      const state = await getState(PHONE)
      expect(state.step).toBe('complaint_subcategory')
    })
  })

  describe('handleComplaintFlow — building subcategory selection', () => {
    it('moves to description step for any building subcategory', async () => {
      await setState(PHONE, {
        step: 'complaint_subcategory',
        type: 'complaint',
        complaint: { category: 'building' },
      })
      const userState = await getState(PHONE)

      const result = await handleComplaintFlow('1', mockProfile, PHONE, userState)

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('complaint_description')
      expect(state.complaint?.subcategory).toBe('lift_elevator')
    })

    it('returns error for out-of-range building subcategory', async () => {
      await setState(PHONE, {
        step: 'complaint_subcategory',
        type: 'complaint',
        complaint: { category: 'building' },
      })
      const userState = await getState(PHONE)

      const result = await handleComplaintFlow('15', mockProfile, PHONE, userState)

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('complaint_subcategory')
    })
  })

  describe('handleComplaintFlow — description step', () => {
    it('creates complaint with description', async () => {
      await setState(PHONE, {
        step: 'complaint_description',
        type: 'complaint',
        complaint: { category: 'building', subcategory: 'lift_elevator' },
      })
      const userState = await getState(PHONE)

      ;(supabase as any).__setResult('complaints', {
        data: {
          complaint_id: 'CMP-002',
          category: 'building',
          subcategory: 'lift_elevator',
          description: 'Lift not working',
          created_at: '2024-06-15T10:00:00Z',
        },
        error: null,
      })

      const result = await handleComplaintFlow('Lift not working on 3rd floor', mockProfile, PHONE, userState)

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('initial')
    })

    it('returns error on DB failure during creation', async () => {
      await setState(PHONE, {
        step: 'complaint_description',
        type: 'complaint',
        complaint: { category: 'apartment', subcategory: 'other' },
      })
      const userState = await getState(PHONE)

      ;(supabase as any).__setResult('complaints', {
        data: null,
        error: { message: 'Insert failed', code: '42000' },
      })

      const result = await handleComplaintFlow('Water leaking', mockProfile, PHONE, userState)

      expect(result).toBeTruthy()
    })
  })

  describe('handleComplaintFlow — default step', () => {
    it('returns error for unknown step', async () => {
      const userState: UserState = { step: 'unknown_step', type: 'complaint', complaint: {} }

      const result = await handleComplaintFlow('Hello', mockProfile, PHONE, userState)

      expect(result).toBeTruthy()
    })
  })
})

/**
 * Tests for Staff Management Flow Handler
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { supabase } from '@/lib/supabase'
import { clearAllStates, getState, setState } from '@/lib/webhook/state'
import { initializeStaffFlow, handleStaffFlow } from '@/lib/webhook/handlers/staff'
import type { Profile, UserState } from '@/lib/webhook/types'

// Mock menu
vi.mock('@/lib/webhook/menu', () => ({
  getComplaintCategoryMenu: vi.fn().mockResolvedValue('Category menu'),
  getApartmentSubcategoryMenu: vi.fn().mockResolvedValue('Apartment subcategory menu'),
  getBuildingSubcategoryMenu: vi.fn().mockResolvedValue('Building subcategory menu'),
  getMainMenu: vi.fn().mockResolvedValue('Main menu'),
  getHallMenu: vi.fn().mockResolvedValue('Hall menu'),
  getStaffMenu: vi.fn().mockResolvedValue('Staff menu'),
  getStaffRoleMenu: vi.fn().mockResolvedValue('Select role:\n1. Driver\n2. Cook\n...8. Other'),
  getProfileInfo: vi.fn().mockResolvedValue('Profile info'),
  getMaintenanceStatus: vi.fn().mockResolvedValue('Maintenance status'),
  getEmergencyContacts: vi.fn().mockResolvedValue('Emergency contacts'),
  formatBookingsList: vi.fn().mockReturnValue('Bookings list'),
  formatComplaintsList: vi.fn().mockReturnValue('Complaints list'),
  formatStaffList: vi.fn().mockReturnValue('Staff list'),
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

const profileNoUnit: Profile = { ...mockProfile, unit_id: null }

const mockStaffList = [
  { id: 's1', name: 'Ali Driver', role: 'Driver', phone_number: '03001234567', cnic: '3520112345671', unit_id: 'unit-1' },
  { id: 's2', name: 'Fatima Maid', role: 'Maid', phone_number: '03009876543', cnic: '3520112345672', unit_id: 'unit-1' },
]

describe('Staff Flow Handler', () => {
  beforeEach(() => {
    clearAllStates()
    vi.clearAllMocks()
    ;(supabase as any).__reset()
  })

  describe('initializeStaffFlow', () => {
    it('sets state and returns staff menu', async () => {
      const result = await initializeStaffFlow(PHONE)

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('staff_menu')
      expect(state.type).toBe('staff')
      expect(state.staff).toEqual({})
    })
  })

  describe('handleStaffFlow — no unit guard', () => {
    it('returns error and clears state if profile has no unit_id', async () => {
      setState(PHONE, { step: 'staff_menu', type: 'staff', staff: {}, staffList: [] })

      const result = await handleStaffFlow('1', profileNoUnit, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('initial')
    })
  })

  describe('handleStaffFlow — menu selection', () => {
    const menuState = (): UserState => ({ step: 'staff_menu', type: 'staff', staff: {}, staffList: [] })

    it('"1" starts add staff flow', async () => {
      setState(PHONE, menuState())

      const result = await handleStaffFlow('1', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('staff_add_name')
    })

    it('"2" shows staff list', async () => {
      setState(PHONE, menuState())
      ;(supabase as any).__setResult('staff', { data: mockStaffList, error: null })

      const result = await handleStaffFlow('2', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
    })

    it('"2" shows empty message when no staff', async () => {
      setState(PHONE, menuState())
      ;(supabase as any).__setResult('staff', { data: [], error: null })

      const result = await handleStaffFlow('2', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
    })

    it('"3" starts edit flow with staff list', async () => {
      setState(PHONE, menuState())
      ;(supabase as any).__setResult('staff', { data: mockStaffList, error: null })

      const result = await handleStaffFlow('3', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('staff_edit_list')
    })

    it('"4" starts delete flow with staff list', async () => {
      setState(PHONE, menuState())
      ;(supabase as any).__setResult('staff', { data: mockStaffList, error: null })

      const result = await handleStaffFlow('4', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('staff_delete_list')
    })

    it('returns error for invalid menu option', async () => {
      setState(PHONE, menuState())

      const result = await handleStaffFlow('9', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
    })
  })

  describe('handleStaffFlow — add staff flow', () => {
    it('accepts valid name and moves to phone step', async () => {
      setState(PHONE, { step: 'staff_add_name', type: 'staff', staff: {}, staffList: [] })

      const result = await handleStaffFlow('Ali Khan', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('staff_add_phone')
      expect(state.staff?.name).toBe('Ali Khan')
    })

    it('accepts valid phone and moves to CNIC step', async () => {
      setState(PHONE, { step: 'staff_add_phone', type: 'staff', staff: { name: 'Ali Khan' }, staffList: [] })

      // No duplicate found
      ;(supabase as any).__setResult('staff', { data: null, error: { code: 'PGRST116', message: 'not found' } })

      const result = await handleStaffFlow('03001234567', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('staff_add_cnic')
    })

    it('rejects duplicate phone number', async () => {
      setState(PHONE, { step: 'staff_add_phone', type: 'staff', staff: { name: 'Ali Khan' }, staffList: [] })

      ;(supabase as any).__setResult('staff', { data: { id: 's1' }, error: null })

      const result = await handleStaffFlow('03001234567', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
    })

    it('accepts valid CNIC and moves to role selection', async () => {
      setState(PHONE, { step: 'staff_add_cnic', type: 'staff', staff: { name: 'Ali', phone: '03001234567' }, staffList: [] })

      const result = await handleStaffFlow('3520112345671', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('staff_add_role_select')
    })

    it('creates staff on role selection (option "1")', async () => {
      setState(PHONE, {
        step: 'staff_add_role_select',
        type: 'staff',
        staff: { name: 'Ali', phone: '03001234567', cnic: '3520112345671' },
        staffList: [],
      })

      ;(supabase as any).__setResult('staff', { data: null, error: null })

      const result = await handleStaffFlow('1', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('initial')
    })

    it('moves to custom role input on "8"', async () => {
      setState(PHONE, {
        step: 'staff_add_role_select',
        type: 'staff',
        staff: { name: 'Ali', phone: '03001234567', cnic: '3520112345671' },
        staffList: [],
      })

      const result = await handleStaffFlow('8', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('staff_add_role_custom')
    })

    it('creates staff with custom role', async () => {
      setState(PHONE, {
        step: 'staff_add_role_custom',
        type: 'staff',
        staff: { name: 'Ali', phone: '03001234567', cnic: '3520112345671' },
        staffList: [],
      })

      ;(supabase as any).__setResult('staff', { data: null, error: null })

      const result = await handleStaffFlow('Gardener', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('initial')
    })

    it('rejects too-short custom role', async () => {
      setState(PHONE, {
        step: 'staff_add_role_custom',
        type: 'staff',
        staff: { name: 'Ali', phone: '03001234567', cnic: '3520112345671' },
        staffList: [],
      })

      const result = await handleStaffFlow('AB', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
    })
  })

  describe('handleStaffFlow — delete staff flow', () => {
    it('selects staff and moves to confirm', async () => {
      setState(PHONE, {
        step: 'staff_delete_list',
        type: 'staff',
        staff: {},
        staffList: mockStaffList,
      })

      const result = await handleStaffFlow('1', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('staff_delete_confirm')
    })

    it('returns error on invalid selection', async () => {
      setState(PHONE, {
        step: 'staff_delete_list',
        type: 'staff',
        staff: {},
        staffList: mockStaffList,
      })

      const result = await handleStaffFlow('9', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
    })

    it('deletes staff on yes ("1")', async () => {
      setState(PHONE, {
        step: 'staff_delete_confirm',
        type: 'staff',
        staff: {},
        staffList: mockStaffList,
        selectedStaff: mockStaffList[0],
      } as any)

      ;(supabase as any).__setResult('staff', { data: null, error: null })

      const result = await handleStaffFlow('1', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('initial')
    })

    it('cancels on no ("2")', async () => {
      setState(PHONE, {
        step: 'staff_delete_confirm',
        type: 'staff',
        staff: {},
        staffList: mockStaffList,
        selectedStaff: mockStaffList[0],
      } as any)

      const result = await handleStaffFlow('2', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('initial')
    })
  })

  describe('handleStaffFlow — edit staff flow', () => {
    it('selects staff and moves to field selection', async () => {
      setState(PHONE, {
        step: 'staff_edit_list',
        type: 'staff',
        staff: {},
        staffList: mockStaffList,
      })

      const result = await handleStaffFlow('1', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('staff_edit_field')
    })

    it('selects name field ("1") and moves to value input', async () => {
      setState(PHONE, {
        step: 'staff_edit_field',
        type: 'staff',
        staff: {},
        staffList: mockStaffList,
        selectedStaff: mockStaffList[0],
      } as any)

      const result = await handleStaffFlow('1', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('staff_edit_value')
    })

    it('selects CNIC field ("2")', async () => {
      setState(PHONE, {
        step: 'staff_edit_field',
        type: 'staff',
        staff: {},
        staffList: mockStaffList,
        selectedStaff: mockStaffList[0],
      } as any)

      const result = await handleStaffFlow('2', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('staff_edit_value')
    })

    it('selects phone field ("3")', async () => {
      setState(PHONE, {
        step: 'staff_edit_field',
        type: 'staff',
        staff: {},
        staffList: mockStaffList,
        selectedStaff: mockStaffList[0],
      } as any)

      const result = await handleStaffFlow('3', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('staff_edit_value')
    })

    it('updates name value in DB', async () => {
      setState(PHONE, {
        step: 'staff_edit_value',
        type: 'staff',
        staff: {},
        staffList: mockStaffList,
        selectedStaff: mockStaffList[0],
        editField: 'name',
      } as any)

      ;(supabase as any).__setResult('staff', { data: null, error: null })

      const result = await handleStaffFlow('Ali Updated', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('initial')
    })

    it('validates CNIC format on edit', async () => {
      setState(PHONE, {
        step: 'staff_edit_value',
        type: 'staff',
        staff: {},
        staffList: mockStaffList,
        selectedStaff: mockStaffList[0],
        editField: 'cnic',
      } as any)

      const result = await handleStaffFlow('invalid-cnic', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      // Should still be on edit_value step
      const state = getState(PHONE)
      expect(state.step).toBe('staff_edit_value')
    })

    it('validates phone format on edit', async () => {
      setState(PHONE, {
        step: 'staff_edit_value',
        type: 'staff',
        staff: {},
        staffList: mockStaffList,
        selectedStaff: mockStaffList[0],
        editField: 'phone_number',
      } as any)

      const result = await handleStaffFlow('invalid-phone', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('staff_edit_value')
    })

    it('accepts valid CNIC on edit', async () => {
      setState(PHONE, {
        step: 'staff_edit_value',
        type: 'staff',
        staff: {},
        staffList: mockStaffList,
        selectedStaff: mockStaffList[0],
        editField: 'cnic',
      } as any)

      ;(supabase as any).__setResult('staff', { data: null, error: null })

      const result = await handleStaffFlow('3520112345679', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('initial')
    })

    it('accepts valid phone on edit', async () => {
      setState(PHONE, {
        step: 'staff_edit_value',
        type: 'staff',
        staff: {},
        staffList: mockStaffList,
        selectedStaff: mockStaffList[0],
        editField: 'phone_number',
      } as any)

      ;(supabase as any).__setResult('staff', { data: null, error: null })

      const result = await handleStaffFlow('03009876543', mockProfile, PHONE, getState(PHONE))

      expect(result).toBeTruthy()
      const state = getState(PHONE)
      expect(state.step).toBe('initial')
    })
  })
})

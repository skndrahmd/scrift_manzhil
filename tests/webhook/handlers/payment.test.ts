/**
 * Tests for Payment Receipt Flow Handler
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { supabaseAdmin } from '@/lib/supabase'
import { clearState, getState, setState } from '@/lib/webhook/state'
import { initializePaymentFlow, handlePaymentFlow } from '@/lib/webhook/handlers/payment'
import type { Profile, UserState } from '@/lib/webhook/types'

// Mock config
vi.mock('@/lib/webhook/config', async (importOriginal) => {
  const original = await importOriginal() as any
  return {
    ...original,
    getComplaintRecipients: vi.fn().mockResolvedValue([]),
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

const mockMaintenancePayments = [
  { id: 'mp1', year: 2024, month: 6, amount: 5000, status: 'unpaid' },
  { id: 'mp2', year: 2024, month: 7, amount: 5000, status: 'unpaid' },
]

const mockBookingPayments = [
  { id: 'bp1', booking_date: '2024-06-20', booking_charges: 5000, payment_status: 'pending' },
]

describe('Payment Flow Handler', () => {
  beforeEach(async () => {
    await clearState()
    vi.clearAllMocks()
    ;(supabaseAdmin as any).__reset()
  })

  describe('initializePaymentFlow', () => {
    it('returns no-methods message when no payment methods enabled', async () => {
      ;(supabaseAdmin as any).__setResult('payment_methods', {
        data: [],
        error: null,
      })

      const result = await initializePaymentFlow(mockProfile, PHONE)

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('initial')
    })

    it('shows type menu when payment methods exist', async () => {
      ;(supabaseAdmin as any).__setResult('payment_methods', {
        data: [{ id: 'pm1' }],
        error: null,
      })

      const result = await initializePaymentFlow(mockProfile, PHONE)

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('payment_type_selection')
      expect(state.type).toBe('payment')
    })
  })

  describe('handlePaymentFlow — type selection', () => {
    it('"1" selects maintenance and loads pending payments', async () => {
      await setState(PHONE, {
        step: 'payment_type_selection',
        type: 'payment',
        payment: {},
      })

      ;(supabaseAdmin as any).__setResult('maintenance_payments', {
        data: mockMaintenancePayments,
        error: null,
      })

      const result = await handlePaymentFlow('1', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('payment_selection')
      expect(state.payment?.payment_type).toBe('maintenance')
    })

    it('"2" selects booking and loads pending bookings', async () => {
      await setState(PHONE, {
        step: 'payment_type_selection',
        type: 'payment',
        payment: {},
      })

      ;(supabaseAdmin as any).__setResult('bookings', {
        data: mockBookingPayments,
        error: null,
      })

      const result = await handlePaymentFlow('2', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      // Single booking auto-selects to receipt upload
      expect(state.step).toBe('payment_receipt_upload')
      expect(state.payment?.payment_type).toBe('booking')
    })

    it('re-shows menu on invalid selection', async () => {
      await setState(PHONE, {
        step: 'payment_type_selection',
        type: 'payment',
        payment: {},
      })

      const result = await handlePaymentFlow('5', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
    })

    it('returns no-pending message when maintenance has no unpaid', async () => {
      await setState(PHONE, {
        step: 'payment_type_selection',
        type: 'payment',
        payment: {},
      })

      ;(supabaseAdmin as any).__setResult('maintenance_payments', {
        data: [],
        error: null,
      })

      const result = await handlePaymentFlow('1', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('initial')
    })

    it('auto-selects single pending maintenance payment', async () => {
      await setState(PHONE, {
        step: 'payment_type_selection',
        type: 'payment',
        payment: {},
      })

      ;(supabaseAdmin as any).__setResult('maintenance_payments', {
        data: [mockMaintenancePayments[0]],
        error: null,
      })
      // Mock payment_methods for showPaymentMethods
      ;(supabaseAdmin as any).__setResult('payment_methods', {
        data: [{ type: 'jazzcash', account_title: 'Test', account_number: '123', bank_name: null }],
        error: null,
      })

      const result = await handlePaymentFlow('1', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('payment_receipt_upload')
      expect(state.payment?.selected_payment_id).toBe('mp1')
    })
  })

  describe('handlePaymentFlow — payment selection', () => {
    it('selects payment from list and shows methods', async () => {
      await setState(PHONE, {
        step: 'payment_selection',
        type: 'payment',
        payment: { payment_type: 'maintenance', unit_id: 'unit-1' },
        statusItems: mockMaintenancePayments,
      })

      // No existing pending verification
      ;(supabaseAdmin as any).__setResult('payment_verifications', {
        data: [],
        error: null,
      })
      ;(supabaseAdmin as any).__setResult('payment_methods', {
        data: [{ type: 'jazzcash', account_title: 'Test', account_number: '123', bank_name: null }],
        error: null,
      })

      const result = await handlePaymentFlow('1', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
      const state = await getState(PHONE)
      expect(state.step).toBe('payment_receipt_upload')
    })

    it('re-shows list on invalid selection', async () => {
      await setState(PHONE, {
        step: 'payment_selection',
        type: 'payment',
        payment: { payment_type: 'maintenance', unit_id: 'unit-1' },
        statusItems: mockMaintenancePayments,
      })

      const result = await handlePaymentFlow('9', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
    })
  })

  describe('handlePaymentFlow — receipt upload', () => {
    const uploadState = (): UserState => ({
      step: 'payment_receipt_upload',
      type: 'payment',
      payment: {
        payment_type: 'maintenance',
        selected_payment_id: 'mp1',
        amount: 5000,
        description: 'Maintenance - June 2024',
        unit_id: 'unit-1',
      },
    })

    it('asks for image when no media provided', async () => {
      await setState(PHONE, uploadState())

      const result = await handlePaymentFlow('hello', mockProfile, PHONE, await getState(PHONE), undefined)

      expect(result).toBeTruthy()
      // Should still be on upload step
      const state = await getState(PHONE)
      expect(state.step).toBe('payment_receipt_upload')
    })

    it('returns error for unknown step', async () => {
      await setState(PHONE, {
        step: 'unknown_payment_step',
        type: 'payment',
        payment: {},
      })

      const result = await handlePaymentFlow('1', mockProfile, PHONE, await getState(PHONE))

      expect(result).toBeTruthy()
    })
  })
})

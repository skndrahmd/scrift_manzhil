/**
 * Tests for webhook message router
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { processMessage } from '@/lib/webhook/router'
import { clearAllStates, setState, getState } from '@/lib/webhook/state'
import { sampleProfile } from '../mocks/fixtures'

// Mock all handler initializers to return simple strings
vi.mock('@/lib/webhook/handlers', () => ({
  initializeComplaintFlow: vi.fn().mockResolvedValue('complaint_init'),
  handleComplaintFlow: vi.fn().mockResolvedValue('complaint_flow'),
  initializeBookingFlow: vi.fn().mockResolvedValue('booking_init'),
  handleBookingFlow: vi.fn().mockResolvedValue('booking_flow'),
  initializeStaffFlow: vi.fn().mockResolvedValue('staff_init'),
  handleStaffFlow: vi.fn().mockResolvedValue('staff_flow'),
  initializeFeedbackFlow: vi.fn().mockResolvedValue('feedback_init'),
  handleFeedbackFlow: vi.fn().mockResolvedValue('feedback_flow'),
  initializeHallFlow: vi.fn().mockResolvedValue('hall_init'),
  handleHallFlow: vi.fn().mockResolvedValue('hall_flow'),
  initializeStatusFlow: vi.fn().mockResolvedValue('status_init'),
  handleStatusFlow: vi.fn().mockResolvedValue('status_flow'),
  initializeCancelFlow: vi.fn().mockResolvedValue('cancel_init'),
  handleCancelFlow: vi.fn().mockResolvedValue('cancel_flow'),
  initializeVisitorFlow: vi.fn().mockResolvedValue('visitor_init'),
  handleVisitorFlow: vi.fn().mockResolvedValue('visitor_flow'),
  initializePaymentFlow: vi.fn().mockResolvedValue('payment_init'),
  handlePaymentFlow: vi.fn().mockResolvedValue('payment_flow'),
}))

const phone = '+923001234567'

describe('processMessage - Main Menu Routing', () => {
  beforeEach(() => {
    clearAllStates()
  })

  it('routes "1" to complaint flow', async () => {
    const result = await processMessage('1', sampleProfile, phone)
    expect(result).toBe('complaint_init')
  })

  it('routes "2" to status flow', async () => {
    const result = await processMessage('2', sampleProfile, phone)
    expect(result).toBe('status_init')
  })

  it('routes "3" to cancel flow', async () => {
    const result = await processMessage('3', sampleProfile, phone)
    expect(result).toBe('cancel_init')
  })

  it('routes "4" to staff flow', async () => {
    const result = await processMessage('4', sampleProfile, phone)
    expect(result).toBe('staff_init')
  })

  it('routes "5" to maintenance status', async () => {
    const result = await processMessage('5', sampleProfile, phone)
    // Returns maintenance status menu content
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('routes "6" to hall flow', async () => {
    const result = await processMessage('6', sampleProfile, phone)
    expect(result).toBe('hall_init')
  })

  it('routes "7" to visitor flow', async () => {
    const result = await processMessage('7', sampleProfile, phone)
    expect(result).toBe('visitor_init')
  })

  it('routes "8" to profile info', async () => {
    const result = await processMessage('8', sampleProfile, phone)
    expect(result).toContain(sampleProfile.name)
  })

  it('routes "9" to feedback flow', async () => {
    const result = await processMessage('9', sampleProfile, phone)
    expect(result).toBe('feedback_init')
  })

  it('routes "10" to emergency contacts', async () => {
    const result = await processMessage('10', sampleProfile, phone)
    expect(typeof result).toBe('string')
  })

  it('routes "11" to payment flow', async () => {
    const result = await processMessage('11', sampleProfile, phone)
    expect(result).toBe('payment_init')
  })

  it('returns menu for invalid selection', async () => {
    const result = await processMessage('99', sampleProfile, phone)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('processMessage - Flow Routing', () => {
  beforeEach(() => {
    clearAllStates()
  })

  it('routes to complaint handler when in complaint flow', async () => {
    setState(phone, { step: 'complaint_category', type: 'complaint' })
    const result = await processMessage('1', sampleProfile, phone)
    expect(result).toBe('complaint_flow')
  })

  it('routes to booking handler when in booking flow', async () => {
    setState(phone, { step: 'booking_date', type: 'booking' })
    const result = await processMessage('2025-03-15', sampleProfile, phone)
    expect(result).toBe('booking_flow')
  })

  it('routes to staff handler when in staff flow', async () => {
    setState(phone, { step: 'staff_add_name', type: 'staff' })
    const result = await processMessage('Ali Khan', sampleProfile, phone)
    expect(result).toBe('staff_flow')
  })

  it('routes to visitor handler when in visitor flow', async () => {
    setState(phone, { step: 'visitor_name', type: 'visitor' })
    const result = await processMessage('John', sampleProfile, phone)
    expect(result).toBe('visitor_flow')
  })

  it('routes to feedback handler when in feedback flow', async () => {
    setState(phone, { step: 'feedback_message', type: 'feedback' })
    const result = await processMessage('Great service!', sampleProfile, phone)
    expect(result).toBe('feedback_flow')
  })

  it('routes to hall handler when in hall flow', async () => {
    setState(phone, { step: 'hall_menu', type: 'hall' })
    const result = await processMessage('1', sampleProfile, phone)
    expect(result).toBe('hall_flow')
  })

  it('routes to payment handler when in payment flow', async () => {
    setState(phone, { step: 'payment_type_selection', type: 'payment' })
    const result = await processMessage('1', sampleProfile, phone)
    expect(result).toBe('payment_flow')
  })
})

describe('processMessage - Back Command', () => {
  beforeEach(() => {
    clearAllStates()
  })

  it('returns main menu when back from initial state', async () => {
    const result = await processMessage('b', sampleProfile, phone)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('clears state on back from unknown step', async () => {
    setState(phone, { step: 'some_unknown_step', type: 'complaint' })
    await processMessage('back', sampleProfile, phone)
    const state = getState(phone)
    expect(state.step).toBe('initial')
  })
})

describe('processMessage - Main Menu Command (0)', () => {
  beforeEach(() => {
    clearAllStates()
  })

  it('returns main menu for "0" from initial', async () => {
    const result = await processMessage('0', sampleProfile, phone)
    expect(result).toContain(sampleProfile.name)
  })

  it('clears state when pressing 0 mid-flow', async () => {
    setState(phone, { step: 'complaint_description', type: 'complaint' })
    await processMessage('0', sampleProfile, phone)
    const state = getState(phone)
    // State should be cleared (initial) or language_selection
    expect(state.step === 'initial' || state.step === 'language_selection').toBe(true)
  })
})

describe('processMessage - Error Handling', () => {
  it('returns error message on exception', async () => {
    // Pass null profile to trigger error
    const result = await processMessage('1', null as any, phone)
    expect(typeof result).toBe('string')
  })
})

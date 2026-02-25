/**
 * Tests for time slot generation (lib/date/time-slots.ts)
 */
import { describe, it, expect } from 'vitest'
import { generateTimeSlots } from '@/lib/date/time-slots'

describe('generateTimeSlots', () => {
  const defaultSettings = {
    id: 'settings-1',
    start_time: '09:00',
    end_time: '21:00',
    slot_duration_minutes: 60,
    working_days: [1, 2, 3, 4, 5, 6],
    booking_charges: 10000,
    created_at: '',
    updated_at: '',
  }

  it('generates correct number of 1-hour slots for 9AM-9PM', () => {
    const slots = generateTimeSlots(defaultSettings)
    expect(slots.length).toBe(12) // 12 hours = 12 one-hour slots
  })

  it('generates correct number of 2-hour slots', () => {
    const settings = { ...defaultSettings, slot_duration_minutes: 120 }
    const slots = generateTimeSlots(settings)
    expect(slots.length).toBe(6)
  })

  it('generates correct number of 30-minute slots', () => {
    const settings = { ...defaultSettings, slot_duration_minutes: 30 }
    const slots = generateTimeSlots(settings)
    expect(slots.length).toBe(24)
  })

  it('all slots are available when no existing bookings', () => {
    const slots = generateTimeSlots(defaultSettings)
    expect(slots.every(s => s.is_available)).toBe(true)
  })

  it('marks booked slots as unavailable', () => {
    const existingBookings = [
      {
        id: 'b1',
        profile_id: 'p1',
        booking_date: '2025-03-15',
        start_time: '10:00:00',
        end_time: '11:00:00',
        status: 'confirmed' as const,
        booking_charges: 10000,
        payment_status: 'pending',
        created_at: '',
        updated_at: '',
      },
    ]
    const slots = generateTimeSlots(defaultSettings, existingBookings)
    const slot10am = slots.find(s => s.start_time === '10:00:00')
    expect(slot10am?.is_available).toBe(false)
  })

  it('does not mark non-confirmed bookings as unavailable', () => {
    const existingBookings = [
      {
        id: 'b1',
        profile_id: 'p1',
        booking_date: '2025-03-15',
        start_time: '10:00:00',
        end_time: '11:00:00',
        status: 'cancelled' as const,
        booking_charges: 10000,
        payment_status: 'pending',
        created_at: '',
        updated_at: '',
      },
    ]
    const slots = generateTimeSlots(defaultSettings, existingBookings)
    const slot10am = slots.find(s => s.start_time === '10:00:00')
    expect(slot10am?.is_available).toBe(true)
  })

  it('generates display text with AM/PM', () => {
    const slots = generateTimeSlots(defaultSettings)
    expect(slots[0].display_text).toContain('AM')
    // Afternoon slot should contain PM
    const afternoonSlot = slots.find(s => s.start_time === '14:00:00')
    expect(afternoonSlot?.display_text).toContain('PM')
  })

  it('start and end times are formatted correctly', () => {
    const slots = generateTimeSlots(defaultSettings)
    expect(slots[0].start_time).toBe('09:00:00')
    expect(slots[0].end_time).toBe('10:00:00')
  })

  it('handles 3-hour slots', () => {
    const settings = { ...defaultSettings, slot_duration_minutes: 180 }
    const slots = generateTimeSlots(settings)
    expect(slots.length).toBe(4) // 12 hours / 3 = 4 slots
  })
})

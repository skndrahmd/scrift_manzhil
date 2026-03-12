/**
 * Tests for date formatting utilities
 */
import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatDateTime,
  getPakistanTime,
  isWorkingDay,
  getDayName,
} from '@/lib/date/formatting'

describe('formatDate', () => {
  it('formats YYYY-MM-DD to DD/MM/YYYY', () => {
    expect(formatDate('2025-03-15')).toBe('15/03/2025')
  })

  it('pads single-digit day and month', () => {
    expect(formatDate('2025-01-05')).toBe('05/01/2025')
  })

  it('handles end of year', () => {
    expect(formatDate('2025-12-31')).toBe('31/12/2025')
  })

  it('handles start of year', () => {
    expect(formatDate('2025-01-01')).toBe('01/01/2025')
  })

  it('handles leap year date', () => {
    expect(formatDate('2024-02-29')).toBe('29/02/2024')
  })
})

describe('formatDateTime', () => {
  it('formats ISO datetime string', async () => {
    const result = await formatDateTime('2025-03-15T10:30:00Z')
    expect(result).toContain('2025')
    expect(result).toContain('15')
  })

  it('returns a string', async () => {
    const result = await formatDateTime('2025-01-01T00:00:00Z')
    expect(typeof result).toBe('string')
  })
})

describe('getPakistanTime', () => {
  it('returns a Date object', async () => {
    const result = await getPakistanTime()
    expect(result).toBeInstanceOf(Date)
  })

  it('returns a valid date', async () => {
    const result = await getPakistanTime()
    expect(isNaN(result.getTime())).toBe(false)
  })
})

describe('isWorkingDay', () => {
  // Monday = 1, Sunday = 7

  it('returns true for a working day', () => {
    // 2025-03-17 is a Monday
    expect(isWorkingDay('2025-03-17', [1, 2, 3, 4, 5])).toBe(true)
  })

  it('returns false for a non-working day', () => {
    // 2025-03-16 is a Sunday
    expect(isWorkingDay('2025-03-16', [1, 2, 3, 4, 5])).toBe(false)
  })

  it('correctly maps Sunday to 7', () => {
    // 2025-03-16 is a Sunday
    expect(isWorkingDay('2025-03-16', [7])).toBe(true)
  })

  it('handles Saturday (6)', () => {
    // 2025-03-15 is a Saturday
    expect(isWorkingDay('2025-03-15', [1, 2, 3, 4, 5, 6])).toBe(true)
    expect(isWorkingDay('2025-03-15', [1, 2, 3, 4, 5])).toBe(false)
  })

  it('returns false for empty working days', () => {
    expect(isWorkingDay('2025-03-17', [])).toBe(false)
  })

  it('returns true when all days are working days', () => {
    expect(isWorkingDay('2025-03-16', [1, 2, 3, 4, 5, 6, 7])).toBe(true)
  })
})

describe('getDayName', () => {
  it('returns Monday for a Monday date', () => {
    expect(getDayName('2025-03-17')).toBe('Monday')
  })

  it('returns Sunday for a Sunday date', () => {
    expect(getDayName('2025-03-16')).toBe('Sunday')
  })

  it('returns Saturday for a Saturday date', () => {
    expect(getDayName('2025-03-15')).toBe('Saturday')
  })

  it('returns Friday for a Friday date', () => {
    expect(getDayName('2025-03-14')).toBe('Friday')
  })

  it('returns full day name (not abbreviated)', () => {
    const name = getDayName('2025-03-17')
    expect(name.length).toBeGreaterThan(3) // Not abbreviated
  })
})

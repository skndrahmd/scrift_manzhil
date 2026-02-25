/**
 * Tests for webhook utility functions
 * Pure functions: command detection, validators, formatters, time slots
 */
import { describe, it, expect } from 'vitest'
import {
  isBackCommand,
  isYesResponse,
  isNoResponse,
  isMainMenuCommand,
  parseSelection,
  validateName,
  validatePhoneNumber,
  validateCNIC,
  validateRole,
  formatTime,
  formatTimeDisplay,
  formatDate,
  formatDateTime,
  formatCurrency,
  formatSubcategory,
  generateTimeSlots,
  escapeXml,
  buildNumberedList,
  backInstruction,
  createXmlResponse,
} from '@/lib/webhook/utils'

// ============================================================================
// Command Detection
// ============================================================================

describe('isBackCommand', () => {
  it('returns true for "b"', () => {
    expect(isBackCommand('b')).toBe(true)
  })

  it('returns true for "B"', () => {
    expect(isBackCommand('B')).toBe(true)
  })

  it('returns true for "back"', () => {
    expect(isBackCommand('back')).toBe(true)
  })

  it('returns true for "BACK"', () => {
    expect(isBackCommand('BACK')).toBe(true)
  })

  it('returns true with whitespace padding', () => {
    expect(isBackCommand('  b  ')).toBe(true)
    expect(isBackCommand('  back  ')).toBe(true)
  })

  it('returns false for other inputs', () => {
    expect(isBackCommand('0')).toBe(false)
    expect(isBackCommand('backward')).toBe(false)
    expect(isBackCommand('ba')).toBe(false)
    expect(isBackCommand('1')).toBe(false)
  })
})

describe('isYesResponse', () => {
  it('returns true for "1"', () => {
    expect(isYesResponse('1')).toBe(true)
  })

  it('returns true for "yes"', () => {
    expect(isYesResponse('yes')).toBe(true)
  })

  it('returns true for "YES"', () => {
    expect(isYesResponse('YES')).toBe(true)
  })

  it('handles whitespace', () => {
    expect(isYesResponse('  1  ')).toBe(true)
    expect(isYesResponse(' yes ')).toBe(true)
  })

  it('returns false for other inputs', () => {
    expect(isYesResponse('2')).toBe(false)
    expect(isYesResponse('no')).toBe(false)
    expect(isYesResponse('y')).toBe(false)
  })
})

describe('isNoResponse', () => {
  it('returns true for "2"', () => {
    expect(isNoResponse('2')).toBe(true)
  })

  it('returns true for "no"', () => {
    expect(isNoResponse('no')).toBe(true)
  })

  it('returns true for "NO"', () => {
    expect(isNoResponse('NO')).toBe(true)
  })

  it('returns false for other inputs', () => {
    expect(isNoResponse('1')).toBe(false)
    expect(isNoResponse('yes')).toBe(false)
    expect(isNoResponse('n')).toBe(false)
  })
})

describe('isMainMenuCommand', () => {
  it('returns true for "0"', () => {
    expect(isMainMenuCommand('0')).toBe(true)
  })

  it('returns true with padding', () => {
    expect(isMainMenuCommand(' 0 ')).toBe(true)
  })

  it('returns false for other inputs', () => {
    expect(isMainMenuCommand('00')).toBe(false)
    expect(isMainMenuCommand('menu')).toBe(false)
    expect(isMainMenuCommand('1')).toBe(false)
  })
})

describe('parseSelection', () => {
  it('parses valid numbers', () => {
    expect(parseSelection('1')).toBe(1)
    expect(parseSelection('10')).toBe(10)
    expect(parseSelection('99')).toBe(99)
  })

  it('handles whitespace', () => {
    expect(parseSelection('  5  ')).toBe(5)
  })

  it('returns null for non-numeric input', () => {
    expect(parseSelection('abc')).toBeNull()
    expect(parseSelection('')).toBeNull()
    expect(parseSelection('one')).toBeNull()
  })

  it('handles negative numbers', () => {
    expect(parseSelection('-1')).toBe(-1)
  })
})

// ============================================================================
// Validators
// ============================================================================

describe('validateName', () => {
  it('accepts valid names', () => {
    expect(validateName('Ahmed Khan')).toEqual({ valid: true, normalized: 'Ahmed Khan' })
    expect(validateName("O'Brien")).toEqual({ valid: true, normalized: "O'Brien" })
    expect(validateName('Dr. Smith')).toEqual({ valid: true, normalized: 'Dr. Smith' })
  })

  it('trims whitespace', () => {
    expect(validateName('  Ahmed  ')).toEqual({ valid: true, normalized: 'Ahmed' })
  })

  it('rejects names too short', () => {
    const result = validateName('A')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('2 characters')
  })

  it('rejects names too long', () => {
    const longName = 'A'.repeat(51)
    const result = validateName(longName)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('50 characters')
  })

  it('rejects names with numbers', () => {
    const result = validateName('Ahmed123')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('letters')
  })

  it('rejects names with special characters', () => {
    const result = validateName('Ahmed@Khan')
    expect(result.valid).toBe(false)
  })
})

describe('validatePhoneNumber', () => {
  it('accepts +92 format', () => {
    expect(validatePhoneNumber('+923001234567')).toEqual({
      valid: true,
      normalized: '+923001234567',
    })
  })

  it('normalizes 03XX format', () => {
    expect(validatePhoneNumber('03001234567')).toEqual({
      valid: true,
      normalized: '+923001234567',
    })
  })

  it('normalizes 92 format (without +)', () => {
    expect(validatePhoneNumber('923001234567')).toEqual({
      valid: true,
      normalized: '+923001234567',
    })
  })

  it('normalizes 10-digit format', () => {
    expect(validatePhoneNumber('3001234567')).toEqual({
      valid: true,
      normalized: '+923001234567',
    })
  })

  it('strips formatting characters', () => {
    expect(validatePhoneNumber('0300-123-4567')).toEqual({
      valid: true,
      normalized: '+923001234567',
    })
    expect(validatePhoneNumber('(0300) 1234567')).toEqual({
      valid: true,
      normalized: '+923001234567',
    })
  })

  it('rejects too short numbers', () => {
    const result = validatePhoneNumber('030012345')
    expect(result.valid).toBe(false)
  })

  it('rejects invalid formats', () => {
    const result = validatePhoneNumber('12345')
    expect(result.valid).toBe(false)
  })
})

describe('validateCNIC', () => {
  it('accepts 13-digit CNIC', () => {
    expect(validateCNIC('4210112345671')).toEqual({
      valid: true,
      normalized: '42101-1234567-1',
    })
  })

  it('strips dashes and formats correctly', () => {
    expect(validateCNIC('42101-1234567-1')).toEqual({
      valid: true,
      normalized: '42101-1234567-1',
    })
  })

  it('strips spaces', () => {
    expect(validateCNIC('42101 1234567 1')).toEqual({
      valid: true,
      normalized: '42101-1234567-1',
    })
  })

  it('rejects wrong length', () => {
    const result = validateCNIC('123456789')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('13 digits')
  })

  it('rejects non-numeric', () => {
    const result = validateCNIC('4210112345abc')
    expect(result.valid).toBe(false)
  })
})

describe('validateRole', () => {
  it('accepts valid roles', () => {
    const roles = ['driver', 'maid', 'cook', 'nanny', 'guard', 'other']
    for (const role of roles) {
      expect(validateRole(role)).toEqual({ valid: true, normalized: role })
    }
  })

  it('is case-insensitive', () => {
    expect(validateRole('DRIVER')).toEqual({ valid: true, normalized: 'driver' })
    expect(validateRole('Maid')).toEqual({ valid: true, normalized: 'maid' })
  })

  it('rejects invalid roles', () => {
    const result = validateRole('plumber')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid role')
  })
})

// ============================================================================
// Formatters
// ============================================================================

describe('formatTime', () => {
  it('formats morning time', () => {
    expect(formatTime('09:00')).toBe('9:00 AM')
  })

  it('formats afternoon time', () => {
    expect(formatTime('14:30')).toBe('2:30 PM')
  })

  it('formats midnight', () => {
    expect(formatTime('00:00')).toBe('12:00 AM')
  })

  it('formats noon', () => {
    expect(formatTime('12:00')).toBe('12:00 PM')
  })
})

describe('formatTimeDisplay', () => {
  it('formats morning hour', () => {
    expect(formatTimeDisplay(9)).toBe('9 AM')
  })

  it('formats afternoon hour', () => {
    expect(formatTimeDisplay(14)).toBe('2 PM')
  })

  it('formats midnight', () => {
    expect(formatTimeDisplay(0)).toBe('12 AM')
  })

  it('formats noon', () => {
    expect(formatTimeDisplay(12)).toBe('12 PM')
  })
})

describe('formatDate', () => {
  it('formats date in DD/MM/YYYY', () => {
    const result = formatDate('2025-03-15')
    expect(result).toBe('15/03/2025')
  })

  it('formats single-digit day/month', () => {
    const result = formatDate('2025-01-05')
    expect(result).toBe('05/01/2025')
  })
})

describe('formatCurrency', () => {
  it('formats whole numbers', () => {
    expect(formatCurrency(5000)).toBe('Rs. 5,000')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('Rs. 0')
  })

  it('formats large numbers', () => {
    expect(formatCurrency(1000000)).toBe('Rs. 1,000,000')
  })
})

describe('formatSubcategory', () => {
  it('converts underscore to title case', () => {
    expect(formatSubcategory('lift_elevator')).toBe('Lift Elevator')
  })

  it('handles single word', () => {
    expect(formatSubcategory('plumbing')).toBe('Plumbing')
  })

  it('handles multiple underscores', () => {
    expect(formatSubcategory('snooker_room')).toBe('Snooker Room')
  })
})

// ============================================================================
// Time Slot Generation
// ============================================================================

describe('generateTimeSlots', () => {
  const defaultSettings = {
    start_time: '09:00:00',
    end_time: '21:00:00',
    slot_duration_minutes: 60,
    working_days: [1, 2, 3, 4, 5, 6],
    booking_charges: 10000,
  }

  it('generates correct number of slots', () => {
    const slots = generateTimeSlots(defaultSettings, [])
    expect(slots.length).toBe(12)
  })

  it('marks booked slots correctly', () => {
    const existingBookings = [
      { start_time: '10:00:00', end_time: '11:00:00' },
    ]
    const slots = generateTimeSlots(defaultSettings, existingBookings)
    const bookedSlot = slots.find(s => s.startTime === '10:00:00')
    expect(bookedSlot?.isBooked).toBe(true)
  })

  it('marks unbooked slots as available', () => {
    const slots = generateTimeSlots(defaultSettings, [])
    expect(slots.every(s => !s.isBooked)).toBe(true)
  })

  it('uses correct display format', () => {
    const slots = generateTimeSlots(defaultSettings, [])
    expect(slots[0].display).toContain('9 AM')
    expect(slots[0].display).toContain('10 AM')
  })

  it('handles 2-hour slots', () => {
    const settings = { ...defaultSettings, slot_duration_minutes: 120 }
    const slots = generateTimeSlots(settings, [])
    expect(slots.length).toBe(6)
  })

  it('slots have sequential indices', () => {
    const slots = generateTimeSlots(defaultSettings, [])
    slots.forEach((slot, i) => {
      expect(slot.index).toBe(i + 1)
    })
  })
})

// ============================================================================
// Response Helpers
// ============================================================================

describe('escapeXml', () => {
  it('escapes ampersand', () => {
    expect(escapeXml('A & B')).toBe('A &amp; B')
  })

  it('escapes angle brackets', () => {
    expect(escapeXml('<tag>')).toBe('&lt;tag&gt;')
  })

  it('escapes quotes', () => {
    expect(escapeXml('"hello"')).toBe('&quot;hello&quot;')
  })

  it('escapes apostrophes', () => {
    expect(escapeXml("it's")).toBe("it&apos;s")
  })

  it('handles multiple escapes', () => {
    expect(escapeXml('<a & "b">')).toBe('&lt;a &amp; &quot;b&quot;&gt;')
  })
})

describe('buildNumberedList', () => {
  it('builds numbered list starting from 1', () => {
    const items = [
      { label: 'Item A' },
      { label: 'Item B' },
    ]
    expect(buildNumberedList(items)).toBe('1.  Item A\n2.  Item B')
  })

  it('includes emojis when provided', () => {
    const items = [
      { label: 'Complaint', emoji: '📝' },
      { label: 'Status', emoji: '🔍' },
    ]
    expect(buildNumberedList(items)).toBe('1. 📝 Complaint\n2. 🔍 Status')
  })

  it('supports custom start index', () => {
    const items = [{ label: 'Item A' }]
    expect(buildNumberedList(items, 5)).toBe('5.  Item A')
  })
})

describe('backInstruction', () => {
  it('returns back instruction text', () => {
    const result = backInstruction()
    expect(result).toContain('B')
    expect(result).toContain('0')
    expect(result).toContain('main menu')
  })
})

describe('createXmlResponse', () => {
  it('creates response with message', async () => {
    const response = createXmlResponse('Hello')
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/xml')
    const body = await response.text()
    expect(body).toContain('<Message>Hello</Message>')
  })

  it('creates empty response without message', async () => {
    const response = createXmlResponse()
    const body = await response.text()
    expect(body).toContain('<Response></Response>')
    expect(body).not.toContain('<Message>')
  })

  it('escapes XML special characters in message', async () => {
    const response = createXmlResponse('A & B <C>')
    const body = await response.text()
    expect(body).toContain('A &amp; B &lt;C&gt;')
  })
})

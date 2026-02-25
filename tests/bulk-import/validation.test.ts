/**
 * Tests for resident bulk import validation
 */
import { describe, it, expect } from 'vitest'
import {
  normalizePhoneNumber,
  validateCNIC,
  validateResident,
  validateResidents,
} from '@/lib/bulk-import/validation'
import type { ParsedResident } from '@/lib/bulk-import/parser'

// ============================================================================
// Phone Number Normalization
// ============================================================================

describe('normalizePhoneNumber', () => {
  it('normalizes 03XX format to +92', () => {
    const result = normalizePhoneNumber('03001234567')
    expect(result.normalized).toBe('+923001234567')
    expect(result.isValid).toBe(true)
  })

  it('handles +92 format', () => {
    const result = normalizePhoneNumber('+923001234567')
    expect(result.normalized).toBe('+923001234567')
    expect(result.isValid).toBe(true)
  })

  it('handles 92 format without plus', () => {
    const result = normalizePhoneNumber('923001234567')
    expect(result.normalized).toBe('+923001234567')
    expect(result.isValid).toBe(true)
  })

  it('handles 10-digit format starting with 3', () => {
    const result = normalizePhoneNumber('3001234567')
    expect(result.normalized).toBe('+923001234567')
    expect(result.isValid).toBe(true)
  })

  it('handles 00 prefix', () => {
    const result = normalizePhoneNumber('00923001234567')
    expect(result.normalized).toBe('+923001234567')
    expect(result.isValid).toBe(true)
  })

  it('strips non-digit characters', () => {
    const result = normalizePhoneNumber('0300-123-4567')
    expect(result.normalized).toBe('+923001234567')
    expect(result.isValid).toBe(true)
  })

  it('returns invalid for empty string', () => {
    const result = normalizePhoneNumber('')
    expect(result.isValid).toBe(false)
  })

  it('returns invalid for non-Pakistan numbers', () => {
    const result = normalizePhoneNumber('+14155551234')
    expect(result.isValid).toBe(false)
  })

  it('returns invalid for too short numbers', () => {
    const result = normalizePhoneNumber('030012345')
    expect(result.isValid).toBe(false)
  })
})

// ============================================================================
// CNIC Validation
// ============================================================================

describe('validateCNIC (bulk import)', () => {
  it('accepts empty CNIC (optional field)', () => {
    expect(validateCNIC('')).toBe(true)
  })

  it('accepts 13-digit CNIC', () => {
    expect(validateCNIC('4210112345671')).toBe(true)
  })

  it('accepts CNIC with dashes', () => {
    expect(validateCNIC('42101-1234567-1')).toBe(true)
  })

  it('rejects wrong length', () => {
    expect(validateCNIC('123456789')).toBe(false)
  })

  it('rejects non-numeric CNIC', () => {
    expect(validateCNIC('4210112345abc')).toBe(false)
  })
})

// ============================================================================
// Single Resident Validation
// ============================================================================

describe('validateResident', () => {
  const makeResident = (overrides: Partial<ParsedResident> = {}): ParsedResident => ({
    rowNumber: 2,
    name: 'Ahmed Khan',
    phone_number: '03001234567',
    apartment_number: 'A-101',
    ...overrides,
  })

  it('validates a valid resident', () => {
    const result = validateResident(
      makeResident(),
      new Set(),
      new Map()
    )
    expect(result.status).toBe('valid')
    expect(result.errors).toHaveLength(0)
  })

  it('errors on missing name', () => {
    const result = validateResident(
      makeResident({ name: '' }),
      new Set(),
      new Map()
    )
    expect(result.status).toBe('error')
    expect(result.errors).toContain('Name is required')
  })

  it('errors on missing phone', () => {
    const result = validateResident(
      makeResident({ phone_number: '' }),
      new Set(),
      new Map()
    )
    expect(result.status).toBe('error')
    expect(result.errors).toContain('Phone number is required')
  })

  it('errors on invalid phone format', () => {
    const result = validateResident(
      makeResident({ phone_number: '12345' }),
      new Set(),
      new Map()
    )
    expect(result.status).toBe('error')
    expect(result.errors.some(e => e.includes('Invalid phone'))).toBe(true)
  })

  it('errors on missing apartment number', () => {
    const result = validateResident(
      makeResident({ apartment_number: '' }),
      new Set(),
      new Map()
    )
    expect(result.status).toBe('error')
    expect(result.errors).toContain('Apartment number is required')
  })

  it('errors on duplicate phone in database', () => {
    const existingPhones = new Set(['+923001234567'])
    const result = validateResident(
      makeResident(),
      existingPhones,
      new Map()
    )
    expect(result.status).toBe('error')
    expect(result.errors.some(e => e.includes('already exists'))).toBe(true)
  })

  it('warns on duplicate phone within file', () => {
    const filePhones = new Map([['+923001234567', 1]]) // First seen at row 1
    const result = validateResident(
      makeResident({ rowNumber: 3 }), // This is row 3
      new Set(),
      filePhones
    )
    expect(result.status).toBe('warning')
    expect(result.warnings.some(w => w.includes('Duplicate phone'))).toBe(true)
  })

  it('errors on invalid CNIC', () => {
    const result = validateResident(
      makeResident({ cnic: '12345' }),
      new Set(),
      new Map()
    )
    expect(result.status).toBe('error')
    expect(result.errors.some(e => e.includes('CNIC'))).toBe(true)
  })

  it('normalizes phone number in result', () => {
    const result = validateResident(
      makeResident({ phone_number: '03001234567' }),
      new Set(),
      new Map()
    )
    expect(result.normalizedPhone).toBe('+923001234567')
  })
})

// ============================================================================
// Batch Validation
// ============================================================================

describe('validateResidents', () => {
  it('returns correct summary for valid data', () => {
    const residents: ParsedResident[] = [
      { rowNumber: 2, name: 'Ahmed', phone_number: '03001234567', apartment_number: 'A-101' },
      { rowNumber: 3, name: 'Fatima', phone_number: '03009876543', apartment_number: 'B-202' },
    ]

    const { summary } = validateResidents(residents, new Set())
    expect(summary.total).toBe(2)
    expect(summary.valid).toBe(2)
    expect(summary.errors).toBe(0)
    expect(summary.validResidents).toHaveLength(2)
  })

  it('detects in-file duplicate phones', () => {
    const residents: ParsedResident[] = [
      { rowNumber: 2, name: 'Ahmed', phone_number: '03001234567', apartment_number: 'A-101' },
      { rowNumber: 3, name: 'Duplicate', phone_number: '03001234567', apartment_number: 'A-102' },
    ]

    const { results, summary } = validateResidents(residents, new Set())
    expect(summary.warnings).toBeGreaterThan(0)
    // First occurrence should be valid, second should have warning
    expect(results[0].status).toBe('valid')
    expect(results[1].status).toBe('warning')
  })

  it('counts errors correctly', () => {
    const residents: ParsedResident[] = [
      { rowNumber: 2, name: '', phone_number: '', apartment_number: '' },
      { rowNumber: 3, name: 'Valid', phone_number: '03001234567', apartment_number: 'A-101' },
    ]

    const { summary } = validateResidents(residents, new Set())
    expect(summary.errors).toBe(1)
    expect(summary.valid).toBe(1)
  })

  it('uses normalized phone in validResidents', () => {
    const residents: ParsedResident[] = [
      { rowNumber: 2, name: 'Ahmed', phone_number: '03001234567', apartment_number: 'A-101' },
    ]

    const { summary } = validateResidents(residents, new Set())
    expect(summary.validResidents[0].phone_number).toBe('+923001234567')
  })
})

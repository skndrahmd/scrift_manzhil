/**
 * Tests for unit bulk import validation
 */
import { describe, it, expect } from 'vitest'
import {
  validateUnit,
  validateUnits,
} from '@/lib/bulk-import-units/validation'
import type { ParsedUnit } from '@/lib/bulk-import-units/parser'

describe('validateUnit', () => {
  const makeUnit = (overrides: Partial<ParsedUnit> = {}): ParsedUnit => ({
    rowNumber: 2,
    apartment_number: 'A-101',
    ...overrides,
  })

  it('validates a valid unit', () => {
    const result = validateUnit(makeUnit(), new Set(), new Map())
    expect(result.status).toBe('valid')
    expect(result.errors).toHaveLength(0)
  })

  it('validates unit with all optional fields', () => {
    const result = validateUnit(
      makeUnit({ floor_number: '1', unit_type: '2BHK', maintenance_charges: 5000 }),
      new Set(),
      new Map()
    )
    expect(result.status).toBe('valid')
  })

  it('errors on missing apartment number', () => {
    const result = validateUnit(makeUnit({ apartment_number: '' }), new Set(), new Map())
    expect(result.status).toBe('error')
    expect(result.errors).toContain('Apartment number is required')
  })

  it('errors on whitespace-only apartment number', () => {
    const result = validateUnit(makeUnit({ apartment_number: '   ' }), new Set(), new Map())
    expect(result.status).toBe('error')
  })

  it('errors on duplicate apartment in database', () => {
    const existing = new Set(['A-101'])
    const result = validateUnit(makeUnit(), existing, new Map())
    expect(result.status).toBe('error')
    expect(result.errors.some(e => e.includes('already exists'))).toBe(true)
  })

  it('warns on duplicate apartment within file', () => {
    const fileApts = new Map([['A-101', 1]])
    const result = validateUnit(makeUnit({ rowNumber: 3 }), new Set(), fileApts)
    expect(result.status).toBe('warning')
    expect(result.warnings.some(w => w.includes('Duplicate'))).toBe(true)
  })

  it('errors on negative maintenance charges', () => {
    const result = validateUnit(
      makeUnit({ maintenance_charges: -100 }),
      new Set(),
      new Map()
    )
    expect(result.status).toBe('error')
    expect(result.errors.some(e => e.includes('positive'))).toBe(true)
  })

  it('errors on zero maintenance charges', () => {
    const result = validateUnit(
      makeUnit({ maintenance_charges: 0 }),
      new Set(),
      new Map()
    )
    expect(result.status).toBe('error')
  })

  it('accepts undefined maintenance charges (optional)', () => {
    const result = validateUnit(
      makeUnit({ maintenance_charges: undefined }),
      new Set(),
      new Map()
    )
    expect(result.status).toBe('valid')
  })
})

describe('validateUnits', () => {
  it('returns correct summary for valid data', () => {
    const units: ParsedUnit[] = [
      { rowNumber: 2, apartment_number: 'A-101' },
      { rowNumber: 3, apartment_number: 'A-102' },
    ]
    const { summary } = validateUnits(units, new Set())
    expect(summary.total).toBe(2)
    expect(summary.valid).toBe(2)
    expect(summary.errors).toBe(0)
    expect(summary.validUnits).toHaveLength(2)
  })

  it('detects in-file duplicate apartments', () => {
    const units: ParsedUnit[] = [
      { rowNumber: 2, apartment_number: 'A-101' },
      { rowNumber: 3, apartment_number: 'A-101' },
    ]
    const { results, summary } = validateUnits(units, new Set())
    expect(summary.warnings).toBeGreaterThan(0)
    expect(results[0].status).toBe('valid')
    expect(results[1].status).toBe('warning')
  })

  it('counts errors correctly', () => {
    const units: ParsedUnit[] = [
      { rowNumber: 2, apartment_number: '' },
      { rowNumber: 3, apartment_number: 'A-101' },
    ]
    const { summary } = validateUnits(units, new Set())
    expect(summary.errors).toBe(1)
    expect(summary.valid).toBe(1)
  })

  it('deduplicates warnings in validUnits', () => {
    const units: ParsedUnit[] = [
      { rowNumber: 2, apartment_number: 'A-101' },
      { rowNumber: 3, apartment_number: 'A-101' },
    ]
    const { summary } = validateUnits(units, new Set())
    // Should only include one of the duplicates
    const a101Count = summary.validUnits.filter(u => u.apartment_number === 'A-101').length
    expect(a101Count).toBe(1)
  })

  it('handles empty input', () => {
    const { summary } = validateUnits([], new Set())
    expect(summary.total).toBe(0)
    expect(summary.valid).toBe(0)
    expect(summary.validUnits).toHaveLength(0)
  })
})

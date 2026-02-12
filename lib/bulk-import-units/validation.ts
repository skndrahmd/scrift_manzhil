import { ParsedUnit } from './parser'

export type UnitValidationStatus = 'valid' | 'warning' | 'error'

export interface UnitValidationResult {
  rowNumber: number
  unit: ParsedUnit
  status: UnitValidationStatus
  errors: string[]
  warnings: string[]
}

export interface UnitValidationSummary {
  total: number
  valid: number
  warnings: number
  errors: number
  validUnits: ParsedUnit[]
}

// Validate a single unit record
export function validateUnit(
  unit: ParsedUnit,
  existingApartments: Set<string>,
  fileApartments: Map<string, number> // Map of apartment_number -> first row number
): UnitValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Required field: apartment_number
  if (!unit.apartment_number || unit.apartment_number.trim() === '') {
    errors.push('Apartment number is required')
  } else {
    // Check for duplicates in existing database
    if (existingApartments.has(unit.apartment_number.trim())) {
      errors.push('Apartment number already exists in database')
    }

    // Check for duplicates within the file
    const existingRow = fileApartments.get(unit.apartment_number.trim())
    if (existingRow !== undefined && existingRow !== unit.rowNumber) {
      warnings.push(`Duplicate apartment number in file (first in row ${existingRow})`)
    }
  }

  // Optional field: maintenance_charges validation
  if (unit.maintenance_charges !== undefined) {
    if (unit.maintenance_charges <= 0) {
      errors.push('Maintenance charges must be a positive number')
    }
  }

  // Determine status
  let status: UnitValidationStatus = 'valid'
  if (errors.length > 0) {
    status = 'error'
  } else if (warnings.length > 0) {
    status = 'warning'
  }

  return {
    rowNumber: unit.rowNumber,
    unit,
    status,
    errors,
    warnings,
  }
}

// Validate all units and return results with summary
export function validateUnits(
  units: ParsedUnit[],
  existingApartments: Set<string>
): { results: UnitValidationResult[]; summary: UnitValidationSummary } {
  // Build map of apartment numbers within the file to detect duplicates
  const fileApartments = new Map<string, number>()

  // First pass: collect all apartment numbers with their first occurrence
  for (const unit of units) {
    const apt = unit.apartment_number?.trim()
    if (apt && !fileApartments.has(apt)) {
      fileApartments.set(apt, unit.rowNumber)
    }
  }

  // Second pass: validate each unit
  const results: UnitValidationResult[] = []

  for (const unit of units) {
    const result = validateUnit(unit, existingApartments, fileApartments)
    results.push(result)
  }

  // Calculate summary
  const summary: UnitValidationSummary = {
    total: results.length,
    valid: results.filter(r => r.status === 'valid').length,
    warnings: results.filter(r => r.status === 'warning').length,
    errors: results.filter(r => r.status === 'error').length,
    validUnits: results
      .filter(r => r.status === 'valid' || r.status === 'warning')
      .filter((r, index, arr) => {
        // For warnings (duplicates within file), only keep the first occurrence
        if (r.status === 'warning') {
          const firstOccurrence = arr.find(
            other => other.unit.apartment_number.trim() === r.unit.apartment_number.trim() && other.status !== 'error'
          )
          return firstOccurrence === r
        }
        return true
      })
      .map(r => r.unit),
  }

  return { results, summary }
}

// Generate error report as CSV
export function generateErrorReport(results: UnitValidationResult[]): string {
  const headers = ['Row', 'Apartment', 'Floor', 'Type', 'Charges', 'Status', 'Issues']
  const rows = results
    .filter(r => r.status !== 'valid')
    .map(r => [
      r.rowNumber.toString(),
      r.unit.apartment_number,
      r.unit.floor_number || '',
      r.unit.unit_type || '',
      r.unit.maintenance_charges?.toString() || '',
      r.status,
      [...r.errors, ...r.warnings].join('; '),
    ])

  return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n')
}

// Download error report
export function downloadErrorReport(results: UnitValidationResult[]): void {
  const report = generateErrorReport(results)
  const blob = new Blob([report], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'unit_import_errors.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

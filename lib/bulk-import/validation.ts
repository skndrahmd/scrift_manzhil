import { ParsedResident } from './parser'
import { normalizePhoneNumber as normalizePhone, validateCNIC as validateCNICFormat, validateName, validateApartment } from '@/lib/validation/resident'

export type ValidationStatus = 'valid' | 'warning' | 'error'

export interface ValidationResult {
  rowNumber: number
  resident: ParsedResident
  status: ValidationStatus
  errors: string[]
  warnings: string[]
  normalizedPhone: string
}

export interface ValidationSummary {
  total: number
  valid: number
  warnings: number
  errors: number
  validResidents: ParsedResident[]
}

// Re-export normalizePhoneNumber from shared module for backward compatibility
export const normalizePhoneNumber = normalizePhone

// Re-export validateCNIC from shared module for backward compatibility
export const validateCNIC = validateCNICFormat

// Validate a single resident record
export function validateResident(
  resident: ParsedResident,
  existingPhones: Set<string>,
  filePhones: Map<string, number>, // Map of normalized phone -> first row number
  validApartments: Set<string> // Set of valid apartment numbers from units table
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate name
  const nameResult = validateName(resident.name)
  if (!nameResult.isValid && nameResult.error) {
    errors.push(nameResult.error)
  }

  // Validate and normalize phone number
  const phoneResult = normalizePhoneNumber(resident.phone_number)
  const normalizedPhone = phoneResult.normalized

  if (!resident.phone_number || resident.phone_number.trim() === '') {
    errors.push('Phone number is required')
  } else if (!phoneResult.isValid && phoneResult.error) {
    errors.push(phoneResult.error)
  } else {
    // Check for duplicates in existing database
    if (existingPhones.has(normalizedPhone)) {
      errors.push('Phone number already exists in database')
    }

    // Check for duplicates within the file
    const existingRow = filePhones.get(normalizedPhone)
    if (existingRow !== undefined && existingRow !== resident.rowNumber) {
      warnings.push(`Duplicate phone in file (first in row ${existingRow})`)
    }
  }

  // Validate apartment number
  const apartmentResult = validateApartment(resident.apartment_number)
  if (!apartmentResult.isValid && apartmentResult.error) {
    errors.push(apartmentResult.error)
  } else if (apartmentResult.normalized) {
    // Check if the unit exists in the units table
    if (!validApartments.has(apartmentResult.normalized)) {
      errors.push(`Unit "${resident.apartment_number}" does not exist. Please add the unit first.`)
    }
  }

  // Optional field: CNIC validation
  if (resident.cnic) {
    const cnicResult = validateCNICFormat(resident.cnic)
    if (!cnicResult.isValid && cnicResult.error) {
      errors.push(cnicResult.error)
    }
  }

  // Determine status
  let status: ValidationStatus = 'valid'
  if (errors.length > 0) {
    status = 'error'
  } else if (warnings.length > 0) {
    status = 'warning'
  }

  return {
    rowNumber: resident.rowNumber,
    resident,
    status,
    errors,
    warnings,
    normalizedPhone,
  }
}

// Validate all residents and return results with summary
export function validateResidents(
  residents: ParsedResident[],
  existingPhones: Set<string>,
  validApartments: Set<string> = new Set()
): { results: ValidationResult[]; summary: ValidationSummary } {
  // Build map of phone numbers within the file to detect duplicates
  const filePhones = new Map<string, number>()

  // First pass: collect all normalized phone numbers with their first occurrence
  for (const resident of residents) {
    const { normalized, isValid } = normalizePhoneNumber(resident.phone_number)
    if (isValid && !filePhones.has(normalized)) {
      filePhones.set(normalized, resident.rowNumber)
    }
  }

  // Second pass: validate each resident
  const results: ValidationResult[] = []

  for (const resident of residents) {
    const result = validateResident(resident, existingPhones, filePhones, validApartments)
    results.push(result)
  }

  // Calculate summary
  const summary: ValidationSummary = {
    total: results.length,
    valid: results.filter(r => r.status === 'valid').length,
    warnings: results.filter(r => r.status === 'warning').length,
    errors: results.filter(r => r.status === 'error').length,
    validResidents: results
      .filter(r => r.status === 'valid' || r.status === 'warning')
      .filter((r, index, arr) => {
        // For warnings (duplicates within file), only keep the first occurrence
        if (r.status === 'warning') {
          const firstOccurrence = arr.find(
            other => other.normalizedPhone === r.normalizedPhone && other.status !== 'error'
          )
          return firstOccurrence === r
        }
        return true
      })
      .map(r => ({
        ...r.resident,
        phone_number: r.normalizedPhone, // Use normalized phone
      })),
  }

  return { results, summary }
}

// Generate error report as CSV
export function generateErrorReport(results: ValidationResult[]): string {
  const headers = ['Row', 'Name', 'Phone', 'Apartment', 'Status', 'Issues']
  const rows = results
    .filter(r => r.status !== 'valid')
    .map(r => [
      r.rowNumber.toString(),
      r.resident.name,
      r.resident.phone_number,
      r.resident.apartment_number,
      r.status,
      [...r.errors, ...r.warnings].join('; '),
    ])

  return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n')
}

// Download error report
export function downloadErrorReport(results: ValidationResult[]): void {
  const report = generateErrorReport(results)
  const blob = new Blob([report], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'import_errors.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

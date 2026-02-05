import { ParsedResident } from './parser'

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

// Normalize Pakistani phone number to E.164 format (+923XXXXXXXXX)
export function normalizePhoneNumber(phone: string): { normalized: string; isValid: boolean } {
  if (!phone) {
    return { normalized: '', isValid: false }
  }

  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '')

  // Handle various Pakistan phone number formats
  // 03001234567 -> +923001234567
  // 923001234567 -> +923001234567
  // +923001234567 -> +923001234567
  // 003001234567 -> +923001234567

  // Remove leading zeros that aren't part of the area code
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2)
  }

  // If starts with 0 and followed by 3, it's a local mobile format
  if (cleaned.startsWith('03')) {
    cleaned = '92' + cleaned.substring(1)
  }

  // If doesn't start with + or 92, it might be missing country code
  if (!cleaned.startsWith('+') && !cleaned.startsWith('92')) {
    // If it's 10 digits starting with 3, assume Pakistan mobile
    if (cleaned.length === 10 && cleaned.startsWith('3')) {
      cleaned = '92' + cleaned
    }
  }

  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned
  }

  // Validate: Pakistan mobile numbers should be +92 followed by 10 digits (3XX XXXXXXX)
  const pakistanMobileRegex = /^\+92[3][0-9]{9}$/
  const isValid = pakistanMobileRegex.test(cleaned)

  return { normalized: cleaned, isValid }
}

// Validate CNIC format (13 digits with optional dashes: 42101-1234567-1)
export function validateCNIC(cnic: string): boolean {
  if (!cnic) return true // CNIC is optional

  // Remove dashes and spaces
  const cleaned = cnic.replace(/[-\s]/g, '')

  // Must be exactly 13 digits
  return /^\d{13}$/.test(cleaned)
}

// Validate a single resident record
export function validateResident(
  resident: ParsedResident,
  existingPhones: Set<string>,
  filePhones: Map<string, number> // Map of normalized phone -> first row number
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate and normalize phone number
  const { normalized: normalizedPhone, isValid: isPhoneValid } = normalizePhoneNumber(resident.phone_number)

  // Required field: name
  if (!resident.name || resident.name.trim() === '') {
    errors.push('Name is required')
  }

  // Required field: phone_number
  if (!resident.phone_number || resident.phone_number.trim() === '') {
    errors.push('Phone number is required')
  } else if (!isPhoneValid) {
    errors.push('Invalid phone number format (must be valid Pakistan mobile: 03XX-XXXXXXX)')
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

  // Required field: apartment_number
  if (!resident.apartment_number || resident.apartment_number.trim() === '') {
    errors.push('Apartment number is required')
  }

  // Optional field: CNIC validation
  if (resident.cnic && !validateCNIC(resident.cnic)) {
    errors.push('Invalid CNIC format (must be 13 digits)')
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
  existingPhones: Set<string>
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
    const result = validateResident(resident, existingPhones, filePhones)
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

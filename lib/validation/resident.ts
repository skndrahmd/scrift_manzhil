/**
 * Shared validation utilities for resident data
 * Used by both individual resident forms and bulk import
 */

export interface PhoneValidationResult {
  normalized: string
  isValid: boolean
  error?: string
}

export interface CnicValidationResult {
  normalized: string
  isValid: boolean
  error?: string
}

export interface NameValidationResult {
  normalized: string
  isValid: boolean
  error?: string
}

export interface ApartmentValidationResult {
  normalized: string
  isValid: boolean
  error?: string
}

/**
 * Normalize Pakistani phone number to E.164 format (+923XXXXXXXXX)
 * Handles various formats:
 * - 03001234567 -> +923001234567
 * - 923001234567 -> +923001234567
 * - +923001234567 -> +923001234567
 * - 003001234567 -> +923001234567
 * - 3001234567 -> +923001234567 (10 digits starting with 3)
 */
export function normalizePhoneNumber(phone: string): PhoneValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { normalized: '', isValid: false, error: 'Phone number is required' }
  }

  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '')

  // Handle empty after cleaning
  if (!cleaned) {
    return { normalized: '', isValid: false, error: 'Phone number is required' }
  }

  // Handle various Pakistan phone number formats
  // Remove leading zeros that aren't part of the area code
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2)
  }

  // If starts with 0 and followed by 3, it's a local mobile format (03XX)
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
  
  if (!pakistanMobileRegex.test(cleaned)) {
    return { 
      normalized: cleaned, 
      isValid: false, 
      error: 'Invalid phone format. Must be a valid Pakistan mobile number (e.g., 03001234567)' 
    }
  }

  return { normalized: cleaned, isValid: true }
}

/**
 * Validate and normalize CNIC (Computerized National Identity Card)
 * Format: 13 digits, optionally formatted as XXXXX-XXXXXXX-X
 */
export function validateCNIC(cnic: string): CnicValidationResult {
  if (!cnic) {
    return { normalized: '', isValid: true } // CNIC is optional
  }

  // Remove dashes and spaces
  const cleaned = cnic.replace(/[-\s]/g, '')

  // Must be exactly 13 digits
  if (!/^\d{13}$/.test(cleaned)) {
    return { 
      normalized: cleaned, 
      isValid: false, 
      error: 'CNIC must be exactly 13 digits' 
    }
  }

  return { normalized: cleaned, isValid: true }
}

/**
 * Format CNIC for display (XXXXX-XXXXXXX-X)
 */
export function formatCNIC(cnic: string): string {
  const cleaned = cnic.replace(/[-\s]/g, '')
  if (cleaned.length !== 13) return cnic
  
  return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 12)}-${cleaned.slice(12)}`
}

/**
 * Validate and normalize resident name
 * - Trims whitespace
 * - Removes extra spaces between words
 * - Minimum 2 characters
 */
export function validateName(name: string): NameValidationResult {
  if (!name || typeof name !== 'string') {
    return { normalized: '', isValid: false, error: 'Name is required' }
  }

  // Trim and remove extra spaces
  const normalized = name.trim().replace(/\s+/g, ' ')

  if (normalized.length === 0) {
    return { normalized: '', isValid: false, error: 'Name is required' }
  }

  if (normalized.length < 2) {
    return { normalized, isValid: false, error: 'Name must be at least 2 characters' }
  }

  return { normalized, isValid: true }
}

/**
 * Validate and normalize apartment number
 * - Trims whitespace
 * - Converts to uppercase
 */
export function validateApartment(apartment: string): ApartmentValidationResult {
  if (!apartment || typeof apartment !== 'string') {
    return { normalized: '', isValid: false, error: 'Apartment number is required' }
  }

  const normalized = apartment.trim().toUpperCase()

  if (normalized.length === 0) {
    return { normalized: '', isValid: false, error: 'Apartment number is required' }
  }

  return { normalized, isValid: true }
}

/**
 * Validate resident type
 */
export function validateResidentType(type: string | undefined): 'owner' | 'tenant' {
  if (type === 'owner') return 'owner'
  return 'tenant' // Default
}

/**
 * Complete resident validation result
 */
export interface ResidentValidationResult {
  isValid: boolean
  errors: string[]
  normalizedData: {
    name: string
    phone_number: string
    apartment_number: string
    cnic: string
    resident_type: 'owner' | 'tenant'
  }
}

/**
 * Validate all resident fields at once
 */
export function validateResident(data: {
  name: string
  phone_number: string
  apartment_number: string
  cnic?: string
  resident_type?: string
}): ResidentValidationResult {
  const errors: string[] = []

  const nameResult = validateName(data.name)
  if (!nameResult.isValid && nameResult.error) {
    errors.push(nameResult.error)
  }

  const phoneResult = normalizePhoneNumber(data.phone_number)
  if (!phoneResult.isValid && phoneResult.error) {
    errors.push(phoneResult.error)
  }

  const apartmentResult = validateApartment(data.apartment_number)
  if (!apartmentResult.isValid && apartmentResult.error) {
    errors.push(apartmentResult.error)
  }

  const cnicResult = validateCNIC(data.cnic || '')
  if (!cnicResult.isValid && cnicResult.error) {
    errors.push(cnicResult.error)
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalizedData: {
      name: nameResult.normalized,
      phone_number: phoneResult.normalized,
      apartment_number: apartmentResult.normalized,
      cnic: cnicResult.normalized,
      resident_type: validateResidentType(data.resident_type),
    },
  }
}

/**
 * Check if a phone number already exists in the database
 */
export async function checkPhoneExists(phone: string): Promise<boolean> {
  const { normalized } = normalizePhoneNumber(phone)
  if (!normalized) return false

  try {
    const response = await fetch('/api/residents/check-duplicates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumbers: [normalized] }),
    })

    if (response.ok) {
      const { existingPhones } = await response.json()
      return existingPhones.includes(normalized)
    }
  } catch (error) {
    console.error('Error checking phone duplicates:', error)
  }

  return false
}

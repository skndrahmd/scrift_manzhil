import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { validateName, validateApartment, validateCNIC } from '@/lib/validation/resident'

export interface ParsedResident {
  rowNumber: number
  name: string
  phone_number: string
  apartment_number: string
  cnic?: string
  building_block?: string
  maintenance_charges?: number
  resident_type?: 'tenant' | 'owner'
}

export interface ParseResult {
  data: ParsedResident[]
  errors: { row: number; message: string }[]
}

// Column header mapping - maps various common header names to our standard fields
const COLUMN_MAPPINGS: Record<string, string[]> = {
  name: ['name', 'full_name', 'resident_name', 'owner_name', 'fullname', 'resident name', 'owner name'],
  phone_number: ['phone_number', 'phone', 'mobile', 'contact', 'whatsapp', 'cell', 'mobile_number', 'phone number', 'mobile number', 'contact number'],
  apartment_number: ['apartment_number', 'apartment', 'apt', 'unit', 'flat', 'flat_no', 'apt_number', 'unit_number', 'apartment number', 'flat number', 'flat no'],
  cnic: ['cnic', 'national_id', 'nic', 'id_number', 'national id', 'id number'],
  building_block: ['building_block', 'block', 'building', 'tower', 'wing', 'building block'],
  maintenance_charges: ['maintenance_charges', 'maintenance', 'charges', 'fee', 'monthly_charges', 'maintenance charges', 'monthly charges'],
  resident_type: ['resident_type', 'type', 'resident type', 'owner_tenant', 'ownership', 'owner', 'tenant'],
}

// Normalize a header name by converting to lowercase and trimming
function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/[_-]/g, ' ')
}

// Find the standard field name for a given header
function mapHeader(header: string): string | null {
  const normalized = normalizeHeader(header)

  for (const [standardField, aliases] of Object.entries(COLUMN_MAPPINGS)) {
    if (aliases.some(alias => normalizeHeader(alias) === normalized)) {
      return standardField
    }
  }

  return null
}

// Parse CSV file
export async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { data, headerMapping } = mapHeaders(results.data as Record<string, string>[])
        const parsedData = transformData(data, headerMapping)
        resolve(parsedData)
      },
      error: (error) => {
        resolve({
          data: [],
          errors: [{ row: 0, message: `CSV parsing error: ${error.message}` }]
        })
      }
    })
  })
}

// Parse Excel file
export async function parseExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        // Get the first sheet
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Convert to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
          defval: '',
          raw: false, // Convert all values to strings
        })

        const { data: mappedData, headerMapping } = mapHeaders(jsonData)
        const parsedData = transformData(mappedData, headerMapping)
        resolve(parsedData)
      } catch (error) {
        resolve({
          data: [],
          errors: [{ row: 0, message: `Excel parsing error: ${error instanceof Error ? error.message : 'Unknown error'}` }]
        })
      }
    }

    reader.onerror = () => {
      resolve({
        data: [],
        errors: [{ row: 0, message: 'Failed to read file' }]
      })
    }

    reader.readAsArrayBuffer(file)
  })
}

// Map headers from the raw data to our standard field names
function mapHeaders(rawData: Record<string, string>[]): {
  data: Record<string, string>[]
  headerMapping: Record<string, string>
} {
  if (rawData.length === 0) {
    return { data: [], headerMapping: {} }
  }

  // Get original headers from first row
  const originalHeaders = Object.keys(rawData[0])
  const headerMapping: Record<string, string> = {}

  // Create mapping from original headers to standard fields
  for (const header of originalHeaders) {
    const standardField = mapHeader(header)
    if (standardField) {
      headerMapping[header] = standardField
    }
  }

  return { data: rawData, headerMapping }
}

// Transform raw data to ParsedResident objects
function transformData(
  rawData: Record<string, string>[],
  headerMapping: Record<string, string>
): ParseResult {
  const data: ParsedResident[] = []
  const errors: { row: number; message: string }[] = []

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i]
    const rowNumber = i + 2 // +2 because row 1 is headers, and we're 1-indexed

    // Map the row data to standard fields
    const mappedRow: Record<string, string> = {}
    for (const [originalHeader, value] of Object.entries(row)) {
      const standardField = headerMapping[originalHeader]
      if (standardField) {
        mappedRow[standardField] = value?.toString().trim() || ''
      }
    }

    // Skip completely empty rows
    if (Object.values(mappedRow).every(v => !v)) {
      continue
    }

    // Parse maintenance charges as number
    let maintenanceCharges: number | undefined
    if (mappedRow.maintenance_charges) {
      const parsed = parseFloat(mappedRow.maintenance_charges.replace(/[^\d.]/g, ''))
      if (!isNaN(parsed)) {
        maintenanceCharges = parsed
      }
    }

    // Parse resident_type (normalize to 'tenant' or 'owner')
    let residentType: 'tenant' | 'owner' | undefined
    if (mappedRow.resident_type) {
      const normalized = mappedRow.resident_type.toLowerCase().trim()
      if (normalized === 'owner') {
        residentType = 'owner'
      } else if (normalized === 'tenant') {
        residentType = 'tenant'
      }
      // Invalid values are ignored (will default to 'tenant' later)
    }

    // Normalize name (trim and remove extra spaces)
    const normalizedName = validateName(mappedRow.name || '').normalized

    // Normalize apartment number (uppercase, trim)
    const normalizedApartment = validateApartment(mappedRow.apartment_number || '').normalized

    // Normalize CNIC (remove dashes/spaces)
    const normalizedCnic = mappedRow.cnic ? validateCNIC(mappedRow.cnic).normalized : undefined

    data.push({
      rowNumber,
      name: normalizedName,
      phone_number: mappedRow.phone_number || '',
      apartment_number: normalizedApartment,
      cnic: normalizedCnic,
      building_block: mappedRow.building_block?.trim() || undefined,
      maintenance_charges: maintenanceCharges,
      resident_type: residentType,
    })
  }

  return { data, errors }
}

// Parse file based on extension
export async function parseFile(file: File): Promise<ParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'csv') {
    return parseCSV(file)
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcel(file)
  } else {
    return {
      data: [],
      errors: [{ row: 0, message: `Unsupported file type: ${extension}. Please upload a CSV or Excel file.` }]
    }
  }
}

// Generate a sample CSV template
export function generateTemplate(): string {
  const headers = ['name', 'phone_number', 'apartment_number', 'cnic', 'building_block', 'maintenance_charges', 'resident_type']
  const sampleRows = [
    ['Ahmed Khan', '03001234567', 'A-101', '42101-1234567-1', 'Block A', '5000', 'owner'],
    ['Fatima Ali', '+923331234567', 'B-202', '', 'Block B', '7500', 'tenant'],
    ['Muhammad Raza', '923451234567', 'C-303', '42201-7654321-3', '', '5000', 'tenant'],
  ]

  return [headers.join(','), ...sampleRows.map(row => row.join(','))].join('\n')
}

// Download template as CSV file
export function downloadTemplate(): void {
  const template = generateTemplate()
  const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'resident_import_template.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

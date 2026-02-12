import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export interface ParsedUnit {
  rowNumber: number
  apartment_number: string
  floor_number?: string
  unit_type?: string
  maintenance_charges?: number
}

export interface ParseResult {
  data: ParsedUnit[]
  errors: { row: number; message: string }[]
}

// Column header mapping - maps various common header names to our standard fields
const COLUMN_MAPPINGS: Record<string, string[]> = {
  apartment_number: ['apartment_number', 'apartment', 'apt', 'unit', 'flat', 'flat_no', 'unit_number', 'apartment number', 'flat number', 'flat no', 'unit number'],
  floor_number: ['floor_number', 'floor', 'storey', 'level', 'floor number'],
  unit_type: ['unit_type', 'type', 'flat_type', 'apartment_type', 'unit type', 'flat type', 'apartment type'],
  maintenance_charges: ['maintenance_charges', 'maintenance', 'charges', 'fee', 'monthly_charges', 'maintenance charges', 'monthly charges'],
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

        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
          defval: '',
          raw: false,
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

  const originalHeaders = Object.keys(rawData[0])
  const headerMapping: Record<string, string> = {}

  for (const header of originalHeaders) {
    const standardField = mapHeader(header)
    if (standardField) {
      headerMapping[header] = standardField
    }
  }

  return { data: rawData, headerMapping }
}

// Transform raw data to ParsedUnit objects
function transformData(
  rawData: Record<string, string>[],
  headerMapping: Record<string, string>
): ParseResult {
  const data: ParsedUnit[] = []
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

    data.push({
      rowNumber,
      apartment_number: mappedRow.apartment_number || '',
      floor_number: mappedRow.floor_number || undefined,
      unit_type: mappedRow.unit_type || undefined,
      maintenance_charges: maintenanceCharges,
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
  const headers = ['apartment_number', 'floor_number', 'unit_type', 'maintenance_charges']
  const sampleRows = [
    ['A-101', '1', '2BHK', '5000'],
    ['A-102', '1', 'Studio', '4000'],
    ['B-201', '2', '3BHK', '7500'],
  ]

  return [headers.join(','), ...sampleRows.map(row => row.join(','))].join('\n')
}

// Download template as CSV file
export function downloadTemplate(): void {
  const template = generateTemplate()
  const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'unit_import_template.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

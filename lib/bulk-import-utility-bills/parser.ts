import Papa from 'papaparse'

export interface ParsedBill {
  rowNumber: number
  houseNo: string
  phone: string
  imageFilename: string
}

export interface MatchedBill extends ParsedBill {
  file: File
}

export interface UtilityBillParseResult {
  matched: MatchedBill[]
  unmatched: ParsedBill[]
  errors: { row: number; message: string }[]
}

const COLUMN_MAPPINGS: Record<string, string[]> = {
  house_no: ['house_no', 'house no', 'apartment', 'apartment_number', 'apt', 'unit', 'flat', 'flat_no', 'unit_number', 'house number'],
  phone: ['phone_number', 'phone', 'mobile', 'contact', 'whatsapp', 'cell', 'mobile_number', 'phone number', 'mobile number'],
  image_filename: ['image_filename', 'invoice_link', 'invoice link', 'invoice', 'bill', 'image', 'file', 'filename', 'image file'],
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/[_-]/g, ' ')
}

function mapHeader(header: string): string | null {
  const normalized = normalizeHeader(header)
  for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
    if (aliases.some(alias => normalizeHeader(alias) === normalized)) {
      return field
    }
  }
  return null
}

function validatePhone(phone: string): boolean {
  // Accept Pakistani format: +923XXXXXXXXX, 03XXXXXXXXX, 923XXXXXXXXX
  const cleaned = phone.replace(/[\s\-()]/g, '')
  return /^(\+92|92|0)3\d{9}$/.test(cleaned)
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '')
  if (cleaned.startsWith('0')) return '+92' + cleaned.slice(1)
  if (cleaned.startsWith('92')) return '+' + cleaned
  return cleaned
}

/**
 * Parse CSV file and cross-reference rows against uploaded image files.
 * Returns matched rows (have a corresponding File) and unmatched rows.
 */
export function parseUtilityBillCSV(
  file: File,
  imageFiles: File[]
): Promise<UtilityBillParseResult> {
  return new Promise((resolve) => {
    // Build a lookup map: filename → File
    const fileMap = new Map<string, File>()
    for (const f of imageFiles) {
      fileMap.set(f.name, f)
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawRows = results.data as Record<string, string>[]

        if (rawRows.length === 0) {
          resolve({ matched: [], unmatched: [], errors: [{ row: 0, message: 'CSV is empty' }] })
          return
        }

        // Build header mapping
        const originalHeaders = Object.keys(rawRows[0])
        const headerMap: Record<string, string> = {}
        for (const h of originalHeaders) {
          const mapped = mapHeader(h)
          if (mapped) headerMap[h] = mapped
        }

        const matched: MatchedBill[] = []
        const unmatched: ParsedBill[] = []
        const errors: { row: number; message: string }[] = []

        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i]
          const rowNumber = i + 2 // row 1 = headers

          // Map to standard fields
          const mapped: Record<string, string> = {}
          for (const [origHeader, value] of Object.entries(row)) {
            const field = headerMap[origHeader]
            if (field) mapped[field] = value?.toString().trim() || ''
          }

          // Skip blank rows
          if (!mapped.house_no && !mapped.phone && !mapped.image_filename) continue

          // Validate required fields
          if (!mapped.house_no) {
            errors.push({ row: rowNumber, message: 'Missing house number' })
            continue
          }
          if (!mapped.phone) {
            errors.push({ row: rowNumber, message: `Row ${rowNumber}: missing phone number` })
            continue
          }
          if (!mapped.image_filename) {
            errors.push({ row: rowNumber, message: `Row ${rowNumber}: missing image filename` })
            continue
          }
          if (!validatePhone(mapped.phone)) {
            errors.push({ row: rowNumber, message: `Row ${rowNumber}: invalid phone format (${mapped.phone})` })
            continue
          }

          const bill: ParsedBill = {
            rowNumber,
            houseNo: mapped.house_no.toUpperCase(),
            phone: normalizePhone(mapped.phone),
            imageFilename: mapped.image_filename,
          }

          const matchedFile = fileMap.get(mapped.image_filename)
          if (matchedFile) {
            matched.push({ ...bill, file: matchedFile })
          } else {
            unmatched.push(bill)
          }
        }

        // Check required columns present
        const hasHouse = Object.values(headerMap).includes('house_no')
        const hasPhone = Object.values(headerMap).includes('phone')
        const hasImage = Object.values(headerMap).includes('image_filename')

        if (!hasHouse || !hasPhone || !hasImage) {
          const missing = [
            !hasHouse && 'house_no',
            !hasPhone && 'phone_number',
            !hasImage && 'image_filename/invoice_link',
          ].filter(Boolean)
          resolve({
            matched: [],
            unmatched: [],
            errors: [{ row: 0, message: `Missing required columns: ${missing.join(', ')}` }],
          })
          return
        }

        resolve({ matched, unmatched, errors })
      },
      error: (error) => {
        resolve({
          matched: [],
          unmatched: [],
          errors: [{ row: 0, message: `CSV parse error: ${error.message}` }],
        })
      },
    })
  })
}

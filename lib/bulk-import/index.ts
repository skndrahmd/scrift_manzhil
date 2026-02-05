export { parseFile, parseCSV, parseExcel, generateTemplate, downloadTemplate } from './parser'
export type { ParsedResident, ParseResult } from './parser'

export {
  validateResidents,
  validateResident,
  normalizePhoneNumber,
  validateCNIC,
  generateErrorReport,
  downloadErrorReport,
} from './validation'
export type { ValidationResult, ValidationStatus, ValidationSummary } from './validation'

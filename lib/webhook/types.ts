/**
 * Webhook Types
 * Type definitions for the WhatsApp webhook conversation system
 */

/**
 * Flow types for different conversation paths
 */
export type FlowType =
  | "booking"
  | "complaint"
  | "cancel"
  | "status"
  | "staff"
  | "feedback"
  | "hall"

/**
 * Complaint data structure during conversation
 */
export interface ComplaintData {
  category?: string
  subcategory?: string
  description?: string
  tower?: string
}

/**
 * Booking data structure during conversation
 */
export interface BookingData {
  date?: string
  slotIndex?: number
  startTime?: string
  endTime?: string
}

/**
 * Staff data structure during conversation
 */
export interface StaffData {
  name?: string
  phone?: string
  cnic?: string
  role?: string
}

/**
 * User state in the conversation flow
 */
export interface UserState {
  step: string
  type?: FlowType
  date?: string
  slots?: TimeSlot[]
  complaint?: ComplaintData
  cancelItems?: any[]
  statusItems?: any[]
  staff?: StaffData
  staffList?: any[]
  booking?: any
  bookingList?: any[]
}

/**
 * Time slot for booking
 */
export interface TimeSlot {
  index: number
  startTime: string
  endTime: string
  display: string
  isBooked: boolean
}

/**
 * Profile from database
 */
export interface Profile {
  id: string
  phone_number: string
  name: string
  apartment_number: string
  is_active: boolean
  maintenance_paid: boolean
  maintenance_charges: number
  last_payment_date: string | null
  cnic: string | null
  building_block: string | null
  created_at: string
}

/**
 * Booking settings from database
 */
export interface BookingSettings {
  start_time: string
  end_time: string
  slot_duration_minutes: number
  working_days: number[]
  booking_charges: number
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  normalized?: string
  error?: string
}

/**
 * Handler response - either a string message or void (for async sends)
 */
export type HandlerResponse = string | Promise<string>

/**
 * Flow handler function signature
 */
export type FlowHandler = (
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState
) => HandlerResponse

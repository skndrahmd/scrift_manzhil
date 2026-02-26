/**
 * @module supabase/types
 * TypeScript type definitions for all database tables including units, profiles,
 * bookings, complaints, maintenance, accounting, parcels, visitors, and admin RBAC.
 */

export type Unit = {
  id: string
  apartment_number: string
  floor_number: string | null
  unit_type: string | null
  maintenance_charges: number
  maintenance_paid: boolean
  last_payment_date: string | null
  is_occupied: boolean
  created_at: string
  updated_at: string
  profiles?: Profile[]
}

export type Profile = {
  id: string
  phone_number: string
  name: string
  cnic: string | null
  apartment_number: string
  building_block?: string | null
  unit_id: string | null
  is_active: boolean
  is_primary_resident: boolean
  resident_type?: 'tenant' | 'owner'
  maintenance_charges: number
  maintenance_paid: boolean
  last_payment_date: string | null
  created_at: string
  updated_at: string
}

export type BookingSettings = {
  id: string
  start_time: string
  end_time: string
  slot_duration_minutes: number
  working_days: number[]
  booking_charges: number
  created_at: string
  updated_at: string
}

export type Booking = {
  id: string
  profile_id: string
  booking_date: string
  start_time: string
  end_time: string
  status: "confirmed" | "cancelled" | "payment_pending" | string
  booking_charges: number
  payment_status: "pending" | "paid" | string
  reminder_last_sent_at?: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
}

export type Complaint = {
  id: string
  complaint_id: string
  profile_id: string
  category: "apartment" | "building"
  subcategory: string
  description: string | null
  status: "pending" | "in-progress" | "completed" | "cancelled"
  group_key: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
}

export type GroupedComplaint = {
  group_key: string
  category: string
  subcategory: string
  description: string | null
  status: string
  count: number
  latest_date: string
  complaints: Complaint[]
}

export type TimeSlot = {
  start_time: string
  end_time: string
  is_available: boolean
  display_text: string
}

export type MaintenancePayment = {
  id: string
  profile_id: string
  unit_id: string | null
  year: number
  month: number
  amount: number
  status: "paid" | "unpaid" | "overdue"
  paid_date: string | null
  payment_reference?: string | null
  reminder_last_sent_at: string | null
  confirmation_sent: boolean
  confirmation_sent_at: string | null
  created_at: string
  updated_at: string
}

export type Feedback = {
  id: string
  profile_id: string
  message: string
  status: "new" | "reviewed" | "resolved"
  admin_notes?: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
}

export type Staff = {
  id: string
  unit_id: string
  name: string
  cnic: string
  phone_number: string
  role: string
  created_at: string
  updated_at: string
  units?: Unit
}

export type VisitorPass = {
  id: string
  resident_id: string
  visitor_name: string | null
  visitor_cnic: string | null
  visitor_phone: string | null
  cnic_image_url: string | null
  car_number: string | null
  visit_date: string
  status: "pending" | "arrived" | "cancelled"
  notified_at: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
}

export type DailyReport = {
  id: string
  report_date: string
  report_type: "24_hour" | "open_complaints"
  complaints_count: number
  bookings_count: number
  open_complaints_count: number
  pending_count: number
  in_progress_count: number
  pdf_data: string
  created_at: string
  updated_at: string
}

// Accounting Module Types

export type Transaction = {
  id: string
  transaction_type: 'booking_income' | 'maintenance_income' | 'expense' | 'refund' | 'other_income'
  reference_id: string | null
  profile_id: string | null
  amount: number
  description: string | null
  transaction_date: string
  payment_method: 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'other' | null
  receipt_number: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
}

export type ExpenseCategory = {
  id: string
  name: string
  description: string | null
  icon: string
  color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Expense = {
  id: string
  category_id: string | null
  amount: number
  description: string
  expense_date: string
  vendor_name: string | null
  receipt_url: string | null
  payment_method: 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'other' | null
  is_recurring: boolean
  recurrence_interval: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | null
  next_due_date: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  expense_categories?: ExpenseCategory
}

export type FinancialSummary = {
  totalRevenue: number
  bookingRevenue: number
  maintenanceRevenue: number
  totalExpenses: number
  netIncome: number
  outstandingDues: number
  collectionRate: number
  monthlyData: {
    month: string
    bookingIncome: number
    maintenanceIncome: number
    expenses: number
  }[]
}

// Parcel Tracking Types

export type Parcel = {
  id: string
  resident_id: string
  description: string | null
  sender_name: string | null
  courier_name: string | null
  image_url: string
  status: "pending" | "collected" | "returned"
  notified_at: string | null
  collected_at: string | null
  created_at: string
  updated_at: string
  collector_name: string | null
  collector_phone: string | null
  collector_cnic: string | null
  profiles?: Profile
}

// Payment Method Types

export type PaymentMethodType = 'jazzcash' | 'easypaisa' | 'bank_transfer'

export type PaymentMethod = {
  id: string
  type: PaymentMethodType
  account_title: string
  account_number: string
  bank_name: string | null
  is_enabled: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// Payment Verification Types

export type PaymentVerificationStatus = 'pending' | 'approved' | 'rejected'

export type PaymentVerification = {
  id: string
  payment_type: 'maintenance' | 'booking'
  maintenance_payment_id: string | null
  booking_id: string | null
  unit_id: string
  resident_id: string
  payment_method_id: string | null
  amount: number
  receipt_image_url: string
  status: PaymentVerificationStatus
  rejection_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  profiles?: Profile
  units?: Unit
}

// Admin RBAC Types

export type AdminUser = {
  id: string
  auth_user_id: string
  email: string
  name: string
  phone_number: string | null
  role: "super_admin" | "staff"
  is_active: boolean
  receive_complaint_notifications: boolean
  receive_reminder_notifications: boolean
  receive_daily_reports: boolean
  created_at: string
  updated_at: string
}

export type AdminPermission = {
  id: string
  admin_user_id: string
  page_key: string
  can_access: boolean
  created_at: string
}

export type PageKey =
  | "dashboard"
  | "residents"
  | "units"
  | "bookings"
  | "complaints"
  | "visitors"
  | "parcels"
  | "analytics"
  | "feedback"
  | "accounting"
  | "broadcast"
  | "settings"

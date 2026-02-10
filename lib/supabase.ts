import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Service role client for admin operations (bypasses RLS)
// Only create if service key is available (runtime only)
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  : supabase // Fallback to regular client if service key not available

export type Profile = {
  id: string
  phone_number: string
  name: string
  cnic: string | null
  apartment_number: string
  building_block?: string | null
  is_active: boolean
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
  profile_id: string
  name: string
  cnic: string
  phone_number: string
  role: string
  created_at: string
  updated_at: string
  profiles?: Profile
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
  daily_entry_number: number | null
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

// ============================================
// Accounting Module Types
// ============================================

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

// ============================================
// Parcel Tracking Types
// ============================================

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
  profiles?: Profile
}

// ============================================
// Admin RBAC Types
// ============================================

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
  | "bookings"
  | "complaints"
  | "visitors"
  | "parcels"
  | "analytics"
  | "feedback"
  | "accounting"
  | "broadcast"
  | "settings"

export const PAGE_KEYS: { key: PageKey; label: string; route: string }[] = [
  { key: "dashboard", label: "Dashboard", route: "/admin/dashboard" },
  { key: "residents", label: "Residents", route: "/admin" },
  { key: "bookings", label: "Bookings", route: "/admin/bookings" },
  { key: "complaints", label: "Complaints", route: "/admin/complaints" },
  { key: "visitors", label: "Visitors", route: "/admin/visitors" },
  { key: "parcels", label: "Parcels", route: "/admin/parcels" },
  { key: "analytics", label: "Analytics", route: "/admin/analytics" },
  { key: "feedback", label: "Feedback", route: "/admin/feedback" },
  { key: "accounting", label: "Accounting", route: "/admin/accounting" },
  { key: "broadcast", label: "Broadcast", route: "/admin/broadcast" },
  { key: "settings", label: "Settings", route: "/admin/settings" },
]

// ============================================
// Broadcast Rate Limiting Types
// ============================================

export type BroadcastLog = {
  id: string
  sent_at: string
  recipient_count: number
  success_count: number
  failed_count: number
  message_title: string | null
  message_body: string | null
  created_by: string | null
}

// Rate limiting constants
export const BROADCAST_LIMITS = {
  DAILY_MESSAGE_LIMIT: 250,       // Max messages per 24 hours
  MESSAGE_DELAY_MS: 3000,         // 3 seconds between messages
  BATCH_SIZE: 20,                 // Messages per batch
  BATCH_DELAY_MS: 30000,          // 30 seconds between batches
  MIN_BROADCAST_INTERVAL_MS: 0, // Disabled (was 15 minutes between broadcasts)
  SOFT_RECIPIENT_LIMIT: 50,       // Show warning above this
  HARD_RECIPIENT_LIMIT: 100,      // Require confirmation above this
}

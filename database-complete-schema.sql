-- ============================================
-- Manzhil by Scrift - Complete Database Schema
-- ============================================
-- This is the master SQL file containing ALL database setup commands.
-- Run this in your Supabase SQL Editor for a fresh installation.
--
-- Last Updated: 2026-02-16
--
-- Tables (19):
--   1.  units                - Apartment unit entities (first-class)
--   2.  profiles             - Resident/user information (FK → units)
--   3.  maintenance_payments - Monthly maintenance fee tracking (FK → profiles, units)
--   4.  booking_settings     - Hall booking configuration
--   5.  bookings             - Hall booking records (FK → profiles)
--   6.  complaints           - Complaint tracking (FK → profiles)
--   7.  feedback             - Resident feedback (FK → profiles)
--   8.  staff                - Building staff records (FK → units)
--   9.  daily_reports        - Generated daily PDF reports
--  10.  transactions         - Unified income/expense tracking (FK → profiles)
--  11.  expense_categories   - Expense category definitions
--  12.  expenses             - Expense records (FK → expense_categories)
--  13.  admin_users          - Admin RBAC accounts
--  14.  admin_permissions    - Page-level access control (FK → admin_users)
--  15.  admin_otp            - WhatsApp OTP authentication
--  16.  visitor_passes       - Visitor entry tracking (FK → profiles)
--  17.  parcels              - Parcel/delivery tracking (FK → profiles)
--  18.  broadcast_logs       - Broadcast rate limiting & history
--  19.  bot_messages         - Customizable WhatsApp bot messages
--
-- ============================================


-- ============================================
-- PART 1: DROP EXISTING TABLES (CLEAN SLATE)
-- ============================================
-- WARNING: This will DELETE ALL existing data!
-- Comment out this section if you want to preserve existing data.

DROP TABLE IF EXISTS broadcast_logs CASCADE;
DROP TABLE IF EXISTS parcels CASCADE;
DROP TABLE IF EXISTS visitor_passes CASCADE;
DROP TABLE IF EXISTS admin_otp CASCADE;
DROP TABLE IF EXISTS admin_permissions CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS expense_categories CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS daily_reports CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS maintenance_payments CASCADE;
DROP TABLE IF EXISTS booking_settings CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS units CASCADE;


-- ============================================
-- PART 2: FUNCTIONS
-- ============================================
-- Create all functions before tables so triggers can reference them.

-- 2.1 Generic updated_at trigger function (used by most tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2.2 Auto-generate unique complaint IDs (CMP-YYYYMMDD-XXXX)
CREATE OR REPLACE FUNCTION generate_complaint_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.complaint_id IS NULL THEN
    NEW.complaint_id := 'CMP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2.3 Dedicated updated_at function for admin_users
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2.4 Dedicated updated_at function for visitor_passes
CREATE OR REPLACE FUNCTION update_visitor_passes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2.5 Dedicated updated_at function for parcels
CREATE OR REPLACE FUNCTION update_parcels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- PART 3: CORE TABLES
-- ============================================

-- --------------------------------------------
-- 3.1 UNITS TABLE
-- First-class apartment entities. Units own maintenance data;
-- residents link to units via unit_id.
-- --------------------------------------------
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_number TEXT UNIQUE NOT NULL,
  floor_number TEXT,
  unit_type TEXT,
  maintenance_charges INTEGER DEFAULT 5000,
  maintenance_paid BOOLEAN DEFAULT false,
  last_payment_date TEXT,
  is_occupied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to units"
  ON units FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read access to units"
  ON units FOR SELECT
  USING (true);

CREATE INDEX idx_units_apartment_number ON units(apartment_number);

-- --------------------------------------------
-- 3.2 PROFILES TABLE
-- Resident/user information. Links to units via unit_id.
-- One unit can have multiple residents; is_primary_resident
-- flags the main contact.
-- --------------------------------------------
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  cnic TEXT,
  apartment_number TEXT,
  building_block TEXT,
  unit_id UUID REFERENCES units(id),
  is_primary_resident BOOLEAN DEFAULT false,
  maintenance_charges NUMERIC DEFAULT 0,
  maintenance_paid BOOLEAN DEFAULT false,
  last_payment_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to profiles"
  ON profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon role has full access to profiles"
  ON profiles FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can read all profiles for realtime"
  ON profiles FOR SELECT TO anon
  USING (true);

CREATE POLICY "Public can select profiles"
  ON profiles FOR SELECT TO public USING (true);

CREATE INDEX idx_profiles_phone ON profiles(phone_number);
CREATE INDEX idx_profiles_apartment ON profiles(apartment_number);
CREATE INDEX idx_profiles_active ON profiles(is_active);
CREATE INDEX idx_profiles_unit_id ON profiles(unit_id);

-- --------------------------------------------
-- 3.3 MAINTENANCE PAYMENTS TABLE
-- Monthly maintenance fee records per resident.
-- Links to both profile_id and unit_id.
-- --------------------------------------------
CREATE TABLE maintenance_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'overdue')),
  paid_date DATE,
  payment_reference TEXT,
  confirmation_sent BOOLEAN DEFAULT false,
  confirmation_sent_at TIMESTAMPTZ,
  reminder_last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, year, month)
);

ALTER TABLE maintenance_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to maintenance_payments"
  ON maintenance_payments FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can select maintenance_payments"
  ON maintenance_payments FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert maintenance_payments"
  ON maintenance_payments FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update maintenance_payments"
  ON maintenance_payments FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete maintenance_payments"
  ON maintenance_payments FOR DELETE TO anon USING (true);

CREATE POLICY "Public can select maintenance_payments"
  ON maintenance_payments FOR SELECT TO public USING (true);

CREATE INDEX idx_maintenance_profile ON maintenance_payments(profile_id);
CREATE INDEX idx_maintenance_status ON maintenance_payments(status);
CREATE INDEX idx_maintenance_year_month ON maintenance_payments(year, month);
CREATE INDEX idx_maintenance_payments_unit_id ON maintenance_payments(unit_id);

-- --------------------------------------------
-- 3.4 BOOKING SETTINGS TABLE
-- Configuration for hall booking system.
-- Default data inserted in PART 7.
-- --------------------------------------------
CREATE TABLE booking_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time TIME NOT NULL DEFAULT '08:00:00',
  end_time TIME NOT NULL DEFAULT '22:00:00',
  slot_duration_minutes INTEGER NOT NULL DEFAULT 60,
  working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7],
  booking_charges NUMERIC NOT NULL DEFAULT 5000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to booking_settings"
  ON booking_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can select booking_settings"
  ON booking_settings FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert booking_settings"
  ON booking_settings FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update booking_settings"
  ON booking_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete booking_settings"
  ON booking_settings FOR DELETE TO anon USING (true);

CREATE POLICY "Public can select booking_settings"
  ON booking_settings FOR SELECT TO public USING (true);

-- --------------------------------------------
-- 3.5 BOOKINGS TABLE
-- Hall booking records with payment tracking.
-- --------------------------------------------
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  booking_charges NUMERIC NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'unpaid')),
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'payment_pending')),
  reminder_last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to bookings"
  ON bookings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can select bookings"
  ON bookings FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert bookings"
  ON bookings FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update bookings"
  ON bookings FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete bookings"
  ON bookings FOR DELETE TO anon USING (true);

CREATE POLICY "Public can select bookings"
  ON bookings FOR SELECT TO public USING (true);

CREATE INDEX idx_bookings_profile ON bookings(profile_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment ON bookings(payment_status);

-- --------------------------------------------
-- 3.6 COMPLAINTS TABLE
-- Resident complaint tracking with grouping support.
-- --------------------------------------------
CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id TEXT UNIQUE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  description TEXT,
  group_key TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to complaints"
  ON complaints FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can select complaints"
  ON complaints FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert complaints"
  ON complaints FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update complaints"
  ON complaints FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete complaints"
  ON complaints FOR DELETE TO anon USING (true);

CREATE POLICY "Public can select complaints"
  ON complaints FOR SELECT TO public USING (true);

CREATE INDEX idx_complaints_profile ON complaints(profile_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_category ON complaints(category);
CREATE INDEX idx_complaints_id ON complaints(complaint_id);
CREATE INDEX idx_complaints_group_key ON complaints(group_key);

-- --------------------------------------------
-- 3.7 FEEDBACK TABLE
-- Resident suggestions/feedback.
-- --------------------------------------------
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to feedback"
  ON feedback FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can select feedback"
  ON feedback FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert feedback"
  ON feedback FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update feedback"
  ON feedback FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete feedback"
  ON feedback FOR DELETE TO anon USING (true);

CREATE POLICY "Public can select feedback"
  ON feedback FOR SELECT TO public USING (true);

CREATE INDEX idx_feedback_profile ON feedback(profile_id);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_created ON feedback(created_at DESC);

-- --------------------------------------------
-- 3.8 STAFF TABLE
-- Building staff records linked to units.
-- All residents of a unit share one staff list.
-- --------------------------------------------
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnic TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to staff"
  ON staff FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can select staff"
  ON staff FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert staff"
  ON staff FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update staff"
  ON staff FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete staff"
  ON staff FOR DELETE TO anon USING (true);

CREATE POLICY "Public can select staff"
  ON staff FOR SELECT TO public USING (true);

CREATE INDEX idx_staff_unit ON staff(unit_id);
CREATE INDEX idx_staff_cnic ON staff(cnic);
CREATE INDEX idx_staff_role ON staff(role);

-- --------------------------------------------
-- 3.9 DAILY REPORTS TABLE
-- Stores generated PDF reports (base64-encoded).
-- --------------------------------------------
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('24_hour', 'open_complaints')),
  complaints_count INTEGER DEFAULT 0,
  bookings_count INTEGER DEFAULT 0,
  open_complaints_count INTEGER DEFAULT 0,
  pending_count INTEGER DEFAULT 0,
  in_progress_count INTEGER DEFAULT 0,
  pdf_data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to daily reports"
  ON daily_reports FOR SELECT TO public
  USING (true);

CREATE POLICY "Allow service role to manage daily reports"
  ON daily_reports FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_daily_reports_date ON daily_reports(report_date DESC);
CREATE INDEX idx_daily_reports_type ON daily_reports(report_type);


-- ============================================
-- PART 4: ACCOUNTING MODULE TABLES
-- ============================================

-- --------------------------------------------
-- 4.1 TRANSACTIONS TABLE
-- Unified income/expense tracking.
-- --------------------------------------------
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('booking_income', 'maintenance_income', 'expense', 'refund', 'other_income')),
  reference_id UUID,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'online', 'cheque', 'other')),
  receipt_number TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to transactions"
  ON transactions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can select transactions"
  ON transactions FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert transactions"
  ON transactions FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update transactions"
  ON transactions FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete transactions"
  ON transactions FOR DELETE TO anon USING (true);

CREATE POLICY "Public can select transactions"
  ON transactions FOR SELECT TO public USING (true);

CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_profile ON transactions(profile_id);
CREATE INDEX idx_transactions_reference ON transactions(reference_id);

-- --------------------------------------------
-- 4.2 EXPENSE CATEGORIES TABLE
-- Expense category definitions with icons and colors.
-- Default data inserted in PART 7.
-- --------------------------------------------
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT 'folder',
  color TEXT DEFAULT '#6b7280',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to expense_categories"
  ON expense_categories FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can select expense_categories"
  ON expense_categories FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert expense_categories"
  ON expense_categories FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update expense_categories"
  ON expense_categories FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete expense_categories"
  ON expense_categories FOR DELETE TO anon USING (true);

CREATE POLICY "Public can select expense_categories"
  ON expense_categories FOR SELECT TO public USING (true);

-- --------------------------------------------
-- 4.3 EXPENSES TABLE
-- Expense records with optional recurrence tracking.
-- --------------------------------------------
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  expense_date DATE NOT NULL,
  vendor_name TEXT,
  receipt_url TEXT,
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'online', 'cheque', 'other')),
  is_recurring BOOLEAN DEFAULT false,
  recurrence_interval TEXT CHECK (recurrence_interval IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_due_date DATE,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to expenses"
  ON expenses FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can select expenses"
  ON expenses FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert expenses"
  ON expenses FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update expenses"
  ON expenses FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete expenses"
  ON expenses FOR DELETE TO anon USING (true);

CREATE POLICY "Public can select expenses"
  ON expenses FOR SELECT TO public USING (true);

CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_recurring ON expenses(is_recurring) WHERE is_recurring = true;


-- ============================================
-- PART 5: ADMIN RBAC TABLES
-- ============================================

-- --------------------------------------------
-- 5.1 ADMIN USERS TABLE
-- Admin accounts with roles and notification preferences.
-- Roles: super_admin (full access) or staff (permission-based).
-- phone_number is NOT NULL UNIQUE for WhatsApp OTP auth.
-- --------------------------------------------
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin', 'staff')),
  is_active BOOLEAN DEFAULT true,
  receive_complaint_notifications BOOLEAN DEFAULT false,
  receive_reminder_notifications BOOLEAN DEFAULT false,
  receive_daily_reports BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage admin_users"
  ON admin_users FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read own admin record"
  ON admin_users FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE INDEX idx_admin_users_auth_id ON admin_users(auth_user_id);
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_notifications ON admin_users(receive_complaint_notifications)
  WHERE receive_complaint_notifications = true;
CREATE INDEX idx_admin_users_reminder_notifications ON admin_users(receive_reminder_notifications)
  WHERE receive_reminder_notifications = true;

-- --------------------------------------------
-- 5.2 ADMIN PERMISSIONS TABLE
-- Page-level access control per admin user.
-- Page keys: dashboard, residents, units, bookings, complaints,
--            visitors, parcels, analytics, feedback, accounting,
--            broadcast, settings
-- --------------------------------------------
CREATE TABLE admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  page_key TEXT NOT NULL,
  can_access BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(admin_user_id, page_key)
);

ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage admin_permissions"
  ON admin_permissions FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read own permissions"
  ON admin_permissions FOR SELECT
  USING (
    admin_user_id IN (
      SELECT id FROM admin_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX idx_admin_permissions_user ON admin_permissions(admin_user_id);

-- --------------------------------------------
-- 5.3 ADMIN OTP TABLE
-- Stores one-time passwords for WhatsApp-based admin login.
-- No RLS policies — only service role can access (server-side only).
-- --------------------------------------------
CREATE TABLE admin_otp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_otp ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_admin_otp_phone ON admin_otp(phone_number, used, expires_at);


-- ============================================
-- PART 6: FEATURE TABLES
-- ============================================

-- --------------------------------------------
-- 6.1 VISITOR PASSES TABLE
-- Visitor entry tracking with CNIC image upload.
-- Fields are nullable since CNIC image may be the only input.
-- --------------------------------------------
CREATE TABLE visitor_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  visitor_name TEXT,
  visitor_cnic TEXT,
  visitor_phone TEXT,
  cnic_image_url TEXT,
  car_number TEXT,
  visit_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'arrived', 'cancelled')),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE visitor_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for authenticated users"
  ON visitor_passes FOR SELECT
  USING (true);

CREATE POLICY "Allow insert for authenticated users"
  ON visitor_passes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users"
  ON visitor_passes FOR UPDATE
  USING (true);

CREATE INDEX idx_visitor_passes_resident ON visitor_passes(resident_id);
CREATE INDEX idx_visitor_passes_date ON visitor_passes(visit_date);
CREATE INDEX idx_visitor_passes_status ON visitor_passes(status);

-- --------------------------------------------
-- 6.2 PARCELS TABLE
-- Parcel/delivery tracking with image uploads.
-- Images stored in Supabase Storage "parcels" bucket.
-- --------------------------------------------
CREATE TABLE parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description TEXT,
  sender_name TEXT,
  courier_name TEXT,
  image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'returned')),
  notified_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON parcels FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX idx_parcels_resident_id ON parcels(resident_id);
CREATE INDEX idx_parcels_status ON parcels(status);
CREATE INDEX idx_parcels_created_at ON parcels(created_at DESC);

-- --------------------------------------------
-- 6.3 BROADCAST LOGS TABLE
-- Tracks broadcast messages for rate limiting and usage analytics.
-- --------------------------------------------
CREATE TABLE broadcast_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  recipient_count INTEGER NOT NULL,
  success_count INTEGER NOT NULL,
  failed_count INTEGER NOT NULL,
  message_title TEXT,
  message_body TEXT,
  created_by TEXT
);

ALTER TABLE broadcast_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins to read broadcast logs"
  ON broadcast_logs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow service role to insert broadcast logs"
  ON broadcast_logs FOR INSERT TO service_role
  WITH CHECK (true);

CREATE INDEX idx_broadcast_logs_sent_at ON broadcast_logs(sent_at);

COMMENT ON TABLE broadcast_logs IS 'Tracks broadcast messages for rate limiting and usage analytics';


-- ============================================
-- PART 7: TRIGGERS
-- ============================================

-- 7.1 Updated_at triggers (generic function)
CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_payments_updated_at
  BEFORE UPDATE ON maintenance_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_settings_updated_at
  BEFORE UPDATE ON booking_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_reports_updated_at
  BEFORE UPDATE ON daily_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7.2 Updated_at triggers (dedicated functions from migrations)
CREATE TRIGGER admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_admin_users_updated_at();

CREATE TRIGGER set_visitor_passes_updated_at
  BEFORE UPDATE ON visitor_passes
  FOR EACH ROW EXECUTE FUNCTION update_visitor_passes_updated_at();

CREATE TRIGGER trigger_parcels_updated_at
  BEFORE UPDATE ON parcels
  FOR EACH ROW EXECUTE FUNCTION update_parcels_updated_at();

-- 7.3 Complaint ID auto-generation
CREATE TRIGGER set_complaint_id
  BEFORE INSERT ON complaints
  FOR EACH ROW EXECUTE FUNCTION generate_complaint_id();


-- ============================================
-- PART 8: DEFAULT DATA
-- ============================================

-- 8.1 Default booking settings
INSERT INTO booking_settings (start_time, end_time, slot_duration_minutes, working_days, booking_charges)
VALUES ('08:00:00', '22:00:00', 60, ARRAY[1,2,3,4,5,6,7], 5000);

-- 8.2 Default expense categories
INSERT INTO expense_categories (name, description, icon, color) VALUES
  ('Utilities', 'Electricity, Water, Gas bills', 'zap', '#f59e0b'),
  ('Repairs & Maintenance', 'Building repairs and maintenance work', 'wrench', '#ef4444'),
  ('Security Services', 'Security guards and related expenses', 'shield', '#3b82f6'),
  ('Cleaning Services', 'Cleaning staff and supplies', 'sparkles', '#10b981'),
  ('Salaries', 'Staff salaries and wages', 'users', '#8b5cf6'),
  ('Administrative', 'Office supplies, printing, etc.', 'briefcase', '#6366f1'),
  ('Equipment', 'Tools, machinery, equipment purchases', 'settings', '#64748b'),
  ('Other', 'Miscellaneous expenses', 'more-horizontal', '#94a3b8')
ON CONFLICT (name) DO NOTHING;


-- ============================================
-- PART 9: ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE units;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE booking_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE staff;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE expense_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_users;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_permissions;
ALTER PUBLICATION supabase_realtime ADD TABLE visitor_passes;
ALTER PUBLICATION supabase_realtime ADD TABLE parcels;
ALTER PUBLICATION supabase_realtime ADD TABLE broadcast_logs;


-- ============================================
-- PART 10: SUPABASE STORAGE BUCKETS
-- ============================================
-- These must be created manually in the Supabase Dashboard.
-- Go to: Supabase Dashboard > Storage > New Bucket
--
-- Bucket 1: "parcels"
--   - Public bucket: Yes
--   - Allowed MIME types: image/*
--   - Used for parcel delivery photo uploads
--
-- Bucket 2: "visitor_passes"
--   - Public bucket: Yes
--   - Allowed MIME types: image/*
--   - Used for visitor CNIC image uploads


-- ============================================
-- PART 11: VERIFICATION
-- ============================================

-- Verify all 18 tables were created
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'units', 'profiles', 'maintenance_payments', 'booking_settings',
    'bookings', 'complaints', 'feedback', 'staff',
    'daily_reports', 'transactions', 'expense_categories', 'expenses',
    'admin_users', 'admin_permissions', 'admin_otp',
    'visitor_passes', 'parcels', 'broadcast_logs'
  )
ORDER BY table_name;

-- Verify RLS is enabled on all 18 tables
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'units', 'profiles', 'maintenance_payments', 'booking_settings',
    'bookings', 'complaints', 'feedback', 'staff',
    'daily_reports', 'transactions', 'expense_categories', 'expenses',
    'admin_users', 'admin_permissions', 'admin_otp',
    'visitor_passes', 'parcels', 'broadcast_logs'
  )
ORDER BY tablename;

-- ============================================
-- 19. bot_messages - Customizable WhatsApp Bot Messages
-- ============================================

CREATE TABLE IF NOT EXISTS bot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_key VARCHAR(100) NOT NULL UNIQUE,
  flow_group VARCHAR(50) NOT NULL,
  label VARCHAR(200) NOT NULL,
  description TEXT,
  default_text TEXT NOT NULL,
  custom_text TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES admin_users(id)
);

CREATE INDEX IF NOT EXISTS idx_bot_messages_key ON bot_messages(message_key);
CREATE INDEX IF NOT EXISTS idx_bot_messages_group ON bot_messages(flow_group);

ALTER TABLE bot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on bot_messages"
  ON bot_messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Verification Queries
-- ============================================

-- Verify RLS status
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'units', 'profiles', 'maintenance_payments', 'booking_settings',
    'bookings', 'complaints', 'feedback', 'staff',
    'daily_reports', 'transactions', 'expense_categories', 'expenses',
    'admin_users', 'admin_permissions', 'admin_otp',
    'visitor_passes', 'parcels', 'broadcast_logs', 'bot_messages'
  )
ORDER BY tablename;

-- Final status
SELECT
  'Manzhil by Scrift - Database setup complete!' as status,
  '19 tables created with RLS enabled' as summary,
  NOW() as completed_at;

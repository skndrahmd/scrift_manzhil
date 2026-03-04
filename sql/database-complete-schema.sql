-- ============================================
-- Manzhil by Scrift - Complete Database Setup
-- ============================================
-- This is the SINGLE master SQL file containing ALL database setup:
--   - Schema (30 tables with RLS, indexes, triggers)
--   - Seed data (bot messages, whatsapp templates, label messages, amenities, menu options)
--
-- Run this ONCE in your Supabase SQL Editor for a fresh installation.
-- Everything is idempotent where possible (ON CONFLICT DO NOTHING).
--
-- Last Updated: 2026-03-02
--
-- Tables (30):
--   1.  units                      - Apartment unit entities (first-class)
--   2.  profiles                   - Resident/user information (FK -> units)
--   3.  maintenance_payments       - Monthly maintenance fee tracking (FK -> profiles, units)
--   4.  booking_settings           - Hall booking configuration
--   5.  bookings                   - Hall booking records (FK -> profiles)
--   6.  complaints                 - Complaint tracking (FK -> profiles)
--   7.  feedback                   - Resident feedback (FK -> profiles)
--   8.  staff                      - Building staff records (FK -> units)
--   9.  daily_reports              - Generated daily PDF reports
--  10.  transactions               - Unified income/expense tracking (FK -> profiles)
--  11.  expense_categories         - Expense category definitions
--  12.  expenses                   - Expense records (FK -> expense_categories)
--  13.  admin_users                - Admin RBAC accounts
--  14.  admin_permissions          - Page-level access control (FK -> admin_users)
--  15.  admin_otp                  - WhatsApp OTP authentication
--  16.  visitor_passes             - Visitor entry tracking (FK -> profiles)
--  17.  parcels                    - Parcel/delivery tracking (FK -> profiles)
--  18.  broadcast_logs             - Broadcast rate limiting & history
--  19.  payment_methods            - Payment method configuration
--  20.  payment_verifications      - Payment receipt verification
--  21.  bot_messages               - Customizable WhatsApp bot messages
--  22.  whatsapp_templates         - Twilio WhatsApp content template management
--  23.  enabled_languages          - Enabled languages for multilingual bot support
--  24.  bot_message_translations   - Per-language translations of bot messages
--  25.  bot_sessions               - WhatsApp bot persistent session state
--  26.  amenities                  - Building amenities with operating hours
--  27.  prayer_times               - 5 daily prayer times
--  28.  prayer_times_settings      - Prayer times master enable/disable toggle
--  29.  menu_options               - Dynamic WhatsApp bot main menu configuration
--  30.  menu_option_translations   - Per-language translations for menu option labels
--
-- ============================================


-- ============================================
-- PART 1: DROP EXISTING TABLES (CLEAN SLATE)
-- ============================================
-- WARNING: This will DELETE ALL existing data!
-- Comment out this section if you want to preserve existing data.

DROP TABLE IF EXISTS menu_option_translations CASCADE;
DROP TABLE IF EXISTS menu_options CASCADE;
DROP TABLE IF EXISTS prayer_times_settings CASCADE;
DROP TABLE IF EXISTS prayer_times CASCADE;
DROP TABLE IF EXISTS amenities CASCADE;
DROP TABLE IF EXISTS bot_sessions CASCADE;
DROP TABLE IF EXISTS payment_verifications CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS bot_message_translations CASCADE;
DROP TABLE IF EXISTS enabled_languages CASCADE;
DROP TABLE IF EXISTS whatsapp_templates CASCADE;
DROP TABLE IF EXISTS bot_messages CASCADE;
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

-- 2.5 Dedicated updated_at function for amenities
CREATE OR REPLACE FUNCTION update_amenities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2.6 Dedicated updated_at function for prayer_times
CREATE OR REPLACE FUNCTION update_prayer_times_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2.7 Dedicated updated_at function for prayer_times_settings
CREATE OR REPLACE FUNCTION update_prayer_times_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2.8 Mark menu option translations stale when label changes
CREATE OR REPLACE FUNCTION mark_menu_option_translations_stale()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.label IS DISTINCT FROM NEW.label THEN
    UPDATE menu_option_translations
    SET is_stale = true, updated_at = now()
    WHERE menu_option_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2.9 Dedicated updated_at function for parcels
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
  resident_type VARCHAR(20) DEFAULT 'tenant' CHECK (resident_type IN ('tenant', 'owner')),
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
-- Default data inserted in PART 8.
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
-- Default data inserted in PART 8.
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
  receive_complaint_status_updates BOOLEAN DEFAULT false,
  receive_payment_notifications BOOLEAN DEFAULT false,
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
CREATE INDEX idx_admin_users_status_updates ON admin_users(receive_complaint_status_updates)
  WHERE receive_complaint_status_updates = true;
CREATE INDEX idx_admin_users_payment_notifications ON admin_users(receive_payment_notifications)
  WHERE receive_payment_notifications = true;

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
-- No RLS policies -- only service role can access (server-side only).
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
  collector_name TEXT,
  collector_phone TEXT,
  collector_cnic TEXT,
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

-- --------------------------------------------
-- 6.5 PAYMENT METHODS TABLE
-- Configurable payment methods (JazzCash, EasyPaisa, Bank Transfer)
-- for the payment receipt system.
-- --------------------------------------------
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('jazzcash', 'easypaisa', 'bank_transfer')),
  account_title TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on payment_methods"
  ON payment_methods FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_payment_methods_is_enabled ON payment_methods(is_enabled);
CREATE INDEX idx_payment_methods_sort_order ON payment_methods(sort_order);

COMMENT ON TABLE payment_methods IS 'Configurable payment methods for the payment receipt system';

-- --------------------------------------------
-- 6.7 PAYMENT VERIFICATIONS TABLE
-- Tracks resident-submitted payment receipts for admin verification.
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS payment_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('maintenance', 'booking')),
  maintenance_payment_id UUID REFERENCES maintenance_payments(id),
  booking_id UUID REFERENCES bookings(id),
  unit_id UUID NOT NULL REFERENCES units(id),
  resident_id UUID NOT NULL REFERENCES profiles(id),
  payment_method_id UUID REFERENCES payment_methods(id),
  amount DECIMAL NOT NULL,
  receipt_image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES admin_users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payment_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on payment_verifications"
  ON payment_verifications FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_payment_verifications_status ON payment_verifications(status);
CREATE INDEX idx_payment_verifications_resident ON payment_verifications(resident_id);
CREATE INDEX idx_payment_verifications_unit ON payment_verifications(unit_id);

COMMENT ON TABLE payment_verifications IS 'Resident-submitted payment receipts pending admin verification';


-- ============================================
-- PART 7: BOT & TEMPLATE TABLES
-- ============================================

-- --------------------------------------------
-- 7.1 BOT MESSAGES TABLE
-- Customizable WhatsApp bot messages with default/custom text.
-- Seed data inserted in PART 9.
-- --------------------------------------------
CREATE TABLE bot_messages (
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

ALTER TABLE bot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on bot_messages"
  ON bot_messages FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX idx_bot_messages_key ON bot_messages(message_key);
CREATE INDEX idx_bot_messages_group ON bot_messages(flow_group);

-- --------------------------------------------
-- 7.2 WHATSAPP TEMPLATES TABLE
-- Twilio WhatsApp content template SID management.
-- Seed data inserted in PART 9.
-- --------------------------------------------
CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  template_sid VARCHAR(50),
  env_var_name VARCHAR(100),
  variables JSONB DEFAULT '[]'::jsonb,
  trigger_description TEXT,
  trigger_source TEXT,
  message_body_draft TEXT,
  fallback_message TEXT,
  is_active BOOLEAN DEFAULT true,
  is_draft BOOLEAN DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES admin_users(id)
);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on whatsapp_templates"
  ON whatsapp_templates FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX idx_whatsapp_templates_key ON whatsapp_templates(template_key);
CREATE INDEX idx_whatsapp_templates_category ON whatsapp_templates(category);

-- --------------------------------------------
-- 7.3 ENABLED LANGUAGES TABLE
-- Stores which languages are enabled for multilingual bot support.
-- Max 5 languages can be enabled at once (enforced in application).
-- --------------------------------------------
CREATE TABLE enabled_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code VARCHAR(10) NOT NULL UNIQUE,
  language_name VARCHAR(100) NOT NULL,
  native_name VARCHAR(100),
  is_enabled BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE enabled_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on enabled_languages"
  ON enabled_languages FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX idx_enabled_languages_enabled ON enabled_languages(is_enabled);

-- --------------------------------------------
-- 7.4 BOT MESSAGE TRANSLATIONS TABLE
-- Per-language translations of bot messages.
-- References bot_messages(message_key) and enabled_languages(language_code).
-- Translations are auto-generated via Google Translate on language add,
-- and can be manually edited by admins.
-- --------------------------------------------
CREATE TABLE bot_message_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_key VARCHAR(100) NOT NULL REFERENCES bot_messages(message_key) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL REFERENCES enabled_languages(language_code) ON DELETE CASCADE,
  translated_text TEXT NOT NULL,
  is_auto_translated BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES admin_users(id),
  UNIQUE(message_key, language_code)
);

ALTER TABLE bot_message_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on bot_message_translations"
  ON bot_message_translations FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX idx_translations_language ON bot_message_translations(language_code);
CREATE INDEX idx_translations_key ON bot_message_translations(message_key);

-- --------------------------------------------
-- 2.23 BOT SESSIONS TABLE
-- Persistent session state for WhatsApp bot flows.
-- Stores conversation state across serverless invocations.
-- --------------------------------------------
CREATE TABLE bot_sessions (
  phone_number TEXT PRIMARY KEY,
  state JSONB NOT NULL DEFAULT '{}',
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on bot_sessions"
  ON bot_sessions FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX idx_bot_sessions_last_activity ON bot_sessions(last_activity);

-- --------------------------------------------
-- 7.6 AMENITIES TABLE
-- Building amenities with operating hours and maintenance status.
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_under_maintenance BOOLEAN DEFAULT false,
  open_time TIME,
  close_time TIME,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on amenities"
  ON amenities FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can read active amenities"
  ON amenities FOR SELECT
  USING (is_active = true);

CREATE INDEX IF NOT EXISTS idx_amenities_sort_order ON amenities(sort_order);
CREATE INDEX IF NOT EXISTS idx_amenities_active ON amenities(is_active);

-- --------------------------------------------
-- 7.7 PRAYER TIMES TABLE
-- Stores the 5 daily prayers with their times.
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS prayer_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_name TEXT NOT NULL UNIQUE,
  prayer_time TIME,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prayer_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on prayer_times"
  ON prayer_times FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can read prayer_times"
  ON prayer_times FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_prayer_times_sort_order ON prayer_times(sort_order);

-- --------------------------------------------
-- 7.8 PRAYER TIMES SETTINGS TABLE
-- Master enable/disable toggle (single row).
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS prayer_times_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prayer_times_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on prayer_times_settings"
  ON prayer_times_settings FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can read prayer_times_settings"
  ON prayer_times_settings FOR SELECT
  USING (true);

-- --------------------------------------------
-- 7.9 MENU OPTIONS TABLE
-- Dynamic WhatsApp bot main menu configuration.
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS menu_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(200) NOT NULL,
  emoji VARCHAR(10) NOT NULL DEFAULT '📋',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  handler_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE menu_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on menu_options"
  ON menu_options FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_menu_options_sort ON menu_options(sort_order);
CREATE INDEX IF NOT EXISTS idx_menu_options_enabled ON menu_options(is_enabled);

-- --------------------------------------------
-- 7.10 MENU OPTION TRANSLATIONS TABLE
-- Per-language translations for menu option labels.
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS menu_option_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_option_id UUID NOT NULL REFERENCES menu_options(id) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL REFERENCES enabled_languages(language_code) ON DELETE CASCADE,
  translated_label VARCHAR(200) NOT NULL,
  is_stale BOOLEAN DEFAULT false,
  is_auto_translated BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(menu_option_id, language_code)
);

ALTER TABLE menu_option_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on menu_option_translations"
  ON menu_option_translations FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_menu_opt_trans_lang ON menu_option_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_menu_opt_trans_option ON menu_option_translations(menu_option_id);
CREATE INDEX IF NOT EXISTS idx_menu_opt_trans_stale ON menu_option_translations(is_stale);


-- ============================================
-- PART 8: TRIGGERS
-- ============================================

-- 8.1 Updated_at triggers (generic function)
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

CREATE TRIGGER update_enabled_languages_updated_at
  BEFORE UPDATE ON enabled_languages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_message_translations_updated_at
  BEFORE UPDATE ON bot_message_translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8.2 Updated_at triggers (dedicated functions from migrations)
CREATE TRIGGER admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_admin_users_updated_at();

CREATE TRIGGER set_visitor_passes_updated_at
  BEFORE UPDATE ON visitor_passes
  FOR EACH ROW EXECUTE FUNCTION update_visitor_passes_updated_at();

CREATE TRIGGER trigger_parcels_updated_at
  BEFORE UPDATE ON parcels
  FOR EACH ROW EXECUTE FUNCTION update_parcels_updated_at();

-- 8.3 Updated_at triggers for amenities, prayer times, menu options
CREATE TRIGGER update_amenities_updated_at
  BEFORE UPDATE ON amenities
  FOR EACH ROW
  EXECUTE FUNCTION update_amenities_updated_at();

CREATE TRIGGER update_prayer_times_updated_at
  BEFORE UPDATE ON prayer_times
  FOR EACH ROW
  EXECUTE FUNCTION update_prayer_times_updated_at();

CREATE TRIGGER update_prayer_times_settings_updated_at
  BEFORE UPDATE ON prayer_times_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_prayer_times_settings_updated_at();

CREATE TRIGGER update_menu_options_updated_at
  BEFORE UPDATE ON menu_options
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_opt_trans_updated_at
  BEFORE UPDATE ON menu_option_translations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8.4 Mark menu option translations stale when label changes
CREATE TRIGGER trigger_mark_translations_stale
  AFTER UPDATE OF label ON menu_options
  FOR EACH ROW
  EXECUTE FUNCTION mark_menu_option_translations_stale();

-- 8.5 Complaint ID auto-generation
CREATE TRIGGER set_complaint_id
  BEFORE INSERT ON complaints
  FOR EACH ROW EXECUTE FUNCTION generate_complaint_id();


-- ============================================
-- PART 9: SEED DATA
-- ============================================

-- --------------------------------------------
-- 9.1 Default booking settings
-- --------------------------------------------
INSERT INTO booking_settings (start_time, end_time, slot_duration_minutes, working_days, booking_charges)
VALUES ('08:00:00', '22:00:00', 60, ARRAY[1,2,3,4,5,6,7], 5000);

-- --------------------------------------------
-- 9.2 Default expense categories
-- --------------------------------------------
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

-- --------------------------------------------
-- 9.3 Bot Messages Seed Data (~115 messages)
-- Populates bot_messages table with all default messages.
-- Idempotent: uses ON CONFLICT DO NOTHING.
-- --------------------------------------------

-- === Main Menu / General ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('menu.main_menu', 'main_menu', 'Main Menu Welcome', 'The greeting shown when the user opens the main menu', E'👋 Hello {name}!\n\nWelcome to *Manzhil*\n\n{options}\n\nReply 1-{max_option}', '["name", "options", "max_option"]'::jsonb, 1),
('menu.profile_info', 'main_menu', 'Profile Info', 'Displays the user''s profile details', E'👤 *Your Profile*\n\n📋 *Details*\n• Name: {name}\n• Apartment: {apartment_number}\n• Phone: {phone_number}\n• Building: {building_block}\n\n💰 *Maintenance*\n• Status: {payment_status}\n• Monthly: {maintenance_charges}\n• Last Payment: {last_payment}\n\nReply *0* for menu', '["name", "apartment_number", "phone_number", "building_block", "payment_status", "maintenance_charges", "last_payment"]'::jsonb, 2),
('menu.maintenance_status', 'main_menu', 'Maintenance Status', 'Shows maintenance payment status', E'💰 *Maintenance Status*\n\n• Apartment: {apartment_number}\n• Monthly: {maintenance_charges}\n• Status: {payment_status}\n• Last Payment: {last_payment}', '["apartment_number", "maintenance_charges", "payment_status", "last_payment"]'::jsonb, 3),
('menu.maintenance_payment_due', 'main_menu', 'Maintenance Payment Due', 'Warning shown when payment is overdue', E'⚠️ *Payment Due*\nPlease pay soon to avoid service interruptions.', '[]'::jsonb, 4),
('menu.emergency_contacts', 'main_menu', 'Emergency Contacts', 'Displays emergency contact numbers', E'🆘 *Emergency Contacts*\n\n{contacts}\n\nReply *0* for menu', '["contacts"]'::jsonb, 5),
('menu.invalid_selection', 'main_menu', 'Invalid Menu Selection', 'Shown when user enters invalid main menu option', E'❓ *Invalid Selection*\n\nPlease reply 1-{max_option}.\n\n{menu}', '["menu", "max_option"]'::jsonb, 6),
('menu.welcome_unregistered', 'main_menu', 'Unregistered User', 'Shown to unregistered phone numbers', E'👋 Hello! This is Manzhil.\n\n❌ This number is not registered. Please contact administration to register.\n\n📞 Contact Admin', '[]'::jsonb, 7),
('menu.account_inactive', 'main_menu', 'Account Inactive', 'Shown to deactivated accounts', E'⚠️ *Account Inactive*\n\nPlease contact administration if this is an error.\n\n📞 Contact Admin', '[]'::jsonb, 8)
ON CONFLICT (message_key) DO NOTHING;

-- === Complaint Flow ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('complaint.category_menu', 'complaint', 'Category Menu', 'Complaint category selection (apartment vs building)', E'📝 *Register Complaint*\n\n1. {apartment_emoji} {apartment_label}\n2. {building_emoji} {building_label}\n\nReply *1* or *2*, or *0* for menu', '["apartment_emoji", "apartment_label", "building_emoji", "building_label"]'::jsonb, 1),
('complaint.apartment_subcategory', 'complaint', 'Apartment Subcategories', 'Apartment complaint subcategory selection', E'🏠 *Apartment Complaint*\n\n{subcategories}\n\nReply 1-{max}, or *B* to go back', '["subcategories", "max"]'::jsonb, 2),
('complaint.building_subcategory', 'complaint', 'Building Subcategories', 'Building complaint subcategory selection', E'🏢 *Building Complaint*\n\n{subcategories}\n\nReply 1-{max}, or *B* to go back', '["subcategories", "max"]'::jsonb, 3),
('complaint.description_prompt', 'complaint', 'Description Prompt', 'Asks user to describe the issue', E'📝 *Add Description*\n\nPlease describe the issue briefly.\n\nReply *B* to go back', '[]'::jsonb, 4),
('complaint.invalid_category', 'complaint', 'Invalid Category', 'Invalid complaint category selection', E'❓ *Invalid Selection*\n\nReply *1* for Apartment or *2* for Building\n\n*B* to go back, *0* for menu', '[]'::jsonb, 5),
('complaint.invalid_subcategory', 'complaint', 'Invalid Subcategory', 'Invalid subcategory selection', E'❓ *Invalid Selection*\n\nPlease choose {range}.\n\nReply *B* to go back', '["range"]'::jsonb, 6),
('complaint.registered', 'complaint', 'Complaint Registered', 'Confirmation after successful complaint registration', E'✅ *Complaint Registered*\n\n📋 ID: {complaint_id}\n🔧 Type: {subcategory}\n📝 {description}\n📅 Registered: {date_time}\n\nYour complaint has been forwarded to maintenance. We''ll notify you of updates.\n\nReply *0* for menu', '["complaint_id", "subcategory", "description", "date_time"]'::jsonb, 7),
('complaint.creation_error', 'complaint', 'Creation Error', 'Shown when complaint cannot be created', E'❌ *Unable to Register Complaint*\n\nWe couldn''t register your complaint. Please try again.\n\nReply *0* for menu', '[]'::jsonb, 8),
('complaint.flow_error', 'complaint', 'Flow Error', 'Generic complaint flow error', E'❌ *Something Went Wrong*\n\nWe couldn''t process your request. Please try again.\n\nReply *0* for menu', '[]'::jsonb, 9),
('complaint.notification_fallback', 'complaint', 'Staff Notification Fallback', 'Plain text notification sent to staff about new complaints', E'🆕 *New Complaint*\n\n📋 ID: {complaint_id}\n👤 {name} ({apartment_number})\n🔧 {category} - {subcategory}\n📝 {description}\n📅 {date} at {time}\n\n🔗 Admin: {admin_url}\n\n— Manzhil', '["complaint_id", "name", "apartment_number", "category", "subcategory", "description", "date", "time", "admin_url"]'::jsonb, 10)
ON CONFLICT (message_key) DO NOTHING;

-- === Booking Flow ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('booking.date_prompt', 'booking', 'Date Prompt', 'Asks user to enter booking date', E'📅 *Community Hall Booking*\n\nEnter your booking date.\n\n*Formats:*\n• DD-MM-YYYY (e.g., 25-12-2025)\n• "today", "tomorrow", "Dec 25"\n• Just the day (e.g., "15")\n\n*B* to go back, *0* for menu', '[]'::jsonb, 1),
('booking.invalid_date', 'booking', 'Invalid Date', 'Shown for invalid date format', E'❓ *Invalid Date*\n\nTry formats like:\n• DD-MM-YYYY (e.g., 25-12-2025)\n• "today", "tomorrow"\n• Just the day (e.g., "15")\n\n*B* to go back, *0* for menu', '[]'::jsonb, 2),
('booking.invalid_date_format', 'booking', 'Invalid Date Format', 'Shown when date cannot be parsed', E'❓ *Invalid Date*\n\nPlease enter in DD-MM-YYYY format.\nExample: 25-12-2025\n\n*B* to go back, *0* for menu', '[]'::jsonb, 3),
('booking.date_past', 'booking', 'Date in Past', 'Shown when date is in the past', E'⚠️ *Invalid Date*\n\nDate is in the past. Please choose a future date.\n\n*B* to go back, *0* for menu', '[]'::jsonb, 4),
('booking.hall_unavailable', 'booking', 'Hall Unavailable', 'Shown when hall is closed on selected day', E'⚠️ *Hall Unavailable*\n\nHall is closed on {day_name}s. Please choose another date.\n\n*B* to go back, *0* for menu', '["day_name"]'::jsonb, 5),
('booking.date_taken', 'booking', 'Date Taken', 'Shown when date is already booked', E'❌ *Date Already Booked*\n\nHall is reserved for {date}. Please choose another date.\n\n*B* to go back, *0* for menu', '["date"]'::jsonb, 6),
('booking.policies', 'booking', 'Terms & Conditions', 'Booking terms and conditions prompt', E'📋 *Terms & Conditions*\n\n📅 Date: {date}\n💰 Charges: {charges}\n\n📄 Policies: {policies_link}\n\nDo you agree to the terms?\n\n1. ✅ Yes, I Agree\n2. ❌ No, I Decline\n\nReply *1* or *2*', '["date", "charges", "policies_link"]'::jsonb, 7),
('booking.date_no_longer_available', 'booking', 'Date No Longer Available', 'Race condition: date was just booked', E'⚠️ *Date No Longer Available*\n\nJust booked by someone else. Please choose another date.\n\nReply *0* for menu', '[]'::jsonb, 8),
('booking.confirmed', 'booking', 'Booking Confirmed', 'Successful booking confirmation', E'✅ *Booking Confirmed*\n\n📅 {date} | ⏰ 9AM – 9PM\n💰 {charges} | ⏳ Payment Pending\n\n📌 Notes:\n• Pay before event date\n• 24hr cancellation notice required\n• Leave hall clean\n\n📄 Invoice: {invoice_url}\n\nReply *0* for menu', '["date", "charges", "invoice_url"]'::jsonb, 9),
('booking.failed', 'booking', 'Booking Failed', 'Shown when booking insert fails', E'❌ *Booking Failed*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 10),
('booking.declined', 'booking', 'Booking Declined', 'Shown when user declines terms', E'❌ *Booking Cancelled*\n\nYou must agree to terms to book the hall. Contact management if you have concerns.\n\nReply *0* for menu', '[]'::jsonb, 11),
('booking.invalid_response', 'booking', 'Invalid Response', 'Invalid yes/no response to terms', E'❓ *Invalid Response*\n\nReply *1* (Yes) or *2* (No)\n\nReply *0* for menu', '[]'::jsonb, 12)
ON CONFLICT (message_key) DO NOTHING;

-- === Hall Flow ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('hall.menu', 'hall', 'Hall Menu', 'Community hall main menu', E'🏛️ *Community Hall*\n\n{options}\n\nReply 1-4 or *0* for menu', '["options"]'::jsonb, 1),
('hall.new_booking_date', 'hall', 'New Booking Date', 'Date prompt for new hall booking', E'📅 *New Hall Booking*\n\nEnter your booking date.\n\n*Formats:*\n• DD-MM-YYYY (e.g., 25-12-2025)\n• "today", "tomorrow", "Dec 25"\n\n*B* to go back, *0* for menu', '[]'::jsonb, 2),
('hall.invalid_date', 'hall', 'Invalid Date', 'Invalid date format in hall booking', E'❓ *Invalid Date*\n\nTry formats like:\n• DD-MM-YYYY (e.g., 25-12-2025)\n• "today", "tomorrow"\n\n*B* to go back, *0* for menu', '[]'::jsonb, 3),
('hall.invalid_date_parse', 'hall', 'Invalid Date Parse', 'Date could not be parsed', E'❓ *Invalid Date*\n\nWe couldn''t understand that. Please try again.\n\nReply *0* for menu', '[]'::jsonb, 4),
('hall.date_past', 'hall', 'Date in Past', 'Hall booking date is in the past', E'⚠️ *Invalid Date*\n\nDate is in the past. Please choose a future date.\n\n*B* to go back, *0* for menu', '[]'::jsonb, 5),
('hall.hall_unavailable', 'hall', 'Hall Unavailable', 'Hall closed on selected day', E'⚠️ *Hall Unavailable*\n\nHall is closed on {day_name}s. Please choose another date.\n\n*B* to go back, *0* for menu', '["day_name"]'::jsonb, 6),
('hall.date_taken', 'hall', 'Date Taken', 'Hall already booked', E'❌ *Date Already Booked*\n\nHall is reserved for {date}. Please choose another date.\n\n*B* to go back, *0* for menu', '["date"]'::jsonb, 7),
('hall.policies', 'hall', 'Terms & Conditions', 'Hall booking terms prompt', E'📋 *Terms & Conditions*\n\n📅 Date: {date}\n💰 Charges: {charges}\n\n📄 Policies: {policies_link}\n\nDo you agree to the terms?\n\n1. ✅ Yes, I Agree\n2. ❌ No, I Decline\n\nReply *1* or *2*', '["date", "charges", "policies_link"]'::jsonb, 8),
('hall.date_no_longer_available', 'hall', 'Date No Longer Available', 'Race condition in hall booking', E'⚠️ *Date No Longer Available*\n\nJust booked by someone else. Please choose another date.\n\nReply *0* for menu', '[]'::jsonb, 9),
('hall.booking_confirmed', 'hall', 'Booking Confirmed', 'Hall booking confirmation', E'✅ *Booking Confirmed*\n\n📅 {date} | ⏰ 9AM – 9PM\n💰 {charges} | ⏳ Payment Pending\n\n📌 Notes:\n• Pay within 3 days\n• 24hr cancellation notice\n• Leave hall clean\n\n📄 Invoice: {invoice_url}\n\nReply *0* for menu', '["date", "charges", "invoice_url"]'::jsonb, 10),
('hall.booking_failed', 'hall', 'Booking Failed', 'Hall booking insert failed', E'❌ *Booking Failed*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 11),
('hall.booking_declined', 'hall', 'Booking Declined', 'User declined hall terms', E'❌ *Booking Cancelled*\n\nYou must agree to terms to book.\n\nReply *0* for menu', '[]'::jsonb, 12),
('hall.invalid_response', 'hall', 'Invalid Response', 'Invalid yes/no for hall terms', E'❓ *Invalid Response*\n\nReply *1* (Yes) or *2* (No)\n\nReply *0* for menu', '[]'::jsonb, 13),
('hall.invalid_menu_selection', 'hall', 'Invalid Menu Selection', 'Invalid hall menu choice', E'❓ *Invalid Selection*\n\nPlease choose 1-4.\n\nReply *0* for menu', '[]'::jsonb, 14),
('hall.no_bookings_cancel', 'hall', 'No Bookings to Cancel', 'No confirmed bookings for cancellation', E'📋 *No Bookings Found*\n\nYou don''t have any confirmed bookings to cancel.\n\nReply *0* for menu', '[]'::jsonb, 15),
('hall.cancel_list', 'hall', 'Cancel Booking List', 'List of bookings available to cancel', E'❌ *Cancel Booking*\n\n{list}\n\nReply with number to cancel, or *0* for menu', '["list"]'::jsonb, 16),
('hall.cancel_confirm', 'hall', 'Cancel Confirmation', 'Booking cancellation confirmation prompt', E'⚠️ *Confirm Cancellation*\n\n📅 Date: {date}\n💰 Charges: {charges}\n💳 Payment: {payment_status}', '["date", "charges", "payment_status"]'::jsonb, 17),
('hall.cancel_refund_note', 'hall', 'Cancel Refund Note', 'Note about refund for paid bookings', E'💡 Note: Refund per cancellation policy.', '[]'::jsonb, 18),
('hall.cancelled', 'hall', 'Booking Cancelled', 'Booking cancellation success', E'✅ *Booking Cancelled*\n\nYour booking for {date} has been cancelled.', '["date"]'::jsonb, 19),
('hall.cancelled_refund', 'hall', 'Cancelled Refund', 'Refund note after cancellation', E'Refund per cancellation policy.', '[]'::jsonb, 20),
('hall.cancel_aborted', 'hall', 'Cancel Aborted', 'User chose not to cancel', E'✅ *Cancellation Aborted*\n\nYour booking remains active. No changes made.\n\nReply *0* for menu', '[]'::jsonb, 21),
('hall.cancel_failed', 'hall', 'Cancel Failed', 'Cancellation database error', E'❌ *Cancellation Failed*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 22),
('hall.no_bookings_edit', 'hall', 'No Bookings to Edit', 'No confirmed bookings for editing', E'📋 *No Bookings Found*\n\nYou don''t have any confirmed bookings to edit.\n\nReply *0* for menu', '[]'::jsonb, 23),
('hall.edit_list', 'hall', 'Edit Booking List', 'List of bookings to reschedule', E'✏️ *Edit Booking*\n\n{list}\n\nReply with number to reschedule, or *0* for menu', '["list"]'::jsonb, 24),
('hall.edit_date_prompt', 'hall', 'Edit Date Prompt', 'New date prompt for rescheduling', E'✏️ *Reschedule Booking*\n\n📅 Current: {current_date}\n\nEnter the new date:\n\n*B* to go back, *0* for menu', '["current_date"]'::jsonb, 25),
('hall.edit_invalid_date', 'hall', 'Edit Invalid Date', 'Invalid date in edit flow', E'❓ *Invalid Date*\n\nEnter in DD-MM-YYYY format.\nExample: 25-12-2025\n\n*B* to go back, *0* for menu', '[]'::jsonb, 26),
('hall.edit_invalid_date_parse', 'hall', 'Edit Invalid Date Parse', 'Unparseable date in edit flow', E'❓ *Invalid Date*\n\nWe couldn''t understand that. Please try again.\n\nReply *0* for menu', '[]'::jsonb, 27),
('hall.edit_date_past', 'hall', 'Edit Date Past', 'Past date in edit flow', E'⚠️ *Invalid Date*\n\nDate is in the past. Please choose a future date.\n\n*B* to go back, *0* for menu', '[]'::jsonb, 28),
('hall.edit_date_taken', 'hall', 'Edit Date Taken', 'Date already booked in edit flow', E'❌ *Date Already Booked*\n\nThat date is reserved. Please choose another.\n\nReply *0* for menu', '[]'::jsonb, 29),
('hall.edit_failed', 'hall', 'Edit Failed', 'Edit booking database error', E'❌ *Update Failed*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 30),
('hall.edit_success', 'hall', 'Edit Success', 'Booking rescheduled successfully', E'✅ *Booking Updated*\n\n📅 From: {old_date}\n📅 To: {new_date}\n\nSuccessfully rescheduled!\n\nReply *0* for menu', '["old_date", "new_date"]'::jsonb, 31),
('hall.no_bookings_view', 'hall', 'No Bookings', 'No bookings to view', E'📋 *No Bookings Found*\n\nYou don''t have any bookings yet. Create one from the Hall menu.\n\nReply *0* for menu', '[]'::jsonb, 32),
('hall.view_bookings', 'hall', 'View Bookings', 'User''s booking list', E'📋 *Your Bookings*\n\n{list}\n\nReply *0* for menu', '["list"]'::jsonb, 33)
ON CONFLICT (message_key) DO NOTHING;

-- === Staff Flow ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('staff.menu', 'staff', 'Staff Menu', 'Staff management main menu', E'👥 *Staff Management*\n\n{options}\n\nReply 1-4 or *0* for menu', '["options"]'::jsonb, 1),
('staff.no_unit', 'staff', 'No Unit Linked', 'User profile not linked to a unit', E'Unable to manage staff. Your profile is not linked to a unit.\n\nPlease contact building management.\n\nReply *0* for menu', '[]'::jsonb, 2),
('staff.add_name', 'staff', 'Add Staff Name', 'Name prompt for new staff', E'➕ *Add New Staff*\n\nEnter staff member''s full name:\n\n*B* to go back, *0* for menu', '[]'::jsonb, 3),
('staff.add_phone', 'staff', 'Add Staff Phone', 'Phone prompt for new staff', E'📱 *Enter Phone Number*\n\nFormat: 03001234567\n\n*B* to go back', '[]'::jsonb, 4),
('staff.duplicate_phone', 'staff', 'Duplicate Phone', 'Staff phone already exists', E'⚠️ *Duplicate Entry*\n\nThis phone is already in your staff list.\n\nReply *0* for menu', '[]'::jsonb, 5),
('staff.add_cnic', 'staff', 'Add Staff CNIC', 'CNIC prompt for new staff', E'🆔 *Enter CNIC*\n\nFormat: 13 digits\nExample: 1234512345671\n\n*B* to go back', '[]'::jsonb, 6),
('staff.add_role', 'staff', 'Add Staff Role', 'Role selection for new staff', E'👔 *Select Role*\n\n{roles}\n\nReply 1-{max}, or *B* to go back', '["roles", "max"]'::jsonb, 7),
('staff.add_role_custom', 'staff', 'Custom Role', 'Custom role input prompt', E'📋 *Custom Role*\n\nEnter role name (3-30 characters):\nExamples: Gardener, Helper\n\n*B* to go back', '[]'::jsonb, 8),
('staff.invalid_role', 'staff', 'Invalid Role', 'Invalid role selection', E'❓ *Invalid Selection*\n\nPlease choose 1-{max}.\n\n*B* to go back', '["max"]'::jsonb, 9),
('staff.invalid_custom_role', 'staff', 'Invalid Custom Role', 'Custom role validation failed', E'❌ *Invalid Role*\n\nMust be 3-30 characters.\n\n*B* to go back', '[]'::jsonb, 10),
('staff.added', 'staff', 'Staff Added', 'Staff member successfully created', E'✅ *Staff Member Added*\n\n👤 {name}\n🆔 {cnic}\n📱 {phone}\n👔 {role}\n\n📌 Please submit their CNIC to maintenance for card issuance.\n\nReply *0* for menu', '["name", "cnic", "phone", "role"]'::jsonb, 11),
('staff.add_error', 'staff', 'Add Staff Error', 'Staff creation database error', E'❌ *Unable to Add Staff*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 12),
('staff.view_list', 'staff', 'View Staff List', 'Displays all staff members', E'📋 *Your Staff*\n\n{list}\n\nReply *0* for menu', '["list"]'::jsonb, 13),
('staff.view_empty', 'staff', 'No Staff', 'No staff members found', E'📋 *No Staff Found*\n\nYou haven''t added any staff yet.\n\nReply *0* for menu', '[]'::jsonb, 14),
('staff.view_error', 'staff', 'View Staff Error', 'Error loading staff list', E'❌ *Unable to Load Staff*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 15),
('staff.delete_list', 'staff', 'Delete Staff List', 'Staff list for removal', E'🗑️ *Remove Staff*\n\n{list}\n\nReply with number to remove, or *0* for menu', '["list"]'::jsonb, 16),
('staff.delete_empty', 'staff', 'No Staff to Delete', 'No staff members to remove', E'📋 *No Staff Found*\n\nNo staff members to delete.\n\nReply *0* for menu', '[]'::jsonb, 17),
('staff.delete_confirm', 'staff', 'Delete Confirmation', 'Staff removal confirmation', E'⚠️ *Confirm Removal*\n\n👤 {name}\n🆔 {cnic}\n📱 {phone}\n\nRemove this staff member?\n\n1. ✅ Yes, remove\n2. ❌ No, cancel\n\nReply *1* or *2*', '["name", "cnic", "phone"]'::jsonb, 18),
('staff.deleted', 'staff', 'Staff Deleted', 'Staff removed successfully', E'✅ *Staff Removed*\n\n{name} removed from your list.\n\nReply *0* for menu', '["name"]'::jsonb, 19),
('staff.delete_cancelled', 'staff', 'Delete Cancelled', 'Staff removal cancelled', E'✅ *Removal Cancelled*\n\nStaff list unchanged.\n\nReply *0* for menu', '[]'::jsonb, 20),
('staff.delete_failed', 'staff', 'Delete Failed', 'Staff removal database error', E'❌ *Removal Failed*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 21),
('staff.edit_list', 'staff', 'Edit Staff List', 'Staff list for editing', E'✏️ *Edit Staff*\n\n{list}\n\nReply with number to edit, or *0* for menu', '["list"]'::jsonb, 22),
('staff.edit_empty', 'staff', 'No Staff to Edit', 'No staff members to edit', E'📋 *No Staff Found*\n\nNo staff members to edit.\n\nReply *0* for menu', '[]'::jsonb, 23),
('staff.edit_field_select', 'staff', 'Edit Field Select', 'Choose which field to edit', E'✏️ *Edit: {name}*\n\n1. 👤 Name\n2. 🆔 CNIC\n3. 📱 Phone\n\nReply 1-3', '["name"]'::jsonb, 24),
('staff.edit_name_prompt', 'staff', 'Edit Name Prompt', 'New name input for staff edit', E'📝 *Update Name*\n\nEnter new name for {name}:\n\n*B* to go back', '["name"]'::jsonb, 25),
('staff.edit_cnic_prompt', 'staff', 'Edit CNIC Prompt', 'New CNIC input for staff edit', E'🆔 *Update CNIC*\n\nEnter new 13-digit CNIC:\n\n*B* to go back', '[]'::jsonb, 26),
('staff.edit_phone_prompt', 'staff', 'Edit Phone Prompt', 'New phone input for staff edit', E'📱 *Update Phone*\n\nEnter new phone (e.g., 03001234567):\n\n*B* to go back', '[]'::jsonb, 27),
('staff.edit_invalid_cnic', 'staff', 'Edit Invalid CNIC', 'Invalid CNIC in edit flow', E'❌ *Invalid CNIC*\n\nEnter exactly 13 digits.\n\n*B* to go back', '[]'::jsonb, 28),
('staff.edit_invalid_phone', 'staff', 'Edit Invalid Phone', 'Invalid phone in edit flow', E'❌ *Invalid Phone*\n\nEnter valid mobile number (e.g., 03001234567).\n\n*B* to go back', '[]'::jsonb, 29),
('staff.edit_failed', 'staff', 'Edit Failed', 'Staff edit database error', E'❌ *Update Failed*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 30),
('staff.edit_success', 'staff', 'Edit Success', 'Staff field updated successfully', E'✅ *Staff Updated*\n\n{field_name} changed to: {new_value}\n\nReply *0* for menu', '["field_name", "new_value"]'::jsonb, 31),
('staff.invalid_menu', 'staff', 'Invalid Menu', 'Invalid staff menu selection', E'❓ *Invalid Selection*\n\nPlease choose 1-4.\n\nReply *0* for menu', '[]'::jsonb, 32)
ON CONFLICT (message_key) DO NOTHING;

-- === Visitor Flow ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('visitor.name_prompt', 'visitor', 'Name Prompt', 'Visitor name input', E'🎫 *Visitor Entry Pass*\n\nEnter the *visitor''s name* ✍️\n\n*B* to go back, *0* for menu', '[]'::jsonb, 1),
('visitor.name_too_short', 'visitor', 'Name Too Short', 'Visitor name validation error', E'❌ *Name too short*\n\nPlease enter the visitor''s full name (at least 2 characters).\n\n*B* to go back, *0* for menu', '[]'::jsonb, 2),
('visitor.car_prompt', 'visitor', 'Car Number Prompt', 'Visitor car number input', E'✅ Name: {name}\n\n🚗 Enter the visitor''s *car number* (license plate).\n\n*B* to go back, *0* for menu', '["name"]'::jsonb, 3),
('visitor.car_too_short', 'visitor', 'Car Number Too Short', 'Car number validation error', E'❌ *Car number too short*\n\nPlease enter a valid car number / license plate.\n\n*B* to go back, *0* for menu', '[]'::jsonb, 4),
('visitor.date_prompt', 'visitor', 'Date Prompt', 'Visit date input', E'🚗 Car: {car_number}\n\n📅 Enter *date of visit*.\nFormats: DD-MM-YYYY, "tomorrow", "next Monday"\n\n*B* to go back, *0* for menu', '["car_number"]'::jsonb, 5),
('visitor.invalid_date', 'visitor', 'Invalid Date', 'Invalid visitor date format', E'❌ *Invalid Date*\n\nTry: DD-MM-YYYY, "tomorrow", "next Monday"\n\n*B* to go back, *0* for menu', '[]'::jsonb, 6),
('visitor.invalid_date_parse', 'visitor', 'Invalid Date Parse', 'Unparseable visitor date', E'❌ *Invalid Date*\n\nCouldn''t understand that date. Try again.\n\n*B* to go back, *0* for menu', '[]'::jsonb, 7),
('visitor.date_past', 'visitor', 'Date in Past', 'Visit date is in the past', E'❌ *Invalid Date*\n\nVisit date cannot be in the past.\n\n*B* to go back, *0* for menu', '[]'::jsonb, 8),
('visitor.date_too_far', 'visitor', 'Date Too Far', 'Visit date more than 30 days ahead', E'❌ *Invalid Date*\n\nVisitor passes can only be registered up to 30 days in advance.\n\n*B* to go back, *0* for menu', '[]'::jsonb, 9),
('visitor.created', 'visitor', 'Visitor Pass Created', 'Successful visitor pass creation', E'✅ *Visitor Pass Created!*\n\nForward this to your visitor:\n\n—————————————\n🎫 *Visitor Pass*\n🆔 Pass ID: *{pass_id}*\n👤 Name: {visitor_name}{car_line}\n📅 Date: {date}\n\nShow this message at the gate.\n—————————————\n\nReply *0* for menu', '["pass_id", "visitor_name", "car_line", "date"]'::jsonb, 10),
('visitor.creation_error', 'visitor', 'Creation Error', 'Visitor pass database error', E'❌ *Registration Failed*\n\nPlease try again later.\n\nReply *0* for menu', '[]'::jsonb, 11),
('visitor.unexpected_error', 'visitor', 'Unexpected Error', 'Unexpected visitor flow error', E'❌ *Registration Failed*\n\nAn unexpected error occurred.\n\nReply *0* for menu', '[]'::jsonb, 12)
ON CONFLICT (message_key) DO NOTHING;

-- === Feedback Flow ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('feedback.prompt', 'feedback', 'Feedback Prompt', 'Asks user for feedback', E'💬 *Share Your Feedback*\n\nWe value your input! Share suggestions or thoughts about our services.\n\nType your message, or *0* for menu', '[]'::jsonb, 1),
('feedback.received', 'feedback', 'Feedback Received', 'Feedback saved confirmation', E'✅ *Feedback Received*\n\nThank you! Your feedback has been forwarded to management.\n\n💡 For urgent issues, register a complaint from the main menu.\n\nReply *0* for menu', '[]'::jsonb, 2),
('feedback.error', 'feedback', 'Feedback Error', 'Feedback save error', E'❌ *Unable to Save Feedback*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 3)
ON CONFLICT (message_key) DO NOTHING;

-- === Status Flow ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('status.no_complaints', 'status', 'No Active Complaints', 'No complaints to show', E'📋 *No Active Complaints*\n\nYou don''t have any active complaints. All resolved or none registered yet.\n\nReply *0* for menu', '[]'::jsonb, 1),
('status.list', 'status', 'Complaint Status List', 'List of active complaints', E'🔍 *Complaint Status*\n\n{list}\n\nReply with number to view, or *0* for menu', '["list"]'::jsonb, 2),
('status.detail', 'status', 'Complaint Detail', 'Detailed complaint info', E'📋 *Complaint Details*\n\n🎫 ID: {complaint_id}\n🔧 Type: {subcategory}\n📝 {description}\n📅 Registered: {date}\n\n📊 Status: {status_text}', '["complaint_id", "subcategory", "description", "date", "status_text"]'::jsonb, 3),
('status.invalid_selection', 'status', 'Invalid Selection', 'Invalid complaint selection', E'❓ *Invalid Selection*\n\nPlease choose 1-{max}\n\nReply *0* for menu', '["max"]'::jsonb, 4)
ON CONFLICT (message_key) DO NOTHING;

-- === Cancel Complaint Flow ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('cancel.no_complaints', 'status', 'No Cancellable Complaints', 'No pending complaints to cancel', E'📋 *No Cancellable Complaints*\n\nNo pending complaints to cancel. Only pending complaints can be cancelled.\n\nReply *0* for menu', '[]'::jsonb, 5),
('cancel.list', 'status', 'Cancel List', 'List of cancellable complaints', E'❌ *Cancel Complaint*\n\n{list}\n\nReply with number to cancel, or *0* for menu', '["list"]'::jsonb, 6),
('cancel.confirm', 'status', 'Cancel Confirm', 'Complaint cancellation confirmation', E'⚠️ *Confirm Cancellation*\n\n📋 ID: {complaint_id}\n🔧 Type: {subcategory}\n📝 {description}\n\nCancel this complaint?\n\n1. ✅ Yes, cancel\n2. ❌ No, keep\n\nReply *1* or *2*', '["complaint_id", "subcategory", "description"]'::jsonb, 7),
('cancel.success', 'status', 'Cancel Success', 'Complaint cancelled successfully', E'✅ *Complaint Cancelled*\n\nComplaint {complaint_id} has been cancelled.\n\nReply *0* for menu', '["complaint_id"]'::jsonb, 8),
('cancel.aborted', 'status', 'Cancel Aborted', 'User chose not to cancel', E'✅ *Cancellation Aborted*\n\nYour complaint remains active. No changes made.\n\nReply *0* for menu', '[]'::jsonb, 9),
('cancel.failed', 'status', 'Cancel Failed', 'Cancellation database error', E'❌ *Cancellation Failed*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 10),
('cancel.invalid_response', 'status', 'Cancel Invalid Response', 'Invalid yes/no for cancellation', E'❓ *Invalid Response*\n\nReply *1* (Yes) or *2* (No)\n\nReply *0* for menu', '[]'::jsonb, 11)
ON CONFLICT (message_key) DO NOTHING;

-- === Errors ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('error.generic', 'errors', 'Generic Error', 'Generic processing error', E'❌ *Unable to Process*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 1),
('error.something_wrong', 'errors', 'Something Wrong', 'Unexpected error', E'❌ *Something Went Wrong*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 2),
('error.unsupported_file', 'errors', 'Unsupported File', 'Non-image media received', E'❌ *Unsupported File*\n\nPlease send an *image* or text message.\n\nType *0* for menu.', '[]'::jsonb, 3),
('error.empty_message', 'errors', 'Empty Message', 'Empty message body received', E'❌ *Empty Message*\n\nPlease send a text message, or type *0* for menu.', '[]'::jsonb, 4),
('error.unexpected', 'errors', 'Unexpected Error', 'Top-level unexpected error', E'❌ An error occurred. Try again or type *0* for menu.', '[]'::jsonb, 5)
ON CONFLICT (message_key) DO NOTHING;

-- === Back Navigation ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('nav.back_complaint_sub_building', 'navigation', 'Back: Building Complaint', 'Navigation back to building subcategories', E'🔙 *Going Back*\n\n🏢 *Building Complaint*\n\n1. 🛗 Lift/Elevator\n2. 💪 Gym\n3. 🎱 Snooker Room\n4. 🎮 Play Area\n5. 🚗 Parking\n6. 🔒 Security Complaint\n7. 🔧 Plumbing\n8. ⚡ Electric\n9. 🔨 Civil\n10. 🤝 Collaboration Corner\n11. 🪑 Seating Area\n12. 📋 Other\n\nReply with number, or *B* to go back', '[]'::jsonb, 1),
('nav.back_complaint_sub_apartment', 'navigation', 'Back: Apartment Complaint', 'Navigation back to apartment subcategories', E'🔙 *Going Back*\n\n🏠 *Apartment Complaint*\n\n1. 🔧 Plumbing\n2. ⚡ Electric\n3. 🔨 Civil\n4. 🅿️ My Parking Complaint\n5. 🔧 Other\n\nReply with number, or *B* to go back', '[]'::jsonb, 2),
('nav.back_staff_add_name', 'navigation', 'Back: Staff Name', 'Navigation back to staff name entry', E'🔙 *Going Back*\n\nEnter the staff member''s full name:\n\n*B* to go back, *0* for menu', '[]'::jsonb, 3),
('nav.back_staff_add_phone', 'navigation', 'Back: Staff Phone', 'Navigation back to staff phone entry', E'🔙 *Going Back*\n\nEnter the staff member''s phone number:\n\n*B* to go back', '[]'::jsonb, 4),
('nav.back_staff_add_cnic', 'navigation', 'Back: Staff CNIC', 'Navigation back to staff CNIC entry', E'🔙 *Going Back*\n\nEnter the CNIC number:\n\n*B* to go back', '[]'::jsonb, 5),
('nav.back_staff_add_role', 'navigation', 'Back: Staff Role', 'Navigation back to staff role selection', E'🔙 *Going Back*\n\n👔 *Select Staff Role*\n\n1. 🚗 Driver\n2. 👨‍🍳 Cook\n3. 🧹 Maid\n4. 🔧 Plumber\n5. ⚡ Electrician\n6. 🛠️ Maintenance\n7. 🔒 Security Guard\n8. 📋 Other (Specify)\n\nReply 1-8, or *B* to go back', '[]'::jsonb, 6),
('nav.back_booking_date', 'navigation', 'Back: Booking Date', 'Navigation back to booking date entry', E'🔙 *Going Back*\n\nEnter the date you''d like to book:\n\n*B* to go back, *0* for menu', '[]'::jsonb, 7),
('nav.back_hall_menu', 'navigation', 'Back: Hall Menu', 'Navigation back to hall menu', E'🔙 *Going Back*\n\n🏛️ *Community Hall*\n\n1. 📅 New Booking\n2. ❌ Cancel Booking\n3. ✏️ Edit Booking\n4. 📋 View My Bookings\n\nReply 1-4, or *0* for menu', '[]'::jsonb, 8),
('nav.back_hall_booking_date', 'navigation', 'Back: Hall Booking Date', 'Navigation back to hall booking date', E'🔙 *Going Back*\n\nEnter the date you''d like to book:\n\n*B* to go back, *0* for menu', '[]'::jsonb, 9),
('nav.back_visitor_name', 'navigation', 'Back: Visitor Name', 'Navigation back to visitor name entry', E'🔙 *Going Back*\n\n🎫 *Visitor Entry Pass*\n\nEnter the *visitor''s name* ✍️\n\n*B* to go back, *0* for menu', '[]'::jsonb, 10),
('nav.back_visitor_car', 'navigation', 'Back: Visitor Car', 'Navigation back to visitor car entry', E'🔙 *Going Back*\n\n🚗 Enter the visitor''s *car number* (license plate).\n\n*B* to go back, *0* for menu', '[]'::jsonb, 11)
ON CONFLICT (message_key) DO NOTHING;

-- === Translatable Labels (used by getLabels() for menus, categories, roles) ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
  ('labels.main_menu_options', 'main_menu', 'Main Menu Options', 'Main menu option labels (one per line)',
   E'Register Complaint\nCheck Complaint Status\nCancel Complaint\nMy Staff Management\nCheck Maintenance Dues\nCommunity Hall\nVisitor Entry Pass\nView My Profile\nSuggestions/Feedback\nEmergency Contacts\nSubmit Payment',
   '[]'::jsonb, 100),

  ('labels.hall_menu_options', 'booking', 'Hall Menu Options', 'Hall menu option labels (one per line)',
   E'New Booking\nCancel Booking\nEdit Booking\nView My Bookings',
   '[]'::jsonb, 101),

  ('labels.staff_menu_options', 'staff', 'Staff Menu Options', 'Staff menu option labels (one per line)',
   E'Add Staff Member\nView My Staff\nEdit Staff Member\nRemove Staff Member',
   '[]'::jsonb, 102),

  ('labels.complaint_categories', 'complaint', 'Complaint Categories', 'Complaint category labels (one per line)',
   E'My Apartment Complaint\nBuilding Complaint',
   '[]'::jsonb, 103),

  ('labels.apartment_subcategories', 'complaint', 'Apartment Subcategories', 'Apartment complaint subcategory labels (one per line)',
   E'Plumbing\nElectric\nCivil\nMy Parking Complaint\nOther',
   '[]'::jsonb, 104),

  ('labels.building_subcategories', 'complaint', 'Building Subcategories', 'Building complaint subcategory labels (one per line)',
   E'Lift/Elevator\nGym\nSnooker Room\nPlay Area\nParking\nSecurity Complaint\nPlumbing\nElectric\nCivil\nCollaboration Corner\nSeating Area\nOther',
   '[]'::jsonb, 105),

  ('labels.staff_roles', 'staff', 'Staff Roles', 'Staff role labels (one per line)',
   E'Driver\nCook\nMaid\nPlumber\nElectrician\nMaintenance\nSecurity Guard\nOther',
   '[]'::jsonb, 106),

  ('labels.staff_edit_fields', 'staff', 'Staff Edit Fields', 'Staff edit field labels (one per line)',
   E'Name\nCNIC\nPhone',
   '[]'::jsonb, 107),

  ('labels.tower_selection', 'complaint', 'Tower Selection', 'Tower selection labels (one per line)',
   E'Tower A\nTower B\nTower C\nTower D',
   '[]'::jsonb, 108),

  ('labels.reply_menu', 'navigation', 'Reply Menu', 'Reply instruction to return to main menu',
   'Reply *0* for menu',
   '[]'::jsonb, 109)

ON CONFLICT (message_key) DO NOTHING;

-- === Amenity Flow ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('amenity.menu', 'amenity', 'Amenity Menu', 'List of building amenities', E'🏟️ *Amenities*\n\n{options}\n\nReply with number, or *0* for menu', '["options"]'::jsonb, 1),
('amenity.timings', 'amenity', 'Amenity Timings', 'Operating hours for an amenity', E'🏟️ *{name}*\n\n⏰ *Timings*\n{timings}\n\nReply *0* for menu', '["name", "timings"]'::jsonb, 2),
('amenity.under_maintenance', 'amenity', 'Amenity Under Maintenance', 'Shown when amenity is under maintenance', E'🏟️ *{name}*\n\n🔧 *Under Maintenance*\n\nThis amenity is currently under maintenance. Please check back later.\n\nReply *0* for menu', '["name"]'::jsonb, 3),
('amenity.invalid_selection', 'amenity', 'Invalid Amenity Selection', 'Invalid amenity number selected', E'❓ *Invalid Selection*\n\nPlease choose 1-{max}.\n\nReply *0* for menu', '["max"]'::jsonb, 4),
('amenity.no_amenities', 'amenity', 'No Amenities Available', 'Shown when no active amenities exist', E'📋 *No Amenities Available*\n\nNo amenities are currently configured.\n\nReply *0* for menu', '[]'::jsonb, 5)
ON CONFLICT (message_key) DO NOTHING;

-- === Payment Receipt Flow ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('payment.menu', 'payment', 'Payment Menu', 'Payment type selection (maintenance vs booking)', E'💳 *Submit Payment*\n\nWhat are you paying for?\n\n{options}\n\nReply 1-2, or *0* for menu', '["options"]'::jsonb, 1),
('payment.no_methods', 'payment', 'No Payment Methods', 'Shown when no payment methods are configured', E'❌ *Online Payment Not Available*\n\nNo payment methods are currently configured. Please contact your building admin.\n\nReply *0* for menu', '[]'::jsonb, 2),
('payment.no_pending', 'payment', 'No Pending Payments', 'Shown when there are no unpaid payments', E'✅ *No Pending Payments*\n\nYou don''t have any unpaid {type} payments.\n\nReply *0* for menu', '["type"]'::jsonb, 3),
('payment.select', 'payment', 'Select Payment', 'List of pending payments for selection', E'💰 *Select Payment*\n\n{list}\n\nReply with number, or *0* for menu', '["list"]'::jsonb, 4),
('payment.already_submitted', 'payment', 'Already Submitted', 'Shown when a receipt was already submitted for this payment', E'⏳ *Receipt Already Submitted*\n\nYou already submitted a receipt for this payment. It''s being verified by admin.\n\nReply *0* for menu', '[]'::jsonb, 5),
('payment.methods_list', 'payment', 'Payment Methods List', 'Shows payment account details and amount', E'💳 *Payment Details*\n\n💰 Amount: *{amount}*\n📝 For: {description}\n\nPlease send payment to one of these accounts:\n\n{methods}\n\nAfter paying, send a *screenshot* of your receipt.\n\nReply *0* for menu', '["amount", "description", "methods"]'::jsonb, 6),
('payment.send_image', 'payment', 'Send Receipt Image', 'Prompt to send receipt screenshot', E'📸 *Send Receipt*\n\nPlease send a *photo/screenshot* of your payment receipt.\n\nReply *0* for menu', '[]'::jsonb, 7),
('payment.receipt_received', 'payment', 'Receipt Received', 'Confirmation after receipt is uploaded', E'✅ *Receipt Received!*\n\n📝 {description}\n💰 Amount: {amount}\n\nYour receipt has been submitted for verification. We''ll notify you once it''s reviewed.\n\nReply *0* for menu', '["description", "amount"]'::jsonb, 8),
('payment.upload_error', 'payment', 'Upload Error', 'Shown when receipt upload fails', E'❌ *Upload Failed*\n\nWe couldn''t upload your receipt. Please try again.\n\nReply *0* for menu', '[]'::jsonb, 9)
ON CONFLICT (message_key) DO NOTHING;

-- === Payment Labels ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('labels.payment_menu_options', 'payment', 'Payment Menu Labels', 'Translatable labels for payment type options (newline-delimited)', E'Maintenance\nHall Booking', '[]'::jsonb, 10)
ON CONFLICT (message_key) DO NOTHING;

-- === Payment Verification Notifications ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('payment.approved', 'payment', 'Payment Approved', 'Sent to resident when admin approves their receipt', E'✅ *Payment Verified!*\n\nYour payment for {description} (PKR {amount}) has been verified and marked as paid.\n\nReply *0* for menu', '["description", "amount"]'::jsonb, 11),
('payment.rejected', 'payment', 'Payment Rejected', 'Sent to resident when admin rejects their receipt', E'❌ *Receipt Not Accepted*\n\nYour receipt for {description} was not accepted.\n\n📝 Reason: {reason}\n\nPlease submit a valid receipt again.\n\nReply *0* for menu', '["description", "reason"]'::jsonb, 12)
ON CONFLICT (message_key) DO NOTHING;

-- === Payment Back Navigation ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('nav.back_payment_type', 'navigation', 'Back to Payment Type', 'Back navigation to payment type selection', E'🔙 *Going Back*\n\n💳 *Submit Payment*\n\nWhat are you paying for?\n\n1. 💰 Maintenance\n2. 🏛️ Hall Booking\n\nReply 1-2, or *0* for menu', '[]'::jsonb, 20)
ON CONFLICT (message_key) DO NOTHING;

-- === Label Message Fixes (for existing installs) ===

-- Fix existing installs where labels.main_menu_options was seeded with fewer items
UPDATE bot_messages
SET default_text = E'Register Complaint\nCheck Complaint Status\nCancel Complaint\nMy Staff Management\nCheck Maintenance Dues\nCommunity Hall\nVisitor Entry Pass\nView My Profile\nSuggestions/Feedback\nEmergency Contacts\nSubmit Payment\nAmenities'
WHERE message_key = 'labels.main_menu_options'
  AND default_text NOT LIKE '%Amenities%';

-- Fix existing installs where menu.main_menu has hardcoded "Reply 1-10" or "Reply 1-11"
UPDATE bot_messages
SET default_text = E'👋 Hello {name}!\n\nWelcome to *Manzhil*\n\n{options}\n\nReply 1-{max_option}',
    variables = '["name", "options", "max_option"]'::jsonb
WHERE message_key = 'menu.main_menu'
  AND (default_text LIKE '%Reply 1-10%' OR default_text LIKE '%Reply 1-11%');

-- Fix existing installs where menu.invalid_selection has hardcoded "1-10" or "1-11"
UPDATE bot_messages
SET default_text = E'❓ *Invalid Selection*\n\nPlease reply 1-{max_option}.\n\n{menu}',
    variables = '["menu", "max_option"]'::jsonb
WHERE message_key = 'menu.invalid_selection'
  AND (default_text LIKE '%1-10%' OR default_text LIKE '%1-11%');

-- --------------------------------------------
-- 9.5 Amenity Seed Data
-- Default amenities, prayer times, and menu options.
-- --------------------------------------------

-- Default amenities
INSERT INTO amenities (name, is_active, is_under_maintenance, open_time, close_time, sort_order)
VALUES
  ('Gym', true, false, '06:00:00', '22:00:00', 1),
  ('Swimming Pool', true, false, '06:00:00', '20:00:00', 2),
  ('Snooker Room', true, false, '10:00:00', '22:00:00', 3),
  ('Play Area', true, false, '08:00:00', '21:00:00', 4),
  ('Jogging Track', true, false, '05:00:00', '22:00:00', 5)
ON CONFLICT DO NOTHING;

-- Default prayer times
INSERT INTO prayer_times (prayer_name, prayer_time, sort_order) VALUES
  ('Fajr', '05:30:00', 1),
  ('Zuhr', '13:00:00', 2),
  ('Asr', '16:30:00', 3),
  ('Maghrib', '18:30:00', 4),
  ('Isha', '20:00:00', 5)
ON CONFLICT (prayer_name) DO NOTHING;

-- Default prayer times settings (disabled by default)
INSERT INTO prayer_times_settings (is_enabled) VALUES (false)
ON CONFLICT (id) DO NOTHING;

-- Default 12 menu options
INSERT INTO menu_options (action_key, label, emoji, is_enabled, sort_order, handler_type) VALUES
  ('register_complaint',    'Register Complaint',      '📝', true,  1,  'complaint'),
  ('check_status',          'Check Complaint Status',  '🔍', true,  2,  'status'),
  ('cancel_complaint',      'Cancel Complaint',        '❌', true,  3,  'cancel'),
  ('staff_management',      'My Staff Management',     '👥', true,  4,  'staff'),
  ('maintenance_dues',      'Check Maintenance Dues',  '💰', true,  5,  'maintenance_status'),
  ('community_hall',        'Community Hall',           '🏛️', true,  6,  'hall'),
  ('visitor_pass',          'Visitor Entry Pass',      '🎫', true,  7,  'visitor'),
  ('view_profile',          'View My Profile',         '👤', true,  8,  'profile_info'),
  ('feedback',              'Suggestions/Feedback',    '💬', true,  9,  'feedback'),
  ('emergency_contacts',    'Emergency Contacts',      '🆘', true,  10, 'emergency_contacts'),
  ('submit_payment',        'Submit Payment',          '💳', true,  11, 'payment'),
  ('amenities',             'Amenities',               '🏟️', true,  12, 'amenity')
ON CONFLICT (action_key) DO NOTHING;

-- --------------------------------------------
-- 9.6 WhatsApp Templates Seed Data (20 templates)
-- Populates whatsapp_templates table with all template definitions.
-- Idempotent: uses ON CONFLICT DO NOTHING.
-- --------------------------------------------

-- Account Templates (3)
INSERT INTO whatsapp_templates (template_key, name, description, category, env_var_name, variables, trigger_description, trigger_source, fallback_message, sort_order)
VALUES
  ('welcome_message', 'Welcome Message', 'Static welcome message sent to new residents when their profile is created', 'account', 'TWILIO_WELCOME_TEMPLATE_SID', '[]'::jsonb, 'Sent automatically when a new resident profile is created via admin panel or bulk import', 'lib/twilio/notifications/account.ts', E'Hello, welcome to Manzhil by Scrift.\n\nManzhil is a smart Whatsapp Powered Building Management system.\n\nEnter 0 (Zero) to begin.', 1),

  ('account_blocked_maintenance', 'Account Blocked', 'Notification sent when a resident account is blocked due to overdue maintenance payments', 'account', 'TWILIO_ACCOUNT_BLOCKED_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Reason","description":"Reason for blocking","example":"Overdue maintenance payments"},{"key":"3","label":"Overdue Months","description":"List of overdue months","example":"Jan, Feb, Mar 2026"},{"key":"4","label":"Total Due","description":"Formatted total amount due","example":"15,000"}]'::jsonb, 'Sent when admin blocks a resident account from the resident detail page', 'lib/twilio/notifications/account.ts', NULL, 2),

  ('account_reactivated', 'Account Reactivated', 'Notification sent when a blocked resident account is reactivated', 'account', 'TWILIO_ACCOUNT_REACTIVATED_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"}]'::jsonb, 'Sent when admin reactivates a blocked resident account', 'lib/twilio/notifications/account.ts', NULL, 3)
ON CONFLICT (template_key) DO NOTHING;

-- Maintenance Templates (3)
INSERT INTO whatsapp_templates (template_key, name, description, category, env_var_name, variables, trigger_description, trigger_source, fallback_message, sort_order)
VALUES
  ('maintenance_invoice', 'Maintenance Invoice', 'Monthly invoice sent to residents with payment details and invoice link', 'maintenance', 'TWILIO_MAINTENANCE_INVOICE_TEMPLATE_SID', '[{"key":"1","label":"Month/Year","description":"Invoice month and year","example":"January 2026"},{"key":"2","label":"Amount","description":"Formatted maintenance amount","example":"5,000"},{"key":"3","label":"Due Date","description":"Payment due date","example":"10/01/2026"},{"key":"4","label":"Invoice URL","description":"Link to the invoice PDF","example":"https://app.manzhil.com/maintenance-invoice/abc123"}]'::jsonb, 'Sent automatically on 1st of each month via maintenance-reminder cron job', 'lib/twilio/notifications/maintenance.ts', NULL, 1),

  ('maintenance_payment_reminder', 'Maintenance Payment Reminder', 'Reminder sent to residents with overdue maintenance payments', 'maintenance', 'TWILIO_MAINTENANCE_PAYMENT_REMINDER_TEMPLATE_SID', '[{"key":"1","label":"Months List","description":"List of unpaid months","example":"January, February 2026"},{"key":"2","label":"Total Amount","description":"Formatted total due amount","example":"10,000"},{"key":"3","label":"Invoice URL","description":"Link to the invoice PDF","example":"https://app.manzhil.com/maintenance-invoice/abc123"}]'::jsonb, 'Sent daily from the 3rd of each month for unpaid invoices via maintenance-reminder cron job', 'lib/twilio/notifications/maintenance.ts', NULL, 2),

  ('maintenance_payment_confirmed', 'Maintenance Payment Confirmed', 'Confirmation sent when a maintenance payment is marked as paid', 'maintenance', 'TWILIO_MAINTENANCE_PAYMENT_CONFIRMED_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Month/Year","description":"Payment month and year","example":"January 2026"},{"key":"3","label":"Amount","description":"Formatted payment amount","example":"5,000"},{"key":"4","label":"Receipt URL","description":"Link to the payment receipt","example":"https://app.manzhil.com/maintenance-invoice/abc123"}]'::jsonb, 'Sent when admin marks a maintenance payment as paid from the unit detail page or maintenance management', 'lib/twilio/notifications/maintenance.ts', NULL, 3)
ON CONFLICT (template_key) DO NOTHING;

-- Booking Templates (3)
INSERT INTO whatsapp_templates (template_key, name, description, category, env_var_name, variables, trigger_description, trigger_source, fallback_message, sort_order)
VALUES
  ('booking_payment_confirmed', 'Booking Payment Confirmed', 'Confirmation sent when a hall booking payment is received', 'booking', 'TWILIO_BOOKING_PAYMENT_CONFIRMED_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Booking Date","description":"Formatted booking date","example":"January 15, 2026"},{"key":"3","label":"Start Time","description":"Formatted start time","example":"10:00 AM"},{"key":"4","label":"End Time","description":"Formatted end time","example":"2:00 PM"},{"key":"5","label":"Amount","description":"Formatted booking charges","example":"500"},{"key":"6","label":"Booking ID","description":"Unique booking identifier","example":"BK-001"},{"key":"7","label":"Invoice URL","description":"Link to booking invoice","example":"https://app.manzhil.com/booking-invoice/abc123"}]'::jsonb, 'Sent inline when admin marks a booking payment as paid from the bookings page', 'lib/twilio/notifications/booking.ts', NULL, 1),

  ('booking_payment_reminder', 'Booking Reminder', 'Reminder sent before a scheduled hall booking', 'booking', 'TWILIO_BOOKING_PAYMENT_REMINDER_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Booking Date","description":"Formatted booking date","example":"January 15, 2026"},{"key":"3","label":"Start Time","description":"Formatted start time","example":"10:00 AM"},{"key":"4","label":"End Time","description":"Formatted end time","example":"2:00 PM"}]'::jsonb, 'Sent as a reminder before scheduled bookings via the send-reminder endpoint on the bookings page', 'lib/twilio/notifications/booking.ts', NULL, 2),

  ('booking_cancelled', 'Booking Cancelled', 'Notification sent when a hall booking is cancelled', 'booking', 'TWILIO_BOOKING_CANCELLED_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Booking Date","description":"Formatted booking date","example":"January 15, 2026"},{"key":"3","label":"Start Time","description":"Formatted start time","example":"10:00 AM"},{"key":"4","label":"End Time","description":"Formatted end time","example":"2:00 PM"}]'::jsonb, 'Sent when admin cancels a booking from the bookings page', 'lib/twilio/notifications/booking.ts', NULL, 3)
ON CONFLICT (template_key) DO NOTHING;

-- Complaint Templates (4)
INSERT INTO whatsapp_templates (template_key, name, description, category, env_var_name, variables, trigger_description, trigger_source, fallback_message, sort_order)
VALUES
  ('complaint_registered', 'Complaint Registered', 'Acknowledgment sent when a new complaint is submitted by a resident', 'complaint', 'TWILIO_COMPLAINT_REGISTERED_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Subcategory","description":"Formatted complaint type","example":"Water Leakage"},{"key":"3","label":"Complaint ID","description":"Unique complaint identifier","example":"CMP-001"},{"key":"4","label":"Registered Time","description":"Time when complaint was registered","example":"January 15, 2026 10:30 AM"}]'::jsonb, 'Sent when a resident submits a complaint via WhatsApp bot or admin creates one', 'lib/twilio/notifications/complaint.ts', NULL, 1),

  ('complaint_in_progress', 'Complaint In Progress', 'Status update sent when a complaint is being worked on', 'complaint', 'TWILIO_COMPLAINT_IN_PROGRESS_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Subcategory","description":"Formatted complaint type","example":"Water Leakage"},{"key":"3","label":"Complaint ID","description":"Unique complaint identifier","example":"CMP-001"},{"key":"4","label":"Registered Time","description":"Time when complaint was registered","example":"January 15, 2026 10:30 AM"}]'::jsonb, 'Sent when admin changes complaint status to in-progress', 'lib/twilio/notifications/complaint.ts', NULL, 2),

  ('complaint_completed', 'Complaint Completed', 'Resolution notification sent when a complaint is resolved', 'complaint', 'TWILIO_COMPLAINT_COMPLETED_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Subcategory","description":"Formatted complaint type","example":"Water Leakage"},{"key":"3","label":"Complaint ID","description":"Unique complaint identifier","example":"CMP-001"},{"key":"4","label":"Registered Time","description":"Time when complaint was registered","example":"January 15, 2026 10:30 AM"},{"key":"5","label":"Resolved Time","description":"Time when complaint was resolved","example":"January 16, 2026 3:00 PM"}]'::jsonb, 'Sent when admin changes complaint status to completed', 'lib/twilio/notifications/complaint.ts', NULL, 3),

  ('complaint_rejected', 'Complaint Rejected', 'Notification sent when a complaint is rejected or cancelled', 'complaint', 'TWILIO_COMPLAINT_REJECTED_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Subcategory","description":"Formatted complaint type","example":"Water Leakage"},{"key":"3","label":"Complaint ID","description":"Unique complaint identifier","example":"CMP-001"},{"key":"4","label":"Registered Time","description":"Time when complaint was registered","example":"January 15, 2026 10:30 AM"}]'::jsonb, 'Sent when admin changes complaint status to cancelled/rejected', 'lib/twilio/notifications/complaint.ts', NULL, 4)
ON CONFLICT (template_key) DO NOTHING;

-- Parcel Templates (1)
INSERT INTO whatsapp_templates (template_key, name, description, category, env_var_name, variables, trigger_description, trigger_source, fallback_message, sort_order)
VALUES
  ('parcel_arrival', 'Parcel Arrival', 'Notification sent to residents when a parcel/delivery arrives at reception', 'parcel', 'TWILIO_PARCEL_ARRIVAL_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Description","description":"Parcel description or Package","example":"Amazon Delivery"},{"key":"3","label":"Image URL","description":"Photo of the parcel","example":"https://storage.supabase.co/parcels/img.jpg"}]'::jsonb, 'Sent when admin registers a new parcel from the parcels page', 'lib/twilio/notifications/parcel.ts', NULL, 1)
ON CONFLICT (template_key) DO NOTHING;

-- Visitor Templates (1)
INSERT INTO whatsapp_templates (template_key, name, description, category, env_var_name, variables, trigger_description, trigger_source, fallback_message, sort_order)
VALUES
  ('visitor_arrival', 'Visitor Arrival', 'Notification sent to residents when their visitor arrives at the entrance', 'visitor', 'TWILIO_VISITOR_ARRIVAL_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Apartment Number","description":"Resident apartment number","example":"A-101"},{"key":"3","label":"Visit Date","description":"Formatted visit date","example":"January 15, 2026"}]'::jsonb, 'Sent when admin marks a visitor as arrived from the visitors page', 'lib/twilio/notifications/visitor.ts', NULL, 1)
ON CONFLICT (template_key) DO NOTHING;

-- Broadcast Templates (1)
INSERT INTO whatsapp_templates (template_key, name, description, category, env_var_name, variables, trigger_description, trigger_source, fallback_message, sort_order)
VALUES
  ('broadcast_announcement', 'Broadcast Announcement', 'General announcement template used for broadcast messages to multiple residents', 'broadcast', 'TWILIO_BROADCAST_ANNOUNCEMENT_TEMPLATE_SID', '[{"key":"1","label":"Title","description":"Announcement title (newlines replaced with spaces)","example":"Important Notice"},{"key":"2","label":"Body","description":"Announcement body text (newlines replaced with spaces)","example":"Please note that maintenance work will be done on Saturday."}]'::jsonb, 'Sent from the broadcast page when admin sends an announcement to selected recipients', 'lib/twilio/notifications/broadcast.ts', NULL, 1)
ON CONFLICT (template_key) DO NOTHING;

-- Auth Templates (2)
INSERT INTO whatsapp_templates (template_key, name, description, category, env_var_name, variables, trigger_description, trigger_source, fallback_message, sort_order)
VALUES
  ('otp_message', 'OTP Message', 'One-time password sent for admin login authentication via WhatsApp', 'auth', 'TWILIO_OTP_TEMPLATE_SID', '[{"key":"1","label":"OTP Code","description":"6-digit one-time password","example":"123456"}]'::jsonb, 'Sent when an admin requests login via the /login page', 'lib/twilio/notifications/account.ts', NULL, 1),

  ('staff_invitation', 'Staff Invitation', 'Invitation message sent when a new admin/staff member is created', 'auth', 'TWILIO_STAFF_INVITATION_TEMPLATE_SID', '[{"key":"1","label":"Staff Name","description":"Name of the new staff member","example":"Ali Hassan"},{"key":"2","label":"Login URL","description":"URL to the admin login page","example":"https://app.manzhil.com/login"}]'::jsonb, 'Sent when super admin creates a new staff member from the settings page', 'lib/twilio/notifications/account.ts', NULL, 2)
ON CONFLICT (template_key) DO NOTHING;

-- Admin Templates (2)
INSERT INTO whatsapp_templates (template_key, name, description, category, env_var_name, variables, trigger_description, trigger_source, fallback_message, sort_order)
VALUES
  ('daily_report', 'Daily Report', 'Daily summary report sent to admins with 24-hour activity and open complaints overview', 'admin', 'TWILIO_DAILY_REPORT_TEMPLATE_SID', '[{"key":"1","label":"Report Date","description":"Formatted report date","example":"January 15, 2026"},{"key":"2","label":"New Complaints","description":"Number of complaints in last 24h","example":"3"},{"key":"3","label":"New Bookings","description":"Number of bookings in last 24h","example":"2"},{"key":"4","label":"Open Complaints","description":"Total open complaints count","example":"5"},{"key":"5","label":"Pending Count","description":"Number of pending complaints","example":"3"},{"key":"6","label":"In Progress Count","description":"Number of in-progress complaints","example":"2"},{"key":"7","label":"Activity Report Link","description":"URL to 24-hour activity report PDF","example":"https://app.manzhil.com/daily-report/abc123"},{"key":"8","label":"Complaints Report Link","description":"URL to open complaints report PDF","example":"https://app.manzhil.com/daily-report/def456"},{"key":"9","label":"Generation Time","description":"Time when report was generated","example":"5:00 AM"}]'::jsonb, 'Sent daily at 5 AM via daily-reports cron job to admins with receive_daily_reports enabled', 'app/api/cron/daily-reports/route.ts', NULL, 1),

  ('pending_complaint', 'Pending Complaint Alert', 'Alert sent to admin recipients for complaints pending more than 24 hours', 'admin', 'TWILIO_PENDING_COMPLAINT_TEMPLATE_SID', '[{"key":"1","label":"Complaint ID","description":"Unique complaint identifier","example":"CMP-001"},{"key":"2","label":"Resident Name","description":"Name of the complaining resident","example":"Ahmed Khan"},{"key":"3","label":"Apartment","description":"Apartment number","example":"A-101"},{"key":"4","label":"Category","description":"Complaint category text","example":"Building Complaint"},{"key":"5","label":"Subcategory","description":"Formatted complaint type","example":"Water Leakage"},{"key":"6","label":"Description","description":"Sanitized complaint description (max 500 chars)","example":"Water leaking from ceiling in bathroom"},{"key":"7","label":"Registered Date","description":"Formatted registration date","example":"January 14, 2026"},{"key":"8","label":"Hours Pending","description":"Number of hours complaint has been pending","example":"36"},{"key":"9","label":"Admin URL","description":"Link to admin panel","example":"https://app.manzhil.com/admin"}]'::jsonb, 'Sent every 6 hours via pending-complaints cron job to admins with receive_reminder_notifications enabled', 'app/api/cron/pending-complaints/route.ts', NULL, 2)
ON CONFLICT (template_key) DO NOTHING;

-- --------------------------------------------
-- 9.5 Suggested Template Bodies (message_body_draft)
-- Only updates rows where message_body_draft IS NULL.
-- These are the suggested message bodies admins can copy when creating
-- templates in the Twilio Console for Meta approval.
-- --------------------------------------------

-- Account Templates
UPDATE whatsapp_templates SET message_body_draft = E'Hello, welcome to Manzhil by Scrift.\n\nManzhil is a smart WhatsApp-powered Building Management System.\n\nEnter 0 (Zero) to begin.'
WHERE template_key = 'welcome_message' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your account has been temporarily restricted.\n\nReason: {{2}}\nOverdue months: {{3}}\nTotal due: Rs. {{4}}\n\nPlease clear your dues to restore full access. Contact your building management for assistance.'
WHERE template_key = 'account_blocked_maintenance' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, great news! Your account has been reactivated.\n\nYou now have full access to all building services. Thank you for clearing your dues.'
WHERE template_key = 'account_reactivated' AND message_body_draft IS NULL;

-- Maintenance Templates
UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nYour maintenance invoice for {{1}} is ready.\n\nAmount: Rs. {{2}}\nDue Date: {{3}}\n\nView & download your invoice:\n{{4}}\n\nPlease ensure timely payment. Thank you.'
WHERE template_key = 'maintenance_invoice' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nThis is a reminder for your pending maintenance payments.\n\nUnpaid months: {{1}}\nTotal due: Rs. {{2}}\n\nView your invoice:\n{{3}}\n\nPlease clear your dues at the earliest. Thank you.'
WHERE template_key = 'maintenance_payment_reminder' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your maintenance payment has been confirmed.\n\nMonth: {{2}}\nAmount: Rs. {{3}}\n\nView your receipt:\n{{4}}\n\nThank you for your timely payment.'
WHERE template_key = 'maintenance_payment_confirmed' AND message_body_draft IS NULL;

-- Booking Templates
UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your hall booking has been confirmed!\n\nDate: {{2}}\nTime: {{3}} - {{4}}\nAmount: Rs. {{5}}\nBooking ID: {{6}}\n\nView your invoice:\n{{7}}\n\nEnjoy your event!'
WHERE template_key = 'booking_payment_confirmed' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, this is a reminder for your upcoming hall booking.\n\nDate: {{2}}\nTime: {{3}} - {{4}}\n\nPlease ensure everything is arranged for your event.'
WHERE template_key = 'booking_payment_reminder' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your hall booking has been cancelled.\n\nDate: {{2}}\nTime: {{3}} - {{4}}\n\nIf you have any questions, please contact your building management.'
WHERE template_key = 'booking_cancelled' AND message_body_draft IS NULL;

-- Complaint Templates
UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your complaint has been registered successfully.\n\nType: {{2}}\nComplaint ID: {{3}}\nRegistered: {{4}}\n\nOur team will look into this and update you on the progress.'
WHERE template_key = 'complaint_registered' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your complaint is now being worked on.\n\nType: {{2}}\nComplaint ID: {{3}}\nRegistered: {{4}}\n\nOur team is actively addressing this issue. We will notify you once resolved.'
WHERE template_key = 'complaint_in_progress' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your complaint has been resolved.\n\nType: {{2}}\nComplaint ID: {{3}}\nRegistered: {{4}}\nResolved: {{5}}\n\nIf you have any further concerns, feel free to reach out.'
WHERE template_key = 'complaint_completed' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your complaint has been cancelled.\n\nType: {{2}}\nComplaint ID: {{3}}\nRegistered: {{4}}\n\nIf you believe this was done in error, please contact your building management.'
WHERE template_key = 'complaint_rejected' AND message_body_draft IS NULL;

-- Parcel Template
UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, a parcel has arrived for you at reception.\n\nDescription: {{2}}\n\nPhoto: {{3}}\n\nPlease collect it at your earliest convenience.'
WHERE template_key = 'parcel_arrival' AND message_body_draft IS NULL;

-- Visitor Template
UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, a visitor has arrived for you.\n\nApartment: {{2}}\nDate: {{3}}\n\nPlease confirm at reception.'
WHERE template_key = 'visitor_arrival' AND message_body_draft IS NULL;

-- Broadcast Template
UPDATE whatsapp_templates SET message_body_draft = E'{{1}}\n\n{{2}}'
WHERE template_key = 'broadcast_announcement' AND message_body_draft IS NULL;

-- Auth Templates
UPDATE whatsapp_templates SET message_body_draft = E'Your Manzhil login code is: {{1}}\n\nThis code expires in 5 minutes. Do not share it with anyone.'
WHERE template_key = 'otp_message' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, you have been added as an admin to the Manzhil building management system.\n\nLogin here to get started:\n{{2}}'
WHERE template_key = 'staff_invitation' AND message_body_draft IS NULL;

-- Admin Templates
UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nDaily Report for {{1}}\n\nLast 24 Hours:\n- New complaints: {{2}}\n- New bookings: {{3}}\n\nOpen Complaints Overview:\n- Total open: {{4}}\n- Pending: {{5}}\n- In progress: {{6}}\n\nView full reports:\n- Activity Report: {{7}}\n- Complaints Report: {{8}}\n\nGenerated at {{9}}'
WHERE template_key = 'daily_report' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nPending Complaint Alert\n\nComplaint ID: {{1}}\nResident: {{2}} (Apt {{3}})\nCategory: {{4}}\nType: {{5}}\nDescription: {{6}}\n\nRegistered: {{7}}\nPending for: {{8}} hours\n\nView in admin panel:\n{{9}}'
WHERE template_key = 'pending_complaint' AND message_body_draft IS NULL;


-- ============================================
-- PART 10: ENABLE REALTIME
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
-- PART 11: SUPABASE STORAGE BUCKETS
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
-- PART 12: VERIFICATION
-- ============================================

-- Verify all 30 tables were created
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
    'visitor_passes', 'parcels', 'broadcast_logs',
    'payment_methods', 'payment_verifications',
    'bot_messages', 'whatsapp_templates',
    'enabled_languages', 'bot_message_translations',
    'bot_sessions',
    'amenities', 'prayer_times', 'prayer_times_settings',
    'menu_options', 'menu_option_translations'
  )
ORDER BY table_name;

-- Verify RLS is enabled on all 30 tables
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
    'visitor_passes', 'parcels', 'broadcast_logs',
    'payment_methods', 'payment_verifications',
    'bot_messages', 'whatsapp_templates',
    'enabled_languages', 'bot_message_translations',
    'bot_sessions',
    'amenities', 'prayer_times', 'prayer_times_settings',
    'menu_options', 'menu_option_translations'
  )
ORDER BY tablename;

-- Verify seed data counts
SELECT 'bot_messages' as table_name, COUNT(*) as row_count FROM bot_messages
UNION ALL
SELECT 'whatsapp_templates', COUNT(*) FROM whatsapp_templates
UNION ALL
SELECT 'expense_categories', COUNT(*) FROM expense_categories
UNION ALL
SELECT 'booking_settings', COUNT(*) FROM booking_settings
UNION ALL
SELECT 'amenities', COUNT(*) FROM amenities
UNION ALL
SELECT 'prayer_times', COUNT(*) FROM prayer_times
UNION ALL
SELECT 'menu_options', COUNT(*) FROM menu_options;

-- Final status
SELECT
  'Manzhil by Scrift - Database setup complete!' as status,
  '30 tables created with RLS, triggers, and seed data' as summary,
  NOW() as completed_at;

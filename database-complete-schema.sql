-- ============================================
-- Greens Three BMS - Complete Database Schema
-- ============================================
-- This is the master SQL file containing ALL database setup commands.
-- Run this in your Supabase SQL Editor for a fresh installation.
--
-- Last Updated: 2026-01-15
-- 
-- Tables:
--   1. profiles - Resident/user information
--   2. maintenance_payments - Monthly maintenance fee tracking
--   3. booking_settings - Hall booking configuration
--   4. bookings - Hall booking records
--   5. complaints - Complaint tracking
--   6. feedback - Resident feedback
--   7. staff - Building staff records
--   8. daily_reports - Generated daily PDF reports
--   9. transactions - Unified income/expense tracking
--  10. expense_categories - Expense category definitions
--  11. expenses - Expense records
--
-- ============================================

-- ============================================
-- PART 1: DROP EXISTING TABLES (CLEAN SLATE)
-- ============================================
-- WARNING: This will DELETE ALL existing data!
-- Comment out this section if you want to preserve existing data.

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

-- ============================================
-- PART 2: CORE TABLES
-- ============================================

-- --------------------------------------------
-- 2.1 PROFILES TABLE
-- Stores resident/user information
-- --------------------------------------------
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  cnic TEXT,
  apartment_number TEXT,
  building_block TEXT,
  maintenance_charges NUMERIC DEFAULT 0,
  maintenance_paid BOOLEAN DEFAULT false,
  last_payment_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Indexes
CREATE INDEX idx_profiles_phone ON profiles(phone_number);
CREATE INDEX idx_profiles_apartment ON profiles(apartment_number);
CREATE INDEX idx_profiles_active ON profiles(is_active);

-- --------------------------------------------
-- 2.2 MAINTENANCE PAYMENTS TABLE
-- Tracks monthly maintenance charges per resident
-- --------------------------------------------
CREATE TABLE maintenance_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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

-- Enable RLS
ALTER TABLE maintenance_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Indexes
CREATE INDEX idx_maintenance_profile ON maintenance_payments(profile_id);
CREATE INDEX idx_maintenance_status ON maintenance_payments(status);
CREATE INDEX idx_maintenance_year_month ON maintenance_payments(year, month);

-- --------------------------------------------
-- 2.3 BOOKING SETTINGS TABLE
-- Configuration for hall booking system
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

-- Enable RLS
ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Insert default settings
INSERT INTO booking_settings (start_time, end_time, slot_duration_minutes, working_days, booking_charges)
VALUES ('08:00:00', '22:00:00', 60, ARRAY[1,2,3,4,5,6,7], 5000);

-- --------------------------------------------
-- 2.4 BOOKINGS TABLE
-- Hall booking records
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

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Indexes
CREATE INDEX idx_bookings_profile ON bookings(profile_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment ON bookings(payment_status);

-- --------------------------------------------
-- 2.5 COMPLAINTS TABLE
-- Resident complaint tracking
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

-- Enable RLS
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Indexes
CREATE INDEX idx_complaints_profile ON complaints(profile_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_category ON complaints(category);
CREATE INDEX idx_complaints_id ON complaints(complaint_id);
CREATE INDEX idx_complaints_group_key ON complaints(group_key);

-- --------------------------------------------
-- 2.6 FEEDBACK TABLE
-- Resident suggestions/feedback
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

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Indexes
CREATE INDEX idx_feedback_profile ON feedback(profile_id);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_created ON feedback(created_at DESC);

-- --------------------------------------------
-- 2.7 STAFF TABLE
-- Building staff records
-- --------------------------------------------
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnic TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Indexes
CREATE INDEX idx_staff_profile ON staff(profile_id);
CREATE INDEX idx_staff_cnic ON staff(cnic);
CREATE INDEX idx_staff_role ON staff(role);

-- --------------------------------------------
-- 2.8 DAILY REPORTS TABLE
-- Stores generated PDF reports
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

-- Enable RLS
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to daily reports"
  ON daily_reports FOR SELECT TO public
  USING (true);

CREATE POLICY "Allow service role to manage daily reports"
  ON daily_reports FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_daily_reports_date ON daily_reports(report_date DESC);
CREATE INDEX idx_daily_reports_type ON daily_reports(report_type);

-- ============================================
-- PART 3: ACCOUNTING MODULE TABLES
-- ============================================

-- --------------------------------------------
-- 3.1 TRANSACTIONS TABLE
-- Unified income/expense tracking
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

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Indexes
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_profile ON transactions(profile_id);
CREATE INDEX idx_transactions_reference ON transactions(reference_id);

-- --------------------------------------------
-- 3.2 EXPENSE CATEGORIES TABLE
-- Expense category definitions
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

-- Enable RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Insert default expense categories
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
-- 3.3 EXPENSES TABLE
-- Expense records
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

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Indexes
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_recurring ON expenses(is_recurring) WHERE is_recurring = true;

-- ============================================
-- PART 4: FUNCTIONS AND TRIGGERS
-- ============================================

-- --------------------------------------------
-- 4.1 UPDATE TIMESTAMP FUNCTION
-- Automatically updates updated_at column
-- --------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------
-- 4.2 GENERATE COMPLAINT ID FUNCTION
-- Auto-generates unique complaint IDs
-- --------------------------------------------
CREATE OR REPLACE FUNCTION generate_complaint_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.complaint_id IS NULL THEN
    NEW.complaint_id := 'CMP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------
-- 4.3 TRIGGERS FOR ALL TABLES
-- Auto-update updated_at on row changes
-- --------------------------------------------

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

-- Complaint ID auto-generation trigger
CREATE TRIGGER set_complaint_id
  BEFORE INSERT ON complaints
  FOR EACH ROW EXECUTE FUNCTION generate_complaint_id();

-- ============================================
-- PART 5: ENABLE REALTIME
-- ============================================
-- Enable realtime notifications for admin panel

ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE staff;
ALTER PUBLICATION supabase_realtime ADD TABLE booking_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE expense_categories;

-- ============================================
-- PART 6: VERIFICATION
-- ============================================

-- Verify all tables were created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'profiles', 'maintenance_payments', 'booking_settings', 'bookings', 
    'complaints', 'feedback', 'staff', 'daily_reports',
    'transactions', 'expense_categories', 'expenses'
  )
ORDER BY table_name;

-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'maintenance_payments', 'booking_settings', 'bookings', 
    'complaints', 'feedback', 'staff', 'daily_reports',
    'transactions', 'expense_categories', 'expenses'
  )
ORDER BY tablename;

-- Final status
SELECT 
  'Greens Three BMS - Database setup complete!' as status,
  '11 tables created with RLS enabled' as summary,
  NOW() as completed_at;

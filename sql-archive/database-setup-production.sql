-- ============================================
-- Greens Three BMS - PRODUCTION Database Setup Script
-- ============================================
-- Run this in your Supabase SQL Editor
-- This will DROP all existing tables and create fresh ones
-- WARNING: This will DELETE ALL existing data!

-- ============================================
-- DROP ALL EXISTING TABLES (FRESH START)
-- ============================================
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS maintenance_payments CASCADE;
DROP TABLE IF EXISTS booking_settings CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
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

-- Allow service role (backend/admin) full access
CREATE POLICY "Service role has full access to profiles"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon role (frontend) full access for admin panel
CREATE POLICY "Anon role has full access to profiles"
  ON profiles
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Explicit SELECT policy for realtime
CREATE POLICY "Anon can read all profiles for realtime"
  ON profiles
  FOR SELECT
  TO anon
  USING (true);

-- Public role SELECT policy for realtime
CREATE POLICY "Public can select profiles"
  ON profiles FOR SELECT TO public USING (true);

-- Create indexes
CREATE INDEX idx_profiles_phone ON profiles(phone_number);
CREATE INDEX idx_profiles_apartment ON profiles(apartment_number);
CREATE INDEX idx_profiles_active ON profiles(is_active);

-- ============================================
-- 2. MAINTENANCE PAYMENTS TABLE
-- ============================================
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

-- Allow service role full access
CREATE POLICY "Service role has full access to maintenance_payments"
  ON maintenance_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon role access - separate policies for realtime
CREATE POLICY "Anon can select maintenance_payments"
  ON maintenance_payments FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert maintenance_payments"
  ON maintenance_payments FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update maintenance_payments"
  ON maintenance_payments FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete maintenance_payments"
  ON maintenance_payments FOR DELETE TO anon USING (true);

-- Public role SELECT policy for realtime
CREATE POLICY "Public can select maintenance_payments"
  ON maintenance_payments FOR SELECT TO public USING (true);

-- Create indexes
CREATE INDEX idx_maintenance_profile ON maintenance_payments(profile_id);
CREATE INDEX idx_maintenance_status ON maintenance_payments(status);
CREATE INDEX idx_maintenance_year_month ON maintenance_payments(year, month);

-- ============================================
-- 3. BOOKING SETTINGS TABLE
-- ============================================
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

-- Allow service role full access
CREATE POLICY "Service role has full access to booking_settings"
  ON booking_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon role access - separate policies for realtime
CREATE POLICY "Anon can select booking_settings"
  ON booking_settings FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert booking_settings"
  ON booking_settings FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update booking_settings"
  ON booking_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete booking_settings"
  ON booking_settings FOR DELETE TO anon USING (true);

-- Public role SELECT policy for realtime
CREATE POLICY "Public can select booking_settings"
  ON booking_settings FOR SELECT TO public USING (true);

-- Insert default settings
INSERT INTO booking_settings (start_time, end_time, slot_duration_minutes, working_days, booking_charges)
VALUES ('08:00:00', '22:00:00', 60, ARRAY[1,2,3,4,5,6,7], 5000);

-- ============================================
-- 4. BOOKINGS TABLE
-- ============================================
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

-- Allow service role full access
CREATE POLICY "Service role has full access to bookings"
  ON bookings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon role access - separate policies for realtime
CREATE POLICY "Anon can select bookings"
  ON bookings FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert bookings"
  ON bookings FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update bookings"
  ON bookings FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete bookings"
  ON bookings FOR DELETE TO anon USING (true);

-- Public role SELECT policy for realtime
CREATE POLICY "Public can select bookings"
  ON bookings FOR SELECT TO public USING (true);

-- Create indexes
CREATE INDEX idx_bookings_profile ON bookings(profile_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment ON bookings(payment_status);

-- ============================================
-- 5. COMPLAINTS TABLE
-- ============================================
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

-- Allow service role full access
CREATE POLICY "Service role has full access to complaints"
  ON complaints
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon role access - separate policies for realtime
CREATE POLICY "Anon can select complaints"
  ON complaints FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert complaints"
  ON complaints FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update complaints"
  ON complaints FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete complaints"
  ON complaints FOR DELETE TO anon USING (true);

-- Public role SELECT policy for realtime
CREATE POLICY "Public can select complaints"
  ON complaints FOR SELECT TO public USING (true);

-- Create indexes
CREATE INDEX idx_complaints_profile ON complaints(profile_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_category ON complaints(category);
CREATE INDEX idx_complaints_id ON complaints(complaint_id);
CREATE INDEX idx_complaints_group_key ON complaints(group_key);

-- ============================================
-- 6. FEEDBACK TABLE
-- ============================================
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

-- Allow service role full access
CREATE POLICY "Service role has full access to feedback"
  ON feedback
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon role access - separate policies for realtime
CREATE POLICY "Anon can select feedback"
  ON feedback FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert feedback"
  ON feedback FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update feedback"
  ON feedback FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete feedback"
  ON feedback FOR DELETE TO anon USING (true);

-- Public role SELECT policy for realtime
CREATE POLICY "Public can select feedback"
  ON feedback FOR SELECT TO public USING (true);

-- Create indexes
CREATE INDEX idx_feedback_profile ON feedback(profile_id);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_created ON feedback(created_at DESC);

-- ============================================
-- 7. STAFF TABLE
-- ============================================
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

-- Allow service role full access
CREATE POLICY "Service role has full access to staff"
  ON staff
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon role access - separate policies for realtime
CREATE POLICY "Anon can select staff"
  ON staff FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert staff"
  ON staff FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update staff"
  ON staff FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete staff"
  ON staff FOR DELETE TO anon USING (true);

-- Public role SELECT policy for realtime
CREATE POLICY "Public can select staff"
  ON staff FOR SELECT TO public USING (true);

-- Create indexes
CREATE INDEX idx_staff_profile ON staff(profile_id);
CREATE INDEX idx_staff_cnic ON staff(cnic);
CREATE INDEX idx_staff_role ON staff(role);

-- ============================================
-- 8. FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to all tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_payments_updated_at
  BEFORE UPDATE ON maintenance_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_settings_updated_at
  BEFORE UPDATE ON booking_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. GENERATE COMPLAINT ID FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION generate_complaint_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.complaint_id IS NULL THEN
    NEW.complaint_id := 'CMP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_complaint_id
  BEFORE INSERT ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION generate_complaint_id();

-- ============================================
-- 10. ENABLE REALTIME FOR ALL TABLES
-- ============================================

-- Enable realtime notifications for admin panel
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE staff;
ALTER PUBLICATION supabase_realtime ADD TABLE booking_settings;

-- ============================================
-- SETUP COMPLETE
-- ============================================

-- Verify tables were created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('profiles', 'maintenance_payments', 'booking_settings', 'bookings', 'complaints', 'feedback', 'staff')
ORDER BY table_name;

-- Show RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'maintenance_payments', 'booking_settings', 'bookings', 'complaints', 'feedback', 'staff')
ORDER BY tablename;

-- Show summary
SELECT 
  'Production database setup complete!' as status,
  'RLS is ENABLED on all tables' as security_status,
  'Both service_role and anon have full access' as access_level;

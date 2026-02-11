-- ============================================
-- Units Table Migration
-- Creates a first-class units table to own apartment-level data
-- Maintenance moves to the unit. Resident-initiated actions stay on profile_id.
-- ============================================

-- 1. Create units table
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_number TEXT UNIQUE NOT NULL,
  floor_number TEXT,
  unit_type TEXT,
  maintenance_charges INTEGER DEFAULT 5000,
  maintenance_paid BOOLEAN DEFAULT false,
  last_payment_date TEXT,
  is_occupied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Populate units from existing profiles (dedupe by apartment_number)
--    Take maintenance data from the primary resident (or first active)
INSERT INTO units (apartment_number, maintenance_charges, maintenance_paid, last_payment_date, is_occupied)
SELECT DISTINCT ON (apartment_number)
  apartment_number,
  COALESCE(maintenance_charges, 5000),
  COALESCE(maintenance_paid, false),
  last_payment_date,
  true
FROM profiles
WHERE apartment_number IS NOT NULL AND apartment_number != ''
ORDER BY apartment_number, is_primary_resident DESC, is_active DESC, created_at ASC;

-- 3. Add unit_id FK to profiles, populate from matching apartment_number
ALTER TABLE profiles ADD COLUMN unit_id UUID REFERENCES units(id);
UPDATE profiles SET unit_id = units.id FROM units WHERE profiles.apartment_number = units.apartment_number;

-- 4. Add unit_id FK to maintenance_payments, populate via profiles join
ALTER TABLE maintenance_payments ADD COLUMN unit_id UUID REFERENCES units(id);
UPDATE maintenance_payments mp SET unit_id = p.unit_id FROM profiles p WHERE mp.profile_id = p.id;

-- 5. Update is_occupied based on active profiles
UPDATE units SET is_occupied = EXISTS (
  SELECT 1 FROM profiles WHERE profiles.unit_id = units.id AND profiles.is_active = true
);

-- 6. Enable RLS on units table
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access to units" ON units FOR ALL USING (true);
CREATE POLICY "Allow anon read access to units" ON units FOR SELECT USING (true);

-- 7. Create indexes
CREATE INDEX idx_units_apartment_number ON units(apartment_number);
CREATE INDEX idx_profiles_unit_id ON profiles(unit_id);
CREATE INDEX idx_maintenance_payments_unit_id ON maintenance_payments(unit_id);

-- ============================================
-- Verification queries (run after migration):
-- SELECT count(*) FROM units;
-- SELECT id, name, apartment_number, unit_id FROM profiles LIMIT 10;
-- SELECT id, profile_id, unit_id FROM maintenance_payments LIMIT 10;
-- ============================================

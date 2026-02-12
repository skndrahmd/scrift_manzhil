-- Migration: Link staff to units instead of profiles
-- This migrates the staff table FK from profile_id → unit_id
-- so all residents of a unit share one staff list.

BEGIN;

-- Add unit_id column (nullable initially)
ALTER TABLE staff ADD COLUMN unit_id UUID;

-- Populate unit_id from each staff member's associated profile
UPDATE staff s SET unit_id = p.unit_id FROM profiles p WHERE s.profile_id = p.id;

-- Delete orphaned records (profile had no unit_id)
DELETE FROM staff WHERE unit_id IS NULL;

-- Make NOT NULL, add FK
ALTER TABLE staff ALTER COLUMN unit_id SET NOT NULL;
ALTER TABLE staff ADD CONSTRAINT staff_unit_id_fkey
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE;

-- Drop old column + index, create new index
DROP INDEX IF EXISTS idx_staff_profile;
ALTER TABLE staff DROP COLUMN profile_id;
CREATE INDEX idx_staff_unit ON staff(unit_id);

COMMIT;

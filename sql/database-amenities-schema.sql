-- ============================================================
-- Amenities Schema
-- Stores building amenities (gym, pool, etc.) with timings
-- Run in Supabase SQL Editor
-- ============================================================

-- Table: amenities
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

-- Index for sorting
CREATE INDEX IF NOT EXISTS idx_amenities_sort_order ON amenities(sort_order);
CREATE INDEX IF NOT EXISTS idx_amenities_active ON amenities(is_active);

-- RLS policies
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (admin operations bypass RLS via supabaseAdmin)
CREATE POLICY "Service role full access on amenities"
  ON amenities FOR ALL
  USING (true) WITH CHECK (true);

-- Anon can read active amenities
CREATE POLICY "Anon can read active amenities"
  ON amenities FOR SELECT
  USING (is_active = true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_amenities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_amenities_updated_at
  BEFORE UPDATE ON amenities
  FOR EACH ROW
  EXECUTE FUNCTION update_amenities_updated_at();

-- Seed default amenities
INSERT INTO amenities (name, is_active, is_under_maintenance, open_time, close_time, sort_order)
VALUES
  ('Gym', true, false, '06:00:00', '22:00:00', 1),
  ('Swimming Pool', true, false, '06:00:00', '20:00:00', 2),
  ('Snooker Room', true, false, '10:00:00', '22:00:00', 3),
  ('Play Area', true, false, '08:00:00', '21:00:00', 4),
  ('Jogging Track', true, false, '05:00:00', '22:00:00', 5)
ON CONFLICT DO NOTHING;

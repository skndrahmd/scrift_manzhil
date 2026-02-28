-- ============================================================
-- Prayer Times Schema
-- Stores prayer times for the Amenities > Prayer Times feature
-- Run in Supabase SQL Editor
-- ============================================================

-- Table: prayer_times
-- Stores the 5 daily prayers with their times
CREATE TABLE IF NOT EXISTS prayer_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_name TEXT NOT NULL UNIQUE,  -- Fajr, Zuhr, Asr, Maghrib, Isha
  prayer_time TIME,                  -- Single time (not duration)
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: prayer_times_settings
-- Stores the master enable/disable toggle (single row)
CREATE TABLE IF NOT EXISTS prayer_times_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- Ensures only one row
  is_enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prayer_times_sort_order ON prayer_times(sort_order);

-- RLS policies
ALTER TABLE prayer_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_times_settings ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access on prayer_times"
  ON prayer_times FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on prayer_times_settings"
  ON prayer_times_settings FOR ALL
  USING (true) WITH CHECK (true);

-- Anon can read prayer times
CREATE POLICY "Anon can read prayer_times"
  ON prayer_times FOR SELECT
  USING (true);

CREATE POLICY "Anon can read prayer_times_settings"
  ON prayer_times_settings FOR SELECT
  USING (true);

-- Trigger for updated_at on prayer_times
CREATE OR REPLACE FUNCTION update_prayer_times_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prayer_times_updated_at
  BEFORE UPDATE ON prayer_times
  FOR EACH ROW
  EXECUTE FUNCTION update_prayer_times_updated_at();

-- Trigger for updated_at on prayer_times_settings
CREATE OR REPLACE FUNCTION update_prayer_times_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prayer_times_settings_updated_at
  BEFORE UPDATE ON prayer_times_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_prayer_times_settings_updated_at();

-- Seed default prayer times (times are examples, admin will update)
INSERT INTO prayer_times (prayer_name, prayer_time, sort_order) VALUES
  ('Fajr', '05:30:00', 1),
  ('Zuhr', '13:00:00', 2),
  ('Asr', '16:30:00', 3),
  ('Maghrib', '18:30:00', 4),
  ('Isha', '20:00:00', 5)
ON CONFLICT (prayer_name) DO NOTHING;

-- Seed default settings (disabled by default)
INSERT INTO prayer_times_settings (is_enabled) VALUES (false)
ON CONFLICT (id) DO NOTHING;

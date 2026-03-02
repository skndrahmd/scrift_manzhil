-- ============================================
-- Prayer Time Translations Table
-- ============================================
-- Stores translated prayer names for each prayer per language.
-- When a new language is added, all prayer names are auto-translated.
-- When a prayer name is changed, its translations are marked stale.
--
-- Run this in Supabase SQL Editor after database-prayer-times-schema.sql.
-- ============================================

-- Create the table
CREATE TABLE IF NOT EXISTS prayer_time_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_time_id UUID NOT NULL REFERENCES prayer_times(id) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL REFERENCES enabled_languages(language_code) ON DELETE CASCADE,
  translated_name TEXT NOT NULL,
  is_stale BOOLEAN DEFAULT false,
  is_auto_translated BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(prayer_time_id, language_code)
);

-- Enable RLS
ALTER TABLE prayer_time_translations ENABLE ROW LEVEL SECURITY;

-- Service role full access (admin operations bypass RLS)
CREATE POLICY "Service role full access on prayer_time_translations"
  ON prayer_time_translations FOR ALL
  USING (true) WITH CHECK (true);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_prayer_trans_lang ON prayer_time_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_prayer_trans_prayer ON prayer_time_translations(prayer_time_id);
CREATE INDEX IF NOT EXISTS idx_prayer_trans_stale ON prayer_time_translations(is_stale);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_prayer_trans_updated_at ON prayer_time_translations;
CREATE TRIGGER update_prayer_trans_updated_at
  BEFORE UPDATE ON prayer_time_translations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Function: Mark translations stale when prayer name changes
-- ============================================
-- When a prayer's name is updated, mark all its translations as stale
-- so they can be retranslated.

CREATE OR REPLACE FUNCTION mark_prayer_time_translations_stale()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.prayer_name IS DISTINCT FROM NEW.prayer_name THEN
    UPDATE prayer_time_translations
    SET is_stale = true, updated_at = now()
    WHERE prayer_time_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on prayer_times table
DROP TRIGGER IF EXISTS trigger_mark_prayer_translations_stale ON prayer_times;
CREATE TRIGGER trigger_mark_prayer_translations_stale
  AFTER UPDATE OF prayer_name ON prayer_times
  FOR EACH ROW
  EXECUTE FUNCTION mark_prayer_time_translations_stale();

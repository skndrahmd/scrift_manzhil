-- ============================================
-- Amenity Translations Table
-- ============================================
-- Stores translated names for each amenity per language.
-- When a new language is added, all amenity names are auto-translated.
-- When an amenity name is changed, its translations are marked stale.
--
-- Run this in Supabase SQL Editor after database-amenities-schema.sql.
-- ============================================

-- Create the table
CREATE TABLE IF NOT EXISTS amenity_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amenity_id UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL REFERENCES enabled_languages(language_code) ON DELETE CASCADE,
  translated_name TEXT NOT NULL,
  is_stale BOOLEAN DEFAULT false,
  is_auto_translated BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(amenity_id, language_code)
);

-- Enable RLS
ALTER TABLE amenity_translations ENABLE ROW LEVEL SECURITY;

-- Service role full access (admin operations bypass RLS)
CREATE POLICY "Service role full access on amenity_translations"
  ON amenity_translations FOR ALL
  USING (true) WITH CHECK (true);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_amenity_trans_lang ON amenity_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_amenity_trans_amenity ON amenity_translations(amenity_id);
CREATE INDEX IF NOT EXISTS idx_amenity_trans_stale ON amenity_translations(is_stale);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_amenity_trans_updated_at ON amenity_translations;
CREATE TRIGGER update_amenity_trans_updated_at
  BEFORE UPDATE ON amenity_translations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Function: Mark translations stale when name changes
-- ============================================
-- When an amenity's name is updated, mark all its translations as stale
-- so they can be retranslated.

CREATE OR REPLACE FUNCTION mark_amenity_translations_stale()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    UPDATE amenity_translations
    SET is_stale = true, updated_at = now()
    WHERE amenity_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on amenities table
DROP TRIGGER IF EXISTS trigger_mark_amenity_translations_stale ON amenities;
CREATE TRIGGER trigger_mark_amenity_translations_stale
  AFTER UPDATE OF name ON amenities
  FOR EACH ROW
  EXECUTE FUNCTION mark_amenity_translations_stale();

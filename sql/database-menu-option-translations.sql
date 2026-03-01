-- ============================================
-- Menu Option Translations Table
-- ============================================
-- Stores translated labels for each menu option per language.
-- When a new language is added, all menu_options labels are auto-translated.
-- When a menu option label is changed, its translations are marked stale.
--
-- Run this in Supabase SQL Editor after database-menu-options-schema.sql.
-- ============================================

-- Create the table
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

-- Enable RLS
ALTER TABLE menu_option_translations ENABLE ROW LEVEL SECURITY;

-- Service role full access (admin operations bypass RLS)
CREATE POLICY "Service role full access on menu_option_translations"
  ON menu_option_translations FOR ALL
  USING (true) WITH CHECK (true);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_menu_opt_trans_lang ON menu_option_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_menu_opt_trans_option ON menu_option_translations(menu_option_id);
CREATE INDEX IF NOT EXISTS idx_menu_opt_trans_stale ON menu_option_translations(is_stale);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_menu_opt_trans_updated_at ON menu_option_translations;
CREATE TRIGGER update_menu_opt_trans_updated_at
  BEFORE UPDATE ON menu_option_translations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Function: Mark translations stale when label changes
-- ============================================
-- When a menu_option's label is updated, mark all its translations as stale
-- so they can be retranslated.

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

-- Trigger on menu_options table
DROP TRIGGER IF EXISTS trigger_mark_translations_stale ON menu_options;
CREATE TRIGGER trigger_mark_translations_stale
  AFTER UPDATE OF label ON menu_options
  FOR EACH ROW
  EXECUTE FUNCTION mark_menu_option_translations_stale();

-- ============================================
-- Grant permissions (if needed)
-- ============================================
-- The service_role key bypasses RLS, so no additional grants needed
-- for admin operations. This is for documentation purposes.

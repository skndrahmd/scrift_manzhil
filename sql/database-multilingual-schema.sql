-- Multilingual chatbot support tables
-- Run in Supabase SQL Editor

-- Table: enabled_languages
CREATE TABLE IF NOT EXISTS enabled_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code VARCHAR(10) NOT NULL UNIQUE,
  language_name VARCHAR(100) NOT NULL,
  native_name VARCHAR(100),
  is_enabled BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: bot_message_translations
CREATE TABLE IF NOT EXISTS bot_message_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_key VARCHAR(100) NOT NULL REFERENCES bot_messages(message_key) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL REFERENCES enabled_languages(language_code) ON DELETE CASCADE,
  translated_text TEXT NOT NULL,
  is_auto_translated BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES admin_users(id),
  UNIQUE(message_key, language_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_translations_language ON bot_message_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_translations_key ON bot_message_translations(message_key);
CREATE INDEX IF NOT EXISTS idx_enabled_languages_enabled ON enabled_languages(is_enabled);

-- RLS policies
ALTER TABLE enabled_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_message_translations ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (admin operations bypass RLS via supabaseAdmin)
CREATE POLICY "Service role full access on enabled_languages"
  ON enabled_languages FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on bot_message_translations"
  ON bot_message_translations FOR ALL
  USING (auth.role() = 'service_role');

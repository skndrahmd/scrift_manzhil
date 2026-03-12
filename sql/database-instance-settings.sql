-- Instance Settings Table
-- Stores configurable instance-level settings (timezone, currency, etc.)
-- These settings allow each Manzhil instance to be customized without redeployment.

CREATE TABLE IF NOT EXISTS instance_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,
  value       text NOT NULL,
  description text,
  updated_at  timestamptz DEFAULT now(),
  updated_by  uuid REFERENCES admin_users(id) ON DELETE SET NULL
);

ALTER TABLE instance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON instance_settings
  FOR ALL USING (true) WITH CHECK (true);

INSERT INTO instance_settings (key, value, description) VALUES
  ('timezone',        'Asia/Karachi',  'IANA timezone identifier'),
  ('currency_code',   'PKR',           'ISO 4217 currency code'),
  ('currency_symbol', 'Rs.',           'Currency symbol for display')
ON CONFLICT (key) DO NOTHING;

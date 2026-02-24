-- ============================================
-- PAYMENT METHODS TABLE
-- Stores configurable payment methods (JazzCash, EasyPaisa, Bank Transfer)
-- for the payment receipt system.
-- Run this in Supabase SQL Editor.
-- ============================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('jazzcash', 'easypaisa', 'bank_transfer')),
  account_title TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON payment_methods FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_payment_methods_is_enabled ON payment_methods(is_enabled);
CREATE INDEX IF NOT EXISTS idx_payment_methods_sort_order ON payment_methods(sort_order);

COMMENT ON TABLE payment_methods IS 'Configurable payment methods for the payment receipt system';

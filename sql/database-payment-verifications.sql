-- ============================================
-- Payment Verifications Table
-- Tracks resident-submitted payment receipts for admin verification.
-- ============================================

CREATE TABLE IF NOT EXISTS payment_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('maintenance', 'booking')),
  maintenance_payment_id UUID REFERENCES maintenance_payments(id),
  booking_id UUID REFERENCES bookings(id),
  unit_id UUID NOT NULL REFERENCES units(id),
  resident_id UUID NOT NULL REFERENCES profiles(id),
  payment_method_id UUID REFERENCES payment_methods(id),
  amount DECIMAL NOT NULL,
  receipt_image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES admin_users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payment_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on payment_verifications"
  ON payment_verifications FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_payment_verifications_status ON payment_verifications(status);
CREATE INDEX idx_payment_verifications_resident ON payment_verifications(resident_id);
CREATE INDEX idx_payment_verifications_unit ON payment_verifications(unit_id);

COMMENT ON TABLE payment_verifications IS 'Resident-submitted payment receipts pending admin verification';

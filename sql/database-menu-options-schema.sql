-- ============================================
-- Menu Options Table
-- ============================================
-- Stores WhatsApp bot main menu options with dynamic ordering,
-- enable/disable toggle, and editable labels.
--
-- Run this in Supabase SQL Editor after the main schema.
-- Idempotent: uses IF NOT EXISTS and ON CONFLICT DO NOTHING.
-- ============================================

-- Create the table
CREATE TABLE IF NOT EXISTS menu_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(200) NOT NULL,
  emoji VARCHAR(10) NOT NULL DEFAULT '📋',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  handler_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE menu_options ENABLE ROW LEVEL SECURITY;

-- Service role full access (admin operations bypass RLS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'menu_options' AND policyname = 'Service role full access on menu_options'
  ) THEN
    CREATE POLICY "Service role full access on menu_options"
      ON menu_options FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_menu_options_sort ON menu_options(sort_order);
CREATE INDEX IF NOT EXISTS idx_menu_options_enabled ON menu_options(is_enabled);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_menu_options_updated_at ON menu_options;
CREATE TRIGGER update_menu_options_updated_at
  BEFORE UPDATE ON menu_options
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Seed Data: Default 12 menu options
-- ============================================
-- Maps each option to its handler_type which the router uses to dispatch.
-- handler_type values:
--   "complaint"           → initializeComplaintFlow
--   "status"              → initializeStatusFlow
--   "cancel"              → initializeCancelFlow
--   "staff"               → initializeStaffFlow
--   "maintenance_status"  → getMaintenanceStatus (direct menu function)
--   "hall"                → initializeHallFlow
--   "visitor"             → initializeVisitorFlow
--   "profile_info"        → getProfileInfo (direct menu function)
--   "feedback"            → initializeFeedbackFlow
--   "emergency_contacts"  → getEmergencyContacts (direct menu function)
--   "payment"             → initializePaymentFlow
--   "amenity"             → initializeAmenityFlow

INSERT INTO menu_options (action_key, label, emoji, is_enabled, sort_order, handler_type) VALUES
  ('register_complaint',    'Register Complaint',      '📝', true,  1,  'complaint'),
  ('check_status',          'Check Complaint Status',  '🔍', true,  2,  'status'),
  ('cancel_complaint',      'Cancel Complaint',        '❌', true,  3,  'cancel'),
  ('staff_management',      'My Staff Management',     '👥', true,  4,  'staff'),
  ('maintenance_dues',      'Check Maintenance Dues',  '💰', true,  5,  'maintenance_status'),
  ('community_hall',        'Community Hall',           '🏛️', true,  6,  'hall'),
  ('visitor_pass',          'Visitor Entry Pass',      '🎫', true,  7,  'visitor'),
  ('view_profile',          'View My Profile',         '👤', true,  8,  'profile_info'),
  ('feedback',              'Suggestions/Feedback',    '💬', true,  9,  'feedback'),
  ('emergency_contacts',    'Emergency Contacts',      '🆘', true,  10, 'emergency_contacts'),
  ('submit_payment',        'Submit Payment',          '💳', true,  11, 'payment'),
  ('amenities',             'Amenities',               '🏟️', true,  12, 'amenity')
ON CONFLICT (action_key) DO NOTHING;

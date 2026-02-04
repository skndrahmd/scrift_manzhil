-- ============================================
-- Admin RBAC Migration
-- Role-Based Access Control for Admin Panel
-- ============================================

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE,  -- Links to Supabase auth.users
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone_number TEXT,  -- For WhatsApp notifications
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin', 'staff')),
  is_active BOOLEAN DEFAULT true,
  receive_complaint_notifications BOOLEAN DEFAULT false,
  receive_reminder_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for admin_users
CREATE INDEX IF NOT EXISTS idx_admin_users_auth_id ON admin_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_notifications ON admin_users(receive_complaint_notifications)
  WHERE receive_complaint_notifications = true;
CREATE INDEX IF NOT EXISTS idx_admin_users_reminder_notifications ON admin_users(receive_reminder_notifications)
  WHERE receive_reminder_notifications = true;

-- Create admin_permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  page_key TEXT NOT NULL,
  can_access BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(admin_user_id, page_key)
);

-- Create index for admin_permissions
CREATE INDEX IF NOT EXISTS idx_admin_permissions_user ON admin_permissions(admin_user_id);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users
-- Allow service role to do everything (bypasses RLS)
-- Allow authenticated users to read their own record
CREATE POLICY "Service role can manage admin_users" ON admin_users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read own admin record" ON admin_users
  FOR SELECT USING (auth.uid() = auth_user_id);

-- RLS Policies for admin_permissions
CREATE POLICY "Service role can manage admin_permissions" ON admin_permissions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read own permissions" ON admin_permissions
  FOR SELECT USING (
    admin_user_id IN (
      SELECT id FROM admin_users WHERE auth_user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS admin_users_updated_at ON admin_users;
CREATE TRIGGER admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();

-- ============================================
-- Page Keys Reference
-- ============================================
-- dashboard  - /admin/dashboard
-- residents  - /admin
-- bookings   - /admin/bookings
-- complaints - /admin/complaints
-- visitors   - /admin/visitors
-- parcels    - /admin/parcels
-- analytics  - /admin/analytics
-- feedback   - /admin/feedback
-- accounting - /admin/accounting
-- settings   - /admin/settings (super_admin only)

-- ============================================
-- Helper function to create initial super_admin
-- Run this manually after migration to set up the first admin
-- ============================================
-- Example:
-- INSERT INTO admin_users (auth_user_id, email, name, role, receive_complaint_notifications, receive_reminder_notifications)
-- VALUES (
--   'YOUR_AUTH_USER_ID_FROM_SUPABASE_AUTH_USERS',
--   'admin@example.com',
--   'Admin Name',
--   'super_admin',
--   true,
--   true
-- );

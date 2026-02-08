-- Migration: WhatsApp OTP Authentication
-- Description: Add admin_otp table and enforce phone_number on admin_users

-- 1. Create admin_otp table for OTP storage
CREATE TABLE IF NOT EXISTS admin_otp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast OTP lookups
CREATE INDEX IF NOT EXISTS idx_admin_otp_phone ON admin_otp(phone_number, used, expires_at);

-- 2. Make phone_number NOT NULL and UNIQUE on admin_users
-- NOTE: Before running this, ensure all existing admin_users have a phone_number set.
-- You can check with: SELECT id, name, phone_number FROM admin_users WHERE phone_number IS NULL;
-- Update any null values before proceeding.

ALTER TABLE admin_users ALTER COLUMN phone_number SET NOT NULL;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_phone_number_unique UNIQUE (phone_number);

-- 3. RLS policy for admin_otp (service role only - no direct client access)
ALTER TABLE admin_otp ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage OTPs (no policies = only service role can access)
-- This is intentional - OTPs should only be managed server-side.

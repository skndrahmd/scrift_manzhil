-- Migration: Add is_primary_resident column to profiles
-- Run this in Supabase SQL Editor

-- Add is_primary_resident column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_primary_resident BOOLEAN DEFAULT false;

-- Set existing residents as primary (earliest-created per apartment)
WITH ranked AS (
  SELECT id, apartment_number,
    ROW_NUMBER() OVER (PARTITION BY apartment_number ORDER BY created_at ASC) as rn
  FROM profiles
  WHERE is_active = true
)
UPDATE profiles SET is_primary_resident = true
WHERE id IN (SELECT id FROM ranked WHERE rn = 1);

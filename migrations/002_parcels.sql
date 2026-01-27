-- Parcels table for tracking package deliveries
-- Run this migration in Supabase SQL Editor

CREATE TABLE parcels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    description TEXT,
    sender_name TEXT,
    courier_name TEXT,
    image_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'returned')),
    notified_at TIMESTAMPTZ,
    collected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_parcels_resident_id ON parcels(resident_id);
CREATE INDEX idx_parcels_status ON parcels(status);
CREATE INDEX idx_parcels_created_at ON parcels(created_at DESC);

-- Enable RLS
ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access (for admin operations)
CREATE POLICY "Service role full access" ON parcels
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_parcels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_parcels_updated_at
    BEFORE UPDATE ON parcels
    FOR EACH ROW
    EXECUTE FUNCTION update_parcels_updated_at();

-- NOTE: You also need to create a Supabase Storage bucket called "parcels"
-- Go to Supabase Dashboard > Storage > New Bucket
-- Name: parcels
-- Public bucket: Yes (checked)
-- Allowed MIME types: image/*

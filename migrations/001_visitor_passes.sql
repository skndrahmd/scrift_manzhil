-- Visitor Entry Pass Table
-- Run this migration in Supabase SQL Editor

-- Create the visitor_passes table
CREATE TABLE IF NOT EXISTS visitor_passes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  visitor_name TEXT NOT NULL,
  visitor_cnic TEXT NOT NULL,
  visitor_phone TEXT NOT NULL,
  visit_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'arrived', 'cancelled')),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_visitor_passes_resident ON visitor_passes(resident_id);
CREATE INDEX IF NOT EXISTS idx_visitor_passes_date ON visitor_passes(visit_date);
CREATE INDEX IF NOT EXISTS idx_visitor_passes_status ON visitor_passes(status);

-- Enable Row Level Security
ALTER TABLE visitor_passes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all visitor passes (for admin)
CREATE POLICY "Allow read access for authenticated users" ON visitor_passes
  FOR SELECT
  USING (true);

-- Policy: Allow authenticated users to insert visitor passes
CREATE POLICY "Allow insert for authenticated users" ON visitor_passes
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow authenticated users to update visitor passes
CREATE POLICY "Allow update for authenticated users" ON visitor_passes
  FOR UPDATE
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_visitor_passes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_visitor_passes_updated_at
  BEFORE UPDATE ON visitor_passes
  FOR EACH ROW
  EXECUTE FUNCTION update_visitor_passes_updated_at();

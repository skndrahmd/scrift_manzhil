-- Visitor CNIC Image Migration
-- Add cnic_image_url column and make other fields optional

-- Add CNIC image URL column
ALTER TABLE visitor_passes
ADD COLUMN IF NOT EXISTS cnic_image_url TEXT;

-- Make visitor details optional (since we're only requiring image now)
ALTER TABLE visitor_passes
ALTER COLUMN visitor_name DROP NOT NULL;

ALTER TABLE visitor_passes
ALTER COLUMN visitor_cnic DROP NOT NULL;

ALTER TABLE visitor_passes
ALTER COLUMN visitor_phone DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN visitor_passes.cnic_image_url IS 'URL to the uploaded CNIC image in Supabase storage';

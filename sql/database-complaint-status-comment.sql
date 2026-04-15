-- Migration: Add status_change_comment to complaints table
-- Run this on existing instances to add the admin comment field for status changes.

ALTER TABLE complaints ADD COLUMN IF NOT EXISTS status_change_comment TEXT;

-- Update whatsapp_templates variables to include Admin Comment variable
-- complaint_in_progress: add variable 5 (Admin Comment)
UPDATE whatsapp_templates
SET variables = '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Subcategory","description":"Formatted complaint type","example":"Water Leakage"},{"key":"3","label":"Complaint ID","description":"Unique complaint identifier","example":"CMP-001"},{"key":"4","label":"Registered Time","description":"Time when complaint was registered","example":"January 15, 2026 10:30 AM"},{"key":"5","label":"Admin Comment","description":"Explanation from admin for the status change","example":"Issue has been escalated to the maintenance team"}]'::jsonb
WHERE template_key = 'complaint_in_progress';

-- complaint_completed: add variable 6 (Admin Comment, after resolved time)
UPDATE whatsapp_templates
SET variables = '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Subcategory","description":"Formatted complaint type","example":"Water Leakage"},{"key":"3","label":"Complaint ID","description":"Unique complaint identifier","example":"CMP-001"},{"key":"4","label":"Registered Time","description":"Time when complaint was registered","example":"January 15, 2026 10:30 AM"},{"key":"5","label":"Resolved Time","description":"Time when complaint was resolved","example":"January 16, 2026 3:00 PM"},{"key":"6","label":"Admin Comment","description":"Explanation from admin for the status change","example":"Pipe repaired and water restored"}]'::jsonb
WHERE template_key = 'complaint_completed';

-- complaint_rejected: add variable 5 (Admin Comment)
UPDATE whatsapp_templates
SET variables = '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Subcategory","description":"Formatted complaint type","example":"Water Leakage"},{"key":"3","label":"Complaint ID","description":"Unique complaint identifier","example":"CMP-001"},{"key":"4","label":"Registered Time","description":"Time when complaint was registered","example":"January 15, 2026 10:30 AM"},{"key":"5","label":"Admin Comment","description":"Explanation from admin for the status change","example":"Duplicate complaint, already resolved under CMP-099"}]'::jsonb
WHERE template_key = 'complaint_rejected';

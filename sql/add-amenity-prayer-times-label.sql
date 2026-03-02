-- ============================================
-- Add amenity.prayer_times_label message key
-- ============================================
-- Run this if you already have the bot_messages table seeded
-- and need to add the new Prayer Times label key.
-- ============================================

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
  ('amenity.prayer_times_label', 'amenity', 'Prayer Times Label', 'Label for Prayer Times option in amenity menu', 'Prayer Times', '[]'::jsonb, 6),
  ('prayer_times.display', 'prayer_times', 'Prayer Times Display', 'Shows all prayer times', E'🕌 *Prayer Times*\n\n{prayers}\n\nReply *0* for menu', '["prayers"]'::jsonb, 1),
  ('prayer_times.disabled', 'prayer_times', 'Prayer Times Disabled', 'Shown when prayer times are disabled', E'🕌 *Prayer Times*\n\nPrayer times are currently unavailable.\n\nReply *0* for menu', '[]'::jsonb, 2)
ON CONFLICT (message_key) DO NOTHING;
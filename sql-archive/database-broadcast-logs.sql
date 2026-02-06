-- ============================================
-- Broadcast Logs Table for Rate Limiting
-- ============================================
-- This table tracks all broadcast messages sent through the system
-- to enforce daily limits and cooldown periods between broadcasts.
--
-- Rate Limiting Settings:
-- - Daily message limit: 250 messages (for new WhatsApp accounts)
-- - Cooldown between broadcasts: 15 minutes
-- - Message delay: 3 seconds between messages
-- - Batch size: 20 messages per batch with 30s pause between batches

-- Create broadcast_logs table
CREATE TABLE IF NOT EXISTS broadcast_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  recipient_count INTEGER NOT NULL,
  success_count INTEGER NOT NULL,
  failed_count INTEGER NOT NULL,
  message_title TEXT,
  message_body TEXT,
  created_by TEXT
);

-- Index for efficient daily queries (used to check daily limits and cooldown)
CREATE INDEX IF NOT EXISTS idx_broadcast_logs_sent_at ON broadcast_logs(sent_at);

-- Enable Row Level Security
ALTER TABLE broadcast_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow admins to read all broadcast logs
CREATE POLICY "Allow admins to read broadcast logs"
  ON broadcast_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow service role to insert broadcast logs
CREATE POLICY "Allow service role to insert broadcast logs"
  ON broadcast_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE broadcast_logs IS 'Tracks broadcast messages for rate limiting and usage analytics';
COMMENT ON COLUMN broadcast_logs.sent_at IS 'Timestamp when the broadcast was sent';
COMMENT ON COLUMN broadcast_logs.recipient_count IS 'Total number of recipients attempted';
COMMENT ON COLUMN broadcast_logs.success_count IS 'Number of successfully sent messages';
COMMENT ON COLUMN broadcast_logs.failed_count IS 'Number of failed messages';
COMMENT ON COLUMN broadcast_logs.message_title IS 'Title/subject of the broadcast message';
COMMENT ON COLUMN broadcast_logs.message_body IS 'Body content of the broadcast message';
COMMENT ON COLUMN broadcast_logs.created_by IS 'Admin user who initiated the broadcast';

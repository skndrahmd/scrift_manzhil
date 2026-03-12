-- Session Windows Table
-- Tracks WhatsApp conversation session windows for cost optimization.
-- When a resident messages the bot, a 24h session opens (User-Initiated Conversation).
-- Outbound notifications within that window can use freeform messages instead of templates,
-- avoiding the higher Business-Initiated Conversation charge.

CREATE TABLE IF NOT EXISTS session_windows (
  phone_number TEXT PRIMARY KEY,
  last_inbound_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_session_windows_expires ON session_windows(session_expires_at);

ALTER TABLE session_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON session_windows
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Cron Job and Welcome Message Logs Schema
-- ============================================
-- Run this after database-complete-schema.sql
-- ============================================

-- ============================================
-- Cron Job Execution Logs
-- ============================================
-- Tracks all cron job executions with detailed results

CREATE TABLE IF NOT EXISTS cron_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'partial', 'failed', 'running')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  records_processed INTEGER DEFAULT 0,
  records_succeeded INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE cron_logs IS 'Tracks all cron job executions with detailed results';
COMMENT ON COLUMN cron_logs.job_name IS 'Name of the cron job (e.g., daily-reports, maintenance-reminder)';
COMMENT ON COLUMN cron_logs.status IS 'Execution status: success, partial, failed, or running';
COMMENT ON COLUMN cron_logs.result IS 'Detailed JSON result with job-specific data';

-- Indexes for cron_logs
CREATE INDEX IF NOT EXISTS idx_cron_logs_job_name ON cron_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_logs_status ON cron_logs(status);
CREATE INDEX IF NOT EXISTS idx_cron_logs_created_at ON cron_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_logs_started_at ON cron_logs(started_at DESC);

-- ============================================
-- Welcome Message Logs
-- ============================================
-- Tracks all welcome message attempts (bulk import, manual, resend)

CREATE TABLE IF NOT EXISTS welcome_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resident_name VARCHAR(255),
  phone_number VARCHAR(20) NOT NULL,
  apartment_number VARCHAR(50),
  status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  twilio_sid VARCHAR(100),
  triggered_by VARCHAR(50) NOT NULL CHECK (triggered_by IN ('bulk-import', 'manual', 'resend')),
  triggered_by_user VARCHAR(255),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE welcome_message_logs IS 'Tracks all welcome message attempts';
COMMENT ON COLUMN welcome_message_logs.triggered_by IS 'How the message was triggered: bulk-import, manual, or resend';
COMMENT ON COLUMN welcome_message_logs.twilio_sid IS 'Twilio message SID for tracking';

-- Indexes for welcome_message_logs
CREATE INDEX IF NOT EXISTS idx_welcome_logs_status ON welcome_message_logs(status);
CREATE INDEX IF NOT EXISTS idx_welcome_logs_sent_at ON welcome_message_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_welcome_logs_resident ON welcome_message_logs(resident_id);
CREATE INDEX IF NOT EXISTS idx_welcome_logs_phone ON welcome_message_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_welcome_logs_triggered_by ON welcome_message_logs(triggered_by);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE welcome_message_logs ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access on cron_logs"
  ON cron_logs FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on welcome_message_logs"
  ON welcome_message_logs FOR ALL
  USING (true) WITH CHECK (true);

-- Authenticated users can read logs (admin access checked in API routes)
CREATE POLICY "Authenticated users can read cron_logs"
  ON cron_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read welcome_message_logs"
  ON welcome_message_logs FOR SELECT
  TO authenticated
  USING (true);
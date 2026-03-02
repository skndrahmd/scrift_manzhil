-- ============================================
-- Maintenance Notification Logs Table
-- Tracks all maintenance-related WhatsApp notifications
-- for auditing and debugging purposes.
-- ============================================

-- --------------------------------------------
-- MAINTENANCE NOTIFICATION LOGS TABLE
-- Stores detailed logs of every maintenance
-- notification sent (invoices, reminders, confirmations)
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS maintenance_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES maintenance_payments(id) ON DELETE SET NULL,
  
  -- Type of notification
  notification_type TEXT NOT NULL CHECK (notification_type IN ('invoice', 'reminder', 'confirmation')),
  
  -- Status of the send attempt
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  
  -- Recipient details
  phone_number TEXT NOT NULL,
  recipient_name TEXT,
  amount NUMERIC,
  month_year TEXT, -- e.g., "January 2026"
  
  -- Trigger source
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('cron', 'manual')),
  triggered_by_user TEXT, -- Admin user ID for manual triggers
  
  -- Timestamps
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE maintenance_notification_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service role has full access to maintenance_notification_logs"
  ON maintenance_notification_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read maintenance_notification_logs"
  ON maintenance_notification_logs FOR SELECT TO authenticated
  USING (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_unit_id ON maintenance_notification_logs(unit_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_status ON maintenance_notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_notification_type ON maintenance_notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_triggered_by ON maintenance_notification_logs(triggered_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_sent_at ON maintenance_notification_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_created_at ON maintenance_notification_logs(created_at DESC);

-- Comment
COMMENT ON TABLE maintenance_notification_logs IS 'Tracks all maintenance-related WhatsApp notifications for auditing and debugging';
COMMENT ON COLUMN maintenance_notification_logs.notification_type IS 'Type: invoice (new month), reminder (overdue), confirmation (payment received)';
COMMENT ON COLUMN maintenance_notification_logs.triggered_by IS 'Source: cron (automatic) or manual (admin-triggered)';
COMMENT ON COLUMN maintenance_notification_logs.triggered_by_user IS 'Admin user ID who triggered the notification (for manual triggers)';

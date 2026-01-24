-- Create daily_reports table to store generated daily reports
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('24_hour', 'open_complaints')),
  complaints_count INTEGER DEFAULT 0,
  bookings_count INTEGER DEFAULT 0,
  open_complaints_count INTEGER DEFAULT 0,
  pending_count INTEGER DEFAULT 0,
  in_progress_count INTEGER DEFAULT 0,
  pdf_data TEXT NOT NULL, -- base64 encoded PDF
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on report_date for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(report_date DESC);

-- Create index on report_type
CREATE INDEX IF NOT EXISTS idx_daily_reports_type ON daily_reports(report_type);

-- Enable RLS
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for viewing reports via link)
CREATE POLICY "Allow public read access to daily reports"
  ON daily_reports
  FOR SELECT
  TO public
  USING (true);

-- Allow service role to insert/update
CREATE POLICY "Allow service role to manage daily reports"
  ON daily_reports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_daily_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_daily_reports_updated_at
  BEFORE UPDATE ON daily_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_reports_updated_at();

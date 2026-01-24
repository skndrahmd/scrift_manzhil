-- ============================================
-- Greens Three BMS - Accounting Module Database Setup
-- ============================================
-- Run this in your Supabase SQL Editor
-- This adds accounting tables to support financial tracking

-- ============================================
-- 1. TRANSACTIONS TABLE (Unified Income Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('booking_income', 'maintenance_income', 'expense', 'refund', 'other_income')),
  reference_id UUID,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'online', 'cheque', 'other')),
  receipt_number TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transactions
CREATE POLICY "Service role has full access to transactions"
  ON transactions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can select transactions"
  ON transactions FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert transactions"
  ON transactions FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update transactions"
  ON transactions FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete transactions"
  ON transactions FOR DELETE TO anon USING (true);

CREATE POLICY "Public can select transactions"
  ON transactions FOR SELECT TO public USING (true);

-- Indexes
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_profile ON transactions(profile_id);
CREATE INDEX idx_transactions_reference ON transactions(reference_id);

-- ============================================
-- 2. EXPENSE CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT 'folder',
  color TEXT DEFAULT '#6b7280',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role has full access to expense_categories"
  ON expense_categories FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can select expense_categories"
  ON expense_categories FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert expense_categories"
  ON expense_categories FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update expense_categories"
  ON expense_categories FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete expense_categories"
  ON expense_categories FOR DELETE TO anon USING (true);

CREATE POLICY "Public can select expense_categories"
  ON expense_categories FOR SELECT TO public USING (true);

-- Insert default expense categories
INSERT INTO expense_categories (name, description, icon, color) VALUES
  ('Utilities', 'Electricity, Water, Gas bills', 'zap', '#f59e0b'),
  ('Repairs & Maintenance', 'Building repairs and maintenance work', 'wrench', '#ef4444'),
  ('Security Services', 'Security guards and related expenses', 'shield', '#3b82f6'),
  ('Cleaning Services', 'Cleaning staff and supplies', 'sparkles', '#10b981'),
  ('Salaries', 'Staff salaries and wages', 'users', '#8b5cf6'),
  ('Administrative', 'Office supplies, printing, etc.', 'briefcase', '#6366f1'),
  ('Equipment', 'Tools, machinery, equipment purchases', 'settings', '#64748b'),
  ('Other', 'Miscellaneous expenses', 'more-horizontal', '#94a3b8')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  expense_date DATE NOT NULL,
  vendor_name TEXT,
  receipt_url TEXT,
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'online', 'cheque', 'other')),
  is_recurring BOOLEAN DEFAULT false,
  recurrence_interval TEXT CHECK (recurrence_interval IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_due_date DATE,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role has full access to expenses"
  ON expenses FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can select expenses"
  ON expenses FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert expenses"
  ON expenses FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update expenses"
  ON expenses FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete expenses"
  ON expenses FOR DELETE TO anon USING (true);

CREATE POLICY "Public can select expenses"
  ON expenses FOR SELECT TO public USING (true);

-- Indexes
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_recurring ON expenses(is_recurring) WHERE is_recurring = true;

-- ============================================
-- 4. UPDATE TRIGGERS
-- ============================================

-- Add triggers to update updated_at
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE expense_categories;

-- ============================================
-- 6. VERIFY SETUP
-- ============================================
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('transactions', 'expense_categories', 'expenses')
ORDER BY table_name;

SELECT 'Accounting module database setup complete!' as status;

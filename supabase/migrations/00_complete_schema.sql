-- =====================================================
-- THRIVE BUDGET APP - COMPLETE DATABASE SCHEMA
-- Per-Account Budgeting with Goal-Tracking Architecture
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
-- This table mirrors auth.users and acts as the foreign key target
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 2. ACCOUNTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'credit_card', 'investment', 'loan')),
  balance BIGINT NOT NULL DEFAULT 0, -- in cents
  institution TEXT,
  is_goal_tracking BOOLEAN NOT NULL DEFAULT FALSE, -- Flag for goal-tracking accounts
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
  ON accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
  ON accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_is_goal_tracking ON accounts(is_goal_tracking);

-- =====================================================
-- 3. BUDGETS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

-- RLS Policies
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budgets"
  ON budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets"
  ON budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON budgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
  ON budgets FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_month_year ON budgets(month, year);

-- =====================================================
-- 4. CATEGORY GROUPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS category_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_type TEXT NOT NULL DEFAULT 'expense' CHECK (category_type IN ('expense')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- RLS Policies
ALTER TABLE category_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own category groups"
  ON category_groups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own category groups"
  ON category_groups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own category groups"
  ON category_groups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own category groups"
  ON category_groups FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_category_groups_user_id ON category_groups(user_id);

-- =====================================================
-- 5. BUDGET CATEGORIES TABLE (Per-Account)
-- =====================================================
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_type TEXT NOT NULL DEFAULT 'expense' CHECK (category_type IN ('expense')),
  allocated_amount BIGINT NOT NULL DEFAULT 0, -- Monthly target in cents
  available_amount BIGINT NOT NULL DEFAULT 0, -- Cash in envelope in cents
  spent_amount BIGINT NOT NULL DEFAULT 0, -- Actual spending in cents
  category_group TEXT, -- Optional grouping (not FK - allows flexibility)
  sort_order INTEGER DEFAULT 0,
  due_date DATE, -- Optional due date for smart allocation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budget categories"
  ON budget_categories FOR SELECT
  USING (
    budget_id IN (
      SELECT id FROM budgets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own budget categories"
  ON budget_categories FOR INSERT
  WITH CHECK (
    budget_id IN (
      SELECT id FROM budgets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own budget categories"
  ON budget_categories FOR UPDATE
  USING (
    budget_id IN (
      SELECT id FROM budgets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own budget categories"
  ON budget_categories FOR DELETE
  USING (
    budget_id IN (
      SELECT id FROM budgets WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_budget_categories_budget_id ON budget_categories(budget_id);
CREATE INDEX idx_budget_categories_account_id ON budget_categories(account_id);
CREATE INDEX idx_budget_categories_category_group ON budget_categories(category_group);

-- =====================================================
-- 6. SAVINGS GOALS TABLE (Links to categories in goal-tracking accounts)
-- =====================================================
CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES budget_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount BIGINT NOT NULL, -- Target in cents
  target_date DATE,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own savings goals"
  ON savings_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own savings goals"
  ON savings_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own savings goals"
  ON savings_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own savings goals"
  ON savings_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX idx_savings_goals_category_id ON savings_goals(category_id);

-- =====================================================
-- 7. INCOME SOURCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS income_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  expected_amount BIGINT DEFAULT 0, -- Expected amount in cents
  frequency TEXT, -- 'weekly', 'biweekly', 'monthly', 'irregular', etc.
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own income sources"
  ON income_sources FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own income sources"
  ON income_sources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own income sources"
  ON income_sources FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own income sources"
  ON income_sources FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_income_sources_user_id ON income_sources(user_id);

-- =====================================================
-- 8. INCOME ACCOUNT SPLITS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS income_account_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  income_source_id UUID NOT NULL REFERENCES income_sources(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  allocation_type TEXT NOT NULL CHECK (allocation_type IN ('percentage', 'fixed', 'remainder')),
  allocation_value BIGINT NOT NULL DEFAULT 0, -- For percentage: 0-100, for fixed: cents
  priority INTEGER NOT NULL DEFAULT 0, -- Lower = higher priority
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE income_account_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own income account splits"
  ON income_account_splits FOR SELECT
  USING (
    income_source_id IN (
      SELECT id FROM income_sources WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own income account splits"
  ON income_account_splits FOR INSERT
  WITH CHECK (
    income_source_id IN (
      SELECT id FROM income_sources WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own income account splits"
  ON income_account_splits FOR UPDATE
  USING (
    income_source_id IN (
      SELECT id FROM income_sources WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own income account splits"
  ON income_account_splits FOR DELETE
  USING (
    income_source_id IN (
      SELECT id FROM income_sources WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_income_account_splits_source_id ON income_account_splits(income_source_id);
CREATE INDEX idx_income_account_splits_account_id ON income_account_splits(account_id);

-- =====================================================
-- 9. INCOME TEMPLATES TABLE (Optional auto-allocation)
-- =====================================================
CREATE TABLE IF NOT EXISTS income_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  income_source_id UUID NOT NULL REFERENCES income_sources(id) ON DELETE CASCADE,
  account_split_id UUID REFERENCES income_account_splits(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  category_type TEXT NOT NULL DEFAULT 'expense' CHECK (category_type IN ('expense')),
  allocation_type TEXT NOT NULL CHECK (allocation_type IN ('percentage', 'fixed')),
  allocation_value BIGINT NOT NULL DEFAULT 0, -- Either percentage or cents
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE income_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own income templates"
  ON income_templates FOR SELECT
  USING (
    income_source_id IN (
      SELECT id FROM income_sources WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own income templates"
  ON income_templates FOR INSERT
  WITH CHECK (
    income_source_id IN (
      SELECT id FROM income_sources WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own income templates"
  ON income_templates FOR UPDATE
  USING (
    income_source_id IN (
      SELECT id FROM income_sources WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own income templates"
  ON income_templates FOR DELETE
  USING (
    income_source_id IN (
      SELECT id FROM income_sources WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_income_templates_source_id ON income_templates(income_source_id);

-- =====================================================
-- 10. TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount BIGINT NOT NULL, -- in cents
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_date ON transactions(date);

-- =====================================================
-- 11. SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount BIGINT NOT NULL, -- in cents
  frequency TEXT NOT NULL, -- 'monthly', 'yearly', etc.
  next_billing_date DATE,
  category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_category_id ON subscriptions(category_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_categories_updated_at BEFORE UPDATE ON budget_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_savings_goals_updated_at BEFORE UPDATE ON savings_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_income_sources_updated_at BEFORE UPDATE ON income_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_income_account_splits_updated_at BEFORE UPDATE ON income_account_splits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_income_templates_updated_at BEFORE UPDATE ON income_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_groups_updated_at BEFORE UPDATE ON category_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

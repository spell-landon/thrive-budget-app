-- Migration: Per-Account Budgeting Refactor
-- Date: 2025-01-11
-- Description: Major architectural change to support per-account budgeting with goal-tracking accounts
--
-- IMPORTANT: This migration will clear existing budget categories and goals data for a fresh start.
-- Make sure to backup any data you want to keep before running this migration.

-- ==================== PART 1: ACCOUNTS TABLE ====================

-- Add is_goal_tracking column to accounts
ALTER TABLE accounts
ADD COLUMN is_goal_tracking BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster goal-tracking account lookups
CREATE INDEX idx_accounts_goal_tracking ON accounts(user_id, is_goal_tracking) WHERE is_goal_tracking = true;

COMMENT ON COLUMN accounts.is_goal_tracking IS
'When true, categories in this account appear in the Goals screen. Goal-tracking accounts typically represent savings accounts where each category is a savings goal (e.g., Emergency Fund, Vacation Fund).';

-- ==================== PART 2: BUDGET CATEGORIES TABLE ====================

-- For fresh start: Clear existing categories (must do this BEFORE constraint changes)
TRUNCATE TABLE budget_categories CASCADE;

-- Add account_id column to budget_categories
ALTER TABLE budget_categories
ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

-- Make account_id required (safe now since table is empty)
ALTER TABLE budget_categories ALTER COLUMN account_id SET NOT NULL;

-- Create index for faster account-based category lookups
CREATE INDEX idx_budget_categories_account_id ON budget_categories(account_id);
CREATE INDEX idx_budget_categories_account_budget ON budget_categories(account_id, budget_id);

-- Remove 'savings' from category_type constraint and keep only 'expense'
ALTER TABLE budget_categories DROP CONSTRAINT IF EXISTS budget_categories_category_type_check;
ALTER TABLE budget_categories
ADD CONSTRAINT budget_categories_category_type_check CHECK (category_type IN ('expense'));

COMMENT ON COLUMN budget_categories.account_id IS
'Links this category to a specific account. Categories are scoped per-account, meaning each account has its own set of categories and its own Ready to Assign bucket.';

-- ==================== PART 3: SAVINGS GOALS TABLE ====================

-- For fresh start: Clear existing goals (must do this FIRST)
TRUNCATE TABLE savings_goals CASCADE;

-- Restructure savings_goals to be metadata-only
-- Remove current_amount (will be read from category.available_amount)
ALTER TABLE savings_goals DROP COLUMN IF EXISTS current_amount;

-- Rename linked_category_id to category_id and make it required & unique
ALTER TABLE savings_goals RENAME COLUMN linked_category_id TO category_id;

-- Make category_id required and unique (safe now since table is empty)
ALTER TABLE savings_goals ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE savings_goals ADD CONSTRAINT savings_goals_category_id_unique UNIQUE (category_id);

-- Drop the old index if it exists
DROP INDEX IF EXISTS idx_savings_goals_linked_category;

-- Create new index
CREATE INDEX idx_savings_goals_category_id ON savings_goals(category_id);

COMMENT ON TABLE savings_goals IS
'Metadata wrapper for goal presentation. Each goal is linked to a category in a goal-tracking account. The goal current_amount is always read from category.available_amount. This table stores UI metadata like images, target dates, and target amounts.';

COMMENT ON COLUMN savings_goals.category_id IS
'Required unique link to a category in a goal-tracking account. The category.available_amount represents the goal current_amount.';

-- ==================== PART 4: INCOME TEMPLATE ACCOUNT SPLITS ====================

-- Create new table for income template account splits
CREATE TABLE income_template_account_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  income_source_id UUID NOT NULL REFERENCES income_sources(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  allocation_type VARCHAR(50) NOT NULL CHECK (allocation_type IN ('percentage', 'fixed', 'remainder')),
  allocation_value INTEGER NOT NULL DEFAULT 0, -- For percentage: 0-100, for fixed: cents, for remainder: ignored
  priority INTEGER NOT NULL DEFAULT 0, -- Order to apply splits (lower = higher priority)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_income_account_splits_source ON income_template_account_splits(income_source_id);
CREATE INDEX idx_income_account_splits_priority ON income_template_account_splits(income_source_id, priority);

-- Enable Row Level Security
ALTER TABLE income_template_account_splits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own income account splits"
  ON income_template_account_splits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM income_sources
      WHERE income_sources.id = income_template_account_splits.income_source_id
      AND income_sources.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create income account splits for their sources"
  ON income_template_account_splits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM income_sources
      WHERE income_sources.id = income_template_account_splits.income_source_id
      AND income_sources.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own income account splits"
  ON income_template_account_splits FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM income_sources
      WHERE income_sources.id = income_template_account_splits.income_source_id
      AND income_sources.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own income account splits"
  ON income_template_account_splits FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM income_sources
      WHERE income_sources.id = income_template_account_splits.income_source_id
      AND income_sources.user_id = auth.uid()
    )
  );

COMMENT ON TABLE income_template_account_splits IS
'Defines how income from a source should be split across accounts. Applied before category allocations within each account.';

COMMENT ON COLUMN income_template_account_splits.allocation_type IS
'How to split: "percentage" (% of income), "fixed" (specific amount), or "remainder" (all remaining after other splits).';

COMMENT ON COLUMN income_template_account_splits.allocation_value IS
'For percentage: 0-100. For fixed: amount in cents. For remainder: value is ignored, all remaining income goes to this account.';

-- ==================== PART 5: UPDATE INCOME TEMPLATES ====================

-- Income templates now need to reference account splits
-- Add optional account_split_id to link category allocations to specific account splits
ALTER TABLE income_templates
ADD COLUMN account_split_id UUID REFERENCES income_template_account_splits(id) ON DELETE CASCADE;

CREATE INDEX idx_income_templates_account_split ON income_templates(account_split_id);

COMMENT ON COLUMN income_templates.account_split_id IS
'Optional: Links this category allocation to a specific account split. If null, applies to the default account or all accounts.';

-- ==================== SUMMARY ====================

-- After running this migration:
-- 1. Accounts can be marked as goal-tracking with is_goal_tracking
-- 2. Categories belong to specific accounts via account_id
-- 3. Goals are metadata wrappers around categories in goal-tracking accounts
-- 4. Income templates support account splitting before category allocation
-- 5. Only 'expense' category type remains

-- Next steps:
-- 1. Uncomment TRUNCATE statements if doing fresh start
-- 2. Uncomment NOT NULL constraints after data is populated
-- 3. Update application code to handle new architecture

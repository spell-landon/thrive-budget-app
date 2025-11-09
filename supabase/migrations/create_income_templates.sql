-- Migration: Create Income Templates System
-- Date: 2025-01-11
-- Description: Creates tables for managing income sources and allocation templates
-- to replace the paycheck planning system

-- ==================== INCOME SOURCES ====================

-- Create income_sources table
-- Stores user's income sources (e.g., "Monthly Salary", "Freelance Work", "Side Hustle")
CREATE TABLE income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  expected_amount INTEGER NOT NULL DEFAULT 0, -- cents (optional - helps with planning)
  frequency VARCHAR(50), -- 'weekly', 'biweekly', 'monthly', 'irregular', etc.
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster user lookups
CREATE INDEX idx_income_sources_user_id ON income_sources(user_id);

-- Enable Row Level Security
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for income_sources
CREATE POLICY "Users can view their own income sources"
  ON income_sources FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own income sources"
  ON income_sources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own income sources"
  ON income_sources FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own income sources"
  ON income_sources FOR DELETE
  USING (auth.uid() = user_id);

-- ==================== INCOME TEMPLATES ====================

-- Create income_templates table
-- Stores allocation templates: when income X arrives, how should it be distributed?
CREATE TABLE income_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  income_source_id UUID NOT NULL REFERENCES income_sources(id) ON DELETE CASCADE,
  category_name VARCHAR(255) NOT NULL, -- Category name (not ID, to persist across months)
  category_type VARCHAR(50) NOT NULL CHECK (category_type IN ('expense', 'savings')),
  allocation_type VARCHAR(50) NOT NULL CHECK (allocation_type IN ('percentage', 'fixed')),
  allocation_value INTEGER NOT NULL, -- Either percentage (0-100) or fixed amount in cents
  priority INTEGER NOT NULL DEFAULT 0, -- Order to apply allocations (lower = higher priority)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX idx_income_templates_source_id ON income_templates(income_source_id);
CREATE INDEX idx_income_templates_priority ON income_templates(income_source_id, priority);

-- Enable Row Level Security
ALTER TABLE income_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for income_templates (access through income_sources)
CREATE POLICY "Users can view their own income templates"
  ON income_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM income_sources
      WHERE income_sources.id = income_templates.income_source_id
      AND income_sources.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create income templates for their sources"
  ON income_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM income_sources
      WHERE income_sources.id = income_templates.income_source_id
      AND income_sources.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own income templates"
  ON income_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM income_sources
      WHERE income_sources.id = income_templates.income_source_id
      AND income_sources.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own income templates"
  ON income_templates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM income_sources
      WHERE income_sources.id = income_templates.income_source_id
      AND income_sources.user_id = auth.uid()
    )
  );

-- ==================== COMMENTS ====================

COMMENT ON TABLE income_sources IS
'Stores user income sources (e.g., "Monthly Salary", "Freelance Work"). Used to organize allocation templates.';

COMMENT ON COLUMN income_sources.expected_amount IS
'Expected amount in cents (optional). Helps with planning but actual income tracked via transactions.';

COMMENT ON TABLE income_templates IS
'Allocation templates defining how income should be distributed to budget categories. Uses category names (not IDs) to work across months.';

COMMENT ON COLUMN income_templates.category_name IS
'Category name (not ID) to persist templates across monthly budgets. When applying template, find/create category with this name in current month.';

COMMENT ON COLUMN income_templates.allocation_type IS
'How to calculate allocation: "percentage" (% of income) or "fixed" (specific dollar amount).';

COMMENT ON COLUMN income_templates.allocation_value IS
'For percentage: 0-100 (e.g., 50 = 50%). For fixed: amount in cents (e.g., 50000 = $500.00).';

COMMENT ON COLUMN income_templates.priority IS
'Order to apply allocations. Lower numbers = higher priority. Fixed allocations should typically have higher priority than percentages.';

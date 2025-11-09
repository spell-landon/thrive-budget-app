-- Migration: Link Savings Goals to Budget Categories
-- Date: 2025-01-11
-- Description: Links savings goals to budget categories to unify goal tracking
-- with envelope budgeting. Goals = Savings Categories at the user level.

-- Add linked_category_id column to savings_goals
ALTER TABLE savings_goals
ADD COLUMN linked_category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_savings_goals_linked_category ON savings_goals(linked_category_id);

-- Reset existing goal balances (user confirmed this is OK)
UPDATE savings_goals SET current_amount = 0;

-- Add comment explaining the linkage
COMMENT ON COLUMN savings_goals.linked_category_id IS
'Links this goal to a savings-type budget category. The goal.current_amount should sync with the linked category.available_amount across all months.';

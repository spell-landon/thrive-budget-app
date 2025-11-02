-- Add available_amount field to budget_categories table
-- This field tracks the actual money assigned to a category (from paychecks)
-- Separate from spent_amount (actual transactions) and allocated_amount (budget target)

ALTER TABLE budget_categories
ADD COLUMN available_amount INTEGER NOT NULL DEFAULT 0;

-- Add comment to document the field
COMMENT ON COLUMN budget_categories.available_amount IS 'Actual money assigned to this category from paycheck allocations (in cents)';

-- Update existing categories to have available_amount = spent_amount
-- This ensures a smooth migration without losing current data
UPDATE budget_categories
SET available_amount = spent_amount
WHERE available_amount = 0;

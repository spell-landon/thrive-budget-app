-- Add due_date field to budget_categories for date-aware allocation
-- This allows the smart allocation system to prioritize categories based on when expenses are due

ALTER TABLE budget_categories
ADD COLUMN IF NOT EXISTS due_date DATE;

-- Add index for date-aware queries
CREATE INDEX IF NOT EXISTS idx_budget_categories_due_date
ON budget_categories(budget_id, due_date)
WHERE due_date IS NOT NULL;

-- Add comment
COMMENT ON COLUMN budget_categories.due_date IS 'Optional due date for this category expense. Used by smart allocation system to prioritize payments by due date.';

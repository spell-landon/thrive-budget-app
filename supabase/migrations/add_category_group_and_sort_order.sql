-- Add category_group and sort_order columns to budget_categories table
-- This enables grouping categories (e.g., "Home", "Transportation") and manual ordering

-- Add category_group column (optional text field for grouping)
ALTER TABLE budget_categories
ADD COLUMN IF NOT EXISTS category_group TEXT;

-- Add sort_order column (integer for manual ordering, defaults to 0)
ALTER TABLE budget_categories
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add comment to document the purpose
COMMENT ON COLUMN budget_categories.category_group IS 'Optional category group for organizing related categories (e.g., "Home", "Transportation", "Food")';
COMMENT ON COLUMN budget_categories.sort_order IS 'Manual sort order for custom category arrangement. Lower numbers appear first.';

-- Create index on category_group for faster grouping queries
CREATE INDEX IF NOT EXISTS idx_budget_categories_category_group
ON budget_categories(category_group)
WHERE category_group IS NOT NULL;

-- Create index on sort_order for faster ordering queries
CREATE INDEX IF NOT EXISTS idx_budget_categories_sort_order
ON budget_categories(budget_id, sort_order);

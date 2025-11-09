-- Add 'remainder' allocation type to income_templates
-- Remainder type allocates whatever is left after all other allocations

-- Drop the old constraint
ALTER TABLE income_templates
DROP CONSTRAINT IF EXISTS income_templates_allocation_type_check;

-- Add the new constraint with 'remainder' included
ALTER TABLE income_templates
ADD CONSTRAINT income_templates_allocation_type_check
CHECK (allocation_type IN ('percentage', 'fixed', 'remainder'));

-- Update comment to reflect new allocation type
COMMENT ON COLUMN income_templates.allocation_type IS
'How to calculate allocation: "percentage" (% of income), "fixed" (specific dollar amount), or "remainder" (whatever is left after other allocations).';

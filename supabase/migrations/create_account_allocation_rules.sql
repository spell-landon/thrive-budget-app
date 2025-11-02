-- Create account_allocation_rules table
-- This table defines how money within an account is allocated to categories/goals (Tier 2 allocation)

CREATE TABLE IF NOT EXISTS account_allocation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Target type: 'category', 'goal', 'split_remaining', or 'unallocated'
  target_type TEXT NOT NULL CHECK (target_type IN ('category', 'goal', 'split_remaining', 'unallocated')),

  -- Target ID: category_id or goal_id (NULL for split_remaining or unallocated)
  target_id UUID,

  -- Allocation type: 'fixed' (dollar amount), 'percentage', 'remainder', or 'split' (divide among categories)
  allocation_type TEXT NOT NULL CHECK (allocation_type IN ('fixed', 'percentage', 'remainder', 'split')),

  -- Amount in cents (NULL if percentage/remainder/split)
  amount INTEGER CHECK (amount IS NULL OR amount >= 0),

  -- Percentage (NULL if fixed/remainder/split)
  percentage NUMERIC(5,2) CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100)),

  -- Priority order - lower number = higher priority (allocates first)
  priority_order INTEGER NOT NULL CHECK (priority_order >= 0),

  -- If true, prioritize allocations by due date (subscriptions, bills)
  due_date_aware BOOLEAN DEFAULT false,

  -- For goals that reach target: where to send overflow
  overflow_target_id UUID,
  overflow_target_type TEXT CHECK (overflow_target_type IN ('category', 'goal')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Validation: target_id required for category/goal, not for split_remaining/unallocated
  CONSTRAINT valid_target_id CHECK (
    (target_type IN ('category', 'goal') AND target_id IS NOT NULL) OR
    (target_type IN ('split_remaining', 'unallocated') AND target_id IS NULL)
  ),

  -- Validation: must have either amount or percentage set based on type
  CONSTRAINT valid_allocation_config CHECK (
    (allocation_type = 'fixed' AND amount IS NOT NULL AND percentage IS NULL) OR
    (allocation_type = 'percentage' AND percentage IS NOT NULL AND amount IS NULL) OR
    (allocation_type IN ('remainder', 'split') AND amount IS NULL AND percentage IS NULL)
  ),

  -- Validation: overflow fields must both be set or both NULL
  CONSTRAINT valid_overflow CHECK (
    (overflow_target_id IS NULL AND overflow_target_type IS NULL) OR
    (overflow_target_id IS NOT NULL AND overflow_target_type IS NOT NULL)
  )
);

-- Add RLS policies
ALTER TABLE account_allocation_rules ENABLE ROW LEVEL SECURITY;

-- Users can view their own allocation rules
CREATE POLICY "Users can view own allocation rules"
  ON account_allocation_rules
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own allocation rules
CREATE POLICY "Users can insert own allocation rules"
  ON account_allocation_rules
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own allocation rules
CREATE POLICY "Users can update own allocation rules"
  ON account_allocation_rules
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own allocation rules
CREATE POLICY "Users can delete own allocation rules"
  ON account_allocation_rules
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX idx_account_allocation_rules_account ON account_allocation_rules(account_id, priority_order);
CREATE INDEX idx_account_allocation_rules_user ON account_allocation_rules(user_id);
CREATE INDEX idx_account_allocation_rules_target ON account_allocation_rules(target_type, target_id);
CREATE INDEX idx_account_allocation_rules_date_aware ON account_allocation_rules(account_id, due_date_aware) WHERE due_date_aware = true;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_account_allocation_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER account_allocation_rules_updated_at
  BEFORE UPDATE ON account_allocation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_account_allocation_rules_updated_at();

-- Add comment
COMMENT ON TABLE account_allocation_rules IS 'Defines how money within an account is allocated to budget categories and savings goals (Tier 2 allocation in smart paycheck system)';

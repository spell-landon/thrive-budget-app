-- Create account_distribution_rules table
-- This table defines how paychecks are split across multiple accounts (Tier 1 allocation)

CREATE TABLE IF NOT EXISTS account_distribution_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paycheck_plan_id UUID NOT NULL REFERENCES paycheck_plans(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Allocation type: 'fixed' (dollar amount), 'percentage', or 'remainder' (whatever's left)
  allocation_type TEXT NOT NULL CHECK (allocation_type IN ('fixed', 'percentage', 'remainder')),

  -- Amount in cents (NULL if percentage or remainder)
  amount INTEGER CHECK (amount IS NULL OR amount >= 0),

  -- Percentage (NULL if fixed or remainder)
  percentage NUMERIC(5,2) CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100)),

  -- Priority order - lower number = higher priority (allocates first)
  priority_order INTEGER NOT NULL CHECK (priority_order >= 0),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure only one rule per paycheck/account combo
  UNIQUE(paycheck_plan_id, account_id),

  -- Validation: must have either amount or percentage set based on type
  CONSTRAINT valid_allocation_amount CHECK (
    (allocation_type = 'fixed' AND amount IS NOT NULL AND percentage IS NULL) OR
    (allocation_type = 'percentage' AND percentage IS NOT NULL AND amount IS NULL) OR
    (allocation_type = 'remainder' AND amount IS NULL AND percentage IS NULL)
  )
);

-- Add RLS policies
ALTER TABLE account_distribution_rules ENABLE ROW LEVEL SECURITY;

-- Users can view their own distribution rules
CREATE POLICY "Users can view own distribution rules"
  ON account_distribution_rules
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own distribution rules
CREATE POLICY "Users can insert own distribution rules"
  ON account_distribution_rules
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own distribution rules
CREATE POLICY "Users can update own distribution rules"
  ON account_distribution_rules
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own distribution rules
CREATE POLICY "Users can delete own distribution rules"
  ON account_distribution_rules
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_account_distribution_rules_paycheck ON account_distribution_rules(paycheck_plan_id, priority_order);
CREATE INDEX idx_account_distribution_rules_user ON account_distribution_rules(user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_account_distribution_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER account_distribution_rules_updated_at
  BEFORE UPDATE ON account_distribution_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_account_distribution_rules_updated_at();

-- Add comment
COMMENT ON TABLE account_distribution_rules IS 'Defines how paycheck income is distributed across multiple accounts (Tier 1 allocation in smart paycheck system)';

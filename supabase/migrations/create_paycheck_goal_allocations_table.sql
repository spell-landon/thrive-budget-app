-- Create table for allocating paychecks to savings goals
CREATE TABLE paycheck_goal_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paycheck_plan_id UUID NOT NULL REFERENCES paycheck_plans(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Amount in cents
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE paycheck_goal_allocations ENABLE ROW LEVEL SECURITY;

-- Users can view their own goal allocations (through paycheck_plans)
CREATE POLICY "Users can view their own goal allocations"
ON paycheck_goal_allocations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM paycheck_plans
    WHERE paycheck_plans.id = paycheck_goal_allocations.paycheck_plan_id
    AND paycheck_plans.user_id = auth.uid()
  )
);

-- Users can insert their own goal allocations
CREATE POLICY "Users can insert their own goal allocations"
ON paycheck_goal_allocations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM paycheck_plans
    WHERE paycheck_plans.id = paycheck_goal_allocations.paycheck_plan_id
    AND paycheck_plans.user_id = auth.uid()
  )
);

-- Users can update their own goal allocations
CREATE POLICY "Users can update their own goal allocations"
ON paycheck_goal_allocations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM paycheck_plans
    WHERE paycheck_plans.id = paycheck_goal_allocations.paycheck_plan_id
    AND paycheck_plans.user_id = auth.uid()
  )
);

-- Users can delete their own goal allocations
CREATE POLICY "Users can delete their own goal allocations"
ON paycheck_goal_allocations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM paycheck_plans
    WHERE paycheck_plans.id = paycheck_goal_allocations.paycheck_plan_id
    AND paycheck_plans.user_id = auth.uid()
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_paycheck_goal_allocations_updated_at
  BEFORE UPDATE ON paycheck_goal_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

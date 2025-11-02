-- Create category_groups table for user-customizable budget category groups
CREATE TABLE category_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_type TEXT NOT NULL CHECK (category_type IN ('income', 'expense', 'savings')),
  is_default BOOLEAN NOT NULL DEFAULT false, -- Whether this is a system-provided default
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name, category_type) -- Prevent duplicate group names per type per user
);

-- Add indexes
CREATE INDEX idx_category_groups_user_id ON category_groups(user_id);
CREATE INDEX idx_category_groups_type ON category_groups(category_type);

-- Enable Row Level Security
ALTER TABLE category_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own category groups"
ON category_groups FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own category groups"
ON category_groups FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own category groups"
ON category_groups FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own category groups"
ON category_groups FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_category_groups_updated_at
  BEFORE UPDATE ON category_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to initialize default category groups for a new user
CREATE OR REPLACE FUNCTION initialize_default_category_groups(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Income groups
  INSERT INTO category_groups (user_id, name, category_type, is_default, sort_order) VALUES
    (p_user_id, 'Salary', 'income', true, 0),
    (p_user_id, 'Side Income', 'income', true, 1),
    (p_user_id, 'Interest & Dividends', 'income', true, 2),
    (p_user_id, 'Gifts & Bonuses', 'income', true, 3),
    (p_user_id, 'Other Income', 'income', true, 4);

  -- Expense groups
  INSERT INTO category_groups (user_id, name, category_type, is_default, sort_order) VALUES
    (p_user_id, 'Housing', 'expense', true, 0),
    (p_user_id, 'Transportation', 'expense', true, 1),
    (p_user_id, 'Food & Dining', 'expense', true, 2),
    (p_user_id, 'Utilities', 'expense', true, 3),
    (p_user_id, 'Healthcare', 'expense', true, 4),
    (p_user_id, 'Personal Care', 'expense', true, 5),
    (p_user_id, 'Entertainment', 'expense', true, 6),
    (p_user_id, 'Shopping', 'expense', true, 7),
    (p_user_id, 'Debt Payments', 'expense', true, 8),
    (p_user_id, 'Education', 'expense', true, 9),
    (p_user_id, 'Pets', 'expense', true, 10),
    (p_user_id, 'Giving', 'expense', true, 11),
    (p_user_id, 'Miscellaneous', 'expense', true, 12);

  -- Savings groups
  INSERT INTO category_groups (user_id, name, category_type, is_default, sort_order) VALUES
    (p_user_id, 'Emergency Fund', 'savings', true, 0),
    (p_user_id, 'Retirement', 'savings', true, 1),
    (p_user_id, 'Investments', 'savings', true, 2),
    (p_user_id, 'Savings Goals', 'savings', true, 3),
    (p_user_id, 'College Fund', 'savings', true, 4),
    (p_user_id, 'Other Savings', 'savings', true, 5);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: You may want to call initialize_default_category_groups() when a new user signs up
-- This can be done via a trigger on auth.users or called manually from your application

-- Add subscription_id column to transactions table
-- This allows linking transactions to recurring subscriptions

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;

-- Create index for faster lookups of transactions by subscription
CREATE INDEX IF NOT EXISTS idx_transactions_subscription_id ON transactions(subscription_id);

-- Add comment explaining the column
COMMENT ON COLUMN transactions.subscription_id IS 'Optional link to subscription for recurring payment tracking';

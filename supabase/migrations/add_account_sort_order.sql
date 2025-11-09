-- Add sort_order column to accounts table
ALTER TABLE accounts
ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Set initial sort_order based on created_at (older accounts first)
UPDATE accounts
SET sort_order = subquery.row_num - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as row_num
  FROM accounts
) AS subquery
WHERE accounts.id = subquery.id;

-- Add comment explaining the column
COMMENT ON COLUMN accounts.sort_order IS 'Display order for accounts (lower numbers appear first)';

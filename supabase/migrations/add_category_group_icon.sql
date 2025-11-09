-- Add icon column to category_groups table
ALTER TABLE category_groups
ADD COLUMN icon TEXT DEFAULT 'folder';

-- Add comment explaining the column
COMMENT ON COLUMN category_groups.icon IS 'Ionicon name for the category group (defaults to folder)';

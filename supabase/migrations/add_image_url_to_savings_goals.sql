-- Add image_url column to savings_goals table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'savings_goals'
    AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.savings_goals ADD COLUMN image_url TEXT;
  END IF;
END $$;

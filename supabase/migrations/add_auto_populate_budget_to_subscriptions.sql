-- Ensure subscriptions table has all required columns
-- This migration adds missing columns if they don't exist

-- Add reminder_days_before column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
    AND column_name = 'reminder_days_before'
  ) THEN
    ALTER TABLE public.subscriptions
    ADD COLUMN reminder_days_before INTEGER NOT NULL DEFAULT 3;

    COMMENT ON COLUMN public.subscriptions.reminder_days_before IS 'Days before billing to show reminder';
  END IF;
END $$;

-- Add notes column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.subscriptions
    ADD COLUMN notes TEXT;

    COMMENT ON COLUMN public.subscriptions.notes IS 'Optional notes about the subscription';
  END IF;
END $$;

-- Add auto_populate_budget column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
    AND column_name = 'auto_populate_budget'
  ) THEN
    ALTER TABLE public.subscriptions
    ADD COLUMN auto_populate_budget BOOLEAN NOT NULL DEFAULT true;

    COMMENT ON COLUMN public.subscriptions.auto_populate_budget IS 'Whether to automatically populate budget category with subscription amount each month';
  END IF;
END $$;

-- Add auto_pay column if it doesn't exist (in case original migration wasn't run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
    AND column_name = 'auto_pay'
  ) THEN
    ALTER TABLE public.subscriptions
    ADD COLUMN auto_pay BOOLEAN NOT NULL DEFAULT false;

    COMMENT ON COLUMN public.subscriptions.auto_pay IS 'Whether subscription automatically pays from an account';
  END IF;
END $$;

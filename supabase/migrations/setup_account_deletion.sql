-- This migration sets up proper account deletion handling
-- It creates a trigger that automatically deletes the auth.users record
-- when the user's profile is deleted

-- Step 1: Create a function to delete the auth user
-- This function has SECURITY DEFINER which allows it to delete from auth.users
CREATE OR REPLACE FUNCTION public.delete_user_auth()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete the user from auth.users
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

-- Step 2: Create a trigger on the profiles table
-- This trigger fires after a profile is deleted and removes the auth user
DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;
CREATE TRIGGER on_profile_deleted
  AFTER DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_user_auth();

-- Step 3: Set up CASCADE deletes for better data cleanup
-- This ensures that when a user is deleted, all their data is removed

-- Add CASCADE to foreign key constraints if not already present
-- Note: Adjust these based on your actual schema

-- For accounts table
ALTER TABLE IF EXISTS public.accounts
  DROP CONSTRAINT IF EXISTS accounts_user_id_fkey,
  ADD CONSTRAINT accounts_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- For budgets table
ALTER TABLE IF EXISTS public.budgets
  DROP CONSTRAINT IF EXISTS budgets_user_id_fkey,
  ADD CONSTRAINT budgets_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- For transactions table
ALTER TABLE IF EXISTS public.transactions
  DROP CONSTRAINT IF EXISTS transactions_user_id_fkey,
  ADD CONSTRAINT transactions_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- For paycheck_plans table
ALTER TABLE IF EXISTS public.paycheck_plans
  DROP CONSTRAINT IF EXISTS paycheck_plans_user_id_fkey,
  ADD CONSTRAINT paycheck_plans_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- For subscriptions table
ALTER TABLE IF EXISTS public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey,
  ADD CONSTRAINT subscriptions_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- For budget_categories, ensure CASCADE from budgets
ALTER TABLE IF EXISTS public.budget_categories
  DROP CONSTRAINT IF EXISTS budget_categories_budget_id_fkey,
  ADD CONSTRAINT budget_categories_budget_id_fkey
    FOREIGN KEY (budget_id)
    REFERENCES public.budgets(id)
    ON DELETE CASCADE;

-- For paycheck_allocations, ensure CASCADE from paycheck_plans
ALTER TABLE IF EXISTS public.paycheck_allocations
  DROP CONSTRAINT IF EXISTS paycheck_allocations_paycheck_plan_id_fkey,
  ADD CONSTRAINT paycheck_allocations_paycheck_plan_id_fkey
    FOREIGN KEY (paycheck_plan_id)
    REFERENCES public.paycheck_plans(id)
    ON DELETE CASCADE;

-- Comment explaining the setup
COMMENT ON FUNCTION public.delete_user_auth() IS
  'Automatically deletes auth.users record when profile is deleted. Used for account deletion.';

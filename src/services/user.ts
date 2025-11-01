import { supabase } from './supabase';

/**
 * Delete all user data and the user account
 * This is a destructive operation that cannot be undone
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  try {
    // Delete in order to respect foreign key constraints
    // Start with child tables and work up to parent tables

    // 1. Get all paycheck plan IDs for this user, then delete allocations
    const { data: paycheckPlans } = await supabase
      .from('paycheck_plans')
      .select('id')
      .eq('user_id', userId);

    if (paycheckPlans && paycheckPlans.length > 0) {
      const paycheckPlanIds = paycheckPlans.map(p => p.id);
      const { error: allocationsError } = await supabase
        .from('paycheck_allocations')
        .delete()
        .in('paycheck_plan_id', paycheckPlanIds);

      if (allocationsError) {
        console.error('Error deleting paycheck allocations:', allocationsError);
      }
    }

    // 2. Delete transactions (references accounts and budget_categories)
    const { error: transactionsError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId);

    if (transactionsError) {
      console.error('Error deleting transactions:', transactionsError);
    }

    // 3. Get all budget IDs for this user, then delete categories
    const { data: budgets } = await supabase
      .from('budgets')
      .select('id')
      .eq('user_id', userId);

    if (budgets && budgets.length > 0) {
      const budgetIds = budgets.map(b => b.id);
      const { error: categoriesError } = await supabase
        .from('budget_categories')
        .delete()
        .in('budget_id', budgetIds);

      if (categoriesError) {
        console.error('Error deleting budget categories:', categoriesError);
      }
    }

    // 4. Delete budgets
    const { error: budgetsError } = await supabase
      .from('budgets')
      .delete()
      .eq('user_id', userId);

    if (budgetsError) {
      console.error('Error deleting budgets:', budgetsError);
    }

    // 5. Delete subscriptions
    const { error: subscriptionsError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);

    if (subscriptionsError) {
      console.error('Error deleting subscriptions:', subscriptionsError);
    }

    // 6. Delete paycheck plans
    const { error: paychecksError } = await supabase
      .from('paycheck_plans')
      .delete()
      .eq('user_id', userId);

    if (paychecksError) {
      console.error('Error deleting paycheck plans:', paychecksError);
    }

    // 7. Delete accounts
    const { error: accountsError } = await supabase
      .from('accounts')
      .delete()
      .eq('user_id', userId);

    if (accountsError) {
      console.error('Error deleting accounts:', accountsError);
    }

    // 8. Delete the user profile record if it exists
    // This assumes you have a profiles table with user_id as the primary key
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
      // Continue anyway - profile might not exist
    }

    // Note: Deleting the auth.users record requires admin privileges
    // In production, you should set up a database trigger or edge function:
    //
    // CREATE TRIGGER on_profile_deleted
    // AFTER DELETE ON public.profiles
    // FOR EACH ROW EXECUTE FUNCTION delete_user_auth();
    //
    // Where delete_user_auth() is a function with SECURITY DEFINER that calls:
    // DELETE FROM auth.users WHERE id = OLD.id;
    //
    // For now, all user data is deleted and the account will be signed out.

  } catch (error) {
    console.error('Error deleting user account:', error);
    throw error;
  }
}

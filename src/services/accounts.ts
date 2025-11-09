import { supabase } from './supabase';
import { Account } from '../types';

// Get all accounts for a user
export async function getAccounts(userId: string): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Get a single account by ID
export async function getAccountById(accountId: string): Promise<Account> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (error) throw error;
  return data;
}

// Create a new account
export async function createAccount(
  userId: string,
  account: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Account> {
  // Get the max sort_order for this user and add 1
  const { data: existingAccounts } = await supabase
    .from('accounts')
    .select('sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder = existingAccounts && existingAccounts.length > 0
    ? (existingAccounts[0].sort_order || 0) + 1
    : 0;

  const { data, error } = await supabase
    .from('accounts')
    .insert([
      {
        user_id: userId,
        name: account.name,
        type: account.type,
        balance: account.balance,
        institution: account.institution,
        is_goal_tracking: account.is_goal_tracking || false,
        sort_order: account.sort_order ?? nextSortOrder,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update an account
export async function updateAccount(
  accountId: string,
  updates: Partial<Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Account> {
  const { data, error } = await supabase
    .from('accounts')
    .update(updates)
    .eq('id', accountId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete an account
export async function deleteAccount(accountId: string): Promise<void> {
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', accountId);

  if (error) throw error;
}

// Update account balance (used when adding transactions)
export async function updateAccountBalance(
  accountId: string,
  amountInCents: number
): Promise<Account> {
  // Get current balance
  const account = await getAccountById(accountId);
  const newBalance = account.balance + amountInCents;

  return updateAccount(accountId, { balance: newBalance });
}

// ==================== GOAL-TRACKING ACCOUNTS ====================

/**
 * Get all goal-tracking accounts for a user
 * Goal-tracking accounts are special accounts where each category represents a savings goal
 */
export async function getGoalTrackingAccounts(userId: string): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_goal_tracking', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get accounts that can have budget categories
 * Excludes credit cards and loans (they don't budget, just track debt)
 */
export async function getBudgetableAccounts(userId: string): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .not('type', 'in', '(credit_card,loan)')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get regular budgeting accounts (not goal-tracking, not credit/loans)
 * These are accounts for day-to-day budgeting (checking, savings used for expenses)
 */
export async function getRegularBudgetAccounts(userId: string): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_goal_tracking', false)
    .not('type', 'in', '(credit_card,loan)')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Toggle goal-tracking status for an account
 * WARNING: This is a significant change and may affect how categories are displayed
 */
export async function toggleGoalTracking(
  accountId: string,
  isGoalTracking: boolean
): Promise<Account> {
  return updateAccount(accountId, { is_goal_tracking: isGoalTracking });
}

/**
 * Check if account type can have budget categories
 * Credit cards and loans cannot have categories
 */
export function canAccountHaveCategories(accountType: Account['type']): boolean {
  return accountType !== 'credit_card' && accountType !== 'loan';
}

/**
 * Validate account for goal-tracking
 * Only checking/savings/investment accounts can be goal-tracking
 */
export function canAccountBeGoalTracking(accountType: Account['type']): boolean {
  return ['checking', 'savings', 'investment'].includes(accountType);
}

// ==================== ACCOUNT ORDERING ====================

/**
 * Reorder accounts by updating their sort_order
 * @param updates - Array of {id, sort_order} objects
 */
export async function reorderAccounts(
  updates: Array<{ id: string; sort_order: number }>
): Promise<void> {
  for (const update of updates) {
    await supabase
      .from('accounts')
      .update({ sort_order: update.sort_order })
      .eq('id', update.id);
  }
}

/**
 * Move an account to a specific position
 * @param userId - User ID
 * @param accountId - Account to move
 * @param newPosition - New position (0-indexed)
 */
export async function moveAccountToPosition(
  userId: string,
  accountId: string,
  newPosition: number
): Promise<void> {
  const accounts = await getAccounts(userId);
  const accountIndex = accounts.findIndex(a => a.id === accountId);

  if (accountIndex === -1) {
    throw new Error('Account not found');
  }

  // Remove the account from its current position
  const [movedAccount] = accounts.splice(accountIndex, 1);

  // Insert it at the new position
  accounts.splice(newPosition, 0, movedAccount);

  // Update sort_order for all accounts
  const updates = accounts.map((account, index) => ({
    id: account.id,
    sort_order: index,
  }));

  await reorderAccounts(updates);
}

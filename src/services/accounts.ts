import { supabase } from './supabase';
import { Account } from '../types';

// Get all accounts for a user
export async function getAccounts(userId: string): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

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
  const { data, error } = await supabase
    .from('accounts')
    .insert([
      {
        user_id: userId,
        name: account.name,
        type: account.type,
        balance: account.balance,
        institution: account.institution,
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

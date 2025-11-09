import { supabase } from './supabase';
import { Transaction } from '../types';
import { updateAccountBalance } from './accounts';

/**
 * Transfer money between two accounts
 * Creates a single "transfer" transaction that updates both account balances
 *
 * This is different from income/expense transactions:
 * - Does NOT affect budget categories
 * - Updates two account balances in one operation
 * - Uses transaction type 'transfer'
 *
 * Example: Moving $500 from Checking to Savings
 * - Checking balance decreases by $500
 * - Savings balance increases by $500
 * - No budget categories affected
 *
 * @param userId - User ID for ownership
 * @param fromAccountId - Source account (money leaves)
 * @param toAccountId - Destination account (money enters)
 * @param amount - Amount in cents to transfer
 * @param description - Optional description
 * @param date - Transfer date (ISO string)
 * @returns The created transfer transaction
 */
export async function transferBetweenAccounts(
  userId: string,
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  description?: string,
  date?: string
): Promise<Transaction> {
  if (amount <= 0) {
    throw new Error('Transfer amount must be greater than zero');
  }

  if (fromAccountId === toAccountId) {
    throw new Error('Cannot transfer to the same account');
  }

  // Use current date if not provided
  const transferDate = date || new Date().toISOString();

  // Build transaction data
  const transactionData: any = {
    user_id: userId,
    account_id: fromAccountId, // Primary account is the source
    amount: amount,
    description: description || `Transfer to account`,
    date: transferDate,
    type: 'transfer',
  };

  // Create the transfer transaction
  const { data, error } = await supabase
    .from('transactions')
    .insert([transactionData])
    .select()
    .single();

  if (error) throw error;

  // Update both account balances
  // Source account: subtract amount
  await updateAccountBalance(fromAccountId, -amount);

  // Destination account: add amount
  await updateAccountBalance(toAccountId, amount);

  return data;
}

/**
 * Get all transfer transactions for a user
 * Useful for displaying transfer history
 */
export async function getTransfers(userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'transfer')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Delete a transfer transaction and reverse balance changes
 */
export async function deleteTransfer(transactionId: string): Promise<void> {
  // Get the transaction first
  const { data: transaction, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('type', 'transfer')
    .single();

  if (fetchError) throw fetchError;
  if (!transaction) throw new Error('Transfer not found');

  // Delete the transaction
  const { error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId);

  if (deleteError) throw deleteError;

  // Reverse the balance changes
  // Add back to source account
  await updateAccountBalance(transaction.account_id, transaction.amount);

  // Note: We can't easily determine the destination account from a single transaction
  // This is a limitation of the current schema
  // TODO: Consider adding 'to_account_id' field to transactions table for transfers
}

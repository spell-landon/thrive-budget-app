import { supabase } from './supabase';
import { Transaction } from '../types';
import { updateAccountBalance } from './accounts';
import { addSpendingToCategory, removeSpendingFromCategory } from './budgets';

// Get all transactions for a user
export async function getTransactions(userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Get transactions for a specific account
export async function getAccountTransactions(accountId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('account_id', accountId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Get a single transaction by ID
export async function getTransactionById(transactionId: string): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (error) throw error;
  return data;
}

// Create a new transaction and update account balance
export async function createTransaction(
  userId: string,
  transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Transaction> {
  // Create the transaction
  const { data, error } = await supabase
    .from('transactions')
    .insert([
      {
        user_id: userId,
        account_id: transaction.account_id,
        category_id: transaction.category_id,
        amount: transaction.amount,
        description: transaction.description,
        date: transaction.date,
        type: transaction.type,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  // Update account balance
  // For income: add to balance
  // For expense: subtract from balance
  const balanceChange = transaction.type === 'income' ? transaction.amount : -transaction.amount;
  await updateAccountBalance(transaction.account_id, balanceChange);

  // Update category spending if transaction has a category
  // Only expenses count toward category spending
  if (transaction.category_id && transaction.type === 'expense') {
    await addSpendingToCategory(transaction.category_id, transaction.amount);
  }

  return data;
}

// Update a transaction
export async function updateTransaction(
  transactionId: string,
  updates: Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Transaction> {
  // Note: Updating a transaction does not automatically adjust account balance
  // You would need to manually recalculate if you want to handle balance changes
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', transactionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete a transaction and update account balance
export async function deleteTransaction(transactionId: string): Promise<void> {
  // Get the transaction first so we can reverse the account balance change
  const transaction = await getTransactionById(transactionId);

  // Delete the transaction
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId);

  if (error) throw error;

  // Reverse the account balance change
  // If it was income, subtract from balance; if expense, add to balance
  const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
  await updateAccountBalance(transaction.account_id, balanceChange);

  // Remove category spending if transaction had a category
  // Only expenses count toward category spending
  if (transaction.category_id && transaction.type === 'expense') {
    await removeSpendingFromCategory(transaction.category_id, transaction.amount);
  }
}

// Get transactions for a specific date range
export async function getTransactionsByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

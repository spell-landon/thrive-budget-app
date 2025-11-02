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
  // Build transaction object, only including optional fields if they have values
  const transactionData: any = {
    user_id: userId,
    account_id: transaction.account_id,
    amount: transaction.amount,
    description: transaction.description,
    date: transaction.date,
    type: transaction.type,
  };

  // Only add optional fields if they exist
  if (transaction.category_id) {
    transactionData.category_id = transaction.category_id;
  }
  if (transaction.subscription_id) {
    transactionData.subscription_id = transaction.subscription_id;
  }

  // Create the transaction
  const { data, error } = await supabase
    .from('transactions')
    .insert([transactionData])
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
  // Get the original transaction to reverse its effects
  const original = await getTransactionById(transactionId);

  // Step 1: Reverse the effects of the original transaction
  // Reverse account balance change
  const originalBalanceChange = original.type === 'income' ? -original.amount : original.amount;
  await updateAccountBalance(original.account_id, originalBalanceChange);

  // Reverse category spending if applicable
  if (original.category_id && original.type === 'expense') {
    await removeSpendingFromCategory(original.category_id, original.amount);
  }

  // Step 2: Update the transaction
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', transactionId)
    .select()
    .single();

  if (error) throw error;

  // Step 3: Apply the effects of the updated transaction
  const updated = data;

  // Apply new account balance change
  const newBalanceChange = updated.type === 'income' ? updated.amount : -updated.amount;
  await updateAccountBalance(updated.account_id, newBalanceChange);

  // Apply new category spending if applicable
  if (updated.category_id && updated.type === 'expense') {
    await addSpendingToCategory(updated.category_id, updated.amount);
  }

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

// Delete multiple transactions and update account balances properly
// This avoids race conditions by processing transactions per account
export async function deleteTransactions(transactionIds: string[]): Promise<void> {
  if (transactionIds.length === 0) return;

  // Get all transactions first
  const { data: transactions, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .in('id', transactionIds);

  if (fetchError) throw fetchError;
  if (!transactions || transactions.length === 0) return;

  // Group transactions by account to calculate net balance changes
  const accountBalanceChanges = new Map<string, number>();
  const categorySpendingChanges = new Map<string, number>();

  for (const transaction of transactions) {
    // Calculate balance change for this account
    const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
    const currentChange = accountBalanceChanges.get(transaction.account_id) || 0;
    accountBalanceChanges.set(transaction.account_id, currentChange + balanceChange);

    // Calculate category spending changes
    if (transaction.category_id && transaction.type === 'expense') {
      const currentSpending = categorySpendingChanges.get(transaction.category_id) || 0;
      categorySpendingChanges.set(transaction.category_id, currentSpending + transaction.amount);
    }
  }

  // Delete all transactions
  const { error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .in('id', transactionIds);

  if (deleteError) throw deleteError;

  // Update account balances (one update per account)
  const balanceUpdates = Array.from(accountBalanceChanges.entries()).map(
    ([accountId, change]) => updateAccountBalance(accountId, change)
  );
  await Promise.all(balanceUpdates);

  // Update category spending (one update per category)
  const spendingUpdates = Array.from(categorySpendingChanges.entries()).map(
    ([categoryId, amount]) => removeSpendingFromCategory(categoryId, amount)
  );
  await Promise.all(spendingUpdates);
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

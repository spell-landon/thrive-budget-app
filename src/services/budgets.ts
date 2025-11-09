import { supabase } from './supabase';
import { Budget, BudgetCategory } from '../types';

// ==================== BUDGETS ====================

// Get all budgets for a user
export async function getBudgets(userId: string): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Get a specific budget by ID
export async function getBudgetById(budgetId: string): Promise<Budget> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('id', budgetId)
    .single();

  if (error) throw error;
  return data;
}

// Get budget for a specific month
export async function getBudgetByMonth(userId: string, month: number, year: number): Promise<Budget | null> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw error;
  }
  return data;
}

// Get or create budget for current month
export async function getOrCreateCurrentMonthBudget(userId: string): Promise<Budget> {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();

  let budget = await getBudgetByMonth(userId, month, year);

  if (!budget) {
    budget = await createBudget(userId, {
      month,
      year,
      name: `Budget for ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
    });
  }

  return budget;
}

// Create a new budget
export async function createBudget(
  userId: string,
  budget: Omit<Budget, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Budget> {
  const { data, error } = await supabase
    .from('budgets')
    .insert([
      {
        user_id: userId,
        month: budget.month,
        year: budget.year,
        name: budget.name,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update a budget
export async function updateBudget(
  budgetId: string,
  updates: Partial<Omit<Budget, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Budget> {
  const { data, error } = await supabase
    .from('budgets')
    .update(updates)
    .eq('id', budgetId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete a budget (will cascade delete categories due to DB constraints)
export async function deleteBudget(budgetId: string): Promise<void> {
  const { error } = await supabase.from('budgets').delete().eq('id', budgetId);

  if (error) throw error;
}

// ==================== BUDGET CATEGORIES ====================

// Get all categories for a budget (across all accounts)
export async function getBudgetCategories(budgetId: string): Promise<BudgetCategory[]> {
  const { data, error} = await supabase
    .from('budget_categories')
    .select('*')
    .eq('budget_id', budgetId)
    .order('sort_order', { ascending: true })
    .order('category_type', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Get categories for a specific account within a budget
export async function getBudgetCategoriesByAccount(
  budgetId: string,
  accountId: string
): Promise<BudgetCategory[]> {
  const { data, error } = await supabase
    .from('budget_categories')
    .select('*')
    .eq('budget_id', budgetId)
    .eq('account_id', accountId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Get a specific category by ID
export async function getCategoryById(categoryId: string): Promise<BudgetCategory> {
  const { data, error } = await supabase
    .from('budget_categories')
    .select('*')
    .eq('id', categoryId)
    .single();

  if (error) throw error;
  return data;
}

// Create a new budget category
export async function createBudgetCategory(
  category: Omit<BudgetCategory, 'id' | 'created_at' | 'updated_at'>
): Promise<BudgetCategory> {
  // Validate: account_id is required
  if (!category.account_id) {
    throw new Error('account_id is required for budget categories');
  }

  const { data, error } = await supabase
    .from('budget_categories')
    .insert([
      {
        budget_id: category.budget_id,
        account_id: category.account_id,
        name: category.name,
        allocated_amount: category.allocated_amount,
        available_amount: category.available_amount || 0,
        spent_amount: category.spent_amount,
        category_type: category.category_type,
        category_group: category.category_group || null,
        sort_order: category.sort_order || 0,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  // Update budget's total_allocated
  await updateBudgetTotals(category.budget_id);

  return data;
}

// Update a budget category
export async function updateBudgetCategory(
  categoryId: string,
  updates: Partial<Omit<BudgetCategory, 'id' | 'budget_id' | 'created_at' | 'updated_at'>>
): Promise<BudgetCategory> {
  // Validate: Cannot change category type to income
  if (updates.category_type === 'income') {
    throw new Error(
      'Income categories are not supported. Track income via transactions instead.'
    );
  }

  // Get the category first to know which budget to update
  const category = await getCategoryById(categoryId);

  const { data, error } = await supabase
    .from('budget_categories')
    .update(updates)
    .eq('id', categoryId)
    .select()
    .single();

  if (error) throw error;

  // Update budget totals if allocated amount changed
  if (updates.allocated_amount !== undefined) {
    await updateBudgetTotals(category.budget_id);
  }

  return data;
}

// Delete a budget category
export async function deleteBudgetCategory(categoryId: string): Promise<void> {
  // Get the category first to know which budget to update
  const category = await getCategoryById(categoryId);

  const { error } = await supabase.from('budget_categories').delete().eq('id', categoryId);

  if (error) throw error;

  // Update budget totals
  await updateBudgetTotals(category.budget_id);
}

// Update budget totals (recalculate from categories)
// NOTE: This is now a no-op since we removed total_income and total_allocated fields
// Keeping the function for backwards compatibility with existing code
async function updateBudgetTotals(budgetId: string): Promise<void> {
  // No-op: Budget totals are calculated on-demand from categories
  // The database no longer stores total_income and total_allocated
  return;
}

/**
 * Get total allocated amount across all categories in a budget
 * @param budgetId - Budget ID
 * @returns Total allocated amount in cents
 */
export async function getTotalAllocated(budgetId: string): Promise<number> {
  const categories = await getBudgetCategories(budgetId);
  return categories.reduce((sum, cat) => sum + cat.allocated_amount, 0);
}

/**
 * Get total income for a budget from income transactions
 * @param userId - User ID
 * @param month - Month number (1-12)
 * @param year - Year
 * @returns Total income in cents
 */
export async function getTotalIncome(userId: string, month: number, year: number): Promise<number> {
  // Get first and last day of month for date filtering
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  const { data, error } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'income')
    .gte('date', firstDay.toISOString().split('T')[0])
    .lte('date', lastDay.toISOString().split('T')[0]);

  if (error) throw error;

  return (data || []).reduce((sum, transaction) => sum + transaction.amount, 0);
}

// Add spending to a category (called when a transaction is categorized)
export async function addSpendingToCategory(
  categoryId: string,
  amountInCents: number
): Promise<BudgetCategory> {
  const category = await getCategoryById(categoryId);
  const newSpentAmount = category.spent_amount + amountInCents;

  return updateBudgetCategory(categoryId, { spent_amount: newSpentAmount });
}

// Remove spending from a category (called when a categorized transaction is deleted)
export async function removeSpendingFromCategory(
  categoryId: string,
  amountInCents: number
): Promise<BudgetCategory> {
  const category = await getCategoryById(categoryId);
  const newSpentAmount = category.spent_amount - amountInCents;

  return updateBudgetCategory(categoryId, { spent_amount: newSpentAmount });
}

// Copy categories from one budget to another with rollover logic
export async function copyBudgetCategories(
  sourceBudgetId: string,
  targetBudgetId: string,
  userId?: string
): Promise<void> {
  const sourceCategories = await getBudgetCategories(sourceBudgetId);

  for (const category of sourceCategories) {
    // Calculate rollover: available - spent from previous month
    // Only rollover positive amounts (if overspent, start fresh at 0)
    const rolloverAmount = Math.max(0, category.available_amount - category.spent_amount);

    await createBudgetCategory({
      budget_id: targetBudgetId,
      account_id: category.account_id, // Maintain account association
      name: category.name,
      allocated_amount: category.allocated_amount,
      available_amount: rolloverAmount, // Carry forward unspent money
      spent_amount: 0, // Reset spent amount for new month
      category_type: category.category_type,
      category_group: category.category_group,
      sort_order: category.sort_order,
    });
  }

  // Apply subscription auto-population if userId is provided
  if (userId) {
    await applySubscriptionAutoPopulation(targetBudgetId, userId);
  }
}

// Reorder budget categories (update sort_order for multiple categories)
export async function reorderCategories(
  updates: Array<{ id: string; sort_order: number }>
): Promise<void> {
  // Update all categories in a transaction-like manner
  for (const update of updates) {
    await supabase
      .from('budget_categories')
      .update({ sort_order: update.sort_order })
      .eq('id', update.id);
  }
}

// Get categories grouped by category_group
export async function getCategoriesGrouped(
  budgetId: string
): Promise<Record<string, BudgetCategory[]>> {
  const categories = await getBudgetCategories(budgetId);

  const grouped: Record<string, BudgetCategory[]> = {};

  for (const category of categories) {
    const groupName = category.category_group || 'Ungrouped';
    if (!grouped[groupName]) {
      grouped[groupName] = [];
    }
    grouped[groupName].push(category);
  }

  return grouped;
}

// ==================== SUBSCRIPTION AUTO-POPULATION ====================

/**
 * Apply subscription auto-population to budget categories
 * For any subscription with auto_populate_budget enabled, update the linked category's allocated_amount
 */
export async function applySubscriptionAutoPopulation(budgetId: string, userId: string): Promise<void> {
  // Get all subscriptions with auto_populate_budget enabled
  const { data: subscriptions, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('auto_populate_budget', true)
    .not('category_id', 'is', null);

  if (subError) throw subError;
  if (!subscriptions || subscriptions.length === 0) return;

  // Get all categories for this budget
  const categories = await getBudgetCategories(budgetId);

  // For each subscription, find the matching category by name and update its allocated_amount
  for (const subscription of subscriptions) {
    // Find category with matching name (since category_id might be from previous budget)
    const matchingCategory = categories.find(cat =>
      cat.category_type === 'expense' &&
      cat.id === subscription.category_id
    );

    if (matchingCategory && matchingCategory.allocated_amount !== subscription.amount) {
      await updateBudgetCategory(matchingCategory.id, {
        allocated_amount: subscription.amount
      });
    }
  }
}

// ==================== CASH-BASED BUDGETING VALIDATION ====================

// Get total available amount across all categories in a budget
export async function getTotalAvailableInBudget(budgetId: string): Promise<number> {
  const categories = await getBudgetCategories(budgetId);
  return categories.reduce((sum, cat) => sum + cat.available_amount, 0);
}

// Get total account balances for a user
export async function getTotalAccountBalances(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('accounts')
    .select('balance, type')
    .eq('user_id', userId);

  if (error) throw error;

  // Sum all account balances (checking, savings, etc.)
  // Note: Credit cards and loans have negative balances
  return (data || []).reduce((sum, account) => {
    // Only count positive balance accounts for budgeting
    if (account.type === 'checking' || account.type === 'savings' || account.type === 'investment') {
      return sum + account.balance;
    }
    return sum;
  }, 0);
}

// Validate that total available amount doesn't exceed actual account balances
export async function validateCashBasedBudget(
  userId: string,
  budgetId: string
): Promise<{ valid: boolean; availableAmount: number; accountBalances: number; deficit: number }> {
  const [availableAmount, accountBalances] = await Promise.all([
    getTotalAvailableInBudget(budgetId),
    getTotalAccountBalances(userId),
  ]);

  const deficit = availableAmount - accountBalances;

  return {
    valid: deficit <= 0, // Valid if we haven't allocated more than we have
    availableAmount,
    accountBalances,
    deficit: Math.max(0, deficit), // Only show deficit if positive
  };
}

// ==================== READY TO ASSIGN ====================

/**
 * Calculate "Ready to Assign" for a specific account
 * Per-account budgeting: each account has its own Ready to Assign bucket
 *
 * Formula: Account Balance - Total Available in Categories for this Account
 *
 * @param accountId - Account ID
 * @param budgetId - Budget ID for current month
 * @returns Amount in cents available to assign for this account
 */
export async function getReadyToAssignByAccount(
  accountId: string,
  budgetId: string
): Promise<number> {
  // Get account balance
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', accountId)
    .single();

  if (accountError) throw accountError;

  // Get total available in categories for this account
  const categories = await getBudgetCategoriesByAccount(budgetId, accountId);
  const totalAvailable = categories.reduce((sum, cat) => sum + cat.available_amount, 0);

  return account.balance - totalAvailable;
}

/**
 * Calculate "Ready to Assign" amount across all accounts (LEGACY - for backwards compatibility)
 *
 * Note: In per-account budgeting, this is less useful. Use getReadyToAssignByAccount() instead.
 *
 * Formula: Total Account Balances - Total Available in Budget Categories
 *
 * @param userId - User ID
 * @param budgetId - Budget ID for current month
 * @returns Amount in cents available to assign to categories
 */
export async function getReadyToAssign(
  userId: string,
  budgetId: string
): Promise<number> {
  const [accountBalances, availableAmount] = await Promise.all([
    getTotalAccountBalances(userId),
    getTotalAvailableInBudget(budgetId),
  ]);

  return accountBalances - availableAmount;
}

/**
 * Assign money from "Ready to Assign" to a specific category
 * Per-account budgeting: Validates against the account's Ready to Assign
 *
 * @param budgetId - Budget ID (for validation)
 * @param categoryId - Category to fund
 * @param amountToAssign - Amount in cents to assign
 */
export async function assignMoneyToCategory(
  budgetId: string,
  categoryId: string,
  amountToAssign: number
): Promise<BudgetCategory> {
  if (amountToAssign <= 0) {
    throw new Error('Amount to assign must be greater than zero');
  }

  // Get current category
  const category = await getCategoryById(categoryId);

  // Verify category belongs to this budget
  if (category.budget_id !== budgetId) {
    throw new Error('Category does not belong to this budget');
  }

  // Check if we have enough money to assign in this account
  const readyToAssign = await getReadyToAssignByAccount(category.account_id, budgetId);
  if (amountToAssign > readyToAssign) {
    throw new Error(
      `Insufficient funds in this account. You have ${readyToAssign} cents ready to assign, but tried to assign ${amountToAssign} cents.`
    );
  }

  // Update available_amount
  const newAvailableAmount = category.available_amount + amountToAssign;

  return updateBudgetCategory(categoryId, {
    available_amount: newAvailableAmount,
  });
}

/**
 * Quick-assign: Assign one month's allocated_amount to available_amount for a category
 * Useful for quickly funding categories based on their plan
 *
 * @param budgetId - Budget ID (for validation)
 * @param categoryId - Category to fund
 */
export async function quickAssignAllocatedAmount(
  budgetId: string,
  categoryId: string
): Promise<BudgetCategory> {
  const category = await getCategoryById(categoryId);

  if (category.budget_id !== budgetId) {
    throw new Error('Category does not belong to this budget');
  }

  // Assign the full allocated amount
  return assignMoneyToCategory(budgetId, categoryId, category.allocated_amount);
}

// ==================== CATEGORY MONEY MOVEMENT ====================

/**
 * Move money between budget category envelopes within the same account
 * This is a budget-only operation - no transactions are created
 * Money is simply reallocated between envelopes
 *
 * Per-account budgeting: Categories must be in the same account
 *
 * Example: Move $50 from "Dining Out" to "Groceries"
 * - Dining Out available_amount decreases by $50
 * - Groceries available_amount increases by $50
 * - No account balances change
 * - No transactions created
 *
 * @param fromCategoryId - Source category (money leaves envelope)
 * @param toCategoryId - Destination category (money enters envelope)
 * @param amount - Amount in cents to move
 * @returns Both updated categories
 */
export async function moveMoneyBetweenCategories(
  fromCategoryId: string,
  toCategoryId: string,
  amount: number
): Promise<{ fromCategory: BudgetCategory; toCategory: BudgetCategory }> {
  if (amount <= 0) {
    throw new Error('Move amount must be greater than zero');
  }

  if (fromCategoryId === toCategoryId) {
    throw new Error('Cannot move money to the same category');
  }

  // Get both categories
  const [fromCategory, toCategory] = await Promise.all([
    getCategoryById(fromCategoryId),
    getCategoryById(toCategoryId),
  ]);

  // Verify they're in the same budget
  if (fromCategory.budget_id !== toCategory.budget_id) {
    throw new Error('Categories must be in the same budget');
  }

  // Verify they're in the same account (per-account budgeting requirement)
  if (fromCategory.account_id !== toCategory.account_id) {
    throw new Error('Categories must be in the same account. Use transfers to move money between accounts.');
  }

  // Check if source category has enough money
  if (fromCategory.available_amount < amount) {
    throw new Error(
      `Insufficient funds in source category. Has ${fromCategory.available_amount} cents, trying to move ${amount} cents.`
    );
  }

  // Update both categories
  const [updatedFrom, updatedTo] = await Promise.all([
    updateBudgetCategory(fromCategoryId, {
      available_amount: fromCategory.available_amount - amount,
    }),
    updateBudgetCategory(toCategoryId, {
      available_amount: toCategory.available_amount + amount,
    }),
  ]);

  return {
    fromCategory: updatedFrom,
    toCategory: updatedTo,
  };
}

/**
 * Cover overspending in a category by moving money from another category
 * Convenience wrapper around moveMoneyBetweenCategories
 *
 * Automatically calculates the deficit and moves that exact amount
 *
 * @param overspentCategoryId - Category with negative available_amount
 * @param sourceCategoryId - Category to pull money from
 * @returns Both updated categories
 */
export async function coverOverspending(
  overspentCategoryId: string,
  sourceCategoryId: string
): Promise<{ overspentCategory: BudgetCategory; sourceCategory: BudgetCategory }> {
  const overspentCategory = await getCategoryById(overspentCategoryId);

  if (overspentCategory.available_amount >= 0) {
    throw new Error('Category is not overspent');
  }

  // Calculate deficit (make it positive)
  const deficit = Math.abs(overspentCategory.available_amount);

  // Move the exact deficit amount
  const result = await moveMoneyBetweenCategories(sourceCategoryId, overspentCategoryId, deficit);

  return {
    overspentCategory: result.toCategory,
    sourceCategory: result.fromCategory,
  };
}

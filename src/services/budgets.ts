import { supabase } from './supabase';
import { Budget, BudgetCategory } from '../types';

// ==================== BUDGETS ====================

// Get all budgets for a user
export async function getBudgets(userId: string): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
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

// Get budget for a specific month (format: YYYY-MM)
export async function getBudgetByMonth(userId: string, month: string): Promise<Budget | null> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
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
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let budget = await getBudgetByMonth(userId, month);

  if (!budget) {
    budget = await createBudget(userId, {
      month,
      name: `Budget for ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      total_income: 0,
      total_allocated: 0,
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
        name: budget.name,
        total_income: budget.total_income,
        total_allocated: budget.total_allocated,
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

// Get all categories for a budget
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
  const { data, error } = await supabase
    .from('budget_categories')
    .insert([
      {
        budget_id: category.budget_id,
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
async function updateBudgetTotals(budgetId: string): Promise<void> {
  const categories = await getBudgetCategories(budgetId);

  const totalIncome = categories
    .filter((c) => c.category_type === 'income')
    .reduce((sum, c) => sum + c.allocated_amount, 0);

  const totalAllocated = categories
    .filter((c) => c.category_type === 'expense' || c.category_type === 'savings')
    .reduce((sum, c) => sum + c.allocated_amount, 0);

  await updateBudget(budgetId, {
    total_income: totalIncome,
    total_allocated: totalAllocated,
  });
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
 * Calculate "Ready to Assign" amount - money in accounts that hasn't been assigned to categories yet
 * This is the core of envelope budgeting: money must be explicitly assigned before it can be spent
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
 * Updates the category's available_amount
 *
 * @param userId - User ID (for validation)
 * @param budgetId - Budget ID (for validation)
 * @param categoryId - Category to fund
 * @param amountToAssign - Amount in cents to assign
 */
export async function assignMoneyToCategory(
  userId: string,
  budgetId: string,
  categoryId: string,
  amountToAssign: number
): Promise<BudgetCategory> {
  if (amountToAssign <= 0) {
    throw new Error('Amount to assign must be greater than zero');
  }

  // Check if we have enough money to assign
  const readyToAssign = await getReadyToAssign(userId, budgetId);
  if (amountToAssign > readyToAssign) {
    throw new Error(
      `Insufficient funds. You have ${readyToAssign} cents ready to assign, but tried to assign ${amountToAssign} cents.`
    );
  }

  // Get current category
  const category = await getCategoryById(categoryId);

  // Verify category belongs to this budget
  if (category.budget_id !== budgetId) {
    throw new Error('Category does not belong to this budget');
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
 * @param userId - User ID (for validation)
 * @param budgetId - Budget ID (for validation)
 * @param categoryId - Category to fund
 */
export async function quickAssignAllocatedAmount(
  userId: string,
  budgetId: string,
  categoryId: string
): Promise<BudgetCategory> {
  const category = await getCategoryById(categoryId);

  if (category.budget_id !== budgetId) {
    throw new Error('Category does not belong to this budget');
  }

  // Assign the full allocated amount
  return assignMoneyToCategory(userId, budgetId, categoryId, category.allocated_amount);
}

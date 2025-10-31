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
  const { data, error } = await supabase
    .from('budget_categories')
    .select('*')
    .eq('budget_id', budgetId)
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
        spent_amount: category.spent_amount,
        category_type: category.category_type,
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

// Copy categories from one budget to another
export async function copyBudgetCategories(
  sourceBudgetId: string,
  targetBudgetId: string
): Promise<void> {
  const sourceCategories = await getBudgetCategories(sourceBudgetId);

  for (const category of sourceCategories) {
    await createBudgetCategory({
      budget_id: targetBudgetId,
      name: category.name,
      allocated_amount: category.allocated_amount,
      spent_amount: 0, // Reset spent amount for new month
      category_type: category.category_type,
    });
  }
}

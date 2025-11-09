import { supabase } from './supabase';
import { SavingsGoal, BudgetCategory } from '../types';
import {
  createBudgetCategory,
  getBudgetCategoriesByAccount,
  getCategoryById,
  updateBudgetCategory,
} from './budgets';

// ==================== GOALS CRUD ====================

/**
 * Get all savings goals for a user with their current amounts from categories
 */
export async function getGoals(userId: string): Promise<
  Array<SavingsGoal & { current_amount: number }>
> {
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false});

  if (error) throw error;

  const goals = data || [];

  // Fetch current_amount from linked categories
  const goalsWithAmounts = await Promise.all(
    goals.map(async (goal) => {
      try {
        const category = await getCategoryById(goal.category_id);
        return {
          ...goal,
          current_amount: category.available_amount,
        };
      } catch (error) {
        // If category is missing, return 0
        return {
          ...goal,
          current_amount: 0,
        };
      }
    })
  );

  return goalsWithAmounts;
}

/**
 * Get a single savings goal by ID with current amount
 */
export async function getGoal(goalId: string): Promise<SavingsGoal & { current_amount: number }> {
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('id', goalId)
    .single();

  if (error) throw error;

  // Fetch current_amount from linked category
  try {
    const category = await getCategoryById(data.category_id);
    return {
      ...data,
      current_amount: category.available_amount,
    };
  } catch (error) {
    return {
      ...data,
      current_amount: 0,
    };
  }
}

/**
 * Create a new savings goal
 * Must provide category_id (category in a goal-tracking account)
 */
export async function createGoal(
  userId: string,
  goal: {
    name: string;
    target_amount: number;
    category_id: string; // Required: category in goal-tracking account
    target_date?: string;
    image_url?: string;
  }
): Promise<SavingsGoal> {
  // Validate that category exists and is in a goal-tracking account
  const category = await getCategoryById(goal.category_id);

  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('is_goal_tracking')
    .eq('id', category.account_id)
    .single();

  if (accountError) throw accountError;

  if (!account.is_goal_tracking) {
    throw new Error('Category must be in a goal-tracking account');
  }

  const { data, error } = await supabase
    .from('savings_goals')
    .insert({
      user_id: userId,
      name: goal.name,
      target_amount: goal.target_amount,
      category_id: goal.category_id,
      target_date: goal.target_date,
      image_url: goal.image_url,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a savings goal (metadata only - amount is in category)
 */
export async function updateGoal(
  goalId: string,
  updates: {
    name?: string;
    target_amount?: number;
    target_date?: string;
    image_url?: string;
  }
): Promise<SavingsGoal> {
  const { data, error } = await supabase
    .from('savings_goals')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', goalId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Add money to a savings goal (updates the linked category's available_amount)
 */
export async function addToGoal(goalId: string, amount: number): Promise<SavingsGoal & { current_amount: number }> {
  const goal = await getGoal(goalId);
  const category = await getCategoryById(goal.category_id);

  // Update category's available_amount
  await updateBudgetCategory(category.id, {
    available_amount: category.available_amount + amount,
  });

  return getGoal(goalId);
}

/**
 * Spend from a savings goal (decreases the linked category's available_amount)
 */
export async function spendFromGoal(
  goalId: string,
  amount: number
): Promise<SavingsGoal & { current_amount: number }> {
  const goal = await getGoal(goalId);
  const category = await getCategoryById(goal.category_id);

  if (category.available_amount < amount) {
    throw new Error('Insufficient funds in goal');
  }

  // Decrease category's available_amount
  await updateBudgetCategory(category.id, {
    available_amount: category.available_amount - amount,
  });

  return getGoal(goalId);
}

/**
 * Transfer money from one goal to another
 * (Moves money between categories in goal-tracking accounts)
 */
export async function transferBetweenGoals(
  fromGoalId: string,
  toGoalId: string,
  amount: number
): Promise<void> {
  const [fromGoal, toGoal] = await Promise.all([
    getGoal(fromGoalId),
    getGoal(toGoalId),
  ]);

  const [fromCategory, toCategory] = await Promise.all([
    getCategoryById(fromGoal.category_id),
    getCategoryById(toGoal.category_id),
  ]);

  if (fromCategory.available_amount < amount) {
    throw new Error('Insufficient funds in source goal');
  }

  // Move money between categories
  await Promise.all([
    updateBudgetCategory(fromCategory.id, {
      available_amount: fromCategory.available_amount - amount,
    }),
    updateBudgetCategory(toCategory.id, {
      available_amount: toCategory.available_amount + amount,
    }),
  ]);
}

/**
 * Delete a savings goal and its linked category
 */
export async function deleteGoal(goalId: string): Promise<void> {
  // Get the goal to find the category_id
  const goal = await getGoal(goalId);

  // Delete the goal first
  const { error: goalError } = await supabase
    .from('savings_goals')
    .delete()
    .eq('id', goalId);

  if (goalError) throw goalError;

  // Then delete the linked category
  const { error: categoryError } = await supabase
    .from('budget_categories')
    .delete()
    .eq('id', goal.category_id);

  if (categoryError) throw categoryError;
}

// ==================== CATEGORY LINKAGE ====================

/**
 * Create a category in a goal-tracking account and link it to a goal
 * Used when creating a new goal - creates the category in a goal-tracking account
 *
 * @param userId - User ID
 * @param budgetId - Budget ID for current month
 * @param accountId - Must be a goal-tracking account
 * @param goalName - Name for both goal and category
 * @returns The created category
 */
export async function createGoalCategory(
  userId: string,
  budgetId: string,
  accountId: string,
  goalName: string
): Promise<BudgetCategory> {
  // Verify account is goal-tracking
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('is_goal_tracking')
    .eq('id', accountId)
    .single();

  if (accountError) throw accountError;

  if (!account.is_goal_tracking) {
    throw new Error('Account must be a goal-tracking account');
  }

  const category = await createBudgetCategory({
    budget_id: budgetId,
    account_id: accountId,
    name: goalName,
    category_type: 'expense', // All categories are expense type now
    allocated_amount: 0, // Goals don't have monthly targets
    available_amount: 0,
    spent_amount: 0,
    sort_order: 0,
  });

  return category;
}

/**
 * Get all goals with their linked category and account information
 */
export async function getGoalsWithCategories(
  userId: string
): Promise<
  Array<
    SavingsGoal & {
      current_amount: number;
      category: BudgetCategory & { account: { id: string; name: string } };
    }
  >
> {
  const goals = await getGoals(userId);

  // Fetch linked categories and accounts for all goals
  const goalsWithCategories = await Promise.all(
    goals.map(async (goal) => {
      try {
        const category = await getCategoryById(goal.category_id);

        // Fetch account information including institution
        const { data: account, error: accountError } = await supabase
          .from('accounts')
          .select('id, name, institution')
          .eq('id', category.account_id)
          .single();

        if (accountError) throw accountError;

        return {
          ...goal,
          category: {
            ...category,
            account,
          },
        };
      } catch (error) {
        throw new Error(`Category or account not found for goal ${goal.id}`);
      }
    })
  );

  return goalsWithCategories;
}

/**
 * Get all categories from goal-tracking accounts for a user
 * These are potential goals to display on the Goals screen
 */
export async function getGoalTrackingCategories(
  userId: string,
  budgetId: string
): Promise<BudgetCategory[]> {
  // Get all goal-tracking accounts for this user
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('is_goal_tracking', true);

  if (accountsError) throw accountsError;

  if (!accounts || accounts.length === 0) {
    return [];
  }

  // Get all categories from these accounts
  const allCategories: BudgetCategory[] = [];
  for (const account of accounts) {
    const categories = await getBudgetCategoriesByAccount(budgetId, account.id);
    allCategories.push(...categories);
  }

  return allCategories;
}

// ==================== IMAGE SUGGESTIONS ====================

/**
 * Get default goal images from Unsplash
 */
export const defaultGoalImages = {
  'Emergency Fund': 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80',
  'Vacation': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  'House Down Payment': 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
  'Car': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80',
  'Wedding': 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
  'Education': 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80',
  'Retirement': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
  'Business': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
  'Travel': 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80',
  'Savings': 'https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=800&q=80',
};

/**
 * Get suggested image based on goal name
 */
export function getSuggestedImage(goalName: string): string {
  const lowerName = goalName.toLowerCase();

  if (lowerName.includes('emergency') || lowerName.includes('fund')) {
    return defaultGoalImages['Emergency Fund'];
  } else if (lowerName.includes('vacation') || lowerName.includes('holiday')) {
    return defaultGoalImages['Vacation'];
  } else if (lowerName.includes('house') || lowerName.includes('home') || lowerName.includes('down payment')) {
    return defaultGoalImages['House Down Payment'];
  } else if (lowerName.includes('car') || lowerName.includes('vehicle')) {
    return defaultGoalImages['Car'];
  } else if (lowerName.includes('wedding') || lowerName.includes('marriage')) {
    return defaultGoalImages['Wedding'];
  } else if (lowerName.includes('education') || lowerName.includes('college') || lowerName.includes('school')) {
    return defaultGoalImages['Education'];
  } else if (lowerName.includes('retire')) {
    return defaultGoalImages['Retirement'];
  } else if (lowerName.includes('business') || lowerName.includes('startup')) {
    return defaultGoalImages['Business'];
  } else if (lowerName.includes('travel') || lowerName.includes('trip')) {
    return defaultGoalImages['Travel'];
  } else {
    return defaultGoalImages['Savings'];
  }
}

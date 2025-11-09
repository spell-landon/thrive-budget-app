import { supabase } from './supabase';
import { IncomeSource, IncomeTemplate, IncomeAccountSplit, BudgetCategory } from '../types';
import {
  getBudgetCategories,
  getBudgetCategoriesByAccount,
  createBudgetCategory,
  updateBudgetCategory,
  assignMoneyToCategory,
} from './budgets';

// ==================== INCOME SOURCES ====================

/**
 * Get all income sources for a user
 */
export async function getIncomeSources(userId: string): Promise<IncomeSource[]> {
  const { data, error } = await supabase
    .from('income_sources')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single income source by ID
 */
export async function getIncomeSource(sourceId: string): Promise<IncomeSource> {
  const { data, error } = await supabase
    .from('income_sources')
    .select('*')
    .eq('id', sourceId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new income source
 */
export async function createIncomeSource(
  userId: string,
  source: {
    name: string;
    expected_amount?: number;
    frequency?: string;
    notes?: string;
    is_active?: boolean;
  }
): Promise<IncomeSource> {
  const { data, error } = await supabase
    .from('income_sources')
    .insert({
      user_id: userId,
      name: source.name,
      expected_amount: source.expected_amount || 0,
      frequency: source.frequency,
      notes: source.notes,
      is_active: source.is_active !== undefined ? source.is_active : true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an income source
 */
export async function updateIncomeSource(
  sourceId: string,
  updates: {
    name?: string;
    expected_amount?: number;
    frequency?: string;
    notes?: string;
    is_active?: boolean;
  }
): Promise<IncomeSource> {
  const { data, error } = await supabase
    .from('income_sources')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sourceId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete an income source (will cascade delete templates)
 */
export async function deleteIncomeSource(sourceId: string): Promise<void> {
  const { error } = await supabase
    .from('income_sources')
    .delete()
    .eq('id', sourceId);

  if (error) throw error;
}

// ==================== INCOME ACCOUNT SPLITS ====================

/**
 * Get all account splits for an income source
 */
export async function getAccountSplits(sourceId: string): Promise<IncomeAccountSplit[]> {
  const { data, error } = await supabase
    .from('income_account_splits')
    .select('*')
    .eq('income_source_id', sourceId)
    .order('priority', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single account split by ID
 */
export async function getAccountSplit(splitId: string): Promise<IncomeAccountSplit> {
  const { data, error } = await supabase
    .from('income_account_splits')
    .select('*')
    .eq('id', splitId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new account split
 */
export async function createAccountSplit(
  sourceId: string,
  split: {
    account_id: string;
    allocation_type: 'percentage' | 'fixed' | 'remainder';
    allocation_value: number;
    priority?: number;
  }
): Promise<IncomeAccountSplit> {
  // Validate allocation value
  if (split.allocation_type === 'percentage') {
    if (split.allocation_value < 0 || split.allocation_value > 100) {
      throw new Error('Percentage allocation must be between 0 and 100');
    }
  } else if (split.allocation_type === 'fixed') {
    if (split.allocation_value < 0) {
      throw new Error('Fixed allocation must be a positive amount');
    }
  }
  // For 'remainder' type, allocation_value is ignored

  // Ensure only one 'remainder' split exists
  if (split.allocation_type === 'remainder') {
    const existingSplits = await getAccountSplits(sourceId);
    const hasRemainder = existingSplits.some(s => s.allocation_type === 'remainder');
    if (hasRemainder) {
      throw new Error('Only one remainder account split is allowed per income source');
    }
  }

  const { data, error } = await supabase
    .from('income_account_splits')
    .insert({
      income_source_id: sourceId,
      account_id: split.account_id,
      allocation_type: split.allocation_type,
      allocation_value: split.allocation_value,
      priority: split.priority || 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an account split
 */
export async function updateAccountSplit(
  splitId: string,
  updates: {
    account_id?: string;
    allocation_type?: 'percentage' | 'fixed' | 'remainder';
    allocation_value?: number;
    priority?: number;
  }
): Promise<IncomeAccountSplit> {
  // Validate allocation value if being updated
  if (updates.allocation_value !== undefined) {
    const split = await getAccountSplit(splitId);
    const allocationType = updates.allocation_type || split.allocation_type;

    if (allocationType === 'percentage') {
      if (updates.allocation_value < 0 || updates.allocation_value > 100) {
        throw new Error('Percentage allocation must be between 0 and 100');
      }
    } else if (allocationType === 'fixed') {
      if (updates.allocation_value < 0) {
        throw new Error('Fixed allocation must be a positive amount');
      }
    }
  }

  // Validate remainder constraint
  if (updates.allocation_type === 'remainder') {
    const split = await getAccountSplit(splitId);
    const allSplits = await getAccountSplits(split.income_source_id);
    const otherRemainderSplits = allSplits.filter(
      s => s.allocation_type === 'remainder' && s.id !== splitId
    );
    if (otherRemainderSplits.length > 0) {
      throw new Error('Only one remainder account split is allowed per income source');
    }
  }

  const { data, error } = await supabase
    .from('income_account_splits')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', splitId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete an account split (will cascade delete related templates)
 */
export async function deleteAccountSplit(splitId: string): Promise<void> {
  const { error } = await supabase
    .from('income_account_splits')
    .delete()
    .eq('id', splitId);

  if (error) throw error;
}

/**
 * Reorder account splits by updating priority
 */
export async function reorderAccountSplits(
  updates: Array<{ id: string; priority: number }>
): Promise<void> {
  for (const update of updates) {
    await supabase
      .from('income_account_splits')
      .update({ priority: update.priority })
      .eq('id', update.id);
  }
}

/**
 * Get total percentage allocated in account splits
 */
export async function getAccountSplitTotalPercentage(
  sourceId: string
): Promise<number> {
  const splits = await getAccountSplits(sourceId);

  return splits
    .filter((s) => s.allocation_type === 'percentage')
    .reduce((sum, s) => sum + s.allocation_value, 0);
}

/**
 * Get total fixed amount allocated in account splits
 */
export async function getAccountSplitTotalFixed(sourceId: string): Promise<number> {
  const splits = await getAccountSplits(sourceId);

  return splits
    .filter((s) => s.allocation_type === 'fixed')
    .reduce((sum, s) => sum + s.allocation_value, 0);
}

// ==================== INCOME TEMPLATES ====================

/**
 * Get all templates for an income source
 */
export async function getTemplates(sourceId: string): Promise<IncomeTemplate[]> {
  const { data, error } = await supabase
    .from('income_templates')
    .select('*')
    .eq('income_source_id', sourceId)
    .order('priority', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single template by ID
 */
export async function getTemplate(templateId: string): Promise<IncomeTemplate> {
  const { data, error } = await supabase
    .from('income_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new income template
 */
export async function createTemplate(
  sourceId: string,
  template: {
    category_name: string;
    category_type: 'expense' | 'savings';
    allocation_type: 'percentage' | 'fixed';
    allocation_value: number;
    priority?: number;
  }
): Promise<IncomeTemplate> {
  // Validate allocation value
  if (template.allocation_type === 'percentage') {
    if (template.allocation_value < 0 || template.allocation_value > 100) {
      throw new Error('Percentage allocation must be between 0 and 100');
    }
  } else if (template.allocation_value < 0) {
    throw new Error('Fixed allocation must be a positive amount');
  }

  const { data, error } = await supabase
    .from('income_templates')
    .insert({
      income_source_id: sourceId,
      category_name: template.category_name,
      category_type: template.category_type,
      allocation_type: template.allocation_type,
      allocation_value: template.allocation_value,
      priority: template.priority || 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an income template
 */
export async function updateTemplate(
  templateId: string,
  updates: {
    category_name?: string;
    category_type?: 'expense' | 'savings';
    allocation_type?: 'percentage' | 'fixed';
    allocation_value?: number;
    priority?: number;
  }
): Promise<IncomeTemplate> {
  // Validate allocation value if being updated
  if (updates.allocation_value !== undefined) {
    const template = await getTemplate(templateId);
    const allocationType = updates.allocation_type || template.allocation_type;

    if (allocationType === 'percentage') {
      if (updates.allocation_value < 0 || updates.allocation_value > 100) {
        throw new Error('Percentage allocation must be between 0 and 100');
      }
    } else if (updates.allocation_value < 0) {
      throw new Error('Fixed allocation must be a positive amount');
    }
  }

  const { data, error } = await supabase
    .from('income_templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete an income template
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('income_templates')
    .delete()
    .eq('id', templateId);

  if (error) throw error;
}

/**
 * Reorder templates by updating priority
 */
export async function reorderTemplates(
  updates: Array<{ id: string; priority: number }>
): Promise<void> {
  for (const update of updates) {
    await supabase
      .from('income_templates')
      .update({ priority: update.priority })
      .eq('id', update.id);
  }
}

// ==================== TEMPLATE APPLICATION ====================

/**
 * Apply an income template to a budget with account splits
 * Takes an income amount, splits it across accounts, then allocates to categories within each account
 *
 * @param userId - User ID
 * @param budgetId - Budget ID to apply template to
 * @param sourceId - Income source ID with templates to apply
 * @param incomeAmount - Actual income amount in cents
 * @returns Object with account splits and updated categories per account
 */
export async function applyIncomeTemplate(
  userId: string,
  budgetId: string,
  sourceId: string,
  incomeAmount: number
): Promise<{
  accountAllocations: Array<{
    accountId: string;
    amount: number;
    categories: BudgetCategory[];
  }>;
  totalAllocated: number;
}> {
  // Get account splits for this income source
  const accountSplits = await getAccountSplits(sourceId);

  if (accountSplits.length === 0) {
    throw new Error('No account splits configured for this income source');
  }

  const accountAllocations: Array<{
    accountId: string;
    amount: number;
    categories: BudgetCategory[];
  }> = [];

  let remainingIncome = incomeAmount;

  // Step 1: Split income across accounts based on account splits
  const accountAmounts: Map<string, number> = new Map();

  for (const split of accountSplits) {
    let amountForAccount = 0;

    if (split.allocation_type === 'fixed') {
      amountForAccount = Math.min(split.allocation_value, remainingIncome);
    } else if (split.allocation_type === 'percentage') {
      amountForAccount = Math.round(
        (incomeAmount * split.allocation_value) / 100
      );
      amountForAccount = Math.min(amountForAccount, remainingIncome);
    } else if (split.allocation_type === 'remainder') {
      // Remainder gets everything left
      amountForAccount = remainingIncome;
    }

    if (amountForAccount > 0) {
      accountAmounts.set(split.account_id, amountForAccount);
      remainingIncome -= amountForAccount;
    }
  }

  // Step 2: For each account, apply category templates
  for (const [accountId, accountAmount] of accountAmounts) {
    const updatedCategories: BudgetCategory[] = [];
    let remainingForAccount = accountAmount;

    // Get templates for this account (either linked to specific split or no split)
    const templates = await getTemplates(sourceId);
    const accountTemplates = templates.filter((t) => {
      if (t.account_split_id) {
        // Template is linked to specific account split
        const split = accountSplits.find(s => s.id === t.account_split_id);
        return split?.account_id === accountId;
      }
      // Template with no account_split_id applies to all accounts
      return true;
    });

    // Get existing categories for this account
    const existingCategories = await getBudgetCategoriesByAccount(budgetId, accountId);

    // Process category templates in priority order
    for (const template of accountTemplates) {
      let amountToAllocate = 0;

      if (template.allocation_type === 'fixed') {
        amountToAllocate = Math.min(template.allocation_value, remainingForAccount);
      } else if (template.allocation_type === 'percentage') {
        amountToAllocate = Math.round(
          (accountAmount * template.allocation_value) / 100
        );
        amountToAllocate = Math.min(amountToAllocate, remainingForAccount);
      }

      if (amountToAllocate <= 0) continue;

      // Find or create category with this name in this account
      let category = existingCategories.find(
        (c) => c.name === template.category_name && c.account_id === accountId
      );

      if (!category) {
        // Create category if it doesn't exist
        category = await createBudgetCategory({
          budget_id: budgetId,
          account_id: accountId,
          name: template.category_name,
          category_type: template.category_type,
          allocated_amount: 0,
          available_amount: 0,
          spent_amount: 0,
          sort_order: 0,
        });
        existingCategories.push(category);
      }

      // Assign money to the category
      const updatedCategory = await assignMoneyToCategory(
        budgetId,
        category.id,
        amountToAllocate
      );

      updatedCategories.push(updatedCategory);
      remainingForAccount -= amountToAllocate;
    }

    accountAllocations.push({
      accountId,
      amount: accountAmount,
      categories: updatedCategories,
    });
  }

  const totalAllocated = incomeAmount - remainingIncome;

  return {
    accountAllocations,
    totalAllocated,
  };
}

/**
 * Preview what would happen if a template was applied with account splits
 * Doesn't actually update anything, just returns the allocations per account
 */
export async function previewTemplateApplication(
  budgetId: string,
  sourceId: string,
  incomeAmount: number
): Promise<{
  accountSplits: Array<{
    accountId: string;
    amount: number;
    categories: Array<{
      category_name: string;
      category_type: 'expense';
      amount: number;
      exists: boolean;
    }>;
  }>;
  totalAllocated: number;
  remainingIncome: number;
}> {
  const accountSplits = await getAccountSplits(sourceId);

  if (accountSplits.length === 0) {
    throw new Error('No account splits configured for this income source');
  }

  const preview: Array<{
    accountId: string;
    amount: number;
    categories: Array<{
      category_name: string;
      category_type: 'expense';
      amount: number;
      exists: boolean;
    }>;
  }> = [];

  let remainingIncome = incomeAmount;

  // Step 1: Calculate account splits
  const accountAmounts: Map<string, number> = new Map();

  for (const split of accountSplits) {
    let amountForAccount = 0;

    if (split.allocation_type === 'fixed') {
      amountForAccount = Math.min(split.allocation_value, remainingIncome);
    } else if (split.allocation_type === 'percentage') {
      amountForAccount = Math.round(
        (incomeAmount * split.allocation_value) / 100
      );
      amountForAccount = Math.min(amountForAccount, remainingIncome);
    } else if (split.allocation_type === 'remainder') {
      amountForAccount = remainingIncome;
    }

    if (amountForAccount > 0) {
      accountAmounts.set(split.account_id, amountForAccount);
      remainingIncome -= amountForAccount;
    }
  }

  // Step 2: For each account, preview category allocations
  const templates = await getTemplates(sourceId);

  for (const [accountId, accountAmount] of accountAmounts) {
    const categoryPreviews: Array<{
      category_name: string;
      category_type: 'expense';
      amount: number;
      exists: boolean;
    }> = [];

    let remainingForAccount = accountAmount;

    // Get templates for this account
    const accountTemplates = templates.filter((t) => {
      if (t.account_split_id) {
        const split = accountSplits.find(s => s.id === t.account_split_id);
        return split?.account_id === accountId;
      }
      return true;
    });

    const existingCategories = await getBudgetCategoriesByAccount(budgetId, accountId);

    for (const template of accountTemplates) {
      let amountToAllocate = 0;

      if (template.allocation_type === 'fixed') {
        amountToAllocate = Math.min(template.allocation_value, remainingForAccount);
      } else if (template.allocation_type === 'percentage') {
        amountToAllocate = Math.round(
          (accountAmount * template.allocation_value) / 100
        );
        amountToAllocate = Math.min(amountToAllocate, remainingForAccount);
      }

      if (amountToAllocate <= 0) continue;

      const categoryExists = existingCategories.some(
        (c) => c.name === template.category_name && c.account_id === accountId
      );

      categoryPreviews.push({
        category_name: template.category_name,
        category_type: template.category_type,
        amount: amountToAllocate,
        exists: categoryExists,
      });

      remainingForAccount -= amountToAllocate;
    }

    preview.push({
      accountId,
      amount: accountAmount,
      categories: categoryPreviews,
    });
  }

  const totalAllocated = incomeAmount - remainingIncome;

  return {
    accountSplits: preview,
    totalAllocated,
    remainingIncome,
  };
}

/**
 * Get total percentage allocated in templates
 * Useful for validation (should not exceed 100%)
 */
export async function getTotalPercentageAllocated(
  sourceId: string
): Promise<number> {
  const templates = await getTemplates(sourceId);

  return templates
    .filter((t) => t.allocation_type === 'percentage')
    .reduce((sum, t) => sum + t.allocation_value, 0);
}

/**
 * Get total fixed amount allocated in templates
 */
export async function getTotalFixedAllocated(sourceId: string): Promise<number> {
  const templates = await getTemplates(sourceId);

  return templates
    .filter((t) => t.allocation_type === 'fixed')
    .reduce((sum, t) => sum + t.allocation_value, 0);
}

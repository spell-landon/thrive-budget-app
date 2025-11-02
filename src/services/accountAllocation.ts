import { supabase } from './supabase';
import {
  AccountAllocationRule,
  AllocationAllocationType,
  AllocationTargetType,
  BudgetCategory,
  SavingsGoal,
  Subscription,
} from '../types';

// ============================================================================
// CRUD Operations for Account Allocation Rules
// ============================================================================

/**
 * Get all allocation rules for an account, ordered by priority
 */
export async function getAllocationRules(
  accountId: string
): Promise<AccountAllocationRule[]> {
  const { data, error } = await supabase
    .from('account_allocation_rules')
    .select('*')
    .eq('account_id', accountId)
    .order('priority_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Create a new allocation rule
 */
export async function createAllocationRule(
  userId: string,
  rule: {
    account_id: string;
    target_type: AllocationTargetType;
    target_id?: string;
    allocation_type: AllocationAllocationType;
    amount?: number;
    percentage?: number;
    priority_order: number;
    due_date_aware?: boolean;
    overflow_target_id?: string;
    overflow_target_type?: 'category' | 'goal';
  }
): Promise<AccountAllocationRule> {
  const { data, error } = await supabase
    .from('account_allocation_rules')
    .insert({ ...rule, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing allocation rule
 */
export async function updateAllocationRule(
  ruleId: string,
  updates: Partial<AccountAllocationRule>
): Promise<AccountAllocationRule> {
  const { data, error } = await supabase
    .from('account_allocation_rules')
    .update(updates)
    .eq('id', ruleId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete an allocation rule
 */
export async function deleteAllocationRule(ruleId: string): Promise<void> {
  const { error } = await supabase
    .from('account_allocation_rules')
    .delete()
    .eq('id', ruleId);

  if (error) throw error;
}

/**
 * Reorder allocation rules by updating priority_order
 */
export async function reorderAllocationRules(
  rules: { id: string; priority_order: number }[]
): Promise<void> {
  const updates = rules.map((rule) =>
    supabase
      .from('account_allocation_rules')
      .update({ priority_order: rule.priority_order })
      .eq('id', rule.id)
  );

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    throw new Error('Failed to reorder rules');
  }
}

// ============================================================================
// Allocation Execution - The Smart Engine
// ============================================================================

export interface AllocationResult {
  target_type: AllocationTargetType;
  target_id?: string;
  target_name: string;
  amount: number; // cents
  rule_id: string;
  overflow_amount?: number; // if goal was full and overflowed
  overflow_target_id?: string;
  overflow_target_name?: string;
}

interface AllocationContext {
  userId: string;
  accountId: string;
  budgetId: string; // current month's budget
  availableAmount: number; // cents available in account
  currentDate: string; // for date-aware allocation
  nextPayDate?: string; // when next paycheck arrives (for date range)
}

/**
 * Calculate how money in an account should be allocated
 * This is the BRAIN of the smart allocation system
 */
export async function calculateAllocation(
  context: AllocationContext
): Promise<AllocationResult[]> {
  const rules = await getAllocationRules(context.accountId);

  if (rules.length === 0) {
    throw new Error('No allocation rules configured for this account');
  }

  const results: AllocationResult[] = [];
  let remaining = context.availableAmount;
  const allocatedTargets = new Set<string>(); // Track what we've allocated to

  // Load data we'll need for execution
  const [categories, goals, subscriptions] = await Promise.all([
    loadBudgetCategories(context.budgetId),
    loadGoals(context.userId),
    loadSubscriptions(context.userId),
  ]);

  // Process each rule in priority order
  for (const rule of rules) {
    if (remaining <= 0) break;

    let allocationAmount = 0;
    let targetInfo: any = null;
    let overflowAmount = 0;
    let overflowTargetInfo: any = null;

    // Handle date-aware prioritization
    if (rule.due_date_aware && rule.target_type === 'category') {
      // This rule wants to pay things due soon first
      const dueSoonItems = await getDueSoonItems(
        context,
        categories,
        subscriptions
      );

      // Allocate to these first before proceeding with normal allocation
      for (const item of dueSoonItems) {
        if (remaining <= 0) break;

        const needed = item.amount - item.current_allocated;
        const toAllocate = Math.min(needed, remaining);

        if (toAllocate > 0) {
          results.push({
            target_type: 'category',
            target_id: item.category_id,
            target_name: item.name,
            amount: toAllocate,
            rule_id: rule.id,
          });

          remaining -= toAllocate;
          allocatedTargets.add(item.category_id);
        }
      }

      continue; // Move to next rule
    }

    // Handle different target types
    switch (rule.target_type) {
      case 'category':
        targetInfo = categories.find((c) => c.id === rule.target_id);
        if (!targetInfo) break;

        allocationAmount = calculateRuleAmount(
          rule,
          remaining,
          context.availableAmount
        );
        break;

      case 'goal':
        targetInfo = goals.find((g) => g.id === rule.target_id);
        if (!targetInfo) break;

        allocationAmount = calculateRuleAmount(
          rule,
          remaining,
          context.availableAmount
        );

        // Handle goal overflow
        const spaceLeft = targetInfo.target_amount - targetInfo.current_amount;
        if (allocationAmount > spaceLeft) {
          overflowAmount = allocationAmount - spaceLeft;
          allocationAmount = spaceLeft;

          // Send overflow to another target
          if (rule.overflow_target_id && rule.overflow_target_type) {
            if (rule.overflow_target_type === 'goal') {
              overflowTargetInfo = goals.find(
                (g) => g.id === rule.overflow_target_id
              );
            } else {
              overflowTargetInfo = categories.find(
                (c) => c.id === rule.overflow_target_id
              );
            }
          }
        }
        break;

      case 'split_remaining':
        // Split remaining money among all unallocated categories
        const unallocatedCategories = categories.filter(
          (c) =>
            c.allocated_amount > 0 && // Has a budget this month
            !allocatedTargets.has(c.id) // Hasn't been allocated yet
        );

        if (unallocatedCategories.length > 0) {
          const perCategory = Math.floor(
            remaining / unallocatedCategories.length
          );

          for (const category of unallocatedCategories) {
            results.push({
              target_type: 'category',
              target_id: category.id,
              target_name: category.name,
              amount: perCategory,
              rule_id: rule.id,
            });
            allocatedTargets.add(category.id);
          }

          remaining = remaining % unallocatedCategories.length; // leftover cents
        }
        continue; // Move to next rule

      case 'unallocated':
        // Leave as unallocated (just consume the remaining)
        results.push({
          target_type: 'unallocated',
          target_name: 'Unallocated',
          amount: remaining,
          rule_id: rule.id,
        });
        remaining = 0;
        continue;
    }

    // Add the allocation to results
    if (allocationAmount > 0 && targetInfo) {
      results.push({
        target_type: rule.target_type,
        target_id: rule.target_id,
        target_name: targetInfo.name,
        amount: allocationAmount,
        rule_id: rule.id,
      });

      remaining -= allocationAmount;
      if (rule.target_id) allocatedTargets.add(rule.target_id);
    }

    // Handle overflow if it exists
    if (overflowAmount > 0 && overflowTargetInfo) {
      const overflowToAllocate = Math.min(overflowAmount, remaining);

      results.push({
        target_type: rule.overflow_target_type!,
        target_id: rule.overflow_target_id,
        target_name: overflowTargetInfo.name,
        amount: overflowToAllocate,
        rule_id: rule.id,
        overflow_amount: overflowToAllocate,
        overflow_target_id: rule.overflow_target_id,
        overflow_target_name: overflowTargetInfo.name,
      });

      remaining -= overflowToAllocate;
    }
  }

  return results;
}

/**
 * Execute allocation by updating category available_amounts and goal current_amounts
 */
export async function executeAllocation(
  context: AllocationContext
): Promise<AllocationResult[]> {
  const allocations = await calculateAllocation(context);

  // Apply each allocation
  for (const allocation of allocations) {
    if (allocation.target_type === 'category' && allocation.target_id) {
      // Increase category's available_amount (envelope budgeting - accumulates!)
      await supabase.rpc('increment_category_available', {
        p_category_id: allocation.target_id,
        p_amount: allocation.amount,
      });

      // Fallback if RPC doesn't exist
      const { data: category } = await supabase
        .from('budget_categories')
        .select('available_amount')
        .eq('id', allocation.target_id)
        .single();

      if (category) {
        await supabase
          .from('budget_categories')
          .update({
            available_amount: category.available_amount + allocation.amount,
          })
          .eq('id', allocation.target_id);
      }
    } else if (allocation.target_type === 'goal' && allocation.target_id) {
      // Increase goal's current_amount
      const { data: goal } = await supabase
        .from('savings_goals')
        .select('current_amount')
        .eq('id', allocation.target_id)
        .single();

      if (goal) {
        await supabase
          .from('savings_goals')
          .update({
            current_amount: goal.current_amount + allocation.amount,
          })
          .eq('id', allocation.target_id);
      }
    }
  }

  return allocations;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate allocation amount based on rule type
 */
function calculateRuleAmount(
  rule: AccountAllocationRule,
  remaining: number,
  totalAvailable: number
): number {
  let amount = 0;

  switch (rule.allocation_type) {
    case 'fixed':
      amount = Math.min(rule.amount || 0, remaining);
      break;

    case 'percentage':
      amount = Math.floor((totalAvailable * (rule.percentage || 0)) / 100);
      amount = Math.min(amount, remaining);
      break;

    case 'remainder':
      amount = remaining;
      break;

    case 'split':
      // Handled separately in main logic
      amount = 0;
      break;
  }

  return amount;
}

/**
 * Load budget categories for the current month
 */
async function loadBudgetCategories(
  budgetId: string
): Promise<BudgetCategory[]> {
  const { data, error } = await supabase
    .from('budget_categories')
    .select('*')
    .eq('budget_id', budgetId);

  if (error) throw error;
  return data || [];
}

/**
 * Load user's savings goals
 */
async function loadGoals(userId: string): Promise<SavingsGoal[]> {
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

/**
 * Load user's subscriptions
 */
async function loadSubscriptions(userId: string): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

/**
 * Get items (subscriptions, categories with due dates) that are due soon
 * Returns them sorted by due date (earliest first)
 */
async function getDueSoonItems(
  context: AllocationContext,
  categories: BudgetCategory[],
  subscriptions: Subscription[]
): Promise<
  Array<{
    category_id: string;
    name: string;
    amount: number;
    current_allocated: number;
    due_date: string;
  }>
> {
  const items: Array<any> = [];
  const endDate = context.nextPayDate || addDays(context.currentDate, 14); // Default 2 weeks

  // Add subscriptions due in this period
  for (const sub of subscriptions) {
    if (sub.next_billing_date <= endDate && sub.category_id) {
      const category = categories.find((c) => c.id === sub.category_id);
      if (category) {
        items.push({
          category_id: sub.category_id,
          name: `${sub.name} (Due ${formatDate(sub.next_billing_date)})`,
          amount: sub.amount,
          current_allocated: category.available_amount,
          due_date: sub.next_billing_date,
        });
      }
    }
  }

  // Add categories with due dates in this period
  for (const category of categories) {
    if (category.due_date && category.due_date <= endDate) {
      items.push({
        category_id: category.id,
        name: `${category.name} (Due ${formatDate(category.due_date)})`,
        amount: category.allocated_amount,
        current_allocated: category.available_amount,
        due_date: category.due_date,
      });
    }
  }

  // Sort by due date (earliest first)
  return items.sort((a, b) => a.due_date.localeCompare(b.due_date));
}

/**
 * Add days to a date string (YYYY-MM-DD format)
 */
function addDays(dateString: string, days: number): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Format date for display (MM/DD)
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * Preview allocation without executing (for UI display)
 */
export async function previewAllocation(
  context: AllocationContext
): Promise<AllocationResult[]> {
  return calculateAllocation(context);
}

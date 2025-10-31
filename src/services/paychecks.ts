import { supabase } from './supabase';
import { PaycheckPlan, PaycheckAllocation } from '../types';
import { createTransaction } from './transactions';
import { getCategoryById, updateBudgetCategory } from './budgets';

// ==================== PAYCHECK PLANS ====================

// Get all paycheck plans for a user
export async function getPaycheckPlans(userId: string): Promise<PaycheckPlan[]> {
  const { data, error } = await supabase
    .from('paycheck_plans')
    .select('*')
    .eq('user_id', userId)
    .order('next_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Get a specific paycheck plan by ID
export async function getPaycheckPlanById(planId: string): Promise<PaycheckPlan> {
  const { data, error } = await supabase
    .from('paycheck_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error) throw error;
  return data;
}

// Create a new paycheck plan
export async function createPaycheckPlan(
  userId: string,
  plan: Omit<PaycheckPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<PaycheckPlan> {
  const { data, error } = await supabase
    .from('paycheck_plans')
    .insert([
      {
        user_id: userId,
        name: plan.name,
        amount: plan.amount,
        frequency: plan.frequency,
        next_date: plan.next_date,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update a paycheck plan
export async function updatePaycheckPlan(
  planId: string,
  updates: Partial<Omit<PaycheckPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<PaycheckPlan> {
  const { data, error } = await supabase
    .from('paycheck_plans')
    .update(updates)
    .eq('id', planId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete a paycheck plan (will cascade delete allocations)
export async function deletePaycheckPlan(planId: string): Promise<void> {
  const { error } = await supabase.from('paycheck_plans').delete().eq('id', planId);

  if (error) throw error;
}

// Calculate next paycheck date based on frequency
export function calculateNextPaycheckDate(currentDate: Date, frequency: string): Date {
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'semimonthly':
      // For semimonthly, assume 15th and last day of month
      if (nextDate.getDate() < 15) {
        nextDate.setDate(15);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
        nextDate.setDate(1);
      }
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1);
  }

  return nextDate;
}

// ==================== PAYCHECK ALLOCATIONS ====================

// Get all allocations for a paycheck plan
export async function getPaycheckAllocations(planId: string): Promise<PaycheckAllocation[]> {
  const { data, error } = await supabase
    .from('paycheck_allocations')
    .select('*')
    .eq('paycheck_plan_id', planId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Get allocation by ID
export async function getAllocationById(allocationId: string): Promise<PaycheckAllocation> {
  const { data, error } = await supabase
    .from('paycheck_allocations')
    .select('*')
    .eq('id', allocationId)
    .single();

  if (error) throw error;
  return data;
}

// Create a new allocation
export async function createPaycheckAllocation(
  allocation: Omit<PaycheckAllocation, 'id' | 'created_at' | 'updated_at'>
): Promise<PaycheckAllocation> {
  const { data, error } = await supabase
    .from('paycheck_allocations')
    .insert([
      {
        paycheck_plan_id: allocation.paycheck_plan_id,
        category_id: allocation.category_id,
        amount: allocation.amount,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update an allocation
export async function updatePaycheckAllocation(
  allocationId: string,
  updates: Partial<Omit<PaycheckAllocation, 'id' | 'paycheck_plan_id' | 'created_at' | 'updated_at'>>
): Promise<PaycheckAllocation> {
  const { data, error } = await supabase
    .from('paycheck_allocations')
    .update(updates)
    .eq('id', allocationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete an allocation
export async function deletePaycheckAllocation(allocationId: string): Promise<void> {
  const { error } = await supabase.from('paycheck_allocations').delete().eq('id', allocationId);

  if (error) throw error;
}

// Batch update allocations (delete old ones and create new ones)
export async function updateAllAllocations(
  planId: string,
  allocations: { category_id: string; amount: number }[]
): Promise<void> {
  // Delete existing allocations
  const { error: deleteError } = await supabase
    .from('paycheck_allocations')
    .delete()
    .eq('paycheck_plan_id', planId);

  if (deleteError) throw deleteError;

  // Create new allocations
  if (allocations.length > 0) {
    const newAllocations = allocations.map((alloc) => ({
      paycheck_plan_id: planId,
      category_id: alloc.category_id,
      amount: alloc.amount,
    }));

    const { error: insertError } = await supabase
      .from('paycheck_allocations')
      .insert(newAllocations);

    if (insertError) throw insertError;
  }
}

// Get allocations with category details
export async function getPaycheckAllocationsWithCategories(planId: string): Promise<
  Array<
    PaycheckAllocation & {
      category: { id: string; name: string; category_type: string };
    }
  >
> {
  const { data, error } = await supabase
    .from('paycheck_allocations')
    .select(
      `
      *,
      category:budget_categories(id, name, category_type)
    `
    )
    .eq('paycheck_plan_id', planId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ==================== PAYCHECK PROCESSING ====================

// Process due paychecks (create transactions and update budgets)
export async function processDuePaychecks(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split('T')[0];

  // Get all paychecks for user
  const paychecks = await getPaycheckPlans(userId);

  // Filter paychecks that are due (next_date <= today)
  const duePaychecks = paychecks.filter((p) => p.next_date <= todayString);

  if (duePaychecks.length === 0) return 0;

  // Get user's first checking or savings account for depositing paychecks
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .in('type', ['checking', 'savings'])
    .order('created_at', { ascending: true })
    .limit(1);

  const defaultAccount = accounts?.[0];

  let processedCount = 0;

  for (const paycheck of duePaychecks) {
    try {
      // Get allocations for this paycheck
      const allocations = await getPaycheckAllocations(paycheck.id);

      // Create income transaction if we have a default account
      if (defaultAccount) {
        await createTransaction(userId, {
          account_id: defaultAccount.id,
          amount: paycheck.amount,
          description: `${paycheck.name} - Auto-deposited`,
          date: paycheck.next_date,
          type: 'income',
        });
      }

      // Update budget categories with allocated amounts
      for (const allocation of allocations) {
        const category = await getCategoryById(allocation.category_id);

        // Add allocation amount to spent_amount
        await updateBudgetCategory(allocation.category_id, {
          spent_amount: category.spent_amount + allocation.amount,
        });
      }

      // Calculate and update next paycheck date
      const currentDate = new Date(paycheck.next_date);
      const nextDate = calculateNextPaycheckDate(currentDate, paycheck.frequency);

      await updatePaycheckPlan(paycheck.id, {
        next_date: nextDate.toISOString().split('T')[0],
      });

      processedCount++;
    } catch (error) {
      console.error(`Error processing paycheck ${paycheck.id}:`, error);
      // Continue processing other paychecks even if one fails
    }
  }

  return processedCount;
}

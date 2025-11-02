import {
  calculateDistribution,
  executeDistribution,
  DistributionResult,
} from './accountDistribution';
import {
  calculateAllocation,
  executeAllocation,
  AllocationResult,
} from './accountAllocation';
import { getOrCreateCurrentMonthBudget } from './budgets';

// ============================================================================
// Full Paycheck Allocation - Orchestrates Both Tiers
// ============================================================================

export interface FullAllocationPreview {
  paycheck_amount: number;
  distribution: Array<{
    account_id: string;
    account_name: string;
    amount: number;
    percentage: number;
    allocations: AllocationResult[];
  }>;
  total_allocated: number;
  unallocated: number;
}

/**
 * Preview complete paycheck allocation (Tier 1 + Tier 2)
 * Shows where every dollar will go without executing
 *
 * @param userId - User ID for fetching budget and goals
 * @param paycheckPlanId - Paycheck plan to use for distribution
 * @param paycheckAmount - Total paycheck amount in cents
 * @param paycheckDate - Date of paycheck (for date-aware allocation)
 * @returns Complete preview of distribution and allocations
 */
export async function previewFullAllocation(
  userId: string,
  paycheckPlanId: string,
  paycheckAmount: number,
  paycheckDate: string
): Promise<FullAllocationPreview> {
  // Step 1: Calculate distribution across accounts (Tier 1)
  const distributions = await calculateDistribution(
    paycheckPlanId,
    paycheckAmount
  );

  // Get current budget for allocation context
  const budget = await getOrCreateCurrentMonthBudget(userId);

  // Fetch account names
  const { supabase } = await import('./supabase');
  const accountIds = distributions.map((d) => d.account_id);
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name')
    .in('id', accountIds);

  // Step 2: For each account distribution, calculate Tier 2 allocations
  const fullPreview: FullAllocationPreview = {
    paycheck_amount: paycheckAmount,
    distribution: [],
    total_allocated: 0,
    unallocated: 0,
  };

  for (const dist of distributions) {
    const account = accounts?.find((a) => a.id === dist.account_id);

    // Calculate how this account's portion will be allocated
    const allocations = await calculateAllocation({
      userId,
      accountId: dist.account_id,
      budgetId: budget.id,
      availableAmount: dist.amount,
      currentDate: paycheckDate,
    });

    const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);

    fullPreview.distribution.push({
      account_id: dist.account_id,
      account_name: account?.name || 'Unknown Account',
      amount: dist.amount,
      percentage: (dist.amount / paycheckAmount) * 100,
      allocations,
    });

    fullPreview.total_allocated += totalAllocated;
    fullPreview.unallocated += dist.amount - totalAllocated;
  }

  return fullPreview;
}

/**
 * Execute complete paycheck allocation (Tier 1 + Tier 2)
 * Actually moves money and updates balances
 *
 * @param userId - User ID
 * @param paycheckPlanId - Paycheck plan to use
 * @param paycheckAmount - Total paycheck amount in cents
 * @param paycheckDate - Date of paycheck
 * @returns Results of execution
 */
export async function executeFullAllocation(
  userId: string,
  paycheckPlanId: string,
  paycheckAmount: number,
  paycheckDate: string
): Promise<{
  distributions: DistributionResult[];
  allocations: Array<{
    account_id: string;
    allocations: AllocationResult[];
  }>;
}> {
  // Step 1: Execute distribution (Tier 1)
  const distributions = await executeDistribution(
    userId,
    paycheckPlanId,
    paycheckAmount,
    paycheckDate
  );

  // Get current budget
  const budget = await getOrCreateCurrentMonthBudget(userId);

  // Step 2: Execute allocations for each account (Tier 2)
  const allAllocations: Array<{
    account_id: string;
    allocations: AllocationResult[];
  }> = [];

  for (const dist of distributions) {
    const allocations = await executeAllocation({
      userId,
      accountId: dist.account_id,
      budgetId: budget.id,
      availableAmount: dist.amount,
      currentDate: paycheckDate,
    });

    allAllocations.push({
      account_id: dist.account_id,
      allocations,
    });
  }

  return {
    distributions,
    allocations: allAllocations,
  };
}

/**
 * Get a simple summary for dashboard display
 */
export async function getAllocationSummary(
  userId: string,
  paycheckPlanId: string,
  paycheckAmount: number,
  paycheckDate: string
): Promise<{
  total_to_checking: number;
  total_to_savings: number;
  total_to_bills: number;
  total_to_goals: number;
  unallocated: number;
}> {
  const preview = await previewFullAllocation(
    userId,
    paycheckPlanId,
    paycheckAmount,
    paycheckDate
  );

  const summary = {
    total_to_checking: 0,
    total_to_savings: 0,
    total_to_bills: 0,
    total_to_goals: 0,
    unallocated: preview.unallocated,
  };

  for (const dist of preview.distribution) {
    // Categorize by account name (rough heuristic)
    const accountNameLower = dist.account_name.toLowerCase();

    if (accountNameLower.includes('checking')) {
      summary.total_to_checking += dist.amount;
    } else if (accountNameLower.includes('savings')) {
      summary.total_to_savings += dist.amount;
    }

    // Count allocations
    for (const alloc of dist.allocations) {
      if (alloc.target_type === 'goal') {
        summary.total_to_goals += alloc.amount;
      } else if (alloc.target_type === 'category') {
        summary.total_to_bills += alloc.amount;
      }
    }
  }

  return summary;
}

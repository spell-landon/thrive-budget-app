import { supabase } from './supabase';
import { AccountDistributionRule, DistributionAllocationType } from '../types';

// ============================================================================
// CRUD Operations for Account Distribution Rules
// ============================================================================

/**
 * Get all distribution rules for a paycheck plan, ordered by priority
 */
export async function getDistributionRules(
  paycheckPlanId: string
): Promise<AccountDistributionRule[]> {
  const { data, error } = await supabase
    .from('account_distribution_rules')
    .select('*')
    .eq('paycheck_plan_id', paycheckPlanId)
    .order('priority_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Create a new distribution rule
 */
export async function createDistributionRule(
  userId: string,
  rule: {
    paycheck_plan_id: string;
    account_id: string;
    allocation_type: DistributionAllocationType;
    amount?: number;
    percentage?: number;
    priority_order: number;
  }
): Promise<AccountDistributionRule> {
  // Validate the rule before creating
  await validateDistributionRule(rule);

  const { data, error } = await supabase
    .from('account_distribution_rules')
    .insert({ ...rule, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing distribution rule
 */
export async function updateDistributionRule(
  ruleId: string,
  updates: {
    account_id?: string;
    allocation_type?: DistributionAllocationType;
    amount?: number;
    percentage?: number;
    priority_order?: number;
  }
): Promise<AccountDistributionRule> {
  const { data, error } = await supabase
    .from('account_distribution_rules')
    .update(updates)
    .eq('id', ruleId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a distribution rule
 */
export async function deleteDistributionRule(ruleId: string): Promise<void> {
  const { error } = await supabase
    .from('account_distribution_rules')
    .delete()
    .eq('id', ruleId);

  if (error) throw error;
}

/**
 * Reorder distribution rules by updating priority_order
 */
export async function reorderDistributionRules(
  rules: { id: string; priority_order: number }[]
): Promise<void> {
  const updates = rules.map((rule) =>
    supabase
      .from('account_distribution_rules')
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
// Validation
// ============================================================================

/**
 * Validate distribution rule before saving
 */
async function validateDistributionRule(rule: {
  paycheck_plan_id: string;
  allocation_type: DistributionAllocationType;
  amount?: number;
  percentage?: number;
}): Promise<void> {
  // Check that amount/percentage matches allocation type
  if (rule.allocation_type === 'fixed' && (!rule.amount || rule.amount <= 0)) {
    throw new Error('Fixed allocation requires a positive amount');
  }

  if (
    rule.allocation_type === 'percentage' &&
    (!rule.percentage || rule.percentage <= 0 || rule.percentage > 100)
  ) {
    throw new Error('Percentage allocation must be between 0 and 100');
  }

  if (rule.allocation_type === 'remainder') {
    // Check if another remainder rule already exists
    const existingRules = await getDistributionRules(rule.paycheck_plan_id);
    const hasRemainder = existingRules.some(
      (r) => r.allocation_type === 'remainder'
    );
    if (hasRemainder) {
      throw new Error('Only one remainder rule is allowed per paycheck plan');
    }
  }
}

// ============================================================================
// Execution Engine - Distribute Paycheck Across Accounts
// ============================================================================

export interface DistributionResult {
  account_id: string;
  amount: number; // cents
  rule_id: string;
}

/**
 * Calculate how a paycheck amount should be distributed across accounts
 * @param paycheckPlanId - The paycheck plan to use for distribution
 * @param paycheckAmount - Total paycheck amount in cents
 * @returns Array of distributions showing how much goes to each account
 */
export async function calculateDistribution(
  paycheckPlanId: string,
  paycheckAmount: number
): Promise<DistributionResult[]> {
  // Get all rules for this paycheck, ordered by priority
  const rules = await getDistributionRules(paycheckPlanId);

  if (rules.length === 0) {
    throw new Error('No distribution rules configured for this paycheck plan');
  }

  const results: DistributionResult[] = [];
  let remaining = paycheckAmount;

  // Process rules in priority order
  for (const rule of rules) {
    let distributionAmount = 0;

    switch (rule.allocation_type) {
      case 'fixed':
        // Allocate fixed dollar amount (but not more than remaining)
        distributionAmount = Math.min(rule.amount || 0, remaining);
        break;

      case 'percentage':
        // Allocate percentage of total paycheck
        distributionAmount = Math.floor(
          (paycheckAmount * (rule.percentage || 0)) / 100
        );
        // Don't exceed remaining
        distributionAmount = Math.min(distributionAmount, remaining);
        break;

      case 'remainder':
        // Allocate whatever is left
        distributionAmount = remaining;
        break;
    }

    if (distributionAmount > 0) {
      results.push({
        account_id: rule.account_id,
        amount: distributionAmount,
        rule_id: rule.id,
      });

      remaining -= distributionAmount;
    }

    // Stop if we've allocated everything
    if (remaining <= 0) break;
  }

  // Warn if there's money left unallocated
  if (remaining > 0) {
    console.warn(
      `Warning: ${remaining} cents left unallocated. Consider adding a remainder rule.`
    );
  }

  return results;
}

/**
 * Execute distribution by actually moving money to accounts
 * This updates account balances based on distribution rules
 *
 * NOTE: This creates a transaction record for tracking purposes
 */
export async function executeDistribution(
  userId: string,
  paycheckPlanId: string,
  paycheckAmount: number,
  paycheckDate: string
): Promise<DistributionResult[]> {
  // Calculate distribution
  const distributions = await calculateDistribution(
    paycheckPlanId,
    paycheckAmount
  );

  // Update account balances and create transaction records
  for (const dist of distributions) {
    // Update account balance
    const { error: balanceError } = await supabase.rpc('increment_account_balance', {
      p_account_id: dist.account_id,
      p_amount: dist.amount,
    });

    if (balanceError) {
      // If RPC doesn't exist, fall back to manual update
      const { data: account } = await supabase
        .from('accounts')
        .select('balance')
        .eq('id', dist.account_id)
        .single();

      if (account) {
        await supabase
          .from('accounts')
          .update({ balance: account.balance + dist.amount })
          .eq('id', dist.account_id);
      }
    }

    // Create transaction record for tracking
    await supabase.from('transactions').insert({
      user_id: userId,
      account_id: dist.account_id,
      amount: dist.amount,
      description: `Paycheck distribution`,
      type: 'income',
      date: paycheckDate,
    });
  }

  return distributions;
}

/**
 * Preview distribution without executing (for UI display)
 */
export async function previewDistribution(
  paycheckPlanId: string,
  paycheckAmount: number
): Promise<
  Array<{
    account_id: string;
    account_name: string;
    amount: number;
    percentage_of_total: number;
    allocation_type: DistributionAllocationType;
  }>
> {
  const distributions = await calculateDistribution(
    paycheckPlanId,
    paycheckAmount
  );
  const rules = await getDistributionRules(paycheckPlanId);

  // Fetch account names
  const accountIds = distributions.map((d) => d.account_id);
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name')
    .in('id', accountIds);

  return distributions.map((dist) => {
    const account = accounts?.find((a) => a.id === dist.account_id);
    const rule = rules.find((r) => r.id === dist.rule_id);

    return {
      account_id: dist.account_id,
      account_name: account?.name || 'Unknown Account',
      amount: dist.amount,
      percentage_of_total: (dist.amount / paycheckAmount) * 100,
      allocation_type: rule?.allocation_type || 'fixed',
    };
  });
}

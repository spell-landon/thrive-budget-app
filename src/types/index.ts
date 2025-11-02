// Database types
export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'investment' | 'loan';
  balance: number; // Stored as cents (integer)
  institution?: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  month: string; // Format: YYYY-MM
  name: string;
  total_income: number; // cents
  total_allocated: number; // cents
  created_at: string;
  updated_at: string;
}

export interface CategoryGroup {
  id: string;
  user_id: string;
  name: string;
  category_type: 'income' | 'expense' | 'savings';
  is_default: boolean; // Whether this is a system-provided default
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetCategory {
  id: string;
  budget_id: string;
  name: string;
  allocated_amount: number; // cents - Monthly budget target/goal
  available_amount: number; // cents - Actual money assigned to this category (from paychecks)
  spent_amount: number; // cents - Money actually spent (from transactions)
  category_type: 'expense' | 'savings' | 'income';
  category_group?: string; // Optional group for organizing categories (e.g., "Home", "Transportation")
  sort_order: number; // Manual sort order (lower numbers appear first)
  due_date?: string; // Optional due date for date-aware allocation prioritization
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id?: string;
  subscription_id?: string; // Links transaction to a subscription (for recurring payments)
  amount: number; // cents
  description: string;
  date: string;
  type: 'income' | 'expense' | 'transfer';
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number; // cents
  current_amount: number; // cents
  target_date?: string;
  image_url?: string; // Background image for the goal card
  created_at: string;
  updated_at: string;
}

export interface PaycheckPlan {
  id: string;
  user_id: string;
  name: string;
  amount: number; // cents
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'semimonthly';
  next_date: string;
  created_at: string;
  updated_at: string;
}

export interface PaycheckAllocation {
  id: string;
  paycheck_plan_id: string;
  category_id: string;
  amount: number; // cents
  created_at: string;
  updated_at: string;
}

export interface PaycheckGoalAllocation {
  id: string;
  paycheck_plan_id: string;
  goal_id: string;
  amount: number; // cents
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  amount: number; // cents
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  category_id?: string;
  next_billing_date: string;
  reminder_days_before: number; // Days before billing to show reminder
  auto_pay: boolean; // Whether it auto-pays from account
  auto_populate_budget: boolean; // Whether to auto-populate category budget with subscription amount
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Smart Paycheck Allocation System Types

export type DistributionAllocationType = 'fixed' | 'percentage' | 'remainder';
export type AllocationAllocationType = 'fixed' | 'percentage' | 'remainder' | 'split';
export type AllocationTargetType = 'category' | 'goal' | 'split_remaining' | 'unallocated';

export interface AccountDistributionRule {
  id: string;
  user_id: string;
  paycheck_plan_id: string;
  account_id: string;
  allocation_type: DistributionAllocationType;
  amount?: number; // cents, NULL if percentage or remainder
  percentage?: number; // NULL if fixed or remainder
  priority_order: number; // lower = higher priority
  created_at: string;
  updated_at: string;
}

export interface AccountAllocationRule {
  id: string;
  user_id: string;
  account_id: string;
  target_type: AllocationTargetType;
  target_id?: string; // category_id or goal_id, NULL for split_remaining/unallocated
  allocation_type: AllocationAllocationType;
  amount?: number; // cents, NULL if percentage/remainder/split
  percentage?: number; // NULL if fixed/remainder/split
  priority_order: number; // lower = higher priority
  due_date_aware: boolean; // if true, prioritize by due date
  overflow_target_id?: string; // for goals: where to send overflow
  overflow_target_type?: 'category' | 'goal'; // type of overflow target
  created_at: string;
  updated_at: string;
}

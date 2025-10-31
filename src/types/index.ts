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

export interface BudgetCategory {
  id: string;
  budget_id: string;
  name: string;
  allocated_amount: number; // cents
  spent_amount: number; // cents
  category_type: 'expense' | 'savings' | 'income';
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id?: string;
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
  notes?: string;
  created_at: string;
  updated_at: string;
}

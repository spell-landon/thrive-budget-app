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
  is_goal_tracking: boolean; // When true, categories in this account appear in Goals screen
  sort_order: number; // Display order (lower numbers appear first)
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  month: number; // Month number (1-12)
  year: number; // Year (e.g., 2025)
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryGroup {
  id: string;
  user_id: string;
  name: string;
  category_type: 'income' | 'expense' | 'savings';
  icon?: string; // Ionicon name (defaults to 'folder')
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetCategory {
  id: string;
  budget_id: string;
  account_id: string; // Links category to specific account (per-account budgeting)
  name: string;
  allocated_amount: number; // cents - Monthly budget target/goal (planning amount)
  available_amount: number; // cents - Actual money in the envelope (cash you can spend right now)
  spent_amount: number; // cents - Money actually spent from this envelope (from transactions)
  category_type: 'expense'; // Only 'expense' type - goals use categories in goal-tracking accounts
  category_group?: string; // Optional group for organizing categories (e.g., "Home", "Transportation")
  sort_order: number; // Manual sort order (lower numbers appear first)
  due_date?: string; // Optional due date for expense categories (for smart allocation prioritization)
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
  target_date?: string;
  image_url?: string; // Background image for the goal card
  category_id: string; // Required: Links to category in goal-tracking account. current_amount = category.available_amount
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

export interface IncomeSource {
  id: string;
  user_id: string;
  name: string;
  expected_amount: number; // cents - Optional expected amount for planning
  frequency?: string; // 'weekly', 'biweekly', 'monthly', 'irregular', etc.
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IncomeAccountSplit {
  id: string;
  income_source_id: string;
  account_id: string; // Which account receives this portion of income
  allocation_type: 'percentage' | 'fixed' | 'remainder';
  allocation_value: number; // For percentage: 0-100, for fixed: cents, for remainder: ignored
  priority: number; // Order to apply splits (lower = higher priority)
  created_at: string;
  updated_at: string;
}

export interface IncomeTemplate {
  id: string;
  income_source_id: string;
  account_split_id?: string; // Optional: Links to specific account split for this category allocation
  category_name: string; // Category name (not ID) to persist across months
  category_type: 'expense';
  allocation_type: 'percentage' | 'fixed';
  allocation_value: number; // Either percentage (0-100) or fixed amount in cents
  priority: number; // Order to apply allocations (lower = higher priority)
  created_at: string;
  updated_at: string;
}

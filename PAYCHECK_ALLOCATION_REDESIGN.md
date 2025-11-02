# Smart Paycheck Allocation System - Design Document

## Problem Statement
Current paycheck allocation is basic - it only allows allocating to budget categories. We need a smarter, multi-tier system that:
1. Splits income across accounts first (e.g., $1000 to Checking, rest to Savings)
2. Then allocates within each account to categories/goals
3. Prioritizes allocations based on due dates
4. Supports both dollar amounts and percentages

## Proposed Architecture

### Tier 1: Account Distribution Rules
When a paycheck comes in, first split it across accounts using **Account Distribution Rules**.

**New Table: `account_distribution_rules`**
```sql
CREATE TABLE account_distribution_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  paycheck_plan_id UUID NOT NULL REFERENCES paycheck_plans(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  allocation_type TEXT NOT NULL CHECK (allocation_type IN ('fixed', 'percentage', 'remainder')),
  amount INTEGER, -- in cents, NULL if percentage or remainder
  percentage NUMERIC(5,2), -- NULL if fixed or remainder
  priority_order INTEGER NOT NULL, -- lower = higher priority
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(paycheck_plan_id, account_id)
);
```

**Example Rules:**
- Priority 1: $1000 (fixed) → Checking Account
- Priority 2: 100% (remainder) → Savings Account

### Tier 2: Category/Goal Allocation Within Accounts
After money hits an account, allocate it to categories or goals using **Account Allocation Rules**.

**New Table: `account_allocation_rules`**
```sql
CREATE TABLE account_allocation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('category', 'goal', 'split_remaining', 'unallocated')),
  target_id UUID, -- category_id or goal_id, NULL for split_remaining/unallocated
  allocation_type TEXT NOT NULL CHECK (allocation_type IN ('fixed', 'percentage', 'remainder', 'split')),
  amount INTEGER, -- in cents, NULL if percentage/remainder/split
  percentage NUMERIC(5,2), -- NULL if fixed/remainder/split
  priority_order INTEGER NOT NULL, -- lower = higher priority
  due_date_aware BOOLEAN DEFAULT false, -- if true, prioritize by next due date
  overflow_target_id UUID, -- for goals: where to send overflow (another goal or category)
  overflow_target_type TEXT CHECK (overflow_target_type IN ('category', 'goal')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Example Rules for Checking Account:**
- Priority 1: $800 (fixed) → "Fixed Expenses" category (date-aware)
- Priority 2: $150 (fixed) → "Groceries" category
- Priority 3: Split (remainder) → All other budgeted categories evenly
- Priority 4: 100% (remainder) → Unallocated

**Example Rules for Savings Account:**
- Priority 1: 20% → Emergency Fund Goal (overflow → Vacation Goal)
- Priority 2: $200 (fixed) → Vacation Goal (overflow → Retirement Goal)
- Priority 3: 100% (remainder) → Unallocated Savings

### Tier 3: Date-Aware Smart Allocation
If `due_date_aware = true` for a rule, the system automatically prioritizes allocations based on:
- Subscription `next_billing_date`
- Budget category historical spending patterns
- Goal `target_date`

**Algorithm:**
1. Collect all items with due dates in the next pay period
2. Sort by due date (earliest first)
3. Allocate funds to cover these first
4. Then proceed with normal priority-based allocation

## User Flow

### Setup Flow
1. **Create/Edit Paycheck Plan**
   - Name: "Main Job"
   - Amount: $3,250
   - Frequency: Biweekly

2. **Configure Account Distribution** (New Screen)
   - Rule 1: Fixed $1,000 → Checking Account (priority 1)
   - Rule 2: Remainder (100%) → Savings Account (priority 2)

3. **Configure Checking Account Allocations** (New Screen)
   - Rule 1: Fixed $800 → "Fixed Expenses" category (priority 1, date-aware)
   - Rule 2: Percentage 15% → "Groceries" category (priority 2)
   - Rule 3: Remainder → Unallocated Checking

4. **Configure Savings Account Allocations** (New Screen)
   - Rule 1: Percentage 20% → Emergency Fund Goal (priority 1)
   - Rule 2: Fixed $200 → Vacation Goal (priority 2)
   - Rule 3: Remainder → Unallocated Savings

### Execution Flow (When Paycheck Arrives)
1. **Account Distribution Phase**
   ```
   Total Paycheck: $3,250
   → $1,000 to Checking (fixed)
   → $2,250 to Savings (remainder)
   ```

2. **Checking Account Allocation Phase**
   ```
   Checking Balance: $1,000
   → If date-aware enabled, first allocate to subscriptions due soon
   → Then apply rules:
      → $800 to Fixed Expenses (fixed)
      → $150 to Groceries (15% of $1,000)
      → $50 Unallocated (remainder)
   ```

3. **Savings Account Allocation Phase**
   ```
   Savings Balance: $2,250
   → $450 to Emergency Fund (20% of $2,250)
   → $200 to Vacation Goal (fixed)
   → $1,600 Unallocated (remainder)
   ```

## Database Schema Changes Summary

### New Tables
1. ✅ `account_distribution_rules` - Splits paycheck across accounts
2. ✅ `account_allocation_rules` - Allocates money within accounts to categories/goals

### Modified Tables
**`paycheck_plans`** - No changes needed, rules link to it

**`budget_categories`** - Add optional `due_date` field
```sql
ALTER TABLE budget_categories ADD COLUMN due_date DATE;
```

## New UI Screens

### 1. AccountDistributionScreen
**Path:** From PaycheckPlanningScreen → Edit Paycheck → "Account Distribution"
- Show list of distribution rules
- Add/Edit/Delete rules
- Drag to reorder priority
- Visual preview: "From $3,250 paycheck..."

### 2. AccountAllocationRulesScreen
**Path:** From AccountsScreen → Edit Account → "Allocation Rules"
- Show list of allocation rules for this account
- Add/Edit/Delete rules
- Toggle date-aware priority
- Visual preview: "When money arrives..."

### 3. Enhanced PaycheckPlanningScreen
- Show full allocation flow preview
- "Distribute Next Paycheck" button
- Visual breakdown of where money will go

## Implementation Plan

### Phase 1: Database Setup
- [ ] Create migration for `account_distribution_rules`
- [ ] Create migration for `account_allocation_rules`
- [ ] Add `due_date` to `budget_categories`

### Phase 2: Services Layer
- [ ] Create `src/services/accountDistribution.ts`
- [ ] Create `src/services/accountAllocation.ts`
- [ ] Add smart allocation algorithm with date awareness

### Phase 3: UI - Account Distribution
- [ ] Create `AccountDistributionScreen.tsx`
- [ ] Add navigation from PaycheckPlanningScreen
- [ ] Build rule creation/editing interface

### Phase 4: UI - Account Allocation
- [ ] Create `AccountAllocationRulesScreen.tsx`
- [ ] Add navigation from AccountsScreen
- [ ] Build rule creation/editing interface

### Phase 5: Execution Engine
- [ ] Build paycheck distribution engine
- [ ] Add date-aware prioritization logic
- [ ] Test with various scenarios

### Phase 6: Testing & Polish
- [ ] Test edge cases (insufficient funds, etc.)
- [ ] Add validation and error handling
- [ ] Polish UI/UX

## Benefits
1. ✅ **Flexibility**: Split paycheck any way you want (fixed, percentage, remainder)
2. ✅ **Automation**: Set rules once, auto-allocate every paycheck
3. ✅ **Smart Prioritization**: Pay bills due first automatically
4. ✅ **Multi-tier**: Account-level AND category/goal-level rules
5. ✅ **Visual**: Clear preview of where money goes

## Rollover & Accumulation Behavior

### Budget Categories (Envelope System)
Budget categories **accumulate funds over time** - this is a feature, not a bug!

**Example: "Gifts" Category**
- Monthly allocation: $50
- Started in July
- By December: $300 available ($50 × 6 months)
- Perfect for Christmas shopping!

Categories build up reserves using the `available_amount` field. This allows:
- Building up for seasonal expenses
- Creating cushions for variable expenses
- Planning ahead for large purchases

### Savings Goals (Target-Based)
Goals have a `target_amount` and can overflow to other goals/categories:

**Example: "Emergency Fund" Goal**
- Target: $10,000
- Current: $9,800
- Next allocation: $500
- Result: $10,000 to Emergency Fund, $300 overflow to "Vacation Goal"

### Split Remaining Allocation
When using `split_remaining` allocation type:
1. System finds all budget categories with `allocated_amount > 0` for current month
2. Excludes categories already allocated in higher priority rules
3. Divides remaining funds evenly among them
4. Each category's `available_amount` increases

**Example:**
- Remaining after fixed allocations: $200
- Unallocated categories: Dining Out ($50 allocated), Entertainment ($75 allocated), Gas ($100 allocated)
- Split: $66.67 to each category's available amount

## Decisions Confirmed ✅
1. ✅ **Replace** old allocation system completely
2. ✅ **Goals allocatable** from account rules with overflow support
3. ✅ **Date-aware** is per-rule toggle for maximum flexibility
4. ✅ **Accumulation** is default behavior for categories (envelope budgeting)
5. ✅ **Split remaining** divides leftover funds evenly across budgeted categories
6. ✅ **Goal overflow** redirects excess to next goal/category

## Next Steps
Starting Phase 1: Database migrations for the new allocation system.

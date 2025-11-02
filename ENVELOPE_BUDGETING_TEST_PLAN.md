# Envelope Budgeting Implementation - Test Plan

## Overview
This document outlines the complete test plan for verifying the envelope budgeting system implementation. The system follows YNAB's envelope budgeting methodology where every dollar must be explicitly assigned before it can be spent.

## Core Concepts Being Tested

### 1. **Ready to Assign**
- Money in accounts that hasn't been assigned to budget categories yet
- Formula: `Total Account Balances - Total Available in Categories`
- Should decrease when money is assigned to categories
- Should increase when income is added to accounts

### 2. **Three Amounts Per Category**
- **Allocated Amount**: Monthly plan/target (what you plan to budget)
- **Available Amount**: Real cash in the envelope (what you can actually spend)
- **Spent Amount**: Actual spending from the envelope

### 3. **Money Flow**
```
Income Transaction → Account Balance → Ready to Assign → Category Assignment → Available Amount → Spending
```

---

## Test Scenarios

### Scenario 1: Fresh Start - Adding First Income

**Setup:**
- New user account
- No accounts, no budgets, no transactions

**Steps:**
1. Create a Checking account with $0 balance
2. Create current month's budget
3. Add budget categories:
   - Groceries (expense, allocated: $500)
   - Rent (expense, allocated: $1,200)
   - Savings (savings, allocated: $300)
4. Add income transaction:
   - Type: Income
   - Account: Checking
   - Amount: $3,250.00
   - Description: "Paycheck"
   - Date: Today

**Expected Results:**
- ✅ Checking account balance: $3,250.00
- ✅ Budget screen shows "Ready to Assign: $3,250.00" (green banner)
- ✅ All categories show:
  - Allocated Amount: $500, $1,200, $300 respectively
  - Available Amount: $0 (red border, "Needs funding" banner)
  - Spent Amount: $0
- ✅ Green "Assign" button visible on Ready to Assign banner

**Database Validation:**
```sql
-- Check account balance
SELECT name, balance FROM accounts WHERE type = 'checking';
-- Expected: balance = 325000 (cents)

-- Check ready to assign calculation
SELECT
  (SELECT SUM(balance) FROM accounts WHERE type IN ('checking', 'savings', 'investment')) as total_accounts,
  (SELECT SUM(available_amount) FROM budget_categories WHERE budget_id = 'YOUR_BUDGET_ID') as total_available;
-- Expected: total_accounts = 325000, total_available = 0
```

---

### Scenario 2: Assigning Money to Categories

**Setup:**
- Continue from Scenario 1 (income added, no assignments yet)

**Steps:**
1. From Budget screen, tap "Assign" button
2. AssignMoney screen should open
3. Assign money to categories:
   - Groceries: $500.00 (manually type)
   - Rent: $1,200.00 (use "Quick Fund" button)
   - Leave Savings at $0
4. Verify "Left to Assign" shows: $1,550.00
5. Tap "Assign" header button

**Expected Results:**
- ✅ Success alert: "Money assigned successfully!"
- ✅ Returns to Budget screen
- ✅ Ready to Assign now shows: $1,550.00
- ✅ Category cards update:
  - **Groceries**: Available $500.00 (green, no border)
  - **Rent**: Available $1,200.00 (green, no border)
  - **Savings**: Available $0 (orange border, "Needs funding")
- ✅ Progress bars all show 0% (nothing spent yet)

**Database Validation:**
```sql
-- Check category available amounts
SELECT name, allocated_amount, available_amount, spent_amount
FROM budget_categories
WHERE budget_id = 'YOUR_BUDGET_ID';

-- Expected results (in cents):
-- Groceries:  allocated_amount=50000,  available_amount=50000,  spent_amount=0
-- Rent:       allocated_amount=120000, available_amount=120000, spent_amount=0
-- Savings:    allocated_amount=30000,  available_amount=0,      spent_amount=0

-- Check ready to assign
SELECT
  (SELECT SUM(balance) FROM accounts WHERE type IN ('checking', 'savings', 'investment')) as total_accounts,
  (SELECT SUM(available_amount) FROM budget_categories WHERE budget_id = 'YOUR_BUDGET_ID') as total_available;
-- Expected: total_accounts = 325000, total_available = 170000 (difference = 155000 = $1,550)
```

---

### Scenario 3: Spending from Categories

**Setup:**
- Continue from Scenario 2 (money assigned to Groceries and Rent)

**Steps:**
1. Add expense transaction:
   - Type: Expense
   - Account: Checking
   - Category: Groceries
   - Amount: $127.43
   - Description: "Whole Foods"
   - Date: Today
2. Add another expense:
   - Type: Expense
   - Account: Checking
   - Category: Groceries
   - Amount: $89.52
   - Description: "Target"
   - Date: Today

**Expected Results:**
- ✅ Checking account balance: $3,033.05 ($3,250.00 - $127.43 - $89.52)
- ✅ Ready to Assign: Still $1,550.00 (unchanged - spending doesn't affect this)
- ✅ Groceries category card shows:
  - Allocated: $500.00
  - Available: $283.05 ($500.00 - $127.43 - $89.52)
  - Spent: $216.95
  - Progress bar: ~43% filled (yellow/orange color)
  - Status: "Available in bucket: $283.05 left" (green text)
- ✅ Rent category: Unchanged (still $1,200.00 available, $0 spent)

**Database Validation:**
```sql
-- Check account balance after spending
SELECT name, balance FROM accounts WHERE type = 'checking';
-- Expected: balance = 303305 ($3,033.05 in cents)

-- Check Groceries category
SELECT name, allocated_amount, available_amount, spent_amount
FROM budget_categories
WHERE name = 'Groceries';
-- Expected: allocated_amount=50000, available_amount=28305, spent_amount=21695

-- Verify transaction effects
SELECT type, amount, category_id, account_id FROM transactions
WHERE description IN ('Whole Foods', 'Target');
-- Expected: Two expense records with amounts 12743 and 8952
```

---

### Scenario 4: Overspending Detection

**Setup:**
- Continue from Scenario 3 (Groceries has $283.05 available)

**Steps:**
1. Add large expense transaction:
   - Type: Expense
   - Account: Checking
   - Category: Groceries
   - Amount: $400.00
   - Description: "Costco run"
   - Date: Today

**Expected Results:**
- ✅ Checking account balance: $2,633.05 ($3,033.05 - $400.00)
- ✅ Groceries category shows **overspending**:
  - Allocated: $500.00
  - Available: **-$116.95** (negative, red text)
  - Spent: $616.95
  - **Red border** around entire card
  - **Red warning banner**: "Overspent by $116.95"
  - Progress bar: 100%+ filled (red color)
  - Status: "$116.95 over" (red text)
- ✅ Ready to Assign: Still $1,550.00 (overspending doesn't create money)

**Key Learning:**
This demonstrates the power of envelope budgeting - you can overspend a category (negative available), but you still have money in your checking account. The system tracks both:
- Physical cash (account balance: $2,633.05)
- Allocated cash (categories)

**Database Validation:**
```sql
-- Check Groceries overspending
SELECT name, allocated_amount, available_amount, spent_amount
FROM budget_categories
WHERE name = 'Groceries';
-- Expected: allocated_amount=50000, available_amount=-11695, spent_amount=61695
```

---

### Scenario 5: Editing Transactions

**Setup:**
- Continue from Scenario 4 (Groceries overspent by $116.95)

**Steps:**
1. Go to Transactions screen
2. Find "Costco run" transaction ($400.00)
3. Edit it:
   - Change amount to $250.00 (was $400.00)
   - Keep same category (Groceries)
4. Save changes

**Expected Results:**
- ✅ Checking account balance: $2,783.05 (gained back $150.00)
- ✅ Groceries category corrected:
  - Available: $33.05 (was -$116.95, now positive)
  - Spent: $466.95 (was $616.95)
  - **No longer overspent** - red border removed
  - Progress bar: ~93% filled (orange/yellow warning color)
  - Status: "$33.05 left" (green text)

**Key Learning:**
Transaction edits properly reverse the old effects and apply new effects to both account balance AND category spending.

**Database Validation:**
```sql
-- Verify account balance updated
SELECT balance FROM accounts WHERE type = 'checking';
-- Expected: 278305

-- Verify Groceries spending corrected
SELECT spent_amount, available_amount FROM budget_categories WHERE name = 'Groceries';
-- Expected: spent_amount=46695, available_amount=3305
```

---

### Scenario 6: Over-Allocation Protection

**Setup:**
- Continue from previous scenarios
- Ready to Assign: $1,550.00
- Checking balance: $2,783.05

**Steps:**
1. Go to Budget screen
2. Tap "Assign" button
3. Try to assign **$2,000.00** to Savings category
4. Tap "Assign" header button

**Expected Results:**
- ✅ **Error alert**: "You're trying to assign $2,000.00 but only have $1,550.00 available"
- ✅ Screen does NOT close
- ✅ No money is assigned
- ✅ Categories remain unchanged

**Alternative Test:**
1. Assign exactly $1,550.00 to Savings (all remaining)
2. Should succeed
3. Ready to Assign should show: **$0.00**
4. Savings category available: $1,550.00

**Database Validation:**
```sql
-- After assigning all $1,550
SELECT
  (SELECT SUM(balance) FROM accounts WHERE type IN ('checking', 'savings', 'investment')) as total_accounts,
  (SELECT SUM(available_amount) FROM budget_categories WHERE budget_id = 'YOUR_BUDGET_ID') as total_available;
-- Expected: total_accounts = 278305, total_available = 278305 (equal - fully assigned!)
```

---

### Scenario 7: Validation - Over-Allocation Warning

**Setup:**
- Continue from Scenario 6 (everything assigned)
- Manually create data inconsistency (testing validation)

**Steps:**
1. **Hypothetical test** (would require database manipulation):
   - If you could manually increase a category's `available_amount` beyond account balances
   - System should detect this

**How to Test:**
1. Assign all available money to categories
2. Delete or reduce an income transaction
3. Account balance decreases
4. Categories still have high available amounts
5. **Ready to Assign becomes negative**

**Expected Results:**
- ✅ Budget screen shows **red warning banner**:
  - "Over-Allocated!"
  - "$XXX.XX too much"
  - "You've assigned more money than you have in accounts"
- ✅ AssignMoney screen would show validation warning when saving
- ✅ System still functions but alerts user to fix the issue

---

### Scenario 8: Complete Money Flow Test

**Full end-to-end test:**

1. **Setup Phase:**
   - Create fresh account: Checking ($0)
   - Create budget for current month
   - Add 3 categories:
     - Groceries ($500 allocated)
     - Utilities ($200 allocated)
     - Fun Money ($100 allocated)

2. **Income Phase:**
   - Add income: $2,000 paycheck
   - **Verify**: Ready to Assign = $2,000
   - **Verify**: All categories available = $0

3. **Assignment Phase:**
   - Assign $500 to Groceries
   - Assign $200 to Utilities
   - Assign $100 to Fun Money
   - **Verify**: Ready to Assign = $1,200
   - **Verify**: All categories funded correctly

4. **Spending Phase:**
   - Spend $150 from Groceries
   - Spend $180 from Utilities
   - Spend $120 from Fun Money (overspend by $20)
   - **Verify**:
     - Groceries: $350 available
     - Utilities: $20 available
     - Fun Money: -$20 available (overspent, red)
     - Ready to Assign: Still $1,200
     - Checking balance: $1,550 ($2,000 - $450 spent)

5. **Rollover Test (Next Month):**
   - Create next month's budget
   - Copy categories from previous month
   - **Verify**:
     - Groceries starts with $350 (rollover from last month)
     - Utilities starts with $20 (rollover)
     - Fun Money starts with $0 (overspent categories don't rollover negative)

---

## Quick Smoke Tests

### Test 1: Income Increases Ready to Assign
1. Note current Ready to Assign amount
2. Add $100 income transaction
3. Ready to Assign should increase by $100 ✅

### Test 2: Assignment Decreases Ready to Assign
1. Note current Ready to Assign amount
2. Assign $50 to any category
3. Ready to Assign should decrease by $50 ✅

### Test 3: Spending Doesn't Change Ready to Assign
1. Note current Ready to Assign amount
2. Add $30 expense transaction
3. Ready to Assign should NOT change ✅
4. Category available should decrease by $30 ✅

### Test 4: Category Progress Bar Color
- 0-79% spent: Green bar ✅
- 80-99% spent: Orange/yellow bar ✅
- 100%+ spent: Red bar ✅

### Test 5: Visual Warnings
- Category needs funding (available=0, allocated>0): Orange border + info banner ✅
- Category overspent (available<0): Red border + error banner ✅
- Over-allocated budget (readyToAssign<0): Red warning in budget summary ✅

---

## Validation Checklist

### ✅ **Ready to Assign Calculation**
- [ ] Correctly calculates: Total Account Balances - Total Category Available
- [ ] Updates when income is added
- [ ] Updates when money is assigned to categories
- [ ] Does NOT change when spending occurs

### ✅ **Assignment Logic**
- [ ] Can assign money to categories
- [ ] Prevents assigning more than available
- [ ] Updates category available_amount
- [ ] Decreases Ready to Assign
- [ ] Quick Fund button works correctly

### ✅ **Spending Logic**
- [ ] Expense transactions decrease account balance
- [ ] Expense transactions decrease category available_amount
- [ ] Expense transactions increase category spent_amount
- [ ] Non-categorized expenses work (don't break if no category)

### ✅ **Transaction Edits**
- [ ] Editing amount reverses old changes
- [ ] Editing amount applies new changes
- [ ] Changing category moves spending between categories
- [ ] Account balances stay correct

### ✅ **Visual Indicators**
- [ ] Ready to Assign banner (green when positive)
- [ ] Over-allocation warning (red when negative)
- [ ] Category overspending warning (red border)
- [ ] Category needs funding indicator (orange border)
- [ ] Progress bars show correct colors

### ✅ **Data Integrity**
- [ ] validateCashBasedBudget catches over-allocation
- [ ] Database amounts always match UI
- [ ] No floating point errors (all amounts in cents)

---

## Known Edge Cases

### Edge Case 1: Multiple Accounts
**Scenario:** User has Checking ($2,000) and Savings ($1,000)
- Ready to Assign should be: $3,000 (sum of both)
- Can assign $3,000 total across all categories
- Spending from either account reduces that account's balance only

### Edge Case 2: Credit Card Spending
**Scenario:** User has Checking ($1,000) and Credit Card (-$500 debt)
- Ready to Assign should only count positive accounts: $1,000
- Credit card transactions tracked separately
- Credit card balance is a liability (negative)

### Edge Case 3: Deleting Transactions
**Scenario:** Delete an income transaction
- Account balance should decrease
- Ready to Assign should increase (more unassigned money available)
- Categories should not automatically lose money

### Edge Case 4: Negative Ready to Assign
**Scenario:** User manually increases category available amounts
- System should show red warning
- User should reduce category amounts or add income
- System still functions but data is inconsistent

---

## Success Criteria

The envelope budgeting implementation is successful if:

1. ✅ **Money Flow is Explicit**: Users must assign income before spending
2. ✅ **Conservation of Money**: Total Available in Categories ≤ Total Account Balances
3. ✅ **Overspending Detected**: System warns when category goes negative
4. ✅ **Transaction Integrity**: Edits/deletes properly update all affected fields
5. ✅ **Visual Feedback**: Clear indicators for funding needs and overspending
6. ✅ **User Experience**: Intuitive "Assign" workflow with validation

---

## Testing Tools

### Manual Testing
Use the Expo app on iOS/Android to walk through scenarios

### Database Queries
Use Supabase SQL Editor to verify data:
```sql
-- Check account balances
SELECT name, type, balance FROM accounts;

-- Check category amounts
SELECT name, category_type, allocated_amount, available_amount, spent_amount
FROM budget_categories;

-- Check transactions
SELECT type, amount, description, account_id, category_id
FROM transactions
ORDER BY date DESC;

-- Verify Ready to Assign calculation
SELECT
  (SELECT SUM(balance) FROM accounts WHERE type IN ('checking', 'savings', 'investment')) as total_in_accounts,
  (SELECT SUM(available_amount) FROM budget_categories) as total_in_categories,
  (SELECT SUM(balance) FROM accounts WHERE type IN ('checking', 'savings', 'investment')) -
  (SELECT SUM(available_amount) FROM budget_categories) as ready_to_assign;
```

---

## Regression Testing

After any changes to budget/transaction logic, re-run:
1. Scenario 1 (Fresh Start)
2. Scenario 2 (Assignment)
3. Scenario 3 (Spending)
4. Scenario 5 (Transaction Edits)

These four scenarios cover the critical money flow paths.

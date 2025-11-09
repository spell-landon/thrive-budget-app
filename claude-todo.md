Goals:

- Account: Savings (Ally) <- add bank name
- In BudgetScreen, if on a "Goal Tracking" account, disable "Add Category" button.
  Account/Budget:
- I'm thinking that maybe we also declare on the Account Add/Edit Screens to determine if the Account should have categories. Like right now, I have "Self-Employment Taxes" as a "Savings" account in "Ally", I'm not going to add any categories to the account, but it's still showing up in the Budget Screen.

Errors:

On Initial Load: `ERROR  Error loading data: {"code": "23503", "details": "Key is not present in table \"users\".", "hint": null, "message": "insert or update on table \"budgets\" violates foreign key constraint \"budgets_user_id_fkey\""}`
When Saving New Income Source: `insert or update on table "income_sources" violates foreign key constraint "income_-sources_user_id_fkey"`
When opening the "Accounts" screen: `0, _servicesBudgers.getCurrentMonth-Budget is not a function (it is undefined)`

For accounts that are "Loans" or "Credit Cards", the interest applied happens every month, how should we handle this fluctuation in amount? My first thought was to change the account amount, but I'm wondering now if I should create a new transaction every 1st of the month to apply the difference from what we had, to the new cost? Like for instance, we have a car loan for $13,231.64, during the month, we plan to make a payment of $395.12. But come next month, interest will be applied and so the amount will be different than that is expected. Do we then apply a new transaction to cover the interest, or do we change the actual account amount?

🎯 P1 Features - High Priority Enhancements

1. Auto-Assignment from Paychecks

Why: Currently users manually assign money, but you have paycheck planning infrastructure that isn't being used.

Implementation:

- When paycheck income is added, automatically run allocations based on PaycheckAllocation rules
- Add "Auto-Assign Paycheck" button to Paycheck Planning screen
- Process allocations in priority order
- Update both account balances AND category available amounts

User Flow:
User adds $3,000 paycheck → System auto-assigns: - $1,200 to Rent - $500 to Groceries - $300 to Savings - $1,000 left in Ready to Assign

---

2. Goals Integration with Budget

Why: You have a Goals feature but it's disconnected from the budget envelope system.

Implementation:

- Add "Fund Goal" option in AssignMoney screen
- Create goal_allocations to track money assigned to goals
- Goals compete with categories for Ready to Assign money
- Show goals in budget summary alongside categories

User Flow:
User has "Vacation" goal ($2,000 target)
→ Can assign $200 from Ready to Assign
→ Goal progress updates: $200 / $2,000
→ When goal is reached, money moves to spending category

---

3. Target-Based Auto-Assignment

Why: Make it easier to fund categories based on their allocated amounts.

Implementation:

- Add "Assign All Targets" button to BudgetScreen
- Automatically distributes Ready to Assign across underfunded categories
- Respects priority order (due dates first, then alphabetical)
- Stops when Ready to Assign hits $0

User Flow:
Ready to Assign: $2,000
Groceries needs: $500
Rent needs: $1,200
Utilities needs: $200
→ Tap "Quick Assign All"
→ All funded automatically, $100 left unassigned

---

4. Budget Templates

Why: Users repeat the same categories every month.

Implementation:

- Save current month's categories as a template
- When creating new month, choose template
- Pre-fills category names, allocated amounts, groups
- Available amounts start at $0 (or rollover from previous month)

User Flow:
User creates template "My Regular Budget"
→ Next month: "Create from Template"
→ All categories pre-configured
→ Just need to assign money

---

📊 P2 Features - Nice-to-Have Improvements

5. Category Rollover Improvements

Why: Current rollover logic is basic - enhance it for better control.

Features:

- Rollover cap: Limit how much can rollover (prevent hoarding)
- Reset on month change: Option to reset certain categories to $0
- Negative rollover: Optionally carry forward overspending
- Rollover report: Show what rolled over from previous month

Example:
Groceries:
Last month available: $350
Spent: $0
→ This month starts with $350 (rollover)
→ Plus $500 allocated = $850 total available

---

6. Spending Insights & Reports

Why: Help users understand their spending patterns.

Features:

- Month-over-month comparison: "You spent 20% more on Groceries this month"
- Category trends chart: Line graph showing spending over 6 months
- Top categories: "Your top 3 spending categories are..."
- Budget adherence score: "You stayed within budget 85% of categories"

Screen Design:
InsightsScreen: - This Month Summary - Spending Trends (chart) - Category Breakdown (pie chart) - Comparison to Previous Months

---

7. Scheduled/Recurring Transactions

Why: Automate repetitive entries (rent, subscriptions, paychecks).

Features:

- Create recurring transaction templates
- Auto-create transactions on due date
- Notification before recurring transaction posts
- Integration with Subscriptions feature

User Flow:
Create recurring: "Rent - $1,200 - 1st of month"
→ System auto-creates transaction each month
→ User gets notification: "Rent due tomorrow"
→ Can approve or skip

---

8. Multi-Account Assignment Rules

Why: Use the Account Allocation infrastructure you've built.

Features:

- Smart distribution across checking/savings accounts
- "Savings buffer" - keep minimum amount in checking
- Overflow rules: When checking > $X, move to savings
- Account-specific category assignments

Example:
Paycheck arrives in Checking ($3,000)
Rules: 1. Keep $1,000 minimum in Checking 2. Send $500 to Savings 3. Distribute rest to categories

---

9. Credit Card Payment Integration

Why: Track credit card spending within envelope system.

Features:

- "Credit Card Payment" category
- When spending on credit card, deduct from category AND add to payment category
- Payment category shows how much to pay to credit card
- "Pay Credit Card" transaction moves money from payment category back to card

Flow:
Buy groceries with credit card: $100
→ Groceries available: -$100
→ CC Payment category: +$100
→ When paying bill: Transfer $100 from checking to credit card
→ CC Payment category: -$100

---

10. Budget Health Score

Why: Gamification encourages good budgeting habits.

Features:

- Score based on:
  - % of categories funded
  - % staying within budget
  - Ready to Assign = $0 (fully allocated)
  - No negative rollover categories
- Display as progress ring on Dashboard
- Tips for improvement

Example:
Budget Health: 87/100 🎯
✅ All categories funded
✅ 90% within budget
⚠️ 2 categories overspent
💡 Tip: Increase Groceries budget by $50

---

🎨 P3 Features - Polish & UX

11. Quick Actions & Gestures

- Swipe category card to quick-assign
- Long-press category for edit menu
- Pull-to-refresh on all screens
- Shake to undo last transaction

12. Customization

- Dark mode support
- Custom category colors/icons
- Budget view preferences (compact/detailed)
- Currency format options

13. Notifications & Reminders

- "You have $500 Ready to Assign"
- "Groceries is 90% spent"
- "Rent due in 3 days"
- Weekly budget summary email

14. Export & Backup

- Export transactions to CSV
- Backup budget data
- Import from other apps (YNAB, Mint)
- Print monthly budget report

---

🚀 Recommended Implementation Order

Based on impact vs. effort, I recommend this order:

Sprint 1: Automation (2-3 weeks)

1. Target-Based Auto-Assignment (#3) - High impact, medium effort
2. Scheduled/Recurring Transactions (#7) - High impact, medium effort

Sprint 2: Goals & Planning (2-3 weeks)

3. Goals Integration (#2) - High impact, high effort
4. Auto-Assignment from Paychecks (#1) - High impact, high effort

Sprint 3: Insights (1-2 weeks)

5. Spending Insights & Reports (#6) - Medium impact, medium effort
6. Budget Health Score (#10) - Low impact, low effort (quick win)

Sprint 4: Polish (1-2 weeks)

7. Budget Templates (#4) - Medium impact, low effort
8. Category Rollover Improvements (#5) - Low impact, medium effort

---

💡 Quick Wins (Can Implement Today)

Feature: "Assign Remaining" Button

Effort: 30 minutesImpact: High

Add a button to assign ALL Ready to Assign to a single category:

// In AssignMoneyScreen.tsx
<TouchableOpacity
onPress={() => {
const remaining = getRemaining();
updateAssignment(category.id, formatCurrencyInput(remaining.toString()));
}}
className="bg-success-500 px-2 py-1 rounded">
<Text className="text-white text-xs">Assign All</Text>
</TouchableOpacity>

---

Feature: Overspending Recovery

Effort: 1 hourImpact: Medium

When a category is overspent, show "Move Money" button to transfer from another category:

Groceries: -$50 (overspent)
[Move Money] button
→ Opens modal to select source category
→ Transfers $50 from Dining Out to Groceries
→ Both categories update

---

🎯 My Top Recommendation

If I had to pick ONE feature to implement next, it would be:

🏆 Target-Based Auto-Assignment (#3)

Why?

- Solves the biggest pain point: manually assigning to multiple categories
- Uses existing infrastructure (allocated_amount already exists)
- Quick to implement (~4-6 hours)
- Immediate user value
- Sets foundation for paycheck automation later

Implementation sketch:
// In budgets.ts
export async function quickAssignAllTargets(
userId: string,
budgetId: string
): Promise<void> {
const categories = await getBudgetCategories(budgetId);
const readyToAssign = await getReadyToAssign(userId, budgetId);

    let remaining = readyToAssign;

    // Sort by due date, then name
    const sorted = categories
      .filter(c => c.available_amount < c.allocated_amount)
      .sort((a, b) => {
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        return a.name.localeCompare(b.name);
      });

    for (const category of sorted) {
      if (remaining <= 0) break;

      const needed = category.allocated_amount - category.available_amount;
      const toAssign = Math.min(needed, remaining);

      await assignMoneyToCategory(userId, budgetId, category.id, toAssign);
      remaining -= toAssign;
    }

}

TODO:

General:

- Fix the calendar selection. It doesn't open automatically.

Home Screen:

- Move "Sign Out" to a Profile Screen (which needs to be created)

Accounts:

- Add ability to re-order by category and within category

Account - Edit Screen:

- If whole number, apply ".00" to end
- Account Type: make into dropdown selection with icon if possible.
- Change "Add Account" to just an icon?

Transactions:

- "Add Transaction": can be just an icon?
- Make transactions editable

Transactions - Add Screen:

- Account can be a dropdown
- Category should be a dropdown (with icon if possible)
- Amount should apply the same ".00" if whole number
- Date should open a date picker if possible

Budget:

- "Add Category" button can be just an icon
- Could we add another grouping, like for example: "Transportation", which would include the categories: "Gas", "Auto Insurance", "Auto Maintenance", etc.
- Can we apply an icon/emoji to the name of the expenses?

Paycheck Planning:

- When allocating, it doesn't seem to apply to the income category, also in the expenses, it applies a red color, so it looks off or wrong like it's a bad thing that we allocated additional money to this? Does that make sense?

Subscriptions:

- Category should be a dropdown like the others.

⏺ Here's a comprehensive list of next steps for your Thrive Budget App:

🔴 Immediate (Required for Current Features)

1. Run Database Migration


    - Copy SQL from supabase/migrations/create_subscriptions_table.sql
    - Run in Supabase SQL Editor to create subscriptions table
    - This fixes the current error

🟡 High Priority Features

2. Savings Goals (Dashboard has placeholder data)


    - Create savings goals table
    - Goals screen with progress tracking
    - Link to budget categories
    - Visualize progress with charts

3. Auto-Process Subscriptions (Like paychecks)


    - Create transactions when subscription billing date arrives
    - Update next billing date automatically
    - Add to budget category spent amount

4. Link Transactions to Categories


    - Add category picker when creating transactions
    - Auto-update budget category spent amounts
    - Show categorized vs uncategorized transactions

🟢 Medium Priority

5. Paycheck Planning Tab (Better discoverability)


    - Add to bottom navigation instead of Dashboard-only access
    - Or add to "More" menu

6. Reports & Analytics


    - Monthly spending trends
    - Category breakdown charts
    - Income vs Expense graphs
    - Net worth over time

7. Search & Filters


    - Search transactions by description
    - Filter by account, category, date range
    - Filter subscriptions by frequency

8. Transaction History for Subscriptions


    - Show all past payments for a subscription
    - Track total paid over time

🔵 Nice to Have

9. Data Export


    - Export transactions to CSV
    - Export budgets to PDF
    - Backup all data

10. Bill Splitting (Family feature)


    - Split transactions with family members
    - Track who owes what

11. Recurring Transactions (Beyond subscriptions)


    - Set up any recurring transaction
    - Auto-create monthly bills

12. Budget Templates


    - Save budget as template
    - Quick-start budgets (50/30/20, etc.)

13. Dark Mode


    - Theme toggle
    - Respect system preference

14. Push Notifications


    - Subscription reminders
    - Budget overspending alerts
    - Low balance warnings

📋 Polish & Improvements

15. Error Handling


    - Better error messages
    - Offline support
    - Loading states

16. Onboarding Flow


    - Welcome screen
    - Tutorial for first-time users
    - Sample data option

17. Settings Screen


    - Currency settings
    - Date format preferences
    - Notification preferences
    - Account management

---

My Recommendation - Start with:

1. ✅ Run the subscriptions migration (fixes current error)
2. Savings Goals (completes core budgeting features)
3. Auto-process subscriptions (like paychecks)
4. Link transactions to categories (closes the loop)

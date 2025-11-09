# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Thrive is a family budgeting app built with React Native and Expo, using YNAB-style envelope budgeting with key enhancements:
- **Envelope budgeting**: Manually assign money to budget category "envelopes" with Ready to Assign
- **Cents precision**: All financial amounts show decimals (not just dollars)
- **Real-time account balances**: Always visible current account amounts for informed spending decisions
- **Flexible money management**: Move money between categories, cover overspending, transfer between accounts
- **Multi-user support**: Shared budgets for family members

## Tech Stack

- **Framework**: React Native with Expo (~54.0)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Backend/Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth with AsyncStorage for session persistence
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **State Management**: React Context API
- **Language**: TypeScript

## Development Commands

### Running the App
```bash
npm start              # Start Expo dev server (choose platform)
npm run android        # Run on Android emulator/device
npm run ios            # Run on iOS simulator/device
npm run web            # Run in web browser
```

### Development Workflow
1. Start the dev server: `npm start`
2. Press `a` for Android, `i` for iOS, or `w` for web
3. Use Expo Go app on physical device or emulator
4. Changes auto-reload with Fast Refresh

## Project Structure

```
thrive-budget-app/
├── App.tsx                    # Root component with AuthProvider and Navigation
├── src/
│   ├── components/            # Reusable UI components
│   ├── contexts/
│   │   └── AuthContext.tsx    # Authentication state management
│   ├── navigation/
│   │   ├── RootNavigator.tsx  # Root navigation with auth routing
│   │   └── MainTabNavigator.tsx # Bottom tab navigation
│   ├── screens/               # Main app screens
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── BudgetScreen.tsx
│   │   ├── TransactionsScreen.tsx
│   │   ├── AssignMoneyScreen.tsx
│   │   ├── MoveCategoryMoneyScreen.tsx
│   │   └── TransferMoneyScreen.tsx
│   ├── services/
│   │   └── supabase.ts        # Supabase client configuration
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   └── utils/                 # Helper functions
├── global.css                 # Tailwind CSS imports
├── tailwind.config.js         # Tailwind configuration
├── metro.config.js            # Metro bundler config with NativeWind
└── babel.config.js            # Babel config for NativeWind
```

## Architecture Highlights

### Authentication Flow
- **AuthContext** (`src/contexts/AuthContext.tsx`) manages authentication state globally
- **RootNavigator** automatically switches between Login and Main screens based on session
- Session persists with AsyncStorage (React Native) for offline capabilities
- Auto-refresh tokens when app becomes active (AppState listener)

### Navigation Structure
```
RootNavigator (Stack)
├── Login Screen (if not authenticated)
└── Main Tab Navigator (if authenticated)
    ├── Dashboard (Home with Drawer Menu)
    ├── Accounts
    ├── Transactions
    ├── Budget
    └── Goals
```

### Envelope Budgeting System (Per-Account)
The app uses **per-account envelope budgeting** - each account has its own categories and "Ready to Assign" pool.

**Category Amounts:**
1. **allocated_amount** - The monthly target/goal for this category (what you plan to spend)
2. **available_amount** - The actual cash assigned to this category envelope (what you can spend right now)
3. **spent_amount** - Money actually spent from transactions

**Key Formula (Per Account):**
```
Ready to Assign (for account X) = Account X Balance - Sum(account X categories.available_amount)
```

**Money Flow:**
1. Income can be split across multiple accounts using income sources and account splits
2. Within each account, income increases "Ready to Assign" for that account
3. Users manually assign money from account-specific "Ready to Assign" to categories in that account
4. Money can only be moved between categories within the same account
5. Transfers between accounts are separate operations

**Goal-Tracking Accounts:**
- Accounts can be flagged as `is_goal_tracking = true`
- Categories in goal-tracking accounts appear as "Goals" on the Goals screen
- The category's `available_amount` represents current progress toward the goal
- Goals are UI wrappers around these categories with additional metadata (target_amount, target_date, image)

### Data Model Philosophy
**All financial amounts stored as INTEGERS in cents** to avoid floating-point precision issues.
- Example: $125.47 = 12547 (cents)
- Convert to dollars for display: `amount / 100`
- Convert to cents for storage: `Math.round(amount * 100)`

## Database Schema

Located in `src/types/index.ts`. Key tables:

### Core Tables
- **profiles**: User profiles linked to Supabase auth.users
- **accounts**: Financial accounts (checking, savings, credit cards) with balance in cents. Includes `is_goal_tracking` flag for goal-tracking accounts
- **transactions**: Income/expense records with cents precision
- **budgets**: Monthly budget containers
- **budget_categories**: Budget line items scoped to accounts with allocated_amount (target), available_amount (cash in envelope), spent_amount, and `account_id`
- **savings_goals**: Savings goal metadata (name, target, dates, images). Links to category in goal-tracking account via `category_id`
- **income_sources**: Income source definitions (name, expected amount, frequency)
- **income_account_splits**: Split income across accounts (percentage, fixed, remainder allocation types)
- **income_templates**: Optional auto-allocation templates for categories within accounts
- **subscriptions**: Recurring payment tracking with auto-reminders
- **category_groups**: Organize budget categories into groups

### Important Schema Notes
1. All amount fields are `number` type representing **cents** (integers in DB)
2. Dates stored as ISO strings: `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss`
3. User relationships use `user_id` foreign keys with RLS policies
4. Account types: `'checking' | 'savings' | 'credit_card' | 'investment' | 'loan'`
5. Transaction types: `'income' | 'expense' | 'transfer'`
6. **Budget category type: `'expense'` ONLY** - All categories are expense type. Savings goals use goal-tracking accounts instead
7. **Per-Account Budgeting**: Each `budget_category` has an `account_id` - categories are scoped to specific accounts
8. **Goal-Tracking**: Accounts with `is_goal_tracking = true` have their categories displayed as goals
9. **Income Allocation**: Income is split across accounts first (via `income_account_splits`), then optionally auto-allocated to categories (via `income_templates`)

## Supabase Setup

### Required Configuration
1. Create a Supabase project at https://supabase.com
2. Copy project URL and anon key from Settings > API
3. Create `.env` file (copy from `.env.example`):
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Database Migration Steps
1. Create tables matching schema in `src/types/index.ts`
2. Enable Row Level Security (RLS) on all tables
3. Create RLS policies for user-specific data access:
   ```sql
   -- Example for accounts table
   CREATE POLICY "Users can view their own accounts"
   ON accounts FOR SELECT
   USING (auth.uid() = user_id);
   ```
4. Set up foreign key relationships
5. Consider creating database functions for common operations (e.g., updating account balances)

### Authentication Setup
- Email/Password authentication is enabled by default
- Row Level Security ensures users only access their own data
- Profile creation can be automated with database triggers on auth.users

## NativeWind (Tailwind CSS) Usage

### Styling Components
Use `className` prop with Tailwind classes:
```tsx
<View className="flex-1 bg-gray-50 p-4">
  <Text className="text-2xl font-bold text-blue-600">Hello</Text>
</View>
```

### Configuration Files
- `tailwind.config.js`: Tailwind configuration (content paths, theme) - **Must include NativeWind preset**
- `global.css`: Tailwind directives (@tailwind base/components/utilities)
- `metro.config.js`: NativeWind metro integration
- `babel.config.js`: Babel preset for NativeWind JSX transformation

### Required Tailwind Config
The `tailwind.config.js` must include the NativeWind preset:
```js
presets: [require("nativewind/preset")]
```

### Important Notes
- NativeWind v4 translates Tailwind classes to React Native StyleSheet
- Not all Tailwind features work (e.g., hover states limited on mobile)
- Use `style` prop for dynamic styles or unsupported CSS

## Key Features Implementation Status

### Completed
- ✅ Expo + React Native setup
- ✅ NativeWind styling configured
- ✅ Supabase client and authentication
- ✅ Protected navigation with auth routing
- ✅ Full screen structure with bottom tabs + drawer
- ✅ TypeScript types for database schema
- ✅ Account management (CRUD operations)
- ✅ Budget creation and category management
- ✅ Transaction tracking with cents precision
- ✅ Per-account envelope budgeting with account-specific Ready to Assign
- ✅ Move money between categories (same-account only)
- ✅ Transfer money between accounts
- ✅ Cover overspending feature
- ✅ Goal-tracking accounts for savings goals
- ✅ Income source management with account splits
- ✅ Subscriptions management
- ✅ Category groups

### To Implement
- ⏳ Data visualization (charts for budgets/spending)
- ⏳ Multi-user family sharing
- ⏳ Real-time data sync
- ⏳ Budget reports and analytics
- ⏳ Recurring transaction templates
- ⏳ Mobile notifications for subscriptions

## Common Development Tasks

### Adding a New Screen
1. Create screen component in `src/screens/`
2. Add to `MainTabNavigator.tsx` or create new stack navigator
3. Define navigation types if using TypeScript navigation typing

### Creating Supabase Data Service
1. Add functions to `src/services/supabase.ts` or create new service file
2. Use `supabase.from('table_name')` for queries
3. Handle errors with try-catch
4. Example:
   ```typescript
   export async function getAccounts(userId: string) {
     const { data, error } = await supabase
       .from('accounts')
       .select('*')
       .eq('user_id', userId);
     if (error) throw error;
     return data;
   }
   ```

### Working with Financial Amounts
Always use cents (integers) internally:
```typescript
// Displaying
const displayAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// Parsing user input
const parseCurrency = (input: string) => Math.round(parseFloat(input) * 100);

// Example
displayAmount(12547); // "$125.47"
parseCurrency("125.47"); // 12547
```

### Adding New Database Types
1. Define interface in `src/types/index.ts`
2. Use consistent naming: table name matches interface (e.g., `Account` type for `accounts` table)
3. Include standard fields: `id`, `created_at`, `updated_at`
4. Document amounts as cents in comments

## Environment Variables

All Expo public environment variables must be prefixed with `EXPO_PUBLIC_`:
- `EXPO_PUBLIC_SUPABASE_URL`: Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key (safe for client-side)

Access via: `process.env.EXPO_PUBLIC_VARIABLE_NAME`

## Debugging Tips

- **Metro bundler issues**: Clear cache with `npx expo start -c`
- **Navigation not working**: Check GestureHandlerRootView wraps navigation
- **Tailwind classes not applying**: Verify `global.css` is imported in `App.tsx`
- **Supabase auth issues**: Check `.env` file exists and has correct values
- **TypeScript errors**: Run `npm run tsc` to check all type errors

## Platform-Specific Considerations

- **iOS**: Requires Xcode for native builds (use EAS Build or Expo Go for testing)
- **Android**: Requires Android Studio for native builds (use EAS Build or Expo Go for testing)
- **Web**: Limited React Native component support, focus on mobile-first development

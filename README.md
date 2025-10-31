# Thrive Budget App

A family budgeting app built with React Native, inspired by Monarch Money with enhanced features.

## Features

- 🔢 **Cents Precision**: All amounts display with full decimal precision
- 💰 **Paycheck Planning**: EveryDollar-style income allocation
- 💳 **Real-time Balances**: Always see current account amounts
- 👨‍👩‍👧‍👦 **Multi-user Support**: Share budgets with family members
- 📊 **Budget Tracking**: Monthly budgets with category breakdowns
- 🎯 **Savings Goals**: Track progress toward financial goals
- 📱 **Cross-platform**: iOS, Android, and Web support

## Tech Stack

- React Native + Expo
- NativeWind (Tailwind CSS)
- Supabase (Backend & Auth)
- TypeScript
- React Navigation

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Expo CLI (optional, but recommended)
- A Supabase account

### Installation

1. **Clone the repository** (if you haven't already)
   ```bash
   git clone <your-repo-url>
   cd thrive-budget-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Settings > API and copy your project URL and anon key
   - Run the SQL in `supabase-schema.sql` in your Supabase SQL Editor
   - This will create all tables, RLS policies, and triggers

4. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Add your Supabase credentials:
     ```
     EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

5. **Start the development server**
   ```bash
   npm start
   ```

6. **Run the app**
   - Press `a` for Android
   - Press `i` for iOS
   - Press `w` for web
   - Or scan the QR code with Expo Go app on your phone

## Project Structure

```
thrive-budget-app/
├── src/
│   ├── components/      # Reusable UI components
│   ├── contexts/        # React contexts (Auth, etc.)
│   ├── navigation/      # Navigation configuration
│   ├── screens/         # App screens
│   ├── services/        # API and Supabase services
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Helper functions
├── App.tsx              # Root component
├── CLAUDE.md            # Development guide for AI
└── supabase-schema.sql  # Database schema
```

## Development

### Common Commands

```bash
npm start           # Start Expo dev server
npm run android     # Run on Android
npm run ios         # Run on iOS
npm run web         # Run in browser
```

### Working with Financial Amounts

All amounts are stored as **cents** (integers) to avoid floating-point precision issues:

```typescript
// Display: Convert cents to dollars
const displayAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// Storage: Convert dollars to cents
const toCents = (dollars: string) => Math.round(parseFloat(dollars) * 100);
```

### Database Schema

All database types are defined in `src/types/index.ts`. Key tables:
- `profiles` - User profiles
- `accounts` - Bank accounts with balances
- `budgets` - Monthly budgets
- `budget_categories` - Budget line items
- `transactions` - Income/expense records
- `savings_goals` - Savings targets
- `paycheck_plans` - Income planning
- `paycheck_allocations` - Paycheck distributions

## Authentication

The app uses Supabase Auth with email/password authentication. Row Level Security (RLS) ensures users can only access their own data.

## Next Steps

The foundation is complete! Here's what to build next:

1. **Account Management**: CRUD operations for bank accounts
2. **Budget Creation**: Interface to create and manage monthly budgets
3. **Transaction Tracking**: Add, edit, and categorize transactions
4. **Paycheck Planning**: Build the paycheck allocation interface
5. **Savings Goals**: Progress tracking and visualization
6. **Data Sync**: Real-time updates across devices
7. **Charts & Reports**: Visualize spending patterns

## Contributing

This is a personal family budgeting app. Feel free to fork and customize for your own needs!

## License

Private use only.

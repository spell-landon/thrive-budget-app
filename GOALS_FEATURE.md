# Goals Feature

The Goals feature allows users to create and track savings goals with beautiful visual cards and progress indicators.

## Features

### ✅ What's Included
- **Create Goals**: Set up savings goals with target amounts and optional target dates
- **Beautiful Cards**: Each goal displays as a card with a custom background image from Unsplash
- **Progress Tracking**: Visual progress bars show how close you are to reaching your goal
- **Add Money**: Quick add button to contribute to your goals
- **Smart Images**: Automatically suggests relevant images based on goal name (e.g., beach for "Vacation")
- **Transfer on Delete**: When deleting a goal with saved money, transfer funds to another goal
- **Goal Categories**: Pre-loaded images for common goals:
  - Emergency Fund
  - Vacation
  - House Down Payment
  - Car
  - Wedding
  - Education
  - Retirement
  - Business
  - Travel
  - General Savings

### 🎨 Design Highlights
- Full-width image cards with gradient overlays
- Large, readable progress bars
- Percentage completion badges
- Real-time amount tracking
- Responsive card layout

## Database Setup

### 1. Run the Migration
Open your Supabase project dashboard and navigate to the SQL Editor. Run the migration file:

```bash
supabase/migrations/create_savings_goals_table.sql
```

This will:
- Create the `savings_goals` table
- Set up Row Level Security (RLS) policies
- Create indexes for performance
- Add automatic timestamp updates

### 2. Verify the Table
After running the migration, verify the table was created:

```sql
SELECT * FROM public.savings_goals;
```

## Navigation Structure

### Updated Tab Bar
The app now uses a cleaner 5-tab navigation:
- **Home**: Dashboard with overview
- **Accounts**: View all financial accounts
- **Budget**: Monthly budget planning
- **Goals**: Savings goals (NEW!)
- **More**: Hamburger menu with additional features

### More Menu
The "More" tab provides access to:
- Transactions
- Subscriptions
- Paycheck Planning
- Profile & Settings

## Usage

### Creating a Goal
1. Tap the "Goals" tab in the bottom navigation
2. Tap "New Goal" button
3. Enter goal details:
   - **Name**: e.g., "Emergency Fund", "Dream Vacation"
   - **Target Amount**: How much you want to save
   - **Current Amount**: (Optional) If you've already saved some money
   - **Target Date**: (Optional) When you want to reach the goal
4. Choose a background image from the gallery or let the app suggest one
5. Preview your goal card
6. Tap "Save"

### Adding Money to a Goal
From the Edit Goal screen:
1. Enter an amount in the "Add Money" field
2. Tap "Add"
3. The progress bar updates automatically

### Editing a Goal
1. Tap any goal card
2. Update the details
3. Change the background image if desired
4. Tap "Save"

### Deleting a Goal

#### Goal with No Money
- Simply tap the trash icon and confirm deletion

#### Goal with Saved Money
1. Tap the trash icon
2. Select which goal to transfer the money to
3. Confirm the transfer and deletion
4. The money is moved to the selected goal before deletion

**Note**: If you only have one goal with money, you'll need to create another goal first or manually withdraw the money.

## Image URLs

All images are sourced from Unsplash with proper attribution. The images are optimized at 800px width for faster loading while maintaining quality.

### Default Images
- Emergency Fund: Umbrella/security theme
- Vacation: Beach/mountain scenic
- House Down Payment: Modern house
- Car: Luxury car
- Wedding: Wedding venue
- Education: Graduation cap
- Retirement: Peaceful retirement scene
- Business: Office/entrepreneur
- Travel: World travel
- Savings: Piggy bank

## Code Structure

### Service Layer (`src/services/goals.ts`)
- `getGoals(userId)`: Fetch all goals for a user
- `getGoal(goalId)`: Get a single goal
- `createGoal(userId, goal)`: Create a new goal
- `updateGoal(goalId, updates)`: Update goal details
- `addToGoal(goalId, amount)`: Add money to a goal
- `transferBetweenGoals(fromGoalId, toGoalId, amount)`: Transfer funds
- `deleteGoal(goalId)`: Delete a goal
- `getSuggestedImage(goalName)`: Get image suggestion based on name

### Screens
- **GoalsScreen**: Main list view with all goal cards
- **AddGoalScreen**: Create new goals with image selection
- **EditGoalScreen**: Edit, add money, or delete goals
- **MoreScreen**: Hamburger menu for additional features

### Types (`src/types/index.ts`)
```typescript
export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number; // cents
  current_amount: number; // cents
  target_date?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}
```

## Dependencies

### Required Packages
The Goals feature uses `expo-linear-gradient` for beautiful gradient overlays. If not already installed:

```bash
npx expo install expo-linear-gradient
```

## Customization

### Adding Your Own Images
To add custom images, edit `src/services/goals.ts`:

```typescript
export const defaultGoalImages = {
  'Your Goal': 'https://images.unsplash.com/photo-...?w=800&q=80',
  // Add more here
};
```

### Changing Colors
The progress bars and badges use the app's theme colors defined in `tailwind.config.js`:
- Primary: Orange (#FF6B35)
- Success: Green (#10B981)
- Error: Red (#EF4444)

## Best Practices

1. **Target Amounts**: Always stored as cents in the database (multiply by 100)
2. **Images**: Use optimized URLs (`?w=800&q=80`) for faster loading
3. **Progress**: Progress is calculated as `(current_amount / target_amount) * 100`
4. **Transfers**: Always validate sufficient funds before transferring

## Troubleshooting

### Images Not Loading
- Check internet connection
- Verify Unsplash URLs are accessible
- Try different image URLs

### Can't Delete Goal
- Ensure you have another goal to transfer money to
- Check that RLS policies allow deletion
- Verify user ownership of the goal

### Progress Not Updating
- Refresh the screen (pull down)
- Check that amounts are being saved in cents
- Verify the goal was updated successfully

## Future Enhancements

Potential features to add:
- Goal milestones with celebrations
- Automatic contributions from accounts
- Goal templates for common savings targets
- Charts showing progress over time
- Shared goals for families
- Custom image uploads
- Goal categories and tags
- Monthly contribution recommendations

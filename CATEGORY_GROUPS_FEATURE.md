# Category Groups Feature

## Overview
Implemented dynamic, user-customizable category groups that vary based on category type (Income/Expense/Savings).

## Features Implemented

### 1. **Database Schema**
- **New Table**: `category_groups`
  - Fields: `id`, `user_id`, `name`, `category_type`, `is_default`, `sort_order`
  - Row Level Security enabled
  - Unique constraint on `(user_id, name, category_type)`

### 2. **Default Category Groups**
Automatically created when user creates their first budget category:

**Income Groups:**
- Salary
- Side Income
- Interest & Dividends
- Gifts & Bonuses
- Other Income

**Expense Groups:**
- Housing
- Transportation
- Food & Dining
- Utilities
- Healthcare
- Personal Care
- Entertainment
- Shopping
- Debt Payments
- Education
- Pets
- Giving
- Miscellaneous

**Savings Groups:**
- Emergency Fund
- Retirement
- Investments
- Savings Goals
- College Fund
- Other Savings

### 3. **Type-Specific Filtering**
- When creating/editing a budget category, only relevant groups appear
- Income categories only show income groups
- Expense categories only show expense groups
- Savings categories only show savings groups

### 4. **"Add Another" Feature**
In `AddBudgetCategoryScreen`:
- **"Add Category"** button: Saves and returns to budget screen
- **"Add & Create Another"** button: Saves category, clears name/amount, keeps type/group selected

This allows rapid budget creation without re-selecting type and group each time.

### 5. **Service Functions** (`src/services/categoryGroups.ts`)
- `getCategoryGroups(userId)`: Get all groups
- `getCategoryGroupsByType(userId, type)`: Get filtered by type
- `createCategoryGroup(userId, group)`: Create new group
- `updateCategoryGroup(groupId, updates)`: Update group
- `deleteCategoryGroup(groupId)`: Delete group
- `updateCategoryGroupName(groupId, oldName, newName)`: Update and cascade to categories
- `initializeDefaultCategoryGroups(userId)`: Create defaults
- `getCategoryGroupNames(userId, type)`: Get names as string array

## Database Migration

Run these migrations in order:

```sql
-- 1. Create category_groups table
supabase/migrations/create_category_groups_table.sql

-- 2. (Already done) Add available_amount to budget_categories
supabase/migrations/add_available_amount_to_budget_categories.sql

-- 3. (Already done) Create paycheck_goal_allocations
supabase/migrations/create_paycheck_goal_allocations_table.sql
```

## Usage Flow

1. **First Time User**:
   - Creates first budget category
   - System automatically initializes default groups
   - Groups appear filtered by selected type

2. **Creating Multiple Categories**:
   - Select type (e.g., "Expense")
   - Select group (e.g., "Food & Dining")
   - Enter name (e.g., "Groceries") and amount
   - Click "Add & Create Another"
   - Type and group remain selected
   - Add next category in same group quickly

3. **Customizing Groups** (Future - Settings Screen):
   - Navigate to Settings > Category Groups
   - Add/Edit/Delete custom groups
   - Reorder groups
   - Changes reflect immediately in category selection

## ✅ Recently Completed Features

### Category Groups Settings Screen
**COMPLETED** - Full CRUD management interface for category groups:
- ✅ List all groups organized by type (Income/Expense/Savings)
- ✅ Add new custom groups with type selection
- ✅ Edit group names (automatically cascades to all categories using that group)
- ✅ Delete groups (with warning that categories will become ungrouped)
- ✅ Visual distinction between default and custom groups
- ✅ Color-coded by type (green=income, red=expense, blue=savings)
- ✅ Empty state with helpful messaging

Location: `src/screens/CategoryGroupsSettingsScreen.tsx`
Navigation: Access from "More" screen → "Category Groups"

### Edit Budget Category Screen Update
**COMPLETED** - Type-based filtering implemented:
- ✅ Load groups based on current category type
- ✅ Automatically reload groups when type changes
- ✅ Show only relevant groups in picker modal
- ✅ Dynamic help text based on selected type
- ✅ Consistent UX with AddBudgetCategoryScreen

## Technical Notes

- **Cascade Updates**: When group name is updated, all `budget_categories` using that group name are updated automatically
- **Soft Delete**: Consider adding `deleted_at` field instead of hard deletes to preserve history
- **Group Icons**: Currently using generic folder icon - could add custom icon field to `category_groups` table
- **Multi-User**: Fully supports multiple users - each user has their own set of groups
- **Performance**: Groups are loaded once per category type change, minimal database calls

## Files Modified/Created

### Created:
- `supabase/migrations/create_category_groups_table.sql`
- `src/services/categoryGroups.ts`
- `src/screens/CategoryGroupsSettingsScreen.tsx`
- `src/types/index.ts` (added `CategoryGroup` interface)

### Modified:
- `src/screens/AddBudgetCategoryScreen.tsx`:
  - Added type-based group filtering
  - Added "Add & Create Another" button
  - Auto-initialize default groups
  - Updated header (removed Save button, added buttons to form)

- `src/screens/EditBudgetCategoryScreen.tsx`:
  - Added type-based group filtering
  - Loads groups dynamically based on category type
  - Auto-reloads groups when type changes
  - Updated help text to be type-specific

- `src/screens/MoreScreen.tsx`:
  - Added "Category Groups" menu item
  - Links to CategoryGroupsSettingsScreen
  - Amber color (#F59E0B) with folder-open icon

- `src/navigation/RootNavigator.tsx`:
  - Imported CategoryGroupsSettingsScreen
  - Added CategoryGroupsSettings route as modal

- `src/services/budgets.ts` (indirectly - uses available_amount)

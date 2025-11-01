# Account Deletion Setup

This document explains how the account deletion feature works and how to set it up properly in your Supabase database.

## Overview

The account deletion feature allows users to permanently delete their account and all associated data. It implements a multi-step confirmation process to prevent accidental deletions.

## How It Works

### User Flow

1. User taps "Delete Account" button in Profile screen
2. First alert warns about permanent deletion and lists what will be deleted
3. User confirms and a modal appears requiring them to type "DELETE"
4. User types "DELETE" and confirms
5. All user data is deleted from the database
6. User is signed out
7. Success message confirms deletion

### Data Deleted

When an account is deleted, the following data is permanently removed:

- ✅ All accounts (checking, savings, credit cards, etc.)
- ✅ All transactions
- ✅ All budgets and budget categories
- ✅ All paycheck plans and allocations
- ✅ All subscriptions
- ✅ User profile

## Database Setup (Required)

To fully delete the user's authentication record, you need to set up a database trigger in Supabase. This is because the `auth.users` table requires admin privileges to modify.

### Option 1: Run the Migration (Recommended)

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy the contents of `supabase/migrations/setup_account_deletion.sql`
4. Paste and run the SQL

This will:
- Create a secure function to delete auth users
- Create a trigger that automatically deletes the auth user when the profile is deleted
- Set up CASCADE deletes for all user-related tables

### Option 2: Manual Setup

If you prefer to set this up manually, follow these steps:

#### 1. Create the deletion function

```sql
CREATE OR REPLACE FUNCTION public.delete_user_auth()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$;
```

#### 2. Create the trigger

```sql
CREATE TRIGGER on_profile_deleted
  AFTER DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_user_auth();
```

#### 3. Set up CASCADE deletes

Make sure all foreign key constraints have `ON DELETE CASCADE`:

```sql
-- Example for accounts table
ALTER TABLE public.accounts
  DROP CONSTRAINT IF EXISTS accounts_user_id_fkey,
  ADD CONSTRAINT accounts_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
```

Repeat for all tables with `user_id` foreign keys.

## Security Considerations

### Multi-Step Confirmation

The deletion process includes multiple confirmations:

1. **Initial Warning Alert**: Clearly explains what will be deleted
2. **Type Confirmation**: User must type "DELETE" to proceed
3. **Final Confirmation**: Button only enables when correct text is entered

### Database Security

- The deletion function uses `SECURITY DEFINER` to safely delete from `auth.users`
- All deletions respect Row Level Security (RLS) policies
- Only the user's own data can be deleted

## Testing

Before deploying to production, test the account deletion feature:

1. Create a test account
2. Add sample data (accounts, transactions, budgets, etc.)
3. Go through the deletion flow
4. Verify all data is removed from database
5. Verify auth user is deleted
6. Try to sign in again (should fail)

## Troubleshooting

### "Failed to delete account" Error

If users see this error:

1. Check Supabase logs for details
2. Verify the trigger is set up correctly
3. Ensure RLS policies allow deletion
4. Check that CASCADE deletes are configured

### Data Not Fully Deleted

If some data remains after deletion:

1. Verify CASCADE constraints on all foreign keys
2. Check for orphaned records in related tables
3. Review the deletion order in `src/services/user.ts`

### Auth User Still Exists

If the auth.users record isn't deleted:

1. Verify the trigger is created and active
2. Check the deletion function has `SECURITY DEFINER`
3. Ensure profiles table has the trigger attached

## Code Implementation

### Service Layer

The deletion logic is in `src/services/user.ts`:

```typescript
import { deleteUserAccount } from '../services/user';

// Delete account
await deleteUserAccount(userId);
```

### UI Component

The UI is in `src/screens/ProfileScreen.tsx`:

```typescript
// Trigger deletion
handleDeleteAccountPress()
  -> Shows initial warning
  -> Opens modal for "DELETE" confirmation
  -> Calls deleteUserAccount()
  -> Signs user out
```

## Production Checklist

Before enabling account deletion in production:

- [ ] Database trigger is set up and tested
- [ ] CASCADE deletes are configured on all tables
- [ ] RLS policies allow users to delete their own data
- [ ] Account deletion has been tested end-to-end
- [ ] Error handling is in place
- [ ] Backup/recovery process is documented
- [ ] Legal/compliance requirements are met (GDPR, etc.)

## Future Enhancements

Potential improvements:

1. **Soft Delete**: Mark accounts as deleted instead of hard delete
2. **Grace Period**: Allow account recovery within 30 days
3. **Data Export**: Let users download their data before deletion
4. **Email Confirmation**: Send confirmation email before deletion
5. **Audit Log**: Keep record of deletion for compliance

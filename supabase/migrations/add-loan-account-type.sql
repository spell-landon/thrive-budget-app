-- Migration: Add 'loan' as an account type
-- Run this in your Supabase SQL Editor to add support for loan accounts

-- Drop the existing constraint
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check;

-- Add the new constraint with 'loan' included
ALTER TABLE accounts ADD CONSTRAINT accounts_type_check
  CHECK (type IN ('checking', 'savings', 'credit_card', 'investment', 'loan'));

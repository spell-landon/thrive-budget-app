-- Migration: Remove Paycheck Planning System
-- Date: 2025-01-11
-- Description: Removes all tables related to the paycheck planning system
-- as the app now uses the simpler "Ready to Assign" envelope budgeting approach

-- Drop tables in reverse order of dependencies

-- Drop allocation rules tables (Tier 2)
DROP TABLE IF EXISTS account_allocation_rules CASCADE;

-- Drop distribution rules table (Tier 1)
DROP TABLE IF EXISTS account_distribution_rules CASCADE;

-- Drop paycheck goal allocations (old manual allocation system)
DROP TABLE IF EXISTS paycheck_goal_allocations CASCADE;

-- Drop paycheck allocations (old manual allocation system)
DROP TABLE IF EXISTS paycheck_allocations CASCADE;

-- Drop paycheck plans (master table)
DROP TABLE IF EXISTS paycheck_plans CASCADE;

-- Note: This migration removes the automated paycheck allocation system.
-- The app now uses envelope budgeting with "Ready to Assign" for manual
-- money assignment to budget categories.

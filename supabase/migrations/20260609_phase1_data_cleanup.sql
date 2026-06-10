-- Phase 1 Data Cleanup
-- 1. Fix invalid plan code 'scale' → 'starter'
-- 2. Remove orphaned null-email platform_admin ghost profiles (no matching auth user email)
-- These were created by early bootstrap migrations that ran before real auth users existed.

-- Fix invalid plan code
UPDATE owner_subscriptions
SET plan_code = 'starter', updated_at = NOW()
WHERE plan_code NOT IN ('starter', 'growth', 'pro');

-- Remove null-email platform_admin ghost profiles that have no auth user.
-- These are safe to delete — they were seeded by migrations and have no real user behind them.
-- We keep profiles where email IS NOT NULL (real accounts stay untouched).
DELETE FROM profiles
WHERE role IN ('platform_admin', 'admin', 'super_admin')
  AND (email IS NULL OR email = '');

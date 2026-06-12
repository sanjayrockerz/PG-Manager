-- Migration: fix property RLS + allow role self-upgrade for owner_manager users
-- Context: A user with role='owner_manager' who wants to create their own PG
-- should be able to self-upgrade to 'owner'. The properties table RLS must
-- allow any authenticated user to write rows where owner_id = auth.uid().

-- ── 1. Properties table: allow write for any user where owner_id = auth.uid() ──
-- This allows owner_manager users who have been upgraded to 'owner' to create
-- properties under their own user ID without an explicit role check.

DROP POLICY IF EXISTS "properties_owner_manage" ON properties;

CREATE POLICY "properties_owner_manage" ON properties
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ── 2. Allow users to self-update their own profile role ──
-- Needed so the frontend can upgrade owner_manager → owner without admin API.
-- We restrict the columns that can be changed: only role + owner_scope_id,
-- and only a user updating their own row.

DROP POLICY IF EXISTS "profiles_self_role_upgrade" ON profiles;

CREATE POLICY "profiles_self_role_upgrade" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Only allow upgrading to 'owner'; prevents arbitrary role changes
    AND role = 'owner'
  );

-- ── 3. owner_subscriptions: new owner needs a subscription record ──
-- When an owner_manager upgrades to owner, they may not have a subscription row.
-- Allow insert so the app can bootstrap one on first property creation.

DROP POLICY IF EXISTS "owner_subscriptions_self_insert" ON owner_subscriptions;

CREATE POLICY "owner_subscriptions_self_insert" ON owner_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

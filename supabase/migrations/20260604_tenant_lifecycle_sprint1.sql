-- Sprint 1: Tenant Provisioning Lifecycle Hardening
-- Adds first_login_completed_at to profiles for DB-backed welcome flow tracking.
-- Adds a role_conflicts check function for pre-creation validation.

-- 1. First login tracking on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_login_completed_at TIMESTAMPTZ DEFAULT NULL;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_first_login
  ON profiles (id)
  WHERE first_login_completed_at IS NULL;

-- 2. RLS: tenant can update their own first_login_completed_at
DO $$
BEGIN
  -- Drop old policy if it exists so we can recreate cleanly
  DROP POLICY IF EXISTS "tenant_update_first_login" ON profiles;
  CREATE POLICY "tenant_update_first_login"
    ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
EXCEPTION WHEN others THEN NULL;
END$$;

-- 3. Helper RPC: check if an email/phone already has a non-tenant role
-- Used by application-level checks before tenant creation.
CREATE OR REPLACE FUNCTION check_role_conflict(
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS TABLE (
  conflict_field TEXT,
  existing_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check email conflict
  IF p_email IS NOT NULL AND p_email <> '' THEN
    RETURN QUERY
      SELECT 'email'::TEXT AS conflict_field, role::TEXT AS existing_role
      FROM profiles
      WHERE lower(email) = lower(p_email)
        AND role <> 'tenant'
      LIMIT 1;
  END IF;

  -- Check phone conflict
  IF p_phone IS NOT NULL AND p_phone <> '' THEN
    RETURN QUERY
      SELECT 'phone'::TEXT AS conflict_field, role::TEXT AS existing_role
      FROM profiles
      WHERE phone = p_phone
        AND role <> 'tenant'
      LIMIT 1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION check_role_conflict(TEXT, TEXT) TO authenticated;

-- ============================================================
-- Fix: Admin Profile Selection & RLS Recursion
-- ============================================================

-- 1. Recreate the missing admin select policy for profiles
DROP POLICY IF EXISTS profiles_admin_select ON public.profiles;

CREATE POLICY profiles_admin_select ON public.profiles
  FOR SELECT USING (
    public.current_user_is_admin() 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin', 'platform_admin')
  );

-- 2. Refactor helper functions to prefer JWT claims to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('platform_admin', 'admin', 'super_admin'),
    public.current_user_role() IN ('platform_admin', 'admin', 'super_admin'),
    false
  );
$$;

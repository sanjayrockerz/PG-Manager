-- Fix: current_owner_is_suspended() only checked the calling user's OWN is_suspended flag.
-- For owner_manager/staff profiles (whose suspension state lives on the OWNER's profile,
-- linked via owner_scope_id), this meant suspending an owner did not block their managers
-- at the RLS layer — managers could still read/write properties, tenants, payments, etc.
-- This redefinition resolves suspension through owner_scope_id so it propagates correctly.

CREATE OR REPLACE FUNCTION public.current_owner_is_suspended()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT p2.is_suspended
      FROM public.profiles p1
      LEFT JOIN public.profiles p2
        ON p2.id = COALESCE(p1.owner_scope_id, p1.id)
      WHERE p1.id = auth.uid()
      LIMIT 1
    ),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_owner_is_suspended() TO authenticated;

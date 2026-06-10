-- ============================================================
-- Phase 1: Sync auth.users metadata with profiles role
-- ============================================================
-- The profiles_admin_select policy relies on current_user_is_admin(), 
-- which checks auth.jwt() -> 'user_metadata' ->> 'role'. 
-- If not present, it falls back to querying profiles, causing infinite recursion.
-- This migration ensures all users have their role synchronized in user_metadata.

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  to_jsonb(p.role)
)
FROM public.profiles p
WHERE auth.users.id = p.id
  AND (auth.users.raw_user_meta_data ->> 'role') IS DISTINCT FROM p.role;

-- Also create a trigger to keep them in sync on role change
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_auth_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(NEW.role)
    )
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_role ON public.profiles;
CREATE TRIGGER trg_sync_profile_role
AFTER UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_role_to_auth_metadata();

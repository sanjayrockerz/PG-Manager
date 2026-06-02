-- Property scope management: ensure owner can upsert and delete individual
-- property scopes for team members.
-- Depends on: owner_user_property_scopes table (20260414_multi_owner_saas_expansion.sql)
--             helper functions: current_owner_scope_id, current_user_role, current_user_is_admin

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'owner_user_property_scopes'
  ) THEN
    RAISE EXCEPTION 'owner_user_property_scopes table does not exist. Run 20260414_multi_owner_saas_expansion.sql or 20260416_complete_setup.sql first.';
  END IF;
END $$;

-- Re-create owner all-access policy to explicitly support INSERT (upsert) / UPDATE / DELETE
DROP POLICY IF EXISTS owner_user_property_scopes_owner_all ON public.owner_user_property_scopes;

CREATE POLICY owner_user_property_scopes_owner_all ON public.owner_user_property_scopes
FOR ALL
USING (
  owner_id = public.current_owner_scope_id()
  AND public.current_user_role() = 'owner'
)
WITH CHECK (
  owner_id = public.current_owner_scope_id()
  AND public.current_user_role() = 'owner'
);

-- Scoped staff can read their own scope rows (to discover their own capabilities)
DROP POLICY IF EXISTS owner_user_property_scopes_self_select ON public.owner_user_property_scopes;

CREATE POLICY owner_user_property_scopes_self_select ON public.owner_user_property_scopes
FOR SELECT
USING (
  user_id = auth.uid()
  OR owner_id = public.current_owner_scope_id()
);

-- Platform admins retain full access
DROP POLICY IF EXISTS owner_user_property_scopes_admin_all ON public.owner_user_property_scopes;

CREATE POLICY owner_user_property_scopes_admin_all ON public.owner_user_property_scopes
FOR ALL
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());

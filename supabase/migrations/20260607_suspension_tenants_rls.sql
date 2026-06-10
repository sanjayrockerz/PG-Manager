-- Close suspension RLS gap on tenants: a suspended owner could still create/modify
-- tenant records at the database level even though properties/payments were already covered.
-- Mirrors the current_owner_is_suspended() pattern from 20260603_p0_production_fixes.sql.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tenants' AND policyname = 'tenants_owner_manage'
  ) THEN
    DROP POLICY tenants_owner_manage ON public.tenants;
    CREATE POLICY tenants_owner_manage ON public.tenants
      FOR ALL
      USING (
        NOT public.current_owner_is_suspended()
        AND owner_id = public.current_owner_scope_id()
        AND public.current_user_has_property_capability(tenants.property_id, 'tenants')
      )
      WITH CHECK (
        NOT public.current_owner_is_suspended()
        AND owner_id = public.current_owner_scope_id()
        AND public.current_user_has_property_capability(tenants.property_id, 'tenants')
      );
    RAISE NOTICE 'Updated tenants_owner_manage with suspension check';
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not update tenants RLS: %', SQLERRM;
END $$;

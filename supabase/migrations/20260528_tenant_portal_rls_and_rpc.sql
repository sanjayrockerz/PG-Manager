-- Tenant portal: RLS additions and helper RPC

-- ─── 1. Tenants can create and read their own vacate requests ─────────────────
-- Guard: only run if vacate_requests table exists (created in 20260523)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vacate_requests') THEN
    DROP POLICY IF EXISTS vacate_requests_tenant_insert ON vacate_requests;
    EXECUTE $pol$
      CREATE POLICY vacate_requests_tenant_insert ON public.vacate_requests
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.tenants t
          WHERE t.id = tenant_id
            AND public.current_user_matches_tenant(t.email, t.phone)
        )
      )
    $pol$;

    DROP POLICY IF EXISTS vacate_requests_tenant_select ON vacate_requests;
    EXECUTE $pol$
      CREATE POLICY vacate_requests_tenant_select ON public.vacate_requests
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.tenants t
          WHERE t.id = tenant_id
            AND public.current_user_matches_tenant(t.email, t.phone)
        )
      )
    $pol$;
  ELSE
    RAISE NOTICE 'vacate_requests table does not exist yet — run 20260523_core_management_domain.sql first, then re-run this file.';
  END IF;
END $$;

-- ─── 2. RPC: return minimal owner payment info to tenant ──────────────────────
-- Tenants cannot read owner_settings via RLS, so we expose only safe fields.

CREATE OR REPLACE FUNCTION public.get_owner_payment_info(p_owner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'upiId',      COALESCE((whatsapp_settings->'paymentSettings'->>'upiId'), ''),
    'qrCodeUrl',  COALESCE((whatsapp_settings->'paymentSettings'->>'qrCodeUrl'), ''),
    'pgRules',    COALESCE(pg_rules, '[]'::jsonb),
    'ownerPhone', COALESCE(
      (SELECT phone FROM profiles WHERE id = p_owner_id LIMIT 1), ''
    ),
    'pgName',     COALESCE(
      (SELECT pg_name FROM profiles WHERE id = p_owner_id LIMIT 1), ''
    )
  )
  INTO v_result
  FROM owner_settings
  WHERE owner_id = p_owner_id;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_owner_payment_info(UUID) TO authenticated;

-- ─── 3. Notifications: tenants can read their own ─────────────────────────────

DROP POLICY IF EXISTS notifications_tenant_select ON notifications;
CREATE POLICY notifications_tenant_select ON notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.owner_id = notifications.owner_id
      AND t.property_id = COALESCE(notifications.property_id, t.property_id)
      AND public.current_user_matches_tenant(t.email, t.phone)
  )
);

-- ─── 4. Maintenance image storage bucket ─────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance-images', 'maintenance-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS maintenance_images_tenant_upload ON storage.objects;
CREATE POLICY maintenance_images_tenant_upload ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'maintenance-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS maintenance_images_public_select ON storage.objects;
CREATE POLICY maintenance_images_public_select ON storage.objects
FOR SELECT USING (bucket_id = 'maintenance-images');

DROP POLICY IF EXISTS maintenance_images_owner_delete ON storage.objects;
CREATE POLICY maintenance_images_owner_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'maintenance-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

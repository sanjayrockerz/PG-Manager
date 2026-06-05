-- ============================================================
-- P0 Production Fixes — 2026-06-03
-- Apply in Supabase Dashboard > SQL Editor
-- Idempotent — safe to re-run.
-- ============================================================

-- ── FIX 1: handle_new_auth_user — assign 'tenant' role when phone matches tenant record ──
-- Prevents phone OTP users from getting role='owner' when they are actually tenants.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  metadata          jsonb;
  resolved_role     text;
  pending_invite    record;
  matching_tenant   record;
  prop_id           uuid;
BEGIN
  metadata      := COALESCE(new.raw_user_meta_data, '{}'::jsonb);
  resolved_role := COALESCE(metadata->>'role', 'owner');

  IF resolved_role NOT IN ('owner','owner_manager','staff','tenant','platform_admin','admin','super_admin') THEN
    resolved_role := 'owner';
  END IF;

  -- Check for pending invite first (invite overrides all)
  SELECT * INTO pending_invite
  FROM public.owner_invites
  WHERE lower(invited_email) = lower(COALESCE(new.email, ''))
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY invited_at DESC LIMIT 1;

  IF pending_invite.id IS NOT NULL THEN
    resolved_role := pending_invite.role;

  -- P0 FIX: If no invite and role defaulted to 'owner', check if this phone/email
  -- belongs to an existing tenant record. Phone OTP users come in with no metadata.
  ELSIF resolved_role = 'owner' THEN
    SELECT id INTO matching_tenant
    FROM public.tenants
    WHERE (
      (new.phone IS NOT NULL AND new.phone <> '' AND (
        phone = new.phone
        OR phone LIKE '%' || right(regexp_replace(new.phone, '\D', '', 'g'), 10)
      ))
      OR
      (new.email IS NOT NULL AND new.email <> '' AND lower(email) = lower(new.email))
    )
    LIMIT 1;

    IF matching_tenant.id IS NOT NULL THEN
      resolved_role := 'tenant';
    END IF;
  END IF;

  -- Upsert profile
  INSERT INTO public.profiles (id, email, full_name, phone, role, pg_name, city, owner_scope_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(metadata->>'name', split_part(COALESCE(new.email,''), '@', 1)),
    COALESCE(new.phone, metadata->>'phone'),
    resolved_role,
    metadata->>'pgName',
    metadata->>'city',
    CASE
      WHEN resolved_role = 'owner'  THEN new.id
      WHEN pending_invite.id IS NOT NULL THEN pending_invite.owner_id
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email          = COALESCE(excluded.email, public.profiles.email),
    full_name      = COALESCE(excluded.full_name, public.profiles.full_name),
    phone          = COALESCE(excluded.phone, public.profiles.phone),
    role           = CASE
                       WHEN pending_invite.id IS NOT NULL THEN pending_invite.role
                       WHEN matching_tenant.id IS NOT NULL AND public.profiles.role = 'owner'
                         THEN 'tenant'
                       ELSE COALESCE(public.profiles.role, excluded.role)
                     END,
    owner_scope_id = CASE
                       WHEN pending_invite.id IS NOT NULL THEN pending_invite.owner_id
                       WHEN COALESCE(public.profiles.role, excluded.role) = 'owner' THEN public.profiles.id
                       ELSE COALESCE(public.profiles.owner_scope_id, excluded.owner_scope_id)
                     END,
    pg_name        = COALESCE(excluded.pg_name, public.profiles.pg_name),
    city           = COALESCE(excluded.city, public.profiles.city),
    updated_at     = now();

  -- Auto-provision owner resources
  IF resolved_role = 'owner' THEN
    INSERT INTO public.owner_settings (owner_id) VALUES (new.id) ON CONFLICT DO NOTHING;
    INSERT INTO public.owner_subscriptions
      (owner_id, plan_code, status, billing_cycle, amount, currency, seats, trial_ends_at, renews_at)
    VALUES (new.id, 'starter', 'trialing', 'monthly', 0, 'INR', 1,
            now() + interval '14 days', now() + interval '1 month')
    ON CONFLICT (owner_id) DO NOTHING;
  END IF;

  -- Apply pending invite property scopes
  IF pending_invite.id IS NOT NULL THEN
    FOREACH prop_id IN ARRAY pending_invite.property_ids LOOP
      INSERT INTO public.owner_user_property_scopes
        (owner_id, user_id, property_id, can_view, can_manage_properties,
         can_manage_tenants, can_manage_payments, can_manage_maintenance,
         can_manage_announcements, display_role)
      VALUES (
        pending_invite.owner_id, new.id, prop_id, true, false,
        COALESCE((pending_invite.capabilities->>'can_manage_tenants')::boolean, false),
        COALESCE((pending_invite.capabilities->>'can_manage_payments')::boolean, false),
        COALESCE((pending_invite.capabilities->>'can_manage_maintenance')::boolean, false),
        COALESCE((pending_invite.capabilities->>'can_manage_announcements')::boolean, false),
        pending_invite.display_role
      )
      ON CONFLICT (user_id, property_id) DO UPDATE SET
        can_view                  = true,
        can_manage_tenants        = excluded.can_manage_tenants,
        can_manage_payments       = excluded.can_manage_payments,
        can_manage_maintenance    = excluded.can_manage_maintenance,
        can_manage_announcements  = excluded.can_manage_announcements,
        display_role              = excluded.display_role,
        updated_at                = now();
    END LOOP;

    UPDATE public.owner_invites
    SET status = 'accepted', accepted_at = now(), accepted_by = new.id
    WHERE id = pending_invite.id;
  END IF;

  RETURN new;
END;
$$;

-- Re-attach the trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();


-- ── FIX 2: RLS — block suspended owners at the database level ────────────────
-- This enforces suspension on ALL queries, not just at the API layer.
-- Works as a defense-in-depth layer alongside the application-level check.

CREATE OR REPLACE FUNCTION public.current_owner_is_suspended()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_suspended FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_owner_is_suspended() TO authenticated;

-- Add suspension check to key owner tables
-- Properties: suspended owners cannot read/write their own properties
DO $$
BEGIN
  -- properties_owner_manage
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'properties' AND policyname = 'properties_owner_manage'
  ) THEN
    DROP POLICY properties_owner_manage ON public.properties;
    CREATE POLICY properties_owner_manage ON public.properties
      FOR ALL
      USING (
        NOT public.current_owner_is_suspended()
        AND (
          owner_id = auth.uid()
          OR owner_id IN (
            SELECT owner_scope_id FROM public.profiles
            WHERE id = auth.uid() AND owner_scope_id IS NOT NULL
          )
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role IN ('platform_admin', 'admin', 'super_admin')
          )
        )
      );
    RAISE NOTICE 'Updated properties_owner_manage with suspension check';
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not update properties RLS: %', SQLERRM;
END $$;

-- Payments: suspended owners cannot access payments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'payments_owner_manage'
  ) THEN
    DROP POLICY payments_owner_manage ON public.payments;
    CREATE POLICY payments_owner_manage ON public.payments
      FOR ALL
      USING (
        NOT public.current_owner_is_suspended()
        AND (
          owner_id = auth.uid()
          OR owner_id IN (
            SELECT owner_scope_id FROM public.profiles
            WHERE id = auth.uid() AND owner_scope_id IS NOT NULL
          )
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role IN ('platform_admin', 'admin', 'super_admin')
          )
        )
      );
    RAISE NOTICE 'Updated payments_owner_manage with suspension check';
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not update payments RLS: %', SQLERRM;
END $$;


-- ── FIX 3: Vacate requests — tenant-initiated status update RLS ───────────────
-- Tenants must be able to UPDATE their own tenant record status to 'notice_submitted'
-- when they submit a vacate request. This is needed for the P0 workflow fix.

DROP POLICY IF EXISTS tenants_tenant_status_update ON public.tenants;
CREATE POLICY tenants_tenant_status_update ON public.tenants
  FOR UPDATE
  USING (
    public.current_user_matches_tenant(email, phone)
    AND status IN ('active', 'payment_overdue', 'notice_submitted', 'vacating', 'pending_onboarding')
  )
  WITH CHECK (
    status IN ('notice_submitted', 'inactive')
  );


-- ── FIX 4: Activity logs — tenants can insert their own events ────────────────
DROP POLICY IF EXISTS activity_logs_tenant_insert ON public.activity_logs;
CREATE POLICY activity_logs_tenant_insert ON public.activity_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.owner_id = activity_logs.owner_id
        AND public.current_user_matches_tenant(t.email, t.phone)
    )
  );

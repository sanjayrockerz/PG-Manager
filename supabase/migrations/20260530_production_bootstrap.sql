-- ============================================================
-- PRODUCTION BOOTSTRAP — Apply all pending migrations
-- Run this SINGLE FILE in Supabase Dashboard > SQL Editor
-- Completely idempotent — safe to re-run multiple times
-- ============================================================

-- ── SECTION 1: Tenant lifecycle columns ──────────────────────────────────────

-- Extend status constraint
DO $$ BEGIN
  ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_status_check;
  ALTER TABLE tenants ADD CONSTRAINT tenants_status_check CHECK (status IN (
    'pending_onboarding','active','payment_overdue','notice_submitted',
    'vacating','inactive','archived'
  ));
EXCEPTION WHEN undefined_table THEN NULL;
         WHEN others THEN RAISE NOTICE 'tenants_status_check: %', SQLERRM;
END $$;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vacate_date  DATE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vacate_reason TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();

-- ── SECTION 2: Property occupancy_mode ───────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE properties ADD COLUMN IF NOT EXISTS occupancy_mode TEXT NOT NULL DEFAULT 'BED_BASED';
  ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_occupancy_mode_check;
  ALTER TABLE properties ADD CONSTRAINT properties_occupancy_mode_check CHECK (occupancy_mode IN ('BED_BASED','ROOM_BASED'));
EXCEPTION WHEN others THEN RAISE NOTICE 'occupancy_mode: %', SQLERRM;
END $$;

-- ── SECTION 3: Vacate requests ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vacate_requests (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id                UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tenant_name              TEXT NOT NULL,
  property_id              UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  room                     TEXT NOT NULL,
  notice_date              DATE NOT NULL,
  planned_vacate_date      DATE NOT NULL,
  reason                   TEXT NOT NULL DEFAULT '',
  final_settlement_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposit_refund           NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposit_deduction        NUMERIC(10,2) NOT NULL DEFAULT 0,
  deduction_reason         TEXT NOT NULL DEFAULT '',
  deduction_items          JSONB DEFAULT '[]'::jsonb,
  status                   TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','confirmed','completed','cancelled')),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vacate_requests_owner_id_idx    ON public.vacate_requests (owner_id);
CREATE INDEX IF NOT EXISTS vacate_requests_tenant_id_idx   ON public.vacate_requests (tenant_id);
CREATE INDEX IF NOT EXISTS vacate_requests_property_id_idx ON public.vacate_requests (property_id);
CREATE INDEX IF NOT EXISTS vacate_requests_status_idx      ON public.vacate_requests (status);

ALTER TABLE public.vacate_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vacate_requests_owner_access ON public.vacate_requests;
CREATE POLICY vacate_requests_owner_access ON public.vacate_requests FOR ALL USING (
  owner_id = auth.uid()
  OR owner_id IN (SELECT owner_scope_id FROM public.profiles WHERE id = auth.uid() AND owner_scope_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('platform_admin','admin','super_admin'))
);

DROP POLICY IF EXISTS vacate_requests_tenant_insert ON public.vacate_requests;
CREATE POLICY vacate_requests_tenant_insert ON public.vacate_requests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id
    AND public.current_user_matches_tenant(t.email, t.phone))
);

DROP POLICY IF EXISTS vacate_requests_tenant_select ON public.vacate_requests;
CREATE POLICY vacate_requests_tenant_select ON public.vacate_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id
    AND public.current_user_matches_tenant(t.email, t.phone))
);

-- ── SECTION 4: Activity logs ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  event       TEXT NOT NULL,
  detail      TEXT NOT NULL DEFAULT '',
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_logs_owner_id_idx     ON public.activity_logs (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_property_id_idx  ON public.activity_logs (property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_event_idx        ON public.activity_logs (event);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_logs_owner_access ON public.activity_logs;
CREATE POLICY activity_logs_owner_access ON public.activity_logs FOR ALL USING (
  owner_id = auth.uid()
  OR owner_id IN (SELECT owner_scope_id FROM public.profiles WHERE id = auth.uid() AND owner_scope_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('platform_admin','admin','super_admin'))
);

-- ── SECTION 5: Maintenance threads ───────────────────────────────────────────

-- Extend maintenance_tickets with operational columns
ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS image_url   TEXT DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.set_maintenance_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_maintenance_updated_at ON public.maintenance_tickets;
CREATE TRIGGER trg_maintenance_updated_at
  BEFORE UPDATE ON public.maintenance_tickets
  FOR EACH ROW EXECUTE PROCEDURE public.set_maintenance_updated_at();

CREATE TABLE IF NOT EXISTS public.maintenance_threads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role  TEXT NOT NULL DEFAULT 'owner'
    CHECK (actor_role IN ('owner','owner_manager','staff','tenant','system')),
  body        TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  status_from TEXT,
  status_to   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_threads_ticket_id  ON public.maintenance_threads (ticket_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_threads_created_at ON public.maintenance_threads (created_at DESC);

ALTER TABLE public.maintenance_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS maintenance_threads_owner_access ON public.maintenance_threads;
CREATE POLICY maintenance_threads_owner_access ON public.maintenance_threads FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_tickets mt
    WHERE mt.id = ticket_id AND (
      mt.owner_id = auth.uid()
      OR mt.owner_id IN (SELECT owner_scope_id FROM public.profiles WHERE id = auth.uid() AND owner_scope_id IS NOT NULL)
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('platform_admin','admin','super_admin'))
    )
  )
);

DROP POLICY IF EXISTS maintenance_threads_tenant_read ON public.maintenance_threads;
CREATE POLICY maintenance_threads_tenant_read ON public.maintenance_threads FOR SELECT USING (
  is_internal = false
  AND EXISTS (
    SELECT 1 FROM public.maintenance_tickets mt
    WHERE mt.id = ticket_id
      AND public.current_user_matches_tenant(
        (SELECT email FROM public.tenants WHERE id = mt.tenant_id LIMIT 1),
        (SELECT phone FROM public.tenants WHERE id = mt.tenant_id LIMIT 1)
      )
  )
);

-- ── SECTION 6: DB triggers ────────────────────────────────────────────────────

-- Auto-update tenant updated_at
CREATE OR REPLACE FUNCTION public.update_tenant_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenant_updated_at ON public.tenants;
CREATE TRIGGER trg_tenant_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_tenant_updated_at();

-- Auto-log tenant status changes
CREATE OR REPLACE FUNCTION public.log_tenant_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.activity_logs (owner_id, property_id, event, detail, metadata)
    VALUES (NEW.owner_id, NEW.property_id, 'TENANT_STATUS_CHANGED',
      format('%s status changed: %s → %s', NEW.name, OLD.status, NEW.status),
      jsonb_build_object('tenantId',NEW.id,'tenantName',NEW.name,'previousStatus',OLD.status,'newStatus',NEW.status,'room',NEW.room));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_status_change_log ON public.tenants;
CREATE TRIGGER tenant_status_change_log
  AFTER UPDATE OF status ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.log_tenant_status_change();

-- Auto-sync room occupancy on tenant change
CREATE OR REPLACE FUNCTION public.sync_single_room(p_property_id UUID, p_floor INTEGER, p_room TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_room_id UUID; v_room_beds INTEGER; v_current_status TEXT; v_active_count INTEGER;
BEGIN
  SELECT id, beds, status INTO v_room_id, v_room_beds, v_current_status
  FROM public.rooms WHERE property_id = p_property_id AND floor = p_floor AND LOWER(number) = LOWER(p_room) LIMIT 1;
  IF v_room_id IS NULL OR v_current_status = 'maintenance' THEN RETURN; END IF;
  SELECT COUNT(*) INTO v_active_count FROM public.tenants
  WHERE property_id = p_property_id AND floor = p_floor AND LOWER(room) = LOWER(p_room)
    AND status IN ('active','payment_overdue','notice_submitted','vacating');
  UPDATE public.rooms
  SET occupied_beds = LEAST(v_active_count, COALESCE(v_room_beds,1)),
      status = CASE WHEN v_active_count > 0 THEN 'occupied' ELSE 'vacant' END
  WHERE id = v_room_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_room_occupancy_on_tenant_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_single_room(OLD.property_id, OLD.floor, OLD.room);
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' AND (OLD.room IS DISTINCT FROM NEW.room OR OLD.floor IS DISTINCT FROM NEW.floor) THEN
    PERFORM public.sync_single_room(OLD.property_id, OLD.floor, OLD.room);
  END IF;
  PERFORM public.sync_single_room(NEW.property_id, NEW.floor, NEW.room);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_room_on_tenant_change ON public.tenants;
CREATE TRIGGER sync_room_on_tenant_change
  AFTER INSERT OR UPDATE OF status, room, floor, property_id OR DELETE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.sync_room_occupancy_on_tenant_change();

-- ── SECTION 7: RPC functions ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv record; expired boolean;
BEGIN
  SELECT * INTO inv FROM public.owner_invites WHERE token = p_token LIMIT 1;
  IF inv.id IS NULL THEN RETURN jsonb_build_object('found',false); END IF;
  expired := inv.expires_at < now();
  IF inv.status <> 'pending' OR expired THEN
    RETURN jsonb_build_object('found',false,'status',inv.status,'expired',expired);
  END IF;
  RETURN jsonb_build_object('found',true,'invite',jsonb_build_object(
    'id',inv.id,'owner_id',inv.owner_id,'invited_email',inv.invited_email,
    'display_role',inv.display_role,'property_ids',inv.property_ids,
    'expires_at',inv.expires_at,'status',inv.status
  ));
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_owner_invite_token(p_invite_id uuid, p_expires_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv record; next_expiry timestamptz;
BEGIN
  next_expiry := COALESCE(p_expires_at, now() + interval '7 days');
  UPDATE public.owner_invites
  SET token = encode(gen_random_bytes(24),'hex'), expires_at = next_expiry, status = 'pending', updated_at = now()
  WHERE id = p_invite_id RETURNING * INTO inv;
  IF inv.id IS NULL THEN RETURN jsonb_build_object('success',false,'reason','not_found'); END IF;
  RETURN jsonb_build_object('success',true,'token',inv.token,'expires_at',inv.expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_invite_by_token(p_user_id uuid, p_email text, p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv record; prop_id uuid;
BEGIN
  SELECT * INTO inv FROM public.owner_invites WHERE token = p_token AND status = 'pending' AND expires_at > now() ORDER BY invited_at DESC LIMIT 1;
  IF inv.id IS NULL THEN RETURN jsonb_build_object('success',false,'reason','no_pending_invite'); END IF;
  IF lower(inv.invited_email) <> lower(p_email) THEN RETURN jsonb_build_object('success',false,'reason','email_mismatch'); END IF;

  UPDATE public.profiles SET role = inv.role, owner_scope_id = inv.owner_id, updated_at = now() WHERE id = p_user_id;

  FOREACH prop_id IN ARRAY inv.property_ids LOOP
    INSERT INTO public.owner_user_property_scopes
      (owner_id, user_id, property_id, can_view, can_manage_properties,
       can_manage_tenants, can_manage_payments, can_manage_maintenance, can_manage_announcements, display_role)
    VALUES (inv.owner_id, p_user_id, prop_id, true, false,
      COALESCE((inv.capabilities->>'can_manage_tenants')::boolean,false),
      COALESCE((inv.capabilities->>'can_manage_payments')::boolean,false),
      COALESCE((inv.capabilities->>'can_manage_maintenance')::boolean,false),
      COALESCE((inv.capabilities->>'can_manage_announcements')::boolean,false),
      inv.display_role)
    ON CONFLICT (user_id, property_id) DO UPDATE SET
      can_view = true,
      can_manage_tenants = excluded.can_manage_tenants,
      can_manage_payments = excluded.can_manage_payments,
      can_manage_maintenance = excluded.can_manage_maintenance,
      can_manage_announcements = excluded.can_manage_announcements,
      display_role = excluded.display_role,
      updated_at = now();
  END LOOP;

  UPDATE public.owner_invites SET status='accepted', accepted_at=now(), accepted_by=p_user_id WHERE id=inv.id;

  INSERT INTO public.activity_logs (owner_id, property_id, event, detail, metadata)
  VALUES (inv.owner_id, null, 'TEAM_INVITE_ACCEPTED', 'Invite accepted by '||lower(p_email),
    jsonb_build_object('inviteId',inv.id,'userId',p_user_id));

  RETURN jsonb_build_object('success',true,'owner_id',inv.owner_id,'role',inv.role);
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_pending_invite(p_user_id uuid, p_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv record; prop_id uuid;
BEGIN
  SELECT * INTO inv FROM public.owner_invites WHERE lower(invited_email)=lower(p_email) AND status='pending' AND expires_at>now() ORDER BY invited_at DESC LIMIT 1;
  IF inv.id IS NULL THEN RETURN jsonb_build_object('success',false,'reason','no_pending_invite'); END IF;

  UPDATE public.profiles SET role=inv.role, owner_scope_id=inv.owner_id, updated_at=now() WHERE id=p_user_id;

  FOREACH prop_id IN ARRAY inv.property_ids LOOP
    INSERT INTO public.owner_user_property_scopes
      (owner_id, user_id, property_id, can_view, can_manage_properties,
       can_manage_tenants, can_manage_payments, can_manage_maintenance, can_manage_announcements, display_role)
    VALUES (inv.owner_id, p_user_id, prop_id, true, false,
      COALESCE((inv.capabilities->>'can_manage_tenants')::boolean,false),
      COALESCE((inv.capabilities->>'can_manage_payments')::boolean,false),
      COALESCE((inv.capabilities->>'can_manage_maintenance')::boolean,false),
      COALESCE((inv.capabilities->>'can_manage_announcements')::boolean,false),
      inv.display_role)
    ON CONFLICT (user_id, property_id) DO UPDATE SET
      can_view = true,
      can_manage_tenants = excluded.can_manage_tenants,
      can_manage_payments = excluded.can_manage_payments,
      can_manage_maintenance = excluded.can_manage_maintenance,
      can_manage_announcements = excluded.can_manage_announcements,
      display_role = excluded.display_role,
      updated_at = now();
  END LOOP;

  UPDATE public.owner_invites SET status='accepted', accepted_at=now(), accepted_by=p_user_id WHERE id=inv.id;

  INSERT INTO public.activity_logs (owner_id, property_id, event, detail, metadata)
  VALUES (inv.owner_id, null, 'TEAM_INVITE_ACCEPTED', 'Invite accepted by '||lower(p_email),
    jsonb_build_object('inviteId',inv.id,'userId',p_user_id));

  RETURN jsonb_build_object('success',true,'owner_id',inv.owner_id,'role',inv.role);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_owner_payment_info(p_owner_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'upiId',      COALESCE((whatsapp_settings->'paymentSettings'->>'upiId'), ''),
    'qrCodeUrl',  COALESCE((whatsapp_settings->'paymentSettings'->>'qrCodeUrl'), ''),
    'pgRules',    COALESCE(pg_rules, '[]'::jsonb),
    'ownerPhone', COALESCE((SELECT phone FROM public.profiles WHERE id = p_owner_id LIMIT 1), ''),
    'pgName',     COALESCE((SELECT pg_name FROM public.profiles WHERE id = p_owner_id LIMIT 1), '')
  ) INTO v_result FROM public.owner_settings WHERE owner_id = p_owner_id;
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_owner_payment_info(UUID) TO authenticated;

-- ── SECTION 8: Storage buckets ────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('tenant-files', 'tenant-files', false, 5242880,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance-images', 'maintenance-images', true)
ON CONFLICT (id) DO NOTHING;

-- tenant-files policies
DROP POLICY IF EXISTS tenant_files_owner_upload ON storage.objects;
CREATE POLICY tenant_files_owner_upload ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'tenant-files' AND (storage.foldername(name))[1] = auth.uid()::TEXT
);
DROP POLICY IF EXISTS tenant_files_owner_select ON storage.objects;
CREATE POLICY tenant_files_owner_select ON storage.objects FOR SELECT USING (
  bucket_id = 'tenant-files' AND (storage.foldername(name))[1] = auth.uid()::TEXT
);
DROP POLICY IF EXISTS tenant_files_owner_delete ON storage.objects;
CREATE POLICY tenant_files_owner_delete ON storage.objects FOR DELETE USING (
  bucket_id = 'tenant-files' AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

-- profile-photos policies
DROP POLICY IF EXISTS profile_photos_owner_upload ON storage.objects;
CREATE POLICY profile_photos_owner_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text
);
DROP POLICY IF EXISTS profile_photos_owner_update ON storage.objects;
CREATE POLICY profile_photos_owner_update ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text
);
DROP POLICY IF EXISTS profile_photos_public_select ON storage.objects;
CREATE POLICY profile_photos_public_select ON storage.objects FOR SELECT USING (bucket_id = 'profile-photos');
DROP POLICY IF EXISTS profile_photos_owner_delete ON storage.objects;
CREATE POLICY profile_photos_owner_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text
);

-- maintenance-images policies
DROP POLICY IF EXISTS "Tenants can upload maintenance images" ON storage.objects;
CREATE POLICY "Tenants can upload maintenance images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'maintenance-images' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Public read maintenance images" ON storage.objects;
CREATE POLICY "Public read maintenance images" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'maintenance-images');
DROP POLICY IF EXISTS "Owner delete maintenance images" ON storage.objects;
CREATE POLICY "Owner delete maintenance images" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'maintenance-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── SECTION 9: Admin portal columns and tables ────────────────────────────────

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at     TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_at      TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.admin_coupons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT UNIQUE NOT NULL,
  description      TEXT,
  discount_type    TEXT NOT NULL CHECK (discount_type IN ('percent','flat')),
  discount_value   NUMERIC NOT NULL CHECK (discount_value > 0),
  max_uses         INT,
  used_count       INT NOT NULL DEFAULT 0,
  valid_from       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until      TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  plan_restriction TEXT,
  created_by       UUID REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.admin_coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_coupons_platform_admin ON public.admin_coupons;
CREATE POLICY admin_coupons_platform_admin ON public.admin_coupons FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('platform_admin','admin','super_admin'))
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id    UUID REFERENCES public.profiles(id),
  referee_email  TEXT NOT NULL,
  referee_id     UUID REFERENCES public.profiles(id),
  referral_code  TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','signed_up','converted','rewarded')),
  reward_amount  NUMERIC NOT NULL DEFAULT 0,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted_at   TIMESTAMPTZ
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS referrals_access ON public.referrals;
CREATE POLICY referrals_access ON public.referrals FOR ALL USING (
  referrer_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('platform_admin','admin','super_admin'))
);

CREATE TABLE IF NOT EXISTS public.lead_sources (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID REFERENCES public.profiles(id),
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  utm_term     TEXT,
  utm_content  TEXT,
  referrer_url TEXT,
  landing_page TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lead_sources_access ON public.lead_sources;
CREATE POLICY lead_sources_access ON public.lead_sources FOR ALL USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('platform_admin','admin','super_admin'))
);

CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals (referral_code);
CREATE INDEX IF NOT EXISTS idx_lead_sources_owner ON public.lead_sources (owner_id);
CREATE INDEX IF NOT EXISTS idx_admin_coupons_code ON public.admin_coupons (code);
CREATE INDEX IF NOT EXISTS idx_notifications_owner_read ON public.notifications(owner_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_owner_created ON public.activity_logs(owner_id, created_at DESC);

-- ── SECTION 10: handle_new_auth_user trigger ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  metadata jsonb; resolved_role text;
  pending_invite record; prop_id uuid;
BEGIN
  metadata := COALESCE(new.raw_user_meta_data, '{}'::jsonb);
  resolved_role := COALESCE(metadata->>'role', 'owner');
  IF resolved_role NOT IN ('owner','owner_manager','staff','tenant','platform_admin','admin','super_admin') THEN
    resolved_role := 'owner';
  END IF;

  SELECT * INTO pending_invite FROM public.owner_invites
  WHERE lower(invited_email)=lower(new.email) AND status='pending' AND expires_at>now()
  ORDER BY invited_at DESC LIMIT 1;

  IF pending_invite.id IS NOT NULL THEN resolved_role := pending_invite.role; END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, role, pg_name, city, owner_scope_id)
  VALUES (new.id, new.email,
    COALESCE(metadata->>'name', split_part(COALESCE(new.email,''),'@',1)),
    metadata->>'phone', resolved_role, metadata->>'pgName', metadata->>'city',
    CASE WHEN resolved_role='owner' THEN new.id
         WHEN pending_invite.id IS NOT NULL THEN pending_invite.owner_id
         ELSE NULL END)
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    full_name = COALESCE(excluded.full_name, public.profiles.full_name),
    phone = COALESCE(excluded.phone, public.profiles.phone),
    role = CASE WHEN pending_invite.id IS NOT NULL THEN pending_invite.role
                ELSE COALESCE(public.profiles.role, excluded.role) END,
    owner_scope_id = CASE
      WHEN pending_invite.id IS NOT NULL THEN pending_invite.owner_id
      WHEN COALESCE(public.profiles.role,excluded.role)='owner' THEN public.profiles.id
      ELSE COALESCE(public.profiles.owner_scope_id, excluded.owner_scope_id) END,
    pg_name = COALESCE(excluded.pg_name, public.profiles.pg_name),
    city = COALESCE(excluded.city, public.profiles.city),
    updated_at = now();

  -- Auto-create owner_settings + subscription for new owners
  IF resolved_role = 'owner' THEN
    INSERT INTO public.owner_settings (owner_id) VALUES (new.id) ON CONFLICT DO NOTHING;
    INSERT INTO public.owner_subscriptions
      (owner_id, plan_code, status, billing_cycle, amount, currency, seats, trial_ends_at, renews_at)
    VALUES (new.id,'starter','trialing','monthly',0,'INR',1,now()+interval'14 day',now()+interval'1 month')
    ON CONFLICT (owner_id) DO NOTHING;
  END IF;

  -- Apply pending invite if matched
  IF pending_invite.id IS NOT NULL THEN
    FOREACH prop_id IN ARRAY pending_invite.property_ids LOOP
      INSERT INTO public.owner_user_property_scopes
        (owner_id, user_id, property_id, can_view, can_manage_properties,
         can_manage_tenants, can_manage_payments, can_manage_maintenance, can_manage_announcements, display_role)
      VALUES (pending_invite.owner_id, new.id, prop_id, true, false,
        COALESCE((pending_invite.capabilities->>'can_manage_tenants')::boolean,false),
        COALESCE((pending_invite.capabilities->>'can_manage_payments')::boolean,false),
        COALESCE((pending_invite.capabilities->>'can_manage_maintenance')::boolean,false),
        COALESCE((pending_invite.capabilities->>'can_manage_announcements')::boolean,false),
        pending_invite.display_role)
      ON CONFLICT (user_id, property_id) DO UPDATE SET
        can_view = true,
        can_manage_tenants = excluded.can_manage_tenants,
        can_manage_payments = excluded.can_manage_payments,
        can_manage_maintenance = excluded.can_manage_maintenance,
        can_manage_announcements = excluded.can_manage_announcements,
        display_role = excluded.display_role,
        updated_at = now();
    END LOOP;
    UPDATE public.owner_invites SET status='accepted', accepted_at=now(), accepted_by=new.id WHERE id=pending_invite.id;
  END IF;

  RETURN new;
END;
$$;

-- IMPORTANT: Also run this in Supabase Dashboard > Authentication > Hooks
-- OR via SQL:
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();

-- ── SECTION 11: Realtime publications ────────────────────────────────────────

DO $$
DECLARE tbls TEXT[] := ARRAY['vacate_requests','activity_logs','maintenance_threads',
                              'admin_coupons','referrals','lead_sources'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename=t) THEN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.' || t;
      END IF;
    END IF;
  END LOOP;
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'supabase_realtime publication not found — skip';
END $$;

-- ── DONE ─────────────────────────────────────────────────────────────────────
-- Verify by running:
--   SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;
-- Expected new tables: activity_logs, admin_coupons, lead_sources, maintenance_threads, referrals, vacate_requests

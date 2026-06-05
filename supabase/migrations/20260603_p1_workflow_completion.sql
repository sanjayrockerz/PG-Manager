-- ============================================================
-- P1 Workflow Completion — 2026-06-03
-- Apply in Supabase Dashboard > SQL Editor
-- Idempotent — safe to re-run.
-- ============================================================

-- ── COUPON VALIDATION RPC ─────────────────────────────────────────────────────
-- Owners can validate a coupon code without needing direct table access.
-- Returns coupon metadata if valid, empty object if invalid.

CREATE OR REPLACE FUNCTION public.validate_coupon(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
BEGIN
  SELECT
    id,
    code,
    description,
    discount_type,
    discount_value,
    max_uses,
    used_count,
    valid_until,
    is_active,
    plan_restriction
  INTO v_coupon
  FROM public.admin_coupons
  WHERE UPPER(code) = UPPER(p_code)
  LIMIT 1;

  -- Coupon not found
  IF v_coupon.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Coupon not found');
  END IF;

  -- Coupon inactive
  IF NOT v_coupon.is_active THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Coupon is no longer active');
  END IF;

  -- Coupon expired
  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Coupon has expired');
  END IF;

  -- Usage limit exceeded
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Coupon usage limit reached');
  END IF;

  RETURN jsonb_build_object(
    'valid',            true,
    'code',             v_coupon.code,
    'description',      COALESCE(v_coupon.description, ''),
    'discountType',     v_coupon.discount_type,
    'discountValue',    v_coupon.discount_value,
    'planRestriction',  v_coupon.plan_restriction
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(TEXT) TO authenticated;

-- ── COUPON REDEMPTION RPC ─────────────────────────────────────────────────────
-- Increments used_count when owner redeems a coupon.
-- Idempotent per owner (one redemption per owner per code).

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id  UUID NOT NULL REFERENCES public.admin_coupons(id) ON DELETE CASCADE,
  owner_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, owner_id)
);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coupon_redemptions_owner ON public.coupon_redemptions;
CREATE POLICY coupon_redemptions_owner ON public.coupon_redemptions
  FOR SELECT USING (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.redeem_coupon(p_code TEXT, p_owner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
  v_already_redeemed BOOLEAN;
BEGIN
  -- Validate first
  SELECT id, code, is_active, valid_until, max_uses, used_count
  INTO v_coupon
  FROM public.admin_coupons
  WHERE UPPER(code) = UPPER(p_code) AND is_active = true
  LIMIT 1;

  IF v_coupon.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Invalid coupon');
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Coupon expired');
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Usage limit reached');
  END IF;

  -- Check if already redeemed by this owner
  SELECT EXISTS (
    SELECT 1 FROM public.coupon_redemptions
    WHERE coupon_id = v_coupon.id AND owner_id = p_owner_id
  ) INTO v_already_redeemed;

  IF v_already_redeemed THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Coupon already redeemed by this account');
  END IF;

  -- Record redemption
  INSERT INTO public.coupon_redemptions (coupon_id, owner_id)
  VALUES (v_coupon.id, p_owner_id)
  ON CONFLICT (coupon_id, owner_id) DO NOTHING;

  -- Increment used_count
  UPDATE public.admin_coupons
  SET used_count = used_count + 1, updated_at = now()
  WHERE id = v_coupon.id;

  RETURN jsonb_build_object('success', true, 'code', v_coupon.code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_coupon(TEXT, UUID) TO authenticated;


-- ── LEAD SOURCE AUTO-CAPTURE ──────────────────────────────────────────────────
-- Captures UTM parameters at signup via the handle_new_auth_user trigger.
-- This table must exist before the trigger below is applied.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lead_sources'
    AND column_name = 'owner_id') THEN
    RAISE NOTICE 'lead_sources table not found — run 20260530_admin_portal_v2.sql first';
  END IF;
END $$;


-- ── MAINTENANCE ASSIGNMENT AUDIT ──────────────────────────────────────────────
-- Auto-log when a ticket is assigned to a team member

CREATE OR REPLACE FUNCTION public.log_maintenance_assignment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.activity_logs (owner_id, property_id, event, detail, metadata)
    VALUES (
      NEW.owner_id,
      NEW.property_id,
      'MAINTENANCE_ASSIGNED',
      format('Ticket %s assigned', NEW.id),
      jsonb_build_object(
        'ticketId', NEW.id,
        'issue', NEW.issue,
        'assignedTo', NEW.assigned_to,
        'room', NEW.room
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS maintenance_assignment_log ON public.maintenance_tickets;
CREATE TRIGGER maintenance_assignment_log
  AFTER UPDATE OF assigned_to ON public.maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_maintenance_assignment();

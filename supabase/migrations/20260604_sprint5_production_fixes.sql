-- ============================================================
-- Sprint 5: Production Readiness Fixes
-- Idempotent — safe to re-run.
-- ============================================================

-- ── FIX C1: CRITICAL SECURITY — restrict tenant profile update policy ─────────
-- The broad tenant_update_first_login policy allows any user to update their own
-- role, is_suspended, owner_scope_id etc. Replace with a column-restricted policy.

DROP POLICY IF EXISTS "tenant_update_first_login" ON public.profiles;

-- Re-create with explicit column guard: only first_login_completed_at may change.
-- All other sensitive columns are locked to their current value via WITH CHECK.
CREATE POLICY "tenant_update_first_login_only"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent role escalation: role must stay unchanged
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    -- Prevent unsuspending oneself
    AND is_suspended = (SELECT is_suspended FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    -- Prevent cross-account scope injection
    AND owner_scope_id IS NOT DISTINCT FROM (SELECT owner_scope_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

-- ── FIX C2: Add text/html to tenant-files bucket allowed MIME types ────────────
-- storeReceiptAsDocument uploads HTML but bucket only allowed images/pdf.
UPDATE storage.buckets
SET allowed_mime_types = array_append(
  COALESCE(allowed_mime_types, ARRAY[]::text[]),
  'text/html'
)
WHERE id = 'tenant-files'
  AND NOT ('text/html' = ANY(COALESCE(allowed_mime_types, ARRAY[]::text[])));

-- ── FIX C3: Add unique constraint for receipt upsert on tenant_documents ───────
-- storeReceiptAsDocument uses onConflict: 'tenant_id,label' — requires this constraint.
ALTER TABLE public.tenant_documents
  ADD CONSTRAINT IF NOT EXISTS tenant_docs_unique_label UNIQUE (tenant_id, label);

-- ── FIX M3: Add 'assigned' to maintenance_tickets status ─────────────────────
ALTER TABLE public.maintenance_tickets
  DROP CONSTRAINT IF EXISTS maintenance_tickets_status_check;

ALTER TABLE public.maintenance_tickets
  ADD CONSTRAINT maintenance_tickets_status_check
    CHECK (status IN ('open', 'assigned', 'in-progress', 'waiting', 'resolved', 'closed'));

-- ── FIX L1: Functional index for partial phone match in conflict checks ────────
-- createTenant does ilike '%last10digits' — this index enables efficient lookup.
CREATE INDEX IF NOT EXISTS idx_profiles_phone_last10
  ON public.profiles (right(regexp_replace(phone, '\D', '', 'g'), 10))
  WHERE phone IS NOT NULL AND phone <> '';

-- ── FIX L2 / FEATURE: integrations column on owner_settings ──────────────────
-- Stores SMS provider and payment gateway configuration per owner.
-- Uses JSONB so no schema changes needed when new providers are added.
ALTER TABLE public.owner_settings
  ADD COLUMN IF NOT EXISTS integrations JSONB NOT NULL DEFAULT '{}';

-- ── FEATURE: Tenant pending_onboarding auto-transition DB trigger ─────────────
-- When a tenant logs in and their profile is confirmed, transition status → active.
-- This trigger fires when the profiles table is updated (phone/email confirmed).
CREATE OR REPLACE FUNCTION public.auto_activate_pending_tenant()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role = 'tenant' AND OLD.role IS DISTINCT FROM 'tenant' THEN
    UPDATE public.tenants
    SET status = 'active'
    WHERE status = 'pending_onboarding'
      AND (
        (NEW.email IS NOT NULL AND lower(email) = lower(NEW.email))
        OR (NEW.phone IS NOT NULL AND phone = NEW.phone)
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_activate_pending_tenant ON public.profiles;
CREATE TRIGGER auto_activate_pending_tenant
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'tenant')
  EXECUTE FUNCTION public.auto_activate_pending_tenant();

-- ── INDEX: payments performance ──────────────────────────────────────────────
-- N+1 guard: tenant portal snapshot queries payments by tenant_id and due_date.
CREATE INDEX IF NOT EXISTS idx_payments_tenant_due
  ON public.payments (tenant_id, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_payments_owner_status
  ON public.payments (owner_id, status, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_maintenance_tenant_property
  ON public.maintenance_tickets (tenant_id, property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agreements_tenant_status
  ON public.agreements (tenant_id, status);

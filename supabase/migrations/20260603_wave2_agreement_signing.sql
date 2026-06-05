-- ============================================================
-- Wave 2: Agreement Signing Workflow
-- Extends agreements table with full signing lifecycle.
-- Idempotent — safe to re-run.
-- ============================================================

-- ── 1. Add signature columns ────────────────────────────────
ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS owner_signature_name TEXT,
  ADD COLUMN IF NOT EXISTS owner_signed_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tenant_signature_name TEXT,
  ADD COLUMN IF NOT EXISTS tenant_signed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_locked            BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS version              INTEGER NOT NULL DEFAULT 1;

-- ── 2. Widen the status constraint to support signing states ─
-- Drop the old CHECK constraint (named in lifecycle foundation migration)
ALTER TABLE public.agreements
  DROP CONSTRAINT IF EXISTS agreements_status_check;

-- Re-add with full lifecycle values
ALTER TABLE public.agreements
  ADD CONSTRAINT agreements_status_check
    CHECK (status IN (
      'draft',
      'pending_owner_signature',
      'pending_tenant_signature',
      'executed',
      'sent',
      'signed',
      'expired',
      'archived',
      'cancelled'
    ));

-- ── 3. Agreement audit log table ───────────────────────────
CREATE TABLE IF NOT EXISTS public.agreement_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id   UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  actor_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role     TEXT NOT NULL CHECK (actor_role IN ('owner','tenant','system')),
  event_type     TEXT NOT NULL,   -- 'created','viewed','owner_signed','tenant_signed','downloaded','cancelled'
  event_detail   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agreement_events_agreement_id
  ON public.agreement_events (agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_events_created_at
  ON public.agreement_events (created_at DESC);

ALTER TABLE public.agreement_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agreement_events_owner_all"   ON public.agreement_events;
DROP POLICY IF EXISTS "agreement_events_tenant_read" ON public.agreement_events;

CREATE POLICY "agreement_events_owner_all"
  ON public.agreement_events FOR ALL
  USING (
    agreement_id IN (
      SELECT id FROM public.agreements WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "agreement_events_tenant_read"
  ON public.agreement_events FOR SELECT
  USING (
    agreement_id IN (
      SELECT a.id FROM public.agreements a
      JOIN public.tenants t ON t.id = a.tenant_id
      WHERE t.email = (SELECT email FROM public.profiles WHERE id = auth.uid())
         OR t.phone = (SELECT phone FROM public.profiles WHERE id = auth.uid())
    )
  );

-- ── 4. RLS policy for tenant signing (UPDATE only own agreement) ─
DROP POLICY IF EXISTS "agreements_tenant_sign" ON public.agreements;
CREATE POLICY "agreements_tenant_sign"
  ON public.agreements FOR UPDATE
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
         OR phone  = (SELECT phone  FROM public.profiles WHERE id = auth.uid())
    )
    AND status = 'pending_tenant_signature'
    AND is_locked = FALSE
  )
  WITH CHECK (
    status IN ('pending_tenant_signature', 'executed')
  );

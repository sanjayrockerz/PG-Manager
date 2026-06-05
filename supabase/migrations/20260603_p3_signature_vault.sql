-- ============================================================
-- P3: Owner Signature Vault + Agreement Templates
-- Adds reusable owner signatures and versioned agreement clauses.
-- Idempotent — safe to re-run.
-- ============================================================

-- ── 1. Owner Signature Vault ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.owner_signature_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  signature_type  TEXT NOT NULL CHECK (signature_type IN ('draw', 'upload', 'typed')),
  signature_image TEXT,       -- base64 data URL for draw/upload types
  signature_text  TEXT,       -- display text for typed type
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_sig_profiles_owner_id
  ON public.owner_signature_profiles (owner_id);

ALTER TABLE public.owner_signature_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sig_profiles_owner_all" ON public.owner_signature_profiles;
CREATE POLICY "sig_profiles_owner_all"
  ON public.owner_signature_profiles FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ── 2. Agreement Templates ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agreement_templates (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  version                 INTEGER NOT NULL DEFAULT 1,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  house_rules             TEXT,
  visitor_rules           TEXT,
  late_fee_clause         TEXT,
  notice_period_clause    TEXT,
  refund_policy           TEXT,
  security_deposit_terms  TEXT,
  property_rules          TEXT,
  miscellaneous_terms     TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agreement_templates_owner_id
  ON public.agreement_templates (owner_id);

ALTER TABLE public.agreement_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agreement_templates_owner_all" ON public.agreement_templates;
CREATE POLICY "agreement_templates_owner_all"
  ON public.agreement_templates FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ── 3. Extend agreements table ────────────────────────────────────────────────
ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS owner_signature_image TEXT,
  ADD COLUMN IF NOT EXISTS tenant_signature_image TEXT,
  ADD COLUMN IF NOT EXISTS ip_address             TEXT,
  ADD COLUMN IF NOT EXISTS device_metadata        TEXT,
  ADD COLUMN IF NOT EXISTS template_version       INTEGER;

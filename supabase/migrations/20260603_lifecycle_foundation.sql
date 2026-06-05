-- ─── Lifecycle Foundation Migration ─────────────────────────────────────────
-- Adds: occupancy_mode on properties, room_code on rooms,
--       property_floors, beds, tenant_documents, agreements tables.
-- All changes are additive — no existing columns dropped.
-- NOTE: PostgreSQL does not support CREATE POLICY IF NOT EXISTS.
--       Policies are dropped first so this script is safe to re-run.

-- ─── 1. occupancy_mode on properties ────────────────────────────────────────
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS occupancy_mode TEXT NOT NULL DEFAULT 'BED_BASED'
    CHECK (occupancy_mode IN ('BED_BASED', 'ROOM_BASED'));

-- ─── 2. room_code on rooms ───────────────────────────────────────────────────
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS room_code TEXT;

-- ─── 3. property_floors table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.property_floors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  floor_number  INTEGER NOT NULL,
  label         TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, floor_number)
);

CREATE INDEX IF NOT EXISTS idx_property_floors_property_id
  ON public.property_floors (property_id);

ALTER TABLE public.property_floors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_floors_owner_all" ON public.property_floors;
CREATE POLICY "property_floors_owner_all"
  ON public.property_floors
  FOR ALL
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- ─── 4. beds table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.beds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  property_id   UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  bed_code      TEXT NOT NULL,
  position      INTEGER NOT NULL DEFAULT 1,
  status        TEXT NOT NULL DEFAULT 'vacant'
                  CHECK (status IN ('occupied', 'vacant', 'maintenance')),
  tenant_id     UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, bed_code)
);

CREATE INDEX IF NOT EXISTS idx_beds_room_id       ON public.beds (room_id);
CREATE INDEX IF NOT EXISTS idx_beds_property_id   ON public.beds (property_id);
CREATE INDEX IF NOT EXISTS idx_beds_tenant_id     ON public.beds (tenant_id);

ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "beds_owner_all"    ON public.beds;
DROP POLICY IF EXISTS "beds_tenant_read"  ON public.beds;

CREATE POLICY "beds_owner_all"
  ON public.beds
  FOR ALL
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "beds_tenant_read"
  ON public.beds
  FOR SELECT
  USING (tenant_id = auth.uid());

-- ─── 5. tenant_documents table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doc_type      TEXT NOT NULL,
  label         TEXT NOT NULL DEFAULT '',
  file_url      TEXT NOT NULL,
  verified      BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_docs_tenant_id ON public.tenant_documents (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_docs_owner_id  ON public.tenant_documents (owner_id);

ALTER TABLE public.tenant_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_docs_owner_all"   ON public.tenant_documents;
DROP POLICY IF EXISTS "tenant_docs_tenant_read" ON public.tenant_documents;

CREATE POLICY "tenant_docs_owner_all"
  ON public.tenant_documents
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "tenant_docs_tenant_read"
  ON public.tenant_documents
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
         OR phone  = (SELECT phone  FROM public.profiles WHERE id = auth.uid())
    )
  );

-- ─── 6. agreements table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agreements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id       UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'sent', 'signed', 'expired', 'archived')),
  agreement_type    TEXT NOT NULL DEFAULT 'license',
  start_date        DATE NOT NULL,
  end_date          DATE,
  monthly_rent      NUMERIC(10,2) NOT NULL,
  security_deposit  NUMERIC(10,2) NOT NULL DEFAULT 0,
  html_content      TEXT,
  pdf_url           TEXT,
  signed_at         TIMESTAMPTZ,
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agreements_tenant_id   ON public.agreements (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agreements_property_id ON public.agreements (property_id);
CREATE INDEX IF NOT EXISTS idx_agreements_owner_id    ON public.agreements (owner_id);

ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agreements_owner_all"    ON public.agreements;
DROP POLICY IF EXISTS "agreements_tenant_read"  ON public.agreements;

CREATE POLICY "agreements_owner_all"
  ON public.agreements
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "agreements_tenant_read"
  ON public.agreements
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
         OR phone  = (SELECT phone  FROM public.profiles WHERE id = auth.uid())
    )
  );

-- ─── updated_at trigger for agreements ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agreements_set_updated_at ON public.agreements;
CREATE TRIGGER agreements_set_updated_at
  BEFORE UPDATE ON public.agreements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

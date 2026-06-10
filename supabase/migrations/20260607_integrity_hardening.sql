-- ================================================================
-- Phase 7: SQL Integrity Hardening
-- File: 20260607_integrity_hardening.sql
--
-- Adds the FK-column indexes and cross-table owner-consistency
-- constraints that the base schema did not include. Idempotent and
-- safe to re-run.
--
-- IMPORTANT: run supabase/verify/integrity_audit.sql FIRST. The
-- owner-consistency FKs below are added NOT VALID, so they enforce on
-- all NEW/updated rows immediately but do not reject existing legacy
-- rows. Once the audit reports zero *_mismatch rows, VALIDATE them
-- (see the final section) to lock historical data in too.
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- SECTION 1: MISSING FOREIGN-KEY INDEXES
-- Every owner-scoped query filters on these columns. Without indexes
-- Postgres sequential-scans the whole table per request.
-- ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id            ON public.tenants (owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_property_id         ON public.tenants (property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status              ON public.tenants (status);

CREATE INDEX IF NOT EXISTS idx_payments_owner_id           ON public.payments (owner_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id          ON public.payments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_property_id        ON public.payments (property_id);
CREATE INDEX IF NOT EXISTS idx_payments_status_due         ON public.payments (status, due_date);

CREATE INDEX IF NOT EXISTS idx_rooms_property_id           ON public.rooms (property_id);

CREATE INDEX IF NOT EXISTS idx_maint_owner_id              ON public.maintenance_tickets (owner_id);
CREATE INDEX IF NOT EXISTS idx_maint_property_id           ON public.maintenance_tickets (property_id);
CREATE INDEX IF NOT EXISTS idx_maint_tenant_id             ON public.maintenance_tickets (tenant_id);
CREATE INDEX IF NOT EXISTS idx_maint_status               ON public.maintenance_tickets (status);

CREATE INDEX IF NOT EXISTS idx_announcements_owner_id      ON public.announcements (owner_id);
CREATE INDEX IF NOT EXISTS idx_announcements_property_id   ON public.announcements (property_id);

CREATE INDEX IF NOT EXISTS idx_payment_charges_payment_id  ON public.payment_charges (payment_id);

-- ────────────────────────────────────────────────────────────────
-- SECTION 2: COMPOSITE-KEY TARGETS
-- A composite FK can only reference a UNIQUE/PK key. id is already
-- unique, so (id, owner_id) / (id, property_id) are trivially unique
-- — these enable the owner-consistency FKs in section 3.
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_id_owner_uk;
ALTER TABLE public.properties ADD  CONSTRAINT properties_id_owner_uk UNIQUE (id, owner_id);

ALTER TABLE public.tenants    DROP CONSTRAINT IF EXISTS tenants_id_owner_uk;
ALTER TABLE public.tenants    ADD  CONSTRAINT tenants_id_owner_uk UNIQUE (id, owner_id);

ALTER TABLE public.rooms      DROP CONSTRAINT IF EXISTS rooms_id_property_uk;
ALTER TABLE public.rooms      ADD  CONSTRAINT rooms_id_property_uk UNIQUE (id, property_id);

-- ────────────────────────────────────────────────────────────────
-- SECTION 3: OWNER / PARENT CONSISTENCY (added NOT VALID)
-- Guarantees a child row can never point at a parent owned by someone
-- else: tenant.owner_id == property.owner_id, payment.owner_id ==
-- tenant.owner_id, agreement.owner_id == tenant.owner_id, and
-- bed.property_id == room.property_id.
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_property_owner_fk;
ALTER TABLE public.tenants ADD  CONSTRAINT tenants_property_owner_fk
  FOREIGN KEY (property_id, owner_id)
  REFERENCES public.properties (id, owner_id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_tenant_owner_fk;
ALTER TABLE public.payments ADD  CONSTRAINT payments_tenant_owner_fk
  FOREIGN KEY (tenant_id, owner_id)
  REFERENCES public.tenants (id, owner_id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_property_owner_fk;
ALTER TABLE public.payments ADD  CONSTRAINT payments_property_owner_fk
  FOREIGN KEY (property_id, owner_id)
  REFERENCES public.properties (id, owner_id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.agreements DROP CONSTRAINT IF EXISTS agreements_tenant_owner_fk;
ALTER TABLE public.agreements ADD  CONSTRAINT agreements_tenant_owner_fk
  FOREIGN KEY (tenant_id, owner_id)
  REFERENCES public.tenants (id, owner_id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.beds DROP CONSTRAINT IF EXISTS beds_room_property_fk;
ALTER TABLE public.beds ADD  CONSTRAINT beds_room_property_fk
  FOREIGN KEY (room_id, property_id)
  REFERENCES public.rooms (id, property_id) ON DELETE CASCADE NOT VALID;

-- ────────────────────────────────────────────────────────────────
-- SECTION 4: VALIDATE EXISTING ROWS  (run ONLY after the audit is clean)
-- Uncomment and run once integrity_audit.sql reports zero *_mismatch
-- rows. VALIDATE takes a brief SHARE UPDATE EXCLUSIVE lock per table.
-- ────────────────────────────────────────────────────────────────
-- ALTER TABLE public.tenants    VALIDATE CONSTRAINT tenants_property_owner_fk;
-- ALTER TABLE public.payments   VALIDATE CONSTRAINT payments_tenant_owner_fk;
-- ALTER TABLE public.payments   VALIDATE CONSTRAINT payments_property_owner_fk;
-- ALTER TABLE public.agreements VALIDATE CONSTRAINT agreements_tenant_owner_fk;
-- ALTER TABLE public.beds       VALIDATE CONSTRAINT beds_room_property_fk;

-- ================================================================
-- END Phase 7 integrity hardening
-- ================================================================

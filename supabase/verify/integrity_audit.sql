-- ================================================================
-- RentCare — Integrity & Authority Audit  (READ-ONLY)
-- Run in Supabase SQL Editor against project krkzklxfczukvllhucsg.
-- Nothing here writes data. Paste the result sets back for certification.
--
-- Covers:
--   Phase 4  — platform admin account inventory
--   Phase 6  — authority chain spot-checks
--   Phase 7  — orphan detection + owner-consistency
-- ================================================================

-- ── PHASE 4: Platform admin accounts (no passwords — auth holds those) ──
-- How many admins exist, which emails, which role variant.
SELECT 'platform_admins' AS check,
       count(*)            AS total
FROM public.profiles
WHERE role IN ('platform_admin', 'admin', 'super_admin');

SELECT id, email, full_name, role, created_at
FROM public.profiles
WHERE role IN ('platform_admin', 'admin', 'super_admin')
ORDER BY created_at;

-- Role distribution across the whole platform.
SELECT role, count(*) AS users
FROM public.profiles
GROUP BY role
ORDER BY users DESC;

-- ── PHASE 6: Authority chain — membership coverage ──
-- Every property MUST resolve to an owner profile. Rows here = broken authority.
SELECT 'property_without_owner_profile' AS issue, p.id, p.name
FROM public.properties p
LEFT JOIN public.profiles pr ON pr.id = p.owner_id
WHERE pr.id IS NULL;

-- Members (manager/staff) whose scope points at a property they can't reach.
SELECT 'scope_property_missing' AS issue, s.id, s.user_id, s.property_id
FROM public.owner_user_property_scopes s
LEFT JOIN public.properties p ON p.id = s.property_id
WHERE p.id IS NULL;

-- ── PHASE 7: Orphan detection ──
-- (FKs should already prevent these; non-zero rows mean legacy/pre-FK data.)
SELECT 'tenant_orphan_property' AS issue, t.id, t.name
FROM public.tenants t
LEFT JOIN public.properties p ON p.id = t.property_id
WHERE p.id IS NULL;

SELECT 'payment_orphan_tenant' AS issue, pay.id
FROM public.payments pay
LEFT JOIN public.tenants t ON t.id = pay.tenant_id
WHERE t.id IS NULL;

SELECT 'agreement_orphan_tenant' AS issue, a.id
FROM public.agreements a
LEFT JOIN public.tenants t ON t.id = a.tenant_id
WHERE t.id IS NULL;

SELECT 'bed_orphan_room' AS issue, b.id
FROM public.beds b
LEFT JOIN public.rooms r ON r.id = b.room_id
WHERE r.id IS NULL;

-- ── PHASE 7: Owner-consistency (the integrity hardening will enforce these) ──
-- A tenant's owner_id must equal its property's owner_id.
SELECT 'tenant_owner_mismatch' AS issue, t.id, t.owner_id AS tenant_owner, p.owner_id AS property_owner
FROM public.tenants t
JOIN public.properties p ON p.id = t.property_id
WHERE t.owner_id <> p.owner_id;

-- A payment's owner_id must equal its tenant's owner_id.
SELECT 'payment_owner_mismatch' AS issue, pay.id, pay.owner_id AS payment_owner, t.owner_id AS tenant_owner
FROM public.payments pay
JOIN public.tenants t ON t.id = pay.tenant_id
WHERE pay.owner_id <> t.owner_id;

-- An agreement's owner_id must equal its tenant's owner_id.
SELECT 'agreement_owner_mismatch' AS issue, a.id, a.owner_id AS agreement_owner, t.owner_id AS tenant_owner
FROM public.agreements a
JOIN public.tenants t ON t.id = a.tenant_id
WHERE a.owner_id <> t.owner_id;

-- A bed's property_id must equal its room's property_id.
SELECT 'bed_property_mismatch' AS issue, b.id, b.property_id AS bed_property, r.property_id AS room_property
FROM public.beds b
JOIN public.rooms r ON r.id = b.room_id
WHERE b.property_id <> r.property_id;

-- ── Index coverage snapshot (confirms the hardening migration landed) ──
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('tenants','payments','rooms','maintenance_tickets','announcements','payment_charges')
ORDER BY tablename, indexname;

-- ================================================================
-- Expected after a clean platform + applied hardening migration:
--   * platform_admins.total >= 1
--   * every *_mismatch / *_orphan / *_missing query returns 0 rows
--   * index snapshot lists idx_tenants_owner_id, idx_payments_tenant_id, etc.
-- ================================================================

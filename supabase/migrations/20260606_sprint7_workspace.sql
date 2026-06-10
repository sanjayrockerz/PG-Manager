-- Sprint 7: Property Workspace Architecture
-- Adds normalized property_access view and workspace role column to scopes table.
-- Safe to run multiple times.

-- 1) Add access_role column to owner_user_property_scopes for explicit workspace role tracking
ALTER TABLE public.owner_user_property_scopes
  ADD COLUMN IF NOT EXISTS access_role text
    CHECK (access_role IN ('manager', 'staff'))
    DEFAULT 'staff';

-- Back-fill from profiles.role where possible
UPDATE public.owner_user_property_scopes s
SET access_role = CASE
  WHEN pr.role = 'owner_manager' THEN 'manager'
  ELSE 'staff'
END
FROM public.profiles pr
WHERE pr.id = s.user_id
  AND s.access_role IS NULL;

-- 2) Normalized property_access view
-- Unions direct ownership with scoped access so any component can query
-- "give me all properties user X can access and their role" without duplicating logic.
DROP VIEW IF EXISTS public.property_access;

CREATE VIEW public.property_access AS
SELECT
  p.id                     AS property_id,
  p.owner_id               AS user_id,
  'owner'::text            AS access_role,
  p.owner_id               AS granted_by,
  p.created_at             AS granted_at,
  p.owner_id               AS owner_id
FROM public.properties p
UNION ALL
SELECT
  s.property_id,
  s.user_id,
  COALESCE(s.access_role,
    CASE WHEN pr.role = 'owner_manager' THEN 'manager' ELSE 'staff' END
  )                        AS access_role,
  s.owner_id               AS granted_by,
  s.created_at             AS granted_at,
  s.owner_id               AS owner_id
FROM public.owner_user_property_scopes s
JOIN public.profiles pr ON pr.id = s.user_id;

-- Note: RLS on properties + owner_user_property_scopes still enforces access;
-- this view is a convenience layer for aggregating workspace metadata.

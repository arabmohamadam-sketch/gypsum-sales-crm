-- ============================================================================
-- V2 Batch 2-A.1 verification (READ-ONLY)
--
-- Run AFTER migration 20261005000038_v2_canonical_permission_contract.sql.
-- These checks do not modify data.
-- ============================================================================

-- 1. Canonical permissions exist and are active.
SELECT slug, deleted_at
FROM public.permissions
WHERE slug IN (
  'orders.regional_approve',
  'orders.sales_approve',
  'company.branding.manage'
)
ORDER BY slug;

-- 2. Legacy V2 approval permissions are no longer active.
SELECT slug, deleted_at
FROM public.permissions
WHERE slug IN (
  'orders.approve_regional',
  'orders.approve_sales'
)
ORDER BY slug;

-- 3. Canonical approval permissions are mapped to the expected V2 roles.
SELECT
  r.slug AS role_slug,
  p.slug AS permission_slug,
  rp.deleted_at AS role_permission_deleted_at
FROM public.roles r
JOIN public.role_permissions rp
  ON rp.role_id = r.id
JOIN public.permissions p
  ON p.id = rp.permission_id
WHERE r.slug IN ('company_admin', 'regional_manager', 'sales_manager')
  AND p.slug IN (
    'orders.regional_approve',
    'orders.sales_approve'
  )
ORDER BY r.slug, p.slug;

-- 4. Canonical branding permission is mapped to company_admin.
SELECT
  r.slug AS role_slug,
  p.slug AS permission_slug,
  rp.deleted_at AS role_permission_deleted_at
FROM public.roles r
JOIN public.role_permissions rp
  ON rp.role_id = r.id
JOIN public.permissions p
  ON p.id = rp.permission_id
WHERE r.slug = 'company_admin'
  AND p.slug = 'company.branding.manage';

-- 5. Generic V1 setting permission remains untouched and active.
SELECT slug, deleted_at
FROM public.permissions
WHERE slug = 'settings.write';

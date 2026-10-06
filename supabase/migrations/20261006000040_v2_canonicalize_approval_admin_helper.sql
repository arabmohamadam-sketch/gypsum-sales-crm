-- ============================================================================
-- V2 CANONICALIZE APPROVAL ADMIN HELPER
-- ============================================================================
-- Purpose:
--   Replace role-slug based approval-admin detection with the canonical
--   admin.full_access permission.
--
-- Security contract:
--   - Super Admin keeps approval-admin capability through admin.full_access.
--   - Company Admin keeps approval-admin capability through admin.full_access.
--   - Approval scope remains enforced separately by v2_user_can_approve_regional_order
--     and v2_decide_order_approval.
--   - No approval decision is based directly on roles.slug anymore.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.v2_user_is_approval_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.auth_user_has_permission('admin.full_access');
$$;

REVOKE EXECUTE
ON FUNCTION public.v2_user_is_approval_admin()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.v2_user_is_approval_admin()
TO authenticated;

COMMENT ON FUNCTION public.v2_user_is_approval_admin()
IS
  'Returns true when the authenticated user has the canonical admin.full_access permission.';

COMMIT;
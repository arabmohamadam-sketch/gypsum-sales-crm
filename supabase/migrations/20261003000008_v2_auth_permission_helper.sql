-- =============================================================================
-- V2 Migration 8
-- Restore the missing permission helper used by V2 approval RPCs
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auth_user_has_permission(
    p_permission_slug text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users AS u
        INNER JOIN public.user_roles AS ur
            ON ur.user_id = u.id
           AND ur.deleted_at IS NULL
        INNER JOIN public.roles AS r
            ON r.id = ur.role_id
           AND r.deleted_at IS NULL
           AND r.is_active = true
        INNER JOIN public.role_permissions AS rp
            ON rp.role_id = r.id
           AND rp.deleted_at IS NULL
        INNER JOIN public.permissions AS p
            ON p.id = rp.permission_id
           AND p.deleted_at IS NULL
        WHERE u.id = auth.uid()
          AND u.deleted_at IS NULL
          AND u.is_active = true
          AND (
              r.company_id = u.company_id
              OR r.company_id IS NULL
          )
          AND p.slug::text = p_permission_slug
    );
$$;

REVOKE ALL
ON FUNCTION public.auth_user_has_permission(text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.auth_user_has_permission(text)
TO authenticated;
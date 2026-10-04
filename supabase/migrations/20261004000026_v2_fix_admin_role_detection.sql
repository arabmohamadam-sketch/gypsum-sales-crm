-- ============================================================
-- V2 Migration 26
-- Fix Admin Role Detection
--
-- Problem:
--   auth_user_is_admin() identifies admins mainly by role NAME,
--   while the actual V2 company administrator role uses:
--
--       role_slug = company_admin
--       role_name = Company Admin
--
--   The same user already has:
--
--       admin.full_access
--
-- Purpose:
--   Make auth_user_is_admin() correctly recognize the existing
--   company_admin role without changing user roles or permissions.
--
-- Compatibility:
--   - Preserve previous admin name checks.
--   - Preserve system-role detection.
--   - Add company_admin slug detection.
--   - Do not modify any customer/order/region data.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.auth_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.users AS u
        INNER JOIN public.user_roles AS ur
            ON ur.user_id = u.id
           AND ur.deleted_at IS NULL
        INNER JOIN public.roles AS r
            ON r.id = ur.role_id
           AND r.is_active = true
           AND r.deleted_at IS NULL
        WHERE u.id = auth.uid()
          AND u.is_active = true
          AND u.deleted_at IS NULL
          AND (
                LOWER(r.name) IN (
                    'admin',
                    'administrator',
                    'مدیر',
                    'مدیر سیستم',
                    'مدیر کل'
                )
                OR LOWER(r.slug::text) IN (
                    'admin',
                    'administrator',
                    'company_admin'
                )
                OR r.is_system = true
          )
    );
$function$;

COMMIT;
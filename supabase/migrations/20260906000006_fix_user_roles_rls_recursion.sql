BEGIN;

-- ============================================================
-- 1) Helper: check whether the current user has a company role
--    without going through RLS policies.
-- ============================================================

CREATE OR REPLACE FUNCTION public.auth_user_has_company_role(
  p_company_id uuid,
  p_role_slug text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r
      ON r.id = ur.role_id
    JOIN public.users u
      ON u.id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.deleted_at IS NULL
      AND r.deleted_at IS NULL
      AND r.is_active = true
      AND r.slug::text = p_role_slug
      AND u.company_id = p_company_id
      AND u.deleted_at IS NULL
      AND u.is_active = true
  );
$function$;


-- ============================================================
-- 2) Helper: check whether current user may see a user-role row
--    without creating users <-> user_roles recursion.
-- ============================================================

CREATE OR REPLACE FUNCTION public.auth_user_can_view_user_role(
  p_target_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = p_target_user_id
      AND u.deleted_at IS NULL
      AND u.company_id = public.auth_user_company_id()
      AND (
        p_target_user_id = auth.uid()

        OR public.auth_user_has_company_role(
          u.company_id,
          'company_admin'
        )

        OR public.auth_user_has_company_role(
          u.company_id,
          'sales_manager'
        )
      )
  );
$function$;


-- ============================================================
-- 3) USER_ROLES SELECT
-- ============================================================

DROP POLICY IF EXISTS user_roles_select_company
  ON public.user_roles;

CREATE POLICY user_roles_select_company
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.auth_user_can_view_user_role(
      user_roles.user_id
    )
  );


-- ============================================================
-- 4) USER_ROLES ADMIN MANAGEMENT
--    Use the SECURITY DEFINER helper instead of relying on
--    another policy chain.
-- ============================================================

DROP POLICY IF EXISTS user_roles_manage_admin
  ON public.user_roles;

CREATE POLICY user_roles_manage_admin
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (
    public.auth_user_has_company_role(
      public.auth_user_company_id(),
      'company_admin'
    )
  )
  WITH CHECK (
    public.auth_user_has_company_role(
      public.auth_user_company_id(),
      'company_admin'
    )
  );


COMMIT;
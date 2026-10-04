-- ============================================================
-- V2 Migration 34
-- Sales Portfolio Management Access + CEO UI Support
--
-- Purpose:
--   1) Keep the existing Plan Area assignment history as the
--      canonical Portfolio-manager history.
--   2) Allow CEO / Company Admin / delegated Sales Manager to
--      perform Portfolio manager assignment through the UI.
--   3) Allow the CEO to read company users/roles needed by the
--      management console.
--
-- No customer, order, target or V1 data is seeded or rewritten.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. MANAGEMENT ACCESS HELPER
--
-- CEO and technical Company Admin may manage Sales Portfolios.
-- A Sales Manager may do so only when the capability is delegated.
-- plan_areas.manage is accepted for backward compatibility with
-- the existing V2 governance model.
-- ============================================================

CREATE OR REPLACE FUNCTION public.v2_can_manage_sales_portfolios()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.users AS u
        WHERE u.id = auth.uid()
          AND u.company_id = public.auth_user_company_id()
          AND u.deleted_at IS NULL
          AND u.is_active = true
          AND (
              public.auth_user_is_admin()
              OR public.v2_is_company_ceo(u.company_id)
              OR (
                  public.auth_user_has_company_role(
                      u.company_id,
                      'sales_manager'
                  )
                  AND (
                      public.v2_has_management_capability(
                          'sales_portfolios.manage'
                      )
                      OR public.v2_has_management_capability(
                          'plan_areas.manage'
                      )
                  )
              )
          )
    );
$function$;

REVOKE ALL
ON FUNCTION public.v2_can_manage_sales_portfolios()
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.v2_can_manage_sales_portfolios()
TO authenticated;

-- ============================================================
-- 2. CEO READ ACCESS TO COMPANY USERS / ROLES
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
        FROM public.users AS u
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
              OR public.v2_is_company_ceo(
                  u.company_id
              )
          )
    );
$function$;

REVOKE ALL
ON FUNCTION public.auth_user_can_view_user_role(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.auth_user_can_view_user_role(uuid)
TO authenticated;

DROP POLICY IF EXISTS users_select_scoped
ON public.users;

CREATE POLICY users_select_scoped
ON public.users
FOR SELECT
TO authenticated
USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND (
        id = auth.uid()
        OR public.auth_user_is_admin()
        OR public.v2_is_company_ceo(company_id)
        OR EXISTS (
            SELECT 1
            FROM public.user_roles AS ur
            INNER JOIN public.roles AS r
                ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid()
              AND ur.deleted_at IS NULL
              AND r.deleted_at IS NULL
              AND r.company_id = public.auth_user_company_id()
              AND r.slug IN (
                  'company_admin',
                  'sales_manager'
              )
              AND r.is_active = true
        )
    )
);

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
-- 3. HARDEN EXISTING PORTFOLIO ASSIGNMENT RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.v2_assign_plan_area_manager(
    p_plan_area_id uuid,
    p_manager_user_id uuid,
    p_effective_from date,
    p_reason text
)
RETURNS public.v2_plan_area_manager_assignment_history
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_company_id uuid;

    v_area_company_id uuid;
    v_area_type text;
    v_sales_portfolio_id uuid;

    v_manager_company_id uuid;
    v_manager_active boolean;
    v_manager_has_valid_role boolean;

    v_current_history_id uuid;
    v_current_manager_id uuid;
    v_current_effective_from date;

    v_result public.v2_plan_area_manager_assignment_history;
BEGIN

    -- ========================================================
    -- Authentication
    -- ========================================================

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required.';
    END IF;

    v_company_id := public.auth_user_company_id();

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION
            'Active company context is required.';
    END IF;

    -- ========================================================
    -- Input
    -- ========================================================

    IF p_effective_from IS NULL THEN
        RAISE EXCEPTION
            'Effective date is required.';
    END IF;

    IF p_reason IS NULL
       OR btrim(p_reason) = ''
    THEN
        RAISE EXCEPTION
            'A reason is required.';
    END IF;

    -- ========================================================
    -- Authorization
    -- ========================================================

    IF NOT public.v2_can_manage_sales_portfolios() THEN

        RAISE EXCEPTION
            'User is not authorized to manage Sales Portfolio assignments.';

    END IF;

    -- ========================================================
    -- Serialize Plan Area assignment
    -- ========================================================

    PERFORM pg_advisory_xact_lock(
        hashtextextended(
            p_plan_area_id::text,
            0
        )
    );

    -- ========================================================
    -- Validate Plan Area
    -- ========================================================

    SELECT
        pa.company_id,
        pa.area_type,
        pa.sales_portfolio_id
    INTO
        v_area_company_id,
        v_area_type,
        v_sales_portfolio_id
    FROM public.v2_plan_areas AS pa
    WHERE pa.id = p_plan_area_id
      AND pa.deleted_at IS NULL
      AND pa.is_active = true
    FOR UPDATE;

    IF v_area_company_id IS NULL THEN
        RAISE EXCEPTION
            'Plan Area does not exist.';
    END IF;

    IF v_area_company_id <> v_company_id THEN
        RAISE EXCEPTION
            'Plan Area must belong to the current company.';
    END IF;

    IF v_area_type <> 'portfolio' THEN
        RAISE EXCEPTION
            'Only Portfolio Plan Areas can use explicit manager assignment.';
    END IF;

    IF v_sales_portfolio_id IS NULL THEN
        RAISE EXCEPTION
            'Selected Portfolio Plan Area is not linked to a Sales Portfolio.';
    END IF;

    -- ========================================================
    -- Validate target manager
    -- ========================================================

    SELECT
        u.company_id,
        u.is_active
    INTO
        v_manager_company_id,
        v_manager_active
    FROM public.users AS u
    WHERE u.id = p_manager_user_id
      AND u.deleted_at IS NULL
    LIMIT 1;

    IF v_manager_company_id IS NULL THEN
        RAISE EXCEPTION
            'Selected Plan Area manager does not exist.';
    END IF;

    IF v_manager_company_id <> v_company_id THEN
        RAISE EXCEPTION
            'Selected Plan Area manager must belong to the same company.';
    END IF;

    IF v_manager_active IS DISTINCT FROM true THEN
        RAISE EXCEPTION
            'Selected Plan Area manager is inactive.';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles AS ur
        INNER JOIN public.roles AS r
            ON r.id = ur.role_id
           AND (
                r.company_id = v_company_id
                OR r.company_id IS NULL
           )
           AND r.deleted_at IS NULL
           AND r.is_active = true
        WHERE ur.user_id = p_manager_user_id
          AND ur.deleted_at IS NULL
          AND r.slug::text IN (
              'sales_manager',
              'regional_manager'
          )
    )
    INTO v_manager_has_valid_role;

    IF NOT v_manager_has_valid_role THEN
        RAISE EXCEPTION
            'Selected Plan Area manager must be a Sales Manager or Regional Manager.';
    END IF;

    -- ========================================================
    -- Current assignment
    -- ========================================================

    SELECT
        h.id,
        h.manager_user_id,
        h.effective_from
    INTO
        v_current_history_id,
        v_current_manager_id,
        v_current_effective_from
    FROM public.v2_plan_area_manager_assignment_history AS h
    WHERE h.company_id = v_company_id
      AND h.plan_area_id = p_plan_area_id
      AND h.effective_to IS NULL
    ORDER BY
        h.effective_from DESC,
        h.created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_current_history_id IS NOT NULL
       AND v_current_manager_id = p_manager_user_id
    THEN
        RAISE EXCEPTION
            'Plan Area is already assigned to the selected manager.';
    END IF;

    IF v_current_history_id IS NOT NULL
       AND p_effective_from <= v_current_effective_from
    THEN
        RAISE EXCEPTION
            'New effective date must be after the current assignment start date.';
    END IF;

    -- ========================================================
    -- Close previous assignment
    -- ========================================================

    IF v_current_history_id IS NOT NULL THEN

        UPDATE public.v2_plan_area_manager_assignment_history
        SET
            effective_to = p_effective_from - 1,
            ended_by = auth.uid(),
            ended_at = timezone('utc'::text, now()),
            end_reason = btrim(p_reason),
            updated_at = timezone('utc'::text, now())
        WHERE id = v_current_history_id;

    END IF;

    -- ========================================================
    -- Create new assignment
    -- ========================================================

    INSERT INTO public.v2_plan_area_manager_assignment_history (
        company_id,
        plan_area_id,
        manager_user_id,
        effective_from,
        effective_to,
        assigned_by,
        assigned_at,
        assignment_reason
    )
    VALUES (
        v_company_id,
        p_plan_area_id,
        p_manager_user_id,
        p_effective_from,
        NULL,
        auth.uid(),
        timezone('utc'::text, now()),
        btrim(p_reason)
    )
    RETURNING *
    INTO v_result;

    -- ========================================================
    -- Move portfolio-based customers
    --
    -- fixed customers remain where they are.
    -- ========================================================

    PERFORM set_config(
        'app.v2_customer_plan_assignment_authorized',
        'true',
        true
    );

    WITH moved_customers AS MATERIALIZED (
        SELECT
            c.id AS customer_id,
            c.plan_owner_user_id AS old_plan_owner_user_id,
            c.plan_area_id AS old_plan_area_id,
            c.regional_manager_id AS old_regional_manager_id,
            c.plan_scope AS old_plan_scope,
            c.plan_region_id AS old_plan_region_id,
            c.ownership_mode AS old_ownership_mode
        FROM public.customers AS c
        WHERE c.company_id = v_company_id
          AND c.plan_area_id = p_plan_area_id
          AND c.ownership_mode = 'portfolio_based'
          AND c.deleted_at IS NULL
          AND c.plan_owner_user_id IS DISTINCT FROM p_manager_user_id
    ),

    updated_customers AS (
        UPDATE public.customers AS c
        SET
            plan_owner_user_id = p_manager_user_id,
            plan_area_id = p_plan_area_id,
            ownership_mode = 'portfolio_based',
            plan_scope = 'portfolio',
            plan_region_id = NULL,
            regional_manager_id = NULL,
            updated_at = timezone('utc'::text, now())
        FROM moved_customers AS m
        WHERE c.id = m.customer_id
        RETURNING c.id
    )

    INSERT INTO public.v2_customer_plan_assignment_history (
        company_id,
        customer_id,

        old_ownership_mode,
        new_ownership_mode,

        old_regional_manager_id,
        new_regional_manager_id,

        old_plan_scope,
        new_plan_scope,

        old_plan_region_id,
        new_plan_region_id,

        old_plan_owner_user_id,
        new_plan_owner_user_id,

        old_plan_area_id,
        new_plan_area_id,

        changed_by,
        changed_at,
        reason
    )
    SELECT
        v_company_id,
        m.customer_id,

        m.old_ownership_mode,
        'portfolio_based',

        m.old_regional_manager_id,
        NULL,

        m.old_plan_scope,
        'portfolio',

        m.old_plan_region_id,
        NULL,

        m.old_plan_owner_user_id,
        p_manager_user_id,

        m.old_plan_area_id,
        p_plan_area_id,

        auth.uid(),
        timezone('utc'::text, now()),

        'انتقال خودکار مالک مشتری به همراه واگذاری سبد برنامه: '
            || btrim(p_reason)

    FROM moved_customers AS m
    INNER JOIN updated_customers AS u
        ON u.id = m.customer_id;

    RETURN v_result;

END;
$function$;


REVOKE ALL
ON FUNCTION public.v2_assign_plan_area_manager(
    uuid,
    uuid,
    date,
    text
)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.v2_assign_plan_area_manager(
    uuid,
    uuid,
    date,
    text
)
TO authenticated;

-- ============================================================
-- 4. VALIDATION
-- ============================================================

DO $$
DECLARE
    v_capability_exists boolean;
    v_portfolio_count integer;
    v_unlinked_portfolio_areas integer;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.v2_management_capabilities
        WHERE capability = 'sales_portfolios.manage'
          AND is_active = true
    )
    INTO v_capability_exists;

    IF NOT v_capability_exists THEN
        RAISE EXCEPTION
            'sales_portfolios.manage capability is missing.'
            USING ERRCODE = 'P0001';
    END IF;

    SELECT COUNT(*)
    INTO v_portfolio_count
    FROM public.v2_sales_portfolios
    WHERE company_id = '11111111-1111-1111-1111-111111111111'::uuid
      AND deleted_at IS NULL;

    SELECT COUNT(*)
    INTO v_unlinked_portfolio_areas
    FROM public.v2_plan_areas
    WHERE company_id = '11111111-1111-1111-1111-111111111111'::uuid
      AND area_type = 'portfolio'
      AND deleted_at IS NULL
      AND sales_portfolio_id IS NULL;

    IF v_portfolio_count <> 13 THEN
        RAISE EXCEPTION
            'Expected 13 active Sales Portfolios, found %.'
            , v_portfolio_count
            USING ERRCODE = 'P0001';
    END IF;

    IF v_unlinked_portfolio_areas <> 0 THEN
        RAISE EXCEPTION
            '% active Portfolio Plan Areas are not linked to a Sales Portfolio.'
            , v_unlinked_portfolio_areas
            USING ERRCODE = 'P0001';
    END IF;
END;
$$;

COMMIT;

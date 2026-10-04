-- ============================================================
-- V2 Migration 31
-- Fix Monthly Target Region Ownership Lookup
--
-- Fix:
--   v2_region_manager_assignment_history uses:
--       regional_manager_id
--
--   Migration 30 incorrectly referenced:
--       manager_user_id
--
-- This migration replaces only the affected function.
--
-- No V1 tables are modified.
-- No customer/order data is modified.
-- No existing V2 target data is modified.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.v2_upsert_monthly_target(
    p_plan_area_id uuid,
    p_manager_user_id uuid,
    p_period_year smallint,
    p_period_month smallint,
    p_target_tonnage numeric,
    p_notes text,
    p_reason text
)
RETURNS public.v2_monthly_targets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_company_id uuid;

    v_plan_area public.v2_plan_areas;

    v_manager_company_id uuid;
    v_manager_active boolean;

    v_area_assignment_valid boolean;

    v_period_start date;
    v_period_end date;
    v_jalali_year smallint;
    v_jalali_month smallint;

    v_existing public.v2_monthly_targets;
    v_result public.v2_monthly_targets;

    v_action text;
BEGIN

    -- ========================================================
    -- 1. Authentication / company context
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
    -- 2. Input validation
    -- ========================================================

    IF p_plan_area_id IS NULL THEN
        RAISE EXCEPTION
            'Plan Area is required.';
    END IF;

    IF p_manager_user_id IS NULL THEN
        RAISE EXCEPTION
            'Target manager is required.';
    END IF;

    IF p_period_year NOT BETWEEN 2020 AND 2100 THEN
        RAISE EXCEPTION
            'Invalid target period year.';
    END IF;

    IF p_period_month NOT BETWEEN 1 AND 12 THEN
        RAISE EXCEPTION
            'Invalid target period month.';
    END IF;

    IF p_target_tonnage IS NULL
       OR p_target_tonnage < 0
    THEN
        RAISE EXCEPTION
            'Target tonnage must be zero or greater.';
    END IF;

    IF p_reason IS NULL
       OR btrim(p_reason) = ''
    THEN
        RAISE EXCEPTION
            'A reason is required when creating or editing a target.';
    END IF;

    -- ========================================================
    -- 3. Authorization
    --
    -- CEO:
    --   always allowed.
    --
    -- Sales Manager:
    --   requires delegated targets.manage.
    -- ========================================================

    IF NOT (
        public.v2_is_company_ceo(v_company_id)
        OR (
            public.auth_user_has_company_role(
                v_company_id,
                'sales_manager'
            )
            AND public.v2_has_management_capability(
                'targets.manage'
            )
        )
    ) THEN

        RAISE EXCEPTION
            'User is not authorized to manage monthly targets.';

    END IF;

    -- ========================================================
    -- 4. Resolve project period
    --
    -- Existing helper expects smallint parameters.
    -- ========================================================

    SELECT
        p.start_date,
        p.end_date,
        p.jalali_year,
        p.jalali_month
    INTO
        v_period_start,
        v_period_end,
        v_jalali_year,
        v_jalali_month
    FROM public.get_jalali_period_bounds_from_gregorian_key(
        p_period_year,
        p_period_month
    ) AS p;

    IF v_period_start IS NULL
       OR v_period_end IS NULL
    THEN
        RAISE EXCEPTION
            'Target period could not be resolved.';
    END IF;

    -- ========================================================
    -- 5. Lock and validate Plan Area
    -- ========================================================

    SELECT *
    INTO v_plan_area
    FROM public.v2_plan_areas AS pa
    WHERE pa.id = p_plan_area_id
      AND pa.company_id = v_company_id
      AND pa.deleted_at IS NULL
      AND pa.is_active = true
    FOR UPDATE;

    IF v_plan_area.id IS NULL THEN
        RAISE EXCEPTION
            'Plan Area does not exist or is inactive.';
    END IF;

    -- ========================================================
    -- 6. Validate target manager
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
            'Target manager does not exist.';
    END IF;

    IF v_manager_company_id <> v_company_id THEN
        RAISE EXCEPTION
            'Target manager must belong to the same company.';
    END IF;

    IF v_manager_active IS DISTINCT FROM true THEN
        RAISE EXCEPTION
            'Target manager is inactive.';
    END IF;

    IF NOT public.v2_user_is_plan_manager(
        v_company_id,
        p_manager_user_id
    ) THEN
        RAISE EXCEPTION
            'Target manager must be a Sales Manager or Regional Manager.';
    END IF;

    -- ========================================================
    -- 7. Validate Plan Area ownership at the START of period
    --
    -- IMPORTANT:
    --
    -- Regional assignment history column is:
    --     regional_manager_id
    --
    -- NOT:
    --     manager_user_id
    --
    -- This is the bug fixed by Migration 31.
    -- ========================================================

    IF v_plan_area.area_type = 'regional' THEN

        IF v_plan_area.region_id IS NULL THEN
            RAISE EXCEPTION
                'Regional Plan Area has no region.';
        END IF;

        -- Regional Plan Areas require a Regional Manager.
        IF NOT EXISTS (
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
              AND r.slug::text = 'regional_manager'
        ) THEN

            RAISE EXCEPTION
                'Regional Plan Area targets require a Regional Manager.';

        END IF;

        SELECT EXISTS (
            SELECT 1
            FROM public.v2_region_manager_assignment_history AS h
            WHERE h.company_id = v_company_id
              AND h.region_id = v_plan_area.region_id
              AND h.regional_manager_id = p_manager_user_id
              AND h.effective_from <= v_period_start
              AND (
                    h.effective_to IS NULL
                    OR h.effective_to >= v_period_start
                  )
        )
        INTO v_area_assignment_valid;

        IF NOT v_area_assignment_valid THEN

            RAISE EXCEPTION
                'Selected Regional Manager did not own the region at the start of the target period.';

        END IF;

    ELSIF v_plan_area.area_type = 'portfolio' THEN

        -- Portfolio ownership is resolved through
        -- v2_plan_area_manager_assignment_history, where the
        -- column IS manager_user_id.

        SELECT EXISTS (
            SELECT 1
            FROM public.v2_plan_area_manager_assignment_history AS h
            WHERE h.company_id = v_company_id
              AND h.plan_area_id = v_plan_area.id
              AND h.manager_user_id = p_manager_user_id
              AND h.effective_from <= v_period_start
              AND (
                    h.effective_to IS NULL
                    OR h.effective_to >= v_period_start
                  )
        )
        INTO v_area_assignment_valid;

        IF NOT v_area_assignment_valid THEN

            RAISE EXCEPTION
                'Selected manager did not own the Portfolio Plan Area at the start of the target period.';

        END IF;

    ELSE

        RAISE EXCEPTION
            'Unsupported Plan Area type.';

    END IF;

    -- ========================================================
    -- 8. Serialize the logical Target key
    --
    -- Prevent duplicate creation from simultaneous devices.
    -- ========================================================

    PERFORM pg_advisory_xact_lock(
        hashtextextended(
            concat_ws(
                ':',
                p_plan_area_id::text,
                p_manager_user_id::text,
                p_period_year::text,
                p_period_month::text
            ),
            0
        )
    );

    -- ========================================================
    -- 9. Find existing active Target
    -- ========================================================

    SELECT *
    INTO v_existing
    FROM public.v2_monthly_targets AS t
    WHERE t.company_id = v_company_id
      AND t.plan_area_id = p_plan_area_id
      AND t.manager_user_id = p_manager_user_id
      AND t.period_year = p_period_year
      AND t.period_month = p_period_month
      AND t.deleted_at IS NULL
    FOR UPDATE;

    -- ========================================================
    -- 10. CREATE
    -- ========================================================

    IF v_existing.id IS NULL THEN

        INSERT INTO public.v2_monthly_targets (
            company_id,
            plan_area_id,
            manager_user_id,
            period_year,
            period_month,
            target_tonnage,
            notes,
            created_by,
            updated_by
        )
        VALUES (
            v_company_id,
            p_plan_area_id,
            p_manager_user_id,
            p_period_year,
            p_period_month,
            p_target_tonnage,
            p_notes,
            auth.uid(),
            auth.uid()
        )
        RETURNING *
        INTO v_result;

        v_action := 'created';

        INSERT INTO public.v2_monthly_target_history (
            company_id,
            target_id,
            plan_area_id,
            manager_user_id,
            period_year,
            period_month,
            action,
            old_target_tonnage,
            new_target_tonnage,
            old_notes,
            new_notes,
            changed_by,
            reason
        )
        VALUES (
            v_company_id,
            v_result.id,
            p_plan_area_id,
            p_manager_user_id,
            p_period_year,
            p_period_month,
            v_action,
            NULL,
            p_target_tonnage,
            NULL,
            p_notes,
            auth.uid(),
            btrim(p_reason)
        );

        RETURN v_result;

    END IF;

    -- ========================================================
    -- 11. UPDATE
    -- ========================================================

    UPDATE public.v2_monthly_targets
    SET
        target_tonnage = p_target_tonnage,
        notes = p_notes,
        updated_by = auth.uid(),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_existing.id
    RETURNING *
    INTO v_result;

    v_action := 'updated';

    INSERT INTO public.v2_monthly_target_history (
        company_id,
        target_id,
        plan_area_id,
        manager_user_id,
        period_year,
        period_month,
        action,
        old_target_tonnage,
        new_target_tonnage,
        old_notes,
        new_notes,
        changed_by,
        reason
    )
    VALUES (
        v_company_id,
        v_result.id,
        p_plan_area_id,
        p_manager_user_id,
        p_period_year,
        p_period_month,
        v_action,
        v_existing.target_tonnage,
        v_result.target_tonnage,
        v_existing.notes,
        v_result.notes,
        auth.uid(),
        btrim(p_reason)
    );

    RETURN v_result;

END;
$function$;

REVOKE ALL
ON FUNCTION public.v2_upsert_monthly_target(
    uuid,
    uuid,
    smallint,
    smallint,
    numeric,
    text,
    text
)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.v2_upsert_monthly_target(
    uuid,
    uuid,
    smallint,
    smallint,
    numeric,
    text,
    text
)
TO authenticated;

COMMENT ON FUNCTION public.v2_upsert_monthly_target(
    uuid,
    uuid,
    smallint,
    smallint,
    numeric,
    text,
    text
)
IS
    'Create or update a V2 monthly target with authorization, Jalali period validation, historical Plan Area ownership validation and audit history.';

COMMIT;
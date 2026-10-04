BEGIN;

-- ============================================================
-- V2 Region Reassignment RPC
--
-- This migration creates the controlled operation for changing
-- the active Regional Manager of a Region.
--
-- Rules:
--
-- 1. Authorized actor:
--      - CEO
--      - Sales Manager with regions.reassign delegated capability
--
-- 2. Reassignment is effective immediately when the supplied
--    effective date is today or an earlier date.
--
-- 3. The Region gets exactly one active manager.
--
-- 4. Existing V1 user_regions is updated to keep current V1
--    behavior compatible.
--
-- 5. V2 history records the previous and new ownership.
--
-- 6. Customers with:
--      ownership_mode = 'region_based'
--      and plan_region_id = the reassigned Region
--    automatically move to the new Regional Manager.
--
-- 7. Customers with ownership_mode = 'fixed' are NOT moved.
--
-- 8. Existing Orders are NOT rewritten.
--    Their V2 owner/plan snapshots remain unchanged.
--
-- 9. Every moved customer receives an ownership history record.
--
-- 10. Operation is atomic and serialized per Region.
-- ============================================================


CREATE OR REPLACE FUNCTION public.v2_reassign_region(
    p_region_id uuid,
    p_new_manager_id uuid,
    p_effective_from date,
    p_reason text
)
RETURNS public.v2_region_manager_assignment_history
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_company_id uuid;

    v_current_manager_id uuid;
    v_current_history_id uuid;
    v_current_effective_from date;

    v_region_company_id uuid;

    v_new_manager_company_id uuid;
    v_new_manager_active boolean;
    v_new_manager_has_role boolean;

    v_has_authority boolean;

    v_result public.v2_region_manager_assignment_history;
BEGIN

    -- --------------------------------------------------------
    -- Authentication / company
    -- --------------------------------------------------------

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required.';
    END IF;


    v_company_id := public.auth_user_company_id();

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION
            'Active company context is required.';
    END IF;


    -- --------------------------------------------------------
    -- Basic validation
    -- --------------------------------------------------------

    IF p_region_id IS NULL THEN
        RAISE EXCEPTION
            'Region is required.';
    END IF;


    IF p_new_manager_id IS NULL THEN
        RAISE EXCEPTION
            'New Regional Manager is required.';
    END IF;


    IF p_effective_from IS NULL THEN
        RAISE EXCEPTION
            'Effective date is required.';
    END IF;


    IF p_effective_from > CURRENT_DATE THEN
        RAISE EXCEPTION
            'Future-dated region reassignment is not supported yet.';
    END IF;


    IF p_reason IS NULL
       OR btrim(p_reason) = ''
    THEN
        RAISE EXCEPTION
            'A reason is required for region reassignment.';
    END IF;


    -- --------------------------------------------------------
    -- Authorization
    --
    -- CEO:
    --   always authorized.
    --
    -- Sales Manager:
    --   only when regions.reassign was explicitly delegated.
    -- --------------------------------------------------------

    v_has_authority :=
        public.v2_is_company_ceo(v_company_id)
        OR (
            public.auth_user_has_company_role(
                v_company_id,
                'sales_manager'
            )
            AND public.v2_has_management_capability(
                'regions.reassign'
            )
        );


    IF NOT v_has_authority THEN
        RAISE EXCEPTION
            'User is not authorized to reassign regions.';
    END IF;


    -- --------------------------------------------------------
    -- Serialize all operations for this Region.
    --
    -- This prevents two authorized devices/users from
    -- simultaneously changing the active manager.
    -- --------------------------------------------------------

    PERFORM pg_advisory_xact_lock(
        hashtextextended(
            p_region_id::text,
            0
        )
    );


    -- --------------------------------------------------------
    -- Validate Region
    -- --------------------------------------------------------

    SELECT
        r.company_id
    INTO
        v_region_company_id
    FROM public.regions AS r
    WHERE r.id = p_region_id
      AND r.deleted_at IS NULL
    LIMIT 1
    FOR UPDATE;


    IF v_region_company_id IS NULL THEN
        RAISE EXCEPTION
            'Region does not exist.';
    END IF;


    IF v_region_company_id <> v_company_id THEN
        RAISE EXCEPTION
            'Region does not belong to the current company.';
    END IF;


    -- --------------------------------------------------------
    -- Validate new Regional Manager
    -- --------------------------------------------------------

    SELECT
        u.company_id,
        u.is_active
    INTO
        v_new_manager_company_id,
        v_new_manager_active
    FROM public.users AS u
    WHERE u.id = p_new_manager_id
      AND u.deleted_at IS NULL
    LIMIT 1;


    IF v_new_manager_company_id IS NULL THEN
        RAISE EXCEPTION
            'Selected Regional Manager does not exist.';
    END IF;


    IF v_new_manager_company_id <> v_company_id THEN
        RAISE EXCEPTION
            'Selected Regional Manager must belong to the same company.';
    END IF;


    IF v_new_manager_active IS DISTINCT FROM true THEN
        RAISE EXCEPTION
            'Selected Regional Manager is inactive.';
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
        WHERE ur.user_id = p_new_manager_id
          AND ur.deleted_at IS NULL
          AND r.slug::text = 'regional_manager'
    )
    INTO v_new_manager_has_role;


    IF NOT v_new_manager_has_role THEN
        RAISE EXCEPTION
            'Selected user does not have the regional_manager role.';
    END IF;


    -- --------------------------------------------------------
    -- Find exactly one active V2 Region assignment.
    -- Migration 21 established the baseline.
    -- --------------------------------------------------------

    SELECT
        h.id,
        h.regional_manager_id,
        h.effective_from
    INTO
        v_current_history_id,
        v_current_manager_id,
        v_current_effective_from
    FROM public.v2_region_manager_assignment_history AS h
    WHERE h.company_id = v_company_id
      AND h.region_id = p_region_id
      AND h.effective_to IS NULL
    ORDER BY
        h.effective_from DESC,
        h.created_at DESC
    LIMIT 1
    FOR UPDATE;


    IF v_current_history_id IS NULL THEN
        RAISE EXCEPTION
            'Region has no active V2 manager assignment.';
    END IF;


    IF v_current_manager_id = p_new_manager_id THEN
        RAISE EXCEPTION
            'Region is already assigned to the selected Regional Manager.';
    END IF;


    -- --------------------------------------------------------
    -- The new assignment cannot start before the existing
    -- assignment began.
    -- --------------------------------------------------------

    IF p_effective_from <= v_current_effective_from THEN
        RAISE EXCEPTION
            'New effective date must be after the current assignment start date.';
    END IF;


    -- --------------------------------------------------------
    -- Close previous V2 assignment history.
    -- --------------------------------------------------------

    UPDATE public.v2_region_manager_assignment_history
    SET
        effective_to = p_effective_from - 1,
        ended_by = auth.uid(),
        ended_at = timezone('utc'::text, now()),
        end_reason = btrim(p_reason),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_current_history_id;


    -- --------------------------------------------------------
    -- Close any active V1-compatible assignment for this Region.
    --
    -- V1 continues to use user_regions as a current-assignment
    -- table; V2 keeps the proper history separately.
    -- --------------------------------------------------------

    UPDATE public.user_regions
    SET
        deleted_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE company_id = v_company_id
      AND region_id = p_region_id
      AND deleted_at IS NULL;


    -- --------------------------------------------------------
    -- Create new active V1-compatible assignment.
    -- --------------------------------------------------------

    INSERT INTO public.user_regions (
        company_id,
        user_id,
        region_id,
        assigned_by,
        assigned_at,
        created_at,
        updated_at
    )
    VALUES (
        v_company_id,
        p_new_manager_id,
        p_region_id,
        auth.uid(),
        timezone('utc'::text, now()),
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    );


    -- --------------------------------------------------------
    -- Create new active V2 history row.
    -- --------------------------------------------------------

    INSERT INTO public.v2_region_manager_assignment_history (
        company_id,
        region_id,
        regional_manager_id,
        effective_from,
        effective_to,
        assigned_by,
        assigned_at,
        assignment_reason
    )
    VALUES (
        v_company_id,
        p_region_id,
        p_new_manager_id,
        p_effective_from,
        NULL,
        auth.uid(),
        timezone('utc'::text, now()),
        btrim(p_reason)
    )
    RETURNING *
    INTO v_result;


    -- --------------------------------------------------------
    -- Move region-based customers atomically.
    --
    -- Fixed customers are deliberately excluded.
    --
    -- The MATERIALIZED CTE preserves the old ownership values
    -- for audit history before the UPDATE changes them.
    -- --------------------------------------------------------

    PERFORM set_config(
        'app.v2_customer_plan_assignment_authorized',
        'true',
        true
    );


    WITH moved_customers AS MATERIALIZED (
        SELECT
            c.id AS customer_id,
            c.regional_manager_id AS old_regional_manager_id,
            c.plan_scope AS old_plan_scope,
            c.plan_region_id AS old_plan_region_id,
            c.ownership_mode AS old_ownership_mode
        FROM public.customers AS c
        WHERE c.company_id = v_company_id
          AND c.plan_region_id = p_region_id
          AND c.ownership_mode = 'region_based'
          AND c.deleted_at IS NULL
          AND c.regional_manager_id IS DISTINCT FROM p_new_manager_id
    ),

    updated_customers AS (
        UPDATE public.customers AS c
        SET
            regional_manager_id = p_new_manager_id,
            ownership_mode = 'region_based',
            plan_scope = 'regional',
            plan_region_id = p_region_id,
            updated_at = timezone('utc'::text, now())
        FROM moved_customers AS m
        WHERE c.id = m.customer_id
        RETURNING c.id
    )

    INSERT INTO public.v2_customer_plan_assignment_history (
        company_id,
        customer_id,

        old_regional_manager_id,
        new_regional_manager_id,

        old_plan_scope,
        new_plan_scope,

        old_plan_region_id,
        new_plan_region_id,

        changed_by,
        changed_at,
        reason
    )
    SELECT
        v_company_id,
        m.customer_id,

        m.old_regional_manager_id,
        p_new_manager_id,

        m.old_plan_scope,
        'regional',

        m.old_plan_region_id,
        p_region_id,

        auth.uid(),
        timezone('utc'::text, now()),

        'انتقال خودکار مالک مشتری به همراه واگذاری منطقه: '
            || btrim(p_reason)

    FROM moved_customers AS m

    INNER JOIN updated_customers AS u
        ON u.id = m.customer_id;


    RETURN v_result;
END;
$function$;


-- ============================================================
-- Function permissions
-- ============================================================

REVOKE ALL
ON FUNCTION public.v2_reassign_region(
    uuid,
    uuid,
    date,
    text
)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.v2_reassign_region(
    uuid,
    uuid,
    date,
    text
)
TO authenticated;


COMMIT;

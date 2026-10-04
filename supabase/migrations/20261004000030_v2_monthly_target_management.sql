-- ============================================================
-- V2 Migration 30
-- Monthly Target Management
--
-- Purpose:
--   1. Allow V2 monthly targets to be zero or greater.
--   2. Add immutable target history.
--   3. Add a controlled upsert RPC for monthly targets.
--   4. Add a controlled soft-delete RPC for monthly targets.
--   5. Validate target manager against the Plan Area ownership
--      at the START of the target period.
--   6. Preserve historical targets after later ownership changes.
--
-- IMPORTANT:
--   - V1 monthly_targets is untouched.
--   - V1 reporting functions are untouched.
--   - Customers are untouched.
--   - Orders are untouched.
--   - Regions are untouched.
--   - Target history is never hard-deleted.
--
-- BUSINESS RULE
--
-- Regional Plan Area:
--   manager must be the Regional Manager assigned to the region
--   at the start of the target period.
--
-- Portfolio Plan Area:
--   manager must be the active manager assigned to that Portfolio
--   at the start of the target period.
--
-- Target amount:
--   >= 0
--
-- Therefore:
--   صادرات چین = 0
-- is valid.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ALLOW ZERO TARGET
-- ============================================================

ALTER TABLE public.v2_monthly_targets
    DROP CONSTRAINT IF EXISTS v2_monthly_targets_tonnage_positive;

ALTER TABLE public.v2_monthly_targets
    ADD CONSTRAINT v2_monthly_targets_tonnage_nonnegative
    CHECK (
        target_tonnage >= 0
    );

-- ============================================================
-- 2. MONTHLY TARGET HISTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS public.v2_monthly_target_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id uuid NOT NULL,

    target_id uuid,

    plan_area_id uuid NOT NULL,

    manager_user_id uuid NOT NULL,

    period_year smallint NOT NULL,
    period_month smallint NOT NULL,

    action text NOT NULL,

    old_target_tonnage numeric(14, 4),
    new_target_tonnage numeric(14, 4),

    old_notes text,
    new_notes text,

    changed_by uuid NOT NULL,

    changed_at timestamptz NOT NULL
        DEFAULT timezone('utc'::text, now()),

    reason text NOT NULL,

    created_at timestamptz NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT fk_v2_monthly_target_history_company
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id),

    CONSTRAINT fk_v2_monthly_target_history_target
        FOREIGN KEY (target_id)
        REFERENCES public.v2_monthly_targets(id),

    CONSTRAINT fk_v2_monthly_target_history_plan_area
        FOREIGN KEY (plan_area_id)
        REFERENCES public.v2_plan_areas(id),

    CONSTRAINT fk_v2_monthly_target_history_manager
        FOREIGN KEY (manager_user_id)
        REFERENCES public.users(id),

    CONSTRAINT fk_v2_monthly_target_history_changed_by
        FOREIGN KEY (changed_by)
        REFERENCES public.users(id),

    CONSTRAINT v2_monthly_target_history_action_check
        CHECK (
            action IN (
                'created',
                'updated',
                'deleted'
            )
        ),

    CONSTRAINT v2_monthly_target_history_reason_check
        CHECK (
            btrim(reason) <> ''
        ),

    CONSTRAINT v2_monthly_target_history_old_tonnage_check
        CHECK (
            old_target_tonnage IS NULL
            OR old_target_tonnage >= 0
        ),

    CONSTRAINT v2_monthly_target_history_new_tonnage_check
        CHECK (
            new_target_tonnage IS NULL
            OR new_target_tonnage >= 0
        )
);

CREATE INDEX IF NOT EXISTS idx_v2_monthly_target_history_target
ON public.v2_monthly_target_history(
    company_id,
    target_id,
    changed_at DESC
);

CREATE INDEX IF NOT EXISTS idx_v2_monthly_target_history_period
ON public.v2_monthly_target_history(
    company_id,
    period_year,
    period_month,
    changed_at DESC
);

CREATE INDEX IF NOT EXISTS idx_v2_monthly_target_history_manager
ON public.v2_monthly_target_history(
    company_id,
    manager_user_id,
    period_year,
    period_month
);

ALTER TABLE public.v2_monthly_target_history
    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v2_monthly_target_history_select
    ON public.v2_monthly_target_history;

CREATE POLICY v2_monthly_target_history_select
ON public.v2_monthly_target_history
FOR SELECT
TO authenticated
USING (
    company_id = public.auth_user_company_id()
    AND (
        public.auth_user_is_admin()
        OR public.v2_is_company_ceo(company_id)
        OR manager_user_id = auth.uid()
        OR public.auth_user_has_company_role(
            company_id,
            'sales_manager'
        )
    )
);

DROP TRIGGER IF EXISTS trg_v2_monthly_target_history_prevent_hard_delete
    ON public.v2_monthly_target_history;

CREATE TRIGGER trg_v2_monthly_target_history_prevent_hard_delete
BEFORE DELETE
ON public.v2_monthly_target_history
FOR EACH ROW
EXECUTE FUNCTION public.prevent_hard_delete();

-- ============================================================
-- 3. HELPER:
--    Validate that a manager has the expected management role.
-- ============================================================

CREATE OR REPLACE FUNCTION public.v2_user_is_plan_manager(
    p_company_id uuid,
    p_user_id uuid
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
        INNER JOIN public.user_roles AS ur
            ON ur.user_id = u.id
           AND ur.deleted_at IS NULL
        INNER JOIN public.roles AS r
            ON r.id = ur.role_id
           AND (
                r.company_id = p_company_id
                OR r.company_id IS NULL
           )
           AND r.deleted_at IS NULL
           AND r.is_active = true
        WHERE u.id = p_user_id
          AND u.company_id = p_company_id
          AND u.deleted_at IS NULL
          AND u.is_active = true
          AND r.slug::text IN (
              'sales_manager',
              'regional_manager'
          )
    );
$function$;

REVOKE ALL
ON FUNCTION public.v2_user_is_plan_manager(uuid, uuid)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.v2_user_is_plan_manager(uuid, uuid)
TO authenticated;

-- ============================================================
-- 4. UPSERT MONTHLY TARGET
-- ============================================================

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
    -- 4.1 Authentication / company
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
    -- 4.2 Input validation
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
    -- 4.3 Authorization
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
    -- 4.4 Resolve Jalali period
    --
    -- The project database period key is mapped through the
    -- existing Jalali helper.
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
    -- 4.5 Lock Plan Area
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
    -- 4.6 Validate target manager
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
    -- 4.7 Validate Plan Area ownership at the START of period
    --
    -- This locks the historical relationship for this monthly
    -- target and prevents later region/portfolio transfers from
    -- changing the meaning of the target.
    -- ========================================================

    IF v_plan_area.area_type = 'regional' THEN

        IF v_plan_area.region_id IS NULL THEN
            RAISE EXCEPTION
                'Regional Plan Area has no region.';
        END IF;

        -- A regional Plan Area must be owned by a Regional Manager.
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
                'Selected Regional Manager did not own the region at the start of the target period.';
        END IF;

    ELSIF v_plan_area.area_type = 'portfolio' THEN

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
    -- 4.8 Serialize the logical target key
    --
    -- Prevent simultaneous target creation/update on two devices.
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
    -- 4.9 Find current active target
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
    -- 4.10 CREATE
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
    -- 4.11 UPDATE
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

-- ============================================================
-- 5. SOFT DELETE MONTHLY TARGET
-- ============================================================

CREATE OR REPLACE FUNCTION public.v2_remove_monthly_target(
    p_target_id uuid,
    p_reason text
)
RETURNS public.v2_monthly_targets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_company_id uuid;
    v_target public.v2_monthly_targets;
    v_result public.v2_monthly_targets;
BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required.';
    END IF;

    v_company_id := public.auth_user_company_id();

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION
            'Active company context is required.';
    END IF;

    IF p_reason IS NULL
       OR btrim(p_reason) = ''
    THEN
        RAISE EXCEPTION
            'A reason is required when removing a monthly target.';
    END IF;

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
            'User is not authorized to remove monthly targets.';

    END IF;

    SELECT *
    INTO v_target
    FROM public.v2_monthly_targets AS t
    WHERE t.id = p_target_id
      AND t.company_id = v_company_id
      AND t.deleted_at IS NULL
    FOR UPDATE;

    IF v_target.id IS NULL THEN
        RAISE EXCEPTION
            'Active monthly target not found.';
    END IF;

    UPDATE public.v2_monthly_targets
    SET
        deleted_at = timezone('utc'::text, now()),
        updated_by = auth.uid(),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_target.id
    RETURNING *
    INTO v_result;

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
        v_target.id,
        v_target.plan_area_id,
        v_target.manager_user_id,
        v_target.period_year,
        v_target.period_month,
        'deleted',
        v_target.target_tonnage,
        NULL,
        v_target.notes,
        NULL,
        auth.uid(),
        btrim(p_reason)
    );

    RETURN v_result;

END;
$function$;

REVOKE ALL
ON FUNCTION public.v2_remove_monthly_target(
    uuid,
    text
)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.v2_remove_monthly_target(
    uuid,
    text
)
TO authenticated;

-- ============================================================
-- 6. COMMENTS
-- ============================================================

COMMENT ON TABLE public.v2_monthly_target_history IS
    'Immutable audit history for V2 monthly target creation, editing and soft deletion.';

COMMENT ON COLUMN public.v2_monthly_targets.target_tonnage IS
    'Monthly target tonnage. Zero is valid for a planned area such as صادرات چین.';

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
    'Create or update a V2 monthly target with authorization, period validation, ownership-at-period-start validation and audit history.';

COMMENT ON FUNCTION public.v2_remove_monthly_target(
    uuid,
    text
)
IS
    'Soft-delete a V2 monthly target while preserving immutable audit history.';

COMMIT;
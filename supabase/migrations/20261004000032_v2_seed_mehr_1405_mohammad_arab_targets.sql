-- ============================================================
-- V2 Migration 32
-- Seed Mehr 1405 Target for Mohammad Arab
--
-- Purpose:
--   Import the approved initial regional targets for Mehr 1405
--   from the existing planning baseline.
--
-- Current manager:
--   محمد عرب
--
-- Mehr 1405:
--   Database period key = 2026 / 10
--   Jalali period = 1405 / 07
--
-- IMPORTANT:
--   The project's Jalali period helper returns:
--
--       start_date = first day of the Jalali month
--       end_date   = first day of the NEXT Jalali month
--
--   Therefore the period is represented as:
--
--       [2026-09-23, 2026-10-23)
--
--   and the last actual day of Mehr 1405 is:
--
--       2026-10-22
--
-- Targets:
--   تهران و ورامین                  = 250 tons
--   سمنان، گرمسار و مازندران غربی = 250 tons
--   Total                           = 500 tons
--
-- IMPORTANT:
--   - V1 monthly_targets is untouched.
--   - V1 reporting is untouched.
--   - Customers are untouched.
--   - Orders are untouched.
--   - No permissions are granted.
--   - No CEO bootstrap is performed.
--   - This is a controlled one-time data import.
--
-- Audit actor:
--   محمد عرب - مدیر کل
--   9cb4ee68-844f-4a12-bc7b-867652bedfb3
--
-- The audit actor is recorded only as the operator of this
-- initial data migration. This migration does not assign CEO.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Constants and safety validation
-- ============================================================

DO $$
DECLARE
    v_company_id uuid :=
        '11111111-1111-1111-1111-111111111111';

    v_mohammad_arab_id uuid :=
        '0e67b545-f44e-4f47-b2e0-4a82d6a4943f';

    v_audit_actor_id uuid :=
        '9cb4ee68-844f-4a12-bc7b-867652bedfb3';

    v_region1_id uuid :=
        'cccccccc-0001-0001-0001-000000000001';

    v_region2_id uuid :=
        'cccccccc-0002-0002-0002-000000000002';

    v_region1_plan_area_id uuid;
    v_region2_plan_area_id uuid;

    v_period_start date;
    v_period_end date;
    v_jalali_year smallint;
    v_jalali_month smallint;

    v_region1_assignment_ok boolean;
    v_region2_assignment_ok boolean;

    v_existing_mismatch integer;

BEGIN

    -- ========================================================
    -- 1.1 Verify company
    -- ========================================================

    IF NOT EXISTS (
        SELECT 1
        FROM public.companies AS c
        WHERE c.id = v_company_id
    ) THEN

        RAISE EXCEPTION
            'Target seed aborted: company does not exist.'
            USING ERRCODE = 'P0001';

    END IF;

    -- ========================================================
    -- 1.2 Verify Mohammad Arab
    -- ========================================================

    IF NOT EXISTS (
        SELECT 1
        FROM public.users AS u
        WHERE u.id = v_mohammad_arab_id
          AND u.company_id = v_company_id
          AND u.deleted_at IS NULL
          AND u.is_active = true
    ) THEN

        RAISE EXCEPTION
            'Target seed aborted: Mohammad Arab user is not active.'
            USING ERRCODE = 'P0001';

    END IF;

    -- ========================================================
    -- 1.3 Verify audit actor
    -- ========================================================

    IF NOT EXISTS (
        SELECT 1
        FROM public.users AS u
        WHERE u.id = v_audit_actor_id
          AND u.company_id = v_company_id
          AND u.deleted_at IS NULL
          AND u.is_active = true
    ) THEN

        RAISE EXCEPTION
            'Target seed aborted: audit actor does not exist or is inactive.'
            USING ERRCODE = 'P0001';

    END IF;

    -- ========================================================
    -- 1.4 Resolve Mehr 1405
    --
    -- Project helper uses half-open period bounds:
    --
    --   start_date = 2026-09-23
    --   end_date   = 2026-10-23
    --
    -- Actual Mehr days:
    --
    --   2026-09-23 ... 2026-10-22
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
        2026::smallint,
        10::smallint
    ) AS p;

    IF v_period_start IS NULL
       OR v_period_end IS NULL
    THEN

        RAISE EXCEPTION
            'Target seed aborted: Mehr 1405 period could not be resolved.'
            USING ERRCODE = 'P0001';

    END IF;

    IF v_period_start <> DATE '2026-09-23'
       OR v_period_end <> DATE '2026-10-23'
       OR v_jalali_year <> 1405
       OR v_jalali_month <> 7
    THEN

        RAISE EXCEPTION
            'Target seed aborted: unexpected Mehr 1405 period boundaries. Start %, End %, Jalali %/%.',
            v_period_start,
            v_period_end,
            v_jalali_year,
            v_jalali_month
            USING ERRCODE = 'P0001';

    END IF;

    -- ========================================================
    -- 1.5 Resolve Regional Plan Area - Tehran / Varamin
    -- ========================================================

    SELECT pa.id
    INTO v_region1_plan_area_id
    FROM public.v2_plan_areas AS pa
    WHERE pa.company_id = v_company_id
      AND pa.area_type = 'regional'
      AND pa.region_id = v_region1_id
      AND pa.deleted_at IS NULL
      AND pa.is_active = true
    LIMIT 1;

    IF v_region1_plan_area_id IS NULL THEN

        RAISE EXCEPTION
            'Target seed aborted: Regional Plan Area for Tehran and Varamin was not found.'
            USING ERRCODE = 'P0001';

    END IF;

    -- ========================================================
    -- 1.6 Resolve Regional Plan Area - Semnan / Garmsar /
    --     West Mazandaran
    -- ========================================================

    SELECT pa.id
    INTO v_region2_plan_area_id
    FROM public.v2_plan_areas AS pa
    WHERE pa.company_id = v_company_id
      AND pa.area_type = 'regional'
      AND pa.region_id = v_region2_id
      AND pa.deleted_at IS NULL
      AND pa.is_active = true
    LIMIT 1;

    IF v_region2_plan_area_id IS NULL THEN

        RAISE EXCEPTION
            'Target seed aborted: Regional Plan Area for Semnan, Garmsar and West Mazandaran was not found.'
            USING ERRCODE = 'P0001';

    END IF;

    -- ========================================================
    -- 1.7 Verify Mohammad Arab has Regional Manager role
    -- ========================================================

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
        WHERE ur.user_id = v_mohammad_arab_id
          AND ur.deleted_at IS NULL
          AND r.slug::text = 'regional_manager'
    ) THEN

        RAISE EXCEPTION
            'Target seed aborted: Mohammad Arab does not have the regional_manager role.'
            USING ERRCODE = 'P0001';

    END IF;

    -- ========================================================
    -- 1.8 Verify Region 1 ownership at beginning of Mehr
    -- ========================================================

    SELECT EXISTS (
        SELECT 1
        FROM public.v2_region_manager_assignment_history AS h
        WHERE h.company_id = v_company_id
          AND h.region_id = v_region1_id
          AND h.regional_manager_id = v_mohammad_arab_id
          AND h.effective_from <= v_period_start
          AND (
                h.effective_to IS NULL
                OR h.effective_to >= v_period_start
              )
    )
    INTO v_region1_assignment_ok;

    IF NOT v_region1_assignment_ok THEN

        RAISE EXCEPTION
            'Target seed aborted: Mohammad Arab did not own Tehran and Varamin at the start of Mehr 1405.'
            USING ERRCODE = 'P0001';

    END IF;

    -- ========================================================
    -- 1.9 Verify Region 2 ownership at beginning of Mehr
    -- ========================================================

    SELECT EXISTS (
        SELECT 1
        FROM public.v2_region_manager_assignment_history AS h
        WHERE h.company_id = v_company_id
          AND h.region_id = v_region2_id
          AND h.regional_manager_id = v_mohammad_arab_id
          AND h.effective_from <= v_period_start
          AND (
                h.effective_to IS NULL
                OR h.effective_to >= v_period_start
              )
    )
    INTO v_region2_assignment_ok;

    IF NOT v_region2_assignment_ok THEN

        RAISE EXCEPTION
            'Target seed aborted: Mohammad Arab did not own Semnan, Garmsar and West Mazandaran at the start of Mehr 1405.'
            USING ERRCODE = 'P0001';

    END IF;

    -- ========================================================
    -- 1.10 Reject mismatched existing targets
    --
    -- Existing matching targets are preserved.
    -- Existing mismatched targets are never silently overwritten.
    -- ========================================================

    SELECT COUNT(*)
    INTO v_existing_mismatch
    FROM public.v2_monthly_targets AS t
    WHERE t.company_id = v_company_id
      AND t.period_year = 2026
      AND t.period_month = 10
      AND t.manager_user_id = v_mohammad_arab_id
      AND t.deleted_at IS NULL
      AND (
            (
                t.plan_area_id = v_region1_plan_area_id
                AND t.target_tonnage <> 250
            )
            OR
            (
                t.plan_area_id = v_region2_plan_area_id
                AND t.target_tonnage <> 250
            )
            OR
            (
                t.plan_area_id NOT IN (
                    v_region1_plan_area_id,
                    v_region2_plan_area_id
                )
            )
        );

    IF v_existing_mismatch > 0 THEN

        RAISE EXCEPTION
            'Target seed aborted: existing Mehr 1405 target values do not match the approved baseline.'
            USING ERRCODE = 'P0001';

    END IF;

END;
$$;

-- ============================================================
-- 2. Seed Target - Region 1
-- ============================================================

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
SELECT
    '11111111-1111-1111-1111-111111111111'::uuid,
    pa.id,
    '0e67b545-f44e-4f47-b2e0-4a82d6a4943f'::uuid,
    2026::smallint,
    10::smallint,
    250::numeric,
    'ثبت مبنای برنامه مهر ۱۴۰۵ بر اساس برنامه فروش مصوب',
    '9cb4ee68-844f-4a12-bc7b-867652bedfb3'::uuid,
    '9cb4ee68-844f-4a12-bc7b-867652bedfb3'::uuid
FROM public.v2_plan_areas AS pa
WHERE pa.id =
      'dd5b55ad-3dc7-4494-9276-2478eb6f2959'::uuid
  AND pa.company_id =
      '11111111-1111-1111-1111-111111111111'::uuid
  AND pa.area_type = 'regional'
  AND pa.region_id =
      'cccccccc-0001-0001-0001-000000000001'::uuid
  AND pa.deleted_at IS NULL
  AND pa.is_active = true
  AND NOT EXISTS (
        SELECT 1
        FROM public.v2_monthly_targets AS t
        WHERE t.company_id =
              '11111111-1111-1111-1111-111111111111'::uuid
          AND t.plan_area_id = pa.id
          AND t.manager_user_id =
              '0e67b545-f44e-4f47-b2e0-4a82d6a4943f'::uuid
          AND t.period_year = 2026
          AND t.period_month = 10
          AND t.deleted_at IS NULL
    );

-- ============================================================
-- 3. Seed Target - Region 2
-- ============================================================

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
SELECT
    '11111111-1111-1111-1111-111111111111'::uuid,
    pa.id,
    '0e67b545-f44e-4f47-b2e0-4a82d6a4943f'::uuid,
    2026::smallint,
    10::smallint,
    250::numeric,
    'ثبت مبنای برنامه مهر ۱۴۰۵ بر اساس برنامه فروش مصوب',
    '9cb4ee68-844f-4a12-bc7b-867652bedfb3'::uuid,
    '9cb4ee68-844f-4a12-bc7b-867652bedfb3'::uuid
FROM public.v2_plan_areas AS pa
WHERE pa.id =
      '0fadfb9a-7d1d-44ec-a10a-79f238ef42eb'::uuid
  AND pa.company_id =
      '11111111-1111-1111-1111-111111111111'::uuid
  AND pa.area_type = 'regional'
  AND pa.region_id =
      'cccccccc-0002-0002-0002-000000000002'::uuid
  AND pa.deleted_at IS NULL
  AND pa.is_active = true
  AND NOT EXISTS (
        SELECT 1
        FROM public.v2_monthly_targets AS t
        WHERE t.company_id =
              '11111111-1111-1111-1111-111111111111'::uuid
          AND t.plan_area_id = pa.id
          AND t.manager_user_id =
              '0e67b545-f44e-4f47-b2e0-4a82d6a4943f'::uuid
          AND t.period_year = 2026
          AND t.period_month = 10
          AND t.deleted_at IS NULL
    );

-- ============================================================
-- 4. Target history - Region 1
-- ============================================================

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
    changed_at,
    reason
)
SELECT
    t.company_id,
    t.id,
    t.plan_area_id,
    t.manager_user_id,
    t.period_year,
    t.period_month,
    'created',
    NULL,
    t.target_tonnage,
    NULL,
    t.notes,
    '9cb4ee68-844f-4a12-bc7b-867652bedfb3'::uuid,
    t.created_at,
    'ثبت مبنای اولیه برنامه مهر ۱۴۰۵ در V2'
FROM public.v2_monthly_targets AS t
WHERE t.company_id =
      '11111111-1111-1111-1111-111111111111'::uuid
  AND t.plan_area_id =
      'dd5b55ad-3dc7-4494-9276-2478eb6f2959'::uuid
  AND t.manager_user_id =
      '0e67b545-f44e-4f47-b2e0-4a82d6a4943f'::uuid
  AND t.period_year = 2026
  AND t.period_month = 10
  AND t.deleted_at IS NULL
  AND NOT EXISTS (
        SELECT 1
        FROM public.v2_monthly_target_history AS h
        WHERE h.target_id = t.id
          AND h.action = 'created'
    );

-- ============================================================
-- 5. Target history - Region 2
-- ============================================================

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
    changed_at,
    reason
)
SELECT
    t.company_id,
    t.id,
    t.plan_area_id,
    t.manager_user_id,
    t.period_year,
    t.period_month,
    'created',
    NULL,
    t.target_tonnage,
    NULL,
    t.notes,
    '9cb4ee68-844f-4a12-bc7b-867652bedfb3'::uuid,
    t.created_at,
    'ثبت مبنای اولیه برنامه مهر ۱۴۰۵ در V2'
FROM public.v2_monthly_targets AS t
WHERE t.company_id =
      '11111111-1111-1111-1111-111111111111'::uuid
  AND t.plan_area_id =
      '0fadfb9a-7d1d-44ec-a10a-79f238ef42eb'::uuid
  AND t.manager_user_id =
      '0e67b545-f44e-4f47-b2e0-4a82d6a4943f'::uuid
  AND t.period_year = 2026
  AND t.period_month = 10
  AND t.deleted_at IS NULL
  AND NOT EXISTS (
        SELECT 1
        FROM public.v2_monthly_target_history AS h
        WHERE h.target_id = t.id
          AND h.action = 'created'
    );

-- ============================================================
-- 6. Final validation
-- ============================================================

DO $$
DECLARE
    v_target_count integer;
    v_total_tonnage numeric;
    v_history_count integer;
BEGIN

    SELECT
        COUNT(*),
        COALESCE(SUM(t.target_tonnage), 0)
    INTO
        v_target_count,
        v_total_tonnage
    FROM public.v2_monthly_targets AS t
    WHERE t.company_id =
          '11111111-1111-1111-1111-111111111111'::uuid
      AND t.manager_user_id =
          '0e67b545-f44e-4f47-b2e0-4a82d6a4943f'::uuid
      AND t.period_year = 2026
      AND t.period_month = 10
      AND t.plan_area_id IN (
            'dd5b55ad-3dc7-4494-9276-2478eb6f2959'::uuid,
            '0fadfb9a-7d1d-44ec-a10a-79f238ef42eb'::uuid
          )
      AND t.deleted_at IS NULL;

    SELECT COUNT(*)
    INTO v_history_count
    FROM public.v2_monthly_target_history AS h
    WHERE h.company_id =
          '11111111-1111-1111-1111-111111111111'::uuid
      AND h.manager_user_id =
          '0e67b545-f44e-4f47-b2e0-4a82d6a4943f'::uuid
      AND h.period_year = 2026
      AND h.period_month = 10
      AND h.action = 'created'
      AND h.plan_area_id IN (
            'dd5b55ad-3dc7-4494-9276-2478eb6f2959'::uuid,
            '0fadfb9a-7d1d-44ec-a10a-79f238ef42eb'::uuid
          );

    IF v_target_count <> 2 THEN

        RAISE EXCEPTION
            'Target seed failed: expected 2 active targets, found %.',
            v_target_count
            USING ERRCODE = 'P0001';

    END IF;

    IF v_total_tonnage <> 500 THEN

        RAISE EXCEPTION
            'Target seed failed: expected 500 tons total, found %.',
            v_total_tonnage
            USING ERRCODE = 'P0001';

    END IF;

    IF v_history_count <> 2 THEN

        RAISE EXCEPTION
            'Target seed failed: expected 2 creation history rows, found %.',
            v_history_count
            USING ERRCODE = 'P0001';

    END IF;

END;
$$;

COMMIT;
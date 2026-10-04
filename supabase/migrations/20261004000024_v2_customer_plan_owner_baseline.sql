-- ============================================================
-- V2 Migration 24
-- Customer Plan Owner Baseline
--
-- Purpose:
--   1. Initialize V2 ownership for existing customers.
--   2. Resolve customer geographic region through:
--        customers.city_id -> cities.region_id
--   3. Assign the current Regional Manager of that region.
--   4. Mark existing ordinary customers as region_based.
--   5. Create a V2 ownership history baseline.
--   6. Preserve all V1 customer ownership data.
--
-- IMPORTANT:
--   - customers.region_id DOES NOT EXIST.
--   - Geographic region is resolved through cities.region_id.
--   - User role is resolved through user_roles + roles.
--   - assigned_user_id is NEVER modified.
--   - Orders are NEVER modified.
--   - Existing V2 ownership is NEVER overwritten.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Safety check:
--    Do not proceed if there are partially populated V2
--    ownership records.
-- ============================================================

DO $$
DECLARE
    v_partial_count integer;
BEGIN
    SELECT COUNT(*)
    INTO v_partial_count
    FROM public.customers AS c
    WHERE c.company_id = '11111111-1111-1111-1111-111111111111'
      AND c.deleted_at IS NULL
      AND (
            (
                c.regional_manager_id IS NULL
                AND (
                    c.plan_scope IS NOT NULL
                    OR c.plan_region_id IS NOT NULL
                    OR c.ownership_mode IS NOT NULL
                )
            )
            OR
            (
                c.regional_manager_id IS NOT NULL
                AND (
                    c.plan_scope IS NULL
                    OR c.ownership_mode IS NULL
                    OR (
                        c.plan_scope = 'regional'
                        AND c.plan_region_id IS NULL
                    )
                    OR (
                        c.plan_scope = 'out_of_region'
                        AND c.plan_region_id IS NOT NULL
                    )
                )
            )
        );

    IF v_partial_count > 0 THEN
        RAISE EXCEPTION
            'V2 customer ownership baseline aborted: % customers have inconsistent or partial ownership data.',
            v_partial_count
            USING ERRCODE = 'P0001';
    END IF;
END;
$$;

-- ============================================================
-- 2. Safety check:
--    Every customer that is going to be baselined must have
--    a valid city and region.
-- ============================================================

DO $$
DECLARE
    v_missing_region_count integer;
BEGIN
    SELECT COUNT(*)
    INTO v_missing_region_count
    FROM public.customers AS c
    LEFT JOIN public.cities AS ci
        ON ci.id = c.city_id
       AND ci.company_id = c.company_id
       AND ci.deleted_at IS NULL
    WHERE c.company_id = '11111111-1111-1111-1111-111111111111'
      AND c.deleted_at IS NULL
      AND c.regional_manager_id IS NULL
      AND c.plan_scope IS NULL
      AND c.plan_region_id IS NULL
      AND c.ownership_mode IS NULL
      AND (
            ci.id IS NULL
            OR ci.region_id IS NULL
        );

    IF v_missing_region_count > 0 THEN
        RAISE EXCEPTION
            'V2 customer ownership baseline aborted: % customers do not have a valid city/region mapping.',
            v_missing_region_count
            USING ERRCODE = 'P0001';
    END IF;
END;
$$;

-- ============================================================
-- 3. Safety check:
--    Every region containing a customer to be baselined must
--    currently have exactly one active Regional Manager.
--
--    Role is checked through user_roles + roles.
-- ============================================================

DO $$
DECLARE
    v_invalid_count integer;
BEGIN
    SELECT COUNT(*)
    INTO v_invalid_count
    FROM public.customers AS c
    INNER JOIN public.cities AS ci
        ON ci.id = c.city_id
       AND ci.company_id = c.company_id
       AND ci.deleted_at IS NULL
    WHERE c.company_id = '11111111-1111-1111-1111-111111111111'
      AND c.deleted_at IS NULL
      AND c.regional_manager_id IS NULL
      AND c.plan_scope IS NULL
      AND c.plan_region_id IS NULL
      AND c.ownership_mode IS NULL
      AND (
            SELECT COUNT(*)
            FROM public.user_regions AS ur
            INNER JOIN public.users AS u
                ON u.id = ur.user_id
            WHERE ur.company_id = c.company_id
              AND ur.region_id = ci.region_id
              AND ur.deleted_at IS NULL
              AND u.deleted_at IS NULL
              AND u.is_active = true
              AND EXISTS (
                    SELECT 1
                    FROM public.user_roles AS ur_role
                    INNER JOIN public.roles AS r
                        ON r.id = ur_role.role_id
                    WHERE ur_role.user_id = u.id
                      AND ur_role.deleted_at IS NULL
                      AND r.company_id = c.company_id
                      AND r.deleted_at IS NULL
                      AND r.is_active = true
                      AND r.slug::text = 'regional_manager'
                )
        ) <> 1;

    IF v_invalid_count > 0 THEN
        RAISE EXCEPTION
            'V2 customer ownership baseline aborted: % customers belong to regions without exactly one active Regional Manager.',
            v_invalid_count
            USING ERRCODE = 'P0001';
    END IF;
END;
$$;

-- ============================================================
-- 4. Safety check:
--    Every current region manager must have an active V2
--    region assignment history row.
-- ============================================================

DO $$
DECLARE
    v_missing_history_count integer;
BEGIN
    SELECT COUNT(*)
    INTO v_missing_history_count
    FROM public.customers AS c
    INNER JOIN public.cities AS ci
        ON ci.id = c.city_id
       AND ci.company_id = c.company_id
       AND ci.deleted_at IS NULL
    INNER JOIN public.user_regions AS ur
        ON ur.company_id = c.company_id
       AND ur.region_id = ci.region_id
       AND ur.deleted_at IS NULL
    INNER JOIN public.users AS u
        ON u.id = ur.user_id
       AND u.company_id = c.company_id
       AND u.deleted_at IS NULL
       AND u.is_active = true
    WHERE c.company_id = '11111111-1111-1111-1111-111111111111'
      AND c.deleted_at IS NULL
      AND c.regional_manager_id IS NULL
      AND c.plan_scope IS NULL
      AND c.plan_region_id IS NULL
      AND c.ownership_mode IS NULL
      AND EXISTS (
            SELECT 1
            FROM public.user_roles AS ur_role
            INNER JOIN public.roles AS r
                ON r.id = ur_role.role_id
            WHERE ur_role.user_id = u.id
              AND ur_role.deleted_at IS NULL
              AND r.company_id = c.company_id
              AND r.deleted_at IS NULL
              AND r.is_active = true
              AND r.slug::text = 'regional_manager'
        )
      AND NOT EXISTS (
            SELECT 1
            FROM public.v2_region_manager_assignment_history AS h
            WHERE h.company_id = c.company_id
              AND h.region_id = ci.region_id
              AND h.regional_manager_id = ur.user_id
              AND h.effective_to IS NULL
        );

    IF v_missing_history_count > 0 THEN
        RAISE EXCEPTION
            'V2 customer ownership baseline aborted: % customers belong to regions whose current manager has no active V2 assignment history.',
            v_missing_history_count
            USING ERRCODE = 'P0001';
    END IF;
END;
$$;

-- ============================================================
-- 5. Enable authorized V2 customer ownership assignment
--
-- Migration 18 installs a trigger that prevents ordinary UPDATE
-- statements from changing V2 ownership fields.
--
-- This migration is an approved internal data-baseline operation.
-- ============================================================

SELECT set_config(
    'app.v2_customer_plan_assignment_authorized',
    'true',
    true
);

-- ============================================================
-- 6. Initialize customer ownership
--
-- Mapping:
--
--   customers.city_id
--          ↓
--   cities.region_id
--          ↓
--   user_regions.region_id
--          ↓
--   user_regions.user_id
--
-- Only customers with completely NULL V2 ownership are changed.
--
-- assigned_user_id remains untouched.
-- ============================================================

UPDATE public.customers AS c
SET
    ownership_mode = 'region_based',
    regional_manager_id = ur.user_id,
    plan_scope = 'regional',
    plan_region_id = ci.region_id,
    updated_at = timezone('utc'::text, now())
FROM public.cities AS ci
INNER JOIN public.user_regions AS ur
    ON ur.company_id = ci.company_id
   AND ur.region_id = ci.region_id
   AND ur.deleted_at IS NULL
INNER JOIN public.users AS u
    ON u.id = ur.user_id
   AND u.company_id = ci.company_id
   AND u.deleted_at IS NULL
   AND u.is_active = true
WHERE c.company_id = '11111111-1111-1111-1111-111111111111'
  AND c.deleted_at IS NULL
  AND c.city_id = ci.id
  AND ci.company_id = c.company_id
  AND ci.deleted_at IS NULL
  AND c.regional_manager_id IS NULL
  AND c.plan_scope IS NULL
  AND c.plan_region_id IS NULL
  AND c.ownership_mode IS NULL
  AND EXISTS (
        SELECT 1
        FROM public.user_roles AS ur_role
        INNER JOIN public.roles AS r
            ON r.id = ur_role.role_id
        WHERE ur_role.user_id = u.id
          AND ur_role.deleted_at IS NULL
          AND r.company_id = c.company_id
          AND r.deleted_at IS NULL
          AND r.is_active = true
          AND r.slug::text = 'regional_manager'
    );

-- ============================================================
-- 7. Create customer ownership baseline history
--
-- The history table is an audit/change log, so changed_at reflects
-- the actual baseline operation time.
--
-- The original V1 assigned_user_id is intentionally excluded.
-- ============================================================

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
    c.company_id,
    c.id,

    NULL,
    c.regional_manager_id,

    NULL,
    c.plan_scope,

    NULL,
    c.plan_region_id,

    NULL,
    timezone('utc'::text, now()),
    'ثبت مبنای اولیه مالکیت مشتری در V2'
FROM public.customers AS c
WHERE c.company_id = '11111111-1111-1111-1111-111111111111'
  AND c.deleted_at IS NULL
  AND c.ownership_mode = 'region_based'
  AND c.plan_scope = 'regional'
  AND c.plan_region_id IS NOT NULL
  AND c.regional_manager_id IS NOT NULL
  AND NOT EXISTS (
        SELECT 1
        FROM public.v2_customer_plan_assignment_history AS existing
        WHERE existing.company_id = c.company_id
          AND existing.customer_id = c.id
          AND existing.new_regional_manager_id = c.regional_manager_id
          AND existing.new_plan_scope = c.plan_scope
          AND existing.new_plan_region_id = c.plan_region_id
          AND existing.reason =
              'ثبت مبنای اولیه مالکیت مشتری در V2'
    );

-- ============================================================
-- 8. Final integrity check
--
-- Active customers that have a geographic region must no longer
-- remain completely uninitialized.
-- ============================================================

DO $$
DECLARE
    v_remaining integer;
BEGIN
    SELECT COUNT(*)
    INTO v_remaining
    FROM public.customers AS c
    INNER JOIN public.cities AS ci
        ON ci.id = c.city_id
       AND ci.company_id = c.company_id
       AND ci.deleted_at IS NULL
    WHERE c.company_id = '11111111-1111-1111-1111-111111111111'
      AND c.deleted_at IS NULL
      AND c.regional_manager_id IS NULL
      AND c.plan_scope IS NULL
      AND c.plan_region_id IS NULL
      AND c.ownership_mode IS NULL;

    IF v_remaining > 0 THEN
        RAISE EXCEPTION
            'V2 customer ownership baseline incomplete: % customers still have no V2 ownership.',
            v_remaining
            USING ERRCODE = 'P0001';
    END IF;
END;
$$;

-- ============================================================
-- 9. Final summary
-- ============================================================

DO $$
DECLARE
    v_region1_count integer;
    v_region2_count integer;
    v_total_count integer;
BEGIN
    SELECT COUNT(*)
    INTO v_region1_count
    FROM public.customers AS c
    WHERE c.company_id = '11111111-1111-1111-1111-111111111111'
      AND c.deleted_at IS NULL
      AND c.ownership_mode = 'region_based'
      AND c.plan_region_id =
          'cccccccc-0001-0001-0001-000000000001';

    SELECT COUNT(*)
    INTO v_region2_count
    FROM public.customers AS c
    WHERE c.company_id = '11111111-1111-1111-1111-111111111111'
      AND c.deleted_at IS NULL
      AND c.ownership_mode = 'region_based'
      AND c.plan_region_id =
          'cccccccc-0002-0002-0002-000000000002';

    v_total_count := v_region1_count + v_region2_count;

    RAISE NOTICE
        'V2 customer ownership baseline completed. Region 1: %, Region 2: %, Total: %',
        v_region1_count,
        v_region2_count,
        v_total_count;
END;
$$;

COMMIT;
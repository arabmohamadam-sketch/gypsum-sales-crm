BEGIN;

-- ============================================================
-- V2 Regional Manager Plan - Jalali Period Fix
--
-- IMPORTANT PROJECT RULE
--
-- monthly_targets.target_year / target_month use the
-- Gregorian DB period key of the Jalali month.
--
-- Example:
--   DB key 2026/10
--   = Jalali 1405/07
--   = 2026-09-23 through 2026-10-22
--
-- Therefore actual loading must be filtered using the real
-- Jalali period bounds returned by:
--
--   get_jalali_period_bounds_from_gregorian_key(...)
--
-- NOT by EXTRACT(MONTH FROM loading_date).
--
-- V1 tables remain untouched.
-- ============================================================


CREATE OR REPLACE FUNCTION public.v2_get_regional_manager_plan(
    p_user_id uuid,
    p_year smallint,
    p_month smallint
)
RETURNS TABLE (
    region_id uuid,
    region_name text,
    target_tonnage numeric,
    achieved_tonnage numeric,
    remaining_tonnage numeric,
    achievement_rate numeric,
    loaded_order_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id uuid;
    v_period_start date;
    v_period_end date;
BEGIN

    -- --------------------------------------------------------
    -- Basic validation
    -- --------------------------------------------------------

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION
            'Regional manager user id is required.';
    END IF;

    IF p_year < 2000 OR p_year > 2100 THEN
        RAISE EXCEPTION
            'Invalid Gregorian period year.';
    END IF;

    IF p_month < 1 OR p_month > 12 THEN
        RAISE EXCEPTION
            'Invalid Gregorian period month.';
    END IF;


    -- --------------------------------------------------------
    -- Resolve company
    -- --------------------------------------------------------

    SELECT
        u.company_id
    INTO
        v_company_id
    FROM public.users AS u
    WHERE u.id = p_user_id
      AND u.deleted_at IS NULL
      AND u.is_active = true
    LIMIT 1;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION
            'Active user not found.';
    END IF;


    -- --------------------------------------------------------
    -- Resolve the actual Jalali period bounds
    --
    -- Example:
    --   2026/10
    --   -> 1405/07
    --   -> 2026-09-23 <= loading_date < 2026-10-23
    --
    -- The exclusive upper bound means 2026-10-22 is included.
    -- --------------------------------------------------------

    SELECT
        b.start_date,
        b.end_date
    INTO
        v_period_start,
        v_period_end
    FROM public.get_jalali_period_bounds_from_gregorian_key(
        p_year,
        p_month
    ) AS b;


    -- --------------------------------------------------------
    -- Main result
    -- --------------------------------------------------------

    RETURN QUERY
    WITH manager_regions AS (
        SELECT DISTINCT
            ur.region_id
        FROM public.user_regions AS ur
        WHERE ur.company_id = v_company_id
          AND ur.user_id = p_user_id
          AND ur.deleted_at IS NULL
    ),

    target_by_region AS (
        SELECT
            mt.region_id,
            COALESCE(
                SUM(mt.target_tonnage),
                0
            )::numeric AS target_tonnage

        FROM public.monthly_targets AS mt

        WHERE mt.company_id = v_company_id
          AND mt.user_id = p_user_id
          AND mt.target_year = p_year
          AND mt.target_month = p_month
          AND mt.region_id IS NOT NULL
          AND mt.deleted_at IS NULL

        GROUP BY
            mt.region_id
    ),

    loaded_rows AS (
        SELECT
            ci.region_id,
            o.id AS order_id,
            wi.tonnage

        FROM public.orders AS o

        INNER JOIN public.customers AS c
            ON c.id = o.customer_id
           AND c.company_id = o.company_id
           AND c.deleted_at IS NULL

        INNER JOIN public.cities AS ci
            ON ci.id = c.city_id
           AND ci.deleted_at IS NULL

        INNER JOIN public.waybills AS w
            ON w.order_id = o.id
           AND w.company_id = o.company_id
           AND w.deleted_at IS NULL
           AND w.status = 'loading_confirmed'

        INNER JOIN public.loading AS l
            ON l.waybill_id = w.id
           AND l.company_id = w.company_id
           AND l.deleted_at IS NULL
           AND l.status = 'confirmed'

        INNER JOIN public.waybill_items AS wi
            ON wi.waybill_id = w.id
           AND wi.company_id = w.company_id
           AND wi.deleted_at IS NULL

        INNER JOIN manager_regions AS mr
            ON mr.region_id = ci.region_id

        WHERE o.company_id = v_company_id
          AND o.deleted_at IS NULL

          -- -------------------------------------------------
          -- ACTUAL JALALI PERIOD
          -- -------------------------------------------------
          AND l.loading_date >= v_period_start
          AND l.loading_date < v_period_end
    ),

    loaded_by_region AS (
        SELECT
            lr.region_id,

            COALESCE(
                SUM(lr.tonnage),
                0
            )::numeric AS achieved_tonnage,

            COUNT(
                DISTINCT lr.order_id
            )::integer AS loaded_order_count

        FROM loaded_rows AS lr

        GROUP BY
            lr.region_id
    ),

    regional_calculation AS (
        SELECT
            mr.region_id,
            r.name AS region_name,

            COALESCE(
                t.target_tonnage,
                0
            )::numeric AS target_tonnage,

            COALESCE(
                lb.achieved_tonnage,
                0
            )::numeric AS achieved_tonnage,

            COALESCE(
                lb.loaded_order_count,
                0
            )::integer AS loaded_order_count

        FROM manager_regions AS mr

        INNER JOIN public.regions AS r
            ON r.id = mr.region_id
           AND r.deleted_at IS NULL

        LEFT JOIN target_by_region AS t
            ON t.region_id = mr.region_id

        LEFT JOIN loaded_by_region AS lb
            ON lb.region_id = mr.region_id
    )

    -- --------------------------------------------------------
    -- Regional rows
    -- --------------------------------------------------------

    SELECT
        rc.region_id,
        rc.region_name,
        rc.target_tonnage,
        rc.achieved_tonnage,

        GREATEST(
            rc.target_tonnage
            -
            rc.achieved_tonnage,
            0
        )::numeric AS remaining_tonnage,

        CASE
            WHEN rc.target_tonnage > 0 THEN
                ROUND(
                    (
                        rc.achieved_tonnage
                        /
                        rc.target_tonnage
                    ) * 100,
                    2
                )
            ELSE NULL
        END::numeric AS achievement_rate,

        rc.loaded_order_count

    FROM regional_calculation AS rc

    UNION ALL

    -- --------------------------------------------------------
    -- Overall manager total
    -- --------------------------------------------------------

    SELECT
        NULL::uuid AS region_id,
        'همه مناطق'::text AS region_name,

        COALESCE(
            SUM(rc.target_tonnage),
            0
        )::numeric AS target_tonnage,

        COALESCE(
            SUM(rc.achieved_tonnage),
            0
        )::numeric AS achieved_tonnage,

        GREATEST(
            COALESCE(
                SUM(rc.target_tonnage),
                0
            )
            -
            COALESCE(
                SUM(rc.achieved_tonnage),
                0
            ),
            0
        )::numeric AS remaining_tonnage,

        CASE
            WHEN COALESCE(
                SUM(rc.target_tonnage),
                0
            ) > 0 THEN
                ROUND(
                    (
                        COALESCE(
                            SUM(rc.achieved_tonnage),
                            0
                        )
                        /
                        SUM(rc.target_tonnage)
                    ) * 100,
                    2
                )
            ELSE NULL
        END::numeric AS achievement_rate,

        (
            SELECT
                COUNT(
                    DISTINCT lr.order_id
                )::integer
            FROM loaded_rows AS lr
        ) AS loaded_order_count

    FROM regional_calculation AS rc

    ORDER BY
        region_id NULLS LAST;

END;
$$;


-- ------------------------------------------------------------
-- Security remains handled by Migration 15 wrapper.
-- Keep the internal function inaccessible to authenticated
-- clients.
-- ------------------------------------------------------------

REVOKE ALL
ON FUNCTION public.v2_get_regional_manager_plan(
    uuid,
    smallint,
    smallint
)
FROM PUBLIC, authenticated;


COMMIT;
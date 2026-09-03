-- =========================================================
-- Gypsum Sales CRM
-- Fix Jalali monthly progress while keeping DB periods Gregorian
--
-- UI:
--   Jalali
--
-- DB:
--   Gregorian period key
--
-- Example:
--   Shahrivar 1405
--   1405/06/01 = 2026-08-23
--   1405/07/01 = 2026-09-23
--
-- Therefore:
--   monthly_targets.target_year  = 2026
--   monthly_targets.target_month = 9
--
-- monthly_progress.progress_year  = 2026
-- monthly_progress.progress_month = 9
--
-- IMPORTANT:
--   Order dates remain Gregorian in the orders table.
--   Only the period boundaries are calculated using Jalali.
-- =========================================================


-- =========================================================
-- 1. Find Gregorian period key for a Jalali order date
--
-- Example:
--   2026-08-23
--     -> 1405/06/01
--     -> period key 2026/09
--
--   2026-09-22
--     -> 1405/06/31
--     -> period key 2026/09
--
--   2026-09-23
--     -> 1405/07/01
--     -> period key 2026/10
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_order_target_period(
  p_order_date date
)
RETURNS TABLE(
  progress_year smallint,
  progress_month smallint
)
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $function$
DECLARE
  v_gy integer;

  v_jy integer;
  v_jm integer;

  v_next_jy integer;
  v_next_jm integer;

  v_start_date date;
  v_next_start_date date;
  v_end_date date;
BEGIN

  v_gy := EXTRACT(YEAR FROM p_order_date)::integer;

  /*
   * Jalali year is approximately 621/622 years
   * behind Gregorian.
   *
   * We check several nearby Jalali years so the
   * correct Jalali month is resolved safely.
   */
  FOR v_jy IN
    (v_gy - 623)..(v_gy - 618)
  LOOP

    FOR v_jm IN 1..12
    LOOP

      v_start_date :=
        public.jalali_to_gregorian_date(
          v_jy,
          v_jm,
          1
        );


      IF v_jm = 12 THEN

        v_next_jy := v_jy + 1;
        v_next_jm := 1;

      ELSE

        v_next_jy := v_jy;
        v_next_jm := v_jm + 1;

      END IF;


      v_next_start_date :=
        public.jalali_to_gregorian_date(
          v_next_jy,
          v_next_jm,
          1
        );


      IF p_order_date >= v_start_date
         AND p_order_date < v_next_start_date
      THEN

        /*
         * Project contract:
         *
         * The DB period key is the Gregorian
         * year/month containing the LAST day
         * of the Jalali month.
         *
         * Example:
         *   1405/06
         *   2026-08-23 .. 2026-09-22
         *   => 2026/09
         */

        v_end_date := v_next_start_date - 1;

        RETURN QUERY
        SELECT
          EXTRACT(YEAR FROM v_end_date)::smallint,
          EXTRACT(MONTH FROM v_end_date)::smallint;

        RETURN;

      END IF;

    END LOOP;

  END LOOP;

END;
$function$;


-- =========================================================
-- 2. Resolve Gregorian DB period key to actual Jalali month
--
-- Example:
--
--   2026/09
--     -> Jalali 1405/06
--     -> 2026-08-23 .. 2026-09-22
--
--   2026/10
--     -> Jalali 1405/07
--     -> 2026-09-23 .. 2026-10-22
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_jalali_period_bounds_from_gregorian_key(
  p_year smallint,
  p_month smallint
)
RETURNS TABLE(
  start_date date,
  end_date date,
  jalali_year smallint,
  jalali_month smallint
)
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $function$
DECLARE
  v_jy integer;
  v_jm integer;

  v_next_jy integer;
  v_next_jm integer;

  v_start_date date;
  v_next_start_date date;
  v_period_end date;
BEGIN

  /*
   * Validate Gregorian month.
   */
  IF p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION
      'Invalid Gregorian period month: %',
      p_month;
  END IF;


  /*
   * Search nearby Jalali years and months.
   * The matching Jalali month is the one whose
   * Gregorian last day belongs to p_year/p_month.
   */
  FOR v_jy IN
    (p_year - 623)..(p_year - 618)
  LOOP

    FOR v_jm IN 1..12
    LOOP

      v_start_date :=
        public.jalali_to_gregorian_date(
          v_jy,
          v_jm,
          1
        );


      IF v_jm = 12 THEN

        v_next_jy := v_jy + 1;
        v_next_jm := 1;

      ELSE

        v_next_jy := v_jy;
        v_next_jm := v_jm + 1;

      END IF;


      v_next_start_date :=
        public.jalali_to_gregorian_date(
          v_next_jy,
          v_next_jm,
          1
        );


      /*
       * Last day of the Jalali month.
       */
      v_period_end := v_next_start_date - 1;


      /*
       * The Gregorian year/month of the last day
       * is the DB period key.
       */
      IF EXTRACT(YEAR FROM v_period_end)::integer = p_year
         AND EXTRACT(MONTH FROM v_period_end)::integer = p_month
      THEN

        RETURN QUERY
        SELECT
          v_start_date,
          v_next_start_date,
          v_jy::smallint,
          v_jm::smallint;

        RETURN;

      END IF;

    END LOOP;

  END LOOP;


  RAISE EXCEPTION
    'Could not resolve Gregorian period key %/% to a Jalali month.',
    p_year,
    p_month;

END;
$function$;


-- =========================================================
-- 3. Refresh monthly progress
--
-- IMPORTANT:
--   The parameters p_year/p_month are DB Gregorian period keys.
--
--   Example:
--     p_year  = 2026
--     p_month = 9
--
--   means:
--     Jalali 1405/06
--     2026-08-23 <= order_date < 2026-09-23
-- =========================================================

CREATE OR REPLACE FUNCTION public.refresh_monthly_progress(
  p_company_id uuid,
  p_user_id uuid,
  p_region_id uuid,
  p_year smallint,
  p_month smallint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_achieved numeric(14, 4);
  v_order_count integer;
  v_target numeric(14, 4);

  v_period_start date;
  v_period_end date;
BEGIN

  /*
   * Resolve the Gregorian DB period key
   * to the real Jalali month boundaries.
   *
   * Example:
   *   2026/9
   *   -> 2026-08-23 <= order_date < 2026-09-23
   */

  SELECT
    b.start_date,
    b.end_date
  INTO
    v_period_start,
    v_period_end
  FROM public.get_jalali_period_bounds_from_gregorian_key(
    p_year,
    p_month
  ) b;


  -- =======================================================
  -- Confirmed orders
  -- =======================================================

  SELECT
    COALESCE(SUM(o.total_tonnage), 0),
    COUNT(*)::integer
  INTO
    v_achieved,
    v_order_count
  FROM public.orders o
  JOIN public.customers c
    ON c.id = o.customer_id
   AND c.deleted_at IS NULL
  JOIN public.cities ci
    ON ci.id = c.city_id
   AND ci.deleted_at IS NULL
  WHERE o.company_id = p_company_id
    AND o.sales_user_id = p_user_id
    AND o.deleted_at IS NULL
    AND o.status = 'confirmed'
    AND o.order_date >= v_period_start
    AND o.order_date < v_period_end
    AND (
      p_region_id IS NULL
      OR ci.region_id = p_region_id
    );


  -- =======================================================
  -- Target
  -- =======================================================

  IF p_region_id IS NULL THEN

    /*
     * Overall target:
     * sum of all region targets for this user/period.
     */

    SELECT
      COALESCE(
        SUM(mt.target_tonnage),
        0
      )
    INTO v_target
    FROM public.monthly_targets mt
    WHERE mt.company_id = p_company_id
      AND mt.user_id = p_user_id
      AND mt.target_year = p_year
      AND mt.target_month = p_month
      AND mt.deleted_at IS NULL;

  ELSE

    /*
     * Regional target:
     * target of this specific region.
     */

    SELECT
      COALESCE(
        SUM(mt.target_tonnage),
        0
      )
    INTO v_target
    FROM public.monthly_targets mt
    WHERE mt.company_id = p_company_id
      AND mt.user_id = p_user_id
      AND mt.region_id = p_region_id
      AND mt.target_year = p_year
      AND mt.target_month = p_month
      AND mt.deleted_at IS NULL;

  END IF;


  v_target := COALESCE(
    v_target,
    0
  );


  -- =======================================================
  -- Update existing progress
  -- =======================================================

  UPDATE public.monthly_progress mp
  SET
    achieved_tonnage = v_achieved,
    target_tonnage = v_target,
    order_count = v_order_count,
    last_calculated_at = timezone(
      'utc',
      now()
    ),
    updated_at = timezone(
      'utc',
      now()
    )
  WHERE mp.company_id = p_company_id
    AND mp.user_id = p_user_id
    AND mp.progress_year = p_year
    AND mp.progress_month = p_month
    AND (
      (
        p_region_id IS NULL
        AND mp.region_id IS NULL
      )
      OR mp.region_id = p_region_id
    )
    AND mp.deleted_at IS NULL;


  -- =======================================================
  -- Insert if missing
  -- =======================================================

  IF NOT FOUND THEN

    INSERT INTO public.monthly_progress (
      company_id,
      user_id,
      region_id,
      progress_year,
      progress_month,
      achieved_tonnage,
      target_tonnage,
      order_count,
      last_calculated_at
    )
    VALUES (
      p_company_id,
      p_user_id,
      p_region_id,
      p_year,
      p_month,
      v_achieved,
      v_target,
      v_order_count,
      timezone(
        'utc',
        now()
      )
    );

  END IF;

END;
$function$;


-- =========================================================
-- 4. Refresh progress context for an order
-- =========================================================

CREATE OR REPLACE FUNCTION public.refresh_order_monthly_progress_context(
  p_company_id uuid,
  p_sales_user_id uuid,
  p_customer_id uuid,
  p_order_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_region_id uuid;

  v_progress_year smallint;
  v_progress_month smallint;
BEGIN

  IF p_company_id IS NULL
     OR p_sales_user_id IS NULL
     OR p_order_date IS NULL
  THEN
    RETURN;
  END IF;


  /*
   * Determine the DB Gregorian period key
   * from the actual order date.
   */

  SELECT
    period.progress_year,
    period.progress_month
  INTO
    v_progress_year,
    v_progress_month
  FROM public.get_order_target_period(
    p_order_date
  ) period;


  IF v_progress_year IS NULL
     OR v_progress_month IS NULL
  THEN
    RETURN;
  END IF;


  -- =======================================================
  -- Overall progress
  -- =======================================================

  PERFORM public.refresh_monthly_progress(
    p_company_id,
    p_sales_user_id,
    NULL::uuid,
    v_progress_year,
    v_progress_month
  );


  -- =======================================================
  -- Regional progress
  -- =======================================================

  IF p_customer_id IS NOT NULL THEN

    SELECT
      ci.region_id
    INTO v_region_id
    FROM public.customers c
    JOIN public.cities ci
      ON ci.id = c.city_id
     AND ci.deleted_at IS NULL
    WHERE c.id = p_customer_id
      AND c.deleted_at IS NULL
    LIMIT 1;


    IF v_region_id IS NOT NULL THEN

      PERFORM public.refresh_monthly_progress(
        p_company_id,
        p_sales_user_id,
        v_region_id,
        v_progress_year,
        v_progress_month
      );

    END IF;

  END IF;

END;
$function$;


-- =========================================================
-- 5. Order trigger function
--
-- INSERT:
--   refresh new order period
--
-- DELETE:
--   refresh old order period
--
-- UPDATE:
--   refresh old context
--   refresh new context
--
-- This is important when:
--   - status changes
--   - tonnage changes
--   - date changes
--   - customer changes
--   - sales user changes
--   - company changes
-- =========================================================

CREATE OR REPLACE FUNCTION public.trg_orders_refresh_monthly_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN

  -- =======================================================
  -- DELETE
  -- =======================================================

  IF TG_OP = 'DELETE' THEN

    PERFORM public.refresh_order_monthly_progress_context(
      OLD.company_id,
      OLD.sales_user_id,
      OLD.customer_id,
      OLD.order_date::date
    );

    RETURN OLD;

  END IF;


  -- =======================================================
  -- INSERT
  -- =======================================================

  IF TG_OP = 'INSERT' THEN

    PERFORM public.refresh_order_monthly_progress_context(
      NEW.company_id,
      NEW.sales_user_id,
      NEW.customer_id,
      NEW.order_date::date
    );

    RETURN NEW;

  END IF;


  -- =======================================================
  -- UPDATE
  -- =======================================================

  /*
   * Refresh old context first.
   *
   * This removes the old contribution if, for example:
   *   - status changed from confirmed to draft
   *   - date changed
   *   - customer/region changed
   *   - sales user changed
   */

  PERFORM public.refresh_order_monthly_progress_context(
    OLD.company_id,
    OLD.sales_user_id,
    OLD.customer_id,
    OLD.order_date::date
  );


  /*
   * Refresh new context.
   *
   * This adds the new contribution if, for example:
   *   - status changed to confirmed
   *   - date changed
   *   - customer/region changed
   *   - sales user changed
   */

  PERFORM public.refresh_order_monthly_progress_context(
    NEW.company_id,
    NEW.sales_user_id,
    NEW.customer_id,
    NEW.order_date::date
  );


  RETURN NEW;

END;
$function$;


-- =========================================================
-- 6. Recreate order trigger
-- =========================================================

DROP TRIGGER IF EXISTS trg_orders_refresh_monthly_progress
ON public.orders;


CREATE TRIGGER trg_orders_refresh_monthly_progress
AFTER INSERT OR DELETE OR UPDATE
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_orders_refresh_monthly_progress();
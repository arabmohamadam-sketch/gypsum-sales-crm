-- =========================================================
-- Gypsum Sales CRM
-- Monthly progress must require loading confirmation
--
-- Business rule:
--   confirmed order        -> NOT counted
--   issued waybill         -> NOT counted
--   loading confirmed      -> COUNTED
--   loading cancelled      -> NOT counted
--
-- Progress is calculated from:
--   waybills.status = loading_confirmed
--   + waybill_items.tonnage
--
-- Jalali month boundaries are still resolved through the
-- existing Gregorian DB period-key functions.
-- =========================================================


-- =========================================================
-- 1. Index for loading-confirmed waybills
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_waybills_loading_confirmed_order
  ON public.waybills (
    company_id,
    order_id
  )
  WHERE deleted_at IS NULL
    AND status = 'loading_confirmed';


-- =========================================================
-- 2. Monthly progress calculation
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
   * Resolve Gregorian DB period key
   * to the actual Jalali month bounds.
   *
   * Example:
   *   2026/09
   *   -> 1405/06
   *   -> 2026-08-23 <= date < 2026-09-23
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
  -- Achieved sales
  --
  -- IMPORTANT:
  -- Only waybills whose loading is confirmed count.
  -- Tonnage comes from waybill_items.
  -- =======================================================

  SELECT
    COALESCE(
      SUM(wi.tonnage),
      0
    ),
    COUNT(
      DISTINCT w.order_id
    )::integer
  INTO
    v_achieved,
    v_order_count
  FROM public.waybills w
  JOIN public.orders o
    ON o.id = w.order_id
   AND o.company_id = w.company_id
   AND o.deleted_at IS NULL
  JOIN public.customers c
    ON c.id = o.customer_id
   AND c.deleted_at IS NULL
  JOIN public.cities ci
    ON ci.id = c.city_id
   AND ci.deleted_at IS NULL
  JOIN public.waybill_items wi
    ON wi.waybill_id = w.id
   AND wi.company_id = w.company_id
   AND wi.deleted_at IS NULL
  WHERE w.company_id = p_company_id
    AND w.deleted_at IS NULL
    AND w.status = 'loading_confirmed'
    AND o.sales_user_id = p_user_id
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
     * sum of all regional targets for this user/period.
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
     * Regional target.
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
-- 3. Waybill progress trigger
-- =========================================================
--
-- Any waybill INSERT / UPDATE / DELETE can affect progress.
--
-- Especially:
--   issued -> loading_confirmed
--   loading_confirmed -> cancelled
--   loading_confirmed -> another context
-- =========================================================

CREATE OR REPLACE FUNCTION public.trg_waybills_refresh_monthly_progress()
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
      (
        SELECT o.sales_user_id
        FROM public.orders o
        WHERE o.id = OLD.order_id
      ),
      (
        SELECT o.customer_id
        FROM public.orders o
        WHERE o.id = OLD.order_id
      ),
      (
        SELECT o.order_date
        FROM public.orders o
        WHERE o.id = OLD.order_id
      )
    );

    RETURN OLD;

  END IF;


  -- =======================================================
  -- INSERT
  -- =======================================================

  IF TG_OP = 'INSERT' THEN

    PERFORM public.refresh_order_monthly_progress_context(
      NEW.company_id,
      (
        SELECT o.sales_user_id
        FROM public.orders o
        WHERE o.id = NEW.order_id
      ),
      (
        SELECT o.customer_id
        FROM public.orders o
        WHERE o.id = NEW.order_id
      ),
      (
        SELECT o.order_date
        FROM public.orders o
        WHERE o.id = NEW.order_id
      )
    );

    RETURN NEW;

  END IF;


  -- =======================================================
  -- UPDATE
  -- =======================================================

  /*
   * Refresh old context.
   * This is required when a loading-confirmed waybill
   * becomes cancelled or moves to another order.
   */

  PERFORM public.refresh_order_monthly_progress_context(
    OLD.company_id,
    (
      SELECT o.sales_user_id
      FROM public.orders o
      WHERE o.id = OLD.order_id
    ),
    (
      SELECT o.customer_id
      FROM public.orders o
      WHERE o.id = OLD.order_id
    ),
    (
      SELECT o.order_date
      FROM public.orders o
      WHERE o.id = OLD.order_id
    )
  );


  /*
   * Refresh new context.
   */

  PERFORM public.refresh_order_monthly_progress_context(
    NEW.company_id,
    (
      SELECT o.sales_user_id
      FROM public.orders o
      WHERE o.id = NEW.order_id
    ),
    (
      SELECT o.customer_id
      FROM public.orders o
      WHERE o.id = NEW.order_id
    ),
    (
      SELECT o.order_date
      FROM public.orders o
      WHERE o.id = NEW.order_id
    )
  );

  RETURN NEW;

END;
$function$;


DROP TRIGGER IF EXISTS trg_waybills_refresh_monthly_progress
  ON public.waybills;


CREATE TRIGGER trg_waybills_refresh_monthly_progress
  AFTER INSERT OR UPDATE OR DELETE
  ON public.waybills
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_waybills_refresh_monthly_progress();


-- =========================================================
-- 4. Backfill existing monthly progress
-- =========================================================
--
-- Recalculate all existing progress rows using the NEW rule.
-- This removes any previously counted confirmed orders
-- that have not reached loading confirmation.
-- =========================================================

DO $$
DECLARE
  r record;
BEGIN

  -- Existing regional/overall progress rows
  FOR r IN
    SELECT DISTINCT
      company_id,
      user_id,
      region_id,
      progress_year,
      progress_month
    FROM public.monthly_progress
    WHERE deleted_at IS NULL
  LOOP

    PERFORM public.refresh_monthly_progress(
      r.company_id,
      r.user_id,
      r.region_id,
      r.progress_year,
      r.progress_month
    );

  END LOOP;


  -- Ensure progress rows exist for all active targets
  FOR r IN
    SELECT DISTINCT
      mt.company_id,
      mt.user_id,
      mt.target_year,
      mt.target_month
    FROM public.monthly_targets mt
    WHERE mt.deleted_at IS NULL
  LOOP

    PERFORM public.refresh_monthly_progress(
      r.company_id,
      r.user_id,
      NULL::uuid,
      r.target_year,
      r.target_month
    );

  END LOOP;


  -- Regional target rows
  FOR r IN
    SELECT DISTINCT
      mt.company_id,
      mt.user_id,
      mt.region_id,
      mt.target_year,
      mt.target_month
    FROM public.monthly_targets mt
    WHERE mt.deleted_at IS NULL
      AND mt.region_id IS NOT NULL
  LOOP

    PERFORM public.refresh_monthly_progress(
      r.company_id,
      r.user_id,
      r.region_id,
      r.target_year,
      r.target_month
    );

  END LOOP;

END;
$$;


-- =========================================================
-- 5. Documentation
-- =========================================================

COMMENT ON FUNCTION public.refresh_monthly_progress(
  uuid,
  uuid,
  uuid,
  smallint,
  smallint
) IS
  'Calculates monthly sales progress only from waybills with loading_confirmed status; tonnage is summed from waybill_items.';

-- =============================================================================
-- Gypsum Sales CRM
-- Jalali monthly targets + monthly progress
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1) Jalali calendar helpers
-- =============================================================================

CREATE OR REPLACE FUNCTION public.jalali_to_gregorian_date(
  p_jalali_year integer,
  p_jalali_month integer,
  p_jalali_day integer
)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  v_jy integer;
  v_days integer;
  v_gy integer;
  v_gm integer;
  v_gd integer;
  v_month_days integer[];
BEGIN
  IF p_jalali_month < 1
     OR p_jalali_month > 12 THEN
    RAISE EXCEPTION
      'Invalid Jalali month: %',
      p_jalali_month;
  END IF;

  IF p_jalali_day < 1 THEN
    RAISE EXCEPTION
      'Invalid Jalali day: %',
      p_jalali_day;
  END IF;

  -- Jalali -> Gregorian conversion.
  v_jy := p_jalali_year + 1595;

  v_days :=
      -355668
      + (365 * v_jy)
      + ((v_jy / 33) * 8)
      + (((v_jy % 33 + 3) / 4))
      + p_jalali_day
      + CASE
          WHEN p_jalali_month < 7
            THEN (p_jalali_month - 1) * 31
          ELSE
            ((p_jalali_month - 7) * 30) + 186
        END;

  v_gy := 400 * (v_days / 146097);
  v_days := v_days % 146097;

  IF v_days > 36524 THEN
    v_gy := v_gy + ((v_days - 1) / 36524);
    v_days := (v_days - 1) % 36524;

    IF v_days >= 365 THEN
      v_days := v_days + 1;
    END IF;
  END IF;

  v_gy := v_gy + (4 * (v_days / 1461));
  v_days := v_days % 1461;

  IF v_days > 365 THEN
    v_gy := v_gy + ((v_days - 1) / 365);
    v_days := (v_days - 1) % 365;
  END IF;

  v_gd := v_days + 1;

  v_month_days := ARRAY[
    31,
    CASE
      WHEN (v_gy % 4 = 0 AND (v_gy % 100 <> 0 OR v_gy % 400 = 0))
        THEN 29
      ELSE 28
    END,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31
  ];

  v_gm := 1;

  WHILE v_gm <= 12
    AND v_gd > v_month_days[v_gm]
  LOOP
    v_gd := v_gd - v_month_days[v_gm];
    v_gm := v_gm + 1;
  END LOOP;

  IF v_gm > 12 THEN
    RAISE EXCEPTION
      'Invalid converted Gregorian date for Jalali %/%/%',
      p_jalali_year,
      p_jalali_month,
      p_jalali_day;
  END IF;

  RETURN make_date(
    v_gy,
    v_gm,
    v_gd
  );
END;
$$;


CREATE OR REPLACE FUNCTION public.gregorian_to_jalali_date(
  p_gregorian_date date
)
RETURNS TABLE (
  jalali_year integer,
  jalali_month integer,
  jalali_day integer
)
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  v_gy integer;
  v_gm integer;
  v_gd integer;

  v_g_day_no integer;
  v_g_year integer;
  v_days_in_month integer[];

  v_j_day_no integer;
  v_j_year integer;
  v_j_month integer;
  v_j_day integer;
BEGIN
  v_gy := EXTRACT(
    YEAR FROM p_gregorian_date
  )::integer;

  v_gm := EXTRACT(
    MONTH FROM p_gregorian_date
  )::integer;

  v_gd := EXTRACT(
    DAY FROM p_gregorian_date
  )::integer;

  v_days_in_month := ARRAY[
    31,
    CASE
      WHEN (v_gy % 4 = 0 AND (v_gy % 100 <> 0 OR v_gy % 400 = 0))
        THEN 29
      ELSE 28
    END,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31
  ];

  /*
   * Convert Gregorian to day number relative to 1600-01-01.
   */
  v_g_day_no :=
      365 * (v_gy - 1600)
      + ((v_gy - 1601) / 4)
      - ((v_gy - 1601) / 100)
      + ((v_gy - 1600 + 399) / 400);

  FOR v_gm_index IN 1 .. (v_gm - 1)
  LOOP
    v_g_day_no :=
      v_g_day_no
      + v_days_in_month[v_gm_index];
  END LOOP;

  v_g_day_no :=
    v_g_day_no + v_gd - 1;

  /*
   * Jalali epoch conversion.
   */
  v_j_day_no :=
    v_g_day_no - 79;

  v_j_year :=
    979
    + (33 * (v_j_day_no / 12053));

  v_j_day_no :=
    v_j_day_no % 12053;

  v_j_year :=
    v_j_year
    + (4 * (v_j_day_no / 1461));

  v_j_day_no :=
    v_j_day_no % 1461;

  IF v_j_day_no >= 366 THEN
    v_j_year :=
      v_j_year
      + ((v_j_day_no - 1) / 365);

    v_j_day_no :=
      (v_j_day_no - 1) % 365;
  END IF;

  IF v_j_day_no < 186 THEN
    v_j_month :=
      1 + (v_j_day_no / 31);

    v_j_day :=
      1 + (v_j_day_no % 31);
  ELSE
    v_j_month :=
      7 + ((v_j_day_no - 186) / 30);

    v_j_day :=
      1 + ((v_j_day_no - 186) % 30);
  END IF;

  jalali_year := v_j_year;
  jalali_month := v_j_month;
  jalali_day := v_j_day;

  RETURN NEXT;
END;
$$;


CREATE OR REPLACE FUNCTION public.jalali_month_start_date(
  p_jalali_year integer,
  p_jalali_month integer
)
RETURNS date
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT public.jalali_to_gregorian_date(
    p_jalali_year,
    p_jalali_month,
    1
  );
$$;


CREATE OR REPLACE FUNCTION public.jalali_next_month_start_date(
  p_jalali_year integer,
  p_jalali_month integer
)
RETURNS date
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT public.jalali_to_gregorian_date(
    CASE
      WHEN p_jalali_month = 12
        THEN p_jalali_year + 1
      ELSE p_jalali_year
    END,
    CASE
      WHEN p_jalali_month = 12
        THEN 1
      ELSE p_jalali_month + 1
    END,
    1
  );
$$;


-- =============================================================================
-- 2) Change year constraints from Gregorian to Jalali
-- =============================================================================

ALTER TABLE public.monthly_targets
  DROP CONSTRAINT IF EXISTS monthly_targets_year_valid;

ALTER TABLE public.monthly_progress
  DROP CONSTRAINT IF EXISTS monthly_progress_year_valid;


-- =============================================================================
-- 3) Convert existing monthly target periods from Gregorian to Jalali
--
-- Existing records were stored as Gregorian year/month.
-- We interpret each existing month by its first Gregorian day
-- and migrate it to the corresponding Jalali month.
--
-- Example:
--   2026/9 -> 1405/6
-- =============================================================================

UPDATE public.monthly_targets
SET
  target_year = gj.jalali_year,
  target_month = gj.jalali_month
FROM LATERAL (
  SELECT *
  FROM public.gregorian_to_jalali_date(
    make_date(
      target_year::integer,
      target_month::integer,
      1
    )
  )
) AS gj
WHERE target_year BETWEEN 2020 AND 2100
  AND target_month BETWEEN 1 AND 12;


UPDATE public.monthly_progress
SET
  progress_year = gj.jalali_year,
  progress_month = gj.jalali_month
FROM LATERAL (
  SELECT *
  FROM public.gregorian_to_jalali_date(
    make_date(
      progress_year::integer,
      progress_month::integer,
      1
    )
  )
) AS gj
WHERE progress_year BETWEEN 2020 AND 2100
  AND progress_month BETWEEN 1 AND 12;


-- =============================================================================
-- 4) Re-add Jalali constraints
-- =============================================================================

ALTER TABLE public.monthly_targets
  ADD CONSTRAINT monthly_targets_year_valid
  CHECK (
    target_year BETWEEN 1200 AND 1600
  );


ALTER TABLE public.monthly_targets
  ADD CONSTRAINT monthly_targets_month_valid
  CHECK (
    target_month BETWEEN 1 AND 12
  );


ALTER TABLE public.monthly_progress
  ADD CONSTRAINT monthly_progress_year_valid
  CHECK (
    progress_year BETWEEN 1200 AND 1600
  );


ALTER TABLE public.monthly_progress
  ADD CONSTRAINT monthly_progress_month_valid
  CHECK (
    progress_month BETWEEN 1 AND 12
  );


-- =============================================================================
-- 5) Rebuild monthly progress calculation using Jalali month boundaries
--
-- Example:
--   1405/06
--   start = 2026-08-23
--   next  = 2026-09-23
--
-- Orders are included with:
--   order_date >= start
--   order_date < next_start
-- =============================================================================

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
SET search_path = public
AS $$
DECLARE
  v_achieved numeric(14, 4);
  v_order_count integer;
  v_target numeric(14, 4);

  v_start_date date;
  v_next_start_date date;
BEGIN
  IF p_year < 1200
     OR p_year > 1600 THEN
    RAISE EXCEPTION
      'Invalid Jalali year: %',
      p_year;
  END IF;

  IF p_month < 1
     OR p_month > 12 THEN
    RAISE EXCEPTION
      'Invalid Jalali month: %',
      p_month;
  END IF;

  v_start_date :=
    public.jalali_month_start_date(
      p_year,
      p_month
    );

  v_next_start_date :=
    public.jalali_next_month_start_date(
      p_year,
      p_month
    );

  /*
   * Calculate actual confirmed sales
   * for the real Jalali month date range.
   */
  SELECT
    COALESCE(
      SUM(o.total_tonnage),
      0
    ),
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
    AND o.order_date >= v_start_date
    AND o.order_date < v_next_start_date
    AND (
      p_region_id IS NULL
      OR ci.region_id = p_region_id
    );

  /*
   * Get target for exactly the same
   * Jalali year/month and region scope.
   */
  SELECT
    mt.target_tonnage
  INTO
    v_target
  FROM public.monthly_targets mt
  WHERE mt.company_id = p_company_id
    AND mt.user_id = p_user_id
    AND mt.target_year = p_year
    AND mt.target_month = p_month
    AND (
      (
        p_region_id IS NULL
        AND mt.region_id IS NULL
      )
      OR mt.region_id = p_region_id
    )
    AND mt.deleted_at IS NULL
  LIMIT 1;

  v_target :=
    COALESCE(
      v_target,
      0
    );

  /*
   * Update existing progress.
   */
  UPDATE public.monthly_progress mp
  SET
    achieved_tonnage =
      v_achieved,

    target_tonnage =
      v_target,

    order_count =
      v_order_count,

    last_calculated_at =
      timezone(
        'utc',
        now()
      ),

    updated_at =
      timezone(
        'utc',
        now()
      )
  WHERE mp.company_id =
        p_company_id

    AND mp.user_id =
        p_user_id

    AND mp.progress_year =
        p_year

    AND mp.progress_month =
        p_month

    AND (
      (
        p_region_id IS NULL
        AND mp.region_id IS NULL
      )
      OR mp.region_id = p_region_id
    )

    AND mp.deleted_at IS NULL;


  /*
   * Create missing progress row.
   */
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
$$;


-- =============================================================================
-- 6) Helper to refresh global + region-specific scopes for an order
-- =============================================================================

CREATE OR REPLACE FUNCTION public.refresh_order_monthly_progress_scopes(
  p_company_id uuid,
  p_sales_user_id uuid,
  p_customer_id uuid,
  p_order_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jalali_year smallint;
  v_jalali_month smallint;
  v_region_id uuid;
BEGIN
  IF p_company_id IS NULL
     OR p_sales_user_id IS NULL
     OR p_order_date IS NULL THEN
    RETURN;
  END IF;

  SELECT
    gj.jalali_year::smallint,
    gj.jalali_month::smallint
  INTO
    v_jalali_year,
    v_jalali_month
  FROM public.gregorian_to_jalali_date(
    p_order_date
  ) AS gj;

  /*
   * Always refresh global progress.
   */
  PERFORM public.refresh_monthly_progress(
    p_company_id,
    p_sales_user_id,
    NULL,
    v_jalali_year,
    v_jalali_month
  );

  /*
   * Resolve customer's current region.
   */
  SELECT
    ci.region_id
  INTO
    v_region_id
  FROM public.customers c
  JOIN public.cities ci
    ON ci.id = c.city_id
    AND ci.deleted_at IS NULL
  WHERE c.id = p_customer_id
    AND c.deleted_at IS NULL
  LIMIT 1;

  /*
   * Refresh region-specific progress.
   */
  IF v_region_id IS NOT NULL THEN
    PERFORM public.refresh_monthly_progress(
      p_company_id,
      p_sales_user_id,
      v_region_id,
      v_jalali_year,
      v_jalali_month
    );
  END IF;
END;
$$;


-- =============================================================================
-- 7) Order trigger
--
-- Handles:
--   INSERT
--   DELETE
--   UPDATE
--
-- UPDATE is especially important because an order can change:
--   customer
--   sales_user
--   date
--   status
--   tonnage
--
-- Therefore both OLD and NEW scopes are refreshed.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_orders_refresh_monthly_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  /*
   * DELETE
   */
  IF TG_OP = 'DELETE' THEN

    PERFORM public.refresh_order_monthly_progress_scopes(
      OLD.company_id,
      OLD.sales_user_id,
      OLD.customer_id,
      OLD.order_date
    );

    RETURN OLD;
  END IF;


  /*
   * UPDATE
   *
   * Refresh OLD scope first so that if the order moves
   * to another customer, salesperson, region, date or status,
   * the previous progress is recalculated.
   */
  IF TG_OP = 'UPDATE' THEN

    PERFORM public.refresh_order_monthly_progress_scopes(
      OLD.company_id,
      OLD.sales_user_id,
      OLD.customer_id,
      OLD.order_date
    );

  END IF;


  /*
   * INSERT + UPDATE
   *
   * Refresh NEW scope.
   */
  PERFORM public.refresh_order_monthly_progress_scopes(
    NEW.company_id,
    NEW.sales_user_id,
    NEW.customer_id,
    NEW.order_date
  );

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS
  trg_orders_refresh_monthly_progress
ON public.orders;


CREATE TRIGGER
  trg_orders_refresh_monthly_progress
AFTER INSERT OR UPDATE OR DELETE
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION
  public.trg_orders_refresh_monthly_progress();


-- =============================================================================
-- 8) Target trigger
--
-- Target changes also refresh the corresponding progress.
-- This version handles INSERT / UPDATE / DELETE and old/new scopes.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_monthly_targets_refresh_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  /*
   * DELETE
   */
  IF TG_OP = 'DELETE' THEN

    PERFORM public.refresh_monthly_progress(
      OLD.company_id,
      OLD.user_id,
      OLD.region_id,
      OLD.target_year,
      OLD.target_month
    );

    RETURN OLD;
  END IF;


  /*
   * UPDATE
   *
   * Refresh old scope before applying new scope.
   */
  IF TG_OP = 'UPDATE' THEN

    PERFORM public.refresh_monthly_progress(
      OLD.company_id,
      OLD.user_id,
      OLD.region_id,
      OLD.target_year,
      OLD.target_month
    );

  END IF;


  /*
   * INSERT + UPDATE
   */
  PERFORM public.refresh_monthly_progress(
    NEW.company_id,
    NEW.user_id,
    NEW.region_id,
    NEW.target_year,
    NEW.target_month
  );

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS
  trg_monthly_targets_refresh_progress
ON public.monthly_targets;


CREATE TRIGGER
  trg_monthly_targets_refresh_progress
AFTER INSERT OR UPDATE OR DELETE
ON public.monthly_targets
FOR EACH ROW
EXECUTE FUNCTION
  public.trg_monthly_targets_refresh_progress();


-- =============================================================================
-- 9) Recalculate all active monthly progress rows
--
-- Existing progress values may have been calculated under the old
-- Gregorian-month logic. Recalculate them using the new Jalali boundaries.
-- =============================================================================

DO $$
DECLARE
  v_row RECORD;
BEGIN

  FOR v_row IN
    SELECT
      mp.company_id,
      mp.user_id,
      mp.region_id,
      mp.progress_year::smallint AS progress_year,
      mp.progress_month::smallint AS progress_month
    FROM public.monthly_progress mp
    WHERE mp.deleted_at IS NULL
  LOOP

    PERFORM public.refresh_monthly_progress(
      v_row.company_id,
      v_row.user_id,
      v_row.region_id,
      v_row.progress_year,
      v_row.progress_month
    );

  END LOOP;

END;
$$;


-- =============================================================================
-- 10) Recalculate targets that have no progress row yet
-- =============================================================================

DO $$
DECLARE
  v_row RECORD;
BEGIN

  FOR v_row IN
    SELECT
      mt.company_id,
      mt.user_id,
      mt.region_id,
      mt.target_year::smallint AS target_year,
      mt.target_month::smallint AS target_month
    FROM public.monthly_targets mt
    WHERE mt.deleted_at IS NULL
  LOOP

    PERFORM public.refresh_monthly_progress(
      v_row.company_id,
      v_row.user_id,
      v_row.region_id,
      v_row.target_year,
      v_row.target_month
    );

  END LOOP;

END;
$$;


-- =============================================================================
-- 11) Comments
-- =============================================================================

COMMENT ON FUNCTION public.jalali_to_gregorian_date(
  integer,
  integer,
  integer
)
IS
  'Converts a Jalali date to Gregorian date.';


COMMENT ON FUNCTION public.gregorian_to_jalali_date(
  date
)
IS
  'Converts a Gregorian date to Jalali date.';


COMMENT ON FUNCTION public.refresh_monthly_progress(
  uuid,
  uuid,
  uuid,
  smallint,
  smallint
)
IS
  'Calculates monthly sales progress using Jalali calendar month boundaries and region-aware confirmed orders.';


COMMENT ON FUNCTION public.trg_orders_refresh_monthly_progress()
IS
  'Refreshes global and region-specific monthly sales progress whenever an order is inserted, updated or deleted.';


COMMIT;
BEGIN;

-- ============================================================
-- 1) Jalali -> Gregorian
-- ============================================================

CREATE OR REPLACE FUNCTION public.jalali_to_gregorian_date(
  p_jy integer,
  p_jm integer,
  p_jd integer
)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  v_jy integer;
  v_jm integer;
  v_jd integer;

  v_j_day_no integer;
  v_g_day_no integer;

  v_gy integer;
  v_gm integer;
  v_gd integer;

  v_i integer;
  v_g_month_days integer[];
BEGIN
  IF p_jm < 1 OR p_jm > 12 THEN
    RAISE EXCEPTION
      'Invalid Jalali month: %',
      p_jm;
  END IF;

  IF p_jd < 1 OR p_jd > 31 THEN
    RAISE EXCEPTION
      'Invalid Jalali day: %',
      p_jd;
  END IF;

  v_jy := p_jy - 979;
  v_jm := p_jm - 1;
  v_jd := p_jd - 1;

  v_j_day_no :=
      365 * v_jy
      + (v_jy / 33) * 8
      + ((v_jy % 33 + 3) / 4);

  IF v_jm < 6 THEN
    v_j_day_no :=
      v_j_day_no
      + v_jm * 31;
  ELSE
    v_j_day_no :=
      v_j_day_no
      + 186
      + (v_jm - 6) * 30;
  END IF;

  v_j_day_no :=
    v_j_day_no + v_jd;

  v_g_day_no :=
    v_j_day_no + 79;

  v_gy :=
    1600
    + 400 * (v_g_day_no / 146097);

  v_g_day_no :=
    v_g_day_no % 146097;

  IF v_g_day_no >= 36525 THEN
    v_g_day_no :=
      v_g_day_no - 1;

    v_gy :=
      v_gy
      + 100 * (v_g_day_no / 36524);

    v_g_day_no :=
      v_g_day_no % 36524;

    IF v_g_day_no >= 365 THEN
      v_g_day_no :=
        v_g_day_no + 1;
    END IF;
  END IF;

  v_gy :=
    v_gy
    + 4 * (v_g_day_no / 1461);

  v_g_day_no :=
    v_g_day_no % 1461;

  IF v_g_day_no >= 366 THEN
    v_gy :=
      v_gy
      + ((v_g_day_no - 1) / 365);

    v_g_day_no :=
      (v_g_day_no - 1) % 365;
  END IF;

  v_g_month_days := ARRAY[
    31,
    CASE
      WHEN (
        v_gy % 4 = 0
        AND (
          v_gy % 100 <> 0
          OR v_gy % 400 = 0
        )
      )
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
  v_gd := v_g_day_no + 1;

  FOR v_i IN 1..12 LOOP
    EXIT WHEN v_gd <= v_g_month_days[v_i];

    v_gd :=
      v_gd
      - v_g_month_days[v_i];

    v_gm :=
      v_gm + 1;
  END LOOP;

  RETURN make_date(
    v_gy,
    v_gm,
    v_gd
  );
END;
$$;


-- ============================================================
-- 2) Gregorian -> Jalali
-- ============================================================

CREATE OR REPLACE FUNCTION public.gregorian_to_jalali_date(
  p_gdate date
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
  v_j_day_no integer;

  v_jy integer;
  v_jm integer;
  v_jd integer;

  v_i integer;
  v_g_month_days integer[];
BEGIN
  v_gy :=
    EXTRACT(
      YEAR FROM p_gdate
    )::integer;

  v_gm :=
    EXTRACT(
      MONTH FROM p_gdate
    )::integer;

  v_gd :=
    EXTRACT(
      DAY FROM p_gdate
    )::integer;

  v_g_month_days := ARRAY[
    31,
    CASE
      WHEN (
        v_gy % 4 = 0
        AND (
          v_gy % 100 <> 0
          OR v_gy % 400 = 0
        )
      )
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

  v_g_day_no :=
      365 * (v_gy - 1600)
      + ((v_gy - 1600 + 3) / 4)
      - ((v_gy - 1600 + 99) / 100)
      + ((v_gy - 1600 + 399) / 400);

  IF v_gm > 1 THEN
    FOR v_i IN 1..(v_gm - 1) LOOP
      v_g_day_no :=
        v_g_day_no
        + v_g_month_days[v_i];
    END LOOP;
  END IF;

  v_g_day_no :=
    v_g_day_no + v_gd - 1;

  v_j_day_no :=
    v_g_day_no - 79;

  v_jy :=
    979
    + 33 * (v_j_day_no / 12053);

  v_j_day_no :=
    v_j_day_no % 12053;

  v_jy :=
    v_jy
    + 4 * (v_j_day_no / 1461);

  v_j_day_no :=
    v_j_day_no % 1461;

  IF v_j_day_no >= 366 THEN
    v_jy :=
      v_jy
      + ((v_j_day_no - 1) / 365);

    v_j_day_no :=
      (v_j_day_no - 1) % 365;
  END IF;

  IF v_j_day_no < 186 THEN
    v_jm :=
      1
      + (v_j_day_no / 31);

    v_jd :=
      1
      + (v_j_day_no % 31);
  ELSE
    v_jm :=
      7
      + ((v_j_day_no - 186) / 30);

    v_jd :=
      1
      + ((v_j_day_no - 186) % 30);
  END IF;

  jalali_year :=
    v_jy;

  jalali_month :=
    v_jm;

  jalali_day :=
    v_jd;

  RETURN NEXT;
END;
$$;


-- ============================================================
-- 3) Helper: start of a Jalali month
-- ============================================================

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


-- ============================================================
-- 4) Helper: start of next Jalali month
-- ============================================================

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


-- ============================================================
-- 5) Remove old Gregorian constraints
-- ============================================================

ALTER TABLE public.monthly_targets
  DROP CONSTRAINT IF EXISTS monthly_targets_year_valid;

ALTER TABLE public.monthly_targets
  DROP CONSTRAINT IF EXISTS monthly_targets_month_valid;

ALTER TABLE public.monthly_progress
  DROP CONSTRAINT IF EXISTS monthly_progress_year_valid;

ALTER TABLE public.monthly_progress
  DROP CONSTRAINT IF EXISTS monthly_progress_month_valid;


-- ============================================================
-- 6) Convert existing target data
--
-- Current data:
--   2026 / 8
--
-- These two existing targets are for:
--   شهریور ۱۴۰۵
--
-- Therefore:
--   1405 / 6
-- ============================================================

UPDATE public.monthly_targets
SET
  target_year = 1405,
  target_month = 6
WHERE company_id =
  '11111111-1111-1111-1111-111111111111'
  AND target_year = 2026
  AND target_month = 8
  AND deleted_at IS NULL;


-- ============================================================
-- 7) Convert existing progress data
-- ============================================================

UPDATE public.monthly_progress
SET
  progress_year = 1405,
  progress_month = 6
WHERE company_id =
  '11111111-1111-1111-1111-111111111111'
  AND progress_year = 2026
  AND progress_month = 8
  AND deleted_at IS NULL;


-- ============================================================
-- 8) New Jalali constraints
-- ============================================================

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


-- ============================================================
-- 9) Rebuild monthly progress calculation
-- ============================================================

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
  v_start_date date;
  v_next_start_date date;

  v_achieved numeric(14,4);
  v_order_count integer;
  v_target numeric(14,4);
BEGIN

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

  WHERE o.company_id =
    p_company_id

    AND o.sales_user_id =
      p_user_id

    AND o.deleted_at IS NULL

    AND o.status =
      'confirmed'

    AND o.order_date >=
      v_start_date

    AND o.order_date <
      v_next_start_date

    AND (
      p_region_id IS NULL
      OR ci.region_id =
        p_region_id
    );


  SELECT
    mt.target_tonnage
  INTO
    v_target
  FROM public.monthly_targets mt

  WHERE mt.company_id =
    p_company_id

    AND mt.user_id =
      p_user_id

    AND mt.target_year =
      p_year

    AND mt.target_month =
      p_month

    AND (
      (
        p_region_id IS NULL
        AND mt.region_id IS NULL
      )
      OR
      mt.region_id =
        p_region_id
    )

    AND mt.deleted_at IS NULL

  LIMIT 1;


  v_target :=
    COALESCE(
      v_target,
      0
    );


  UPDATE public.monthly_progress mp

  SET
    achieved_tonnage =
      v_achieved,

    target_tonnage =
      v_target,

    order_count =
      v_order_count,

    achievement_rate =
      CASE
        WHEN v_target > 0
        THEN ROUND(
          v_achieved / v_target,
          4
        )
        ELSE 0
      END,

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
      OR
      mp.region_id =
        p_region_id
    )

    AND mp.deleted_at IS NULL;


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
      achievement_rate,
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
      CASE
        WHEN v_target > 0
        THEN ROUND(
          v_achieved / v_target,
          4
        )
        ELSE 0
      END,
      timezone(
        'utc',
        now()
      )
    );

  END IF;

END;
$$;


-- ============================================================
-- 10) Order progress trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_orders_refresh_monthly_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_jy smallint;
  v_old_jm smallint;

  v_new_jy smallint;
  v_new_jm smallint;

  v_old_region_id uuid;
  v_new_region_id uuid;
BEGIN

  -- ==========================================================
  -- OLD scope
  -- ==========================================================

  IF TG_OP = 'UPDATE'
     OR TG_OP = 'DELETE' THEN

    IF OLD.order_date IS NOT NULL
       AND OLD.sales_user_id IS NOT NULL THEN

      SELECT
        gj.jalali_year::smallint,
        gj.jalali_month::smallint

      INTO
        v_old_jy,
        v_old_jm

      FROM public.gregorian_to_jalali_date(
        OLD.order_date
      ) gj;


      SELECT
        ci.region_id
      INTO
        v_old_region_id

      FROM public.customers c

      JOIN public.cities ci
        ON ci.id = c.city_id
        AND ci.deleted_at IS NULL

      WHERE c.id =
        OLD.customer_id

        AND c.deleted_at IS NULL

      LIMIT 1;


      PERFORM public.refresh_monthly_progress(
        OLD.company_id,
        OLD.sales_user_id,
        NULL,
        v_old_jy,
        v_old_jm
      );


      IF v_old_region_id IS NOT NULL THEN

        PERFORM public.refresh_monthly_progress(
          OLD.company_id,
          OLD.sales_user_id,
          v_old_region_id,
          v_old_jy,
          v_old_jm
        );

      END IF;

    END IF;

  END IF;


  -- ==========================================================
  -- NEW scope
  -- ==========================================================

  IF TG_OP = 'INSERT'
     OR TG_OP = 'UPDATE' THEN

    IF NEW.order_date IS NOT NULL
       AND NEW.sales_user_id IS NOT NULL THEN

      SELECT
        gj.jalali_year::smallint,
        gj.jalali_month::smallint

      INTO
        v_new_jy,
        v_new_jm

      FROM public.gregorian_to_jalali_date(
        NEW.order_date
      ) gj;


      SELECT
        ci.region_id
      INTO
        v_new_region_id

      FROM public.customers c

      JOIN public.cities ci
        ON ci.id = c.city_id
        AND ci.deleted_at IS NULL

      WHERE c.id =
        NEW.customer_id

        AND c.deleted_at IS NULL

      LIMIT 1;


      PERFORM public.refresh_monthly_progress(
        NEW.company_id,
        NEW.sales_user_id,
        NULL,
        v_new_jy,
        v_new_jm
      );


      IF v_new_region_id IS NOT NULL THEN

        PERFORM public.refresh_monthly_progress(
          NEW.company_id,
          NEW.sales_user_id,
          v_new_region_id,
          v_new_jy,
          v_new_jm
        );

      END IF;

    END IF;

  END IF;


  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

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


-- ============================================================
-- 11) Target progress trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_monthly_targets_refresh_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

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


  IF TG_OP = 'UPDATE' THEN

    PERFORM public.refresh_monthly_progress(
      OLD.company_id,
      OLD.user_id,
      OLD.region_id,
      OLD.target_year,
      OLD.target_month
    );

  END IF;


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


-- ============================================================
-- 12) Recalculate current Jalali month
-- ============================================================

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

    WHERE mt.company_id =
      '11111111-1111-1111-1111-111111111111'

      AND mt.deleted_at IS NULL

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


COMMIT;
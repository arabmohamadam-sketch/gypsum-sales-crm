-- =============================================================================
-- Fix monthly progress refresh
-- =============================================================================
-- هدف:
-- 1. ردیف کلی monthly_progress همیشه مجموع اهداف مناطق را داشته باشد.
-- 2. با ثبت/ویرایش/حذف سفارش، تحقق کلی و منطقه‌ای refresh شود.
-- 3. target_tonnage برای ردیف کلی صفر نماند وقتی اهداف منطقه‌ای ثبت شده‌اند.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1) اصلاح تابع محاسبه monthly_progress
-- -----------------------------------------------------------------------------

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
BEGIN

  -- ---------------------------------------------------------------------------
  -- محاسبه فروش قطعی
  -- ---------------------------------------------------------------------------

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
    AND EXTRACT(YEAR FROM o.order_date)::smallint = p_year
    AND EXTRACT(MONTH FROM o.order_date)::smallint = p_month
    AND (
      p_region_id IS NULL
      OR ci.region_id = p_region_id
    );


  -- ---------------------------------------------------------------------------
  -- محاسبه هدف
  --
  -- اگر region_id = NULL باشد:
  -- مجموع تمام اهداف مناطق همان کارشناس و همان ماه استفاده می‌شود.
  --
  -- اگر region_id مقدار داشته باشد:
  -- فقط هدف همان منطقه استفاده می‌شود.
  -- ---------------------------------------------------------------------------

  IF p_region_id IS NULL THEN

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


  v_target := COALESCE(v_target, 0);


  -- ---------------------------------------------------------------------------
  -- Update existing progress
  -- ---------------------------------------------------------------------------

  UPDATE public.monthly_progress mp
  SET
    achieved_tonnage = v_achieved,
    target_tonnage = v_target,
    order_count = v_order_count,
    last_calculated_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
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


  -- ---------------------------------------------------------------------------
  -- Insert if not exists
  -- ---------------------------------------------------------------------------

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
      timezone('utc', now())
    );

  END IF;

END;
$$;


-- -----------------------------------------------------------------------------
-- 2) تابع کمکی برای بازسازی کل Progress یک دوره
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.refresh_user_monthly_progress(
  p_company_id uuid,
  p_user_id uuid,
  p_year smallint,
  p_month smallint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_region_id uuid;
BEGIN

  -- ردیف کلی
  PERFORM public.refresh_monthly_progress(
    p_company_id,
    p_user_id,
    NULL::uuid,
    p_year,
    p_month
  );


  -- تمام مناطق دارای هدف برای این کارشناس و ماه
  FOR v_region_id IN
    SELECT DISTINCT mt.region_id
    FROM public.monthly_targets mt
    WHERE mt.company_id = p_company_id
      AND mt.user_id = p_user_id
      AND mt.target_year = p_year
      AND mt.target_month = p_month
      AND mt.region_id IS NOT NULL
      AND mt.deleted_at IS NULL
  LOOP

    PERFORM public.refresh_monthly_progress(
      p_company_id,
      p_user_id,
      v_region_id,
      p_year,
      p_month
    );

  END LOOP;

END;
$$;


-- -----------------------------------------------------------------------------
-- 3) اصلاح Trigger سفارش
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_orders_refresh_monthly_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.orders%ROWTYPE;
  v_new public.orders%ROWTYPE;
BEGIN

  -- ---------------------------------------------------------------------------
  -- DELETE
  -- ---------------------------------------------------------------------------

  IF TG_OP = 'DELETE' THEN

    v_old := OLD;

    PERFORM public.refresh_user_monthly_progress(
      v_old.company_id,
      v_old.sales_user_id,
      EXTRACT(YEAR FROM v_old.order_date)::smallint,
      EXTRACT(MONTH FROM v_old.order_date)::smallint
    );

    RETURN OLD;

  END IF;


  -- ---------------------------------------------------------------------------
  -- INSERT
  -- ---------------------------------------------------------------------------

  IF TG_OP = 'INSERT' THEN

    v_new := NEW;

    PERFORM public.refresh_user_monthly_progress(
      v_new.company_id,
      v_new.sales_user_id,
      EXTRACT(YEAR FROM v_new.order_date)::smallint,
      EXTRACT(MONTH FROM v_new.order_date)::smallint
    );

    RETURN NEW;

  END IF;


  -- ---------------------------------------------------------------------------
  -- UPDATE
  --
  -- دوره قبلی هم refresh می‌شود چون ممکن است:
  -- - تاریخ سفارش تغییر کرده باشد
  -- - کارشناس فروش تغییر کرده باشد
  -- - مشتری/منطقه تغییر کرده باشد
  -- - وضعیت confirmed به وضعیت دیگری تغییر کرده باشد
  -- ---------------------------------------------------------------------------

  v_old := OLD;
  v_new := NEW;


  PERFORM public.refresh_user_monthly_progress(
    v_old.company_id,
    v_old.sales_user_id,
    EXTRACT(YEAR FROM v_old.order_date)::smallint,
    EXTRACT(MONTH FROM v_old.order_date)::smallint
  );


  -- دوره جدید
  PERFORM public.refresh_user_monthly_progress(
    v_new.company_id,
    v_new.sales_user_id,
    EXTRACT(YEAR FROM v_new.order_date)::smallint,
    EXTRACT(MONTH FROM v_new.order_date)::smallint
  );


  RETURN NEW;

END;
$$;


-- -----------------------------------------------------------------------------
-- 4) Trigger فعلی از قبل وجود دارد.
--    فقط تابع آن را اصلاح کردیم.
-- -----------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- 5) اصلاح Progress ماه جاری
-- -----------------------------------------------------------------------------

SELECT public.refresh_user_monthly_progress(
  '11111111-1111-1111-1111-111111111111'::uuid,
  '0e67b545-f44e-4f47-b2e0-4a82d6a4943f'::uuid,
  2026::smallint,
  9::smallint
);
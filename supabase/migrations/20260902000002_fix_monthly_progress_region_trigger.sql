-- =============================================================================
-- Fix monthly progress refresh for region-based sales targets
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_orders_refresh_monthly_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_region_id uuid;
  v_new_region_id uuid;

  v_old_year smallint;
  v_old_month smallint;

  v_new_year smallint;
  v_new_month smallint;
BEGIN

  -- ---------------------------------------------------------------------------
  -- DELETE
  -- ---------------------------------------------------------------------------
  IF TG_OP = 'DELETE' THEN

    SELECT ci.region_id
    INTO v_old_region_id
    FROM public.customers c
    JOIN public.cities ci
      ON ci.id = c.city_id
      AND ci.deleted_at IS NULL
    WHERE c.id = OLD.customer_id
      AND c.deleted_at IS NULL;

    v_old_year := EXTRACT(YEAR FROM OLD.order_date)::smallint;
    v_old_month := EXTRACT(MONTH FROM OLD.order_date)::smallint;

    -- Refresh global progress
    PERFORM public.refresh_monthly_progress(
      OLD.company_id,
      OLD.sales_user_id,
      NULL,
      v_old_year,
      v_old_month
    );

    -- Refresh region-specific progress
    IF v_old_region_id IS NOT NULL THEN
      PERFORM public.refresh_monthly_progress(
        OLD.company_id,
        OLD.sales_user_id,
        v_old_region_id,
        v_old_year,
        v_old_month
      );
    END IF;

    RETURN OLD;
  END IF;


  -- ---------------------------------------------------------------------------
  -- INSERT / UPDATE - old scope
  -- ---------------------------------------------------------------------------
  IF TG_OP = 'UPDATE' THEN

    SELECT ci.region_id
    INTO v_old_region_id
    FROM public.customers c
    JOIN public.cities ci
      ON ci.id = c.city_id
      AND ci.deleted_at IS NULL
    WHERE c.id = OLD.customer_id
      AND c.deleted_at IS NULL;

    v_old_year := EXTRACT(YEAR FROM OLD.order_date)::smallint;
    v_old_month := EXTRACT(MONTH FROM OLD.order_date)::smallint;

    -- Refresh old global scope
    PERFORM public.refresh_monthly_progress(
      OLD.company_id,
      OLD.sales_user_id,
      NULL,
      v_old_year,
      v_old_month
    );

    -- Refresh old regional scope
    IF v_old_region_id IS NOT NULL THEN
      PERFORM public.refresh_monthly_progress(
        OLD.company_id,
        OLD.sales_user_id,
        v_old_region_id,
        v_old_year,
        v_old_month
      );
    END IF;

  END IF;


  -- ---------------------------------------------------------------------------
  -- INSERT / UPDATE - new scope
  -- ---------------------------------------------------------------------------

  SELECT ci.region_id
  INTO v_new_region_id
  FROM public.customers c
  JOIN public.cities ci
    ON ci.id = c.city_id
    AND ci.deleted_at IS NULL
  WHERE c.id = NEW.customer_id
    AND c.deleted_at IS NULL;

  v_new_year := EXTRACT(YEAR FROM NEW.order_date)::smallint;
  v_new_month := EXTRACT(MONTH FROM NEW.order_date)::smallint;

  -- Refresh new global scope
  PERFORM public.refresh_monthly_progress(
    NEW.company_id,
    NEW.sales_user_id,
    NULL,
    v_new_year,
    v_new_month
  );

  -- Refresh new regional scope
  IF v_new_region_id IS NOT NULL THEN
    PERFORM public.refresh_monthly_progress(
      NEW.company_id,
      NEW.sales_user_id,
      v_new_region_id,
      v_new_year,
      v_new_month
    );
  END IF;

  RETURN NEW;

END;
$$;


COMMENT ON FUNCTION public.trg_orders_refresh_monthly_progress()
IS
  'Refreshes global and region-specific monthly sales progress for affected order scopes.';
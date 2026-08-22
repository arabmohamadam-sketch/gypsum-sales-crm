-- =============================================================================
-- Gypsum Sales CRM
-- Migration: 20260822000001
--
-- Purpose:
--   Fix existing Order / Customer Metrics / Monthly Progress triggers.
--
-- IMPORTANT:
--   Existing triggers are NOT dropped/recreated.
--   Only their functions are replaced.
--
-- Fixes:
--   1. Refresh both OLD and NEW customers when an order changes customer.
--   2. Refresh OLD and NEW monthly progress contexts on order UPDATE.
--   3. Refresh region-specific monthly progress.
--   4. Refresh OLD and NEW target scopes when monthly target changes.
-- =============================================================================

BEGIN;


-- =============================================================================
-- 1. FIX CUSTOMER METRICS TRIGGER
-- =============================================================================
--
-- Previous bug:
--
--   COALESCE(NEW.customer_id, OLD.customer_id)
--
-- On UPDATE customer A -> customer B:
--   Customer A was never refreshed.
--
-- Correct behavior:
--
--   INSERT -> NEW
--   DELETE -> OLD
--   UPDATE -> OLD + NEW when customer changes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_orders_refresh_customer_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN

  -- ---------------------------------------------------------------------------
  -- INSERT
  -- ---------------------------------------------------------------------------

  IF TG_OP = 'INSERT' THEN

    IF NEW.customer_id IS NOT NULL THEN

      PERFORM public.refresh_customer_sales_metrics(
        NEW.customer_id
      );

    END IF;

    RETURN NEW;

  END IF;


  -- ---------------------------------------------------------------------------
  -- DELETE
  -- ---------------------------------------------------------------------------

  IF TG_OP = 'DELETE' THEN

    IF OLD.customer_id IS NOT NULL THEN

      PERFORM public.refresh_customer_sales_metrics(
        OLD.customer_id
      );

    END IF;

    RETURN OLD;

  END IF;


  -- ---------------------------------------------------------------------------
  -- UPDATE
  -- ---------------------------------------------------------------------------

  /*
   * Always refresh OLD customer.
   *
   * This is important when:
   * - status changes
   * - deleted_at changes
   * - total tonnage changes
   * - order date changes
   * - customer changes
   */
  IF OLD.customer_id IS NOT NULL THEN

    PERFORM public.refresh_customer_sales_metrics(
      OLD.customer_id
    );

  END IF;


  /*
   * If customer changed, refresh NEW customer too.
   */
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id
     AND NEW.customer_id IS NOT NULL THEN

    PERFORM public.refresh_customer_sales_metrics(
      NEW.customer_id
    );

  END IF;


  RETURN NEW;

END;
$function$;


-- =============================================================================
-- 2. HELPER:
--    REFRESH MONTHLY PROGRESS FOR ONE ORDER CONTEXT
-- =============================================================================
--
-- For each order context we refresh:
--
--   A) Company-wide progress
--   B) Region-specific progress
--
-- Region is resolved through:
--
--   orders.customer_id
--          ↓
--   customers.city_id
--          ↓
--   cities.region_id
-- =============================================================================

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
  v_year smallint;
  v_month smallint;
BEGIN

  -- Nothing to calculate without these values.
  IF p_company_id IS NULL
     OR p_sales_user_id IS NULL
     OR p_order_date IS NULL THEN

    RETURN;

  END IF;


  -- ---------------------------------------------------------------------------
  -- Date -> Year / Month
  -- ---------------------------------------------------------------------------

  v_year :=
    EXTRACT(
      YEAR FROM p_order_date
    )::smallint;

  v_month :=
    EXTRACT(
      MONTH FROM p_order_date
    )::smallint;


  -- ---------------------------------------------------------------------------
  -- A. COMPANY-WIDE PROGRESS
  -- ---------------------------------------------------------------------------

  PERFORM public.refresh_monthly_progress(
    p_company_id,
    p_sales_user_id,
    NULL,
    v_year,
    v_month
  );


  -- ---------------------------------------------------------------------------
  -- B. REGION-SPECIFIC PROGRESS
  -- ---------------------------------------------------------------------------

  IF p_customer_id IS NOT NULL THEN

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


    IF v_region_id IS NOT NULL THEN

      PERFORM public.refresh_monthly_progress(
        p_company_id,
        p_sales_user_id,
        v_region_id,
        v_year,
        v_month
      );

    END IF;

  END IF;

END;
$function$;


-- =============================================================================
-- 3. FIX ORDER -> MONTHLY PROGRESS
-- =============================================================================
--
-- Previous bug:
--
--   On UPDATE only NEW was refreshed.
--
-- Example:
--
--   OLD:
--       August
--       Region 1
--       Customer A
--
--   NEW:
--       September
--       Region 2
--       Customer B
--
-- The old August / Region 1 progress remained incorrect.
--
-- Correct behavior:
--
--   INSERT -> NEW
--   DELETE -> OLD
--   UPDATE -> OLD + NEW when reporting context changes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_orders_refresh_monthly_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN

  -- ---------------------------------------------------------------------------
  -- INSERT
  -- ---------------------------------------------------------------------------

  IF TG_OP = 'INSERT' THEN

    PERFORM public.refresh_order_monthly_progress_context(
      NEW.company_id,
      NEW.sales_user_id,
      NEW.customer_id,
      NEW.order_date
    );

    RETURN NEW;

  END IF;


  -- ---------------------------------------------------------------------------
  -- DELETE
  -- ---------------------------------------------------------------------------

  IF TG_OP = 'DELETE' THEN

    PERFORM public.refresh_order_monthly_progress_context(
      OLD.company_id,
      OLD.sales_user_id,
      OLD.customer_id,
      OLD.order_date
    );

    RETURN OLD;

  END IF;


  -- ---------------------------------------------------------------------------
  -- UPDATE
  -- ---------------------------------------------------------------------------

  /*
   * Always refresh OLD context.
   *
   * This safely handles:
   * - status changes
   * - soft delete / restore
   * - tonnage changes
   */
  PERFORM public.refresh_order_monthly_progress_context(
    OLD.company_id,
    OLD.sales_user_id,
    OLD.customer_id,
    OLD.order_date
  );


  /*
   * Refresh NEW context when anything relevant changed.
   */
  IF NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.sales_user_id IS DISTINCT FROM OLD.sales_user_id
     OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.order_date IS DISTINCT FROM OLD.order_date
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN

    PERFORM public.refresh_order_monthly_progress_context(
      NEW.company_id,
      NEW.sales_user_id,
      NEW.customer_id,
      NEW.order_date
    );

  END IF;


  RETURN NEW;

END;
$function$;


-- =============================================================================
-- 4. FIX MONTHLY TARGET -> PROGRESS
-- =============================================================================
--
-- Existing behavior:
--   INSERT -> NEW
--   UPDATE -> NEW only
--
-- Correct behavior:
--   INSERT -> NEW
--   UPDATE -> OLD + NEW when scope changes
--
-- DELETE is intentionally not handled because the project has:
--
--   trg_monthly_targets_prevent_hard_delete
--
-- Soft delete is an UPDATE of deleted_at and is therefore handled here.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_monthly_targets_refresh_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN

  -- ---------------------------------------------------------------------------
  -- INSERT
  -- ---------------------------------------------------------------------------

  IF TG_OP = 'INSERT' THEN

    PERFORM public.refresh_monthly_progress(
      NEW.company_id,
      NEW.user_id,
      NEW.region_id,
      NEW.target_year,
      NEW.target_month
    );

    RETURN NEW;

  END IF;


  -- ---------------------------------------------------------------------------
  -- UPDATE
  -- ---------------------------------------------------------------------------

  /*
   * Always refresh OLD target scope.
   *
   * This is required for:
   * - region changes
   * - user changes
   * - month changes
   * - year changes
   * - target changes
   * - soft delete
   * - restore
   */
  PERFORM public.refresh_monthly_progress(
    OLD.company_id,
    OLD.user_id,
    OLD.region_id,
    OLD.target_year,
    OLD.target_month
  );


  /*
   * Refresh NEW target scope.
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
$function$;


-- =============================================================================
-- 5. COMMENTS
-- =============================================================================

COMMENT ON FUNCTION public.trg_orders_refresh_customer_metrics()
IS
'Refreshes customer sales metrics for OLD and NEW order contexts.';

COMMENT ON FUNCTION public.refresh_order_monthly_progress_context(uuid,uuid,uuid,date)
IS
'Refreshes company-wide and region-specific monthly progress for an order context.';

COMMENT ON FUNCTION public.trg_orders_refresh_monthly_progress()
IS
'Refreshes OLD and NEW monthly progress contexts when an order changes.';

COMMENT ON FUNCTION public.trg_monthly_targets_refresh_progress()
IS
'Refreshes OLD and NEW monthly progress scopes when a monthly target changes.';


COMMIT;


-- =============================================================================
-- END
-- =============================================================================
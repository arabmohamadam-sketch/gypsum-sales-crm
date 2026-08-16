-- =============================================================================
-- Gypsum Sales CRM — Business Logic Triggers and AI Helper Functions
-- =============================================================================

-- Recalculate order total tonnage from line items
CREATE OR REPLACE FUNCTION public.refresh_order_total_tonnage(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders o
  SET total_tonnage = COALESCE((
    SELECT SUM(oi.tonnage)
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
      AND oi.deleted_at IS NULL
  ), 0),
  updated_at = timezone('utc', now())
  WHERE o.id = p_order_id
    AND o.deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_order_items_refresh_order_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);
  PERFORM public.refresh_order_total_tonnage(v_order_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_order_items_refresh_order_total
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_order_items_refresh_order_total();

-- Snapshot product weight on order item insert/update
CREATE OR REPLACE FUNCTION public.trg_order_items_set_company_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT o.company_id
  INTO NEW.company_id
  FROM public.orders o
  WHERE o.id = NEW.order_id;

  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'Order % not found.', NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_items_set_company_id
  BEFORE INSERT OR UPDATE OF order_id ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_order_items_set_company_id();

CREATE OR REPLACE FUNCTION public.trg_order_items_snapshot_weight()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT p.weight_kg
  INTO NEW.weight_kg_snapshot
  FROM public.products p
  WHERE p.id = NEW.product_id
    AND p.deleted_at IS NULL;

  IF NEW.weight_kg_snapshot IS NULL THEN
    RAISE EXCEPTION 'Product % not found or inactive.', NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_items_snapshot_weight
  BEFORE INSERT OR UPDATE OF product_id ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_order_items_snapshot_weight();

-- Refresh denormalized customer sales metrics
CREATE OR REPLACE FUNCTION public.refresh_customer_sales_metrics(p_customer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lifetime_tonnage numeric(14, 4);
  v_total_orders integer;
  v_last_order_at timestamptz;
  v_avg_monthly numeric(14, 4);
  v_inactivity_days integer;
BEGIN
  SELECT
    COALESCE(SUM(o.total_tonnage), 0),
    COUNT(*)::integer,
    MAX(o.order_date)::timestamptz
  INTO v_lifetime_tonnage, v_total_orders, v_last_order_at
  FROM public.orders o
  WHERE o.customer_id = p_customer_id
    AND o.deleted_at IS NULL
    AND o.status = 'confirmed';

  SELECT COALESCE(AVG(monthly_total), 0)
  INTO v_avg_monthly
  FROM (
    SELECT SUM(o.total_tonnage) AS monthly_total
    FROM public.orders o
    WHERE o.customer_id = p_customer_id
      AND o.deleted_at IS NULL
      AND o.status = 'confirmed'
      AND o.order_date >= (date_trunc('month', timezone('utc', now())) - interval '12 months')::date
    GROUP BY date_trunc('month', o.order_date)
  ) monthly;

  v_inactivity_days := CASE
    WHEN v_last_order_at IS NULL THEN
      GREATEST(0, (timezone('utc', now())::date - (
        SELECT c.created_at::date FROM public.customers c WHERE c.id = p_customer_id
      ))::integer)
    ELSE
      GREATEST(0, (timezone('utc', now())::date - v_last_order_at::date)::integer)
  END;

  UPDATE public.customers c
  SET
    lifetime_tonnage = v_lifetime_tonnage,
    average_monthly_tonnage = v_avg_monthly,
    total_order_count = v_total_orders,
    last_order_at = v_last_order_at,
    inactivity_days = v_inactivity_days,
    lost_at = CASE
      WHEN v_inactivity_days >= 90 AND c.lost_at IS NULL THEN timezone('utc', now())
      WHEN v_inactivity_days < 90 THEN NULL
      ELSE c.lost_at
    END,
    updated_at = timezone('utc', now())
  WHERE c.id = p_customer_id
    AND c.deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_orders_refresh_customer_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  v_customer_id := COALESCE(NEW.customer_id, OLD.customer_id);
  PERFORM public.refresh_customer_sales_metrics(v_customer_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_orders_refresh_customer_metrics
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_orders_refresh_customer_metrics();

-- Refresh customer communication timestamps
CREATE OR REPLACE FUNCTION public.trg_calls_refresh_customer_last_call()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.customers c
  SET
    last_call_at = (
      SELECT MAX(ca.call_date)
      FROM public.calls ca
      WHERE ca.customer_id = c.id
        AND ca.deleted_at IS NULL
    ),
    updated_at = timezone('utc', now())
  WHERE c.id = COALESCE(NEW.customer_id, OLD.customer_id)
    AND c.deleted_at IS NULL;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_calls_refresh_customer_last_call
  AFTER INSERT OR UPDATE OR DELETE ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.trg_calls_refresh_customer_last_call();

CREATE OR REPLACE FUNCTION public.trg_follow_ups_refresh_customer_last_follow_up()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.customers c
  SET
    last_follow_up_at = (
      SELECT MAX(f.scheduled_at)
      FROM public.follow_ups f
      WHERE f.customer_id = c.id
        AND f.deleted_at IS NULL
    ),
    updated_at = timezone('utc', now())
  WHERE c.id = COALESCE(NEW.customer_id, OLD.customer_id)
    AND c.deleted_at IS NULL;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_follow_ups_refresh_customer_last_follow_up
  AFTER INSERT OR UPDATE OR DELETE ON public.follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.trg_follow_ups_refresh_customer_last_follow_up();

CREATE OR REPLACE FUNCTION public.trg_visits_refresh_customer_last_visit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.customers c
  SET
    last_visit_at = (
      SELECT MAX(v.visit_date)
      FROM public.customer_visits v
      WHERE v.customer_id = c.id
        AND v.deleted_at IS NULL
    ),
    updated_at = timezone('utc', now())
  WHERE c.id = COALESCE(NEW.customer_id, OLD.customer_id)
    AND c.deleted_at IS NULL;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_visits_refresh_customer_last_visit
  AFTER INSERT OR UPDATE OR DELETE ON public.customer_visits
  FOR EACH ROW EXECUTE FUNCTION public.trg_visits_refresh_customer_last_visit();

-- Refresh monthly progress aggregates
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
  SELECT
    COALESCE(SUM(o.total_tonnage), 0),
    COUNT(*)::integer
  INTO v_achieved, v_order_count
  FROM public.orders o
  JOIN public.customers c ON c.id = o.customer_id AND c.deleted_at IS NULL
  JOIN public.cities ci ON ci.id = c.city_id AND ci.deleted_at IS NULL
  WHERE o.company_id = p_company_id
    AND o.sales_user_id = p_user_id
    AND o.deleted_at IS NULL
    AND o.status = 'confirmed'
    AND EXTRACT(YEAR FROM o.order_date)::smallint = p_year
    AND EXTRACT(MONTH FROM o.order_date)::smallint = p_month
    AND (p_region_id IS NULL OR ci.region_id = p_region_id);

  SELECT mt.target_tonnage
  INTO v_target
  FROM public.monthly_targets mt
  WHERE mt.company_id = p_company_id
    AND mt.user_id = p_user_id
    AND mt.target_year = p_year
    AND mt.target_month = p_month
    AND (
      (p_region_id IS NULL AND mt.region_id IS NULL)
      OR mt.region_id = p_region_id
    )
    AND mt.deleted_at IS NULL
  LIMIT 1;

  v_target := COALESCE(v_target, 0);

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
      (p_region_id IS NULL AND mp.region_id IS NULL)
      OR mp.region_id = p_region_id
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

CREATE OR REPLACE FUNCTION public.trg_orders_refresh_monthly_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_order := OLD;
  ELSE
    v_order := NEW;
  END IF;

  PERFORM public.refresh_monthly_progress(
    v_order.company_id,
    v_order.sales_user_id,
    NULL,
    EXTRACT(YEAR FROM v_order.order_date)::smallint,
    EXTRACT(MONTH FROM v_order.order_date)::smallint
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_orders_refresh_monthly_progress
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_orders_refresh_monthly_progress();

CREATE OR REPLACE FUNCTION public.trg_monthly_targets_refresh_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

CREATE TRIGGER trg_monthly_targets_refresh_progress
  AFTER INSERT OR UPDATE ON public.monthly_targets
  FOR EACH ROW EXECUTE FUNCTION public.trg_monthly_targets_refresh_progress();

-- ---------------------------------------------------------------------------
-- AI support functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.customer_purchased_in_month(
  p_customer_id uuid,
  p_reference_date date DEFAULT (timezone('utc', now()))::date
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.customer_id = p_customer_id
      AND o.deleted_at IS NULL
      AND o.status = 'confirmed'
      AND date_trunc('month', o.order_date) = date_trunc('month', p_reference_date)
  );
$$;

CREATE OR REPLACE FUNCTION public.calculate_ai_priority_score(
  p_customer_id uuid,
  p_reference_date date DEFAULT (timezone('utc', now()))::date
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.customers%ROWTYPE;
  v_score numeric(10, 4) := 0;
  v_days_since_order integer;
  v_days_since_call integer;
  v_days_since_follow_up integer;
BEGIN
  SELECT * INTO c
  FROM public.customers
  WHERE id = p_customer_id
    AND deleted_at IS NULL
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF public.customer_purchased_in_month(p_customer_id, p_reference_date) THEN
    RETURN 0;
  END IF;

  v_days_since_order := COALESCE(c.inactivity_days, 0);
  v_days_since_call := CASE
    WHEN c.last_call_at IS NULL THEN 999
    ELSE GREATEST(0, (p_reference_date - c.last_call_at::date)::integer)
  END;
  v_days_since_follow_up := CASE
    WHEN c.last_follow_up_at IS NULL THEN 999
    ELSE GREATEST(0, (p_reference_date - c.last_follow_up_at::date)::integer)
  END;

  v_score := v_score + LEAST(c.average_monthly_tonnage, 500) * 0.05;
  v_score := v_score + LEAST(c.lifetime_tonnage, 5000) * 0.01;
  v_score := v_score + LEAST(v_days_since_order, 180) * 0.20;
  v_score := v_score + LEAST(v_days_since_call, 90) * 0.15;
  v_score := v_score + LEAST(v_days_since_follow_up, 90) * 0.10;

  v_score := v_score + CASE c.customer_type
    WHEN 'building_material_store' THEN 15
    WHEN 'contractor' THEN 12
    WHEN 'employer' THEN 10
    WHEN 'plaster_worker' THEN 8
    ELSE 0
  END;

  IF c.is_vip THEN
    v_score := v_score + 20;
  END IF;

  RETURN ROUND(v_score, 4);
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_daily_ai_task_business_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.customer_purchased_in_month(NEW.customer_id, NEW.task_date) THEN
    RAISE EXCEPTION 'Customer % already purchased during %.', NEW.customer_id, to_char(NEW.task_date, 'YYYY-MM');
  END IF;

  IF (
    SELECT COUNT(*)
    FROM public.daily_ai_tasks t
    WHERE t.company_id = NEW.company_id
      AND t.user_id = NEW.user_id
      AND t.task_date = NEW.task_date
      AND t.deleted_at IS NULL
      AND t.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) >= 5 AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Maximum of five AI recommendations per user per day exceeded.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_daily_ai_tasks_business_rules
  BEFORE INSERT OR UPDATE ON public.daily_ai_tasks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_daily_ai_task_business_rules();

COMMENT ON FUNCTION public.customer_purchased_in_month IS
  'Returns true when customer has a confirmed order in the reference month.';
COMMENT ON FUNCTION public.calculate_ai_priority_score IS
  'Computes AI ranking score using tonnage, inactivity, calls, follow-ups, and customer type.';

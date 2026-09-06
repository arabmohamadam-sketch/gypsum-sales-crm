-- =============================================================================
-- Gypsum Sales CRM
-- Reporting Views — Real Sales = Loading Confirmed
--
-- Business rule:
-- An order becomes a real sale only after at least one related waybill
-- reaches loading_confirmed.
--
-- This migration replaces the previous reporting views that treated
-- orders.status = 'confirmed' as sales.
-- =============================================================================


-- =============================================================================
-- 1. DAILY SALES
-- =============================================================================

CREATE OR REPLACE VIEW public.v_daily_sales
WITH (security_invoker = true)
AS
WITH loading_confirmed_orders AS (
  SELECT
    w.order_id,
    SUM(
      COALESCE(
        wi.tonnage,
        (
          wi.quantity::numeric *
          wi.weight_kg_snapshot::numeric
        ) / 1000.0
      )
    ) AS loaded_tonnage
  FROM public.waybills w
  JOIN public.waybill_items wi
    ON wi.waybill_id = w.id
   AND wi.deleted_at IS NULL
  WHERE w.deleted_at IS NULL
    AND w.status = 'loading_confirmed'
  GROUP BY w.order_id
)
SELECT
  o.company_id,
  o.order_date AS sales_date,
  o.sales_user_id,
  COUNT(*) AS order_count,
  SUM(lco.loaded_tonnage) AS total_tonnage
FROM public.orders o
JOIN loading_confirmed_orders lco
  ON lco.order_id = o.id
WHERE o.deleted_at IS NULL
  AND o.status = 'confirmed'
GROUP BY
  o.company_id,
  o.order_date,
  o.sales_user_id;


-- =============================================================================
-- 2. WEEKLY SALES
-- =============================================================================

CREATE OR REPLACE VIEW public.v_weekly_sales
WITH (security_invoker = true)
AS
WITH loading_confirmed_orders AS (
  SELECT
    w.order_id,
    SUM(
      COALESCE(
        wi.tonnage,
        (
          wi.quantity::numeric *
          wi.weight_kg_snapshot::numeric
        ) / 1000.0
      )
    ) AS loaded_tonnage
  FROM public.waybills w
  JOIN public.waybill_items wi
    ON wi.waybill_id = w.id
   AND wi.deleted_at IS NULL
  WHERE w.deleted_at IS NULL
    AND w.status = 'loading_confirmed'
  GROUP BY w.order_id
)
SELECT
  o.company_id,
  date_trunc(
    'week',
    o.order_date
  )::date AS week_start,
  o.sales_user_id,
  COUNT(*) AS order_count,
  SUM(lco.loaded_tonnage) AS total_tonnage
FROM public.orders o
JOIN loading_confirmed_orders lco
  ON lco.order_id = o.id
WHERE o.deleted_at IS NULL
  AND o.status = 'confirmed'
GROUP BY
  o.company_id,
  date_trunc(
    'week',
    o.order_date
  ),
  o.sales_user_id;


-- =============================================================================
-- 3. MONTHLY SALES
-- =============================================================================

CREATE OR REPLACE VIEW public.v_monthly_sales
WITH (security_invoker = true)
AS
WITH loading_confirmed_orders AS (
  SELECT
    w.order_id,
    SUM(
      COALESCE(
        wi.tonnage,
        (
          wi.quantity::numeric *
          wi.weight_kg_snapshot::numeric
        ) / 1000.0
      )
    ) AS loaded_tonnage
  FROM public.waybills w
  JOIN public.waybill_items wi
    ON wi.waybill_id = w.id
   AND wi.deleted_at IS NULL
  WHERE w.deleted_at IS NULL
    AND w.status = 'loading_confirmed'
  GROUP BY w.order_id
)
SELECT
  o.company_id,
  EXTRACT(
    YEAR FROM o.order_date
  )::smallint AS sales_year,
  EXTRACT(
    MONTH FROM o.order_date
  )::smallint AS sales_month,
  o.sales_user_id,
  COUNT(*) AS order_count,
  SUM(lco.loaded_tonnage) AS total_tonnage
FROM public.orders o
JOIN loading_confirmed_orders lco
  ON lco.order_id = o.id
WHERE o.deleted_at IS NULL
  AND o.status = 'confirmed'
GROUP BY
  o.company_id,
  EXTRACT(YEAR FROM o.order_date),
  EXTRACT(MONTH FROM o.order_date),
  o.sales_user_id;


-- =============================================================================
-- 4. REGION COMPARISON
-- =============================================================================

CREATE OR REPLACE VIEW public.v_region_comparison
WITH (security_invoker = true)
AS
WITH loading_confirmed_orders AS (
  SELECT
    w.order_id,
    SUM(
      COALESCE(
        wi.tonnage,
        (
          wi.quantity::numeric *
          wi.weight_kg_snapshot::numeric
        ) / 1000.0
      )
    ) AS loaded_tonnage
  FROM public.waybills w
  JOIN public.waybill_items wi
    ON wi.waybill_id = w.id
   AND wi.deleted_at IS NULL
  WHERE w.deleted_at IS NULL
    AND w.status = 'loading_confirmed'
  GROUP BY w.order_id
)
SELECT
  o.company_id,
  r.id AS region_id,
  r.name AS region_name,
  date_trunc(
    'month',
    o.order_date
  )::date AS sales_month,
  COUNT(DISTINCT o.customer_id) AS active_customers,
  COUNT(*) AS order_count,
  SUM(lco.loaded_tonnage) AS total_tonnage
FROM public.orders o
JOIN loading_confirmed_orders lco
  ON lco.order_id = o.id
JOIN public.customers c
  ON c.id = o.customer_id
 AND c.deleted_at IS NULL
JOIN public.cities ci
  ON ci.id = c.city_id
 AND ci.deleted_at IS NULL
JOIN public.regions r
  ON r.id = ci.region_id
 AND r.deleted_at IS NULL
WHERE o.deleted_at IS NULL
  AND o.status = 'confirmed'
GROUP BY
  o.company_id,
  r.id,
  r.name,
  date_trunc(
    'month',
    o.order_date
  );


-- =============================================================================
-- 5. CITY COMPARISON
-- =============================================================================

CREATE OR REPLACE VIEW public.v_city_comparison
WITH (security_invoker = true)
AS
WITH loading_confirmed_orders AS (
  SELECT
    w.order_id,
    SUM(
      COALESCE(
        wi.tonnage,
        (
          wi.quantity::numeric *
          wi.weight_kg_snapshot::numeric
        ) / 1000.0
      )
    ) AS loaded_tonnage
  FROM public.waybills w
  JOIN public.waybill_items wi
    ON wi.waybill_id = w.id
   AND wi.deleted_at IS NULL
  WHERE w.deleted_at IS NULL
    AND w.status = 'loading_confirmed'
  GROUP BY w.order_id
)
SELECT
  o.company_id,
  ci.id AS city_id,
  ci.name AS city_name,
  r.id AS region_id,
  r.name AS region_name,
  date_trunc(
    'month',
    o.order_date
  )::date AS sales_month,
  COUNT(DISTINCT o.customer_id) AS active_customers,
  COUNT(*) AS order_count,
  SUM(lco.loaded_tonnage) AS total_tonnage
FROM public.orders o
JOIN loading_confirmed_orders lco
  ON lco.order_id = o.id
JOIN public.customers c
  ON c.id = o.customer_id
 AND c.deleted_at IS NULL
JOIN public.cities ci
  ON ci.id = c.city_id
 AND ci.deleted_at IS NULL
JOIN public.regions r
  ON r.id = ci.region_id
 AND r.deleted_at IS NULL
WHERE o.deleted_at IS NULL
  AND o.status = 'confirmed'
GROUP BY
  o.company_id,
  ci.id,
  ci.name,
  r.id,
  r.name,
  date_trunc(
    'month',
    o.order_date
  );


-- =============================================================================
-- 6. SALES TREND
-- =============================================================================

CREATE OR REPLACE VIEW public.v_sales_trend
WITH (security_invoker = true)
AS
WITH loading_confirmed_orders AS (
  SELECT
    w.order_id,
    SUM(
      COALESCE(
        wi.tonnage,
        (
          wi.quantity::numeric *
          wi.weight_kg_snapshot::numeric
        ) / 1000.0
      )
    ) AS loaded_tonnage
  FROM public.waybills w
  JOIN public.waybill_items wi
    ON wi.waybill_id = w.id
   AND wi.deleted_at IS NULL
  WHERE w.deleted_at IS NULL
    AND w.status = 'loading_confirmed'
  GROUP BY w.order_id
),
monthly_sales AS (
  SELECT
    o.company_id,
    date_trunc(
      'month',
      o.order_date
    )::date AS trend_month,
    SUM(lco.loaded_tonnage) AS total_tonnage,
    COUNT(*) AS order_count,
    COUNT(DISTINCT o.customer_id) AS unique_customers
  FROM public.orders o
  JOIN loading_confirmed_orders lco
    ON lco.order_id = o.id
  WHERE o.deleted_at IS NULL
    AND o.status = 'confirmed'
  GROUP BY
    o.company_id,
    date_trunc(
      'month',
      o.order_date
    )
)
SELECT
  company_id,
  trend_month,
  total_tonnage,
  order_count,
  unique_customers,
  LAG(total_tonnage) OVER (
    PARTITION BY company_id
    ORDER BY trend_month
  ) AS previous_month_tonnage
FROM monthly_sales;


-- =============================================================================
-- 7. TOP PRODUCTS
--
-- Real product sales are based on loading_confirmed waybills.
-- Therefore this view uses waybill_items instead of order_items.
-- =============================================================================

CREATE OR REPLACE VIEW public.v_top_products
WITH (security_invoker = true)
AS
SELECT
  wi.company_id,
  p.id AS product_id,
  p.name AS product_name,
  p.product_line,
  p.weight_kg,
  date_trunc(
    'month',
    o.order_date
  )::date AS sales_month,
  SUM(wi.quantity) AS total_quantity,
  SUM(
    COALESCE(
      wi.tonnage,
      (
        wi.quantity::numeric *
        wi.weight_kg_snapshot::numeric
      ) / 1000.0
    )
  ) AS total_tonnage,
  RANK() OVER (
    PARTITION BY
      wi.company_id,
      date_trunc(
        'month',
        o.order_date
      )
    ORDER BY
      SUM(
        COALESCE(
          wi.tonnage,
          (
            wi.quantity::numeric *
            wi.weight_kg_snapshot::numeric
          ) / 1000.0
        )
      ) DESC
  ) AS product_rank
FROM public.waybill_items wi
JOIN public.waybills w
  ON w.id = wi.waybill_id
 AND w.deleted_at IS NULL
 AND w.status = 'loading_confirmed'
JOIN public.orders o
  ON o.id = w.order_id
 AND o.deleted_at IS NULL
 AND o.status = 'confirmed'
JOIN public.products p
  ON p.id = wi.product_id
 AND p.deleted_at IS NULL
WHERE wi.deleted_at IS NULL
GROUP BY
  wi.company_id,
  p.id,
  p.name,
  p.product_line,
  p.weight_kg,
  date_trunc(
    'month',
    o.order_date
  );


-- =============================================================================
-- 8. CUSTOMER ACTIVITY
--
-- IMPORTANT:
-- Keep the existing 7-column shape of this view.
--
-- Existing columns:
--   company_id
--   customer_id
--   customer_name
--   order_count
--   call_count
--   follow_up_count
--   last_activity_at
--
-- Real order activity is counted only when at least one related waybill
-- has status = loading_confirmed.
-- =============================================================================

CREATE OR REPLACE VIEW public.v_customer_activity
WITH (security_invoker = true)
AS
SELECT
  c.company_id,
  c.id AS customer_id,
  c.name AS customer_name,

  COUNT(
    DISTINCT CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.waybills w
        WHERE w.order_id = o.id
          AND w.deleted_at IS NULL
          AND w.status = 'loading_confirmed'
      )
      THEN o.id
    END
  ) AS order_count,

  COUNT(
    DISTINCT ca.id
  ) AS call_count,

  COUNT(
    DISTINCT f.id
  ) AS follow_up_count,

  MAX(
    GREATEST(
      COALESCE(
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM public.waybills w
            WHERE w.order_id = o.id
              AND w.deleted_at IS NULL
              AND w.status = 'loading_confirmed'
          )
          THEN o.order_date::timestamptz
        END,
        '-infinity'::timestamptz
      ),
      COALESCE(
        ca.call_date,
        '-infinity'::timestamptz
      ),
      COALESCE(
        f.scheduled_at,
        '-infinity'::timestamptz
      )
    )
  ) AS last_activity_at

FROM public.customers c

LEFT JOIN public.orders o
  ON o.customer_id = c.id
 AND o.deleted_at IS NULL
 AND o.status = 'confirmed'

LEFT JOIN public.calls ca
  ON ca.customer_id = c.id
 AND ca.deleted_at IS NULL

LEFT JOIN public.follow_ups f
  ON f.customer_id = c.id
 AND f.deleted_at IS NULL

WHERE c.deleted_at IS NULL

GROUP BY
  c.company_id,
  c.id,
  c.name;


-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON VIEW public.v_daily_sales IS
  'Daily real sales. Only orders with at least one loading_confirmed waybill are included.';

COMMENT ON VIEW public.v_weekly_sales IS
  'Weekly real sales. Only orders with at least one loading_confirmed waybill are included.';

COMMENT ON VIEW public.v_monthly_sales IS
  'Monthly real sales. Only orders with at least one loading_confirmed waybill are included.';

COMMENT ON VIEW public.v_region_comparison IS
  'Regional real-sales comparison based on loading_confirmed waybills.';

COMMENT ON VIEW public.v_city_comparison IS
  'City real-sales comparison based on loading_confirmed waybills.';

COMMENT ON VIEW public.v_sales_trend IS
  'Monthly real-sales trend based on loading_confirmed waybills.';

COMMENT ON VIEW public.v_top_products IS
  'Top products by loaded tonnage from loading_confirmed waybills.';

COMMENT ON VIEW public.v_customer_activity IS
  'Customer activity where order activity counts only real sales with loading_confirmed waybills.';
-- =============================================================================
-- Gypsum Sales CRM — Reporting Views
-- =============================================================================

CREATE OR REPLACE VIEW public.v_daily_sales
WITH (security_invoker = true)
AS
SELECT
  o.company_id,
  o.order_date AS sales_date,
  o.sales_user_id,
  COUNT(*) AS order_count,
  SUM(o.total_tonnage) AS total_tonnage
FROM public.orders o
WHERE o.deleted_at IS NULL
  AND o.status = 'confirmed'
GROUP BY o.company_id, o.order_date, o.sales_user_id;

CREATE OR REPLACE VIEW public.v_weekly_sales
WITH (security_invoker = true)
AS
SELECT
  o.company_id,
  date_trunc('week', o.order_date)::date AS week_start,
  o.sales_user_id,
  COUNT(*) AS order_count,
  SUM(o.total_tonnage) AS total_tonnage
FROM public.orders o
WHERE o.deleted_at IS NULL
  AND o.status = 'confirmed'
GROUP BY o.company_id, date_trunc('week', o.order_date), o.sales_user_id;

CREATE OR REPLACE VIEW public.v_monthly_sales
WITH (security_invoker = true)
AS
SELECT
  o.company_id,
  EXTRACT(YEAR FROM o.order_date)::smallint AS sales_year,
  EXTRACT(MONTH FROM o.order_date)::smallint AS sales_month,
  o.sales_user_id,
  COUNT(*) AS order_count,
  SUM(o.total_tonnage) AS total_tonnage
FROM public.orders o
WHERE o.deleted_at IS NULL
  AND o.status = 'confirmed'
GROUP BY
  o.company_id,
  EXTRACT(YEAR FROM o.order_date),
  EXTRACT(MONTH FROM o.order_date),
  o.sales_user_id;

CREATE OR REPLACE VIEW public.v_region_comparison
WITH (security_invoker = true)
AS
SELECT
  o.company_id,
  r.id AS region_id,
  r.name AS region_name,
  date_trunc('month', o.order_date)::date AS sales_month,
  COUNT(DISTINCT o.customer_id) AS active_customers,
  COUNT(*) AS order_count,
  SUM(o.total_tonnage) AS total_tonnage
FROM public.orders o
JOIN public.customers c ON c.id = o.customer_id AND c.deleted_at IS NULL
JOIN public.cities ci ON ci.id = c.city_id AND ci.deleted_at IS NULL
JOIN public.regions r ON r.id = ci.region_id AND r.deleted_at IS NULL
WHERE o.deleted_at IS NULL
  AND o.status = 'confirmed'
GROUP BY o.company_id, r.id, r.name, date_trunc('month', o.order_date);

CREATE OR REPLACE VIEW public.v_city_comparison
WITH (security_invoker = true)
AS
SELECT
  o.company_id,
  ci.id AS city_id,
  ci.name AS city_name,
  r.id AS region_id,
  r.name AS region_name,
  date_trunc('month', o.order_date)::date AS sales_month,
  COUNT(DISTINCT o.customer_id) AS active_customers,
  COUNT(*) AS order_count,
  SUM(o.total_tonnage) AS total_tonnage
FROM public.orders o
JOIN public.customers c ON c.id = o.customer_id AND c.deleted_at IS NULL
JOIN public.cities ci ON ci.id = c.city_id AND ci.deleted_at IS NULL
JOIN public.regions r ON r.id = ci.region_id AND r.deleted_at IS NULL
WHERE o.deleted_at IS NULL
  AND o.status = 'confirmed'
GROUP BY
  o.company_id,
  ci.id,
  ci.name,
  r.id,
  r.name,
  date_trunc('month', o.order_date);

CREATE OR REPLACE VIEW public.v_customer_ranking
WITH (security_invoker = true)
AS
SELECT
  c.company_id,
  c.id AS customer_id,
  c.name AS customer_name,
  c.customer_type,
  ci.name AS city_name,
  r.name AS region_name,
  c.lifetime_tonnage,
  c.average_monthly_tonnage,
  c.total_order_count,
  c.last_order_at,
  RANK() OVER (
    PARTITION BY c.company_id
    ORDER BY c.lifetime_tonnage DESC, c.average_monthly_tonnage DESC
  ) AS tonnage_rank
FROM public.customers c
JOIN public.cities ci ON ci.id = c.city_id AND ci.deleted_at IS NULL
JOIN public.regions r ON r.id = ci.region_id AND r.deleted_at IS NULL
WHERE c.deleted_at IS NULL
  AND c.is_active = true;

CREATE OR REPLACE VIEW public.v_inactive_customers
WITH (security_invoker = true)
AS
SELECT
  c.company_id,
  c.id AS customer_id,
  c.name AS customer_name,
  c.customer_type,
  ci.name AS city_name,
  r.name AS region_name,
  c.inactivity_days,
  c.last_order_at,
  c.last_call_at,
  c.last_follow_up_at,
  c.average_monthly_tonnage
FROM public.customers c
JOIN public.cities ci ON ci.id = c.city_id AND ci.deleted_at IS NULL
JOIN public.regions r ON r.id = ci.region_id AND r.deleted_at IS NULL
WHERE c.deleted_at IS NULL
  AND c.is_active = true
  AND c.inactivity_days >= 30
  AND NOT public.customer_purchased_in_month(c.id, timezone('utc', now())::date);

CREATE OR REPLACE VIEW public.v_lost_customers
WITH (security_invoker = true)
AS
SELECT
  c.company_id,
  c.id AS customer_id,
  c.name AS customer_name,
  c.customer_type,
  ci.name AS city_name,
  r.name AS region_name,
  c.inactivity_days,
  c.lost_at,
  c.last_order_at,
  c.lifetime_tonnage
FROM public.customers c
JOIN public.cities ci ON ci.id = c.city_id AND ci.deleted_at IS NULL
JOIN public.regions r ON r.id = ci.region_id AND r.deleted_at IS NULL
WHERE c.deleted_at IS NULL
  AND c.lost_at IS NOT NULL;

CREATE OR REPLACE VIEW public.v_follow_up_performance
WITH (security_invoker = true)
AS
SELECT
  f.company_id,
  f.user_id,
  date_trunc('month', f.scheduled_at)::date AS follow_up_month,
  COUNT(*) FILTER (WHERE f.status = 'completed') AS completed_count,
  COUNT(*) FILTER (WHERE f.status = 'pending') AS pending_count,
  COUNT(*) FILTER (WHERE f.status = 'overdue') AS overdue_count,
  COUNT(*) FILTER (WHERE f.status = 'cancelled') AS cancelled_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE f.status = 'completed') / NULLIF(COUNT(*), 0),
    2
  ) AS completion_rate_pct
FROM public.follow_ups f
WHERE f.deleted_at IS NULL
GROUP BY f.company_id, f.user_id, date_trunc('month', f.scheduled_at);

CREATE OR REPLACE VIEW public.v_target_achievement
WITH (security_invoker = true)
AS
SELECT
  mp.company_id,
  mp.user_id,
  u.full_name AS sales_rep_name,
  mp.region_id,
  r.name AS region_name,
  mp.progress_year,
  mp.progress_month,
  mp.target_tonnage,
  mp.achieved_tonnage,
  mp.achievement_rate,
  mp.order_count,
  mp.last_calculated_at
FROM public.monthly_progress mp
JOIN public.users u ON u.id = mp.user_id AND u.deleted_at IS NULL
LEFT JOIN public.regions r ON r.id = mp.region_id AND r.deleted_at IS NULL
WHERE mp.deleted_at IS NULL;

CREATE OR REPLACE VIEW public.v_sales_trend
WITH (security_invoker = true)
AS
SELECT
  o.company_id,
  date_trunc('month', o.order_date)::date AS trend_month,
  SUM(o.total_tonnage) AS total_tonnage,
  COUNT(*) AS order_count,
  COUNT(DISTINCT o.customer_id) AS unique_customers,
  LAG(SUM(o.total_tonnage)) OVER (
    PARTITION BY o.company_id
    ORDER BY date_trunc('month', o.order_date)
  ) AS previous_month_tonnage
FROM public.orders o
WHERE o.deleted_at IS NULL
  AND o.status = 'confirmed'
GROUP BY o.company_id, date_trunc('month', o.order_date);

CREATE OR REPLACE VIEW public.v_top_products
WITH (security_invoker = true)
AS
SELECT
  oi.company_id,
  p.id AS product_id,
  p.name AS product_name,
  p.product_line,
  p.weight_kg,
  date_trunc('month', o.order_date)::date AS sales_month,
  SUM(oi.quantity) AS total_quantity,
  SUM(oi.tonnage) AS total_tonnage,
  RANK() OVER (
    PARTITION BY oi.company_id, date_trunc('month', o.order_date)
    ORDER BY SUM(oi.tonnage) DESC
  ) AS product_rank
FROM public.order_items oi
JOIN public.orders o ON o.id = oi.order_id AND o.deleted_at IS NULL AND o.status = 'confirmed'
JOIN public.products p ON p.id = oi.product_id AND p.deleted_at IS NULL
WHERE oi.deleted_at IS NULL
GROUP BY
  oi.company_id,
  p.id,
  p.name,
  p.product_line,
  p.weight_kg,
  date_trunc('month', o.order_date);

CREATE OR REPLACE VIEW public.v_customer_activity
WITH (security_invoker = true)
AS
SELECT
  c.company_id,
  c.id AS customer_id,
  c.name AS customer_name,
  COUNT(DISTINCT o.id) AS order_count,
  COUNT(DISTINCT ca.id) AS call_count,
  COUNT(DISTINCT f.id) AS follow_up_count,
  COUNT(DISTINCT v.id) AS visit_count,
  MAX(GREATEST(
    COALESCE(o.order_date::timestamptz, '-infinity'::timestamptz),
    COALESCE(ca.call_date, '-infinity'::timestamptz),
    COALESCE(f.scheduled_at, '-infinity'::timestamptz),
    COALESCE(v.visit_date, '-infinity'::timestamptz)
  )) AS last_activity_at
FROM public.customers c
LEFT JOIN public.orders o ON o.customer_id = c.id AND o.deleted_at IS NULL AND o.status = 'confirmed'
LEFT JOIN public.calls ca ON ca.customer_id = c.id AND ca.deleted_at IS NULL
LEFT JOIN public.follow_ups f ON f.customer_id = c.id AND f.deleted_at IS NULL
LEFT JOIN public.customer_visits v ON v.customer_id = c.id AND v.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.company_id, c.id, c.name;

CREATE OR REPLACE VIEW public.v_ai_recommendations
WITH (security_invoker = true)
AS
SELECT
  t.company_id,
  t.user_id,
  u.full_name AS sales_rep_name,
  t.task_date,
  t.recommendation_rank,
  t.customer_id,
  c.name AS customer_name,
  c.customer_type,
  ci.name AS city_name,
  r.name AS region_name,
  t.priority_score,
  t.scoring_factors,
  t.status,
  public.customer_purchased_in_month(t.customer_id, t.task_date) AS purchased_in_month
FROM public.daily_ai_tasks t
JOIN public.users u ON u.id = t.user_id AND u.deleted_at IS NULL
JOIN public.customers c ON c.id = t.customer_id AND c.deleted_at IS NULL
JOIN public.cities ci ON ci.id = c.city_id AND ci.deleted_at IS NULL
JOIN public.regions r ON r.id = ci.region_id AND r.deleted_at IS NULL
WHERE t.deleted_at IS NULL;

CREATE OR REPLACE VIEW public.v_ai_eligible_customers
WITH (security_invoker = true)
AS
SELECT
  c.company_id,
  c.assigned_user_id AS user_id,
  c.id AS customer_id,
  c.name AS customer_name,
  c.customer_type,
  ci.id AS city_id,
  ci.name AS city_name,
  r.id AS region_id,
  r.name AS region_name,
  c.average_monthly_tonnage,
  c.lifetime_tonnage,
  c.last_order_at,
  c.last_call_at,
  c.last_follow_up_at,
  c.inactivity_days,
  public.calculate_ai_priority_score(c.id, timezone('utc', now())::date) AS priority_score
FROM public.customers c
JOIN public.cities ci ON ci.id = c.city_id AND ci.deleted_at IS NULL
JOIN public.regions r ON r.id = ci.region_id AND r.deleted_at IS NULL
WHERE c.deleted_at IS NULL
  AND c.is_active = true
  AND NOT public.customer_purchased_in_month(c.id, timezone('utc', now())::date);

COMMENT ON VIEW public.v_ai_eligible_customers IS
  'Customers eligible for daily AI recommendation (no purchase in current month).';

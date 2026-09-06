CREATE OR REPLACE VIEW public.v_sales_trend
WITH (security_invoker = true)
AS
WITH loading_confirmed_orders AS (
    SELECT
        w.order_id,
        SUM(
            COALESCE(
                wi.tonnage,
                wi.quantity::numeric * wi.weight_kg_snapshot::numeric / 1000.0
            )
        ) AS loaded_tonnage
    FROM public.waybills w
    JOIN public.waybill_items wi
        ON wi.waybill_id = w.id
       AND wi.deleted_at IS NULL
    WHERE w.deleted_at IS NULL
      AND w.status = 'loading_confirmed'::public.waybill_status
    GROUP BY w.order_id
),
monthly_sales AS (
    SELECT
        o.company_id,
        period.progress_year,
        period.progress_month,
        MAKE_DATE(
            period.progress_year::integer,
            period.progress_month::integer,
            1
        ) AS trend_month,
        SUM(lco.loaded_tonnage) AS total_tonnage,
        COUNT(*) AS order_count,
        COUNT(DISTINCT o.customer_id) AS unique_customers
    FROM public.orders o
    JOIN loading_confirmed_orders lco
        ON lco.order_id = o.id
    CROSS JOIN LATERAL public.get_order_target_period(o.order_date) period
    WHERE o.deleted_at IS NULL
      AND o.status = 'confirmed'::public.order_status
    GROUP BY
        o.company_id,
        period.progress_year,
        period.progress_month
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


CREATE OR REPLACE VIEW public.v_top_products
WITH (security_invoker = true)
AS
SELECT
    wi.company_id,
    p.id AS product_id,
    p.name AS product_name,
    p.product_line,
    p.weight_kg,
    MAKE_DATE(
        period.progress_year::integer,
        period.progress_month::integer,
        1
    ) AS sales_month,
    SUM(wi.quantity) AS total_quantity,
    SUM(
        COALESCE(
            wi.tonnage,
            wi.quantity::numeric * wi.weight_kg_snapshot::numeric / 1000.0
        )
    ) AS total_tonnage,
    RANK() OVER (
        PARTITION BY
            wi.company_id,
            period.progress_year,
            period.progress_month
        ORDER BY
            SUM(
                COALESCE(
                    wi.tonnage,
                    wi.quantity::numeric * wi.weight_kg_snapshot::numeric / 1000.0
                )
            ) DESC
    ) AS product_rank
FROM public.waybill_items wi
JOIN public.waybills w
    ON w.id = wi.waybill_id
   AND w.deleted_at IS NULL
   AND w.status = 'loading_confirmed'::public.waybill_status
JOIN public.orders o
    ON o.id = w.order_id
   AND o.deleted_at IS NULL
   AND o.status = 'confirmed'::public.order_status
JOIN public.products p
    ON p.id = wi.product_id
   AND p.deleted_at IS NULL
CROSS JOIN LATERAL public.get_order_target_period(o.order_date) period
WHERE wi.deleted_at IS NULL
GROUP BY
    wi.company_id,
    p.id,
    p.name,
    p.product_line,
    p.weight_kg,
    period.progress_year,
    period.progress_month;

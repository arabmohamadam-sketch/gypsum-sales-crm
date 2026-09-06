CREATE OR REPLACE VIEW public.v_monthly_sales AS
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
sales_with_period AS (
    SELECT
        o.company_id,
        o.sales_user_id,
        o.customer_id,
        lco.loaded_tonnage,
        period.progress_year,
        period.progress_month
    FROM public.orders o
    JOIN loading_confirmed_orders lco
        ON lco.order_id = o.id
    CROSS JOIN LATERAL public.get_order_target_period(o.order_date) period
    WHERE o.deleted_at IS NULL
      AND o.status = 'confirmed'::public.order_status
)
SELECT
    company_id,
    progress_year::smallint AS sales_year,
    progress_month::smallint AS sales_month,
    sales_user_id,
    COUNT(*) AS order_count,
    SUM(loaded_tonnage) AS total_tonnage
FROM sales_with_period
GROUP BY
    company_id,
    progress_year,
    progress_month,
    sales_user_id;

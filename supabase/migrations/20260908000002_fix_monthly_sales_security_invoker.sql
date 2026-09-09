BEGIN;

ALTER VIEW public.v_monthly_sales
SET (security_invoker = true);

COMMIT;
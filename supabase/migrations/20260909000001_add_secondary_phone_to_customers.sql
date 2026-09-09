BEGIN;

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS secondary_phone text;

COMMENT ON COLUMN public.customers.secondary_phone
IS 'شماره تماس دوم مشتری، در صورت وجود';

CREATE INDEX IF NOT EXISTS idx_customers_secondary_phone
ON public.customers (company_id, secondary_phone)
WHERE deleted_at IS NULL
  AND secondary_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_phone
ON public.customers (company_id, phone)
WHERE deleted_at IS NULL
  AND phone IS NOT NULL;

COMMIT;
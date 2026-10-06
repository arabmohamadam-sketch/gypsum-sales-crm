-- ============================================================================
-- V2 CUSTOMER COMPLETENESS FOUNDATION
-- ============================================================================
-- Purpose:
--   Add the V2-only customer data required before a V2 order may be created.
--
-- V2 required customer data:
--   1. Full name
--   2. Primary phone
--   3. Regional manager
--   4. Main address with city
--   5. National ID
--
-- Notes:
--   - V1 behavior remains unchanged.
--   - Existing customers are preserved.
--   - Existing customer_addresses is reused for the customer's main address.
--   - The delivery/receiver address used later for voucher issuance is a
--     separate workflow and is intentionally not copied into the customer
--     master data here.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. National ID
-- ---------------------------------------------------------------------------

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS national_id text;

COMMENT ON COLUMN public.customers.national_id
IS
  'V2 required customer national identification number. Stored as normalized 10-digit text.';

-- National ID must be either NULL or exactly 10 ASCII digits.
-- Normalization of Persian/Arabic digits is handled by the V2 application layer
-- before persistence.
ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_national_id_format;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_national_id_format
  CHECK (
    national_id IS NULL
    OR btrim(national_id) ~ '^[0-9]{10}$'
  );

-- Keep national ID unique among active, non-deleted customers inside a company.
-- This prevents two active V2 customer records in the same company from
-- representing the same national ID while still allowing historical/deleted
-- rows to remain in the database.
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_company_national_id_active
  ON public.customers (company_id, national_id)
  WHERE deleted_at IS NULL
    AND national_id IS NOT NULL
    AND btrim(national_id) <> '';

-- ---------------------------------------------------------------------------
-- 2. Helpful V2 completeness index
-- ---------------------------------------------------------------------------
-- The primary-address uniqueness already exists in the V1 schema:
--   uq_customer_addresses_primary_active(customer_id)
--
-- This additional index makes V2 completeness checks efficient when looking
-- for a non-deleted primary address with a city.

CREATE INDEX IF NOT EXISTS idx_customer_addresses_v2_primary_customer
  ON public.customer_addresses (customer_id, city_id)
  WHERE deleted_at IS NULL
    AND is_primary = true;

-- ---------------------------------------------------------------------------
-- 3. Documentation
-- ---------------------------------------------------------------------------

COMMENT ON TABLE public.customer_addresses
IS
  'Customer address master data. V2 uses the active primary address as the customer main address; delivery/receiver address for voucher issuance is handled separately.';

COMMIT;
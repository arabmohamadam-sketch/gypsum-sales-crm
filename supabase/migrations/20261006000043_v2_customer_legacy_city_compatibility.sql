-- ============================================================================
-- V2 CUSTOMER / LEGACY CITY COMPATIBILITY
-- ============================================================================
-- PURPOSE
--   Allow V2 customers to use the shared V2 province/city master without
--   requiring a corresponding legacy public.cities record.
--
-- REASON
--   V1 customers.city_id points to the old sales-region geography:
--
--      customers.city_id
--          -> public.cities
--          -> public.regions
--
--   V2 location is intentionally independent:
--
--      customer_addresses.v2_province_code
--      customer_addresses.v2_city_code
--          -> v2_geo_provinces / v2_geo_cities
--
--   A newly added V2 city may therefore have no legacy public.cities row.
--
-- COMPATIBILITY
--   - Existing V1 rows are untouched.
--   - Existing V1 code may continue sending city_id exactly as before.
--   - The old city_id column remains available.
--   - Only the NOT NULL requirement is removed so V2 can represent locations
--     that do not exist in the legacy geography.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Allow V2 customers without a legacy city mapping
-- ============================================================================

ALTER TABLE public.customers
    ALTER COLUMN city_id DROP NOT NULL;

COMMENT ON COLUMN public.customers.city_id
IS
    'Legacy V1 city reference. May be NULL for V2 customers whose location is represented by the shared v2_geo province/city master on customer_addresses.';

-- ============================================================================
-- 2. Documentation
-- ============================================================================

COMMENT ON TABLE public.customers
IS
    'Customer master. V1 may continue using city_id; V2 location identity is stored through the shared v2_geo location contract on customer_addresses.';

COMMIT;
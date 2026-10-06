-- ============================================================================
-- V2 SHARED LOCATION MASTER
-- ============================================================================
-- PURPOSE
--   Shared province/city infrastructure for the complete V2 ecosystem.
--
-- V2 APPLICATIONS
--   1. CRM
--   2. Customer / Representative Application
--   3. Shipment Announcement Application
--   4. Voucher Issuance Application
--   5. CEO / Management Application
--
-- DESIGN
--   - Iranian provinces are global master data.
--   - Base Iranian cities are bundled with the applications for offline use.
--   - Cities manually added by users are persisted in Supabase.
--   - Custom cities are company-scoped and synchronized between all V2 apps
--     belonging to that company.
--   - Legacy public.regions / public.cities remain untouched.
--   - Legacy customers.city_id remains untouched for V1 compatibility.
--   - V2 customer addresses use stable province/city codes.
--
-- OFFLINE-FIRST CONTRACT
--   province_code + city_code are the stable cross-application identifiers.
--   A custom city receives a persistent UUID-based code so it can be created
--   offline and synchronized later without depending on database-generated
--   ordering.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. SHARED PROVINCE MASTER
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.v2_geo_provinces (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    code text NOT NULL,
    name_fa text NOT NULL,

    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,

    created_at timestamptz NOT NULL
        DEFAULT timezone('utc', now()),

    updated_at timestamptz NOT NULL
        DEFAULT timezone('utc', now()),

    deleted_at timestamptz,

    CONSTRAINT v2_geo_provinces_code_unique
        UNIQUE (code),

    CONSTRAINT v2_geo_provinces_code_not_blank
        CHECK (btrim(code) <> ''),

    CONSTRAINT v2_geo_provinces_name_not_blank
        CHECK (btrim(name_fa) <> '')
);

COMMENT ON TABLE public.v2_geo_provinces
IS
    'Shared V2 Iranian province master used by CRM, Customer, Shipment, Voucher and CEO applications.';

COMMENT ON COLUMN public.v2_geo_provinces.code
IS
    'Stable province identifier shared across all V2 applications and offline clients.';

COMMENT ON COLUMN public.v2_geo_provinces.name_fa
IS
    'Persian province display name.';

CREATE INDEX IF NOT EXISTS idx_v2_geo_provinces_active_sort
ON public.v2_geo_provinces (
    sort_order
)
WHERE deleted_at IS NULL
  AND is_active = true;

DROP TRIGGER IF EXISTS trg_v2_geo_provinces_updated_at
ON public.v2_geo_provinces;

CREATE TRIGGER trg_v2_geo_provinces_updated_at
BEFORE UPDATE ON public.v2_geo_provinces
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_v2_geo_provinces_prevent_hard_delete
ON public.v2_geo_provinces;

CREATE TRIGGER trg_v2_geo_provinces_prevent_hard_delete
BEFORE DELETE ON public.v2_geo_provinces
FOR EACH ROW
EXECUTE FUNCTION public.prevent_hard_delete();

-- ============================================================================
-- 2. BASE IRANIAN PROVINCES
-- ============================================================================

INSERT INTO public.v2_geo_provinces (
    code,
    name_fa,
    sort_order,
    is_active
)
VALUES
    ('east-azerbaijan', 'آذربایجان شرقی', 1, true),
    ('west-azerbaijan', 'آذربایجان غربی', 2, true),
    ('ardabil', 'اردبیل', 3, true),
    ('isfahan', 'اصفهان', 4, true),
    ('alborz', 'البرز', 5, true),
    ('ilam', 'ایلام', 6, true),
    ('bushehr', 'بوشهر', 7, true),
    ('tehran', 'تهران', 8, true),
    ('chaharmahal-and-bakhtiari', 'چهارمحال و بختیاری', 9, true),
    ('south-khorasan', 'خراسان جنوبی', 10, true),
    ('razavi-khorasan', 'خراسان رضوی', 11, true),
    ('north-khorasan', 'خراسان شمالی', 12, true),
    ('khuzestan', 'خوزستان', 13, true),
    ('zanjan', 'زنجان', 14, true),
    ('semnan', 'سمنان', 15, true),
    ('sistan-and-baluchestan', 'سیستان و بلوچستان', 16, true),
    ('fars', 'فارس', 17, true),
    ('qazvin', 'قزوین', 18, true),
    ('qom', 'قم', 19, true),
    ('kurdistan', 'کردستان', 20, true),
    ('kerman', 'کرمان', 21, true),
    ('kermanshah', 'کرمانشاه', 22, true),
    ('kohgiluyeh-and-boyer-ahmad', 'کهگیلویه و بویراحمد', 23, true),
    ('golestan', 'گلستان', 24, true),
    ('gilan', 'گیلان', 25, true),
    ('lorestan', 'لرستان', 26, true),
    ('mazandaran', 'مازندران', 27, true),
    ('markazi', 'مرکزی', 28, true),
    ('hormozgan', 'هرمزگان', 29, true),
    ('hamedan', 'همدان', 30, true),
    ('yazd', 'یزد', 31, true)
ON CONFLICT (code)
DO UPDATE SET
    name_fa = EXCLUDED.name_fa,
    sort_order = EXCLUDED.sort_order,
    is_active = true,
    deleted_at = NULL,
    updated_at = timezone('utc', now());

-- ============================================================================
-- 3. SHARED CITY MASTER
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.v2_geo_cities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    province_code text NOT NULL,

    city_code text NOT NULL,
    name_fa text NOT NULL,

    -- system:
    --   bundled/system-defined city available to every company.
    --
    -- custom:
    --   city added by an application user and persisted for one company.
    source text NOT NULL DEFAULT 'custom',

    -- NULL for system cities.
    -- Required for custom cities.
    company_id uuid
        REFERENCES public.companies(id)
        ON DELETE RESTRICT,

    created_by uuid
        REFERENCES public.users(id),

    is_active boolean NOT NULL DEFAULT true,

    created_at timestamptz NOT NULL
        DEFAULT timezone('utc', now()),

    updated_at timestamptz NOT NULL
        DEFAULT timezone('utc', now()),

    deleted_at timestamptz,

    CONSTRAINT v2_geo_cities_source_check
        CHECK (
            source IN ('system', 'custom')
        ),

    CONSTRAINT v2_geo_cities_scope_check
        CHECK (
            (
                source = 'system'
                AND company_id IS NULL
            )
            OR
            (
                source = 'custom'
                AND company_id IS NOT NULL
            )
        ),

    CONSTRAINT v2_geo_cities_province_code_not_blank
        CHECK (
            btrim(province_code) <> ''
        ),

    CONSTRAINT v2_geo_cities_city_code_not_blank
        CHECK (
            btrim(city_code) <> ''
        ),

    CONSTRAINT v2_geo_cities_name_not_blank
        CHECK (
            btrim(name_fa) <> ''
        ),

    CONSTRAINT fk_v2_geo_cities_province
        FOREIGN KEY (province_code)
        REFERENCES public.v2_geo_provinces(code)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
);

COMMENT ON TABLE public.v2_geo_cities
IS
    'Shared V2 city master. System cities are available globally; custom cities are persisted per company and synchronized across all V2 applications.';

COMMENT ON COLUMN public.v2_geo_cities.city_code
IS
    'Stable city identifier. System cities use the bundled dataset code; custom cities use an application-generated persistent identifier.';

COMMENT ON COLUMN public.v2_geo_cities.source
IS
    'system = bundled master city; custom = user-created city stored in the shared V2 backend.';

CREATE INDEX IF NOT EXISTS idx_v2_geo_cities_province_active
ON public.v2_geo_cities (
    province_code,
    name_fa
)
WHERE deleted_at IS NULL
  AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_v2_geo_cities_company_province
ON public.v2_geo_cities (
    company_id,
    province_code,
    name_fa
)
WHERE deleted_at IS NULL
  AND company_id IS NOT NULL
  AND is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_geo_cities_system_code
ON public.v2_geo_cities (
    province_code,
    city_code
)
WHERE deleted_at IS NULL
  AND source = 'system';

CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_geo_cities_system_name
ON public.v2_geo_cities (
    province_code,
    name_fa
)
WHERE deleted_at IS NULL
  AND source = 'system';

CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_geo_cities_custom_code
ON public.v2_geo_cities (
    company_id,
    city_code
)
WHERE deleted_at IS NULL
  AND source = 'custom';

CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_geo_cities_custom_name
ON public.v2_geo_cities (
    company_id,
    province_code,
    name_fa
)
WHERE deleted_at IS NULL
  AND source = 'custom';

DROP TRIGGER IF EXISTS trg_v2_geo_cities_updated_at
ON public.v2_geo_cities;

CREATE TRIGGER trg_v2_geo_cities_updated_at
BEFORE UPDATE ON public.v2_geo_cities
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_v2_geo_cities_prevent_hard_delete
ON public.v2_geo_cities;

CREATE TRIGGER trg_v2_geo_cities_prevent_hard_delete
BEFORE DELETE ON public.v2_geo_cities
FOR EACH ROW
EXECUTE FUNCTION public.prevent_hard_delete();

-- ============================================================================
-- 4. RLS — PROVINCES
-- ============================================================================

ALTER TABLE public.v2_geo_provinces
    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v2_geo_provinces_select
ON public.v2_geo_provinces;

CREATE POLICY v2_geo_provinces_select
ON public.v2_geo_provinces
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND is_active = true
);

-- Province master is centrally controlled.
-- Ordinary users do not receive INSERT/UPDATE/DELETE policies.

-- ============================================================================
-- 5. RLS — CITIES
-- ============================================================================

ALTER TABLE public.v2_geo_cities
    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v2_geo_cities_select
ON public.v2_geo_cities;

CREATE POLICY v2_geo_cities_select
ON public.v2_geo_cities
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND is_active = true
    AND (
        source = 'system'
        OR company_id = public.auth_user_company_id()
    )
);

DROP POLICY IF EXISTS v2_geo_cities_insert
ON public.v2_geo_cities;

CREATE POLICY v2_geo_cities_insert
ON public.v2_geo_cities
FOR INSERT
TO authenticated
WITH CHECK (
    source = 'custom'
    AND company_id = public.auth_user_company_id()
    AND created_by = auth.uid()
);

DROP POLICY IF EXISTS v2_geo_cities_update
ON public.v2_geo_cities;

CREATE POLICY v2_geo_cities_update
ON public.v2_geo_cities
FOR UPDATE
TO authenticated
USING (
    source = 'custom'
    AND company_id = public.auth_user_company_id()
)
WITH CHECK (
    source = 'custom'
    AND company_id = public.auth_user_company_id()
);

-- ============================================================================
-- 6. V2 LOCATION SNAPSHOT ON CUSTOMER ADDRESSES
-- ============================================================================
-- Legacy customer_addresses.city_id remains untouched.
--
-- V2 applications use these stable shared fields:
--   v2_province_code
--   v2_province_name
--   v2_city_code
--   v2_city_name
--
-- This means:
--   - Customer App can create/read them.
--   - CRM can create/read them.
--   - Shipment App can use them.
--   - Voucher App can use them.
--   - CEO App can report on them.
--
-- Delivery addresses used during voucher issuance can reuse the same
-- province/city contract independently from the customer master address.

ALTER TABLE public.customer_addresses
    ADD COLUMN IF NOT EXISTS v2_province_code text,
    ADD COLUMN IF NOT EXISTS v2_province_name text,
    ADD COLUMN IF NOT EXISTS v2_city_code text,
    ADD COLUMN IF NOT EXISTS v2_city_name text;

COMMENT ON COLUMN public.customer_addresses.v2_province_code
IS
    'V2 shared province code used across all applications.';

COMMENT ON COLUMN public.customer_addresses.v2_province_name
IS
    'V2 province display-name snapshot.';

COMMENT ON COLUMN public.customer_addresses.v2_city_code
IS
    'V2 shared city code used across all applications and offline synchronization.';

COMMENT ON COLUMN public.customer_addresses.v2_city_name
IS
    'V2 city display-name snapshot.';

ALTER TABLE public.customer_addresses
    DROP CONSTRAINT IF EXISTS customer_addresses_v2_location_consistency;

ALTER TABLE public.customer_addresses
    ADD CONSTRAINT customer_addresses_v2_location_consistency
    CHECK (
        (
            v2_province_code IS NULL
            AND v2_province_name IS NULL
            AND v2_city_code IS NULL
            AND v2_city_name IS NULL
        )
        OR
        (
            btrim(COALESCE(v2_province_code, '')) <> ''
            AND btrim(COALESCE(v2_province_name, '')) <> ''
            AND btrim(COALESCE(v2_city_code, '')) <> ''
            AND btrim(COALESCE(v2_city_name, '')) <> ''
        )
    );

CREATE INDEX IF NOT EXISTS idx_customer_addresses_v2_location
ON public.customer_addresses (
    company_id,
    v2_province_code,
    v2_city_code
)
WHERE deleted_at IS NULL;

-- ============================================================================
-- 7. FINAL DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.customer_addresses
IS
    'Customer address master. V2 province/city identity is based on the shared v2_geo location contract; shipment/voucher delivery address is handled independently.';

COMMIT;
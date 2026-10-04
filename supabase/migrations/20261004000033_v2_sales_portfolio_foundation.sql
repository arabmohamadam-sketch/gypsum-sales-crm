-- ============================================================
-- V2 Migration 33
-- Sales Portfolio / Representative Foundation
--
-- Purpose:
--   Separate the commercial identity of a sales portfolio /
--   representative from the planning bucket (Plan Area).
--
-- Examples:
--   representative:
--       عزیزی (مومن پور)
--       حسین شهروی
--       سامان جعفری
--       رستم حسن‌پور
--
--   territory:
--       سیستان
--       زاهدان
--       البرز
--       بوشهر
--       خوزستان
--       کرمان
--
--   market:
--       بازارهای متفرقه
--
--   export:
--       صادرات چین
--       صادرات عراق
--
-- IMPORTANT:
--   - No manager is assigned in this migration.
--   - No customer is modified.
--   - No order is modified.
--   - No monthly target is modified.
--   - Existing Plan Area manager-assignment history remains the
--     canonical historical ownership mechanism.
--   - V1 is untouched.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. MANAGEMENT CAPABILITY
-- ============================================================

INSERT INTO public.v2_management_capabilities (
    capability,
    description,
    is_active
)
VALUES (
    'sales_portfolios.manage',
    'ایجاد، ویرایش و مدیریت سبدهای فروش و نمایندگی‌های تجاری',
    true
)
ON CONFLICT (capability)
DO UPDATE SET
    description = EXCLUDED.description,
    is_active = true;

-- ============================================================
-- 2. SALES PORTFOLIOS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.v2_sales_portfolios (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id uuid NOT NULL,

    name text NOT NULL,

    code text,

    portfolio_kind text NOT NULL DEFAULT 'other',

    description text,

    coverage_description text,

    sort_order integer NOT NULL DEFAULT 0,

    is_active boolean NOT NULL DEFAULT true,

    created_by uuid,

    updated_by uuid,

    created_at timestamptz NOT NULL
        DEFAULT timezone('utc'::text, now()),

    updated_at timestamptz NOT NULL
        DEFAULT timezone('utc'::text, now()),

    deleted_at timestamptz,

    CONSTRAINT fk_v2_sales_portfolios_company
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id),

    CONSTRAINT fk_v2_sales_portfolios_created_by
        FOREIGN KEY (created_by)
        REFERENCES public.users(id),

    CONSTRAINT fk_v2_sales_portfolios_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES public.users(id),

    CONSTRAINT v2_sales_portfolios_name_not_blank
        CHECK (
            btrim(name) <> ''
        ),

    CONSTRAINT v2_sales_portfolios_code_not_blank
        CHECK (
            code IS NULL
            OR btrim(code) <> ''
        ),

    CONSTRAINT v2_sales_portfolios_kind_check
        CHECK (
            portfolio_kind IN (
                'representative',
                'territory',
                'market',
                'export',
                'special',
                'other'
            )
        ),

    CONSTRAINT v2_sales_portfolios_sort_order_check
        CHECK (
            sort_order >= 0
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_sales_portfolios_code
ON public.v2_sales_portfolios (
    company_id,
    code
)
WHERE deleted_at IS NULL
  AND code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_v2_sales_portfolios_company
ON public.v2_sales_portfolios (
    company_id,
    is_active,
    sort_order
)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_sales_portfolios_kind
ON public.v2_sales_portfolios (
    company_id,
    portfolio_kind
)
WHERE deleted_at IS NULL;

-- ============================================================
-- 3. TIMESTAMP TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS trg_v2_sales_portfolios_updated_at
    ON public.v2_sales_portfolios;

CREATE TRIGGER trg_v2_sales_portfolios_updated_at
BEFORE UPDATE
ON public.v2_sales_portfolios
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. HARD DELETE PROTECTION
-- ============================================================

DROP TRIGGER IF EXISTS trg_v2_sales_portfolios_prevent_hard_delete
    ON public.v2_sales_portfolios;

CREATE TRIGGER trg_v2_sales_portfolios_prevent_hard_delete
BEFORE DELETE
ON public.v2_sales_portfolios
FOR EACH ROW
EXECUTE FUNCTION public.prevent_hard_delete();

-- ============================================================
-- 5. LINK PLAN AREA TO SALES PORTFOLIO
--
-- Only Portfolio Plan Areas may use this field.
--
-- Regional Plan Areas must keep it NULL.
-- ============================================================

ALTER TABLE public.v2_plan_areas
    ADD COLUMN IF NOT EXISTS sales_portfolio_id uuid;

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_v2_plan_areas_sales_portfolio'
          AND conrelid = 'public.v2_plan_areas'::regclass
    ) THEN

        ALTER TABLE public.v2_plan_areas
            ADD CONSTRAINT fk_v2_plan_areas_sales_portfolio
            FOREIGN KEY (sales_portfolio_id)
            REFERENCES public.v2_sales_portfolios(id);

    END IF;

END;
$$;

CREATE INDEX IF NOT EXISTS idx_v2_plan_areas_sales_portfolio
ON public.v2_plan_areas (
    company_id,
    sales_portfolio_id
)
WHERE deleted_at IS NULL
  AND sales_portfolio_id IS NOT NULL;

-- ============================================================
-- 6. PLAN AREA / SALES PORTFOLIO CONSISTENCY
-- ============================================================

CREATE OR REPLACE FUNCTION public.v2_validate_plan_area_sales_portfolio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_portfolio_company_id uuid;
BEGIN

    -- Regional Plan Area cannot reference a Sales Portfolio.
    IF NEW.area_type = 'regional'
       AND NEW.sales_portfolio_id IS NOT NULL
    THEN
        RAISE EXCEPTION
            'Regional Plan Area cannot have a Sales Portfolio.';
    END IF;

    -- Portfolio Plan Area may optionally reference a Sales Portfolio.
    IF NEW.sales_portfolio_id IS NOT NULL THEN

        SELECT sp.company_id
        INTO v_portfolio_company_id
        FROM public.v2_sales_portfolios AS sp
        WHERE sp.id = NEW.sales_portfolio_id
          AND sp.deleted_at IS NULL
        LIMIT 1;

        IF v_portfolio_company_id IS NULL THEN
            RAISE EXCEPTION
                'Selected Sales Portfolio does not exist.';
        END IF;

        IF v_portfolio_company_id <> NEW.company_id THEN
            RAISE EXCEPTION
                'Sales Portfolio must belong to the same company as the Plan Area.';
        END IF;

        IF NEW.area_type <> 'portfolio' THEN
            RAISE EXCEPTION
                'Sales Portfolio can only be linked to a Portfolio Plan Area.';
        END IF;

    END IF;

    RETURN NEW;

END;
$function$;

DROP TRIGGER IF EXISTS trg_v2_validate_plan_area_sales_portfolio
    ON public.v2_plan_areas;

CREATE TRIGGER trg_v2_validate_plan_area_sales_portfolio
BEFORE INSERT OR UPDATE
ON public.v2_plan_areas
FOR EACH ROW
EXECUTE FUNCTION public.v2_validate_plan_area_sales_portfolio();

-- ============================================================
-- 7. SALES PORTFOLIO RLS
--
-- Read:
--   CEO / Admin
--   Sales Manager
--   manager currently assigned to linked Portfolio Plan Area
--
-- Write:
--   no direct INSERT / UPDATE / DELETE policy yet.
--   Controlled RPC will be added in a later migration.
-- ============================================================

ALTER TABLE public.v2_sales_portfolios
    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v2_sales_portfolios_select
    ON public.v2_sales_portfolios;

CREATE POLICY v2_sales_portfolios_select
ON public.v2_sales_portfolios
FOR SELECT
TO authenticated
USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND (
        public.auth_user_is_admin()

        OR public.v2_is_company_ceo(company_id)

        OR public.auth_user_has_company_role(
            company_id,
            'sales_manager'
        )

        OR EXISTS (
            SELECT 1
            FROM public.v2_plan_areas AS pa
            INNER JOIN public.v2_plan_area_manager_assignment_history AS h
                ON h.plan_area_id = pa.id
               AND h.company_id = pa.company_id
               AND h.effective_to IS NULL
            WHERE pa.sales_portfolio_id =
                  v2_sales_portfolios.id
              AND pa.company_id =
                  v2_sales_portfolios.company_id
              AND pa.area_type = 'portfolio'
              AND pa.deleted_at IS NULL
              AND h.manager_user_id = auth.uid()
        )
    )
);

-- ============================================================
-- 8. BACKFILL / SEED SALES PORTFOLIOS
--
-- Existing Portfolio Plan Areas are converted into corresponding
-- commercial portfolio records.
--
-- No manager is assigned.
-- ============================================================

INSERT INTO public.v2_sales_portfolios (
    company_id,
    name,
    code,
    portfolio_kind,
    description,
    coverage_description,
    sort_order,
    is_active
)
SELECT
    pa.company_id,

    pa.name,

    'sales:' || pa.code,

    CASE
        WHEN pa.code IN (
            'portfolio:azizi-momenpour',
            'portfolio:hosein-shahroui',
            'portfolio:saman-jafari',
            'portfolio:rostam-hassanpour'
        )
            THEN 'representative'

        WHEN pa.code IN (
            'portfolio:sistan',
            'portfolio:zahedan',
            'portfolio:alborz',
            'portfolio:bushehr',
            'portfolio:khuzestan',
            'portfolio:kerman'
        )
            THEN 'territory'

        WHEN pa.code = 'portfolio:misc-markets'
            THEN 'market'

        WHEN pa.code IN (
            'portfolio:export-china',
            'portfolio:export-iraq'
        )
            THEN 'export'

        ELSE 'other'
    END,

    'موجودیت تجاری سبد فروش برای برنامه‌ریزی V2',

    CASE
        WHEN pa.code = 'portfolio:azizi-momenpour'
            THEN 'سبد فروش نماینده / مشتری ویژه؛ مالک مدیریتی در مرحله بعد ثبت می‌شود.'

        WHEN pa.code = 'portfolio:hosein-shahroui'
            THEN 'سبد فروش حسین شهروی؛ پوشش جغرافیایی می‌تواند فراتر از یک منطقه باشد.'

        WHEN pa.code = 'portfolio:saman-jafari'
            THEN 'سبد فروش سامان جعفری؛ پوشش فعال در استان‌های غربی.'

        WHEN pa.code = 'portfolio:rostam-hassanpour'
            THEN 'سبد فروش رستم حسن‌پور؛ پوشش جغرافیایی قابل تغییر در طول زمان.'

        WHEN pa.code IN (
            'portfolio:sistan',
            'portfolio:zahedan',
            'portfolio:alborz',
            'portfolio:bushehr',
            'portfolio:khuzestan',
            'portfolio:kerman'
        )
            THEN 'سبد فروش مبتنی بر قلمرو تجاری؛ مالک مدیریتی بعداً ثبت می‌شود.'

        WHEN pa.code = 'portfolio:misc-markets'
            THEN 'سبد بازارهای متفرقه.'

        WHEN pa.code IN (
            'portfolio:export-china',
            'portfolio:export-iraq'
        )
            THEN 'سبد صادراتی.'

        ELSE
            'سبد فروش تجاری V2.'
    END,

    pa.sort_order,

    true
FROM public.v2_plan_areas AS pa
WHERE pa.company_id =
      '11111111-1111-1111-1111-111111111111'
  AND pa.area_type = 'portfolio'
  AND pa.deleted_at IS NULL
  AND NOT EXISTS (
        SELECT 1
        FROM public.v2_sales_portfolios AS existing
        WHERE existing.company_id = pa.company_id
          AND existing.code = 'sales:' || pa.code
          AND existing.deleted_at IS NULL
    );

-- ============================================================
-- 9. LINK EXISTING PORTFOLIO PLAN AREAS
-- ============================================================

UPDATE public.v2_plan_areas AS pa
SET
    sales_portfolio_id = sp.id,
    updated_at = timezone('utc'::text, now())
FROM public.v2_sales_portfolios AS sp
WHERE pa.company_id =
      '11111111-1111-1111-1111-111111111111'
  AND pa.area_type = 'portfolio'
  AND pa.deleted_at IS NULL
  AND sp.company_id = pa.company_id
  AND sp.code = 'sales:' || pa.code
  AND sp.deleted_at IS NULL
  AND pa.sales_portfolio_id IS NULL;

-- ============================================================
-- 10. SAFETY CHECK
-- Every active Portfolio Plan Area created before Migration 33
-- must now have a Sales Portfolio.
-- ============================================================

DO $$
DECLARE
    v_unlinked_count integer;
BEGIN

    SELECT COUNT(*)
    INTO v_unlinked_count
    FROM public.v2_plan_areas AS pa
    WHERE pa.company_id =
          '11111111-1111-1111-1111-111111111111'
      AND pa.area_type = 'portfolio'
      AND pa.deleted_at IS NULL
      AND pa.is_active = true
      AND pa.sales_portfolio_id IS NULL;

    IF v_unlinked_count > 0 THEN

        RAISE EXCEPTION
            'V2 Sales Portfolio foundation failed: % active Portfolio Plan Areas remain unlinked.',
            v_unlinked_count
            USING ERRCODE = 'P0001';

    END IF;

END;
$$;

-- ============================================================
-- 11. SAFETY CHECK
-- Regional Plan Areas must remain unlinked.
-- ============================================================

DO $$
DECLARE
    v_invalid_count integer;
BEGIN

    SELECT COUNT(*)
    INTO v_invalid_count
    FROM public.v2_plan_areas AS pa
    WHERE pa.company_id =
          '11111111-1111-1111-1111-111111111111'
      AND pa.area_type = 'regional'
      AND pa.deleted_at IS NULL
      AND pa.sales_portfolio_id IS NOT NULL;

    IF v_invalid_count > 0 THEN

        RAISE EXCEPTION
            'V2 Sales Portfolio foundation failed: % Regional Plan Areas are incorrectly linked to Sales Portfolios.',
            v_invalid_count
            USING ERRCODE = 'P0001';

    END IF;

END;
$$;

-- ============================================================
-- 12. SAFETY CHECK
-- All seeded Portfolio records must be active and unique.
-- ============================================================

DO $$
DECLARE
    v_portfolio_count integer;
    v_duplicate_count integer;
BEGIN

    SELECT COUNT(*)
    INTO v_portfolio_count
    FROM public.v2_sales_portfolios
    WHERE company_id =
          '11111111-1111-1111-1111-111111111111'
      AND deleted_at IS NULL;

    IF v_portfolio_count < 13 THEN

        RAISE EXCEPTION
            'V2 Sales Portfolio foundation failed: expected at least 13 Portfolio records, found %.',
            v_portfolio_count
            USING ERRCODE = 'P0001';

    END IF;

    SELECT COUNT(*)
    INTO v_duplicate_count
    FROM (
        SELECT
            company_id,
            code
        FROM public.v2_sales_portfolios
        WHERE company_id =
              '11111111-1111-1111-1111-111111111111'
          AND deleted_at IS NULL
          AND code IS NOT NULL
        GROUP BY
            company_id,
            code
        HAVING COUNT(*) > 1
    ) AS duplicates;

    IF v_duplicate_count > 0 THEN

        RAISE EXCEPTION
            'V2 Sales Portfolio foundation failed: % duplicate active portfolio codes exist.',
            v_duplicate_count
            USING ERRCODE = 'P0001';

    END IF;

END;
$$;

-- ============================================================
-- 13. COMMENTS
-- ============================================================

COMMENT ON TABLE public.v2_sales_portfolios IS
    'V2 commercial identity of a sales portfolio, representative, territory, market or export bucket. It is distinct from geographic Region and from the technical Plan Area.';

COMMENT ON COLUMN public.v2_sales_portfolios.portfolio_kind IS
    'Commercial classification: representative, territory, market, export, special or other.';

COMMENT ON COLUMN public.v2_sales_portfolios.coverage_description IS
    'Free-form business description of the commercial coverage. This is not used as geographic ownership logic.';

COMMENT ON COLUMN public.v2_plan_areas.sales_portfolio_id IS
    'Links a Portfolio Plan Area to its commercial Sales Portfolio identity. Regional Plan Areas must keep this NULL.';

COMMENT ON FUNCTION public.v2_validate_plan_area_sales_portfolio()
IS
    'Validates that Sales Portfolio links are used only with Portfolio Plan Areas and belong to the same company.';

COMMIT;
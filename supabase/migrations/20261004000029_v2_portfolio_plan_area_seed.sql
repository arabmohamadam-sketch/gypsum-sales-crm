-- ============================================================
-- V2 Migration 29
-- Portfolio Plan Area Seed
--
-- Purpose:
--   Create the commercial Portfolio Plan Areas identified from
--   the approved Excel planning structure.
--
-- IMPORTANT:
--   - No Portfolio Plan Area is assigned to a user yet.
--   - No Customer is modified.
--   - No Order is modified.
--   - No Monthly Target is created.
--   - Manager assignment will be done later through the
--     effective-dated Portfolio assignment system after the
--     real manager identities exist in public.users / Auth.
--
-- Current planning portfolios:
--
--   Eman Asadi:
--      عزیزی (مومن پور)
--      سیستان
--      زاهدان
--      بازارهای متفرقه
--      صادرات چین
--      صادرات عراق
--
--   Farhang Yaghmaei:
--      البرز
--      حسین شهروی
--      بوشهر
--
--   Mohammad Karke-Abadi:
--      سامان جعفری
--      رستم حسن‌پور
--      خوزستان
--      کرمان
--
-- The intended manager mapping above is preserved as migration
-- documentation only. It is NOT stored as a foreign key until
-- the real manager accounts exist.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Seed Portfolio Plan Areas
-- ============================================================

INSERT INTO public.v2_plan_areas (
    company_id,
    name,
    code,
    area_type,
    region_id,
    description,
    sort_order,
    is_active
)
SELECT
    '11111111-1111-1111-1111-111111111111'::uuid,
    x.name,
    x.code,
    'portfolio',
    NULL,
    'سبد فروش تجاری برای برنامه‌ریزی V2؛ واگذاری مدیر بعداً انجام می‌شود.',
    x.sort_order,
    true
FROM (
    VALUES
        (
            'عزیزی (مومن پور)',
            'portfolio:azizi-momenpour',
            101
        ),
        (
            'سیستان',
            'portfolio:sistan',
            102
        ),
        (
            'زاهدان',
            'portfolio:zahedan',
            103
        ),
        (
            'بازارهای متفرقه',
            'portfolio:misc-markets',
            104
        ),
        (
            'صادرات چین',
            'portfolio:export-china',
            105
        ),
        (
            'صادرات عراق',
            'portfolio:export-iraq',
            106
        ),
        (
            'البرز',
            'portfolio:alborz',
            107
        ),
        (
            'حسین شهروی',
            'portfolio:hosein-shahroui',
            108
        ),
        (
            'بوشهر',
            'portfolio:bushehr',
            109
        ),
        (
            'سامان جعفری',
            'portfolio:saman-jafari',
            110
        ),
        (
            'رستم حسن‌پور',
            'portfolio:rostam-hassanpour',
            111
        ),
        (
            'خوزستان',
            'portfolio:khuzestan',
            112
        ),
        (
            'کرمان',
            'portfolio:kerman',
            113
        )
) AS x(name, code, sort_order)
WHERE NOT EXISTS (
    SELECT 1
    FROM public.v2_plan_areas AS existing
    WHERE existing.company_id =
          '11111111-1111-1111-1111-111111111111'::uuid
      AND existing.code = x.code
      AND existing.deleted_at IS NULL
);

-- ============================================================
-- 2. Safety check:
--    All expected Portfolio Plan Areas must exist exactly once
--    among active records.
-- ============================================================

DO $$
DECLARE
    v_expected_count integer := 13;
    v_actual_count integer;
    v_duplicate_count integer;
BEGIN

    SELECT COUNT(*)
    INTO v_actual_count
    FROM public.v2_plan_areas
    WHERE company_id =
          '11111111-1111-1111-1111-111111111111'::uuid
      AND area_type = 'portfolio'
      AND deleted_at IS NULL
      AND code IN (
          'portfolio:azizi-momenpour',
          'portfolio:sistan',
          'portfolio:zahedan',
          'portfolio:misc-markets',
          'portfolio:export-china',
          'portfolio:export-iraq',
          'portfolio:alborz',
          'portfolio:hosein-shahroui',
          'portfolio:bushehr',
          'portfolio:saman-jafari',
          'portfolio:rostam-hassanpour',
          'portfolio:khuzestan',
          'portfolio:kerman'
      );

    IF v_actual_count <> v_expected_count THEN
        RAISE EXCEPTION
            'V2 Portfolio Plan Area seed failed: expected % active Portfolio Plan Areas, found %.',
            v_expected_count,
            v_actual_count
            USING ERRCODE = 'P0001';
    END IF;

    SELECT COUNT(*)
    INTO v_duplicate_count
    FROM (
        SELECT
            company_id,
            code
        FROM public.v2_plan_areas
        WHERE company_id =
              '11111111-1111-1111-1111-111111111111'::uuid
          AND area_type = 'portfolio'
          AND deleted_at IS NULL
          AND code IS NOT NULL
        GROUP BY
            company_id,
            code
        HAVING COUNT(*) > 1
    ) AS duplicates;

    IF v_duplicate_count > 0 THEN
        RAISE EXCEPTION
            'V2 Portfolio Plan Area seed failed: % duplicate active Portfolio codes exist.',
            v_duplicate_count
            USING ERRCODE = 'P0001';
    END IF;

END;
$$;

-- ============================================================
-- 3. Final state validation
--
-- No Portfolio Plan Area may accidentally have a region.
-- ============================================================

DO $$
DECLARE
    v_invalid_count integer;
BEGIN

    SELECT COUNT(*)
    INTO v_invalid_count
    FROM public.v2_plan_areas
    WHERE company_id =
          '11111111-1111-1111-1111-111111111111'::uuid
      AND area_type = 'portfolio'
      AND deleted_at IS NULL
      AND region_id IS NOT NULL;

    IF v_invalid_count > 0 THEN
        RAISE EXCEPTION
            'V2 Portfolio Plan Area seed failed: % Portfolio Plan Areas have region_id.',
            v_invalid_count
            USING ERRCODE = 'P0001';
    END IF;

END;
$$;

COMMIT;
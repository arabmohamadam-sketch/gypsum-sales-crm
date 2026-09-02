-- =============================================================================
-- Gypsum Sales CRM — Region Reassignment
-- =============================================================================
-- منطقه ۱: تهران و ورامین
-- منطقه ۲: سمنان، گرمسار و مازندران غربی
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------
-- Rename regions
-- ---------------------------------------------------------

UPDATE public.regions
SET
  name = CASE code::text
    WHEN 'region-1' THEN 'تهران و ورامین'
    WHEN 'region-2' THEN 'سمنان، گرمسار و مازندران غربی'
    ELSE name
  END,
  updated_at = timezone('utc', now())
WHERE company_id =
      '11111111-1111-1111-1111-111111111111'
  AND code::text IN (
    'region-1',
    'region-2'
  )
  AND deleted_at IS NULL;


-- ---------------------------------------------------------
-- Region 1
-- Tehran + Varamin
-- ---------------------------------------------------------

UPDATE public.cities c
SET
  region_id = (
    SELECT r.id
    FROM public.regions r
    WHERE r.company_id =
          '11111111-1111-1111-1111-111111111111'
      AND r.code::text = 'region-1'
      AND r.deleted_at IS NULL
    LIMIT 1
  ),
  updated_at = timezone('utc', now())
WHERE c.company_id =
      '11111111-1111-1111-1111-111111111111'
  AND c.deleted_at IS NULL
  AND lower(btrim(c.name)) IN (
    'varamin',
    'ورامین',
    'tehran',
    'تهران'
  );


-- ---------------------------------------------------------
-- Region 2
-- Semnan + Garmsar + Western Mazandaran
-- ---------------------------------------------------------

UPDATE public.cities c
SET
  region_id = (
    SELECT r.id
    FROM public.regions r
    WHERE r.company_id =
          '11111111-1111-1111-1111-111111111111'
      AND r.code::text = 'region-2'
      AND r.deleted_at IS NULL
    LIMIT 1
  ),
  updated_at = timezone('utc', now())
WHERE c.company_id =
      '11111111-1111-1111-1111-111111111111'
  AND c.deleted_at IS NULL
  AND lower(btrim(c.name)) IN (

    'semnan',
    'سمنان',

    'garmsar',
    'گرمسار',

    'kelardasht',
    'کلاردشت',

    'marzanabad',
    'مرزن‌آباد',
    'مرزن آباد',

    'chalous',
    'chalus',
    'چالوس',

    'abbasabad',
    'عباس‌آباد',
    'عباس آباد',

    'tonekabon',
    'تنکابن',

    'ramsar',
    'رامسر'
  );


-- ---------------------------------------------------------
-- Add Tehran if it does not already exist
-- ---------------------------------------------------------

INSERT INTO public.cities (
  company_id,
  region_id,
  name,
  code,
  is_active
)
SELECT
  '11111111-1111-1111-1111-111111111111',
  r.id,
  'Tehran',
  'tehran',
  true
FROM public.regions r
WHERE r.company_id =
      '11111111-1111-1111-1111-111111111111'
  AND r.code::text = 'region-1'
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.cities c
    WHERE c.company_id =
          '11111111-1111-1111-1111-111111111111'
      AND lower(btrim(c.name)) IN (
        'tehran',
        'تهران'
      )
      AND c.deleted_at IS NULL
  );

COMMIT;
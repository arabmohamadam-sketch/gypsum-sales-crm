-- ============================================================
-- V2 Migration 27
-- Plan Area Foundation
--
-- Purpose:
--   1. Introduce V2 Plan Areas without modifying V1 target tables.
--   2. Support:
--        regional plan areas
--        portfolio / special plan areas
--   3. Introduce V2 monthly targets linked to Plan Areas.
--   4. Keep monthly targets historically stable even when regions
--      or customer ownership changes.
--   5. Seed one regional Plan Area for every active company region.
--
-- BUSINESS MODEL
--
-- Regional Plan Area:
--   - Represents a geographic sales region.
--   - region_id is required.
--
-- Portfolio Plan Area:
--   - Represents a planned commercial bucket that is NOT a region.
--   - region_id is NULL.
--   - Examples:
--       بازارهای متفرقه
--       صادرات چین
--       صادرات عراق
--       مشتری / نماینده خاص
--
-- V2 monthly target:
--   - Explicitly stores the target manager.
--   - Explicitly stores the Plan Area.
--   - Historical target ownership therefore does not change when
--     a region is transferred later.
--
-- IMPORTANT:
--   - V1 monthly_targets is NOT modified.
--   - V1 monthly_progress is NOT modified.
--   - Customers are NOT modified.
--   - Orders are NOT modified.
--   - Regions are NOT modified.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. V2 PLAN AREAS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.v2_plan_areas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id uuid NOT NULL,

    name text NOT NULL,
    code text,

    area_type text NOT NULL DEFAULT 'regional',

    region_id uuid,

    description text,

    sort_order integer NOT NULL DEFAULT 0,

    is_active boolean NOT NULL DEFAULT true,

    created_by uuid,
    updated_by uuid,

    created_at timestamptz NOT NULL
        DEFAULT timezone('utc'::text, now()),

    updated_at timestamptz NOT NULL
        DEFAULT timezone('utc'::text, now()),

    deleted_at timestamptz,

    CONSTRAINT fk_v2_plan_areas_company
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id),

    CONSTRAINT fk_v2_plan_areas_region
        FOREIGN KEY (region_id)
        REFERENCES public.regions(id),

    CONSTRAINT fk_v2_plan_areas_created_by
        FOREIGN KEY (created_by)
        REFERENCES public.users(id),

    CONSTRAINT fk_v2_plan_areas_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES public.users(id),

    CONSTRAINT v2_plan_areas_name_not_blank
        CHECK (btrim(name) <> ''),

    CONSTRAINT v2_plan_areas_code_not_blank
        CHECK (
            code IS NULL
            OR btrim(code) <> ''
        ),

    CONSTRAINT v2_plan_areas_type_check
        CHECK (
            area_type IN (
                'regional',
                'portfolio'
            )
        ),

    CONSTRAINT v2_plan_areas_type_region_check
        CHECK (
            (
                area_type = 'regional'
                AND region_id IS NOT NULL
            )
            OR
            (
                area_type = 'portfolio'
                AND region_id IS NULL
            )
        ),

    CONSTRAINT v2_plan_areas_sort_order_check
        CHECK (sort_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_plan_areas_company
ON public.v2_plan_areas(
    company_id,
    is_active,
    sort_order
)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_plan_areas_region
ON public.v2_plan_areas(
    company_id,
    region_id
)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_plan_areas_type
ON public.v2_plan_areas(
    company_id,
    area_type
)
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_plan_areas_regional_region
ON public.v2_plan_areas(
    company_id,
    region_id
)
WHERE deleted_at IS NULL
  AND area_type = 'regional';

CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_plan_areas_code
ON public.v2_plan_areas(
    company_id,
    code
)
WHERE deleted_at IS NULL
  AND code IS NOT NULL;

-- ============================================================
-- 2. UPDATE TIMESTAMP
-- ============================================================

DROP TRIGGER IF EXISTS trg_v2_plan_areas_updated_at
    ON public.v2_plan_areas;

CREATE TRIGGER trg_v2_plan_areas_updated_at
BEFORE UPDATE
ON public.v2_plan_areas
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. HARD DELETE PROTECTION
-- ============================================================

DROP TRIGGER IF EXISTS trg_v2_plan_areas_prevent_hard_delete
    ON public.v2_plan_areas;

CREATE TRIGGER trg_v2_plan_areas_prevent_hard_delete
BEFORE DELETE
ON public.v2_plan_areas
FOR EACH ROW
EXECUTE FUNCTION public.prevent_hard_delete();

-- ============================================================
-- 4. V2 MONTHLY TARGETS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.v2_monthly_targets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id uuid NOT NULL,

    plan_area_id uuid NOT NULL,

    manager_user_id uuid NOT NULL,

    period_year smallint NOT NULL,
    period_month smallint NOT NULL,

    target_tonnage numeric(14, 4) NOT NULL,

    notes text,

    created_by uuid,
    updated_by uuid,

    created_at timestamptz NOT NULL
        DEFAULT timezone('utc'::text, now()),

    updated_at timestamptz NOT NULL
        DEFAULT timezone('utc'::text, now()),

    deleted_at timestamptz,

    CONSTRAINT fk_v2_monthly_targets_company
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id),

    CONSTRAINT fk_v2_monthly_targets_plan_area
        FOREIGN KEY (plan_area_id)
        REFERENCES public.v2_plan_areas(id),

    CONSTRAINT fk_v2_monthly_targets_manager
        FOREIGN KEY (manager_user_id)
        REFERENCES public.users(id),

    CONSTRAINT fk_v2_monthly_targets_created_by
        FOREIGN KEY (created_by)
        REFERENCES public.users(id),

    CONSTRAINT fk_v2_monthly_targets_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES public.users(id),

    CONSTRAINT v2_monthly_targets_year_valid
        CHECK (
            period_year BETWEEN 2020 AND 2100
        ),

    CONSTRAINT v2_monthly_targets_month_valid
        CHECK (
            period_month BETWEEN 1 AND 12
        ),

    CONSTRAINT v2_monthly_targets_tonnage_positive
        CHECK (
            target_tonnage > 0
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_monthly_targets_active
ON public.v2_monthly_targets(
    company_id,
    plan_area_id,
    manager_user_id,
    period_year,
    period_month
)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_monthly_targets_company_period
ON public.v2_monthly_targets(
    company_id,
    period_year,
    period_month
)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_monthly_targets_manager_period
ON public.v2_monthly_targets(
    company_id,
    manager_user_id,
    period_year,
    period_month
)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_monthly_targets_plan_area
ON public.v2_monthly_targets(
    company_id,
    plan_area_id,
    period_year,
    period_month
)
WHERE deleted_at IS NULL;

-- ============================================================
-- 5. UPDATE TIMESTAMP
-- ============================================================

DROP TRIGGER IF EXISTS trg_v2_monthly_targets_updated_at
    ON public.v2_monthly_targets;

CREATE TRIGGER trg_v2_monthly_targets_updated_at
BEFORE UPDATE
ON public.v2_monthly_targets
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 6. HARD DELETE PROTECTION
-- ============================================================

DROP TRIGGER IF EXISTS trg_v2_monthly_targets_prevent_hard_delete
    ON public.v2_monthly_targets;

CREATE TRIGGER trg_v2_monthly_targets_prevent_hard_delete
BEFORE DELETE
ON public.v2_monthly_targets
FOR EACH ROW
EXECUTE FUNCTION public.prevent_hard_delete();

-- ============================================================
-- 7. RLS - PLAN AREAS
-- ============================================================

ALTER TABLE public.v2_plan_areas
    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v2_plan_areas_select
    ON public.v2_plan_areas;

CREATE POLICY v2_plan_areas_select
ON public.v2_plan_areas
FOR SELECT
TO authenticated
USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND (
        public.auth_user_is_admin()

        OR public.auth_user_has_company_role(
            company_id,
            'sales_manager'
        )

        OR (
            area_type = 'regional'
            AND EXISTS (
                SELECT 1
                FROM public.user_regions AS ur
                WHERE ur.company_id = v2_plan_areas.company_id
                  AND ur.user_id = auth.uid()
                  AND ur.region_id = v2_plan_areas.region_id
                  AND ur.deleted_at IS NULL
            )
        )
    )
);

-- ============================================================
-- 8. RLS - MONTHLY TARGETS
-- ============================================================

ALTER TABLE public.v2_monthly_targets
    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v2_monthly_targets_select
    ON public.v2_monthly_targets;

CREATE POLICY v2_monthly_targets_select
ON public.v2_monthly_targets
FOR SELECT
TO authenticated
USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND (
        public.auth_user_is_admin()

        OR public.auth_user_has_company_role(
            company_id,
            'sales_manager'
        )

        OR manager_user_id = auth.uid()
    )
);

-- ============================================================
-- 9. SEED REGIONAL PLAN AREAS
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
    r.company_id,
    r.name,
    'region:' || r.id::text,
    'regional',
    r.id,
    'منطقه جغرافیایی برای برنامه‌ریزی فروش V2',
    r.sort_order,
    true
FROM public.regions AS r
WHERE r.company_id = '11111111-1111-1111-1111-111111111111'
  AND r.deleted_at IS NULL
  AND r.is_active = true
  AND NOT EXISTS (
        SELECT 1
        FROM public.v2_plan_areas AS existing
        WHERE existing.company_id = r.company_id
          AND existing.region_id = r.id
          AND existing.area_type = 'regional'
          AND existing.deleted_at IS NULL
    );

-- ============================================================
-- 10. SAFETY CHECK
-- Every active region must have a regional Plan Area.
-- ============================================================

DO $$
DECLARE
    v_missing_count integer;
BEGIN

    SELECT COUNT(*)
    INTO v_missing_count
    FROM public.regions AS r
    WHERE r.company_id = '11111111-1111-1111-1111-111111111111'
      AND r.deleted_at IS NULL
      AND r.is_active = true
      AND NOT EXISTS (
            SELECT 1
            FROM public.v2_plan_areas AS pa
            WHERE pa.company_id = r.company_id
              AND pa.region_id = r.id
              AND pa.area_type = 'regional'
              AND pa.deleted_at IS NULL
        );

    IF v_missing_count > 0 THEN
        RAISE EXCEPTION
            'V2 Plan Area foundation failed: % active regions have no regional Plan Area.',
            v_missing_count
            USING ERRCODE = 'P0001';
    END IF;

END;
$$;

-- ============================================================
-- 11. SAFETY CHECK
-- No duplicate active regional Plan Areas.
-- ============================================================

DO $$
DECLARE
    v_duplicate_count integer;
BEGIN

    SELECT COUNT(*)
    INTO v_duplicate_count
    FROM (
        SELECT
            company_id,
            region_id
        FROM public.v2_plan_areas
        WHERE deleted_at IS NULL
          AND area_type = 'regional'
        GROUP BY
            company_id,
            region_id
        HAVING COUNT(*) > 1
    ) AS duplicates;

    IF v_duplicate_count > 0 THEN
        RAISE EXCEPTION
            'V2 Plan Area foundation failed: % duplicate active regional Plan Area groups exist.',
            v_duplicate_count
            USING ERRCODE = 'P0001';
    END IF;

END;
$$;

-- ============================================================
-- 12. COMMENTS
-- ============================================================

COMMENT ON TABLE public.v2_plan_areas IS
    'V2 commercial planning areas. Regional areas map to geographic regions; portfolio areas represent non-geographic planned sales buckets.';

COMMENT ON COLUMN public.v2_plan_areas.area_type IS
    'regional = geographic region based Plan Area; portfolio = special/non-geographic commercial Plan Area.';

COMMENT ON COLUMN public.v2_plan_areas.region_id IS
    'Required for regional Plan Areas; NULL for portfolio Plan Areas.';

COMMENT ON TABLE public.v2_monthly_targets IS
    'V2 monthly sales targets explicitly tied to a manager and Plan Area. Historical target rows remain unchanged when region ownership changes.';

COMMENT ON COLUMN public.v2_monthly_targets.period_year IS
    'Project database period year key used by the Jalali period helper.';

COMMENT ON COLUMN public.v2_monthly_targets.period_month IS
    'Project database period month key used by the Jalali period helper.';

COMMENT ON COLUMN public.v2_monthly_targets.manager_user_id IS
    'Explicit target owner. This preserves historical plan ownership independently from later region/customer reassignment.';

COMMIT;
-- ============================================================
-- V2 Migration 28
-- Customer Commercial Plan / Portfolio Model
--
-- Purpose:
--
--   Separate:
--      geographic ownership
--      commercial plan ownership
--      shipment destination
--
-- Ownership modes:
--      region_based
--      portfolio_based
--      fixed
--
-- Plan scopes:
--      regional
--      portfolio
--      out_of_region
--
-- Canonical commercial owner:
--      plan_owner_user_id
--
-- Canonical planning bucket:
--      plan_area_id
--
-- Examples supported by this model:
--      Regional:
--          تهران و ورامین
--          سمنان، گرمسار و مازندران غربی
--
--      Portfolio:
--          عزیزی (مومن پور)
--          حسین شهروی
--          سامان جعفری
--          رستم حسن پور
--          صادرات چین
--          صادرات عراق
--          بازارهای متفرقه
--
-- IMPORTANT:
--   - Existing V1 data is preserved.
--   - assigned_user_id is untouched.
--   - Existing orders are not rewritten.
--   - Existing historical plan data is not rewritten.
--   - No portfolio Plan Areas are seeded here.
--   - Existing regional customers are backfilled to their
--     current regional Plan Area.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. GOVERNANCE CAPABILITY
-- ============================================================

INSERT INTO public.v2_management_capabilities (
    capability,
    description,
    is_active
)
VALUES (
    'plan_areas.manage',
    'ایجاد، ویرایش، واگذاری و مدیریت سبدهای برنامه فروش',
    true
)
ON CONFLICT (capability)
DO UPDATE SET
    description = EXCLUDED.description,
    is_active = true;

-- ============================================================
-- 2. CUSTOMER COMMERCIAL PLAN OWNER
-- ============================================================

ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS plan_owner_user_id uuid;

ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS plan_area_id uuid;

COMMENT ON COLUMN public.customers.plan_owner_user_id IS
    'V2: Commercial owner of the customer plan. May be a Regional Manager or Sales Manager depending on plan type.';

COMMENT ON COLUMN public.customers.plan_area_id IS
    'V2: Commercial planning bucket assigned to the customer. Regional areas map to geographic regions; portfolio areas represent commercial portfolios.';

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_customers_v2_plan_owner'
          AND conrelid = 'public.customers'::regclass
    ) THEN

        ALTER TABLE public.customers
            ADD CONSTRAINT fk_customers_v2_plan_owner
            FOREIGN KEY (plan_owner_user_id)
            REFERENCES public.users(id);

    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_customers_v2_plan_area'
          AND conrelid = 'public.customers'::regclass
    ) THEN

        ALTER TABLE public.customers
            ADD CONSTRAINT fk_customers_v2_plan_area
            FOREIGN KEY (plan_area_id)
            REFERENCES public.v2_plan_areas(id);

    END IF;

END;
$$;

CREATE INDEX IF NOT EXISTS idx_customers_v2_plan_owner
ON public.customers(
    company_id,
    plan_owner_user_id
)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_v2_plan_area
ON public.customers(
    company_id,
    plan_area_id
)
WHERE deleted_at IS NULL;

-- ============================================================
-- 3. OWNERSHIP MODE
-- ============================================================

ALTER TABLE public.customers
    DROP CONSTRAINT IF EXISTS customers_v2_ownership_mode_check;

ALTER TABLE public.customers
    ADD CONSTRAINT customers_v2_ownership_mode_check
    CHECK (
        ownership_mode IS NULL
        OR ownership_mode IN (
            'region_based',
            'portfolio_based',
            'fixed'
        )
    );

-- ============================================================
-- 4. PLAN SCOPE
-- ============================================================

ALTER TABLE public.customers
    DROP CONSTRAINT IF EXISTS customers_v2_plan_scope_check;

ALTER TABLE public.customers
    ADD CONSTRAINT customers_v2_plan_scope_check
    CHECK (
        plan_scope IS NULL
        OR plan_scope IN (
            'regional',
            'portfolio',
            'out_of_region'
        )
    );

ALTER TABLE public.customers
    DROP CONSTRAINT IF EXISTS customers_v2_plan_scope_region_consistency;

ALTER TABLE public.customers
    ADD CONSTRAINT customers_v2_plan_scope_region_consistency
    CHECK (
        plan_scope IS NULL
        OR (
            plan_scope = 'regional'
            AND plan_region_id IS NOT NULL
        )
        OR (
            plan_scope = 'portfolio'
            AND plan_region_id IS NULL
        )
        OR (
            plan_scope = 'out_of_region'
            AND plan_region_id IS NULL
        )
    );

-- ============================================================
-- 5. BACKFILL EXISTING CUSTOMERS
--
-- Existing V2 customers are currently regional / fixed-regional.
--
-- Their commercial owner is currently the same as their Regional
-- Manager and their Plan Area is the regional Plan Area created
-- by Migration 27.
-- ============================================================

UPDATE public.customers AS c
SET
    plan_owner_user_id = c.regional_manager_id,
    plan_area_id = pa.id,
    updated_at = timezone('utc'::text, now())
FROM public.v2_plan_areas AS pa
WHERE c.company_id = '11111111-1111-1111-1111-111111111111'
  AND c.deleted_at IS NULL
  AND c.regional_manager_id IS NOT NULL
  AND c.plan_scope = 'regional'
  AND c.plan_region_id = pa.region_id
  AND pa.company_id = c.company_id
  AND pa.area_type = 'regional'
  AND pa.deleted_at IS NULL
  AND c.plan_owner_user_id IS NULL
  AND c.plan_area_id IS NULL;

-- ============================================================
-- 6. SAFETY CHECK - EXISTING REGIONAL CUSTOMERS
-- ============================================================

DO $$
DECLARE
    v_missing_count integer;
BEGIN

    SELECT COUNT(*)
    INTO v_missing_count
    FROM public.customers AS c
    WHERE c.company_id = '11111111-1111-1111-1111-111111111111'
      AND c.deleted_at IS NULL
      AND c.plan_scope = 'regional'
      AND (
            c.regional_manager_id IS NULL
            OR c.plan_region_id IS NULL
            OR c.plan_owner_user_id IS NULL
            OR c.plan_area_id IS NULL
        );

    IF v_missing_count > 0 THEN

        RAISE EXCEPTION
            'V2 customer commercial plan migration failed: % regional customers remain incomplete.',
            v_missing_count
            USING ERRCODE = 'P0001';

    END IF;

END;
$$;

-- ============================================================
-- 7. CUSTOMER PLAN OWNERSHIP HISTORY EXTENSION
-- ============================================================

ALTER TABLE public.v2_customer_plan_assignment_history
    ADD COLUMN IF NOT EXISTS old_plan_owner_user_id uuid;

ALTER TABLE public.v2_customer_plan_assignment_history
    ADD COLUMN IF NOT EXISTS new_plan_owner_user_id uuid;

ALTER TABLE public.v2_customer_plan_assignment_history
    ADD COLUMN IF NOT EXISTS old_plan_area_id uuid;

ALTER TABLE public.v2_customer_plan_assignment_history
    ADD COLUMN IF NOT EXISTS new_plan_area_id uuid;

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_v2_customer_history_old_plan_owner'
          AND conrelid = 'public.v2_customer_plan_assignment_history'::regclass
    ) THEN

        ALTER TABLE public.v2_customer_plan_assignment_history
            ADD CONSTRAINT fk_v2_customer_history_old_plan_owner
            FOREIGN KEY (old_plan_owner_user_id)
            REFERENCES public.users(id);

    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_v2_customer_history_new_plan_owner'
          AND conrelid = 'public.v2_customer_plan_assignment_history'::regclass
    ) THEN

        ALTER TABLE public.v2_customer_plan_assignment_history
            ADD CONSTRAINT fk_v2_customer_history_new_plan_owner
            FOREIGN KEY (new_plan_owner_user_id)
            REFERENCES public.users(id);

    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_v2_customer_history_old_plan_area'
          AND conrelid = 'public.v2_customer_plan_assignment_history'::regclass
    ) THEN

        ALTER TABLE public.v2_customer_plan_assignment_history
            ADD CONSTRAINT fk_v2_customer_history_old_plan_area
            FOREIGN KEY (old_plan_area_id)
            REFERENCES public.v2_plan_areas(id);

    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_v2_customer_history_new_plan_area'
          AND conrelid = 'public.v2_customer_plan_assignment_history'::regclass
    ) THEN

        ALTER TABLE public.v2_customer_plan_assignment_history
            ADD CONSTRAINT fk_v2_customer_history_new_plan_area
            FOREIGN KEY (new_plan_area_id)
            REFERENCES public.v2_plan_areas(id);

    END IF;

END;
$$;

CREATE INDEX IF NOT EXISTS idx_v2_customer_plan_history_owner
ON public.v2_customer_plan_assignment_history(
    company_id,
    new_plan_owner_user_id,
    changed_at DESC
);

CREATE INDEX IF NOT EXISTS idx_v2_customer_plan_history_area
ON public.v2_customer_plan_assignment_history(
    company_id,
    new_plan_area_id,
    changed_at DESC
);

-- ============================================================
-- 8. AUTOMATIC HISTORY NORMALIZATION FOR LEGACY V2 OPERATIONS
--
-- Existing V2 RPCs (including region reassignment) write the
-- original customer history columns.
--
-- This trigger derives regional plan owner/area fields when
-- the old operation did not explicitly provide them.
-- ============================================================

CREATE OR REPLACE FUNCTION public.v2_normalize_customer_plan_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_old_area uuid;
    v_new_area uuid;
BEGIN

    IF NEW.old_plan_owner_user_id IS NULL
       AND NEW.old_plan_scope = 'regional'
       AND NEW.old_regional_manager_id IS NOT NULL
    THEN
        NEW.old_plan_owner_user_id :=
            NEW.old_regional_manager_id;
    END IF;

    IF NEW.new_plan_owner_user_id IS NULL
       AND NEW.new_plan_scope = 'regional'
       AND NEW.new_regional_manager_id IS NOT NULL
    THEN
        NEW.new_plan_owner_user_id :=
            NEW.new_regional_manager_id;
    END IF;

    IF NEW.old_plan_area_id IS NULL
       AND NEW.old_plan_scope = 'regional'
       AND NEW.old_plan_region_id IS NOT NULL
    THEN

        SELECT pa.id
        INTO v_old_area
        FROM public.v2_plan_areas AS pa
        WHERE pa.company_id = NEW.company_id
          AND pa.region_id = NEW.old_plan_region_id
          AND pa.area_type = 'regional'
          AND pa.deleted_at IS NULL
        LIMIT 1;

        NEW.old_plan_area_id := v_old_area;

    END IF;

    IF NEW.new_plan_area_id IS NULL
       AND NEW.new_plan_scope = 'regional'
       AND NEW.new_plan_region_id IS NOT NULL
    THEN

        SELECT pa.id
        INTO v_new_area
        FROM public.v2_plan_areas AS pa
        WHERE pa.company_id = NEW.company_id
          AND pa.region_id = NEW.new_plan_region_id
          AND pa.area_type = 'regional'
          AND pa.deleted_at IS NULL
        LIMIT 1;

        NEW.new_plan_area_id := v_new_area;

    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_v2_normalize_customer_plan_history
    ON public.v2_customer_plan_assignment_history;

CREATE TRIGGER trg_v2_normalize_customer_plan_history
BEFORE INSERT
ON public.v2_customer_plan_assignment_history
FOR EACH ROW
EXECUTE FUNCTION public.v2_normalize_customer_plan_history();

-- ============================================================
-- 9. PORTFOLIO PLAN-AREA MANAGER ASSIGNMENT HISTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS public.v2_plan_area_manager_assignment_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id uuid NOT NULL,

    plan_area_id uuid NOT NULL,

    manager_user_id uuid NOT NULL,

    effective_from date NOT NULL,
    effective_to date,

    assigned_by uuid NOT NULL,
    assigned_at timestamptz NOT NULL
        DEFAULT timezone('utc'::text, now()),

    ended_by uuid,
    ended_at timestamptz,

    assignment_reason text NOT NULL,
    end_reason text,

    created_at timestamptz NOT NULL
        DEFAULT timezone('utc'::text, now()),

    updated_at timestamptz NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT fk_v2_plan_area_assignment_company
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id),

    CONSTRAINT fk_v2_plan_area_assignment_area
        FOREIGN KEY (plan_area_id)
        REFERENCES public.v2_plan_areas(id),

    CONSTRAINT fk_v2_plan_area_assignment_manager
        FOREIGN KEY (manager_user_id)
        REFERENCES public.users(id),

    CONSTRAINT fk_v2_plan_area_assignment_assigned_by
        FOREIGN KEY (assigned_by)
        REFERENCES public.users(id),

    CONSTRAINT fk_v2_plan_area_assignment_ended_by
        FOREIGN KEY (ended_by)
        REFERENCES public.users(id),

    CONSTRAINT v2_plan_area_assignment_date_check
        CHECK (
            effective_to IS NULL
            OR effective_to >= effective_from
        ),

    CONSTRAINT v2_plan_area_assignment_reason_check
        CHECK (
            btrim(assignment_reason) <> ''
        ),

    CONSTRAINT v2_plan_area_assignment_end_reason_check
        CHECK (
            end_reason IS NULL
            OR btrim(end_reason) <> ''
        )
);

CREATE INDEX IF NOT EXISTS idx_v2_plan_area_assignment_history_area
ON public.v2_plan_area_manager_assignment_history(
    company_id,
    plan_area_id,
    effective_from DESC
);

CREATE INDEX IF NOT EXISTS idx_v2_plan_area_assignment_history_manager
ON public.v2_plan_area_manager_assignment_history(
    company_id,
    manager_user_id,
    effective_from DESC
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_plan_area_assignment_active
ON public.v2_plan_area_manager_assignment_history(
    company_id,
    plan_area_id
)
WHERE effective_to IS NULL;

ALTER TABLE public.v2_plan_area_manager_assignment_history
    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v2_plan_area_assignment_history_select
    ON public.v2_plan_area_manager_assignment_history;

CREATE POLICY v2_plan_area_assignment_history_select
ON public.v2_plan_area_manager_assignment_history
FOR SELECT
TO authenticated
USING (
    company_id = public.auth_user_company_id()
    AND (
        public.auth_user_is_admin()
        OR public.v2_is_company_ceo(company_id)
        OR public.auth_user_has_company_role(
            company_id,
            'sales_manager'
        )
        OR manager_user_id = auth.uid()
    )
);

DROP TRIGGER IF EXISTS trg_v2_plan_area_assignment_updated_at
    ON public.v2_plan_area_manager_assignment_history;

CREATE TRIGGER trg_v2_plan_area_assignment_updated_at
BEFORE UPDATE
ON public.v2_plan_area_manager_assignment_history
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 10. PLAN AREA MANAGER ASSIGNMENT RPC
--
-- Intended for PORTFOLIO Plan Areas.
--
-- Authorization:
--   CEO
--   OR Sales Manager + plan_areas.manage
--
-- Behavior:
--   - validates the Portfolio Area
--   - validates target manager
--   - closes previous assignment
--   - creates new assignment
--   - moves portfolio_based customers
--   - leaves fixed customers untouched
-- ============================================================

CREATE OR REPLACE FUNCTION public.v2_assign_plan_area_manager(
    p_plan_area_id uuid,
    p_manager_user_id uuid,
    p_effective_from date,
    p_reason text
)
RETURNS public.v2_plan_area_manager_assignment_history
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_company_id uuid;

    v_area_company_id uuid;
    v_area_type text;

    v_manager_company_id uuid;
    v_manager_active boolean;
    v_manager_has_valid_role boolean;

    v_current_history_id uuid;
    v_current_manager_id uuid;
    v_current_effective_from date;

    v_result public.v2_plan_area_manager_assignment_history;
BEGIN

    -- ========================================================
    -- Authentication
    -- ========================================================

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required.';
    END IF;

    v_company_id := public.auth_user_company_id();

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION
            'Active company context is required.';
    END IF;

    -- ========================================================
    -- Input
    -- ========================================================

    IF p_effective_from IS NULL THEN
        RAISE EXCEPTION
            'Effective date is required.';
    END IF;

    IF p_reason IS NULL
       OR btrim(p_reason) = ''
    THEN
        RAISE EXCEPTION
            'A reason is required.';
    END IF;

    -- ========================================================
    -- Authorization
    -- ========================================================

    IF NOT (
        public.v2_is_company_ceo(v_company_id)
        OR (
            public.auth_user_has_company_role(
                v_company_id,
                'sales_manager'
            )
            AND public.v2_has_management_capability(
                'plan_areas.manage'
            )
        )
    ) THEN

        RAISE EXCEPTION
            'User is not authorized to manage Plan Area assignments.';

    END IF;

    -- ========================================================
    -- Serialize Plan Area assignment
    -- ========================================================

    PERFORM pg_advisory_xact_lock(
        hashtextextended(
            p_plan_area_id::text,
            0
        )
    );

    -- ========================================================
    -- Validate Plan Area
    -- ========================================================

    SELECT
        pa.company_id,
        pa.area_type
    INTO
        v_area_company_id,
        v_area_type
    FROM public.v2_plan_areas AS pa
    WHERE pa.id = p_plan_area_id
      AND pa.deleted_at IS NULL
      AND pa.is_active = true
    FOR UPDATE;

    IF v_area_company_id IS NULL THEN
        RAISE EXCEPTION
            'Plan Area does not exist.';
    END IF;

    IF v_area_company_id <> v_company_id THEN
        RAISE EXCEPTION
            'Plan Area must belong to the current company.';
    END IF;

    IF v_area_type <> 'portfolio' THEN
        RAISE EXCEPTION
            'Only Portfolio Plan Areas can use explicit manager assignment.';
    END IF;

    -- ========================================================
    -- Validate target manager
    -- ========================================================

    SELECT
        u.company_id,
        u.is_active
    INTO
        v_manager_company_id,
        v_manager_active
    FROM public.users AS u
    WHERE u.id = p_manager_user_id
      AND u.deleted_at IS NULL
    LIMIT 1;

    IF v_manager_company_id IS NULL THEN
        RAISE EXCEPTION
            'Selected Plan Area manager does not exist.';
    END IF;

    IF v_manager_company_id <> v_company_id THEN
        RAISE EXCEPTION
            'Selected Plan Area manager must belong to the same company.';
    END IF;

    IF v_manager_active IS DISTINCT FROM true THEN
        RAISE EXCEPTION
            'Selected Plan Area manager is inactive.';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles AS ur
        INNER JOIN public.roles AS r
            ON r.id = ur.role_id
           AND (
                r.company_id = v_company_id
                OR r.company_id IS NULL
           )
           AND r.deleted_at IS NULL
           AND r.is_active = true
        WHERE ur.user_id = p_manager_user_id
          AND ur.deleted_at IS NULL
          AND r.slug::text IN (
              'sales_manager',
              'regional_manager'
          )
    )
    INTO v_manager_has_valid_role;

    IF NOT v_manager_has_valid_role THEN
        RAISE EXCEPTION
            'Selected Plan Area manager must be a Sales Manager or Regional Manager.';
    END IF;

    -- ========================================================
    -- Current assignment
    -- ========================================================

    SELECT
        h.id,
        h.manager_user_id,
        h.effective_from
    INTO
        v_current_history_id,
        v_current_manager_id,
        v_current_effective_from
    FROM public.v2_plan_area_manager_assignment_history AS h
    WHERE h.company_id = v_company_id
      AND h.plan_area_id = p_plan_area_id
      AND h.effective_to IS NULL
    ORDER BY
        h.effective_from DESC,
        h.created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_current_history_id IS NOT NULL
       AND v_current_manager_id = p_manager_user_id
    THEN
        RAISE EXCEPTION
            'Plan Area is already assigned to the selected manager.';
    END IF;

    IF v_current_history_id IS NOT NULL
       AND p_effective_from <= v_current_effective_from
    THEN
        RAISE EXCEPTION
            'New effective date must be after the current assignment start date.';
    END IF;

    -- ========================================================
    -- Close previous assignment
    -- ========================================================

    IF v_current_history_id IS NOT NULL THEN

        UPDATE public.v2_plan_area_manager_assignment_history
        SET
            effective_to = p_effective_from - 1,
            ended_by = auth.uid(),
            ended_at = timezone('utc'::text, now()),
            end_reason = btrim(p_reason),
            updated_at = timezone('utc'::text, now())
        WHERE id = v_current_history_id;

    END IF;

    -- ========================================================
    -- Create new assignment
    -- ========================================================

    INSERT INTO public.v2_plan_area_manager_assignment_history (
        company_id,
        plan_area_id,
        manager_user_id,
        effective_from,
        effective_to,
        assigned_by,
        assigned_at,
        assignment_reason
    )
    VALUES (
        v_company_id,
        p_plan_area_id,
        p_manager_user_id,
        p_effective_from,
        NULL,
        auth.uid(),
        timezone('utc'::text, now()),
        btrim(p_reason)
    )
    RETURNING *
    INTO v_result;

    -- ========================================================
    -- Move portfolio-based customers
    --
    -- fixed customers remain where they are.
    -- ========================================================

    PERFORM set_config(
        'app.v2_customer_plan_assignment_authorized',
        'true',
        true
    );

    WITH moved_customers AS MATERIALIZED (
        SELECT
            c.id AS customer_id,
            c.plan_owner_user_id AS old_plan_owner_user_id,
            c.plan_area_id AS old_plan_area_id,
            c.regional_manager_id AS old_regional_manager_id,
            c.plan_scope AS old_plan_scope,
            c.plan_region_id AS old_plan_region_id,
            c.ownership_mode AS old_ownership_mode
        FROM public.customers AS c
        WHERE c.company_id = v_company_id
          AND c.plan_area_id = p_plan_area_id
          AND c.ownership_mode = 'portfolio_based'
          AND c.deleted_at IS NULL
          AND c.plan_owner_user_id IS DISTINCT FROM p_manager_user_id
    ),

    updated_customers AS (
        UPDATE public.customers AS c
        SET
            plan_owner_user_id = p_manager_user_id,
            plan_area_id = p_plan_area_id,
            ownership_mode = 'portfolio_based',
            plan_scope = 'portfolio',
            plan_region_id = NULL,
            regional_manager_id = NULL,
            updated_at = timezone('utc'::text, now())
        FROM moved_customers AS m
        WHERE c.id = m.customer_id
        RETURNING c.id
    )

    INSERT INTO public.v2_customer_plan_assignment_history (
        company_id,
        customer_id,

        old_ownership_mode,
        new_ownership_mode,

        old_regional_manager_id,
        new_regional_manager_id,

        old_plan_scope,
        new_plan_scope,

        old_plan_region_id,
        new_plan_region_id,

        old_plan_owner_user_id,
        new_plan_owner_user_id,

        old_plan_area_id,
        new_plan_area_id,

        changed_by,
        changed_at,
        reason
    )
    SELECT
        v_company_id,
        m.customer_id,

        m.old_ownership_mode,
        'portfolio_based',

        m.old_regional_manager_id,
        NULL,

        m.old_plan_scope,
        'portfolio',

        m.old_plan_region_id,
        NULL,

        m.old_plan_owner_user_id,
        p_manager_user_id,

        m.old_plan_area_id,
        p_plan_area_id,

        auth.uid(),
        timezone('utc'::text, now()),

        'انتقال خودکار مالک مشتری به همراه واگذاری سبد برنامه: '
            || btrim(p_reason)

    FROM moved_customers AS m
    INNER JOIN updated_customers AS u
        ON u.id = m.customer_id;

    RETURN v_result;

END;
$function$;

REVOKE ALL
ON FUNCTION public.v2_assign_plan_area_manager(
    uuid,
    uuid,
    date,
    text
)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.v2_assign_plan_area_manager(
    uuid,
    uuid,
    date,
    text
)
TO authenticated;

-- ============================================================
-- 11. CUSTOMER OWNERSHIP VALIDATION
--
-- Canonical model:
--
-- region_based:
--   ownership_mode = region_based
--   plan_scope = regional
--   regional_manager_id != NULL
--   plan_owner_user_id = regional_manager_id
--   plan_region_id != NULL
--   plan_area_id = regional area for plan_region_id
--
-- portfolio_based:
--   ownership_mode = portfolio_based
--   plan_scope = portfolio
--   regional_manager_id = NULL
--   plan_owner_user_id != NULL
--   plan_area_id = portfolio area
--
-- fixed:
--   Explicit customer owner.
--   It may be:
--      regional
--      portfolio
--      out_of_region
--
-- fixed is never automatically moved by Region or Portfolio
-- manager reassignment.
-- ============================================================

CREATE OR REPLACE FUNCTION public.v2_validate_customer_plan_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_owner_company_id uuid;
    v_owner_active boolean;
    v_owner_has_manager_role boolean;

    v_region_company_id uuid;

    v_plan_area_company_id uuid;
    v_plan_area_type text;
    v_plan_area_region_id uuid;

    v_current_portfolio_assignment boolean;

    v_v2_fields_changed boolean;
BEGIN

    -- --------------------------------------------------------
    -- Backward compatibility for untouched V1 rows.
    -- --------------------------------------------------------

    IF NEW.regional_manager_id IS NULL
       AND NEW.plan_scope IS NULL
       AND NEW.plan_region_id IS NULL
       AND NEW.ownership_mode IS NULL
       AND NEW.plan_owner_user_id IS NULL
       AND NEW.plan_area_id IS NULL
    THEN
        RETURN NEW;
    END IF;

    -- --------------------------------------------------------
    -- Basic V2 requirements
    -- --------------------------------------------------------

    IF NEW.ownership_mode IS NULL THEN
        RAISE EXCEPTION
            'V2 customer assignment requires ownership_mode.';
    END IF;

    IF NEW.plan_scope IS NULL THEN
        RAISE EXCEPTION
            'V2 customer assignment requires plan_scope.';
    END IF;

    IF NEW.plan_owner_user_id IS NULL THEN
        RAISE EXCEPTION
            'V2 customer assignment requires plan_owner_user_id.';
    END IF;

    IF NEW.ownership_mode NOT IN (
        'region_based',
        'portfolio_based',
        'fixed'
    ) THEN
        RAISE EXCEPTION
            'Invalid V2 customer ownership_mode.';
    END IF;

    IF NEW.plan_scope NOT IN (
        'regional',
        'portfolio',
        'out_of_region'
    ) THEN
        RAISE EXCEPTION
            'Invalid V2 customer plan_scope.';
    END IF;

    -- --------------------------------------------------------
    -- Plan Owner
    -- --------------------------------------------------------

    SELECT
        u.company_id,
        u.is_active
    INTO
        v_owner_company_id,
        v_owner_active
    FROM public.users AS u
    WHERE u.id = NEW.plan_owner_user_id
      AND u.deleted_at IS NULL
    LIMIT 1;

    IF v_owner_company_id IS NULL THEN
        RAISE EXCEPTION
            'Selected Plan Owner does not exist.';
    END IF;

    IF v_owner_company_id <> NEW.company_id THEN
        RAISE EXCEPTION
            'Plan Owner must belong to the same company as the customer.';
    END IF;

    IF v_owner_active IS DISTINCT FROM true THEN
        RAISE EXCEPTION
            'Selected Plan Owner is inactive.';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles AS ur
        INNER JOIN public.roles AS r
            ON r.id = ur.role_id
           AND (
                r.company_id = NEW.company_id
                OR r.company_id IS NULL
           )
           AND r.deleted_at IS NULL
           AND r.is_active = true
        WHERE ur.user_id = NEW.plan_owner_user_id
          AND ur.deleted_at IS NULL
          AND r.slug::text IN (
              'sales_manager',
              'regional_manager'
          )
    )
    INTO v_owner_has_manager_role;

    IF NOT v_owner_has_manager_role THEN
        RAISE EXCEPTION
            'Plan Owner must be a Sales Manager or Regional Manager.';
    END IF;

    -- --------------------------------------------------------
    -- Regional Manager field, when present
    -- --------------------------------------------------------

    IF NEW.regional_manager_id IS NOT NULL THEN

        SELECT
            u.company_id
        INTO
            v_region_company_id
        FROM public.users AS u
        WHERE u.id = NEW.regional_manager_id
          AND u.deleted_at IS NULL
          AND u.is_active = true
        LIMIT 1;

        IF v_region_company_id IS NULL THEN
            RAISE EXCEPTION
                'Selected Regional Manager does not exist or is inactive.';
        END IF;

        IF v_region_company_id <> NEW.company_id THEN
            RAISE EXCEPTION
                'Regional Manager must belong to the same company as the customer.';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM public.user_roles AS ur
            INNER JOIN public.roles AS r
                ON r.id = ur.role_id
               AND (
                    r.company_id = NEW.company_id
                    OR r.company_id IS NULL
               )
               AND r.deleted_at IS NULL
               AND r.is_active = true
            WHERE ur.user_id = NEW.regional_manager_id
              AND ur.deleted_at IS NULL
              AND r.slug::text = 'regional_manager'
        ) THEN
            RAISE EXCEPTION
                'Selected Regional Manager does not have the regional_manager role.';
        END IF;

    END IF;

    -- --------------------------------------------------------
    -- Normalize REGIONAL planning fields.
    --
    -- This also keeps old V2 region-reassignment RPC compatible:
    -- when it changes regional_manager_id, owner automatically
    -- follows the regional manager.
    -- --------------------------------------------------------

    IF NEW.plan_scope = 'regional' THEN

        IF NEW.plan_region_id IS NULL THEN
            RAISE EXCEPTION
                'Regional plan scope requires plan_region_id.';
        END IF;

        IF NEW.regional_manager_id IS NULL THEN
            RAISE EXCEPTION
                'Regional plan scope requires regional_manager_id.';
        END IF;

        -- Regional plan owner is always the Regional Manager.
        NEW.plan_owner_user_id :=
            NEW.regional_manager_id;

        SELECT
            r.company_id
        INTO
            v_region_company_id
        FROM public.regions AS r
        WHERE r.id = NEW.plan_region_id
          AND r.deleted_at IS NULL
        LIMIT 1;

        IF v_region_company_id IS NULL THEN
            RAISE EXCEPTION
                'Selected plan region does not exist.';
        END IF;

        IF v_region_company_id <> NEW.company_id THEN
            RAISE EXCEPTION
                'Plan region must belong to the same company as the customer.';
        END IF;

        SELECT
            pa.company_id,
            pa.area_type,
            pa.region_id
        INTO
            v_plan_area_company_id,
            v_plan_area_type,
            v_plan_area_region_id
        FROM public.v2_plan_areas AS pa
        WHERE pa.id = NEW.plan_area_id
          AND pa.deleted_at IS NULL
        LIMIT 1;

        IF NEW.plan_area_id IS NULL
           OR v_plan_area_company_id IS NULL
        THEN

            SELECT pa.id
            INTO NEW.plan_area_id
            FROM public.v2_plan_areas AS pa
            WHERE pa.company_id = NEW.company_id
              AND pa.area_type = 'regional'
              AND pa.region_id = NEW.plan_region_id
              AND pa.deleted_at IS NULL
              AND pa.is_active = true
            LIMIT 1;

            IF NEW.plan_area_id IS NULL THEN
                RAISE EXCEPTION
                    'No active Regional Plan Area exists for the selected plan region.';
            END IF;

        ELSE

            IF v_plan_area_company_id <> NEW.company_id THEN
                RAISE EXCEPTION
                    'Plan Area must belong to the same company as the customer.';
            END IF;

            IF v_plan_area_type <> 'regional' THEN
                RAISE EXCEPTION
                    'Regional plan scope requires a regional Plan Area.';
            END IF;

            IF v_plan_area_region_id IS DISTINCT FROM NEW.plan_region_id THEN
                RAISE EXCEPTION
                    'Regional Plan Area must match plan_region_id.';
            END IF;

        END IF;

        IF NEW.ownership_mode NOT IN (
            'region_based',
            'fixed'
        ) THEN
            RAISE EXCEPTION
                'Regional plan scope supports only region_based or fixed ownership.';
        END IF;

        -- Region-based ownership must follow current region owner.
        IF NEW.ownership_mode = 'region_based' THEN

            IF NOT EXISTS (
                SELECT 1
                FROM public.user_regions AS ur
                WHERE ur.company_id = NEW.company_id
                  AND ur.user_id = NEW.regional_manager_id
                  AND ur.region_id = NEW.plan_region_id
                  AND ur.deleted_at IS NULL
            ) THEN
                RAISE EXCEPTION
                    'Selected Regional Manager does not currently own the selected plan region.';
            END IF;

        END IF;

        -- Fixed regional customer may remain assigned to its explicit
        -- manager even after the region itself is transferred.
        RETURN NEW;

    END IF;

    -- --------------------------------------------------------
    -- PORTFOLIO planning
    -- --------------------------------------------------------

    IF NEW.plan_scope = 'portfolio' THEN

        IF NEW.plan_region_id IS NOT NULL THEN
            RAISE EXCEPTION
                'Portfolio plan scope cannot have plan_region_id.';
        END IF;

        IF NEW.plan_area_id IS NULL THEN
            RAISE EXCEPTION
                'Portfolio plan scope requires plan_area_id.';
        END IF;

        SELECT
            pa.company_id,
            pa.area_type
        INTO
            v_plan_area_company_id,
            v_plan_area_type
        FROM public.v2_plan_areas AS pa
        WHERE pa.id = NEW.plan_area_id
          AND pa.deleted_at IS NULL
          AND pa.is_active = true
        LIMIT 1;

        IF v_plan_area_company_id IS NULL THEN
            RAISE EXCEPTION
                'Selected Portfolio Plan Area does not exist or is inactive.';
        END IF;

        IF v_plan_area_company_id <> NEW.company_id THEN
            RAISE EXCEPTION
                'Plan Area must belong to the same company as the customer.';
        END IF;

        IF v_plan_area_type <> 'portfolio' THEN
            RAISE EXCEPTION
                'Portfolio plan scope requires a Portfolio Plan Area.';
        END IF;

        -- Portfolio customers are commercially owned by their
        -- plan owner, not by a geographic Regional Manager.
        NEW.regional_manager_id := NULL;

        IF NEW.ownership_mode = 'portfolio_based' THEN

            SELECT EXISTS (
                SELECT 1
                FROM public.v2_plan_area_manager_assignment_history AS h
                WHERE h.company_id = NEW.company_id
                  AND h.plan_area_id = NEW.plan_area_id
                  AND h.manager_user_id = NEW.plan_owner_user_id
                  AND h.effective_to IS NULL
            )
            INTO v_current_portfolio_assignment;

            IF NOT v_current_portfolio_assignment THEN
                RAISE EXCEPTION
                    'Portfolio Plan Area is not currently assigned to the selected Plan Owner.';
            END IF;

        ELSIF NEW.ownership_mode <> 'fixed' THEN

            RAISE EXCEPTION
                'Portfolio plan scope supports only portfolio_based or fixed ownership.';

        END IF;

        RETURN NEW;

    END IF;

    -- --------------------------------------------------------
    -- OUT OF REGION
    -- --------------------------------------------------------

    IF NEW.plan_scope = 'out_of_region' THEN

        IF NEW.plan_region_id IS NOT NULL THEN
            RAISE EXCEPTION
                'Out-of-region plan scope cannot have plan_region_id.';
        END IF;

        IF NEW.plan_area_id IS NOT NULL THEN
            RAISE EXCEPTION
                'Out-of-region plan scope cannot have plan_area_id.';
        END IF;

        IF NEW.ownership_mode <> 'fixed' THEN
            RAISE EXCEPTION
                'Out-of-region plan scope must use fixed ownership.';
        END IF;

        NEW.regional_manager_id := NULL;

        RETURN NEW;

    END IF;

    -- --------------------------------------------------------
    -- Update authorization
    --
    -- Changes to V2 ownership fields must use controlled RPCs.
    -- ========================================================

END;
$function$;

-- ============================================================
-- 12. RECREATE CUSTOMER VALIDATION TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS trg_v2_validate_customer_plan_ownership
    ON public.customers;

CREATE TRIGGER trg_v2_validate_customer_plan_ownership
BEFORE INSERT OR UPDATE
ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.v2_validate_customer_plan_ownership();

-- ============================================================
-- 13. CUSTOMER PLAN ASSIGNMENT AUTHORIZATION HARDENING
--
-- Re-wrap the legacy assignment trigger requirement after
-- introducing new V2 ownership columns.
-- ============================================================

CREATE OR REPLACE FUNCTION public.v2_enforce_customer_plan_change_authorization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN

    IF TG_OP <> 'UPDATE' THEN
        RETURN NEW;
    END IF;

    IF (
        NEW.regional_manager_id
        IS DISTINCT FROM OLD.regional_manager_id
    )
    OR (
        NEW.plan_scope
        IS DISTINCT FROM OLD.plan_scope
    )
    OR (
        NEW.plan_region_id
        IS DISTINCT FROM OLD.plan_region_id
    )
    OR (
        NEW.ownership_mode
        IS DISTINCT FROM OLD.ownership_mode
    )
    OR (
        NEW.plan_owner_user_id
        IS DISTINCT FROM OLD.plan_owner_user_id
    )
    OR (
        NEW.plan_area_id
        IS DISTINCT FROM OLD.plan_area_id
    )
    THEN

        IF current_setting(
            'app.v2_customer_plan_assignment_authorized',
            true
        ) IS DISTINCT FROM 'true'
        THEN

            RAISE EXCEPTION
                'Customer plan ownership changes must use the controlled V2 assignment operation.';

        END IF;

    END IF;

    RETURN NEW;

END;
$function$;

DROP TRIGGER IF EXISTS trg_v2_enforce_customer_plan_change_authorization
    ON public.customers;

CREATE TRIGGER trg_v2_enforce_customer_plan_change_authorization
BEFORE UPDATE
ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.v2_enforce_customer_plan_change_authorization();

-- ============================================================
-- 14. CANONICAL CUSTOMER PLAN ASSIGNMENT RPC
--
-- Supports:
--   region_based
--   portfolio_based
--   fixed
--
-- Parameters:
--   customer
--   ownership mode
--   commercial plan owner
--   plan scope
--   plan area
--   plan region
--   reason
-- ============================================================

CREATE OR REPLACE FUNCTION public.v2_set_customer_plan_assignment(
    p_customer_id uuid,
    p_ownership_mode text,
    p_plan_owner_user_id uuid,
    p_plan_scope text,
    p_plan_area_id uuid,
    p_plan_region_id uuid,
    p_reason text
)
RETURNS public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_customer public.customers;

    v_old_ownership_mode text;
    v_old_regional_manager_id uuid;
    v_old_plan_scope text;
    v_old_plan_region_id uuid;
    v_old_plan_owner_user_id uuid;
    v_old_plan_area_id uuid;

    v_company_id uuid;
    v_changed_by uuid;

    v_result public.customers;
BEGIN

    v_changed_by := auth.uid();

    IF v_changed_by IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required.';
    END IF;

    IF p_reason IS NULL
       OR btrim(p_reason) = ''
    THEN
        RAISE EXCEPTION
            'A reason is required when changing customer plan ownership.';
    END IF;

    SELECT *
    INTO v_customer
    FROM public.customers AS c
    WHERE c.id = p_customer_id
      AND c.deleted_at IS NULL
    FOR UPDATE;

    IF v_customer.id IS NULL THEN
        RAISE EXCEPTION
            'Customer not found.';
    END IF;

    v_company_id := v_customer.company_id;

    IF NOT (
        public.auth_user_is_admin()
        OR public.v2_has_management_capability(
            'customers.reassign'
        )
    ) THEN
        RAISE EXCEPTION
            'User is not authorized to change customer plan ownership.';
    END IF;

    v_old_ownership_mode := v_customer.ownership_mode;
    v_old_regional_manager_id := v_customer.regional_manager_id;
    v_old_plan_scope := v_customer.plan_scope;
    v_old_plan_region_id := v_customer.plan_region_id;
    v_old_plan_owner_user_id := v_customer.plan_owner_user_id;
    v_old_plan_area_id := v_customer.plan_area_id;

    PERFORM set_config(
        'app.v2_customer_plan_assignment_authorized',
        'true',
        true
    );

    UPDATE public.customers AS c
    SET
        ownership_mode = p_ownership_mode,
        regional_manager_id =
            CASE
                WHEN p_plan_scope = 'regional'
                    THEN p_plan_owner_user_id
                ELSE NULL
            END,
        plan_owner_user_id = p_plan_owner_user_id,
        plan_scope = p_plan_scope,
        plan_area_id = p_plan_area_id,
        plan_region_id = p_plan_region_id,
        updated_at = timezone('utc'::text, now())
    WHERE c.id = p_customer_id
    RETURNING *
    INTO v_result;

    INSERT INTO public.v2_customer_plan_assignment_history (
        company_id,
        customer_id,

        old_ownership_mode,
        new_ownership_mode,

        old_regional_manager_id,
        new_regional_manager_id,

        old_plan_scope,
        new_plan_scope,

        old_plan_region_id,
        new_plan_region_id,

        old_plan_owner_user_id,
        new_plan_owner_user_id,

        old_plan_area_id,
        new_plan_area_id,

        changed_by,
        changed_at,
        reason
    )
    VALUES (
        v_company_id,
        p_customer_id,

        v_old_ownership_mode,
        p_ownership_mode,

        v_old_regional_manager_id,
        v_result.regional_manager_id,

        v_old_plan_scope,
        v_result.plan_scope,

        v_old_plan_region_id,
        v_result.plan_region_id,

        v_old_plan_owner_user_id,
        v_result.plan_owner_user_id,

        v_old_plan_area_id,
        v_result.plan_area_id,

        v_changed_by,
        timezone('utc'::text, now()),
        btrim(p_reason)
    );

    RETURN v_result;

END;
$function$;

REVOKE ALL
ON FUNCTION public.v2_set_customer_plan_assignment(
    uuid,
    text,
    uuid,
    text,
    uuid,
    uuid,
    text
)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.v2_set_customer_plan_assignment(
    uuid,
    text,
    uuid,
    text,
    uuid,
    uuid,
    text
)
TO authenticated;

-- ============================================================
-- 15. UPDATE OWNERSHIP MODE RPC
--
-- Keep the existing public API while routing through the
-- canonical customer assignment operation.
-- ============================================================

CREATE OR REPLACE FUNCTION public.v2_set_customer_ownership_mode(
    p_customer_id uuid,
    p_ownership_mode text,
    p_reason text
)
RETURNS public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_customer public.customers;
BEGIN

    SELECT *
    INTO v_customer
    FROM public.customers AS c
    WHERE c.id = p_customer_id
      AND c.deleted_at IS NULL
    LIMIT 1;

    IF v_customer.id IS NULL THEN
        RAISE EXCEPTION
            'Customer not found.';
    END IF;

    RETURN public.v2_set_customer_plan_assignment(
        v_customer.id,
        p_ownership_mode,
        v_customer.plan_owner_user_id,
        v_customer.plan_scope,
        v_customer.plan_area_id,
        v_customer.plan_region_id,
        p_reason
    );

END;
$function$;

REVOKE ALL
ON FUNCTION public.v2_set_customer_ownership_mode(
    uuid,
    text,
    text
)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.v2_set_customer_ownership_mode(
    uuid,
    text,
    text
)
TO authenticated;

-- ============================================================
-- 16. LEGACY CUSTOMER PLAN OWNER RPC COMPATIBILITY
--
-- The old V2 API remains available for Regional assignments.
-- Portfolio assignments should use:
--   v2_set_customer_plan_assignment()
-- ============================================================

CREATE OR REPLACE FUNCTION public.v2_assign_customer_plan_owner(
    p_customer_id uuid,
    p_regional_manager_id uuid,
    p_plan_scope text,
    p_plan_region_id uuid,
    p_reason text
)
RETURNS public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_customer public.customers;
    v_plan_area_id uuid;
BEGIN

    IF p_plan_scope = 'portfolio' THEN
        RAISE EXCEPTION
            'Portfolio customer assignments must use v2_set_customer_plan_assignment().';
    END IF;

    IF p_plan_scope = 'regional' THEN

        SELECT pa.id
        INTO v_plan_area_id
        FROM public.v2_plan_areas AS pa
        WHERE pa.company_id = (
            SELECT company_id
            FROM public.customers
            WHERE id = p_customer_id
        )
          AND pa.area_type = 'regional'
          AND pa.region_id = p_plan_region_id
          AND pa.deleted_at IS NULL
          AND pa.is_active = true
        LIMIT 1;

        IF v_plan_area_id IS NULL THEN
            RAISE EXCEPTION
                'No Regional Plan Area exists for the selected plan region.';
        END IF;

    ELSE

        v_plan_area_id := NULL;

    END IF;

    SELECT *
    INTO v_customer
    FROM public.customers AS c
    WHERE c.id = p_customer_id
      AND c.deleted_at IS NULL
    LIMIT 1;

    IF v_customer.id IS NULL THEN
        RAISE EXCEPTION
            'Customer not found.';
    END IF;

    RETURN public.v2_set_customer_plan_assignment(
        p_customer_id,
        COALESCE(
            v_customer.ownership_mode,
            'region_based'
        ),
        p_regional_manager_id,
        p_plan_scope,
        v_plan_area_id,
        p_plan_region_id,
        p_reason
    );

END;
$function$;

REVOKE ALL
ON FUNCTION public.v2_assign_customer_plan_owner(
    uuid,
    uuid,
    text,
    uuid,
    text
)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.v2_assign_customer_plan_owner(
    uuid,
    uuid,
    text,
    uuid,
    text
)
TO authenticated;

-- ============================================================
-- 17. ORDER PLAN SNAPSHOTS
-- ============================================================

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS plan_owner_user_id_snapshot uuid;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS plan_area_id_snapshot uuid;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS ownership_mode_snapshot text;

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_orders_v2_plan_owner_snapshot'
          AND conrelid = 'public.orders'::regclass
    ) THEN

        ALTER TABLE public.orders
            ADD CONSTRAINT fk_orders_v2_plan_owner_snapshot
            FOREIGN KEY (plan_owner_user_id_snapshot)
            REFERENCES public.users(id);

    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_orders_v2_plan_area_snapshot'
          AND conrelid = 'public.orders'::regclass
    ) THEN

        ALTER TABLE public.orders
            ADD CONSTRAINT fk_orders_v2_plan_area_snapshot
            FOREIGN KEY (plan_area_id_snapshot)
            REFERENCES public.v2_plan_areas(id);

    END IF;

END;
$$;

ALTER TABLE public.orders
    DROP CONSTRAINT IF EXISTS orders_v2_plan_scope_snapshot_check;

ALTER TABLE public.orders
    ADD CONSTRAINT orders_v2_plan_scope_snapshot_check
    CHECK (
        plan_scope_snapshot IS NULL
        OR plan_scope_snapshot IN (
            'regional',
            'portfolio',
            'out_of_region'
        )
    );

ALTER TABLE public.orders
    DROP CONSTRAINT IF EXISTS orders_v2_ownership_mode_snapshot_check;

ALTER TABLE public.orders
    ADD CONSTRAINT orders_v2_ownership_mode_snapshot_check
    CHECK (
        ownership_mode_snapshot IS NULL
        OR ownership_mode_snapshot IN (
            'region_based',
            'portfolio_based',
            'fixed'
        )
    );

CREATE INDEX IF NOT EXISTS idx_orders_v2_plan_owner_snapshot
ON public.orders(
    company_id,
    plan_owner_user_id_snapshot
)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_v2_plan_area_snapshot
ON public.orders(
    company_id,
    plan_area_id_snapshot
)
WHERE deleted_at IS NULL;

-- ============================================================
-- 18. BACKFILL NEW ORDER SNAPSHOTS WHERE SAFE
--
-- Existing V2 orders already contain regional_manager snapshot
-- and plan_region snapshot from Migration 18.
--
-- Therefore their regional Plan Owner and Plan Area can be
-- derived without guessing.
--
-- ownership_mode_snapshot is NOT guessed for old orders.
-- ============================================================

UPDATE public.orders AS o
SET
    plan_owner_user_id_snapshot =
        o.regional_manager_id_snapshot,
    plan_area_id_snapshot =
        pa.id
FROM public.v2_plan_areas AS pa
WHERE o.company_id =
      '11111111-1111-1111-1111-111111111111'
  AND o.deleted_at IS NULL
  AND o.plan_scope_snapshot = 'regional'
  AND o.plan_region_id_snapshot = pa.region_id
  AND pa.company_id = o.company_id
  AND pa.area_type = 'regional'
  AND pa.deleted_at IS NULL
  AND (
        o.plan_owner_user_id_snapshot IS NULL
        OR o.plan_area_id_snapshot IS NULL
      );

-- ============================================================
-- 19. ORDER SNAPSHOT FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.v2_snapshot_order_plan_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_plan_owner_user_id uuid;
    v_regional_manager_id uuid;
    v_plan_scope text;
    v_plan_region_id uuid;
    v_plan_area_id uuid;
    v_ownership_mode text;
BEGIN

    SELECT
        c.plan_owner_user_id,
        c.regional_manager_id,
        c.plan_scope,
        c.plan_region_id,
        c.plan_area_id,
        c.ownership_mode
    INTO
        v_plan_owner_user_id,
        v_regional_manager_id,
        v_plan_scope,
        v_plan_region_id,
        v_plan_area_id,
        v_ownership_mode
    FROM public.customers AS c
    WHERE c.id = NEW.customer_id
      AND c.company_id = NEW.company_id
      AND c.deleted_at IS NULL
    LIMIT 1;

    IF v_plan_owner_user_id IS NULL
       AND v_regional_manager_id IS NULL
       AND v_plan_scope IS NULL
       AND v_plan_region_id IS NULL
       AND v_plan_area_id IS NULL
       AND v_ownership_mode IS NULL
    THEN
        RETURN NEW;
    END IF;

    NEW.plan_owner_user_id_snapshot :=
        v_plan_owner_user_id;

    NEW.regional_manager_id_snapshot :=
        v_regional_manager_id;

    NEW.plan_scope_snapshot :=
        v_plan_scope;

    NEW.plan_region_id_snapshot :=
        v_plan_region_id;

    NEW.plan_area_id_snapshot :=
        v_plan_area_id;

    NEW.ownership_mode_snapshot :=
        v_ownership_mode;

    RETURN NEW;

END;
$function$;

DROP TRIGGER IF EXISTS trg_v2_snapshot_order_plan_ownership
    ON public.orders;

CREATE TRIGGER trg_v2_snapshot_order_plan_ownership
BEFORE INSERT
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.v2_snapshot_order_plan_ownership();

-- ============================================================
-- 20. PLAN AREA RLS
-- ============================================================

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

        OR (
            area_type = 'portfolio'
            AND EXISTS (
                SELECT 1
                FROM public.v2_plan_area_manager_assignment_history AS h
                WHERE h.company_id = v2_plan_areas.company_id
                  AND h.plan_area_id = v2_plan_areas.id
                  AND h.manager_user_id = auth.uid()
                  AND h.effective_to IS NULL
            )
        )
    )
);

-- ============================================================
-- 21. COMMENTS
-- ============================================================

COMMENT ON COLUMN public.customers.ownership_mode IS
    'V2: region_based follows current Regional Manager of the plan region; portfolio_based follows explicit Portfolio Plan Area owner; fixed never moves automatically.';

COMMENT ON COLUMN public.customers.plan_scope IS
    'V2: regional = geographic target; portfolio = commercial portfolio target; out_of_region = no regional/portfolio target but contributes to manager overall result.';

COMMENT ON COLUMN public.customers.plan_owner_user_id IS
    'V2: Commercial owner of the active customer plan. Regional Manager for regional plans, Sales/Regional Manager for portfolio plans.';

COMMENT ON COLUMN public.customers.plan_area_id IS
    'V2: Active planning bucket for the customer.';

COMMENT ON COLUMN public.orders.plan_owner_user_id_snapshot IS
    'V2: Commercial plan owner snapshot captured when the order is created.';

COMMENT ON COLUMN public.orders.plan_area_id_snapshot IS
    'V2: Commercial plan area snapshot captured when the order is created.';

COMMENT ON COLUMN public.orders.ownership_mode_snapshot IS
    'V2: Customer ownership mode snapshot captured when the order is created.';

COMMENT ON TABLE public.v2_plan_area_manager_assignment_history IS
    'V2: Effective-dated commercial ownership history for Portfolio Plan Areas.';

COMMIT;
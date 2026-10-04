-- ============================================================
-- V2 Migration 25
-- Controlled Customer Ownership Mode Management
--
-- Purpose:
--   1. Add ownership_mode fields to customer assignment history.
--   2. Add a controlled RPC for changing:
--        region_based <-> fixed
--   3. Keep current manager / plan scope / plan region unchanged.
--   4. Validate the resulting ownership model.
--   5. Record the operation in customer assignment history.
--
-- Authorization:
--   - company/admin user
--   - OR user with delegated customers.reassign capability
--
-- Important:
--   - No V1 field is modified.
--   - assigned_user_id is untouched.
--   - No order is modified.
--   - No region assignment is modified.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Add ownership mode fields to ownership history
-- ============================================================

ALTER TABLE public.v2_customer_plan_assignment_history
    ADD COLUMN IF NOT EXISTS old_ownership_mode text;

ALTER TABLE public.v2_customer_plan_assignment_history
    ADD COLUMN IF NOT EXISTS new_ownership_mode text;

ALTER TABLE public.v2_customer_plan_assignment_history
    DROP CONSTRAINT IF EXISTS v2_customer_plan_history_old_ownership_mode_check;

ALTER TABLE public.v2_customer_plan_assignment_history
    ADD CONSTRAINT v2_customer_plan_history_old_ownership_mode_check
    CHECK (
        old_ownership_mode IS NULL
        OR old_ownership_mode IN ('region_based', 'fixed')
    );

ALTER TABLE public.v2_customer_plan_assignment_history
    DROP CONSTRAINT IF EXISTS v2_customer_plan_history_new_ownership_mode_check;

ALTER TABLE public.v2_customer_plan_assignment_history
    ADD CONSTRAINT v2_customer_plan_history_new_ownership_mode_check
    CHECK (
        new_ownership_mode IS NULL
        OR new_ownership_mode IN ('region_based', 'fixed')
    );

-- ============================================================
-- 2. Controlled RPC
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
    v_company_id uuid;
    v_customer public.customers;
    v_changed_by uuid;
    v_is_authorized boolean;
    v_old_ownership_mode text;
BEGIN

    -- ========================================================
    -- 2.1 Authentication
    -- ========================================================

    v_changed_by := auth.uid();

    IF v_changed_by IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required.';
    END IF;

    -- ========================================================
    -- 2.2 Validate input
    -- ========================================================

    IF p_ownership_mode IS NULL
       OR p_ownership_mode NOT IN ('region_based', 'fixed')
    THEN
        RAISE EXCEPTION
            'ownership_mode must be either region_based or fixed.';
    END IF;

    IF p_reason IS NULL
       OR btrim(p_reason) = ''
    THEN
        RAISE EXCEPTION
            'A reason is required when changing customer ownership mode.';
    END IF;

    -- ========================================================
    -- 2.3 Load and lock customer
    -- ========================================================

    SELECT c.*
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

    -- ========================================================
    -- 2.4 Authorization
    --
    -- CEO/admin users or users having:
    --     customers.reassign
    --
    -- through the V2 governance system.
    -- ========================================================

    SELECT (
        public.auth_user_is_admin()
        OR public.v2_has_management_capability(
            'customers.reassign'
        )
    )
    INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION
            'User is not authorized to change customer ownership mode.';
    END IF;

    -- ========================================================
    -- 2.5 No-op protection
    -- ========================================================

    IF v_customer.ownership_mode = p_ownership_mode THEN
        RAISE EXCEPTION
            'Customer ownership_mode is already %.',
            p_ownership_mode;
    END IF;

    -- ========================================================
    -- 2.6 Preserve OLD value BEFORE UPDATE
    -- ========================================================

    v_old_ownership_mode := v_customer.ownership_mode;

    -- ========================================================
    -- 2.7 Validate resulting ownership model
    -- ========================================================

    IF p_ownership_mode = 'region_based' THEN

        -- A region-based customer must have a manager.
        IF v_customer.regional_manager_id IS NULL THEN
            RAISE EXCEPTION
                'Region-based customer ownership requires a Regional Manager.';
        END IF;

        -- Region-based ownership always belongs to a regional
        -- plan scope.
        IF v_customer.plan_scope IS DISTINCT FROM 'regional' THEN
            RAISE EXCEPTION
                'Region-based customer ownership requires regional plan scope.';
        END IF;

        -- Regional plan scope requires a region.
        IF v_customer.plan_region_id IS NULL THEN
            RAISE EXCEPTION
                'Region-based customer ownership requires plan_region_id.';
        END IF;

        -- The selected manager must currently own the region.
        IF NOT EXISTS (
            SELECT 1
            FROM public.user_regions AS ur
            WHERE ur.company_id = v_company_id
              AND ur.user_id = v_customer.regional_manager_id
              AND ur.region_id = v_customer.plan_region_id
              AND ur.deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION
                'Selected plan region is not currently assigned to the customer''s Regional Manager.';
        END IF;

    ELSIF p_ownership_mode = 'fixed' THEN

        -- Fixed ownership must still have an explicit manager.
        IF v_customer.regional_manager_id IS NULL THEN
            RAISE EXCEPTION
                'Fixed customer ownership requires a Regional Manager.';
        END IF;

        -- Fixed customer must still define a plan scope.
        IF v_customer.plan_scope IS NULL THEN
            RAISE EXCEPTION
                'Fixed customer ownership requires plan scope.';
        END IF;

        -- Regional scope requires a region.
        IF v_customer.plan_scope = 'regional'
           AND v_customer.plan_region_id IS NULL
        THEN
            RAISE EXCEPTION
                'Regional plan scope requires plan_region_id.';
        END IF;

        -- Out-of-region scope must not have a region.
        IF v_customer.plan_scope = 'out_of_region'
           AND v_customer.plan_region_id IS NOT NULL
        THEN
            RAISE EXCEPTION
                'Out-of-region plan scope cannot have plan_region_id.';
        END IF;

    END IF;

    -- ========================================================
    -- 2.8 Authorize ownership trigger for this transaction
    -- ========================================================

    PERFORM set_config(
        'app.v2_customer_plan_assignment_authorized',
        'true',
        true
    );

    -- ========================================================
    -- 2.9 Update ownership mode only
    --
    -- IMPORTANT:
    --   assigned_user_id remains untouched.
    --   regional_manager_id remains untouched.
    --   plan_scope remains untouched.
    --   plan_region_id remains untouched.
    -- ========================================================

    UPDATE public.customers
    SET
        ownership_mode = p_ownership_mode,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_customer_id
    RETURNING *
    INTO v_customer;

    -- ========================================================
    -- 2.10 Write complete audit history
    -- ========================================================

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

        changed_by,
        changed_at,
        reason
    )
    VALUES (
        v_company_id,
        p_customer_id,

        v_old_ownership_mode,
        p_ownership_mode,

        v_customer.regional_manager_id,
        v_customer.regional_manager_id,

        v_customer.plan_scope,
        v_customer.plan_scope,

        v_customer.plan_region_id,
        v_customer.plan_region_id,

        v_changed_by,
        timezone('utc'::text, now()),
        btrim(p_reason)
    );

    -- ========================================================
    -- 2.11 Return updated customer
    -- ========================================================

    RETURN v_customer;

END;
$function$;

-- ============================================================
-- 3. Function permissions
-- ============================================================

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

COMMIT;
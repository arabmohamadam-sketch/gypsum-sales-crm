-- ============================================================================
-- V2 CUSTOMER MANAGER INDEPENDENT OF PLAN
-- ============================================================================
-- PURPOSE
--   Decouple the required V2 customer Regional Manager assignment from the
--   optional sales-plan fields.
--
-- BUSINESS RULE
--   Customer ownership:
--      regional_manager_id = required V2 commercial owner
--
--   Sales-plan assignment:
--      plan_scope / plan_region_id = optional until explicitly configured
--
--   This matches the V2 customer requirement:
--      نام مشتری
--      شماره تماس
--      مدیر منطقه
--      استان / شهر / آدرس
--      کد ملی
--
-- COMPATIBILITY
--   - V1 remains unchanged.
--   - Existing V2 customers with plan fields remain valid.
--   - Existing NULL plan_scope records remain valid.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. REPLACE CUSTOMER OWNERSHIP VALIDATION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.v2_validate_customer_plan_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_manager_company_id uuid;
    v_manager_is_active boolean;
    v_manager_has_role boolean;
    v_region_company_id uuid;
    v_region_assigned boolean;
BEGIN

    -- ------------------------------------------------------------------------
    -- Backward compatibility
    --
    -- If no V2 ownership information is supplied, preserve V1 behavior.
    -- ------------------------------------------------------------------------

    IF NEW.regional_manager_id IS NULL
       AND NEW.plan_scope IS NULL
       AND NEW.plan_region_id IS NULL
    THEN
        RETURN NEW;
    END IF;

    -- ------------------------------------------------------------------------
    -- Regional Manager
    -- ------------------------------------------------------------------------

    IF NEW.regional_manager_id IS NULL THEN
        RAISE EXCEPTION
            'V2 customer requires a Regional Manager.';
    END IF;

    SELECT
        u.company_id,
        u.is_active
    INTO
        v_manager_company_id,
        v_manager_is_active
    FROM public.users AS u
    WHERE u.id = NEW.regional_manager_id
      AND u.deleted_at IS NULL
    LIMIT 1;

    IF v_manager_company_id IS NULL THEN
        RAISE EXCEPTION
            'Selected Regional Manager does not exist.';
    END IF;

    IF v_manager_company_id <> NEW.company_id THEN
        RAISE EXCEPTION
            'Regional Manager must belong to the same company as the customer.';
    END IF;

    IF v_manager_is_active IS DISTINCT FROM true THEN
        RAISE EXCEPTION
            'Selected Regional Manager is not active.';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles AS ur
        INNER JOIN public.roles AS r
            ON r.id = ur.role_id
           AND r.company_id = NEW.company_id
           AND r.deleted_at IS NULL
           AND r.is_active = true
        WHERE ur.user_id = NEW.regional_manager_id
          AND ur.deleted_at IS NULL
          AND r.slug::text = 'regional_manager'
    )
    INTO v_manager_has_role;

    IF NOT v_manager_has_role THEN
        RAISE EXCEPTION
            'Selected user does not have the regional_manager role.';
    END IF;

    -- ------------------------------------------------------------------------
    -- Sales plan is optional.
    --
    -- NULL means:
    --   Manager ownership is already known but sales-plan classification has
    --   not yet been configured.
    -- ------------------------------------------------------------------------

    IF NEW.plan_scope IS NULL THEN

        IF NEW.plan_region_id IS NOT NULL THEN
            RAISE EXCEPTION
                'A customer without plan scope cannot have a plan region.';
        END IF;

    ELSIF NEW.plan_scope = 'regional' THEN

        IF NEW.plan_region_id IS NULL THEN
            RAISE EXCEPTION
                'Regional plan scope requires plan_region_id.';
        END IF;

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

        SELECT EXISTS (
            SELECT 1
            FROM public.user_regions AS ur
            WHERE ur.user_id = NEW.regional_manager_id
              AND ur.region_id = NEW.plan_region_id
              AND ur.company_id = NEW.company_id
              AND ur.deleted_at IS NULL
        )
        INTO v_region_assigned;

        IF NOT v_region_assigned THEN
            RAISE EXCEPTION
                'Selected plan region is not assigned to the selected Regional Manager.';
        END IF;

    ELSIF NEW.plan_scope = 'out_of_region' THEN

        IF NEW.plan_region_id IS NOT NULL THEN
            RAISE EXCEPTION
                'Out-of-region customer cannot have a plan region.';
        END IF;

    ELSE

        RAISE EXCEPTION
            'Invalid V2 customer plan scope.';

    END IF;

    -- ------------------------------------------------------------------------
    -- Existing customer ownership changes must use the controlled operation.
    -- ------------------------------------------------------------------------

    IF TG_OP = 'UPDATE' THEN

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
        THEN

            IF current_setting(
                'app.v2_customer_plan_assignment_authorized',
                true
            ) IS DISTINCT FROM 'true'
            THEN
                RAISE EXCEPTION
                    'Customer V2 ownership changes must use the controlled assignment operation.';
            END IF;

        END IF;

    END IF;

    RETURN NEW;
END;
$function$;

-- ============================================================================
-- 2. REPLACE CONTROLLED OWNERSHIP RPC
-- ============================================================================
-- Authorization:
--
--   company_admin / sales_manager:
--       Can assign any Regional Manager.
--
--   regional_manager:
--       Can assign the customer to themselves only.
--
-- Plan assignment remains optional.
-- ============================================================================

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
    v_company_id uuid;
    v_old_manager uuid;
    v_old_scope text;
    v_old_region uuid;

    v_result public.customers;

    v_changed_by uuid;

    v_is_admin_or_sales_manager boolean;
    v_is_regional_manager boolean;
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
            'A reason is required when changing customer ownership.';
    END IF;

    IF p_regional_manager_id IS NULL THEN
        RAISE EXCEPTION
            'Regional Manager is required.';
    END IF;

    SELECT
        c.company_id,
        c.regional_manager_id,
        c.plan_scope,
        c.plan_region_id
    INTO
        v_company_id,
        v_old_manager,
        v_old_scope,
        v_old_region
    FROM public.customers AS c
    WHERE c.id = p_customer_id
      AND c.deleted_at IS NULL
    FOR UPDATE;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION
            'Customer not found.';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles AS ur
        INNER JOIN public.roles AS r
            ON r.id = ur.role_id
           AND r.company_id = v_company_id
           AND r.deleted_at IS NULL
           AND r.is_active = true
        WHERE ur.user_id = v_changed_by
          AND ur.deleted_at IS NULL
          AND r.slug::text IN (
              'company_admin',
              'sales_manager'
          )
    )
    INTO v_is_admin_or_sales_manager;

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles AS ur
        INNER JOIN public.roles AS r
            ON r.id = ur.role_id
           AND r.company_id = v_company_id
           AND r.deleted_at IS NULL
           AND r.is_active = true
        WHERE ur.user_id = v_changed_by
          AND ur.deleted_at IS NULL
          AND r.slug::text = 'regional_manager'
    )
    INTO v_is_regional_manager;

    IF NOT v_is_admin_or_sales_manager
       AND NOT (
           v_is_regional_manager
           AND p_regional_manager_id = v_changed_by
       )
    THEN
        RAISE EXCEPTION
            'You are not authorized to assign this customer to the selected Regional Manager.';
    END IF;

    IF p_plan_scope IS NULL THEN

        IF p_plan_region_id IS NOT NULL THEN
            RAISE EXCEPTION
                'A customer without plan scope cannot have a plan region.';
        END IF;

    ELSIF p_plan_scope = 'regional' THEN

        IF p_plan_region_id IS NULL THEN
            RAISE EXCEPTION
                'Regional plan scope requires plan_region_id.';
        END IF;

    ELSIF p_plan_scope = 'out_of_region' THEN

        IF p_plan_region_id IS NOT NULL THEN
            RAISE EXCEPTION
                'Out-of-region customer cannot have a plan region.';
        END IF;

    ELSE

        RAISE EXCEPTION
            'Invalid V2 customer plan scope.';

    END IF;

    PERFORM set_config(
        'app.v2_customer_plan_assignment_authorized',
        'true',
        true
    );

    UPDATE public.customers
    SET
        regional_manager_id =
            p_regional_manager_id,

        plan_scope =
            p_plan_scope,

        plan_region_id =
            p_plan_region_id,

        updated_at =
            timezone('utc', now())

    WHERE id =
        p_customer_id

    RETURNING *
    INTO v_result;

    INSERT INTO public.v2_customer_plan_assignment_history (
        company_id,
        customer_id,

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

        v_old_manager,
        p_regional_manager_id,

        v_old_scope,
        p_plan_scope,

        v_old_region,
        p_plan_region_id,

        v_changed_by,
        timezone('utc', now()),
        btrim(p_reason)
    );

    RETURN v_result;
END;
$function$;

-- ============================================================================
-- 3. FUNCTION PRIVILEGES
-- ============================================================================

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

COMMENT ON FUNCTION public.v2_validate_customer_plan_ownership()
IS
    'V2 customer validation: Regional Manager is required; sales plan scope is optional until explicitly configured.';

COMMENT ON FUNCTION public.v2_assign_customer_plan_owner(
    uuid,
    uuid,
    text,
    uuid,
    text
)
IS
    'Controlled V2 customer ownership assignment. Admin/sales manager can assign any regional manager; regional managers can assign customers to themselves.';

COMMIT;
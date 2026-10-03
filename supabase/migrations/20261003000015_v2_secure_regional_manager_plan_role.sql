BEGIN;

-- ============================================================
-- V2 Regional Manager Plan - Role Authorization
--
-- Only users with an active regional_manager role can access
-- the client-facing Regional Manager Plan API.
--
-- V1 RBAC remains untouched.
-- ============================================================

CREATE OR REPLACE FUNCTION public.v2_get_my_regional_manager_plan(
    p_year smallint,
    p_month smallint
)
RETURNS TABLE (
    region_id uuid,
    region_name text,
    target_tonnage numeric,
    achieved_tonnage numeric,
    remaining_tonnage numeric,
    achievement_rate numeric,
    loaded_order_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_company_id uuid;
    v_is_regional_manager boolean;
BEGIN

    -- --------------------------------------------------------
    -- Authentication
    -- --------------------------------------------------------

    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication is required.';
    END IF;


    -- --------------------------------------------------------
    -- Resolve active user + company
    -- --------------------------------------------------------

    SELECT
        u.company_id
    INTO
        v_company_id
    FROM public.users AS u
    WHERE u.id = v_user_id
      AND u.deleted_at IS NULL
      AND u.is_active = true
    LIMIT 1;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Active user not found.';
    END IF;


    -- --------------------------------------------------------
    -- Role authorization
    --
    -- USER-DEFINED enum is cast to text to avoid assumptions
    -- about the underlying enum type name.
    -- --------------------------------------------------------

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles AS ur

        INNER JOIN public.roles AS r
            ON r.id = ur.role_id
           AND (
                r.company_id = v_company_id
                OR r.company_id IS NULL
           )
           AND r.is_active = true
           AND r.deleted_at IS NULL

        WHERE ur.user_id = v_user_id
          AND ur.deleted_at IS NULL
          AND r.slug::text = 'regional_manager'
    )
    INTO v_is_regional_manager;


    IF NOT v_is_regional_manager THEN
        RAISE EXCEPTION
            'User does not have regional_manager role.';
    END IF;


    -- --------------------------------------------------------
    -- Execute internal calculation using authenticated user
    -- --------------------------------------------------------

    RETURN QUERY
    SELECT *
    FROM public.v2_get_regional_manager_plan(
        v_user_id,
        p_year,
        p_month
    );

END;
$$;


-- ------------------------------------------------------------
-- Client permissions
-- ------------------------------------------------------------

REVOKE ALL
ON FUNCTION public.v2_get_my_regional_manager_plan(smallint, smallint)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.v2_get_my_regional_manager_plan(smallint, smallint)
TO authenticated;


COMMIT;
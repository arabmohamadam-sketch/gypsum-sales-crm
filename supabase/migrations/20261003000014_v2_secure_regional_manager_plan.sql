BEGIN;

-- ============================================================
-- V2 Regional Manager Plan - Secure API
--
-- The existing calculation function remains as an internal
-- SECURITY DEFINER function.
--
-- Authenticated clients must use the secure wrapper below.
-- The wrapper always uses auth.uid(), preventing callers from
-- requesting another user's regional plan.
-- ============================================================


-- ------------------------------------------------------------
-- Remove direct client access to the parameterized function
-- ------------------------------------------------------------

REVOKE ALL
ON FUNCTION public.v2_get_regional_manager_plan(uuid, smallint, smallint)
FROM authenticated;


-- ------------------------------------------------------------
-- Secure client-facing wrapper
-- ------------------------------------------------------------

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
BEGIN

    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication is required.';
    END IF;

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
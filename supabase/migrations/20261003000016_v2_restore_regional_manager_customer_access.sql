BEGIN;

-- ============================================================
-- V2 - Restore Regional Manager Customer Visibility
--
-- Problem:
--   customers_select_scoped and auth_user_can_access_customer
--   did not include the regional_manager role.
--
-- Result:
--   A regional manager with assigned regions could see 0
--   customers even though customers existed inside those regions.
--
-- This migration:
--   1. Restores READ access for regional_manager.
--   2. Grants access to ALL customers inside the manager's
--      assigned regions, regardless of assigned_user_id.
--   3. Keeps existing sales_rep/company_manager behavior intact.
--   4. Does NOT grant regional_manager generic customer UPDATE,
--      DELETE, or INSERT permissions.
-- ============================================================


-- ------------------------------------------------------------
-- 1) Central customer-access helper
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auth_user_can_access_customer(
    p_company_id uuid,
    p_customer_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.customers AS c
        WHERE c.id = p_customer_id
          AND c.company_id = p_company_id
          AND c.deleted_at IS NULL
          AND (
                -- System/company admins
                public.auth_user_is_admin()

                -- Company-level managers
                OR public.auth_user_has_company_role(
                    p_company_id,
                    'company_admin'
                )

                OR public.auth_user_has_company_role(
                    p_company_id,
                    'sales_manager'
                )

                -- Directly assigned customer
                OR c.assigned_user_id = auth.uid()

                -- Regional manager:
                -- every customer in one of the manager's
                -- assigned regions, regardless of customer owner
                OR (
                    public.auth_user_has_company_role(
                        p_company_id,
                        'regional_manager'
                    )
                    AND EXISTS (
                        SELECT 1
                        FROM public.cities AS ci
                        INNER JOIN public.user_regions AS ur
                            ON ur.region_id = ci.region_id
                           AND ur.company_id = ci.company_id
                           AND ur.user_id = auth.uid()
                           AND ur.deleted_at IS NULL
                        WHERE ci.id = c.city_id
                          AND ci.company_id = c.company_id
                          AND ci.deleted_at IS NULL
                    )
                )

                -- Sales rep:
                -- unassigned customers in their assigned regions
                OR (
                    public.auth_user_has_company_role(
                        p_company_id,
                        'sales_rep'
                    )
                    AND c.assigned_user_id IS NULL
                    AND EXISTS (
                        SELECT 1
                        FROM public.cities AS ci
                        INNER JOIN public.user_regions AS ur
                            ON ur.region_id = ci.region_id
                           AND ur.company_id = ci.company_id
                           AND ur.user_id = auth.uid()
                           AND ur.deleted_at IS NULL
                        WHERE ci.id = c.city_id
                          AND ci.company_id = c.company_id
                          AND ci.deleted_at IS NULL
                    )
                )
          )
    );
$function$;


-- ------------------------------------------------------------
-- 2) Customer SELECT policy
-- ------------------------------------------------------------

DROP POLICY IF EXISTS customers_select_scoped
    ON public.customers;

CREATE POLICY customers_select_scoped
    ON public.customers
    FOR SELECT
    TO authenticated
    USING (
        company_id = public.auth_user_company_id()
        AND deleted_at IS NULL
        AND (
            -- System/company admin
            public.auth_user_is_admin()

            -- Company managers
            OR public.auth_user_has_company_role(
                company_id,
                'company_admin'
            )

            OR public.auth_user_has_company_role(
                company_id,
                'sales_manager'
            )

            -- Directly assigned customer
            OR assigned_user_id = auth.uid()

            -- Regional manager:
            -- see every customer in assigned regions
            OR (
                public.auth_user_has_company_role(
                    company_id,
                    'regional_manager'
                )
                AND EXISTS (
                    SELECT 1
                    FROM public.cities AS ci
                    INNER JOIN public.user_regions AS ur
                        ON ur.region_id = ci.region_id
                       AND ur.company_id = ci.company_id
                       AND ur.user_id = auth.uid()
                       AND ur.deleted_at IS NULL
                    WHERE ci.id = customers.city_id
                      AND ci.company_id = customers.company_id
                      AND ci.deleted_at IS NULL
                )
            )

            -- Sales rep:
            -- unassigned customer inside assigned region
            OR (
                public.auth_user_has_company_role(
                    company_id,
                    'sales_rep'
                )
                AND assigned_user_id IS NULL
                AND EXISTS (
                    SELECT 1
                    FROM public.cities AS ci
                    INNER JOIN public.user_regions AS ur
                        ON ur.region_id = ci.region_id
                       AND ur.company_id = ci.company_id
                       AND ur.user_id = auth.uid()
                       AND ur.deleted_at IS NULL
                    WHERE ci.id = customers.city_id
                      AND ci.company_id = customers.company_id
                      AND ci.deleted_at IS NULL
                )
            )
        )
    );


-- ------------------------------------------------------------
-- 3) Function permissions
-- ------------------------------------------------------------

REVOKE EXECUTE
ON FUNCTION public.auth_user_can_access_customer(uuid, uuid)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.auth_user_can_access_customer(uuid, uuid)
TO authenticated;


COMMIT;
BEGIN;

-- ============================================================================
-- V2 CUSTOMER CORE UPDATE RPC - ENUM CAST FIX
-- ============================================================================
-- Fixes the V2 customer update RPC so the text customer_type payload is
-- explicitly converted to the public.customer_type enum before UPDATE.
-- Migration 20261006000045 is already applied and is intentionally replaced
-- here with CREATE OR REPLACE rather than edited retroactively.
--
-- V1 tables, V1 APIs, ownership fields, and the controlled ownership RPC are
-- unchanged.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.v2_update_customer_core(
    p_customer_id uuid,
    p_name text,
    p_phone text,
    p_secondary_phone text DEFAULT NULL,
    p_whatsapp_number text DEFAULT NULL,
    p_customer_type text DEFAULT NULL,
    p_national_id text DEFAULT NULL,
    p_is_vip boolean DEFAULT NULL,
    p_is_active boolean DEFAULT NULL,
    p_metadata jsonb DEFAULT NULL
)
RETURNS public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_user_id uuid;
    v_company_id uuid;
    v_customer public.customers;
    v_result public.customers;
    v_can_manage_all boolean := false;
    v_is_regional_manager boolean := false;
    v_is_sales_rep boolean := false;
    v_customer_type public.customer_type;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication is required.';
    END IF;

    v_company_id := public.auth_user_company_id();

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Authenticated user does not belong to a company.';
    END IF;

    IF NOT public.auth_user_has_permission('customers.edit') THEN
        RAISE EXCEPTION 'User does not have permission to edit customers.';
    END IF;

    SELECT c.*
    INTO v_customer
    FROM public.customers AS c
    WHERE c.id = p_customer_id
      AND c.company_id = v_company_id
      AND c.deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer not found.';
    END IF;

    v_can_manage_all := public.auth_user_is_admin();

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles AS ur
        INNER JOIN public.roles AS r
            ON r.id = ur.role_id
           AND r.company_id = v_company_id
           AND r.deleted_at IS NULL
           AND r.is_active = true
        WHERE ur.user_id = v_user_id
          AND ur.deleted_at IS NULL
          AND r.slug::text IN (
              'company_admin',
              'sales_manager'
          )
    )
    INTO v_can_manage_all;

    v_can_manage_all := v_can_manage_all OR public.auth_user_is_admin();

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles AS ur
        INNER JOIN public.roles AS r
            ON r.id = ur.role_id
           AND r.company_id = v_company_id
           AND r.deleted_at IS NULL
           AND r.is_active = true
        WHERE ur.user_id = v_user_id
          AND ur.deleted_at IS NULL
          AND r.slug::text = 'regional_manager'
    )
    INTO v_is_regional_manager;

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles AS ur
        INNER JOIN public.roles AS r
            ON r.id = ur.role_id
           AND r.company_id = v_company_id
           AND r.deleted_at IS NULL
           AND r.is_active = true
        WHERE ur.user_id = v_user_id
          AND ur.deleted_at IS NULL
          AND r.slug::text = 'sales_rep'
    )
    INTO v_is_sales_rep;

    IF NOT v_can_manage_all
       AND NOT (
           v_is_regional_manager
           AND v_customer.regional_manager_id = v_user_id
       )
       AND NOT (
           v_is_sales_rep
           AND v_customer.assigned_user_id = v_user_id
       )
    THEN
        RAISE EXCEPTION 'User is not authorized to edit this customer.';
    END IF;

    IF p_name IS NULL OR btrim(p_name) = '' THEN
        RAISE EXCEPTION 'Customer name is required.';
    END IF;

    IF p_phone IS NULL OR btrim(p_phone) = '' THEN
        RAISE EXCEPTION 'Customer phone is required.';
    END IF;

    IF p_national_id IS NOT NULL
       AND btrim(p_national_id) <> ''
       AND p_national_id !~ '^[0-9]{10}$'
    THEN
        RAISE EXCEPTION 'National ID must contain exactly 10 digits.';
    END IF;

    IF p_national_id IS NOT NULL
       AND btrim(p_national_id) <> ''
    THEN
        IF EXISTS (
            SELECT 1
            FROM public.customers AS c
            WHERE c.company_id = v_company_id
              AND c.national_id = btrim(p_national_id)
              AND c.deleted_at IS NULL
              AND c.id <> p_customer_id
        ) THEN
            RAISE EXCEPTION 'This national ID is already registered for another customer.';
        END IF;
    END IF;

    -- customer_type is a PostgreSQL enum. The RPC receives text from the
    -- application, therefore it must be explicitly cast before assignment.
    IF p_customer_type IS NULL OR btrim(p_customer_type) = '' THEN
        v_customer_type := v_customer.customer_type;
    ELSE
        BEGIN
            v_customer_type := btrim(p_customer_type)::public.customer_type;
        EXCEPTION
            WHEN invalid_text_representation THEN
                RAISE EXCEPTION
                    'Invalid customer type: %',
                    btrim(p_customer_type);
        END;
    END IF;

    UPDATE public.customers
    SET
        name = btrim(p_name),
        phone = btrim(p_phone),
        secondary_phone = NULLIF(btrim(COALESCE(p_secondary_phone, '')), ''),
        whatsapp_number = NULLIF(btrim(COALESCE(p_whatsapp_number, '')), ''),
        customer_type = v_customer_type,
        national_id = NULLIF(btrim(COALESCE(p_national_id, '')), ''),
        is_vip = COALESCE(p_is_vip, v_customer.is_vip),
        is_active = COALESCE(p_is_active, v_customer.is_active),
        metadata = COALESCE(p_metadata, v_customer.metadata),
        updated_at = timezone('utc', now())
    WHERE id = p_customer_id
      AND company_id = v_company_id
      AND deleted_at IS NULL
    RETURNING *
    INTO v_result;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer update failed.';
    END IF;

    IF v_result.customer_type IS DISTINCT FROM v_customer_type THEN
        RAISE EXCEPTION 'Customer type persistence verification failed.';
    END IF;

    IF v_result.national_id IS DISTINCT FROM NULLIF(btrim(COALESCE(p_national_id, '')), '') THEN
        RAISE EXCEPTION 'National ID persistence verification failed.';
    END IF;

    RETURN v_result;
END;
$function$;

REVOKE ALL
ON FUNCTION public.v2_update_customer_core(
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    boolean,
    boolean,
    jsonb
)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.v2_update_customer_core(
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    boolean,
    boolean,
    jsonb
)
TO authenticated;

COMMENT ON FUNCTION public.v2_update_customer_core(
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    boolean,
    boolean,
    jsonb
) IS
    'V2 controlled customer core update. Explicitly casts customer_type to public.customer_type and persists national_id while leaving ownership assignment to the controlled ownership operation.';

COMMIT;

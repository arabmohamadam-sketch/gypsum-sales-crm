BEGIN;

-- ============================================================
-- V2 Regional Manager Lifecycle
--
-- Supports:
--   create / enable a Regional Manager from an existing
--   public.users/Auth user
--   deactivate an existing Regional Manager safely
--
-- Authorization:
--   CEO
--   OR Sales Manager with delegated
--      regional_managers.manage
--
-- Deactivation is blocked when:
--   - the manager still owns an active Region
--   - the manager has fixed-ownership active customers
--
-- Region-based customers should already have moved with their
-- Regions through v2_reassign_region().
--
-- No Auth user is created here. Account creation remains an
-- explicit Auth provisioning step.
-- ============================================================


-- ============================================================
-- 1. LIFECYCLE HISTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS public.v2_regional_manager_lifecycle_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id uuid NOT NULL,
    user_id uuid NOT NULL,

    action text NOT NULL,

    performed_by uuid NOT NULL,
    performed_at timestamptz NOT NULL
        DEFAULT timezone('utc'::text, now()),

    previous_is_active boolean,
    new_is_active boolean,

    previous_role_active boolean,
    new_role_active boolean,

    reason text NOT NULL,

    created_at timestamptz NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT fk_v2_rm_lifecycle_company
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id),

    CONSTRAINT fk_v2_rm_lifecycle_user
        FOREIGN KEY (user_id)
        REFERENCES public.users(id),

    CONSTRAINT fk_v2_rm_lifecycle_performed_by
        FOREIGN KEY (performed_by)
        REFERENCES public.users(id),

    CONSTRAINT v2_rm_lifecycle_action_check
        CHECK (
            action IN (
                'create',
                'activate',
                'deactivate'
            )
        ),

    CONSTRAINT v2_rm_lifecycle_reason_check
        CHECK (
            btrim(reason) <> ''
        )
);


CREATE INDEX IF NOT EXISTS idx_v2_rm_lifecycle_user
ON public.v2_regional_manager_lifecycle_history (
    company_id,
    user_id,
    performed_at DESC
);


ALTER TABLE public.v2_regional_manager_lifecycle_history
    ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS v2_rm_lifecycle_select
    ON public.v2_regional_manager_lifecycle_history;

CREATE POLICY v2_rm_lifecycle_select
ON public.v2_regional_manager_lifecycle_history
FOR SELECT
TO authenticated
USING (
    company_id = public.auth_user_company_id()
    AND (
        public.auth_user_is_admin()
        OR public.v2_is_company_ceo(company_id)
    )
);


-- ============================================================
-- 2. CONTROLLED REGIONAL MANAGER LIFECYCLE RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.v2_manage_regional_manager(
    p_user_id uuid,
    p_action text,
    p_reason text
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_company_id uuid;

    v_target_company_id uuid;
    v_target_is_active boolean;

    v_regional_manager_role_id uuid;
    v_role_active boolean;

    v_is_authorized boolean;

    v_previous_is_active boolean;
    v_previous_role_active boolean;

    v_result public.users;
BEGIN

    -- --------------------------------------------------------
    -- Authentication / company
    -- --------------------------------------------------------

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required.';
    END IF;


    v_company_id := public.auth_user_company_id();

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION
            'Active company context is required.';
    END IF;


    -- --------------------------------------------------------
    -- Validate action
    -- --------------------------------------------------------

    IF p_action NOT IN (
        'create',
        'activate',
        'deactivate'
    ) THEN
        RAISE EXCEPTION
            'Invalid Regional Manager lifecycle action.';
    END IF;


    IF p_reason IS NULL
       OR btrim(p_reason) = ''
    THEN
        RAISE EXCEPTION
            'A reason is required.';
    END IF;


    -- --------------------------------------------------------
    -- Authorization
    -- --------------------------------------------------------

    v_is_authorized :=
        public.v2_is_company_ceo(v_company_id)
        OR (
            public.auth_user_has_company_role(
                v_company_id,
                'sales_manager'
            )
            AND public.v2_has_management_capability(
                'regional_managers.manage'
            )
        );


    IF NOT v_is_authorized THEN
        RAISE EXCEPTION
            'User is not authorized to manage Regional Managers.';
    END IF;


    -- --------------------------------------------------------
    -- Serialize the target user operation.
    -- --------------------------------------------------------

    PERFORM pg_advisory_xact_lock(
        hashtextextended(
            p_user_id::text,
            0
        )
    );


    -- --------------------------------------------------------
    -- Target user
    -- --------------------------------------------------------

    SELECT
        u.company_id,
        u.is_active
    INTO
        v_target_company_id,
        v_target_is_active
    FROM public.users AS u
    WHERE u.id = p_user_id
      AND u.deleted_at IS NULL
    LIMIT 1
    FOR UPDATE;


    IF v_target_company_id IS NULL THEN
        RAISE EXCEPTION
            'Target user does not exist.';
    END IF;


    IF v_target_company_id <> v_company_id THEN
        RAISE EXCEPTION
            'Target user must belong to the same company.';
    END IF;


    -- --------------------------------------------------------
    -- Regional Manager role
    --
    -- Prefer company-specific role, otherwise a system role
    -- with company_id IS NULL.
    -- --------------------------------------------------------

    SELECT
        r.id,
        r.is_active
    INTO
        v_regional_manager_role_id,
        v_role_active
    FROM public.roles AS r
    WHERE r.slug::text = 'regional_manager'
      AND r.deleted_at IS NULL
      AND r.is_active = true
      AND (
            r.company_id = v_company_id
            OR r.company_id IS NULL
          )
    ORDER BY
        CASE
            WHEN r.company_id = v_company_id THEN 0
            ELSE 1
        END
    LIMIT 1;


    IF v_regional_manager_role_id IS NULL THEN
        RAISE EXCEPTION
            'Regional Manager role is not configured.';
    END IF;


    -- --------------------------------------------------------
    -- Current role assignment state
    -- --------------------------------------------------------

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles AS ur
        WHERE ur.user_id = p_user_id
          AND ur.role_id = v_regional_manager_role_id
          AND ur.deleted_at IS NULL
    )
    INTO v_role_active;


    v_previous_is_active := v_target_is_active;
    v_previous_role_active := v_role_active;


    -- ========================================================
    -- CREATE / ACTIVATE
    -- ========================================================

    IF p_action IN (
        'create',
        'activate'
    ) THEN

        -- Existing active Regional Manager.
        IF v_target_is_active
           AND v_role_active
        THEN
            RAISE EXCEPTION
                'User is already an active Regional Manager.';
        END IF;


        -- ----------------------------------------------------
        -- Activate public user.
        -- ----------------------------------------------------

        UPDATE public.users
        SET
            is_active = true,
            deleted_at = NULL,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_user_id;


        -- ----------------------------------------------------
        -- Restore existing soft-deleted role assignment or
        -- create it if it never existed.
        -- ----------------------------------------------------

        IF EXISTS (
            SELECT 1
            FROM public.user_roles AS ur
            WHERE ur.user_id = p_user_id
              AND ur.role_id = v_regional_manager_role_id
        ) THEN

            UPDATE public.user_roles
            SET
                deleted_at = NULL,
                assigned_at = COALESCE(
                    assigned_at,
                    timezone('utc'::text, now())
                ),
                updated_at = timezone('utc'::text, now())
            WHERE user_id = p_user_id
              AND role_id = v_regional_manager_role_id;

        ELSE

            INSERT INTO public.user_roles (
                user_id,
                role_id,
                assigned_by,
                assigned_at,
                created_at,
                updated_at
            )
            VALUES (
                p_user_id,
                v_regional_manager_role_id,
                auth.uid(),
                timezone('utc'::text, now()),
                timezone('utc'::text, now()),
                timezone('utc'::text, now())
            );

        END IF;


        UPDATE public.users
        SET
            is_active = true,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_user_id
        RETURNING *
        INTO v_result;


        INSERT INTO public.v2_regional_manager_lifecycle_history (
            company_id,
            user_id,
            action,
            performed_by,
            performed_at,
            previous_is_active,
            new_is_active,
            previous_role_active,
            new_role_active,
            reason
        )
        VALUES (
            v_company_id,
            p_user_id,
            CASE
                WHEN v_previous_role_active
                     OR v_previous_is_active
                THEN 'activate'
                ELSE 'create'
            END,
            auth.uid(),
            timezone('utc'::text, now()),
            v_previous_is_active,
            true,
            v_previous_role_active,
            true,
            btrim(p_reason)
        );


        RETURN v_result;

    END IF;


    -- ========================================================
    -- DEACTIVATE
    -- ========================================================

    IF p_action = 'deactivate' THEN

        IF NOT v_target_is_active
           OR NOT v_role_active
        THEN
            RAISE EXCEPTION
                'User is not an active Regional Manager.';
        END IF;


        -- ----------------------------------------------------
        -- A Regional Manager must have no active Region before
        -- deactivation.
        -- ----------------------------------------------------

        IF EXISTS (
            SELECT 1
            FROM public.user_regions AS ur
            WHERE ur.company_id = v_company_id
              AND ur.user_id = p_user_id
              AND ur.deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION
                'Regional Manager still has active Regions. Reassign all Regions before deactivation.';
        END IF;


        IF EXISTS (
            SELECT 1
            FROM public.v2_region_manager_assignment_history AS h
            WHERE h.company_id = v_company_id
              AND h.regional_manager_id = p_user_id
              AND h.effective_to IS NULL
        ) THEN
            RAISE EXCEPTION
                'Regional Manager still has an active V2 Region assignment.';
        END IF;


        -- ----------------------------------------------------
        -- Fixed customers require an explicit reassignment
        -- before the manager can be deactivated.
        -- ----------------------------------------------------

        IF EXISTS (
            SELECT 1
            FROM public.customers AS c
            WHERE c.company_id = v_company_id
              AND c.regional_manager_id = p_user_id
              AND c.ownership_mode = 'fixed'
              AND c.deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION
                'Regional Manager still owns fixed customers. Reassign those customers before deactivation.';
        END IF;


        -- ----------------------------------------------------
        -- Disable Regional Manager role assignment.
        -- Keep the row for history; do not hard-delete it.
        -- ----------------------------------------------------

        UPDATE public.user_roles
        SET
            deleted_at = timezone('utc'::text, now()),
            updated_at = timezone('utc'::text, now())
        WHERE user_id = p_user_id
          AND role_id = v_regional_manager_role_id
          AND deleted_at IS NULL;


        -- ----------------------------------------------------
        -- Deactivate the public user.
        -- ----------------------------------------------------

        UPDATE public.users
        SET
            is_active = false,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_user_id
        RETURNING *
        INTO v_result;


        INSERT INTO public.v2_regional_manager_lifecycle_history (
            company_id,
            user_id,
            action,
            performed_by,
            performed_at,
            previous_is_active,
            new_is_active,
            previous_role_active,
            new_role_active,
            reason
        )
        VALUES (
            v_company_id,
            p_user_id,
            'deactivate',
            auth.uid(),
            timezone('utc'::text, now()),
            v_previous_is_active,
            false,
            v_previous_role_active,
            false,
            btrim(p_reason)
        );


        RETURN v_result;

    END IF;


    RAISE EXCEPTION
        'Unsupported Regional Manager lifecycle action.';
END;
$function$;


-- ============================================================
-- 3. EXECUTE PERMISSION
-- ============================================================

REVOKE ALL
ON FUNCTION public.v2_manage_regional_manager(
    uuid,
    text,
    text
)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.v2_manage_regional_manager(
    uuid,
    text,
    text
)
TO authenticated;


COMMIT;

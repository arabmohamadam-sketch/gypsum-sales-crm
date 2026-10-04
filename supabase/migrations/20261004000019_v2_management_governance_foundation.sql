BEGIN;

-- ============================================================
-- V2 Management Governance Foundation
--
-- CEO is the ultimate authority for sensitive management
-- capabilities. The CEO may selectively delegate approved
-- capabilities to a Sales Manager.
--
-- Existing V1 data is not reassigned by this migration.
-- ============================================================

-- ============================================================
-- 1. COMPANY GOVERNANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.v2_company_governance (
    company_id uuid PRIMARY KEY,
    ceo_user_id uuid,
    ceo_assigned_at timestamptz,
    ceo_assigned_by uuid,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT fk_v2_company_governance_company
        FOREIGN KEY (company_id) REFERENCES public.companies(id),
    CONSTRAINT fk_v2_company_governance_ceo
        FOREIGN KEY (ceo_user_id) REFERENCES public.users(id),
    CONSTRAINT fk_v2_company_governance_assigned_by
        FOREIGN KEY (ceo_assigned_by) REFERENCES public.users(id)
);

ALTER TABLE public.v2_company_governance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v2_company_governance_select
    ON public.v2_company_governance;

CREATE POLICY v2_company_governance_select
ON public.v2_company_governance
FOR SELECT
TO authenticated
USING (
    company_id = public.auth_user_company_id()
    AND (
        public.auth_user_is_admin()
        OR ceo_user_id = auth.uid()
    )
);

INSERT INTO public.v2_company_governance (company_id)
SELECT c.id
FROM public.companies AS c
WHERE c.id = '11111111-1111-1111-1111-111111111111'
  AND NOT EXISTS (
      SELECT 1
      FROM public.v2_company_governance AS g
      WHERE g.company_id = c.id
  );


-- ============================================================
-- 2. APPROVED V2 MANAGEMENT CAPABILITIES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.v2_management_capabilities (
    capability text PRIMARY KEY,
    description text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.v2_management_capabilities (
    capability,
    description
)
VALUES
    (
        'regional_managers.manage',
        'ایجاد، فعال‌سازی و غیرفعال‌سازی مدیران منطقه'
    ),
    (
        'regions.manage',
        'ایجاد، ویرایش و مدیریت ساختار مناطق'
    ),
    (
        'regions.reassign',
        'واگذاری و جابه‌جایی منطقه بین مدیران منطقه'
    ),
    (
        'customers.reassign',
        'جابه‌جایی مالکیت مشتری بین مدیران منطقه'
    ),
    (
        'targets.manage',
        'ایجاد و اصلاح پلن‌های ماهانه فروش'
    )
ON CONFLICT (capability)
DO UPDATE SET
    description = EXCLUDED.description,
    is_active = true;


-- ============================================================
-- 3. CEO HELPER
-- ============================================================

CREATE OR REPLACE FUNCTION public.v2_is_company_ceo(
    p_company_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.v2_company_governance AS g
        INNER JOIN public.users AS u
            ON u.id = auth.uid()
           AND u.company_id = g.company_id
           AND u.deleted_at IS NULL
           AND u.is_active = true
        WHERE g.company_id = p_company_id
          AND g.ceo_user_id = auth.uid()
    );
$function$;

REVOKE ALL
ON FUNCTION public.v2_is_company_ceo(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.v2_is_company_ceo(uuid)
TO authenticated;


-- ============================================================
-- 4. DELEGATED MANAGEMENT CAPABILITIES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.v2_management_capability_delegations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    capability text NOT NULL,
    granted_by uuid NOT NULL,
    granted_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    revoked_by uuid,
    revoked_at timestamptz,
    grant_reason text NOT NULL,
    revoke_reason text,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT fk_v2_delegation_company
        FOREIGN KEY (company_id) REFERENCES public.companies(id),
    CONSTRAINT fk_v2_delegation_user
        FOREIGN KEY (user_id) REFERENCES public.users(id),
    CONSTRAINT fk_v2_delegation_capability
        FOREIGN KEY (capability) REFERENCES public.v2_management_capabilities(capability),
    CONSTRAINT fk_v2_delegation_granted_by
        FOREIGN KEY (granted_by) REFERENCES public.users(id),
    CONSTRAINT fk_v2_delegation_revoked_by
        FOREIGN KEY (revoked_by) REFERENCES public.users(id),
    CONSTRAINT v2_delegation_revoke_consistency
        CHECK (
            (
                revoked_at IS NULL
                AND revoked_by IS NULL
                AND revoke_reason IS NULL
            )
            OR
            (
                revoked_at IS NOT NULL
                AND revoked_by IS NOT NULL
                AND revoke_reason IS NOT NULL
                AND btrim(revoke_reason) <> ''
            )
        ),
    CONSTRAINT v2_delegation_grant_reason_check
        CHECK (btrim(grant_reason) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_active_management_delegation
ON public.v2_management_capability_delegations (
    company_id,
    user_id,
    capability
)
WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_management_delegations_user
ON public.v2_management_capability_delegations (
    company_id,
    user_id,
    capability
);

CREATE INDEX IF NOT EXISTS idx_v2_management_delegations_capability
ON public.v2_management_capability_delegations (
    company_id,
    capability
);

ALTER TABLE public.v2_management_capability_delegations
    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v2_management_delegations_select
    ON public.v2_management_capability_delegations;

CREATE POLICY v2_management_delegations_select
ON public.v2_management_capability_delegations
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
-- 5. EFFECTIVE MANAGEMENT CAPABILITY HELPER
-- ============================================================

CREATE OR REPLACE FUNCTION public.v2_has_management_capability(
    p_capability text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.v2_company_governance AS g
        INNER JOIN public.users AS u
            ON u.id = auth.uid()
           AND u.company_id = g.company_id
           AND u.deleted_at IS NULL
           AND u.is_active = true
        WHERE g.company_id = public.auth_user_company_id()
          AND (
                g.ceo_user_id = auth.uid()
                OR EXISTS (
                    SELECT 1
                    FROM public.v2_management_capability_delegations AS d
                    INNER JOIN public.v2_management_capabilities AS mc
                        ON mc.capability = d.capability
                       AND mc.is_active = true
                    WHERE d.company_id = g.company_id
                      AND d.user_id = auth.uid()
                      AND d.capability = p_capability
                      AND d.revoked_at IS NULL
                )
          )
    );
$function$;

REVOKE ALL
ON FUNCTION public.v2_has_management_capability(text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.v2_has_management_capability(text)
TO authenticated;


-- ============================================================
-- 6. CEO BOOTSTRAP / CEO CHANGE
-- ============================================================

CREATE OR REPLACE FUNCTION public.v2_set_company_ceo(
    p_company_id uuid,
    p_ceo_user_id uuid,
    p_reason text
)
RETURNS public.v2_company_governance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_current_ceo uuid;
    v_target_company_id uuid;
    v_is_bootstrap_admin boolean;
    v_result public.v2_company_governance;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication is required.';
    END IF;

    IF p_reason IS NULL OR btrim(p_reason) = '' THEN
        RAISE EXCEPTION 'A reason is required.';
    END IF;

    SELECT g.ceo_user_id
    INTO v_current_ceo
    FROM public.v2_company_governance AS g
    WHERE g.company_id = p_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Company governance record does not exist.';
    END IF;

    SELECT u.company_id
    INTO v_target_company_id
    FROM public.users AS u
    WHERE u.id = p_ceo_user_id
      AND u.deleted_at IS NULL
      AND u.is_active = true
    LIMIT 1;

    IF v_target_company_id IS NULL THEN
        RAISE EXCEPTION 'CEO user does not exist or is inactive.';
    END IF;

    IF v_target_company_id <> p_company_id THEN
        RAISE EXCEPTION 'CEO must belong to the same company.';
    END IF;

    v_is_bootstrap_admin :=
        v_current_ceo IS NULL
        AND public.auth_user_is_admin();

    IF v_current_ceo IS NOT NULL
       AND v_current_ceo <> auth.uid()
    THEN
        RAISE EXCEPTION 'Only the current CEO can change the CEO assignment.';
    END IF;

    IF NOT v_is_bootstrap_admin
       AND v_current_ceo IS NULL
    THEN
        RAISE EXCEPTION 'CEO has not been configured and bootstrap is not authorized.';
    END IF;

    UPDATE public.v2_company_governance
    SET
        ceo_user_id = p_ceo_user_id,
        ceo_assigned_at = timezone('utc'::text, now()),
        ceo_assigned_by = auth.uid(),
        updated_at = timezone('utc'::text, now())
    WHERE company_id = p_company_id
    RETURNING *
    INTO v_result;

    RETURN v_result;
END;
$function$;

REVOKE ALL
ON FUNCTION public.v2_set_company_ceo(uuid, uuid, text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.v2_set_company_ceo(uuid, uuid, text)
TO authenticated;


-- ============================================================
-- 7. GRANT MANAGEMENT CAPABILITY
-- ============================================================

CREATE OR REPLACE FUNCTION public.v2_grant_management_capability(
    p_user_id uuid,
    p_capability text,
    p_reason text
)
RETURNS public.v2_management_capability_delegations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_company_id uuid;
    v_is_sales_manager boolean;
    v_capability_active boolean;
    v_result public.v2_management_capability_delegations;
BEGIN
    v_company_id := public.auth_user_company_id();

    IF auth.uid() IS NULL OR v_company_id IS NULL THEN
        RAISE EXCEPTION 'Authentication is required.';
    END IF;

    IF NOT public.v2_is_company_ceo(v_company_id) THEN
        RAISE EXCEPTION 'Only the CEO can delegate management capabilities.';
    END IF;

    IF p_reason IS NULL OR btrim(p_reason) = '' THEN
        RAISE EXCEPTION 'A reason is required when granting a capability.';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.v2_management_capabilities AS mc
        WHERE mc.capability = p_capability
          AND mc.is_active = true
    )
    INTO v_capability_active;

    IF NOT v_capability_active THEN
        RAISE EXCEPTION 'Management capability is not available.';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles AS ur
        INNER JOIN public.roles AS r
            ON r.id = ur.role_id
           AND r.company_id = v_company_id
           AND r.deleted_at IS NULL
           AND r.is_active = true
        INNER JOIN public.users AS u
            ON u.id = ur.user_id
           AND u.company_id = v_company_id
           AND u.deleted_at IS NULL
           AND u.is_active = true
        WHERE ur.user_id = p_user_id
          AND ur.deleted_at IS NULL
          AND r.slug::text = 'sales_manager'
    )
    INTO v_is_sales_manager;

    IF NOT v_is_sales_manager THEN
        RAISE EXCEPTION 'Management capabilities can only be delegated to a Sales Manager.';
    END IF;

    INSERT INTO public.v2_management_capability_delegations (
        company_id,
        user_id,
        capability,
        granted_by,
        granted_at,
        grant_reason
    )
    VALUES (
        v_company_id,
        p_user_id,
        p_capability,
        auth.uid(),
        timezone('utc'::text, now()),
        btrim(p_reason)
    )
    RETURNING *
    INTO v_result;

    RETURN v_result;
END;
$function$;

REVOKE ALL
ON FUNCTION public.v2_grant_management_capability(uuid, text, text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.v2_grant_management_capability(uuid, text, text)
TO authenticated;


-- ============================================================
-- 8. REVOKE MANAGEMENT CAPABILITY
-- ============================================================

CREATE OR REPLACE FUNCTION public.v2_revoke_management_capability(
    p_user_id uuid,
    p_capability text,
    p_reason text
)
RETURNS public.v2_management_capability_delegations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_company_id uuid;
    v_result public.v2_management_capability_delegations;
BEGIN
    v_company_id := public.auth_user_company_id();

    IF auth.uid() IS NULL OR v_company_id IS NULL THEN
        RAISE EXCEPTION 'Authentication is required.';
    END IF;

    IF NOT public.v2_is_company_ceo(v_company_id) THEN
        RAISE EXCEPTION 'Only the CEO can revoke management capabilities.';
    END IF;

    IF p_reason IS NULL OR btrim(p_reason) = '' THEN
        RAISE EXCEPTION 'A reason is required when revoking a capability.';
    END IF;

    UPDATE public.v2_management_capability_delegations
    SET
        revoked_by = auth.uid(),
        revoked_at = timezone('utc'::text, now()),
        revoke_reason = btrim(p_reason),
        updated_at = timezone('utc'::text, now())
    WHERE company_id = v_company_id
      AND user_id = p_user_id
      AND capability = p_capability
      AND revoked_at IS NULL
    RETURNING *
    INTO v_result;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active management capability delegation not found.';
    END IF;

    RETURN v_result;
END;
$function$;

REVOKE ALL
ON FUNCTION public.v2_revoke_management_capability(uuid, text, text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.v2_revoke_management_capability(uuid, text, text)
TO authenticated;


-- ============================================================
-- 9. CUSTOMER OWNERSHIP MODE
-- ============================================================

ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS ownership_mode text;

COMMENT ON COLUMN public.customers.ownership_mode IS
    'V2: region_based means ownership follows the Plan Region manager; fixed means customer ownership remains with explicit regional_manager_id.';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'customers_v2_ownership_mode_check'
          AND conrelid = 'public.customers'::regclass
    ) THEN
        ALTER TABLE public.customers
            ADD CONSTRAINT customers_v2_ownership_mode_check
            CHECK (
                ownership_mode IS NULL
                OR ownership_mode IN ('region_based', 'fixed')
            );
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_customers_v2_ownership_mode
ON public.customers(company_id, ownership_mode)
WHERE deleted_at IS NULL;


-- ============================================================
-- 10. REGION MANAGER ASSIGNMENT HISTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS public.v2_region_manager_assignment_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    region_id uuid NOT NULL,
    regional_manager_id uuid NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    assigned_by uuid NOT NULL,
    assigned_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    ended_by uuid,
    ended_at timestamptz,
    assignment_reason text NOT NULL,
    end_reason text,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT fk_v2_region_assignment_company
        FOREIGN KEY (company_id) REFERENCES public.companies(id),
    CONSTRAINT fk_v2_region_assignment_region
        FOREIGN KEY (region_id) REFERENCES public.regions(id),
    CONSTRAINT fk_v2_region_assignment_manager
        FOREIGN KEY (regional_manager_id) REFERENCES public.users(id),
    CONSTRAINT fk_v2_region_assignment_assigned_by
        FOREIGN KEY (assigned_by) REFERENCES public.users(id),
    CONSTRAINT fk_v2_region_assignment_ended_by
        FOREIGN KEY (ended_by) REFERENCES public.users(id),
    CONSTRAINT v2_region_assignment_date_check
        CHECK (effective_to IS NULL OR effective_to >= effective_from),
    CONSTRAINT v2_region_assignment_reason_check
        CHECK (btrim(assignment_reason) <> ''),
    CONSTRAINT v2_region_assignment_end_reason_check
        CHECK (end_reason IS NULL OR btrim(end_reason) <> '')
);

CREATE INDEX IF NOT EXISTS idx_v2_region_assignment_history_region
ON public.v2_region_manager_assignment_history(
    company_id,
    region_id,
    effective_from DESC
);

CREATE INDEX IF NOT EXISTS idx_v2_region_assignment_history_manager
ON public.v2_region_manager_assignment_history(
    company_id,
    regional_manager_id,
    effective_from DESC
);

CREATE INDEX IF NOT EXISTS idx_v2_region_assignment_history_active
ON public.v2_region_manager_assignment_history(
    company_id,
    region_id
)
WHERE effective_to IS NULL;

ALTER TABLE public.v2_region_manager_assignment_history
    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v2_region_assignment_history_select
    ON public.v2_region_manager_assignment_history;

CREATE POLICY v2_region_assignment_history_select
ON public.v2_region_manager_assignment_history
FOR SELECT
TO authenticated
USING (
    company_id = public.auth_user_company_id()
    AND (
        public.auth_user_is_admin()
        OR public.v2_is_company_ceo(company_id)
        OR regional_manager_id = auth.uid()
    )
);


-- ============================================================
-- 11. CUSTOMER OWNERSHIP VALIDATION UPDATE
-- ============================================================

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
    IF NEW.regional_manager_id IS NULL
       AND NEW.plan_scope IS NULL
       AND NEW.plan_region_id IS NULL
       AND NEW.ownership_mode IS NULL
    THEN
        RETURN NEW;
    END IF;

    IF NEW.ownership_mode IS NULL THEN
        RAISE EXCEPTION 'V2 customer assignment requires ownership_mode.';
    END IF;

    IF NEW.ownership_mode NOT IN ('region_based', 'fixed') THEN
        RAISE EXCEPTION 'Invalid V2 customer ownership_mode.';
    END IF;

    IF NEW.regional_manager_id IS NULL THEN
        RAISE EXCEPTION 'V2 customer assignment requires a Regional Manager.';
    END IF;

    SELECT u.company_id, u.is_active
    INTO v_manager_company_id, v_manager_is_active
    FROM public.users AS u
    WHERE u.id = NEW.regional_manager_id
      AND u.deleted_at IS NULL
    LIMIT 1;

    IF v_manager_company_id IS NULL THEN
        RAISE EXCEPTION 'Selected Regional Manager does not exist.';
    END IF;

    IF v_manager_company_id <> NEW.company_id THEN
        RAISE EXCEPTION 'Regional Manager must belong to the same company as the customer.';
    END IF;

    IF v_manager_is_active IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'Selected Regional Manager is not active.';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles AS ur
        INNER JOIN public.roles AS r
            ON r.id = ur.role_id
           AND (r.company_id = NEW.company_id OR r.company_id IS NULL)
           AND r.deleted_at IS NULL
           AND r.is_active = true
        WHERE ur.user_id = NEW.regional_manager_id
          AND ur.deleted_at IS NULL
          AND r.slug::text = 'regional_manager'
    )
    INTO v_manager_has_role;

    IF NOT v_manager_has_role THEN
        RAISE EXCEPTION 'Selected user does not have the regional_manager role.';
    END IF;

    IF NEW.ownership_mode = 'region_based' THEN
        IF NEW.plan_scope IS NULL OR NEW.plan_scope <> 'regional' THEN
            RAISE EXCEPTION 'Region-based customer ownership requires a regional plan scope.';
        END IF;

        IF NEW.plan_region_id IS NULL THEN
            RAISE EXCEPTION 'Region-based customer ownership requires plan_region_id.';
        END IF;

        SELECT r.company_id
        INTO v_region_company_id
        FROM public.regions AS r
        WHERE r.id = NEW.plan_region_id
          AND r.deleted_at IS NULL
        LIMIT 1;

        IF v_region_company_id IS NULL THEN
            RAISE EXCEPTION 'Selected plan region does not exist.';
        END IF;

        IF v_region_company_id <> NEW.company_id THEN
            RAISE EXCEPTION 'Plan region must belong to the same company as the customer.';
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
            RAISE EXCEPTION 'Selected plan region is not currently assigned to the selected Regional Manager.';
        END IF;
    END IF;

    IF NEW.ownership_mode = 'fixed' THEN
        IF NEW.plan_scope IS NULL THEN
            RAISE EXCEPTION 'Fixed customer ownership requires plan_scope.';
        END IF;

        IF NEW.plan_scope = 'regional'
           AND NEW.plan_region_id IS NULL
        THEN
            RAISE EXCEPTION 'Regional plan scope requires plan_region_id.';
        END IF;

        IF NEW.plan_scope = 'out_of_region'
           AND NEW.plan_region_id IS NOT NULL
        THEN
            RAISE EXCEPTION 'Out-of-region plan scope cannot have a plan region.';
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF (
            NEW.regional_manager_id IS DISTINCT FROM OLD.regional_manager_id
        )
        OR (
            NEW.plan_scope IS DISTINCT FROM OLD.plan_scope
        )
        OR (
            NEW.plan_region_id IS DISTINCT FROM OLD.plan_region_id
        )
        OR (
            NEW.ownership_mode IS DISTINCT FROM OLD.ownership_mode
        )
        THEN
            IF current_setting(
                'app.v2_customer_plan_assignment_authorized',
                true
            ) IS DISTINCT FROM 'true'
            THEN
                RAISE EXCEPTION 'Customer plan ownership changes must use the controlled V2 assignment operation.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_v2_validate_customer_plan_ownership
    ON public.customers;

CREATE TRIGGER trg_v2_validate_customer_plan_ownership
BEFORE INSERT OR UPDATE
ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.v2_validate_customer_plan_ownership();


-- ============================================================
-- 12. FUNCTION PERMISSIONS
-- ============================================================

REVOKE ALL
ON FUNCTION public.v2_set_company_ceo(uuid, uuid, text)
FROM PUBLIC, anon;

REVOKE ALL
ON FUNCTION public.v2_grant_management_capability(uuid, text, text)
FROM PUBLIC, anon;

REVOKE ALL
ON FUNCTION public.v2_revoke_management_capability(uuid, text, text)
FROM PUBLIC, anon;

COMMIT;
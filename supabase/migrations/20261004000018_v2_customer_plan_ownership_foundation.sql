BEGIN;

-- ============================================================
-- V2 Customer Plan Ownership + Shipment Destination Foundation
--
-- BUSINESS RULES
--
-- 1. Customer has an explicit Regional Manager owner.
-- 2. Customer Plan Scope is either:
--      regional
--      out_of_region
--
-- 3. For regional scope:
--      plan_region_id must point to one of the regions assigned
--      to that Regional Manager.
--
-- 4. For out_of_region scope:
--      plan_region_id is NULL.
--      The sale has NO regional target.
--      The sale DOES contribute to the manager's overall result.
--
-- 5. orders keep a snapshot of the customer's plan ownership at
--    order creation time so historical orders do not move when
--    customer ownership changes later.
--
-- 6. shipments record the real destination independently from
--    customer ownership. Therefore destination location never
--    determines plan ownership.
--
-- 7. Existing V1 data is NOT reassigned in this migration.
--    Existing NULL ownership values remain NULL until an
--    explicit mapping migration is prepared.
--
-- 8. Existing V1 behavior remains intact as far as possible.
--    V2 validation only activates when the new ownership fields
--    are used.
-- ============================================================

-- ============================================================
-- 1. CUSTOMER PLAN OWNERSHIP COLUMNS
-- ============================================================

ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS regional_manager_id uuid,
    ADD COLUMN IF NOT EXISTS plan_scope text,
    ADD COLUMN IF NOT EXISTS plan_region_id uuid;

COMMENT ON COLUMN public.customers.regional_manager_id IS
    'V2: Regional Manager who owns the customer commercially. This is independent of customer city/geographic region.';

COMMENT ON COLUMN public.customers.plan_scope IS
    'V2: regional = contributes to a specific regional target; out_of_region = no regional target but contributes to manager overall result.';

COMMENT ON COLUMN public.customers.plan_region_id IS
    'V2: Regional plan target associated with the customer when plan_scope = regional. NULL for out_of_region.';

-- ============================================================
-- 2. CUSTOMER FKs / INDEXES
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_customers_v2_regional_manager'
          AND conrelid = 'public.customers'::regclass
    ) THEN
        ALTER TABLE public.customers
            ADD CONSTRAINT fk_customers_v2_regional_manager
            FOREIGN KEY (regional_manager_id)
            REFERENCES public.users(id);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_customers_v2_plan_region'
          AND conrelid = 'public.customers'::regclass
    ) THEN
        ALTER TABLE public.customers
            ADD CONSTRAINT fk_customers_v2_plan_region
            FOREIGN KEY (plan_region_id)
            REFERENCES public.regions(id);
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_customers_v2_regional_manager
    ON public.customers(company_id, regional_manager_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_v2_plan_region
    ON public.customers(company_id, plan_region_id)
    WHERE deleted_at IS NULL;

-- ============================================================
-- 3. CUSTOMER PLAN SCOPE CHECK
--
-- NULL is temporarily allowed for old V1 records.
-- A later controlled migration will make V2 assignment
-- mandatory after existing customers are mapped.
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'customers_v2_plan_scope_check'
          AND conrelid = 'public.customers'::regclass
    ) THEN
        ALTER TABLE public.customers
            ADD CONSTRAINT customers_v2_plan_scope_check
            CHECK (
                plan_scope IS NULL
                OR plan_scope IN ('regional', 'out_of_region')
            );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'customers_v2_plan_scope_region_consistency'
          AND conrelid = 'public.customers'::regclass
    ) THEN
        ALTER TABLE public.customers
            ADD CONSTRAINT customers_v2_plan_scope_region_consistency
            CHECK (
                plan_scope IS NULL
                OR (
                    plan_scope = 'regional'
                    AND plan_region_id IS NOT NULL
                )
                OR (
                    plan_scope = 'out_of_region'
                    AND plan_region_id IS NULL
                )
            );
    END IF;
END;
$$;

-- ============================================================
-- 4. CUSTOMER PLAN OWNERSHIP VALIDATION
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

    -- --------------------------------------------------------
    -- Backward compatibility:
    -- If none of the V2 ownership fields are supplied,
    -- preserve the existing V1 behavior.
    -- --------------------------------------------------------

    IF NEW.regional_manager_id IS NULL
       AND NEW.plan_scope IS NULL
       AND NEW.plan_region_id IS NULL
    THEN
        RETURN NEW;
    END IF;

    -- --------------------------------------------------------
    -- Regional Manager validation
    -- --------------------------------------------------------

    IF NEW.regional_manager_id IS NULL THEN
        RAISE EXCEPTION
            'V2 customer assignment requires a Regional Manager.';
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

    -- --------------------------------------------------------
    -- Plan Scope validation
    -- --------------------------------------------------------

    IF NEW.plan_scope IS NULL THEN
        RAISE EXCEPTION
            'V2 customer assignment requires plan_scope.';
    END IF;

    IF NEW.plan_scope NOT IN (
        'regional',
        'out_of_region'
    ) THEN
        RAISE EXCEPTION
            'Invalid V2 customer plan scope.';
    END IF;

    -- --------------------------------------------------------
    -- Regional scope:
    -- selected Plan Region must belong to the manager.
    -- --------------------------------------------------------

    IF NEW.plan_scope = 'regional' THEN

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

    END IF;

    -- --------------------------------------------------------
    -- Out-of-region:
    -- no target region is allowed.
    -- --------------------------------------------------------

    IF NEW.plan_scope = 'out_of_region'
       AND NEW.plan_region_id IS NOT NULL
    THEN
        RAISE EXCEPTION
            'Out-of-region customer assignment cannot have a plan region.';
    END IF;

    -- --------------------------------------------------------
    -- Existing customer ownership changes:
    -- they must go through the controlled V2 RPC.
    --
    -- This prevents ordinary UPDATE operations from silently
    -- moving a customer between Regional Managers.
    -- --------------------------------------------------------

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
                    'Customer plan ownership changes must use the controlled V2 assignment operation.';
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
-- 5. CUSTOMER PLAN ASSIGNMENT HISTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS public.v2_customer_plan_assignment_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    customer_id uuid NOT NULL,

    old_regional_manager_id uuid,
    new_regional_manager_id uuid,

    old_plan_scope text,
    new_plan_scope text,

    old_plan_region_id uuid,
    new_plan_region_id uuid,

    changed_by uuid,
    changed_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),

    reason text NOT NULL,

    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT fk_v2_customer_plan_history_company
        FOREIGN KEY (company_id)
        REFERENCES public.companies(id),

    CONSTRAINT fk_v2_customer_plan_history_customer
        FOREIGN KEY (customer_id)
        REFERENCES public.customers(id),

    CONSTRAINT fk_v2_customer_plan_history_old_manager
        FOREIGN KEY (old_regional_manager_id)
        REFERENCES public.users(id),

    CONSTRAINT fk_v2_customer_plan_history_new_manager
        FOREIGN KEY (new_regional_manager_id)
        REFERENCES public.users(id),

    CONSTRAINT fk_v2_customer_plan_history_old_region
        FOREIGN KEY (old_plan_region_id)
        REFERENCES public.regions(id),

    CONSTRAINT fk_v2_customer_plan_history_new_region
        FOREIGN KEY (new_plan_region_id)
        REFERENCES public.regions(id),

    CONSTRAINT fk_v2_customer_plan_history_changed_by
        FOREIGN KEY (changed_by)
        REFERENCES public.users(id),

    CONSTRAINT v2_customer_plan_history_scope_check
        CHECK (
            old_plan_scope IS NULL
            OR old_plan_scope IN ('regional', 'out_of_region')
        ),

    CONSTRAINT v2_customer_plan_history_new_scope_check
        CHECK (
            new_plan_scope IS NULL
            OR new_plan_scope IN ('regional', 'out_of_region')
        )
);

CREATE INDEX IF NOT EXISTS idx_v2_customer_plan_history_customer
    ON public.v2_customer_plan_assignment_history(
        company_id,
        customer_id,
        changed_at DESC
    );

CREATE INDEX IF NOT EXISTS idx_v2_customer_plan_history_manager
    ON public.v2_customer_plan_assignment_history(
        company_id,
        new_regional_manager_id,
        changed_at DESC
    );

ALTER TABLE public.v2_customer_plan_assignment_history
    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v2_customer_plan_history_select
    ON public.v2_customer_plan_assignment_history;

CREATE POLICY v2_customer_plan_history_select
ON public.v2_customer_plan_assignment_history
FOR SELECT
TO authenticated
USING (
    company_id = public.auth_user_company_id()
    AND (
        public.auth_user_is_admin()
        OR public.auth_user_has_company_role(
            company_id,
            'sales_manager'
        )
    )
);

-- ============================================================
-- 6. CONTROLLED CUSTOMER PLAN ASSIGNMENT RPC
--
-- Only company_admin / sales_manager may correct an existing
-- customer's plan ownership.
-- A Regional Manager cannot move a customer to themselves.
--
-- reason is mandatory.
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
    v_company_id uuid;
    v_old_manager uuid;
    v_old_scope text;
    v_old_region uuid;
    v_result public.customers;
    v_changed_by uuid;
    v_is_authorized boolean;
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
    INTO v_is_authorized;

    IF NOT v_is_authorized
       AND NOT public.auth_user_is_admin()
    THEN
        RAISE EXCEPTION
            'Only company admin or sales manager can change customer plan ownership.';
    END IF;

    PERFORM set_config(
        'app.v2_customer_plan_assignment_authorized',
        'true',
        true
    );

    UPDATE public.customers
    SET
        regional_manager_id = p_regional_manager_id,
        plan_scope = p_plan_scope,
        plan_region_id = p_plan_region_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_customer_id
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
        timezone('utc'::text, now()),
        btrim(p_reason)
    );

    RETURN v_result;
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
-- 7. ORDER PLAN OWNERSHIP SNAPSHOT
-- ============================================================

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS regional_manager_id_snapshot uuid,
    ADD COLUMN IF NOT EXISTS plan_scope_snapshot text,
    ADD COLUMN IF NOT EXISTS plan_region_id_snapshot uuid;

COMMENT ON COLUMN public.orders.regional_manager_id_snapshot IS
    'V2: Snapshot of customer Regional Manager ownership at order creation time.';

COMMENT ON COLUMN public.orders.plan_scope_snapshot IS
    'V2: Snapshot of customer plan scope at order creation time.';

COMMENT ON COLUMN public.orders.plan_region_id_snapshot IS
    'V2: Snapshot of customer plan region at order creation time.';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_orders_v2_plan_manager_snapshot'
          AND conrelid = 'public.orders'::regclass
    ) THEN
        ALTER TABLE public.orders
            ADD CONSTRAINT fk_orders_v2_plan_manager_snapshot
            FOREIGN KEY (regional_manager_id_snapshot)
            REFERENCES public.users(id);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_orders_v2_plan_region_snapshot'
          AND conrelid = 'public.orders'::regclass
    ) THEN
        ALTER TABLE public.orders
            ADD CONSTRAINT fk_orders_v2_plan_region_snapshot
            FOREIGN KEY (plan_region_id_snapshot)
            REFERENCES public.regions(id);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'orders_v2_plan_scope_snapshot_check'
          AND conrelid = 'public.orders'::regclass
    ) THEN
        ALTER TABLE public.orders
            ADD CONSTRAINT orders_v2_plan_scope_snapshot_check
            CHECK (
                plan_scope_snapshot IS NULL
                OR plan_scope_snapshot IN (
                    'regional',
                    'out_of_region'
                )
            );
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_orders_v2_plan_manager_snapshot
    ON public.orders(
        company_id,
        regional_manager_id_snapshot
    )
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_v2_plan_region_snapshot
    ON public.orders(
        company_id,
        plan_region_id_snapshot
    )
    WHERE deleted_at IS NULL;

-- ------------------------------------------------------------
-- Snapshot customer plan ownership on NEW orders.
-- Existing orders remain untouched until a controlled backfill.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.v2_snapshot_order_plan_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_manager_id uuid;
    v_plan_scope text;
    v_plan_region_id uuid;
BEGIN

    SELECT
        c.regional_manager_id,
        c.plan_scope,
        c.plan_region_id
    INTO
        v_manager_id,
        v_plan_scope,
        v_plan_region_id
    FROM public.customers AS c
    WHERE c.id = NEW.customer_id
      AND c.company_id = NEW.company_id
      AND c.deleted_at IS NULL
    LIMIT 1;

    -- Preserve compatibility while existing customers are being
    -- mapped. Once V2 mapping is complete, this can be tightened
    -- to require a complete customer assignment before an order
    -- is accepted.

    IF v_manager_id IS NULL
       AND v_plan_scope IS NULL
       AND v_plan_region_id IS NULL
    THEN
        RETURN NEW;
    END IF;

    NEW.regional_manager_id_snapshot := v_manager_id;
    NEW.plan_scope_snapshot := v_plan_scope;
    NEW.plan_region_id_snapshot := v_plan_region_id;

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
-- 8. SHIPMENT DESTINATION
-- ============================================================

ALTER TABLE public.shipments
    ADD COLUMN IF NOT EXISTS destination_city_id uuid,
    ADD COLUMN IF NOT EXISTS destination_region_id uuid;

COMMENT ON COLUMN public.shipments.destination_city_id IS
    'V2: Actual shipment destination city. Independent from customer plan ownership.';

COMMENT ON COLUMN public.shipments.destination_region_id IS
    'V2: Actual shipment destination region. Used to determine inside-region vs out-of-region fulfillment.';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_shipments_v2_destination_city'
          AND conrelid = 'public.shipments'::regclass
    ) THEN
        ALTER TABLE public.shipments
            ADD CONSTRAINT fk_shipments_v2_destination_city
            FOREIGN KEY (destination_city_id)
            REFERENCES public.cities(id);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_shipments_v2_destination_region'
          AND conrelid = 'public.shipments'::regclass
    ) THEN
        ALTER TABLE public.shipments
            ADD CONSTRAINT fk_shipments_v2_destination_region
            FOREIGN KEY (destination_region_id)
            REFERENCES public.regions(id);
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_shipments_v2_destination_city
    ON public.shipments(company_id, destination_city_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shipments_v2_destination_region
    ON public.shipments(company_id, destination_region_id)
    WHERE deleted_at IS NULL;

-- ------------------------------------------------------------
-- Validate / derive destination region from destination city.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.v2_validate_shipment_destination()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_city_region_id uuid;
    v_city_company_id uuid;
BEGIN

    IF NEW.destination_city_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT
        c.region_id,
        c.company_id
    INTO
        v_city_region_id,
        v_city_company_id
    FROM public.cities AS c
    WHERE c.id = NEW.destination_city_id
      AND c.deleted_at IS NULL
    LIMIT 1;

    IF v_city_region_id IS NULL THEN
        RAISE EXCEPTION
            'Destination city does not exist or has no region.';
    END IF;

    IF v_city_company_id <> NEW.company_id THEN
        RAISE EXCEPTION
            'Destination city must belong to the same company as the shipment.';
    END IF;

    IF NEW.destination_region_id IS NULL THEN
        NEW.destination_region_id := v_city_region_id;
    ELSIF NEW.destination_region_id <> v_city_region_id THEN
        RAISE EXCEPTION
            'Destination region does not match destination city region.';
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_v2_validate_shipment_destination
    ON public.shipments;

CREATE TRIGGER trg_v2_validate_shipment_destination
BEFORE INSERT OR UPDATE
ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION public.v2_validate_shipment_destination();

-- ============================================================
-- 9. Grants
-- ============================================================

REVOKE ALL
ON FUNCTION public.v2_validate_customer_plan_ownership()
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.v2_snapshot_order_plan_ownership()
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.v2_validate_shipment_destination()
FROM PUBLIC;

COMMIT;

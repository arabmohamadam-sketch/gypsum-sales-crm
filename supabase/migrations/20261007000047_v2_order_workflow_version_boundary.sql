BEGIN;

-- ============================================================================
-- V2 ORDER WORKFLOW VERSION BOUNDARY
-- ============================================================================
-- Existing orders remain V1. New orders created through createV2() are V2.
-- V1 behavior is intentionally preserved.
-- ============================================================================

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS workflow_version text;

UPDATE public.orders
SET workflow_version = 'v1'
WHERE workflow_version IS NULL;

ALTER TABLE public.orders
    ALTER COLUMN workflow_version SET DEFAULT 'v1',
    ALTER COLUMN workflow_version SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'orders_workflow_version_check'
          AND conrelid = 'public.orders'::regclass
    ) THEN
        ALTER TABLE public.orders
            ADD CONSTRAINT orders_workflow_version_check
            CHECK (workflow_version IN ('v1', 'v2'));
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_orders_company_workflow_version
    ON public.orders(company_id, workflow_version)
    WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.orders.workflow_version IS
    'Order workflow generation: v1=legacy behavior, v2=multi-stage approval workflow.';

-- Do not allow an existing order to be converted between workflow versions.
CREATE OR REPLACE FUNCTION public.v2_guard_order_workflow_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
    IF TG_OP = 'UPDATE'
       AND NEW.workflow_version IS DISTINCT FROM OLD.workflow_version
    THEN
        RAISE EXCEPTION 'workflow_version cannot be changed after order creation.';
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_v2_guard_order_workflow_version
    ON public.orders;

CREATE TRIGGER trg_v2_guard_order_workflow_version
BEFORE UPDATE OF workflow_version
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.v2_guard_order_workflow_version();

-- V2-only confirmation rule. V1 orders intentionally bypass this rule.
CREATE OR REPLACE FUNCTION public.v2_guard_order_workflow_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
    IF TG_OP = 'INSERT'
       AND NEW.workflow_version = 'v2'
       AND NEW.status IS DISTINCT FROM 'draft'
    THEN
        RAISE EXCEPTION 'V2 orders must start in draft status.';
    END IF;

    IF NEW.workflow_version = 'v2'
       AND NEW.status = 'confirmed'
       AND NEW.approval_status IS DISTINCT FROM 'approved'
    THEN
        RAISE EXCEPTION 'V2 orders can be confirmed only after final sales approval.';
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_v2_guard_order_workflow_state
    ON public.orders;

CREATE TRIGGER trg_v2_guard_order_workflow_state
BEFORE INSERT OR UPDATE OF status, approval_status, workflow_version
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.v2_guard_order_workflow_state();

-- V2 approval rows must belong to V2 orders.
CREATE OR REPLACE FUNCTION public.v2_guard_order_approval_workflow_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_workflow_version text;
BEGIN
    SELECT o.workflow_version
    INTO v_workflow_version
    FROM public.orders AS o
    WHERE o.id = NEW.order_id
      AND o.company_id = NEW.company_id
      AND o.deleted_at IS NULL
    LIMIT 1;

    IF v_workflow_version IS NULL THEN
        RAISE EXCEPTION 'Order does not exist for approval in the current company.';
    END IF;

    IF v_workflow_version <> 'v2' THEN
        RAISE EXCEPTION 'Approval workflow is available only for V2 orders.';
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_v2_guard_order_approvals
    ON public.order_approvals;

CREATE TRIGGER trg_v2_guard_order_approvals
BEFORE INSERT OR UPDATE OF order_id, company_id
ON public.order_approvals
FOR EACH ROW
EXECUTE FUNCTION public.v2_guard_order_approval_workflow_version();

COMMIT;
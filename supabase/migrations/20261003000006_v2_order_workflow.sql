-- =============================================================================
-- Gypsum Sales CRM V2
-- Migration: 20261003000006_v2_order_workflow.sql
--
-- Purpose:
--   1. Add V2 order approval workflow.
--   2. Add independent approval / fulfillment / delivery statuses.
--   3. Add complete order status history.
--   4. Add order event timeline.
--   5. Preserve all existing V1 order data and status semantics.
--
-- IMPORTANT:
--   - Existing orders.status is NOT removed or changed.
--   - New V2 workflow columns are nullable to avoid changing historical V1 data.
--   - Role/region-specific authorization will be tightened in later migrations.
-- =============================================================================

BEGIN;


-- =============================================================================
-- 1. ENUMS
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'order_approval_stage'
  ) THEN
    CREATE TYPE public.order_approval_stage AS ENUM (
      'regional',
      'sales'
    );
  END IF;
END
$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'order_approval_status'
  ) THEN
    CREATE TYPE public.order_approval_status AS ENUM (
      'pending',
      'approved',
      'rejected',
      'returned',
      'cancelled'
    );
  END IF;
END
$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'order_fulfillment_status'
  ) THEN
    CREATE TYPE public.order_fulfillment_status AS ENUM (
      'not_ready',
      'ready',
      'partially_allocated',
      'allocated',
      'loading',
      'loaded',
      'sent',
      'completed',
      'cancelled'
    );
  END IF;
END
$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'order_delivery_status'
  ) THEN
    CREATE TYPE public.order_delivery_status AS ENUM (
      'not_started',
      'partial',
      'delivered',
      'rejected',
      'cancelled'
    );
  END IF;
END
$$;


-- =============================================================================
-- 2. ADD V2 WORKFLOW COLUMNS TO ORDERS
--
-- Nullable on purpose.
--
-- Existing V1 orders must not suddenly be assigned a false workflow state.
-- New V2 application services will populate these fields explicitly.
-- =============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS approval_status
  public.order_approval_status;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_status
  public.order_fulfillment_status;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_status
  public.order_delivery_status;


-- =============================================================================
-- 3. ORDER APPROVALS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.order_approvals (

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id uuid NOT NULL
    REFERENCES public.companies(id)
    ON DELETE RESTRICT,

  order_id uuid NOT NULL
    REFERENCES public.orders(id)
    ON DELETE RESTRICT,

  approval_stage public.order_approval_stage NOT NULL,

  cycle_number integer NOT NULL DEFAULT 1,

  status public.order_approval_status NOT NULL
    DEFAULT 'pending',

  acted_by uuid
    REFERENCES public.users(id)
    ON DELETE RESTRICT,

  acted_at timestamptz,

  rejection_reason text,

  notes text,

  created_at timestamptz NOT NULL
    DEFAULT timezone('utc', now()),

  updated_at timestamptz NOT NULL
    DEFAULT timezone('utc', now()),

  deleted_at timestamptz,

  CONSTRAINT order_approvals_cycle_positive
    CHECK (cycle_number > 0),

  CONSTRAINT order_approvals_decision_consistency
    CHECK (
      (
        status = 'pending'
        AND acted_by IS NULL
        AND acted_at IS NULL
      )
      OR
      (
        status <> 'pending'
        AND acted_by IS NOT NULL
        AND acted_at IS NOT NULL
      )
    ),

  CONSTRAINT order_approvals_company_fk
    FOREIGN KEY (company_id)
    REFERENCES public.companies(id)
    ON DELETE RESTRICT
);


-- One unique approval record per stage within a workflow cycle.
CREATE UNIQUE INDEX IF NOT EXISTS uq_order_approvals_cycle
  ON public.order_approvals (
    company_id,
    order_id,
    approval_stage,
    cycle_number
  );


-- Only one pending approval can exist for a stage at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_order_approvals_one_pending
  ON public.order_approvals (
    company_id,
    order_id,
    approval_stage
  )
  WHERE status = 'pending'
    AND deleted_at IS NULL;


CREATE INDEX IF NOT EXISTS idx_order_approvals_order
  ON public.order_approvals (
    company_id,
    order_id,
    created_at DESC
  );


CREATE INDEX IF NOT EXISTS idx_order_approvals_pending
  ON public.order_approvals (
    company_id,
    status,
    created_at DESC
  )
  WHERE deleted_at IS NULL;


-- =============================================================================
-- 4. ORDER STATUS HISTORY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.order_status_history (

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id uuid NOT NULL
    REFERENCES public.companies(id)
    ON DELETE RESTRICT,

  order_id uuid NOT NULL
    REFERENCES public.orders(id)
    ON DELETE RESTRICT,

  status_type text NOT NULL,

  old_status text,

  new_status text NOT NULL,

  changed_by uuid
    REFERENCES public.users(id)
    ON DELETE RESTRICT,

  changed_at timestamptz NOT NULL
    DEFAULT timezone('utc', now()),

  reason text,

  metadata jsonb NOT NULL
    DEFAULT '{}'::jsonb,

  deleted_at timestamptz,

  CONSTRAINT order_status_history_type_check
    CHECK (
      status_type IN (
        'order',
        'approval',
        'fulfillment',
        'delivery'
      )
    )
);


CREATE INDEX IF NOT EXISTS idx_order_status_history_order
  ON public.order_status_history (
    company_id,
    order_id,
    changed_at DESC
  );


CREATE INDEX IF NOT EXISTS idx_order_status_history_type
  ON public.order_status_history (
    company_id,
    status_type,
    changed_at DESC
  );


-- =============================================================================
-- 5. ORDER EVENTS
--
-- Generic event timeline for the complete order lifecycle.
--
-- Examples:
--
--   created
--   submitted_for_regional_approval
--   regional_approved
--   regional_rejected
--   regional_returned
--   sales_approved
--   sales_rejected
--   order_edited
--   shipment_created
--   allocation_created
--   waybill_issued
--   loading_confirmed
--   sent
--   delivered
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.order_events (

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id uuid NOT NULL
    REFERENCES public.companies(id)
    ON DELETE RESTRICT,

  order_id uuid NOT NULL
    REFERENCES public.orders(id)
    ON DELETE RESTRICT,

  event_type text NOT NULL,

  actor_user_id uuid
    REFERENCES public.users(id)
    ON DELETE RESTRICT,

  actor_device_id text,

  client_event_uuid uuid,

  event_at timestamptz NOT NULL
    DEFAULT timezone('utc', now()),

  payload jsonb NOT NULL
    DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL
    DEFAULT timezone('utc', now()),

  deleted_at timestamptz,

  CONSTRAINT order_events_type_not_empty
    CHECK (btrim(event_type) <> '')
);


CREATE UNIQUE INDEX IF NOT EXISTS uq_order_events_client_uuid
  ON public.order_events (
    company_id,
    client_event_uuid
  )
  WHERE client_event_uuid IS NOT NULL;


CREATE INDEX IF NOT EXISTS idx_order_events_order
  ON public.order_events (
    company_id,
    order_id,
    event_at DESC
  );


CREATE INDEX IF NOT EXISTS idx_order_events_type
  ON public.order_events (
    company_id,
    event_type,
    event_at DESC
  );


-- =============================================================================
-- 6. UPDATED_AT TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS trg_v2_order_approvals_updated_at
ON public.order_approvals;

CREATE TRIGGER trg_v2_order_approvals_updated_at
BEFORE UPDATE ON public.order_approvals
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


-- =============================================================================
-- 7. PREVENT HARD DELETE
-- =============================================================================

DROP TRIGGER IF EXISTS trg_v2_order_approvals_prevent_hard_delete
ON public.order_approvals;

CREATE TRIGGER trg_v2_order_approvals_prevent_hard_delete
BEFORE DELETE ON public.order_approvals
FOR EACH ROW
EXECUTE FUNCTION public.prevent_hard_delete();


DROP TRIGGER IF EXISTS trg_v2_order_status_history_prevent_hard_delete
ON public.order_status_history;

CREATE TRIGGER trg_v2_order_status_history_prevent_hard_delete
BEFORE DELETE ON public.order_status_history
FOR EACH ROW
EXECUTE FUNCTION public.prevent_hard_delete();


DROP TRIGGER IF EXISTS trg_v2_order_events_prevent_hard_delete
ON public.order_events;

CREATE TRIGGER trg_v2_order_events_prevent_hard_delete
BEFORE DELETE ON public.order_events
FOR EACH ROW
EXECUTE FUNCTION public.prevent_hard_delete();


-- =============================================================================
-- 8. ENABLE RLS
-- =============================================================================

ALTER TABLE public.order_approvals
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.order_status_history
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.order_events
  ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 9. ORDER APPROVALS RLS
-- =============================================================================

DROP POLICY IF EXISTS order_approvals_company_isolation
ON public.order_approvals;

CREATE POLICY order_approvals_company_isolation
  ON public.order_approvals
  FOR ALL
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
  )
  WITH CHECK (
    company_id = public.auth_user_company_id()
  );


-- =============================================================================
-- 10. ORDER STATUS HISTORY RLS
-- =============================================================================

DROP POLICY IF EXISTS order_status_history_company_isolation
ON public.order_status_history;

CREATE POLICY order_status_history_company_isolation
  ON public.order_status_history
  FOR ALL
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
  )
  WITH CHECK (
    company_id = public.auth_user_company_id()
  );


-- =============================================================================
-- 11. ORDER EVENTS RLS
-- =============================================================================

DROP POLICY IF EXISTS order_events_company_isolation
ON public.order_events;

CREATE POLICY order_events_company_isolation
  ON public.order_events
  FOR ALL
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
  )
  WITH CHECK (
    company_id = public.auth_user_company_id()
  );


-- =============================================================================
-- 12. TABLE GRANTS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.order_approvals
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.order_status_history
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.order_events
TO authenticated;


-- =============================================================================
-- 13. COMMENTS
-- =============================================================================

COMMENT ON COLUMN public.orders.approval_status IS
  'V2 independent approval workflow state. Nullable for V1 compatibility.';

COMMENT ON COLUMN public.orders.fulfillment_status IS
  'V2 physical fulfillment state. Nullable for V1 compatibility.';

COMMENT ON COLUMN public.orders.delivery_status IS
  'V2 delivery state. Nullable for V1 compatibility.';


COMMENT ON TABLE public.order_approvals IS
  'V2 multi-stage order approval history and current approval actions.';

COMMENT ON TABLE public.order_status_history IS
  'Immutable business history of order workflow status changes.';

COMMENT ON TABLE public.order_events IS
  'Complete chronological event timeline for the V2 order lifecycle.';


COMMIT;
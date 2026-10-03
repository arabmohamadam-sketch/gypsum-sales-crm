-- =============================================================================
-- Gypsum Sales CRM V2
-- Migration: 20261003000007_v2_order_approval_rpc.sql
--
-- Purpose:
--   1. Add V2 approval permissions.
--   2. Create a regional_manager role for each active company.
--   3. Assign approval permissions to the appropriate roles.
--   4. Prevent direct client writes to approval/history/event tables.
--   5. Enforce regional scope for regional managers.
--   6. Allow company/super admins to override regional scope.
--   7. Add atomic order submission for regional approval.
--   8. Add atomic regional/sales approval decision workflow.
--   9. Add idempotency to approval operations.
--  10. Record approval + history + event in one transaction.
--
-- Compatibility:
--   - Existing V1 orders.status remains unchanged.
--   - Existing V1 order data is preserved.
--   - Existing V1 RBAC remains intact.
--   - New V2 columns remain nullable for V1 compatibility.
-- =============================================================================

BEGIN;


-- =============================================================================
-- 1. APPROVAL PERMISSIONS
-- =============================================================================

INSERT INTO public.permissions (
  resource,
  action,
  slug,
  description
)
VALUES
(
  'orders',
  'approve_regional',
  'orders.approve_regional',
  'Approve or reject orders at regional manager stage'
),
(
  'orders',
  'approve_sales',
  'orders.approve_sales',
  'Approve or reject orders at sales manager stage'
)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 2. REGIONAL MANAGER ROLE
--
-- One company-scoped role per active company.
--
-- No company UUID is hard-coded.
-- =============================================================================

INSERT INTO public.roles (
  company_id,
  name,
  slug,
  description,
  is_system,
  is_active
)
SELECT
  c.id,
  'Regional Manager',
  'regional_manager',
  'Manages regional order approvals',
  false,
  true
FROM public.companies c
WHERE c.deleted_at IS NULL
  AND c.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.roles r
    WHERE r.company_id = c.id
      AND r.slug = 'regional_manager'
      AND r.deleted_at IS NULL
  );


-- =============================================================================
-- 3. ROLE PERMISSIONS
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Super Admin
-- -----------------------------------------------------------------------------

INSERT INTO public.role_permissions (
  role_id,
  permission_id
)
SELECT
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug = 'super_admin'
  AND r.deleted_at IS NULL
  AND p.slug IN (
    'orders.approve_regional',
    'orders.approve_sales'
  )
  AND p.deleted_at IS NULL
ON CONFLICT DO NOTHING;


-- -----------------------------------------------------------------------------
-- Company Admin
-- -----------------------------------------------------------------------------

INSERT INTO public.role_permissions (
  role_id,
  permission_id
)
SELECT
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug = 'company_admin'
  AND r.deleted_at IS NULL
  AND p.slug IN (
    'orders.approve_regional',
    'orders.approve_sales'
  )
  AND p.deleted_at IS NULL
ON CONFLICT DO NOTHING;


-- -----------------------------------------------------------------------------
-- Sales Manager
-- -----------------------------------------------------------------------------

INSERT INTO public.role_permissions (
  role_id,
  permission_id
)
SELECT
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug = 'sales_manager'
  AND r.deleted_at IS NULL
  AND p.slug = 'orders.approve_sales'
  AND p.deleted_at IS NULL
ON CONFLICT DO NOTHING;


-- -----------------------------------------------------------------------------
-- Regional Manager
-- -----------------------------------------------------------------------------

INSERT INTO public.role_permissions (
  role_id,
  permission_id
)
SELECT
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug = 'regional_manager'
  AND r.deleted_at IS NULL
  AND p.slug = 'orders.approve_regional'
  AND p.deleted_at IS NULL
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 4. PREVENT DIRECT CLIENT WRITES
--
-- Approval/history/event creation must go through trusted RPCs.
-- =============================================================================

REVOKE INSERT, UPDATE, DELETE
ON public.order_approvals
FROM authenticated;

GRANT SELECT
ON public.order_approvals
TO authenticated;


REVOKE INSERT, UPDATE, DELETE
ON public.order_status_history
FROM authenticated;

GRANT SELECT
ON public.order_status_history
TO authenticated;


REVOKE INSERT, UPDATE, DELETE
ON public.order_events
FROM authenticated;

GRANT SELECT
ON public.order_events
TO authenticated;


-- =============================================================================
-- 5. HELPER:
--    COMPANY ADMIN OR SUPER ADMIN
-- =============================================================================

CREATE OR REPLACE FUNCTION public.v2_user_is_approval_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    public.auth_user_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.users u
      INNER JOIN public.user_roles ur
        ON ur.user_id = u.id
       AND ur.deleted_at IS NULL
      INNER JOIN public.roles r
        ON r.id = ur.role_id
       AND r.deleted_at IS NULL
       AND r.is_active = true
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.is_active = true
        AND u.company_id = r.company_id
        AND r.slug = 'company_admin'
    );
$$;


REVOKE EXECUTE
ON FUNCTION public.v2_user_is_approval_admin()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.v2_user_is_approval_admin()
TO authenticated;


-- =============================================================================
-- 6. HELPER:
--    REGIONAL APPROVAL SCOPE
--
-- Rules:
--
--   Super Admin / Company Admin
--       -> allowed for company scope
--
--   Regional Manager
--       -> only assigned customer region
--
-- Other users
--       -> not allowed
-- =============================================================================

CREATE OR REPLACE FUNCTION public.v2_user_can_approve_regional_order(
  p_order_id uuid,
  p_company_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    CASE
      WHEN public.v2_user_is_approval_admin()
        THEN EXISTS (
          SELECT 1
          FROM public.orders o
          WHERE o.id = p_order_id
            AND o.company_id = p_company_id
            AND o.deleted_at IS NULL
        )

      ELSE EXISTS (
        SELECT 1
        FROM public.orders o

        INNER JOIN public.customers c
          ON c.id = o.customer_id
         AND c.company_id = o.company_id
         AND c.deleted_at IS NULL

        INNER JOIN public.cities city
          ON city.id = c.city_id
         AND city.company_id = o.company_id
         AND city.deleted_at IS NULL

        INNER JOIN public.user_regions ur
          ON ur.region_id = city.region_id
         AND ur.company_id = o.company_id
         AND ur.user_id = auth.uid()
         AND ur.deleted_at IS NULL

        INNER JOIN public.users u
          ON u.id = auth.uid()
         AND u.company_id = o.company_id
         AND u.deleted_at IS NULL
         AND u.is_active = true

        WHERE o.id = p_order_id
          AND o.company_id = p_company_id
          AND o.deleted_at IS NULL
      )
    END;
$$;


REVOKE EXECUTE
ON FUNCTION public.v2_user_can_approve_regional_order(
  uuid,
  uuid
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.v2_user_can_approve_regional_order(
  uuid,
  uuid
)
TO authenticated;


-- =============================================================================
-- 7. SUBMIT ORDER FOR REGIONAL APPROVAL
-- =============================================================================

CREATE OR REPLACE FUNCTION public.v2_submit_order_for_approval(
  p_order_id uuid,
  p_idempotency_key text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id uuid;
  v_request_hash text;

  v_idempotency_id uuid;
  v_existing_key public.idempotency_keys;

  v_order record;

  v_cycle_number integer;
  v_regional_approval_id uuid;

  v_response jsonb;
BEGIN

  -- ===========================================================================
  -- 1. Authentication
  -- ===========================================================================

  v_company_id := public.auth_user_company_id();

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION
      'Authenticated user does not belong to a company.';
  END IF;


  -- ===========================================================================
  -- 2. Permission
  -- ===========================================================================

  IF NOT public.auth_user_has_permission('orders.write') THEN
    RAISE EXCEPTION
      'User does not have permission to submit orders.';
  END IF;


  -- ===========================================================================
  -- 3. Idempotency key validation
  -- ===========================================================================

  IF p_idempotency_key IS NULL
     OR btrim(p_idempotency_key) = '' THEN

    RAISE EXCEPTION
      'Idempotency key is required.';

  END IF;


  IF length(p_idempotency_key) > 200 THEN

    RAISE EXCEPTION
      'Idempotency key exceeds 200 characters.';

  END IF;


  -- ===========================================================================
  -- 4. Request fingerprint
  -- ===========================================================================

  v_request_hash := md5(
    jsonb_build_object(
      'operation_type', 'order.submit_for_approval',
      'order_id', p_order_id,
      'notes', p_notes
    )::text
  );


  -- ===========================================================================
  -- 5. Claim idempotency operation
  -- ===========================================================================

  INSERT INTO public.idempotency_keys (
    company_id,
    idempotency_key,
    operation_type,
    request_hash,
    created_by,
    created_at
  )
  VALUES (
    v_company_id,
    p_idempotency_key,
    'order.submit_for_approval',
    v_request_hash,
    auth.uid(),
    timezone('utc', now())
  )
  ON CONFLICT (
    company_id,
    idempotency_key
  )
  DO NOTHING
  RETURNING id
  INTO v_idempotency_id;


  -- ===========================================================================
  -- 6. Existing request / retry
  -- ===========================================================================

  IF v_idempotency_id IS NULL THEN

    SELECT *
    INTO v_existing_key
    FROM public.idempotency_keys
    WHERE company_id = v_company_id
      AND idempotency_key = p_idempotency_key
    FOR UPDATE;


    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Unable to resolve idempotency key.';
    END IF;


    IF v_existing_key.operation_type <>
       'order.submit_for_approval' THEN

      RAISE EXCEPTION
        'Idempotency key belongs to another operation.';

    END IF;


    IF v_existing_key.request_hash <>
       v_request_hash THEN

      RAISE EXCEPTION
        'Idempotency key has already been used with a different request payload.';

    END IF;


    IF v_existing_key.completed_at IS NULL
       OR v_existing_key.response_body IS NULL THEN

      RAISE EXCEPTION
        'Idempotent operation exists but has no completed result.';

    END IF;


    RETURN v_existing_key.response_body;

  END IF;


  -- ===========================================================================
  -- 7. Lock order
  -- ===========================================================================

  SELECT
    o.id,
    o.company_id,
    o.customer_id,
    o.status,
    o.approval_status,
    o.fulfillment_status,
    o.delivery_status,
    o.deleted_at
  INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
    AND o.company_id = v_company_id
    AND o.deleted_at IS NULL
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Order not found.';
  END IF;


  -- ===========================================================================
  -- 8. Prevent cancelled V1 orders from entering V2 workflow
  -- ===========================================================================

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION
      'Cancelled orders cannot enter the V2 approval workflow.';
  END IF;


  -- ===========================================================================
  -- 9. Prevent duplicate active workflow
  -- ===========================================================================

  IF v_order.approval_status IS NOT NULL
     AND v_order.approval_status NOT IN (
       'rejected',
       'returned'
     ) THEN

    RAISE EXCEPTION
      'Order is already inside an active or completed approval workflow.';

  END IF;


  -- ===========================================================================
  -- 10. Determine next workflow cycle
  -- ===========================================================================

  SELECT COALESCE(
    MAX(oa.cycle_number),
    0
  ) + 1
  INTO v_cycle_number
  FROM public.order_approvals oa
  WHERE oa.company_id = v_company_id
    AND oa.order_id = p_order_id;


  -- ===========================================================================
  -- 11. Set V2 workflow state
  -- ===========================================================================

  UPDATE public.orders
  SET
    approval_status = 'pending',
    fulfillment_status = 'not_ready',
    delivery_status = COALESCE(
      delivery_status,
      'not_started'
    ),
    updated_at = timezone('utc', now())
  WHERE id = p_order_id;


  -- ===========================================================================
  -- 12. Create regional approval request
  -- ===========================================================================

  INSERT INTO public.order_approvals (
    company_id,
    order_id,
    approval_stage,
    cycle_number,
    status,
    acted_by,
    acted_at,
    rejection_reason,
    notes
  )
  VALUES (
    v_company_id,
    p_order_id,
    'regional',
    v_cycle_number,
    'pending',
    NULL,
    NULL,
    NULL,
    p_notes
  )
  RETURNING id
  INTO v_regional_approval_id;


  -- ===========================================================================
  -- 13. Status history
  -- ===========================================================================

  INSERT INTO public.order_status_history (
    company_id,
    order_id,
    status_type,
    old_status,
    new_status,
    changed_by,
    changed_at,
    reason,
    metadata
  )
  VALUES (
    v_company_id,
    p_order_id,
    'approval',
    COALESCE(
      v_order.approval_status::text,
      'none'
    ),
    'pending',
    auth.uid(),
    timezone('utc', now()),
    'order.submit_for_approval',
    jsonb_build_object(
      'stage', 'regional',
      'cycle_number', v_cycle_number
    )
  );


  -- ===========================================================================
  -- 14. Order event
  -- ===========================================================================

  INSERT INTO public.order_events (
    company_id,
    order_id,
    event_type,
    actor_user_id,
    actor_device_id,
    client_event_uuid,
    event_at,
    payload
  )
  VALUES (
    v_company_id,
    p_order_id,
    'submitted_for_regional_approval',
    auth.uid(),
    'V2-RPC',
    NULL,
    timezone('utc', now()),
    jsonb_build_object(
      'stage', 'regional',
      'cycle_number', v_cycle_number,
      'notes', p_notes
    )
  );


  -- ===========================================================================
  -- 15. Response
  -- ===========================================================================

  v_response := jsonb_build_object(
    'success', true,
    'operation', 'order.submit_for_approval',
    'order_id', p_order_id,
    'approval_stage', 'regional',
    'approval_id', v_regional_approval_id,
    'cycle_number', v_cycle_number,
    'approval_status', 'pending'
  );


  -- ===========================================================================
  -- 16. Store idempotency result
  -- ===========================================================================

  UPDATE public.idempotency_keys
  SET
    result_entity_id = v_regional_approval_id,
    response_status = 200,
    response_body = v_response,
    completed_at = timezone('utc', now())
  WHERE id = v_idempotency_id;


  RETURN v_response;

END;
$$;


-- =============================================================================
-- 8. DECIDE ORDER APPROVAL
-- =============================================================================

CREATE OR REPLACE FUNCTION public.v2_decide_order_approval(
  p_order_id uuid,
  p_stage public.order_approval_stage,
  p_decision text,
  p_idempotency_key text,
  p_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id uuid;
  v_request_hash text;

  v_idempotency_id uuid;
  v_existing_key public.idempotency_keys;

  v_order record;
  v_approval record;

  v_response jsonb;
  v_next_approval_id uuid;
BEGIN

  -- ===========================================================================
  -- 1. Authentication
  -- ===========================================================================

  v_company_id := public.auth_user_company_id();

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION
      'Authenticated user does not belong to a company.';
  END IF;


  -- ===========================================================================
  -- 2. Validate stage
  -- ===========================================================================

  IF p_stage IS NULL THEN
    RAISE EXCEPTION
      'Approval stage is required.';
  END IF;


  -- ===========================================================================
  -- 3. Validate decision
  -- ===========================================================================

  IF p_decision NOT IN (
    'approve',
    'reject'
  ) THEN

    RAISE EXCEPTION
      'Invalid approval decision. Allowed values: approve, reject.';

  END IF;


  IF p_decision = 'reject'
     AND (
       p_reason IS NULL
       OR btrim(p_reason) = ''
     ) THEN

    RAISE EXCEPTION
      'Rejection reason is required.';

  END IF;


  -- ===========================================================================
  -- 4. Permission
  -- ===========================================================================

  IF p_stage = 'regional' THEN

    IF NOT public.auth_user_has_permission(
      'orders.approve_regional'
    ) THEN

      RAISE EXCEPTION
        'User does not have regional approval permission.';

    END IF;

  ELSE

    IF NOT public.auth_user_has_permission(
      'orders.approve_sales'
    ) THEN

      RAISE EXCEPTION
        'User does not have sales approval permission.';

    END IF;

  END IF;


  -- ===========================================================================
  -- 5. Idempotency key
  -- ===========================================================================

  IF p_idempotency_key IS NULL
     OR btrim(p_idempotency_key) = '' THEN

    RAISE EXCEPTION
      'Idempotency key is required.';

  END IF;


  IF length(p_idempotency_key) > 200 THEN

    RAISE EXCEPTION
      'Idempotency key exceeds 200 characters.';

  END IF;


  -- ===========================================================================
  -- 6. Request fingerprint
  -- ===========================================================================

  v_request_hash := md5(
    jsonb_build_object(
      'operation_type', 'order.approval_decision',
      'order_id', p_order_id,
      'stage', p_stage,
      'decision', p_decision,
      'reason', p_reason,
      'notes', p_notes
    )::text
  );


  -- ===========================================================================
  -- 7. Claim idempotency
  -- ===========================================================================

  INSERT INTO public.idempotency_keys (
    company_id,
    idempotency_key,
    operation_type,
    request_hash,
    created_by,
    created_at
  )
  VALUES (
    v_company_id,
    p_idempotency_key,
    'order.approval_decision',
    v_request_hash,
    auth.uid(),
    timezone('utc', now())
  )
  ON CONFLICT (
    company_id,
    idempotency_key
  )
  DO NOTHING
  RETURNING id
  INTO v_idempotency_id;


  -- ===========================================================================
  -- 8. Existing operation / retry
  -- ===========================================================================

  IF v_idempotency_id IS NULL THEN

    SELECT *
    INTO v_existing_key
    FROM public.idempotency_keys
    WHERE company_id = v_company_id
      AND idempotency_key = p_idempotency_key
    FOR UPDATE;


    IF NOT FOUND THEN

      RAISE EXCEPTION
        'Unable to resolve idempotency key.';

    END IF;


    IF v_existing_key.operation_type <>
       'order.approval_decision' THEN

      RAISE EXCEPTION
        'Idempotency key belongs to another operation.';

    END IF;


    IF v_existing_key.request_hash <>
       v_request_hash THEN

      RAISE EXCEPTION
        'Idempotency key has already been used with a different request payload.';

    END IF;


    IF v_existing_key.completed_at IS NULL
       OR v_existing_key.response_body IS NULL THEN

      RAISE EXCEPTION
        'Idempotent operation exists but has no completed result.';

    END IF;


    RETURN v_existing_key.response_body;

  END IF;


  -- ===========================================================================
  -- 9. Lock the order
  -- ===========================================================================

  SELECT
    o.id,
    o.company_id,
    o.customer_id,
    o.status,
    o.approval_status,
    o.fulfillment_status,
    o.delivery_status,
    o.deleted_at
  INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
    AND o.company_id = v_company_id
    AND o.deleted_at IS NULL
  FOR UPDATE;


  IF NOT FOUND THEN

    RAISE EXCEPTION
      'Order not found.';

  END IF;


  -- ===========================================================================
  -- 10. Regional scope
  -- ===========================================================================

  IF p_stage = 'regional' THEN

    IF NOT public.v2_user_can_approve_regional_order(
      p_order_id,
      v_company_id
    ) THEN

      RAISE EXCEPTION
        'User is not authorized to approve this order at regional stage.';

    END IF;

  END IF;


  -- ===========================================================================
  -- 11. Find pending approval
  -- ===========================================================================

  SELECT
    oa.id,
    oa.company_id,
    oa.order_id,
    oa.approval_stage,
    oa.cycle_number,
    oa.status,
    oa.acted_by,
    oa.acted_at
  INTO v_approval
  FROM public.order_approvals oa
  WHERE oa.company_id = v_company_id
    AND oa.order_id = p_order_id
    AND oa.approval_stage = p_stage
    AND oa.status = 'pending'
    AND oa.deleted_at IS NULL
  ORDER BY oa.cycle_number DESC
  LIMIT 1
  FOR UPDATE;


  IF NOT FOUND THEN

    RAISE EXCEPTION
      'No pending % approval exists for this order.',
      p_stage;

  END IF;


  -- ===========================================================================
  -- 12. REGIONAL STAGE
  -- ===========================================================================

  IF p_stage = 'regional' THEN

    IF p_decision = 'approve' THEN

      -- -----------------------------------------------------------------------
      -- Regional approval
      -- -----------------------------------------------------------------------

      UPDATE public.order_approvals
      SET
        status = 'approved',
        acted_by = auth.uid(),
        acted_at = timezone('utc', now()),
        notes = p_notes,
        updated_at = timezone('utc', now())
      WHERE id = v_approval.id;


      -- -----------------------------------------------------------------------
      -- Create sales approval
      -- -----------------------------------------------------------------------

      INSERT INTO public.order_approvals (
        company_id,
        order_id,
        approval_stage,
        cycle_number,
        status,
        acted_by,
        acted_at,
        rejection_reason,
        notes
      )
      VALUES (
        v_company_id,
        p_order_id,
        'sales',
        v_approval.cycle_number,
        'pending',
        NULL,
        NULL,
        NULL,
        NULL
      )
      RETURNING id
      INTO v_next_approval_id;


      UPDATE public.orders
      SET
        approval_status = 'pending',
        fulfillment_status = COALESCE(
          fulfillment_status,
          'not_ready'
        ),
        updated_at = timezone('utc', now())
      WHERE id = p_order_id;


      -- -----------------------------------------------------------------------
      -- History
      -- -----------------------------------------------------------------------

      INSERT INTO public.order_status_history (
        company_id,
        order_id,
        status_type,
        old_status,
        new_status,
        changed_by,
        changed_at,
        reason,
        metadata
      )
      VALUES (
        v_company_id,
        p_order_id,
        'approval',
        'pending',
        'regional_approved',
        auth.uid(),
        timezone('utc', now()),
        p_reason,
        jsonb_build_object(
          'stage', 'regional',
          'cycle_number', v_approval.cycle_number
        )
      );


      -- -----------------------------------------------------------------------
      -- Event
      -- -----------------------------------------------------------------------

      INSERT INTO public.order_events (
        company_id,
        order_id,
        event_type,
        actor_user_id,
        actor_device_id,
        client_event_uuid,
        event_at,
        payload
      )
      VALUES (
        v_company_id,
        p_order_id,
        'regional_approved',
        auth.uid(),
        'V2-RPC',
        NULL,
        timezone('utc', now()),
        jsonb_build_object(
          'stage', 'regional',
          'cycle_number', v_approval.cycle_number,
          'next_stage', 'sales'
        )
      );


      v_response := jsonb_build_object(
        'success', true,
        'operation', 'order.approval_decision',
        'order_id', p_order_id,
        'stage', 'regional',
        'decision', 'approve',
        'approval_id', v_approval.id,
        'next_approval_id', v_next_approval_id,
        'next_stage', 'sales',
        'approval_status', 'pending'
      );


    ELSE

      -- -----------------------------------------------------------------------
      -- Regional rejection
      -- -----------------------------------------------------------------------

      UPDATE public.order_approvals
      SET
        status = 'rejected',
        acted_by = auth.uid(),
        acted_at = timezone('utc', now()),
        rejection_reason = p_reason,
        notes = p_notes,
        updated_at = timezone('utc', now())
      WHERE id = v_approval.id;


      UPDATE public.orders
      SET
        approval_status = 'rejected',
        updated_at = timezone('utc', now())
      WHERE id = p_order_id;


      INSERT INTO public.order_status_history (
        company_id,
        order_id,
        status_type,
        old_status,
        new_status,
        changed_by,
        changed_at,
        reason,
        metadata
      )
      VALUES (
        v_company_id,
        p_order_id,
        'approval',
        'pending',
        'regional_rejected',
        auth.uid(),
        timezone('utc', now()),
        p_reason,
        jsonb_build_object(
          'stage', 'regional',
          'cycle_number', v_approval.cycle_number
        )
      );


      INSERT INTO public.order_events (
        company_id,
        order_id,
        event_type,
        actor_user_id,
        actor_device_id,
        client_event_uuid,
        event_at,
        payload
      )
      VALUES (
        v_company_id,
        p_order_id,
        'regional_rejected',
        auth.uid(),
        'V2-RPC',
        NULL,
        timezone('utc', now()),
        jsonb_build_object(
          'stage', 'regional',
          'cycle_number', v_approval.cycle_number,
          'reason', p_reason
        )
      );


      v_response := jsonb_build_object(
        'success', true,
        'operation', 'order.approval_decision',
        'order_id', p_order_id,
        'stage', 'regional',
        'decision', 'reject',
        'approval_id', v_approval.id,
        'approval_status', 'rejected',
        'reason', p_reason
      );

    END IF;


  -- ===========================================================================
  -- 13. SALES STAGE
  -- ===========================================================================

  ELSE

    -- -------------------------------------------------------------------------
    -- Regional approval must exist first.
    -- -------------------------------------------------------------------------

    IF NOT EXISTS (
      SELECT 1
      FROM public.order_approvals oa
      WHERE oa.company_id = v_company_id
        AND oa.order_id = p_order_id
        AND oa.approval_stage = 'regional'
        AND oa.cycle_number = v_approval.cycle_number
        AND oa.status = 'approved'
        AND oa.deleted_at IS NULL
    ) THEN

      RAISE EXCEPTION
        'Sales approval is not allowed before regional approval.';

    END IF;


    IF p_decision = 'approve' THEN

      -- -----------------------------------------------------------------------
      -- Sales approval
      -- -----------------------------------------------------------------------

      UPDATE public.order_approvals
      SET
        status = 'approved',
        acted_by = auth.uid(),
        acted_at = timezone('utc', now()),
        notes = p_notes,
        updated_at = timezone('utc', now())
      WHERE id = v_approval.id;


      -- -----------------------------------------------------------------------
      -- Final workflow approval
      -- -----------------------------------------------------------------------

      UPDATE public.orders
      SET
        approval_status = 'approved',
        fulfillment_status = 'ready',
        delivery_status = COALESCE(
          delivery_status,
          'not_started'
        ),
        updated_at = timezone('utc', now())
      WHERE id = p_order_id;


      -- -----------------------------------------------------------------------
      -- History
      -- -----------------------------------------------------------------------

      INSERT INTO public.order_status_history (
        company_id,
        order_id,
        status_type,
        old_status,
        new_status,
        changed_by,
        changed_at,
        reason,
        metadata
      )
      VALUES (
        v_company_id,
        p_order_id,
        'approval',
        'pending',
        'sales_approved',
        auth.uid(),
        timezone('utc', now()),
        p_reason,
        jsonb_build_object(
          'stage', 'sales',
          'cycle_number', v_approval.cycle_number
        )
      );


      -- -----------------------------------------------------------------------
      -- Event
      -- -----------------------------------------------------------------------

      INSERT INTO public.order_events (
        company_id,
        order_id,
        event_type,
        actor_user_id,
        actor_device_id,
        client_event_uuid,
        event_at,
        payload
      )
      VALUES (
        v_company_id,
        p_order_id,
        'sales_approved',
        auth.uid(),
        'V2-RPC',
        NULL,
        timezone('utc', now()),
        jsonb_build_object(
          'stage', 'sales',
          'cycle_number', v_approval.cycle_number,
          'fulfillment_status', 'ready'
        )
      );


      v_response := jsonb_build_object(
        'success', true,
        'operation', 'order.approval_decision',
        'order_id', p_order_id,
        'stage', 'sales',
        'decision', 'approve',
        'approval_id', v_approval.id,
        'approval_status', 'approved',
        'fulfillment_status', 'ready'
      );


    ELSE

      -- -----------------------------------------------------------------------
      -- Sales rejection
      -- -----------------------------------------------------------------------

      UPDATE public.order_approvals
      SET
        status = 'rejected',
        acted_by = auth.uid(),
        acted_at = timezone('utc', now()),
        rejection_reason = p_reason,
        notes = p_notes,
        updated_at = timezone('utc', now())
      WHERE id = v_approval.id;


      UPDATE public.orders
      SET
        approval_status = 'rejected',
        updated_at = timezone('utc', now())
      WHERE id = p_order_id;


      INSERT INTO public.order_status_history (
        company_id,
        order_id,
        status_type,
        old_status,
        new_status,
        changed_by,
        changed_at,
        reason,
        metadata
      )
      VALUES (
        v_company_id,
        p_order_id,
        'approval',
        'pending',
        'sales_rejected',
        auth.uid(),
        timezone('utc', now()),
        p_reason,
        jsonb_build_object(
          'stage', 'sales',
          'cycle_number', v_approval.cycle_number
        )
      );


      INSERT INTO public.order_events (
        company_id,
        order_id,
        event_type,
        actor_user_id,
        actor_device_id,
        client_event_uuid,
        event_at,
        payload
      )
      VALUES (
        v_company_id,
        p_order_id,
        'sales_rejected',
        auth.uid(),
        'V2-RPC',
        NULL,
        timezone('utc', now()),
        jsonb_build_object(
          'stage', 'sales',
          'cycle_number', v_approval.cycle_number,
          'reason', p_reason
        )
      );


      v_response := jsonb_build_object(
        'success', true,
        'operation', 'order.approval_decision',
        'order_id', p_order_id,
        'stage', 'sales',
        'decision', 'reject',
        'approval_id', v_approval.id,
        'approval_status', 'rejected',
        'reason', p_reason
      );

    END IF;

  END IF;


  -- ===========================================================================
  -- 14. Save idempotency result
  -- ===========================================================================

  UPDATE public.idempotency_keys
  SET
    result_entity_id = v_approval.id,
    response_status = 200,
    response_body = v_response,
    completed_at = timezone('utc', now())
  WHERE id = v_idempotency_id;


  RETURN v_response;

END;
$$;


-- =============================================================================
-- 9. FUNCTION PERMISSIONS
-- =============================================================================

REVOKE EXECUTE
ON FUNCTION public.v2_submit_order_for_approval(
  uuid,
  text,
  text
)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.v2_submit_order_for_approval(
  uuid,
  text,
  text
)
FROM anon;

GRANT EXECUTE
ON FUNCTION public.v2_submit_order_for_approval(
  uuid,
  text,
  text
)
TO authenticated;


REVOKE EXECUTE
ON FUNCTION public.v2_decide_order_approval(
  uuid,
  public.order_approval_stage,
  text,
  text,
  text,
  text
)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.v2_decide_order_approval(
  uuid,
  public.order_approval_stage,
  text,
  text,
  text,
  text
)
FROM anon;

GRANT EXECUTE
ON FUNCTION public.v2_decide_order_approval(
  uuid,
  public.order_approval_stage,
  text,
  text,
  text,
  text
)
TO authenticated;


-- =============================================================================
-- 10. COMMENTS
-- =============================================================================

COMMENT ON FUNCTION public.v2_user_is_approval_admin()
IS
  'Returns true for Super Admin or Company Admin approval override.';


COMMENT ON FUNCTION public.v2_user_can_approve_regional_order(
  uuid,
  uuid
)
IS
  'Checks whether the authenticated user may approve an order at regional stage.';


COMMENT ON FUNCTION public.v2_submit_order_for_approval(
  uuid,
  text,
  text
)
IS
  'Atomically submits an order to regional approval.';


COMMENT ON FUNCTION public.v2_decide_order_approval(
  uuid,
  public.order_approval_stage,
  text,
  text,
  text,
  text
)
IS
  'Atomically approves or rejects the regional or sales approval stage.';


COMMIT;
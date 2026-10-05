-- ============================================================================
-- Gypsum Sales CRM V2
-- Migration: 20261005000038_v2_canonical_permission_contract.sql
--
-- Purpose:
--   Batch 2-A.1: establish the canonical V2 permission vocabulary before RLS
--   hardening.
--
-- Canonical decisions:
--   Approval:
--     orders.regional_approve
--     orders.sales_approve
--
--   Company branding:
--     company.branding.manage
--
-- Safety / V1 protection:
--   - This is a V2-only additive migration.
--   - No V1 migration is edited, deleted, or rewritten.
--   - No shared V1 permission (including settings.write) is removed.
--   - Legacy V2 approval permissions are retired from active use only after
--     all V2 approval functions are recreated against the canonical names.
--   - No RLS hardening is performed in this migration.
--
-- Prerequisite:
--   20261005000037_v2_permission_catalog.sql must have been applied.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CANONICAL PERMISSIONS MUST EXIST
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.permissions
    WHERE slug = 'orders.regional_approve'
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION
      'V2 canonical permission orders.regional_approve is missing. Apply migration 20261005000037 first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.permissions
    WHERE slug = 'orders.sales_approve'
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION
      'V2 canonical permission orders.sales_approve is missing. Apply migration 20261005000037 first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.permissions
    WHERE slug = 'company.branding.manage'
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION
      'V2 canonical permission company.branding.manage is missing. Apply migration 20261005000037 first.';
  END IF;
END;
$$;

-- ============================================================================
-- 2. RETIRE LEGACY V2 APPROVAL PERMISSIONS
-- ============================================================================
-- These two permissions were introduced by V2 migration 00007. They are not
-- part of V1 and are no longer used by V2 runtime functions after this
-- migration. Soft-delete preserves historical references while preventing
-- accidental future assignment/use.

WITH legacy_permissions AS (
  SELECT id
  FROM public.permissions
  WHERE slug IN (
    'orders.approve_regional',
    'orders.approve_sales'
  )
  AND deleted_at IS NULL
)
UPDATE public.role_permissions rp
SET deleted_at = timezone('utc', now())
WHERE rp.permission_id IN (SELECT id FROM legacy_permissions)
  AND rp.deleted_at IS NULL;

UPDATE public.permissions
SET deleted_at = timezone('utc', now())
WHERE slug IN (
  'orders.approve_regional',
  'orders.approve_sales'
)
AND deleted_at IS NULL;

-- ============================================================================
-- 3. APPROVAL AUTHORIZATION CONTRACT
-- ============================================================================
-- Recreate the V2 authorization functions using the canonical approval names.
-- No V1 function is changed.

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
    'reject',
    'return'
  ) THEN

    RAISE EXCEPTION
      'Invalid approval decision. Allowed values: approve, reject, return.';

  END IF;


  -- ===========================================================================
  -- 4. Validate reason
  -- ===========================================================================

  IF p_decision IN ('reject', 'return')
     AND (
       p_reason IS NULL
       OR btrim(p_reason) = ''
     ) THEN

    RAISE EXCEPTION
      'A reason is required for reject or return decisions.';

  END IF;


  -- ===========================================================================
  -- 5. Permission
  -- ===========================================================================

  IF p_stage = 'regional' THEN

    IF NOT public.auth_user_has_permission(
      'orders.regional_approve'
    ) THEN

      RAISE EXCEPTION
        'User does not have regional approval permission.';

    END IF;

  ELSE

    IF NOT public.auth_user_has_permission(
      'orders.sales_approve'
    ) THEN

      RAISE EXCEPTION
        'User does not have sales approval permission.';

    END IF;

  END IF;


  -- ===========================================================================
  -- 6. Idempotency key
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
  -- 7. Request fingerprint
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
  -- 8. Claim idempotency
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
  -- 9. Existing operation / retry
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
  -- 10. Lock the order
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
  -- 11. Regional scope
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
  -- 12. Find pending approval
  -- ===========================================================================

  SELECT
    oa.id,
    oa.company_id,
    oa.order_id,
    oa.approval_stage,
    oa.cycle_number,
    oa.status,
    oa.acted_by,
    oa.acted_at,
    oa.rejection_reason,
    oa.return_reason,
    oa.notes
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
  -- 13. REGIONAL STAGE
  -- ===========================================================================

  IF p_stage = 'regional' THEN

    -- -------------------------------------------------------------------------
    -- Regional approval
    -- -------------------------------------------------------------------------

    IF p_decision = 'approve' THEN

      UPDATE public.order_approvals
      SET
        status = 'approved',
        acted_by = auth.uid(),
        acted_at = timezone('utc', now()),
        rejection_reason = NULL,
        return_reason = NULL,
        notes = p_notes,
        updated_at = timezone('utc', now())
      WHERE id = v_approval.id;


      INSERT INTO public.order_approvals (
        company_id,
        order_id,
        approval_stage,
        cycle_number,
        status,
        acted_by,
        acted_at,
        rejection_reason,
        return_reason,
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


    -- -------------------------------------------------------------------------
    -- Regional rejection
    -- -------------------------------------------------------------------------

    ELSIF p_decision = 'reject' THEN

      UPDATE public.order_approvals
      SET
        status = 'rejected',
        acted_by = auth.uid(),
        acted_at = timezone('utc', now()),
        rejection_reason = p_reason,
        return_reason = NULL,
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


    -- -------------------------------------------------------------------------
    -- Regional return
    -- -------------------------------------------------------------------------

    ELSE

      UPDATE public.order_approvals
      SET
        status = 'returned',
        acted_by = auth.uid(),
        acted_at = timezone('utc', now()),
        rejection_reason = NULL,
        return_reason = p_reason,
        notes = p_notes,
        updated_at = timezone('utc', now())
      WHERE id = v_approval.id;


      UPDATE public.orders
      SET
        approval_status = 'returned',
        fulfillment_status = 'not_ready',
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
        'regional_returned',
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
        'regional_returned',
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
        'decision', 'return',
        'approval_id', v_approval.id,
        'approval_status', 'returned',
        'reason', p_reason
      );

    END IF;


  -- ===========================================================================
  -- 14. SALES STAGE
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


    -- -------------------------------------------------------------------------
    -- Sales approval
    -- -------------------------------------------------------------------------

    IF p_decision = 'approve' THEN

      UPDATE public.order_approvals
      SET
        status = 'approved',
        acted_by = auth.uid(),
        acted_at = timezone('utc', now()),
        rejection_reason = NULL,
        return_reason = NULL,
        notes = p_notes,
        updated_at = timezone('utc', now())
      WHERE id = v_approval.id;


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


    -- -------------------------------------------------------------------------
    -- Sales rejection
    -- -------------------------------------------------------------------------

    ELSIF p_decision = 'reject' THEN

      UPDATE public.order_approvals
      SET
        status = 'rejected',
        acted_by = auth.uid(),
        acted_at = timezone('utc', now()),
        rejection_reason = p_reason,
        return_reason = NULL,
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


    -- -------------------------------------------------------------------------
    -- Sales return
    -- -------------------------------------------------------------------------

    ELSE

      UPDATE public.order_approvals
      SET
        status = 'returned',
        acted_by = auth.uid(),
        acted_at = timezone('utc', now()),
        rejection_reason = NULL,
        return_reason = p_reason,
        notes = p_notes,
        updated_at = timezone('utc', now())
      WHERE id = v_approval.id;


      UPDATE public.orders
      SET
        approval_status = 'returned',
        fulfillment_status = 'not_ready',
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
        'sales_returned',
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
        'sales_returned',
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
        'decision', 'return',
        'approval_id', v_approval.id,
        'approval_status', 'returned',
        'reason', p_reason
      );

    END IF;

  END IF;


  -- ===========================================================================
  -- 15. Save idempotency result
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



-- ============================================================================
-- 4. COMPANY BRANDING AUTHORIZATION CONTRACT
-- ============================================================================
-- Recreate the V2 branding RPC using company.branding.manage.
-- settings.write remains intact for V1 and generic settings operations.

CREATE OR REPLACE FUNCTION public.v2_update_company_branding(
  p_display_name text DEFAULT NULL,
  p_logo_path text DEFAULT NULL,
  p_clear_logo boolean DEFAULT false,
  p_primary_color text DEFAULT NULL,
  p_secondary_color text DEFAULT NULL
)
RETURNS public.company_branding
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_company_id uuid;
  v_existing public.company_branding%ROWTYPE;
  v_display_name text;
  v_primary_color text;
  v_secondary_color text;
BEGIN
  v_company_id := public.auth_user_company_id();

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'شرکت کاربر مشخص نشده است.';
  END IF;

  IF NOT (
    public.auth_user_is_admin()
    OR public.auth_user_has_permission('company.branding.manage')
  ) THEN
    RAISE EXCEPTION 'دسترسی مدیریت هویت بصری شرکت را ندارید.';
  END IF;

  SELECT *
  INTO v_existing
  FROM public.company_branding
  WHERE company_id = v_company_id
  FOR UPDATE;

  IF p_display_name IS NOT NULL THEN
    v_display_name := btrim(p_display_name);
    IF v_display_name = '' THEN
      RAISE EXCEPTION 'نام نمایشی شرکت نمی‌تواند خالی باشد.';
    END IF;

    IF char_length(v_display_name) > 160 THEN
      RAISE EXCEPTION 'نام نمایشی شرکت بیش از حد طولانی است.';
    END IF;
  ELSE
    v_display_name := COALESCE(
      v_existing.display_name,
      (
        SELECT c.name
        FROM public.companies AS c
        WHERE c.id = v_company_id
      )
    );
  END IF;

  IF p_logo_path IS NOT NULL THEN
    IF p_logo_path <> v_company_id::text || '/logo' THEN
      RAISE EXCEPTION 'مسیر لوگوی شرکت نامعتبر است.';
    END IF;
  END IF;

  IF p_clear_logo THEN
    p_logo_path := NULL;
  END IF;

  IF p_primary_color IS NOT NULL THEN
    v_primary_color := btrim(p_primary_color);
    IF v_primary_color !~ '^#[0-9A-Fa-f]{6}$' THEN
      RAISE EXCEPTION 'رنگ اصلی باید در قالب HEX شش‌رقمی باشد.';
    END IF;
  ELSE
    v_primary_color := v_existing.primary_color;
  END IF;

  IF p_secondary_color IS NOT NULL THEN
    v_secondary_color := btrim(p_secondary_color);
    IF v_secondary_color !~ '^#[0-9A-Fa-f]{6}$' THEN
      RAISE EXCEPTION 'رنگ ثانویه باید در قالب HEX شش‌رقمی باشد.';
    END IF;
  ELSE
    v_secondary_color := v_existing.secondary_color;
  END IF;

  INSERT INTO public.company_branding (
    company_id,
    display_name,
    logo_path,
    primary_color,
    secondary_color
  )
  VALUES (
    v_company_id,
    v_display_name,
    CASE
      WHEN p_clear_logo THEN NULL
      WHEN p_logo_path IS NOT NULL THEN p_logo_path
      ELSE COALESCE(v_existing.logo_path, NULL)
    END,
    v_primary_color,
    v_secondary_color
  )
  ON CONFLICT (company_id)
  DO UPDATE SET
    display_name = EXCLUDED.display_name,
    logo_path = EXCLUDED.logo_path,
    primary_color = EXCLUDED.primary_color,
    secondary_color = EXCLUDED.secondary_color,
    updated_at = timezone('utc', now())
  RETURNING *
  INTO v_existing;

  RETURN v_existing;
END;
$function$;


-- ============================================================
-- 4. STORAGE POLICIES: canonical branding permission
-- ============================================================

DROP POLICY IF EXISTS company_branding_storage_select
  ON storage.objects;

CREATE POLICY company_branding_storage_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'company-branding'
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_permission('company.branding.manage')
    )
    AND (storage.foldername(name))[1] = public.auth_user_company_id()::text
    AND name = public.auth_user_company_id()::text || '/logo'
  );

DROP POLICY IF EXISTS company_branding_storage_insert
  ON storage.objects;

CREATE POLICY company_branding_storage_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-branding'
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_permission('company.branding.manage')
    )
    AND (storage.foldername(name))[1] = public.auth_user_company_id()::text
    AND name = public.auth_user_company_id()::text || '/logo'
  );

DROP POLICY IF EXISTS company_branding_storage_update
  ON storage.objects;

CREATE POLICY company_branding_storage_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-branding'
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_permission('company.branding.manage')
    )
    AND (storage.foldername(name))[1] = public.auth_user_company_id()::text
    AND name = public.auth_user_company_id()::text || '/logo'
  )
  WITH CHECK (
    bucket_id = 'company-branding'
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_permission('company.branding.manage')
    )
    AND (storage.foldername(name))[1] = public.auth_user_company_id()::text
    AND name = public.auth_user_company_id()::text || '/logo'
  );

DROP POLICY IF EXISTS company_branding_storage_delete
  ON storage.objects;

CREATE POLICY company_branding_storage_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-branding'
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_permission('company.branding.manage')
    )
    AND (storage.foldername(name))[1] = public.auth_user_company_id()::text
    AND name = public.auth_user_company_id()::text || '/logo'
  );

-- ============================================================================
-- 5. FUNCTION ACCESS
-- ============================================================================
-- Preserve the existing V2 security posture: these are callable only through
-- authenticated users; internal helpers are not exposed as a public API.

REVOKE ALL
ON FUNCTION public.v2_user_can_approve_regional_order(uuid, uuid)
FROM PUBLIC, anon;
GRANT EXECUTE
ON FUNCTION public.v2_user_can_approve_regional_order(uuid, uuid)
TO authenticated;

REVOKE ALL
ON FUNCTION public.v2_decide_order_approval(
  uuid,
  public.order_approval_stage,
  text,
  text,
  text,
  text
)
FROM PUBLIC, anon;
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

REVOKE ALL
ON FUNCTION public.v2_update_company_branding(
  text,
  text,
  boolean,
  text,
  text
)
FROM PUBLIC, anon;
GRANT EXECUTE
ON FUNCTION public.v2_update_company_branding(
  text,
  text,
  boolean,
  text,
  text
)
TO authenticated;

COMMIT;

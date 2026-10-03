-- =============================================================================
-- Gypsum Sales CRM V2
-- Migration: 20261003000009_v2_order_approval_return.sql
--
-- Purpose:
--   1. Add a dedicated return_reason field to order approvals.
--   2. Extend approval decisions with "return".
--   3. Preserve approve/reject behavior.
--   4. Record return in approval history and event timeline.
--   5. Allow returned orders to re-enter the workflow in a new cycle
--      through the existing submit_for_approval RPC.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. RETURN REASON
-- =============================================================================

ALTER TABLE public.order_approvals
  ADD COLUMN IF NOT EXISTS return_reason text;

COMMENT ON COLUMN public.order_approvals.return_reason IS
  'Reason provided when an approval stage returns an order for correction.';


-- =============================================================================
-- 2. REPLACE APPROVAL DECISION RPC
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


-- =============================================================================
-- 3. EXECUTE PERMISSION
-- =============================================================================

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
-- 4. COMMENT
-- =============================================================================

COMMENT ON FUNCTION public.v2_decide_order_approval(
  uuid,
  public.order_approval_stage,
  text,
  text,
  text,
  text
)
IS
  'Atomically approves, rejects, or returns the regional or sales approval stage.';


COMMIT;
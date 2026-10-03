-- =============================================================================
-- Gypsum Sales CRM V2
-- Migration: 20261003000005_v2_idempotency.sql
--
-- Purpose:
--   1. Create the idempotency key store.
--   2. Protect the store from direct client access.
--   3. Add an idempotent shipment-item allocation RPC.
--   4. Make retries / double-clicks return the original result.
--   5. Reject reuse of the same idempotency key with a different payload.
--
-- Important:
--   - Existing V1 data is untouched.
--   - Existing 4-argument allocation RPC is kept for internal use.
--   - Authenticated clients will use the new 5-argument RPC.
-- =============================================================================

BEGIN;


-- =============================================================================
-- 1. IDEMPOTENCY KEYS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id uuid NOT NULL
    REFERENCES public.companies(id)
    ON DELETE RESTRICT,

  idempotency_key text NOT NULL,

  operation_type text NOT NULL,

  request_hash text NOT NULL,

  result_entity_id uuid,

  response_status integer,

  response_body jsonb,

  created_by uuid
    REFERENCES public.users(id)
    ON DELETE RESTRICT,

  created_at timestamptz NOT NULL
    DEFAULT timezone('utc', now()),

  completed_at timestamptz,

  CONSTRAINT idempotency_key_not_empty
    CHECK (btrim(idempotency_key) <> ''),

  CONSTRAINT idempotency_operation_not_empty
    CHECK (btrim(operation_type) <> ''),

  CONSTRAINT idempotency_request_hash_not_empty
    CHECK (btrim(request_hash) <> '')
);


-- =============================================================================
-- 2. UNIQUE IDEMPOTENCY KEY
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_idempotency_keys_company_key
  ON public.idempotency_keys (
    company_id,
    idempotency_key
  );


-- =============================================================================
-- 3. OPERATION LOOKUP INDEX
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_company_operation
  ON public.idempotency_keys (
    company_id,
    operation_type,
    created_at DESC
  );


-- =============================================================================
-- 4. RESULT LOOKUP INDEX
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_result_entity
  ON public.idempotency_keys (
    company_id,
    result_entity_id
  )
  WHERE result_entity_id IS NOT NULL;


-- =============================================================================
-- 5. SECURITY
--
-- Clients must NOT read or write idempotency records directly.
-- Only trusted SECURITY DEFINER functions manage them.
-- =============================================================================

ALTER TABLE public.idempotency_keys
  ENABLE ROW LEVEL SECURITY;


REVOKE ALL
ON public.idempotency_keys
FROM PUBLIC;


REVOKE ALL
ON public.idempotency_keys
FROM anon;


REVOKE ALL
ON public.idempotency_keys
FROM authenticated;


-- =============================================================================
-- 6. IDEMPOTENT ALLOCATION RPC
--
-- Operation:
--   shipment_item.allocate
--
-- The same:
--
--   company_id
--   idempotency_key
--   request_hash
--
-- must always represent the same operation.
--
-- First request:
--
--   create idempotency row
--   execute allocation
--   store result
--
-- Retry:
--
--   unique key already exists
--   lock existing idempotency row
--   validate request hash
--   return original shipment_item
--
-- Reusing a key with a different request:
--
--   REJECT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.v2_allocate_shipment_item_idempotent(
  p_shipment_id uuid,
  p_order_item_id uuid,
  p_quantity integer,
  p_client_uuid uuid,
  p_idempotency_key text
)
RETURNS public.shipment_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE

  v_company_id uuid;

  v_request_hash text;

  v_idempotency_id uuid;

  v_existing_key public.idempotency_keys;

  v_result public.shipment_items;

BEGIN

  -- ===========================================================================
  -- 1. Validate authenticated company
  -- ===========================================================================

  v_company_id := public.auth_user_company_id();

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION
      'Authenticated user does not belong to a company.';
  END IF;


  -- ===========================================================================
  -- 2. Validate idempotency key
  -- ===========================================================================

  IF p_idempotency_key IS NULL
     OR btrim(p_idempotency_key) = '' THEN

    RAISE EXCEPTION
      'Idempotency key is required.';

  END IF;


  IF length(p_idempotency_key) > 200 THEN

    RAISE EXCEPTION
      'Idempotency key exceeds the maximum allowed length of 200 characters.';

  END IF;


  -- ===========================================================================
  -- 3. Build deterministic request hash
  --
  -- md5 is used here only as a compact request fingerprint.
  -- It is NOT being used for password/security hashing.
  -- ===========================================================================

  v_request_hash := md5(
    jsonb_build_object(
      'operation_type', 'shipment_item.allocate',
      'shipment_id', p_shipment_id,
      'order_item_id', p_order_item_id,
      'quantity', p_quantity,
      'client_uuid', p_client_uuid
    )::text
  );


  -- ===========================================================================
  -- 4. Try to register this idempotency operation.
  --
  -- The unique index makes simultaneous identical keys converge on one row.
  -- ON CONFLICT DO NOTHING allows the second transaction to wait on the
  -- uniqueness check and then continue as a replay.
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
    'shipment_item.allocate',
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
  -- 5. NEW OPERATION
  -- ===========================================================================

  IF v_idempotency_id IS NOT NULL THEN

    -- -------------------------------------------------------------------------
    -- Execute the existing atomic allocation operation.
    --
    -- The inner function is transactional with this function.
    -- If it fails, the idempotency row is rolled back as well.
    -- -------------------------------------------------------------------------

    SELECT *
    INTO v_result
    FROM public.v2_allocate_shipment_item(
      p_shipment_id,
      p_order_item_id,
      p_quantity,
      p_client_uuid
    );


    -- -------------------------------------------------------------------------
    -- Store the original successful result.
    -- -------------------------------------------------------------------------

    UPDATE public.idempotency_keys
    SET
      result_entity_id = v_result.id,
      response_status = 200,
      response_body = to_jsonb(v_result),
      completed_at = timezone('utc', now())
    WHERE id = v_idempotency_id;


    RETURN v_result;

  END IF;


  -- ===========================================================================
  -- 6. REPLAY / RETRY
  --
  -- A row already exists for this company + idempotency key.
  --
  -- Lock it so only one transaction can inspect/update it at a time.
  -- ===========================================================================

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


  -- ===========================================================================
  -- 7. OPERATION TYPE MUST MATCH
  -- ===========================================================================

  IF v_existing_key.operation_type <>
     'shipment_item.allocate' THEN

    RAISE EXCEPTION
      'Idempotency key is already used for another operation type.';

  END IF;


  -- ===========================================================================
  -- 8. REQUEST HASH MUST MATCH
  --
  -- Same key + different payload is an error.
  -- ===========================================================================

  IF v_existing_key.request_hash <>
     v_request_hash THEN

    RAISE EXCEPTION
      'Idempotency key has already been used with a different request payload.';

  END IF;


  -- ===========================================================================
  -- 9. COMPLETED OPERATION
  -- ===========================================================================

  IF v_existing_key.completed_at IS NULL
     OR v_existing_key.result_entity_id IS NULL
     OR v_existing_key.response_body IS NULL THEN

    RAISE EXCEPTION
      'Idempotent operation exists but has no completed result.';

  END IF;


  -- ===========================================================================
  -- 10. RETURN ORIGINAL RESULT
  -- ===========================================================================

  SELECT *
  INTO v_result
  FROM public.shipment_items
  WHERE id = v_existing_key.result_entity_id;


  IF NOT FOUND THEN

    RAISE EXCEPTION
      'Original idempotent result entity no longer exists: %.',
      v_existing_key.result_entity_id;

  END IF;


  RETURN v_result;

END;
$$;


-- =============================================================================
-- 7. FUNCTION SECURITY
-- =============================================================================

REVOKE EXECUTE
ON FUNCTION public.v2_allocate_shipment_item_idempotent(
  uuid,
  uuid,
  integer,
  uuid,
  text
)
FROM PUBLIC;


REVOKE EXECUTE
ON FUNCTION public.v2_allocate_shipment_item_idempotent(
  uuid,
  uuid,
  integer,
  uuid,
  text
)
FROM anon;


GRANT EXECUTE
ON FUNCTION public.v2_allocate_shipment_item_idempotent(
  uuid,
  uuid,
  integer,
  uuid,
  text
)
TO authenticated;


-- =============================================================================
-- 8. REMOVE DIRECT CLIENT ACCESS TO THE NON-IDEMPOTENT RPC
--
-- The old 4-argument function remains available internally to trusted
-- database functions, but authenticated clients should no longer call it.
-- =============================================================================

REVOKE EXECUTE
ON FUNCTION public.v2_allocate_shipment_item(
  uuid,
  uuid,
  integer,
  uuid
)
FROM PUBLIC;


REVOKE EXECUTE
ON FUNCTION public.v2_allocate_shipment_item(
  uuid,
  uuid,
  integer,
  uuid
)
FROM anon;


REVOKE EXECUTE
ON FUNCTION public.v2_allocate_shipment_item(
  uuid,
  uuid,
  integer,
  uuid
)
FROM authenticated;


-- =============================================================================
-- 9. COMMENTS
-- =============================================================================

COMMENT ON TABLE public.idempotency_keys IS
  'V2 idempotency store for safely retrying sensitive business operations.';


COMMENT ON COLUMN public.idempotency_keys.idempotency_key IS
  'Client-generated unique key representing one logical operation.';


COMMENT ON COLUMN public.idempotency_keys.request_hash IS
  'Deterministic fingerprint used to detect reuse of a key with a different payload.';


COMMENT ON COLUMN public.idempotency_keys.result_entity_id IS
  'Entity created by the successful idempotent operation.';


COMMENT ON FUNCTION public.v2_allocate_shipment_item_idempotent(
  uuid,
  uuid,
  integer,
  uuid,
  text
) IS
  'Idempotently allocates an order-item quantity to a shipment and returns the original result on retry.';


COMMIT;
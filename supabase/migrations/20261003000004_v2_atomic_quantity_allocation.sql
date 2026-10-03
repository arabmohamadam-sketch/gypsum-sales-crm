-- =============================================================================
-- Gypsum Sales CRM V2
-- Migration: 20261003000004_v2_atomic_quantity_allocation.sql
--
-- Purpose:
--   Replace the previous aggregate-based allocation guard with an atomic
--   counter-based allocation mechanism.
--
-- Why:
--   Concurrent allocation checks must not rely on a SUM() snapshot taken
--   before another transaction commits.
--
-- Strategy:
--   1. Add allocated_quantity to order_items.
--   2. Backfill it from existing active shipment_items.
--   3. Verify no existing over-allocation exists.
--   4. Remove the previous allocation trigger.
--   5. Create an atomic RPC function.
--   6. Revoke direct INSERT/UPDATE/DELETE on shipment_items from clients.
--   7. Only the RPC can create a shipment allocation.
--
-- V1 waybill logic remains untouched.
-- =============================================================================

BEGIN;


-- =============================================================================
-- 1. ADD ALLOCATED QUANTITY TO ORDER ITEMS
-- =============================================================================

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS allocated_quantity integer NOT NULL DEFAULT 0;


-- =============================================================================
-- 2. VALIDATE NON-NEGATIVE ALLOCATION
-- =============================================================================

DO $$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'order_items_allocated_quantity_nonnegative'
      AND conrelid = 'public.order_items'::regclass
  ) THEN

    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_allocated_quantity_nonnegative
      CHECK (allocated_quantity >= 0);

  END IF;

END
$$;


-- =============================================================================
-- 3. BACKFILL ALLOCATED QUANTITY
--
-- Existing active V2 shipment allocations are counted.
--
-- Cancelled shipments and soft-deleted shipment items do not consume
-- allocation.
-- =============================================================================

UPDATE public.order_items oi
SET allocated_quantity = COALESCE(
  (
    SELECT SUM(si.quantity)::integer
    FROM public.shipment_items si
    INNER JOIN public.shipments s
      ON s.id = si.shipment_id
    WHERE si.order_item_id = oi.id
      AND si.deleted_at IS NULL
      AND s.deleted_at IS NULL
      AND s.status <> 'cancelled'
  ),
  0
);


-- =============================================================================
-- 4. SAFETY CHECK
--
-- Migration must fail if existing data already contains over-allocation.
-- =============================================================================

DO $$
DECLARE
  v_invalid_count integer;
BEGIN

  SELECT COUNT(*)
  INTO v_invalid_count
  FROM public.order_items
  WHERE allocated_quantity > quantity;

  IF v_invalid_count > 0 THEN

    RAISE EXCEPTION
      'Migration aborted: % order_items already have allocated_quantity greater than ordered quantity.',
      v_invalid_count;

  END IF;

END
$$;


-- =============================================================================
-- 5. INDEX FOR ALLOCATION LOOKUPS
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_order_items_allocation
  ON public.order_items (
    company_id,
    id,
    quantity,
    allocated_quantity
  )
  WHERE deleted_at IS NULL;


-- =============================================================================
-- 6. REMOVE PREVIOUS AGGREGATE-BASED ALLOCATION TRIGGER
-- =============================================================================

DROP TRIGGER IF EXISTS trg_v2_enforce_shipment_item_allocation
ON public.shipment_items;


-- =============================================================================
-- 7. REMOVE PREVIOUS FUNCTION
-- =============================================================================

DROP FUNCTION IF EXISTS
  public.v2_enforce_shipment_item_allocation();


-- =============================================================================
-- 8. UPDATE ALLOCATED QUANTITY HELPER
--
-- The order_items counter is now the source used for allocation state.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.v2_get_order_item_allocated_quantity(
  p_order_item_id uuid
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    oi.allocated_quantity::bigint,
    0::bigint
  )
  FROM public.order_items oi
  WHERE oi.id = p_order_item_id;
$$;


-- =============================================================================
-- 9. UPDATE REMAINING QUANTITY HELPER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.v2_get_order_item_remaining_quantity(
  p_order_item_id uuid
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT GREATEST(
    oi.quantity::bigint
    -
    oi.allocated_quantity::bigint,
    0::bigint
  )
  FROM public.order_items oi
  WHERE oi.id = p_order_item_id;
$$;


-- =============================================================================
-- 10. ATOMIC SHIPMENT ITEM ALLOCATION RPC
--
-- This is now the ONLY supported path for creating shipment allocations.
--
-- Critical operation:
--
--   UPDATE order_items
--   SET allocated_quantity = allocated_quantity + p_quantity
--   WHERE allocated_quantity + p_quantity <= quantity
--
-- PostgreSQL obtains the row lock as part of UPDATE.
--
-- If another transaction changes allocated_quantity first, the second
-- transaction waits and then reevaluates the condition against the updated row.
--
-- Therefore:
--
--   Ordered = 720 bags
--
--   User A -> 400
--   User B -> 400 simultaneously
--
-- only one operation can consume the final available quantity.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.v2_allocate_shipment_item(
  p_shipment_id uuid,
  p_order_item_id uuid,
  p_quantity integer,
  p_client_uuid uuid DEFAULT NULL
)
RETURNS public.shipment_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE

  v_company_id uuid;

  v_shipment_company_id uuid;
  v_shipment_order_id uuid;
  v_shipment_status public.shipment_status;
  v_shipment_deleted_at timestamptz;

  v_order_item_order_id uuid;
  v_order_item_company_id uuid;
  v_order_item_product_id uuid;
  v_order_item_quantity integer;
  v_order_item_allocated_quantity integer;
  v_order_item_weight smallint;
  v_order_item_is_gift boolean;
  v_gift_approved_by uuid;
  v_gift_approved_at timestamptz;

  v_product_name text;

  v_updated_order_item_id uuid;

  v_created_item public.shipment_items;

BEGIN

  -- ===========================================================================
  -- 1. Validate caller company
  -- ===========================================================================

  v_company_id := public.auth_user_company_id();

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION
      'Authenticated user does not belong to a company.';
  END IF;


  -- ===========================================================================
  -- 2. Validate requested quantity
  -- ===========================================================================

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION
      'Allocation quantity must be greater than zero.';
  END IF;


  -- ===========================================================================
  -- 3. Load shipment
  -- ===========================================================================

  SELECT
    s.company_id,
    s.order_id,
    s.status,
    s.deleted_at
  INTO
    v_shipment_company_id,
    v_shipment_order_id,
    v_shipment_status,
    v_shipment_deleted_at
  FROM public.shipments s
  WHERE s.id = p_shipment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Shipment not found: %',
      p_shipment_id;
  END IF;


  IF v_shipment_company_id <> v_company_id THEN
    RAISE EXCEPTION
      'Shipment does not belong to the authenticated user company.';
  END IF;


  IF v_shipment_deleted_at IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot allocate to a deleted shipment.';
  END IF;


  IF v_shipment_status = 'cancelled' THEN
    RAISE EXCEPTION
      'Cannot allocate to a cancelled shipment.';
  END IF;


  -- ===========================================================================
  -- 4. Atomically reserve quantity
  --
  -- This UPDATE is the concurrency control mechanism.
  -- ===========================================================================

  UPDATE public.order_items oi
  SET
    allocated_quantity =
      oi.allocated_quantity + p_quantity,

    updated_at =
      timezone('utc', now()),

    sync_version =
      oi.sync_version + 1

  WHERE oi.id = p_order_item_id
    AND oi.company_id = v_company_id
    AND oi.deleted_at IS NULL
    AND (
      oi.allocated_quantity + p_quantity
    ) <= oi.quantity

  RETURNING
    oi.id,
    oi.company_id,
    oi.order_id,
    oi.product_id,
    oi.quantity,
    oi.allocated_quantity,
    oi.weight_kg_snapshot,
    oi.is_gift,
    oi.gift_approved_by,
    oi.gift_approved_at
  INTO
    v_updated_order_item_id,
    v_order_item_company_id,
    v_order_item_order_id,
    v_order_item_product_id,
    v_order_item_quantity,
    v_order_item_allocated_quantity,
    v_order_item_weight,
    v_order_item_is_gift,
    v_gift_approved_by,
    v_gift_approved_at;


  -- ===========================================================================
  -- 5. Allocation rejected
  -- ===========================================================================

  IF NOT FOUND THEN

    SELECT
      oi.company_id,
      oi.order_id,
      oi.product_id,
      oi.quantity,
      oi.allocated_quantity,
      oi.weight_kg_snapshot,
      oi.is_gift,
      oi.gift_approved_by,
      oi.gift_approved_at
    INTO
      v_order_item_company_id,
      v_order_item_order_id,
      v_order_item_product_id,
      v_order_item_quantity,
      v_order_item_allocated_quantity,
      v_order_item_weight,
      v_order_item_is_gift,
      v_gift_approved_by,
      v_gift_approved_at
    FROM public.order_items oi
    WHERE oi.id = p_order_item_id;


    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Order item not found: %',
        p_order_item_id;
    END IF;


    IF v_order_item_company_id <> v_company_id THEN
      RAISE EXCEPTION
        'Order item does not belong to the authenticated user company.';
    END IF;


    RAISE EXCEPTION
      'Insufficient remaining quantity. Ordered: %, already allocated: %, requested: %, remaining: %.',
      v_order_item_quantity,
      v_order_item_allocated_quantity,
      p_quantity,
      GREATEST(
        v_order_item_quantity - v_order_item_allocated_quantity,
        0
      );

  END IF;


  -- ===========================================================================
  -- 6. Order relationship validation
  -- ===========================================================================

  IF v_order_item_order_id <> v_shipment_order_id THEN
    RAISE EXCEPTION
      'Order item % does not belong to shipment order %.',
      p_order_item_id,
      v_shipment_order_id;
  END IF;


  -- ===========================================================================
  -- 7. Gift validation
  -- ===========================================================================

  IF v_order_item_is_gift = true THEN

    IF v_gift_approved_by IS NULL
       OR v_gift_approved_at IS NULL THEN

      RAISE EXCEPTION
        'Gift order item must be approved before allocation.';

    END IF;

  END IF;


  -- ===========================================================================
  -- 8. Product snapshot
  -- ===========================================================================

  SELECT p.name
  INTO v_product_name
  FROM public.products p
  WHERE p.id = v_order_item_product_id;

  IF v_product_name IS NULL THEN
    RAISE EXCEPTION
      'Product not found: %',
      v_order_item_product_id;
  END IF;


  -- ===========================================================================
  -- 9. Create shipment item
  --
  -- If this INSERT fails for any reason, the previous UPDATE is rolled back
  -- automatically because the entire RPC executes inside one transaction.
  -- ===========================================================================

  INSERT INTO public.shipment_items (
    company_id,
    shipment_id,
    order_item_id,
    product_id,
    product_name_snapshot,
    quantity,
    weight_kg_snapshot,
    is_gift,
    client_uuid,
    sync_version,
    last_synced_at
  )
  VALUES (
    v_company_id,
    p_shipment_id,
    p_order_item_id,
    v_order_item_product_id,
    v_product_name,
    p_quantity,
    v_order_item_weight,
    v_order_item_is_gift,
    p_client_uuid,
    1,
    timezone('utc', now())
  )
  RETURNING *
  INTO v_created_item;


  RETURN v_created_item;

END;
$$;


-- =============================================================================
-- 11. CLIENT PERMISSIONS
--
-- Direct shipment_item mutations are prohibited.
-- Application code must call the RPC instead.
-- =============================================================================

REVOKE INSERT, UPDATE, DELETE
ON public.shipment_items
FROM authenticated;


GRANT SELECT
ON public.shipment_items
TO authenticated;


GRANT EXECUTE
ON FUNCTION public.v2_allocate_shipment_item(
  uuid,
  uuid,
  integer,
  uuid
)
TO authenticated;


-- =============================================================================
-- 12. FUNCTION EXECUTE SECURITY
-- =============================================================================

REVOKE EXECUTE
ON FUNCTION public.v2_get_order_item_allocated_quantity(uuid)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.v2_get_order_item_remaining_quantity(uuid)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.v2_get_order_item_allocated_quantity(uuid)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.v2_get_order_item_remaining_quantity(uuid)
TO authenticated;


-- =============================================================================
-- 13. COMMENTS
-- =============================================================================

COMMENT ON COLUMN public.order_items.allocated_quantity IS
  'Atomically reserved quantity across active V2 shipment allocations.';


COMMENT ON FUNCTION public.v2_allocate_shipment_item(
  uuid,
  uuid,
  integer,
  uuid
) IS
  'Atomically allocates quantity from an order item into a shipment.';


COMMENT ON FUNCTION public.v2_get_order_item_allocated_quantity(uuid) IS
  'Returns the current atomic allocated quantity counter.';


COMMENT ON FUNCTION public.v2_get_order_item_remaining_quantity(uuid) IS
  'Returns the remaining quantity available for allocation.';


COMMIT;
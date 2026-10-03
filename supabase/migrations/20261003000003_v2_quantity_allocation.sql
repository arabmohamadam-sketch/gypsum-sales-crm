-- =============================================================================
-- Gypsum Sales CRM V2
-- Migration: 20261003000003_v2_quantity_allocation.sql
--
-- Purpose:
--   1. Add gift metadata to order_items
--   2. Add offline/sync metadata to order_items
--   3. Enforce shipment allocation limits
--   4. Prevent concurrent over-allocation with PostgreSQL row locking
--   5. Validate gift approval before allocation
--   6. Keep V1 waybill logic untouched
--
-- IMPORTANT:
--   - This migration does NOT modify V1 waybill numbering.
--   - This migration does NOT remove the V1 waybill-item restriction.
--   - Hard deletes remain disabled by the existing V1 architecture.
-- =============================================================================

BEGIN;


-- =============================================================================
-- 1. GIFT FIELDS
-- =============================================================================

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS is_gift boolean NOT NULL DEFAULT false;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS gift_reason text;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS gift_note text;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS gift_approved_by uuid;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS gift_approved_at timestamptz;


-- =============================================================================
-- 2. OFFLINE / SYNC FIELDS
-- =============================================================================

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS client_uuid uuid;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS sync_version integer NOT NULL DEFAULT 1;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;


-- =============================================================================
-- 3. GIFT REASON VALIDATION
-- =============================================================================

DO $$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'order_items_gift_reason_check'
      AND conrelid = 'public.order_items'::regclass
  ) THEN

    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_gift_reason_check
      CHECK (
        is_gift = false
        OR (
          gift_reason IS NOT NULL
          AND btrim(gift_reason) <> ''
        )
      );

  END IF;

END
$$;


-- =============================================================================
-- 4. GIFT APPROVAL CONSISTENCY
-- =============================================================================

DO $$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'order_items_gift_approval_check'
      AND conrelid = 'public.order_items'::regclass
  ) THEN

    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_gift_approval_check
      CHECK (
        (
          is_gift = false
          AND gift_approved_by IS NULL
          AND gift_approved_at IS NULL
        )
        OR
        (
          is_gift = true
          AND (
            (
              gift_approved_by IS NULL
              AND gift_approved_at IS NULL
            )
            OR
            (
              gift_approved_by IS NOT NULL
              AND gift_approved_at IS NOT NULL
            )
          )
        )
      );

  END IF;

END
$$;


-- =============================================================================
-- 5. GIFT APPROVER FOREIGN KEY
-- =============================================================================

DO $$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'order_items_gift_approved_by_fk'
      AND conrelid = 'public.order_items'::regclass
  ) THEN

    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_gift_approved_by_fk
      FOREIGN KEY (gift_approved_by)
      REFERENCES public.users(id)
      ON DELETE RESTRICT;

  END IF;

END
$$;


-- =============================================================================
-- 6. ORDER ITEM CLIENT UUID
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_order_items_company_client_uuid_active
  ON public.order_items (
    company_id,
    client_uuid
  )
  WHERE deleted_at IS NULL
    AND client_uuid IS NOT NULL;


-- =============================================================================
-- 7. ALLOCATED QUANTITY HELPER
--
-- Only active shipment allocations are counted.
--
-- A shipment with status = cancelled does not consume allocation.
-- A soft-deleted shipment item does not consume allocation.
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
    SUM(si.quantity)::bigint,
    0::bigint
  )
  FROM public.shipment_items si
  INNER JOIN public.shipments s
    ON s.id = si.shipment_id
  WHERE si.order_item_id = p_order_item_id
    AND si.deleted_at IS NULL
    AND s.deleted_at IS NULL
    AND s.status <> 'cancelled';
$$;


-- =============================================================================
-- 8. REMAINING QUANTITY HELPER
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
    public.v2_get_order_item_allocated_quantity(oi.id),
    0::bigint
  )
  FROM public.order_items oi
  WHERE oi.id = p_order_item_id;
$$;


-- =============================================================================
-- 9. MAIN ALLOCATION VALIDATION
--
-- SECURITY DEFINER is intentional:
--
--   The allocation check must see all shipment allocations for the same
--   order item, regardless of the authenticated user's normal RLS visibility.
--
-- The critical concurrency mechanism is:
--
--   SELECT order_item ... FOR UPDATE
--
-- All allocation attempts for the same order_item therefore serialize.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.v2_enforce_shipment_item_allocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE

  v_order_item record;
  v_shipment record;

  v_existing_allocated bigint := 0;
  v_available_quantity bigint := 0;

BEGIN

  -- ===========================================================================
  -- INSERT / UPDATE
  -- ===========================================================================

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN

    -- -------------------------------------------------------------------------
    -- Load shipment information.
    -- -------------------------------------------------------------------------

    SELECT
      s.id,
      s.company_id,
      s.order_id,
      s.status,
      s.deleted_at
    INTO v_shipment
    FROM public.shipments s
    WHERE s.id = NEW.shipment_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Invalid shipment: %',
        NEW.shipment_id;
    END IF;


    -- -------------------------------------------------------------------------
    -- Company validation.
    -- -------------------------------------------------------------------------

    IF v_shipment.company_id <> NEW.company_id THEN
      RAISE EXCEPTION
        'Shipment company_id does not match shipment_item company_id.';
    END IF;


    -- -------------------------------------------------------------------------
    -- Shipment status validation.
    -- -------------------------------------------------------------------------

    IF v_shipment.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION
        'Cannot allocate to a deleted shipment.';
    END IF;


    IF v_shipment.status = 'cancelled' THEN
      RAISE EXCEPTION
        'Cannot allocate to a cancelled shipment.';
    END IF;


    -- -------------------------------------------------------------------------
    -- Lock order_item row.
    --
    -- This is the concurrency control point.
    --
    -- Example:
    --
    --   Order Item = 18 ton
    --
    --   User A requests 10 ton
    --   User B requests 10 ton simultaneously
    --
    -- One transaction obtains the row lock first.
    -- The second transaction waits.
    -- After the first commits, the second recalculates remaining quantity.
    -- -------------------------------------------------------------------------

    PERFORM 1
    FROM public.order_items oi
    WHERE oi.id = NEW.order_item_id
    FOR UPDATE;


    -- -------------------------------------------------------------------------
    -- Load the locked order item.
    -- -------------------------------------------------------------------------

    SELECT
      oi.id,
      oi.company_id,
      oi.order_id,
      oi.product_id,
      oi.quantity,
      oi.is_gift,
      oi.gift_reason,
      oi.gift_approved_by,
      oi.gift_approved_at
    INTO v_order_item
    FROM public.order_items oi
    WHERE oi.id = NEW.order_item_id;


    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Invalid order item: %',
        NEW.order_item_id;
    END IF;


    -- -------------------------------------------------------------------------
    -- Company validation.
    -- -------------------------------------------------------------------------

    IF v_order_item.company_id <> NEW.company_id THEN
      RAISE EXCEPTION
        'Order item company_id does not match shipment_item company_id.';
    END IF;


    -- -------------------------------------------------------------------------
    -- Order validation.
    -- -------------------------------------------------------------------------

    IF v_order_item.order_id <> v_shipment.order_id THEN
      RAISE EXCEPTION
        'Order item % does not belong to shipment order %.',
        NEW.order_item_id,
        v_shipment.order_id;
    END IF;


    -- -------------------------------------------------------------------------
    -- Product validation.
    -- -------------------------------------------------------------------------

    IF v_order_item.product_id <> NEW.product_id THEN
      RAISE EXCEPTION
        'Shipment item product_id does not match order item product_id.';
    END IF;


    -- -------------------------------------------------------------------------
    -- Gift flag validation.
    -- -------------------------------------------------------------------------

    IF NEW.is_gift IS DISTINCT FROM v_order_item.is_gift THEN
      RAISE EXCEPTION
        'Shipment item gift flag must match order item gift flag.';
    END IF;


    -- -------------------------------------------------------------------------
    -- Gift approval validation.
    -- -------------------------------------------------------------------------

    IF v_order_item.is_gift = true THEN

      IF v_order_item.gift_approved_by IS NULL
         OR v_order_item.gift_approved_at IS NULL THEN

        RAISE EXCEPTION
          'Gift order item must be approved before shipment allocation.';

      END IF;

    END IF;


    -- -------------------------------------------------------------------------
    -- Validate quantity.
    -- -------------------------------------------------------------------------

    IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
      RAISE EXCEPTION
        'Shipment item quantity must be greater than zero.';
    END IF;


    -- -------------------------------------------------------------------------
    -- UPDATE handling.
    --
    -- When an existing shipment_item is edited, exclude the current row from
    -- the allocation total before calculating the new total.
    -- -------------------------------------------------------------------------

    SELECT COALESCE(
      SUM(si.quantity)::bigint,
      0::bigint
    )
    INTO v_existing_allocated
    FROM public.shipment_items si
    INNER JOIN public.shipments s
      ON s.id = si.shipment_id
    WHERE si.order_item_id = NEW.order_item_id
      AND si.deleted_at IS NULL
      AND s.deleted_at IS NULL
      AND s.status <> 'cancelled'
      AND (
        TG_OP = 'INSERT'
        OR si.id <> NEW.id
      );


    -- -------------------------------------------------------------------------
    -- Calculate remaining quantity.
    -- -------------------------------------------------------------------------

    v_available_quantity :=
      v_order_item.quantity::bigint
      -
      v_existing_allocated;


    -- -------------------------------------------------------------------------
    -- Prevent over-allocation.
    -- -------------------------------------------------------------------------

    IF NEW.quantity::bigint > v_available_quantity THEN

      RAISE EXCEPTION
        'Insufficient remaining quantity for order item %. Ordered: %, already allocated: %, requested: %, remaining: %.',
        NEW.order_item_id,
        v_order_item.quantity,
        v_existing_allocated,
        NEW.quantity,
        v_available_quantity;

    END IF;


    RETURN NEW;

  END IF;


  -- ===========================================================================
  -- DELETE
  --
  -- Physical deletes should already be blocked by the existing V1 protection.
  -- We deliberately do not implement allocation logic for hard DELETE.
  -- ===========================================================================

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;


  RETURN NULL;

END;
$$;


-- =============================================================================
-- 10. TRIGGER
-- =============================================================================

DROP TRIGGER IF EXISTS trg_v2_enforce_shipment_item_allocation
ON public.shipment_items;


CREATE TRIGGER trg_v2_enforce_shipment_item_allocation
BEFORE INSERT OR UPDATE
ON public.shipment_items
FOR EACH ROW
EXECUTE FUNCTION public.v2_enforce_shipment_item_allocation();


-- =============================================================================
-- 11. FUNCTION PERMISSIONS
--
-- The trigger executes internally, while direct execution by normal users is
-- not part of the application contract.
-- =============================================================================

REVOKE EXECUTE
ON FUNCTION public.v2_get_order_item_allocated_quantity(uuid)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.v2_get_order_item_remaining_quantity(uuid)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.v2_enforce_shipment_item_allocation()
FROM PUBLIC;


-- =============================================================================
-- 12. COMMENTS
-- =============================================================================

COMMENT ON COLUMN public.order_items.is_gift IS
  'Indicates that the order item is a gift item.';

COMMENT ON COLUMN public.order_items.gift_reason IS
  'Business reason for the gift item.';

COMMENT ON COLUMN public.order_items.gift_note IS
  'Additional operational note for the gift item.';

COMMENT ON COLUMN public.order_items.gift_approved_by IS
  'User who approved the gift item.';

COMMENT ON COLUMN public.order_items.gift_approved_at IS
  'Timestamp when the gift item was approved.';

COMMENT ON COLUMN public.order_items.client_uuid IS
  'Stable client-side identifier used for offline synchronization.';

COMMENT ON COLUMN public.order_items.sync_version IS
  'Server-side version used by the synchronization layer.';

COMMENT ON COLUMN public.order_items.last_synced_at IS
  'Last successful synchronization timestamp.';


COMMENT ON FUNCTION public.v2_get_order_item_allocated_quantity(uuid) IS
  'Returns active allocated shipment quantity for an order item.';

COMMENT ON FUNCTION public.v2_get_order_item_remaining_quantity(uuid) IS
  'Returns remaining quantity available for shipment allocation.';

COMMENT ON FUNCTION public.v2_enforce_shipment_item_allocation() IS
  'Enforces shipment allocation limits using PostgreSQL row locking.';


COMMIT;
-- =============================================================================
-- Gypsum Sales CRM V2
-- Migration 11
--
-- Purpose:
--   Adapt the legacy V1 waybill item validation to the V2
--   Shipment -> Shipment Item -> Waybill Item model.
--
-- V1 legacy rule:
--   waybill_items.quantity must equal order_items.quantity.
--
-- V2 rule:
--   waybill_items.quantity must be positive and must not exceed
--   shipment_items.quantity.
--
-- This also preserves V1 behavior for legacy records where
-- shipment_item_id IS NULL.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. REPLACE LEGACY WAYBILL ITEM VALIDATION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_waybill_item_links()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_item_company uuid;
  v_item_order_id uuid;
  v_item_product_id uuid;
  v_item_quantity integer;
  v_item_weight smallint;

  v_waybill_company uuid;
  v_waybill_order_id uuid;
  v_waybill_status public.waybill_status;
  v_waybill_shipment_id uuid;

  v_shipment_item_company uuid;
  v_shipment_item_order_item_id uuid;
  v_shipment_item_product_id uuid;
  v_shipment_item_quantity integer;
  v_shipment_item_weight smallint;
  v_shipment_item_shipment_id uuid;

  v_product_name text;

BEGIN

  -- ===========================================================================
  -- Get Order Item
  -- ===========================================================================

  SELECT
    oi.company_id,
    oi.order_id,
    oi.product_id,
    oi.quantity,
    oi.weight_kg_snapshot
  INTO
    v_item_company,
    v_item_order_id,
    v_item_product_id,
    v_item_quantity,
    v_item_weight
  FROM public.order_items oi
  WHERE oi.id = NEW.order_item_id
    AND oi.deleted_at IS NULL;


  IF v_item_company IS NULL THEN
    RAISE EXCEPTION
      'Order item % does not exist or is deleted',
      NEW.order_item_id;
  END IF;


  -- ===========================================================================
  -- Get Waybill
  -- ===========================================================================

  SELECT
    w.company_id,
    w.order_id,
    w.status,
    w.shipment_id
  INTO
    v_waybill_company,
    v_waybill_order_id,
    v_waybill_status,
    v_waybill_shipment_id
  FROM public.waybills w
  WHERE w.id = NEW.waybill_id
    AND w.deleted_at IS NULL;


  IF v_waybill_company IS NULL THEN
    RAISE EXCEPTION
      'Waybill % does not exist or is deleted',
      NEW.waybill_id;
  END IF;


  -- ===========================================================================
  -- Company Validation
  -- ===========================================================================

  IF NEW.company_id <> v_waybill_company
     OR NEW.company_id <> v_item_company
  THEN
    RAISE EXCEPTION
      'Company mismatch between waybill item, waybill and order item';
  END IF;


  -- ===========================================================================
  -- Order Validation
  -- ===========================================================================

  IF v_item_order_id <> v_waybill_order_id THEN
    RAISE EXCEPTION
      'Order item % does not belong to waybill order %',
      NEW.order_item_id,
      v_waybill_order_id;
  END IF;


  -- ===========================================================================
  -- Product Validation
  -- ===========================================================================

  IF NEW.product_id <> v_item_product_id THEN
    RAISE EXCEPTION
      'Waybill item product does not match order item product';
  END IF;


  -- ===========================================================================
  -- V2 Shipment Item Validation
  --
  -- When shipment_item_id is present, the waybill item belongs to the
  -- exact Shipment Item.
  -- ===========================================================================

  IF NEW.shipment_item_id IS NOT NULL THEN

    SELECT
      si.company_id,
      si.order_item_id,
      si.product_id,
      si.quantity,
      si.weight_kg_snapshot,
      si.shipment_id
    INTO
      v_shipment_item_company,
      v_shipment_item_order_item_id,
      v_shipment_item_product_id,
      v_shipment_item_quantity,
      v_shipment_item_weight,
      v_shipment_item_shipment_id
    FROM public.shipment_items si
    WHERE si.id = NEW.shipment_item_id
      AND si.deleted_at IS NULL;


    IF v_shipment_item_company IS NULL THEN
      RAISE EXCEPTION
        'Shipment item % does not exist or is deleted',
        NEW.shipment_item_id;
    END IF;


    -- -------------------------------------------------------------------------
    -- Company
    -- -------------------------------------------------------------------------

    IF NEW.company_id <> v_shipment_item_company THEN
      RAISE EXCEPTION
        'Waybill item and shipment item must belong to the same company';
    END IF;


    -- -------------------------------------------------------------------------
    -- Order Item
    -- -------------------------------------------------------------------------

    IF NEW.order_item_id <> v_shipment_item_order_item_id THEN
      RAISE EXCEPTION
        'Waybill item and shipment item must reference the same order item';
    END IF;


    -- -------------------------------------------------------------------------
    -- Product
    -- -------------------------------------------------------------------------

    IF NEW.product_id <> v_shipment_item_product_id THEN
      RAISE EXCEPTION
        'Waybill item and shipment item must reference the same product';
    END IF;


    -- -------------------------------------------------------------------------
    -- Weight
    -- -------------------------------------------------------------------------

    IF NEW.weight_kg_snapshot <> v_shipment_item_weight THEN
      RAISE EXCEPTION
        'Waybill item weight must match shipment item weight';
    END IF;


    -- -------------------------------------------------------------------------
    -- Shipment
    -- -------------------------------------------------------------------------

    IF v_waybill_shipment_id IS NULL THEN
      RAISE EXCEPTION
        'V2 waybill item requires its waybill to be linked to a shipment';
    END IF;


    IF v_waybill_shipment_id <> v_shipment_item_shipment_id THEN
      RAISE EXCEPTION
        'Waybill item shipment does not match shipment item shipment';
    END IF;


    -- -------------------------------------------------------------------------
    -- V2 Quantity Rule
    --
    -- Waybill quantity may be lower than the Shipment Item quantity because
    -- the Waybill App is allowed to correct the final dispatch quantity.
    --
    -- But it may never exceed the Shipment Item quantity.
    -- -------------------------------------------------------------------------

    IF NEW.quantity <= 0 THEN
      RAISE EXCEPTION
        'Waybill item quantity must be greater than zero';
    END IF;


    IF NEW.quantity > v_shipment_item_quantity THEN
      RAISE EXCEPTION
        'Waybill item quantity (%) cannot exceed shipment item quantity (%)',
        NEW.quantity,
        v_shipment_item_quantity;
    END IF;


  ELSE

    -- =========================================================================
    -- V1 LEGACY RULE
    --
    -- Existing V1 waybills have no shipment_item_id.
    -- Preserve the original exact quantity validation.
    -- =========================================================================

    IF NEW.quantity <> v_item_quantity THEN
      RAISE EXCEPTION
        'Legacy V1 waybill item quantity must match the order item quantity';
    END IF;


    IF NEW.weight_kg_snapshot <> v_item_weight THEN
      RAISE EXCEPTION
        'Waybill item weight must match the order item weight';
    END IF;

  END IF;


  -- ===========================================================================
  -- Prevent modification after final states
  -- ===========================================================================

  IF v_waybill_status IN (
    'loading_confirmed',
    'cancelled'
  )
  THEN

    RAISE EXCEPTION
      'Items cannot be added or changed after loading confirmation or cancellation';

  END IF;


  -- ===========================================================================
  -- Automatically populate product snapshot if empty
  -- ===========================================================================

  IF NEW.product_name_snapshot IS NULL
     OR btrim(NEW.product_name_snapshot) = ''
  THEN

    SELECT p.name
    INTO v_product_name
    FROM public.products p
    WHERE p.id = NEW.product_id;

    NEW.product_name_snapshot :=
      COALESCE(v_product_name, '');

  END IF;


  RETURN NEW;

END;
$function$;


-- =============================================================================
-- 2. FUNCTION SECURITY
-- =============================================================================

REVOKE ALL
ON FUNCTION public.validate_waybill_item_links()
FROM PUBLIC;


-- =============================================================================
-- 3. DOCUMENT THE V2 RULE
-- =============================================================================

COMMENT ON FUNCTION public.validate_waybill_item_links()
IS
  'Validates legacy V1 and V2 Waybill Item relationships. V1 requires exact Order Item quantity. V2 requires Waybill Item quantity to be positive and no greater than its Shipment Item quantity.';


COMMIT;
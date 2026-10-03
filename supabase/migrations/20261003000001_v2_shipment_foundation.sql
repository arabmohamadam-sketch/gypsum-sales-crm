-- =============================================================================
-- Gypsum Sales CRM V2
-- Migration: 20261003000001_v2_shipment_foundation.sql
--
-- Purpose:
--   Add the V2 shipment foundation on top of the existing V1 schema.
--
-- IMPORTANT:
--   - Do not recreate V1 tables.
--   - Do not modify existing waybill numbering yet.
--   - Do not remove the V1 "one active waybill per order item" constraint yet.
--   - V2 waybill compatibility will be handled in a later migration.
--
-- Existing V1 tables used here:
--   companies
--   users
--   products
--   orders
--   order_items
--
-- New V2 tables:
--   vehicles
--   drivers
--   shipments
--   shipment_items
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. SHIPMENT STATUS ENUM
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'shipment_status'
  ) THEN
    CREATE TYPE public.shipment_status AS ENUM (
      'draft',
      'ready',
      'announced',
      'assigned',
      'loading',
      'loaded',
      'sent',
      'partially_delivered',
      'delivered',
      'cancelled'
    );
  END IF;
END $$;


-- =============================================================================
-- 2. VEHICLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id uuid NOT NULL
    REFERENCES public.companies (id)
    ON DELETE RESTRICT,

  plate_number text NOT NULL,
  vehicle_type text NOT NULL,

  owner_name text,
  owner_phone text,

  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL
    DEFAULT timezone('utc', now()),

  updated_at timestamptz NOT NULL
    DEFAULT timezone('utc', now()),

  deleted_at timestamptz
);


CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicles_company_plate_active
  ON public.vehicles (
    company_id,
    plate_number
  )
  WHERE deleted_at IS NULL;


CREATE INDEX IF NOT EXISTS idx_vehicles_company
  ON public.vehicles (company_id)
  WHERE deleted_at IS NULL;


-- =============================================================================
-- 3. DRIVERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id uuid NOT NULL
    REFERENCES public.companies (id)
    ON DELETE RESTRICT,

  first_name text NOT NULL,
  last_name text NOT NULL,

  phone text,

  national_id text,

  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL
    DEFAULT timezone('utc', now()),

  updated_at timestamptz NOT NULL
    DEFAULT timezone('utc', now()),

  deleted_at timestamptz
);


CREATE INDEX IF NOT EXISTS idx_drivers_company
  ON public.drivers (company_id)
  WHERE deleted_at IS NULL;


CREATE INDEX IF NOT EXISTS idx_drivers_phone
  ON public.drivers (
    company_id,
    phone
  )
  WHERE deleted_at IS NULL AND phone IS NOT NULL;


-- =============================================================================
-- 4. SHIPMENTS
-- =============================================================================
-- A shipment is a physical execution of all or part of an order.
--
-- Example:
--
--   Order #10025
--      18 tons
--
--      Shipment #1 -> 10 tons
--      Shipment #2 ->  8 tons
--
-- The shipment does NOT replace the order.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id uuid NOT NULL
    REFERENCES public.companies (id)
    ON DELETE RESTRICT,

  order_id uuid NOT NULL
    REFERENCES public.orders (id)
    ON DELETE RESTRICT,

  shipment_number bigint
    GENERATED ALWAYS AS IDENTITY,

  status public.shipment_status NOT NULL
    DEFAULT 'draft',

  vehicle_id uuid
    REFERENCES public.vehicles (id)
    ON DELETE RESTRICT,

  driver_id uuid
    REFERENCES public.drivers (id)
    ON DELETE RESTRICT,

  -- Operational snapshots.
  -- These protect historical shipment data from later master-data changes.
  vehicle_type_snapshot text,
  plate_number_snapshot text,
  driver_name_snapshot text,
  driver_phone_snapshot text,

  shipment_date date,

  notes text,

  created_by uuid
    REFERENCES public.users (id)
    ON DELETE RESTRICT,

  -- Offline / synchronization foundation.
  client_uuid uuid,

  sync_version integer NOT NULL DEFAULT 1,

  last_synced_at timestamptz,

  created_at timestamptz NOT NULL
    DEFAULT timezone('utc', now()),

  updated_at timestamptz NOT NULL
    DEFAULT timezone('utc', now()),

  deleted_at timestamptz
);


-- Shipment number is unique within each company.
CREATE UNIQUE INDEX IF NOT EXISTS uq_shipments_company_number
  ON public.shipments (
    company_id,
    shipment_number
  );


-- Offline-created shipments must not duplicate within a company.
CREATE UNIQUE INDEX IF NOT EXISTS uq_shipments_company_client_uuid_active
  ON public.shipments (
    company_id,
    client_uuid
  )
  WHERE deleted_at IS NULL
    AND client_uuid IS NOT NULL;


CREATE INDEX IF NOT EXISTS idx_shipments_company
  ON public.shipments (company_id)
  WHERE deleted_at IS NULL;


CREATE INDEX IF NOT EXISTS idx_shipments_order
  ON public.shipments (
    company_id,
    order_id
  )
  WHERE deleted_at IS NULL;


CREATE INDEX IF NOT EXISTS idx_shipments_status
  ON public.shipments (
    company_id,
    status,
    shipment_date DESC
  )
  WHERE deleted_at IS NULL;


CREATE INDEX IF NOT EXISTS idx_shipments_vehicle
  ON public.shipments (
    company_id,
    vehicle_id
  )
  WHERE deleted_at IS NULL
    AND vehicle_id IS NOT NULL;


CREATE INDEX IF NOT EXISTS idx_shipments_driver
  ON public.shipments (
    company_id,
    driver_id
  )
  WHERE deleted_at IS NULL
    AND driver_id IS NOT NULL;


-- =============================================================================
-- 5. SHIPMENT ITEMS
-- =============================================================================
-- One shipment can contain multiple order items.
--
-- One order item can be split across multiple shipments.
--
-- Example:
--
--   Order Item: White Gypsum = 18 tons
--
--       Shipment A -> 10 tons
--       Shipment B ->  8 tons
--
-- Each shipment allocation is represented by one shipment_item row.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.shipment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id uuid NOT NULL
    REFERENCES public.companies (id)
    ON DELETE RESTRICT,

  shipment_id uuid NOT NULL
    REFERENCES public.shipments (id)
    ON DELETE RESTRICT,

  order_item_id uuid NOT NULL
    REFERENCES public.order_items (id)
    ON DELETE RESTRICT,

  product_id uuid NOT NULL
    REFERENCES public.products (id)
    ON DELETE RESTRICT,

  -- Product snapshot.
  product_name_snapshot text NOT NULL,

  -- Quantity is the number of bags/packages,
  -- matching the current V1 order_items model.
  quantity integer NOT NULL,

  weight_kg_snapshot smallint NOT NULL,

  tonnage numeric(14,4)
    GENERATED ALWAYS AS (
      (
        quantity::numeric
        *
        weight_kg_snapshot::numeric
      ) / 1000.0
    )
    STORED,

  -- Snapshot from the order item.
  -- In a later migration/business service this will be validated
  -- against order_items.is_gift.
  is_gift boolean NOT NULL DEFAULT false,

  -- Offline / synchronization foundation.
  client_uuid uuid,

  sync_version integer NOT NULL DEFAULT 1,

  last_synced_at timestamptz,

  created_at timestamptz NOT NULL
    DEFAULT timezone('utc', now()),

  updated_at timestamptz NOT NULL
    DEFAULT timezone('utc', now()),

  deleted_at timestamptz,

  CONSTRAINT shipment_items_quantity_positive
    CHECK (quantity > 0),

  CONSTRAINT shipment_items_weight_kg_valid
    CHECK (weight_kg_snapshot IN (25, 30))
);


CREATE UNIQUE INDEX IF NOT EXISTS uq_shipment_items_company_client_uuid_active
  ON public.shipment_items (
    company_id,
    client_uuid
  )
  WHERE deleted_at IS NULL
    AND client_uuid IS NOT NULL;


CREATE INDEX IF NOT EXISTS idx_shipment_items_company
  ON public.shipment_items (company_id)
  WHERE deleted_at IS NULL;


CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment
  ON public.shipment_items (
    company_id,
    shipment_id
  )
  WHERE deleted_at IS NULL;


CREATE INDEX IF NOT EXISTS idx_shipment_items_order_item
  ON public.shipment_items (
    company_id,
    order_item_id
  )
  WHERE deleted_at IS NULL;


CREATE INDEX IF NOT EXISTS idx_shipment_items_product
  ON public.shipment_items (
    company_id,
    product_id
  )
  WHERE deleted_at IS NULL;


-- =============================================================================
-- 6. SHIPMENT COMPANY / ORDER INTEGRITY
-- =============================================================================
-- Prevent:
--   shipment.company_id != order.company_id
--
-- This is important because company_id is duplicated for tenant isolation
-- and cannot be trusted merely from application code.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.v2_validate_shipment_company_and_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_company_id uuid;
BEGIN
  SELECT o.company_id
    INTO v_order_company_id
  FROM public.orders o
  WHERE o.id = NEW.order_id;

  IF v_order_company_id IS NULL THEN
    RAISE EXCEPTION
      'Shipment references an invalid order: %',
      NEW.order_id;
  END IF;

  IF v_order_company_id <> NEW.company_id THEN
    RAISE EXCEPTION
      'Shipment company_id % does not match order company_id %',
      NEW.company_id,
      v_order_company_id;
  END IF;

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trg_v2_validate_shipment_company_and_order
ON public.shipments;


CREATE TRIGGER trg_v2_validate_shipment_company_and_order
BEFORE INSERT OR UPDATE OF company_id, order_id
ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION public.v2_validate_shipment_company_and_order();


-- =============================================================================
-- 7. SHIPMENT ITEM INTEGRITY
-- =============================================================================
-- Prevent:
--
--   shipment_item.company_id != shipment.company_id
--   shipment_item.order_item.company_id != shipment.company_id
--   shipment_item.order_item.order_id != shipment.order_id
--   shipment_item.product_id != order_item.product_id
--
-- This guarantees that allocation cannot accidentally connect records from
-- different orders/products/companies.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.v2_validate_shipment_item_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_shipment_company_id uuid;
  v_shipment_order_id uuid;

  v_order_item_company_id uuid;
  v_order_item_order_id uuid;
  v_order_item_product_id uuid;
BEGIN

  SELECT
    s.company_id,
    s.order_id
  INTO
    v_shipment_company_id,
    v_shipment_order_id
  FROM public.shipments s
  WHERE s.id = NEW.shipment_id;

  IF v_shipment_company_id IS NULL THEN
    RAISE EXCEPTION
      'Shipment item references an invalid shipment: %',
      NEW.shipment_id;
  END IF;

  IF v_shipment_company_id <> NEW.company_id THEN
    RAISE EXCEPTION
      'Shipment item company_id % does not match shipment company_id %',
      NEW.company_id,
      v_shipment_company_id;
  END IF;


  SELECT
    oi.company_id,
    oi.order_id,
    oi.product_id
  INTO
    v_order_item_company_id,
    v_order_item_order_id,
    v_order_item_product_id
  FROM public.order_items oi
  WHERE oi.id = NEW.order_item_id;

  IF v_order_item_company_id IS NULL THEN
    RAISE EXCEPTION
      'Shipment item references an invalid order item: %',
      NEW.order_item_id;
  END IF;


  IF v_order_item_company_id <> NEW.company_id THEN
    RAISE EXCEPTION
      'Shipment item company_id % does not match order item company_id %',
      NEW.company_id,
      v_order_item_company_id;
  END IF;


  IF v_order_item_order_id <> v_shipment_order_id THEN
    RAISE EXCEPTION
      'Order item % does not belong to shipment order %',
      NEW.order_item_id,
      v_shipment_order_id;
  END IF;


  IF v_order_item_product_id <> NEW.product_id THEN
    RAISE EXCEPTION
      'Shipment item product % does not match order item product %',
      NEW.product_id,
      v_order_item_product_id;
  END IF;


  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trg_v2_validate_shipment_item_integrity
ON public.shipment_items;


CREATE TRIGGER trg_v2_validate_shipment_item_integrity
BEFORE INSERT OR UPDATE OF
  company_id,
  shipment_id,
  order_item_id,
  product_id
ON public.shipment_items
FOR EACH ROW
EXECUTE FUNCTION public.v2_validate_shipment_item_integrity();


-- =============================================================================
-- 8. UPDATED_AT TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS trg_v2_vehicles_updated_at
ON public.vehicles;


CREATE TRIGGER trg_v2_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


DROP TRIGGER IF EXISTS trg_v2_drivers_updated_at
ON public.drivers;


CREATE TRIGGER trg_v2_drivers_updated_at
BEFORE UPDATE ON public.drivers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


DROP TRIGGER IF EXISTS trg_v2_shipments_updated_at
ON public.shipments;


CREATE TRIGGER trg_v2_shipments_updated_at
BEFORE UPDATE ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


DROP TRIGGER IF EXISTS trg_v2_shipment_items_updated_at
ON public.shipment_items;


CREATE TRIGGER trg_v2_shipment_items_updated_at
BEFORE UPDATE ON public.shipment_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


-- =============================================================================
-- 9. PREVENT HARD DELETE
-- =============================================================================

DROP TRIGGER IF EXISTS trg_v2_vehicles_prevent_hard_delete
ON public.vehicles;


CREATE TRIGGER trg_v2_vehicles_prevent_hard_delete
BEFORE DELETE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_hard_delete();


DROP TRIGGER IF EXISTS trg_v2_drivers_prevent_hard_delete
ON public.drivers;


CREATE TRIGGER trg_v2_drivers_prevent_hard_delete
BEFORE DELETE ON public.drivers
FOR EACH ROW
EXECUTE FUNCTION public.prevent_hard_delete();


DROP TRIGGER IF EXISTS trg_v2_shipments_prevent_hard_delete
ON public.shipments;


CREATE TRIGGER trg_v2_shipments_prevent_hard_delete
BEFORE DELETE ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_hard_delete();


DROP TRIGGER IF EXISTS trg_v2_shipment_items_prevent_hard_delete
ON public.shipment_items;


CREATE TRIGGER trg_v2_shipment_items_prevent_hard_delete
BEFORE DELETE ON public.shipment_items
FOR EACH ROW
EXECUTE FUNCTION public.prevent_hard_delete();


-- =============================================================================
-- 10. COMMENTS
-- =============================================================================

COMMENT ON TABLE public.shipments IS
  'V2 physical shipment execution for all or part of a sales order.';

COMMENT ON TABLE public.shipment_items IS
  'V2 allocation of an order item into a specific physical shipment.';

COMMENT ON COLUMN public.shipments.shipment_number IS
  'Database-generated operational shipment number.';

COMMENT ON COLUMN public.shipment_items.quantity IS
  'Number of bags/packages allocated to this shipment item.';

COMMENT ON COLUMN public.shipment_items.tonnage IS
  'Generated tonnage from quantity and weight snapshot.';

COMMIT;
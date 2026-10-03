-- =============================================================================
-- Gypsum Sales CRM V2
-- Migration 10
--
-- Purpose:
--   1. Bridge Waybill -> Shipment
--   2. Bridge Waybill Item -> Shipment Item
--   3. Preserve V1 waybill data
--   4. Enable V2 Order Item splitting across multiple Shipments / Waybills
--   5. Prevent more than one active Waybill Item for one Shipment Item
--   6. Keep cross-entity company/order consistency enforced
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. WAYBILL -> SHIPMENT
-- =============================================================================

ALTER TABLE public.waybills
    ADD COLUMN IF NOT EXISTS shipment_id uuid;

COMMENT ON COLUMN public.waybills.shipment_id IS
    'V2 link to the physical shipment. NULL is allowed for legacy V1 waybills.';


ALTER TABLE public.waybills
    DROP CONSTRAINT IF EXISTS waybills_shipment_id_fkey;

ALTER TABLE public.waybills
    ADD CONSTRAINT waybills_shipment_id_fkey
    FOREIGN KEY (shipment_id)
    REFERENCES public.shipments(id);


CREATE INDEX IF NOT EXISTS idx_waybills_shipment_id
    ON public.waybills (company_id, shipment_id)
    WHERE deleted_at IS NULL
      AND shipment_id IS NOT NULL;


-- =============================================================================
-- 2. WAYBILL ITEM -> SHIPMENT ITEM
-- =============================================================================

ALTER TABLE public.waybill_items
    ADD COLUMN IF NOT EXISTS shipment_item_id uuid;

COMMENT ON COLUMN public.waybill_items.shipment_item_id IS
    'V2 link to the exact shipment item executed by this waybill item. NULL is allowed for legacy V1 waybill items.';


ALTER TABLE public.waybill_items
    DROP CONSTRAINT IF EXISTS waybill_items_shipment_item_id_fkey;

ALTER TABLE public.waybill_items
    ADD CONSTRAINT waybill_items_shipment_item_id_fkey
    FOREIGN KEY (shipment_item_id)
    REFERENCES public.shipment_items(id);


CREATE INDEX IF NOT EXISTS idx_waybill_items_shipment_item_id
    ON public.waybill_items (company_id, shipment_item_id)
    WHERE deleted_at IS NULL
      AND shipment_item_id IS NOT NULL;


-- =============================================================================
-- 3. REPLACE THE V1 UNIQUE INDEX
--
-- Old V1 rule:
--   One active waybill item per order item.
--
-- That rule blocks the V2 requirement:
--   One order item can be split across multiple shipments.
--
-- New model:
--
--   V1 legacy rows:
--     shipment_id IS NULL
--     -> preserve old uniqueness by order_item_id
--
--   V2 rows:
--     shipment_id IS NOT NULL
--     -> uniqueness is controlled by shipment_item_id
--
-- This preserves legacy behavior while allowing V2 split execution.
-- =============================================================================

DROP INDEX IF EXISTS public.uq_waybill_items_active_order_item;


CREATE UNIQUE INDEX IF NOT EXISTS uq_waybill_items_active_legacy_order_item
    ON public.waybill_items (company_id, order_item_id)
    WHERE deleted_at IS NULL
      AND shipment_item_id IS NULL;


CREATE UNIQUE INDEX IF NOT EXISTS uq_waybill_items_active_shipment_item
    ON public.waybill_items (company_id, shipment_item_id)
    WHERE deleted_at IS NULL
      AND shipment_item_id IS NOT NULL;


-- =============================================================================
-- 4. INDEX FOR ORDER-ITEM EXECUTION LOOKUPS
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_waybill_items_active_order_item_v2
    ON public.waybill_items (company_id, order_item_id, shipment_item_id)
    WHERE deleted_at IS NULL;


-- =============================================================================
-- 5. VALIDATE WAYBILL -> SHIPMENT RELATION
--
-- V1:
--   shipment_id IS NULL -> legacy record, no additional validation.
--
-- V2:
--   shipment_id IS NOT NULL -> shipment must belong to the same company and
--   the same order.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.v2_validate_waybill_shipment_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_shipment_company_id uuid;
    v_shipment_order_id uuid;
BEGIN

    IF NEW.shipment_id IS NULL THEN
        RETURN NEW;
    END IF;


    SELECT
        s.company_id,
        s.order_id
    INTO
        v_shipment_company_id,
        v_shipment_order_id
    FROM public.shipments AS s
    WHERE s.id = NEW.shipment_id
      AND s.deleted_at IS NULL;


    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Shipment % does not exist or is deleted.',
            NEW.shipment_id;
    END IF;


    IF NEW.company_id <> v_shipment_company_id THEN
        RAISE EXCEPTION
            'Waybill and Shipment must belong to the same company.';
    END IF;


    IF NEW.order_id <> v_shipment_order_id THEN
        RAISE EXCEPTION
            'Waybill and Shipment must belong to the same order.';
    END IF;


    RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS trg_v2_validate_waybill_shipment_link
ON public.waybills;


CREATE TRIGGER trg_v2_validate_waybill_shipment_link
BEFORE INSERT OR UPDATE OF shipment_id, company_id, order_id
ON public.waybills
FOR EACH ROW
EXECUTE FUNCTION public.v2_validate_waybill_shipment_link();


-- =============================================================================
-- 6. VALIDATE WAYBILL ITEM -> SHIPMENT ITEM RELATION
--
-- V1:
--   shipment_item_id IS NULL -> legacy item, no additional validation.
--
-- V2:
--   shipment_item_id is present and must match:
--     - company
--     - order item
--     - product
--     - waybill shipment
-- =============================================================================

CREATE OR REPLACE FUNCTION public.v2_validate_waybill_item_shipment_item_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_shipment_id uuid;
    v_company_id uuid;
    v_order_item_id uuid;
    v_product_id uuid;
BEGIN

    IF NEW.shipment_item_id IS NULL THEN
        RETURN NEW;
    END IF;


    SELECT
        si.shipment_id,
        si.company_id,
        si.order_item_id,
        si.product_id
    INTO
        v_shipment_id,
        v_company_id,
        v_order_item_id,
        v_product_id
    FROM public.shipment_items AS si
    WHERE si.id = NEW.shipment_item_id
      AND si.deleted_at IS NULL;


    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Shipment Item % does not exist or is deleted.',
            NEW.shipment_item_id;
    END IF;


    IF NEW.company_id <> v_company_id THEN
        RAISE EXCEPTION
            'Waybill Item and Shipment Item must belong to the same company.';
    END IF;


    IF NEW.order_item_id <> v_order_item_id THEN
        RAISE EXCEPTION
            'Waybill Item and Shipment Item must reference the same Order Item.';
    END IF;


    IF NEW.product_id <> v_product_id THEN
        RAISE EXCEPTION
            'Waybill Item and Shipment Item must reference the same Product.';
    END IF;


    IF NEW.waybill_id IS NOT NULL THEN

        IF NOT EXISTS (
            SELECT 1
            FROM public.waybills AS w
            WHERE w.id = NEW.waybill_id
              AND w.deleted_at IS NULL
              AND w.company_id = NEW.company_id
              AND (
                  w.shipment_id = v_shipment_id
              )
        ) THEN

            RAISE EXCEPTION
                'Waybill Item Shipment Item must belong to the Shipment linked to the Waybill.';

        END IF;

    END IF;


    RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS trg_v2_validate_waybill_item_shipment_item_link
ON public.waybill_items;


CREATE TRIGGER trg_v2_validate_waybill_item_shipment_item_link
BEFORE INSERT OR UPDATE OF shipment_item_id, waybill_id, company_id, order_item_id, product_id
ON public.waybill_items
FOR EACH ROW
EXECUTE FUNCTION public.v2_validate_waybill_item_shipment_item_link();


-- =============================================================================
-- 7. FUNCTION SECURITY
-- =============================================================================

REVOKE ALL
ON FUNCTION public.v2_validate_waybill_shipment_link()
FROM PUBLIC;


REVOKE ALL
ON FUNCTION public.v2_validate_waybill_item_shipment_item_link()
FROM PUBLIC;


-- =============================================================================
-- 8. COMMENTS
-- =============================================================================

COMMENT ON INDEX public.uq_waybill_items_active_legacy_order_item IS
    'V1 legacy uniqueness: one active legacy waybill item per order item.';


COMMENT ON INDEX public.uq_waybill_items_active_shipment_item IS
    'V2 uniqueness: one active waybill item per shipment item.';


COMMIT;
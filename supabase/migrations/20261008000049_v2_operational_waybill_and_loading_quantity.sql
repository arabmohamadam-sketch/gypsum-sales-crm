BEGIN;

-- V2 operational waybill quantity + actual loading quantity

CREATE OR REPLACE FUNCTION public.validate_waybill_item_links()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_item_company uuid; v_item_order_id uuid; v_item_product_id uuid;
  v_item_quantity integer; v_item_weight smallint;
  v_waybill_company uuid; v_waybill_order_id uuid;
  v_waybill_status public.waybill_status; v_waybill_shipment_id uuid;
  v_shipment_item_company uuid; v_shipment_item_order_item_id uuid;
  v_shipment_item_product_id uuid; v_shipment_item_weight smallint;
  v_shipment_item_shipment_id uuid; v_product_name text;
BEGIN
  SELECT oi.company_id, oi.order_id, oi.product_id, oi.quantity, oi.weight_kg_snapshot
  INTO v_item_company, v_item_order_id, v_item_product_id, v_item_quantity, v_item_weight
  FROM public.order_items oi
  WHERE oi.id = NEW.order_item_id AND oi.deleted_at IS NULL;

  IF v_item_company IS NULL THEN
    RAISE EXCEPTION 'Order item % does not exist or is deleted', NEW.order_item_id;
  END IF;

  SELECT w.company_id, w.order_id, w.status, w.shipment_id
  INTO v_waybill_company, v_waybill_order_id, v_waybill_status, v_waybill_shipment_id
  FROM public.waybills w
  WHERE w.id = NEW.waybill_id AND w.deleted_at IS NULL;

  IF v_waybill_company IS NULL THEN
    RAISE EXCEPTION 'Waybill % does not exist or is deleted', NEW.waybill_id;
  END IF;

  IF NEW.company_id <> v_waybill_company OR NEW.company_id <> v_item_company THEN
    RAISE EXCEPTION 'Company mismatch between waybill item, waybill and order item';
  END IF;

  IF v_item_order_id <> v_waybill_order_id THEN
    RAISE EXCEPTION 'Order item % does not belong to waybill order %', NEW.order_item_id, v_waybill_order_id;
  END IF;

  IF NEW.product_id <> v_item_product_id THEN
    RAISE EXCEPTION 'Waybill item product does not match order item product';
  END IF;

  IF NEW.shipment_item_id IS NOT NULL THEN
    SELECT si.company_id, si.order_item_id, si.product_id, si.weight_kg_snapshot, si.shipment_id
    INTO v_shipment_item_company, v_shipment_item_order_item_id, v_shipment_item_product_id, v_shipment_item_weight, v_shipment_item_shipment_id
    FROM public.shipment_items si
    WHERE si.id = NEW.shipment_item_id AND si.deleted_at IS NULL;

    IF v_shipment_item_company IS NULL THEN
      RAISE EXCEPTION 'Shipment item % does not exist or is deleted', NEW.shipment_item_id;
    END IF;

    IF NEW.company_id <> v_shipment_item_company THEN
      RAISE EXCEPTION 'Waybill item and shipment item must belong to the same company';
    END IF;

    IF NEW.order_item_id <> v_shipment_item_order_item_id THEN
      RAISE EXCEPTION 'Waybill item and shipment item must reference the same order item';
    END IF;

    IF NEW.product_id <> v_shipment_item_product_id THEN
      RAISE EXCEPTION 'Waybill item and shipment item must reference the same product';
    END IF;

    IF NEW.weight_kg_snapshot <> v_shipment_item_weight THEN
      RAISE EXCEPTION 'Waybill item weight must match shipment item weight';
    END IF;

    IF v_waybill_shipment_id IS NULL THEN
      RAISE EXCEPTION 'V2 waybill item requires its waybill to be linked to a shipment';
    END IF;

    IF v_waybill_shipment_id <> v_shipment_item_shipment_id THEN
      RAISE EXCEPTION 'Waybill item shipment does not match shipment item shipment';
    END IF;

    IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
      RAISE EXCEPTION 'V2 waybill item quantity must be greater than zero';
    END IF;
  ELSE
    IF NEW.quantity <> v_item_quantity THEN
      RAISE EXCEPTION 'Legacy V1 waybill item quantity must match the order item quantity';
    END IF;
    IF NEW.weight_kg_snapshot <> v_item_weight THEN
      RAISE EXCEPTION 'Waybill item weight must match the order item weight';
    END IF;
  END IF;

  IF v_waybill_status IN ('loading_confirmed','cancelled') THEN
    RAISE EXCEPTION 'Items cannot be added or changed after loading confirmation or cancellation';
  END IF;

  IF NEW.product_name_snapshot IS NULL OR btrim(NEW.product_name_snapshot) = '' THEN
    SELECT p.name INTO v_product_name FROM public.products p WHERE p.id = NEW.product_id;
    NEW.product_name_snapshot := COALESCE(v_product_name, '');
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_waybill_item_links() FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public.loading_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  loading_id uuid NOT NULL REFERENCES public.loading(id) ON DELETE RESTRICT,
  waybill_item_id uuid NOT NULL REFERENCES public.waybill_items(id) ON DELETE RESTRICT,
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name_snapshot text NOT NULL,
  quantity integer NOT NULL,
  weight_kg_snapshot smallint NOT NULL,
  tonnage numeric(14,4) GENERATED ALWAYS AS ((quantity::numeric * weight_kg_snapshot::numeric) / 1000.0) STORED,
  client_uuid uuid,
  sync_version integer NOT NULL DEFAULT 1,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT loading_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT loading_items_weight_kg_valid CHECK (weight_kg_snapshot IN (25,30))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_loading_items_active_waybill_item
ON public.loading_items(company_id, loading_id, waybill_item_id)
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_loading_items_company_client_uuid_active
ON public.loading_items(company_id, client_uuid)
WHERE deleted_at IS NULL AND client_uuid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_loading_items_loading ON public.loading_items(company_id, loading_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_loading_items_waybill_item ON public.loading_items(company_id, waybill_item_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_loading_items_order_item ON public.loading_items(company_id, order_item_id) WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.v2_validate_loading_item_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_loading_company_id uuid; v_loading_waybill_id uuid; v_loading_status public.loading_status;
  v_waybill_company_id uuid; v_waybill_order_id uuid; v_waybill_status public.waybill_status;
  v_waybill_shipment_id uuid; v_waybill_item_company_id uuid; v_waybill_item_waybill_id uuid;
  v_waybill_item_order_item_id uuid; v_waybill_item_product_id uuid; v_waybill_item_weight smallint;
  v_waybill_item_deleted_at timestamptz;
BEGIN
  SELECT l.company_id, l.waybill_id, l.status INTO v_loading_company_id, v_loading_waybill_id, v_loading_status
  FROM public.loading l WHERE l.id = NEW.loading_id AND l.deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Loading % does not exist or is deleted.', NEW.loading_id; END IF;
  IF NEW.company_id <> v_loading_company_id THEN RAISE EXCEPTION 'Loading item company_id does not match loading company_id.'; END IF;
  IF v_loading_status <> 'pending' THEN RAISE EXCEPTION 'Loading items can only be changed while loading is pending.'; END IF;

  SELECT w.company_id, w.order_id, w.status, w.shipment_id
  INTO v_waybill_company_id, v_waybill_order_id, v_waybill_status, v_waybill_shipment_id
  FROM public.waybills w WHERE w.id = v_loading_waybill_id AND w.deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Waybill for loading does not exist or is deleted.'; END IF;
  IF v_waybill_shipment_id IS NULL THEN RAISE EXCEPTION 'Loading items require a V2 waybill linked to a shipment.'; END IF;
  IF v_waybill_status <> 'issued' THEN RAISE EXCEPTION 'Loading items can only be edited for an issued V2 waybill.'; END IF;
  IF NEW.company_id <> v_waybill_company_id THEN RAISE EXCEPTION 'Loading item company_id does not match waybill company_id.'; END IF;

  SELECT wi.company_id, wi.waybill_id, wi.order_item_id, wi.product_id, wi.weight_kg_snapshot, wi.deleted_at
  INTO v_waybill_item_company_id, v_waybill_item_waybill_id, v_waybill_item_order_item_id, v_waybill_item_product_id, v_waybill_item_weight, v_waybill_item_deleted_at
  FROM public.waybill_items wi WHERE wi.id = NEW.waybill_item_id;
  IF NOT FOUND OR v_waybill_item_deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Waybill item % does not exist or is deleted.', NEW.waybill_item_id; END IF;
  IF NEW.company_id <> v_waybill_item_company_id THEN RAISE EXCEPTION 'Loading item company mismatch.'; END IF;
  IF v_waybill_item_waybill_id <> v_loading_waybill_id THEN RAISE EXCEPTION 'Loading item does not belong to the loading waybill.'; END IF;
  IF NEW.order_item_id <> v_waybill_item_order_item_id THEN RAISE EXCEPTION 'Loading item order item mismatch.'; END IF;
  IF NEW.product_id <> v_waybill_item_product_id THEN RAISE EXCEPTION 'Loading item product mismatch.'; END IF;
  IF NEW.weight_kg_snapshot <> v_waybill_item_weight THEN RAISE EXCEPTION 'Loading item weight must match waybill item weight.'; END IF;
  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN RAISE EXCEPTION 'Actual loaded quantity must be greater than zero.'; END IF;
  IF NEW.product_name_snapshot IS NULL OR btrim(NEW.product_name_snapshot) = '' THEN
    SELECT p.name INTO NEW.product_name_snapshot FROM public.products p WHERE p.id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_v2_validate_loading_item_integrity ON public.loading_items;
CREATE TRIGGER trg_v2_validate_loading_item_integrity
BEFORE INSERT OR UPDATE OF company_id, loading_id, waybill_item_id, order_item_id, product_id, quantity, weight_kg_snapshot, deleted_at
ON public.loading_items FOR EACH ROW EXECUTE FUNCTION public.v2_validate_loading_item_integrity();

CREATE OR REPLACE FUNCTION public.v2_loading_items_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $function$ BEGIN NEW.updated_at := timezone('utc', now()); RETURN NEW; END; $function$;
DROP TRIGGER IF EXISTS trg_v2_loading_items_updated_at ON public.loading_items;
CREATE TRIGGER trg_v2_loading_items_updated_at BEFORE UPDATE ON public.loading_items FOR EACH ROW EXECUTE FUNCTION public.v2_loading_items_updated_at();

DROP TRIGGER IF EXISTS trg_v2_loading_items_prevent_hard_delete ON public.loading_items;
CREATE TRIGGER trg_v2_loading_items_prevent_hard_delete BEFORE DELETE ON public.loading_items FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

INSERT INTO public.loading_items (company_id, loading_id, waybill_item_id, order_item_id, product_id, product_name_snapshot, quantity, weight_kg_snapshot, sync_version, last_synced_at)
SELECT l.company_id, l.id, wi.id, wi.order_item_id, wi.product_id, COALESCE(wi.product_name_snapshot,''), wi.quantity, wi.weight_kg_snapshot, 1, timezone('utc', now())
FROM public.loading l
JOIN public.waybills w ON w.id=l.waybill_id AND w.company_id=l.company_id AND w.deleted_at IS NULL AND w.shipment_id IS NOT NULL
JOIN public.waybill_items wi ON wi.waybill_id=w.id AND wi.company_id=w.company_id AND wi.deleted_at IS NULL
WHERE l.deleted_at IS NULL
ON CONFLICT (company_id, loading_id, waybill_item_id) DO NOTHING;

ALTER TABLE public.loading_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS loading_items_select_scoped ON public.loading_items;
DROP POLICY IF EXISTS loading_items_insert_scoped ON public.loading_items;
DROP POLICY IF EXISTS loading_items_update_scoped ON public.loading_items;
CREATE POLICY loading_items_select_scoped ON public.loading_items FOR SELECT TO authenticated USING (company_id=public.auth_user_company_id() AND deleted_at IS NULL AND public.auth_user_has_permission('loading.view'));
CREATE POLICY loading_items_insert_scoped ON public.loading_items FOR INSERT TO authenticated WITH CHECK (company_id=public.auth_user_company_id() AND public.auth_user_has_permission('loading.edit'));
CREATE POLICY loading_items_update_scoped ON public.loading_items FOR UPDATE TO authenticated USING (company_id=public.auth_user_company_id() AND deleted_at IS NULL AND public.auth_user_has_permission('loading.edit')) WITH CHECK (company_id=public.auth_user_company_id() AND public.auth_user_has_permission('loading.edit'));
REVOKE DELETE ON public.loading_items FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.loading_items TO authenticated;

-- V2 Regional Manager Plan now reads actual loaded quantities.
CREATE OR REPLACE FUNCTION public.v2_get_regional_manager_plan(
    p_user_id uuid, p_year smallint, p_month smallint)
RETURNS TABLE (region_id uuid, region_name text, target_tonnage numeric, achieved_tonnage numeric, remaining_tonnage numeric, achievement_rate numeric, loaded_order_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_company_id uuid; v_period_start date; v_period_end date;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Regional manager user id is required.'; END IF;
  IF p_year < 2000 OR p_year > 2100 THEN RAISE EXCEPTION 'Invalid Gregorian period year.'; END IF;
  IF p_month < 1 OR p_month > 12 THEN RAISE EXCEPTION 'Invalid Gregorian period month.'; END IF;

  SELECT u.company_id INTO v_company_id FROM public.users u WHERE u.id=p_user_id AND u.deleted_at IS NULL AND u.is_active=true LIMIT 1;
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'Active user not found.'; END IF;
  SELECT b.start_date,b.end_date INTO v_period_start,v_period_end FROM public.get_jalali_period_bounds_from_gregorian_key(p_year,p_month) b;

  RETURN QUERY
  WITH manager_regions AS (
    SELECT DISTINCT ur.region_id FROM public.user_regions ur WHERE ur.company_id=v_company_id AND ur.user_id=p_user_id AND ur.deleted_at IS NULL
  ),
  target_by_region AS (
    SELECT mt.region_id, COALESCE(SUM(mt.target_tonnage),0)::numeric target_tonnage
    FROM public.monthly_targets mt WHERE mt.company_id=v_company_id AND mt.user_id=p_user_id
      AND mt.target_year=p_year AND mt.target_month=p_month AND mt.region_id IS NOT NULL AND mt.deleted_at IS NULL
    GROUP BY mt.region_id
  ),
  loaded_rows AS (
    SELECT ci.region_id,o.id order_id,li.tonnage
    FROM public.orders o
    JOIN public.customers c ON c.id=o.customer_id AND c.company_id=o.company_id AND c.deleted_at IS NULL
    JOIN public.cities ci ON ci.id=c.city_id AND ci.deleted_at IS NULL
    JOIN public.user_regions ur ON ur.region_id=ci.region_id AND ur.company_id=o.company_id AND ur.user_id=p_user_id AND ur.deleted_at IS NULL
    JOIN public.waybills w ON w.order_id=o.id AND w.company_id=o.company_id AND w.deleted_at IS NULL AND w.shipment_id IS NOT NULL AND w.status='loading_confirmed'
    JOIN public.loading l ON l.waybill_id=w.id AND l.company_id=w.company_id AND l.deleted_at IS NULL AND l.status='confirmed'
      AND l.loading_date >= v_period_start AND l.loading_date < v_period_end
    JOIN public.loading_items li ON li.loading_id=l.id AND li.company_id=l.company_id AND li.deleted_at IS NULL
    JOIN public.waybill_items wi ON wi.id=li.waybill_item_id AND wi.waybill_id=w.id AND wi.company_id=w.company_id AND wi.deleted_at IS NULL
    WHERE o.company_id=v_company_id AND o.deleted_at IS NULL
  ),
  loaded_by_region AS (
    SELECT region_id,COALESCE(SUM(tonnage),0)::numeric achieved_tonnage,COUNT(DISTINCT order_id)::integer loaded_order_count
    FROM loaded_rows GROUP BY region_id
  ),
  regional_calculation AS (
    SELECT mr.region_id,r.name region_name,COALESCE(t.target_tonnage,0)::numeric target_tonnage,COALESCE(lb.achieved_tonnage,0)::numeric achieved_tonnage,COALESCE(lb.loaded_order_count,0)::integer loaded_order_count
    FROM manager_regions mr JOIN public.regions r ON r.id=mr.region_id AND r.deleted_at IS NULL
    LEFT JOIN target_by_region t ON t.region_id=mr.region_id LEFT JOIN loaded_by_region lb ON lb.region_id=mr.region_id
  )
  SELECT rc.region_id,rc.region_name,rc.target_tonnage,rc.achieved_tonnage,GREATEST(rc.target_tonnage-rc.achieved_tonnage,0)::numeric,CASE WHEN rc.target_tonnage>0 THEN ROUND((rc.achieved_tonnage/rc.target_tonnage)*100,2) ELSE NULL END::numeric,rc.loaded_order_count
  FROM regional_calculation rc
  UNION ALL
  SELECT NULL::uuid,'همه مناطق'::text,COALESCE(SUM(rc.target_tonnage),0)::numeric,COALESCE(SUM(rc.achieved_tonnage),0)::numeric,
    GREATEST(COALESCE(SUM(rc.target_tonnage),0)-COALESCE(SUM(rc.achieved_tonnage),0),0)::numeric,
    CASE WHEN COALESCE(SUM(rc.target_tonnage),0)>0 THEN ROUND((COALESCE(SUM(rc.achieved_tonnage),0)/SUM(rc.target_tonnage))*100,2) ELSE NULL END::numeric,
    (SELECT COUNT(DISTINCT lr.order_id)::integer FROM loaded_rows lr)
  FROM regional_calculation rc ORDER BY region_id NULLS LAST;
END;
$function$;

REVOKE ALL ON FUNCTION public.v2_get_regional_manager_plan(uuid,smallint,smallint) FROM PUBLIC, authenticated;

COMMENT ON TABLE public.loading_items IS 'V2 actual loaded quantity per waybill item; source for Regional Manager Plan achievement.';
COMMENT ON COLUMN public.loading_items.quantity IS 'Actual number of bags physically loaded.';
COMMENT ON COLUMN public.loading_items.tonnage IS 'Actual loaded tonnage generated from quantity and bag weight.';

COMMIT;
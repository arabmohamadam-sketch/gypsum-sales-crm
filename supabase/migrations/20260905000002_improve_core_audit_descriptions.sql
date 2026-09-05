-- =============================================================================
-- Gypsum Sales CRM — Improve Core Audit Descriptions
-- =============================================================================
-- Keeps the existing activity_logs structure and audit triggers.
-- Only improves the description generated for important state changes.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.audit_core_business_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_company_id uuid;
  v_entity_id uuid;
  v_user_id uuid;
  v_action public.activity_action;
  v_changes jsonb;
  v_description text;
  v_old_status text;
  v_new_status text;
BEGIN
  v_user_id := auth.uid();

  IF TG_OP = 'INSERT' THEN

    v_company_id := NEW.company_id;
    v_entity_id := NEW.id;
    v_action := 'create';

    v_changes := jsonb_build_object(
      'new', to_jsonb(NEW)
    );

    CASE TG_TABLE_NAME
      WHEN 'orders' THEN
        v_description := 'ایجاد سفارش';

      WHEN 'waybills' THEN
        v_description := 'ایجاد حواله';

      WHEN 'loading' THEN
        v_description := 'ایجاد رکورد بارگیری';

      WHEN 'customers' THEN
        v_description := 'ایجاد مشتری';

      WHEN 'order_items' THEN
        v_description := 'ایجاد قلم سفارش';

      WHEN 'waybill_items' THEN
        v_description := 'ایجاد قلم حواله';

      WHEN 'monthly_targets' THEN
        v_description := 'ایجاد هدف فروش ماهانه';

      ELSE
        v_description := format(
          'ایجاد %s',
          TG_TABLE_NAME
        );
    END CASE;

  ELSIF TG_OP = 'DELETE' THEN

    v_company_id := OLD.company_id;
    v_entity_id := OLD.id;
    v_action := 'delete';

    v_changes := jsonb_build_object(
      'old', to_jsonb(OLD)
    );

    CASE TG_TABLE_NAME
      WHEN 'orders' THEN
        v_description := 'حذف سفارش';

      WHEN 'waybills' THEN
        v_description := 'حذف حواله';

      WHEN 'loading' THEN
        v_description := 'حذف رکورد بارگیری';

      WHEN 'customers' THEN
        v_description := 'حذف مشتری';

      WHEN 'order_items' THEN
        v_description := 'حذف قلم سفارش';

      WHEN 'waybill_items' THEN
        v_description := 'حذف قلم حواله';

      WHEN 'monthly_targets' THEN
        v_description := 'حذف هدف فروش ماهانه';

      ELSE
        v_description := format(
          'حذف %s',
          TG_TABLE_NAME
        );
    END CASE;

  ELSE

    v_company_id := NEW.company_id;
    v_entity_id := NEW.id;
    v_action := 'update';

    v_changes := jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    );

    -- ===========================================================
    -- Soft delete
    -- ===========================================================

    IF NEW.deleted_at IS NOT NULL
       AND OLD.deleted_at IS NULL
    THEN

      v_action := 'delete';

      CASE TG_TABLE_NAME
        WHEN 'orders' THEN
          v_description := 'حذف نرم سفارش';

        WHEN 'waybills' THEN
          v_description := 'لغو/حذف نرم حواله';

        WHEN 'loading' THEN
          v_description := 'لغو/حذف نرم بارگیری';

        WHEN 'customers' THEN
          v_description := 'حذف نرم مشتری';

        WHEN 'monthly_targets' THEN
          v_description := 'حذف نرم هدف فروش';

        ELSE
          v_description := format(
            'حذف نرم %s',
            TG_TABLE_NAME
          );
      END CASE;

    -- ===========================================================
    -- Order status
    -- ===========================================================

    ELSIF TG_TABLE_NAME = 'orders'
      AND OLD.status IS DISTINCT FROM NEW.status
    THEN

      v_description := format(
        'تغییر وضعیت سفارش: %s ← %s',
        OLD.status::text,
        NEW.status::text
      );

    -- ===========================================================
    -- Waybill status
    -- ===========================================================

    ELSIF TG_TABLE_NAME = 'waybills'
      AND OLD.status IS DISTINCT FROM NEW.status
    THEN

      v_description := format(
        'تغییر وضعیت حواله: %s ← %s',
        OLD.status::text,
        NEW.status::text
      );

    -- ===========================================================
    -- Loading status
    -- ===========================================================

    ELSIF TG_TABLE_NAME = 'loading'
      AND OLD.status IS DISTINCT FROM NEW.status
    THEN

      v_description := format(
        'تغییر وضعیت بارگیری: %s ← %s',
        OLD.status::text,
        NEW.status::text
      );

    -- ===========================================================
    -- Loading confirmation
    -- ===========================================================

    ELSIF TG_TABLE_NAME = 'loading'
      AND OLD.confirmed_at IS DISTINCT FROM NEW.confirmed_at
    THEN

      IF NEW.confirmed_at IS NOT NULL THEN
        v_description := 'تأیید بارگیری';
      ELSE
        v_description := 'لغو تأیید بارگیری';
      END IF;

    -- ===========================================================
    -- Important order changes
    -- ===========================================================

    ELSIF TG_TABLE_NAME = 'orders'
      AND OLD.total_tonnage IS DISTINCT FROM NEW.total_tonnage
    THEN

      v_description := format(
        'تغییر تناژ سفارش: %s → %s تن',
        OLD.total_tonnage,
        NEW.total_tonnage
      );

    ELSIF TG_TABLE_NAME = 'orders'
      AND OLD.sales_user_id IS DISTINCT FROM NEW.sales_user_id
    THEN

      v_description := 'تغییر بازاریاب سفارش';

    ELSIF TG_TABLE_NAME = 'orders'
      AND OLD.customer_id IS DISTINCT FROM NEW.customer_id
    THEN

      v_description := 'تغییر مشتری سفارش';

    ELSIF TG_TABLE_NAME = 'orders'
      AND OLD.order_date IS DISTINCT FROM NEW.order_date
    THEN

      v_description := format(
        'تغییر تاریخ سفارش: %s → %s',
        OLD.order_date,
        NEW.order_date
      );

    -- ===========================================================
    -- Waybill changes
    -- ===========================================================

    ELSIF TG_TABLE_NAME = 'waybills'
      AND OLD.order_id IS DISTINCT FROM NEW.order_id
    THEN

      v_description := 'تغییر سفارش مرتبط با حواله';

    ELSIF TG_TABLE_NAME = 'waybills'
      AND OLD.waybill_date IS DISTINCT FROM NEW.waybill_date
    THEN

      v_description := format(
        'تغییر تاریخ حواله: %s → %s',
        OLD.waybill_date,
        NEW.waybill_date
      );

    -- ===========================================================
    -- Loading date
    -- ===========================================================

    ELSIF TG_TABLE_NAME = 'loading'
      AND OLD.loading_date IS DISTINCT FROM NEW.loading_date
    THEN

      v_description := format(
        'تغییر تاریخ بارگیری: %s → %s',
        OLD.loading_date,
        NEW.loading_date
      );

    -- ===========================================================
    -- Target changes
    -- ===========================================================

    ELSIF TG_TABLE_NAME = 'monthly_targets'
      AND OLD.target_tonnage IS DISTINCT FROM NEW.target_tonnage
    THEN

      v_description := format(
        'تغییر هدف فروش: %s → %s تن',
        OLD.target_tonnage,
        NEW.target_tonnage
      );

    ELSE

      CASE TG_TABLE_NAME
        WHEN 'customers' THEN
          v_description := 'ویرایش مشتری';

        WHEN 'orders' THEN
          v_description := 'ویرایش سفارش';

        WHEN 'order_items' THEN
          v_description := 'ویرایش قلم سفارش';

        WHEN 'waybills' THEN
          v_description := 'ویرایش حواله';

        WHEN 'waybill_items' THEN
          v_description := 'ویرایش قلم حواله';

        WHEN 'loading' THEN
          v_description := 'ویرایش بارگیری';

        WHEN 'monthly_targets' THEN
          v_description := 'ویرایش هدف فروش';

        ELSE
          v_description := format(
            'ویرایش %s',
            TG_TABLE_NAME
          );
      END CASE;

    END IF;

  END IF;

  INSERT INTO public.activity_logs (
    company_id,
    user_id,
    action,
    entity_type,
    entity_id,
    description,
    changes,
    source
  )
  VALUES (
    v_company_id,
    v_user_id,
    v_action,
    TG_TABLE_NAME,
    v_entity_id,
    v_description,
    v_changes,
    'manual'
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.audit_core_business_change() IS
  'Creates readable audit descriptions and stores complete old/new snapshots for core CRM business entities.';

COMMIT;
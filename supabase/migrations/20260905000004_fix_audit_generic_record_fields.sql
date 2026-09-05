-- =============================================================================
-- Gypsum Sales CRM — Fix Generic Audit Record Field Access
-- =============================================================================
-- Important:
-- The audit trigger is shared by multiple tables.
-- Therefore table-specific fields must NOT be referenced directly from
-- OLD/NEW records. All optional/table-specific comparisons use JSONB.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.audit_core_business_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_old jsonb;
  v_new jsonb;

  v_company_id uuid;
  v_entity_id uuid;
  v_user_id uuid;

  v_action public.activity_action;
  v_changes jsonb;
  v_description text;

  v_old_status text;
  v_new_status text;

  v_old_deleted_at text;
  v_new_deleted_at text;

  v_old_confirmed_at text;
  v_new_confirmed_at text;

  v_old_total_tonnage numeric;
  v_new_total_tonnage numeric;

  v_old_target_tonnage numeric;
  v_new_target_tonnage numeric;

  v_old_sales_user_id text;
  v_new_sales_user_id text;

  v_old_customer_id text;
  v_new_customer_id text;

  v_old_order_id text;
  v_new_order_id text;

  v_old_order_date text;
  v_new_order_date text;

  v_old_waybill_date text;
  v_new_waybill_date text;

  v_old_loading_date text;
  v_new_loading_date text;
BEGIN

  -- ===========================================================================
  -- Convert records to JSONB once.
  -- This makes the function safe for multiple tables with different columns.
  -- ===========================================================================

  IF TG_OP <> 'DELETE' THEN
    v_new := to_jsonb(NEW);
  END IF;

  IF TG_OP <> 'INSERT' THEN
    v_old := to_jsonb(OLD);
  END IF;


  -- ===========================================================================
  -- Common fields
  -- ===========================================================================

  IF TG_OP = 'INSERT' THEN

    v_company_id := (v_new ->> 'company_id')::uuid;
    v_entity_id := (v_new ->> 'id')::uuid;
    v_user_id := auth.uid();

    v_action := 'create';

    v_changes := jsonb_build_object(
      'new', v_new
    );

    CASE TG_TABLE_NAME
      WHEN 'customers' THEN
        v_description := 'ایجاد مشتری';

      WHEN 'orders' THEN
        v_description := 'ایجاد سفارش';

      WHEN 'order_items' THEN
        v_description := 'ایجاد قلم سفارش';

      WHEN 'waybills' THEN
        v_description := 'ایجاد حواله';

      WHEN 'waybill_items' THEN
        v_description := 'ایجاد قلم حواله';

      WHEN 'loading' THEN
        v_description := 'ایجاد رکورد بارگیری';

      WHEN 'monthly_targets' THEN
        v_description := 'ایجاد هدف فروش ماهانه';

      ELSE
        v_description := format(
          'ایجاد %s',
          TG_TABLE_NAME
        );
    END CASE;


  ELSIF TG_OP = 'DELETE' THEN

    v_company_id := (v_old ->> 'company_id')::uuid;
    v_entity_id := (v_old ->> 'id')::uuid;
    v_user_id := auth.uid();

    v_action := 'delete';

    v_changes := jsonb_build_object(
      'old', v_old
    );

    CASE TG_TABLE_NAME
      WHEN 'customers' THEN
        v_description := 'حذف مشتری';

      WHEN 'orders' THEN
        v_description := 'حذف سفارش';

      WHEN 'order_items' THEN
        v_description := 'حذف قلم سفارش';

      WHEN 'waybills' THEN
        v_description := 'حذف حواله';

      WHEN 'waybill_items' THEN
        v_description := 'حذف قلم حواله';

      WHEN 'loading' THEN
        v_description := 'حذف رکورد بارگیری';

      WHEN 'monthly_targets' THEN
        v_description := 'حذف هدف فروش ماهانه';

      ELSE
        v_description := format(
          'حذف %s',
          TG_TABLE_NAME
        );
    END CASE;


  ELSE

    v_company_id := (v_new ->> 'company_id')::uuid;
    v_entity_id := (v_new ->> 'id')::uuid;
    v_user_id := auth.uid();

    v_action := 'update';

    v_changes := jsonb_build_object(
      'old', v_old,
      'new', v_new
    );


    -- ========================================================================
    -- Common soft-delete detection
    -- ========================================================================

    v_old_deleted_at := v_old ->> 'deleted_at';
    v_new_deleted_at := v_new ->> 'deleted_at';

    IF v_new_deleted_at IS NOT NULL
       AND v_old_deleted_at IS NULL
    THEN

      v_action := 'delete';

      CASE TG_TABLE_NAME
        WHEN 'customers' THEN
          v_description := 'حذف نرم مشتری';

        WHEN 'orders' THEN
          v_description := 'حذف نرم سفارش';

        WHEN 'waybills' THEN
          v_description := 'حذف نرم حواله';

        WHEN 'loading' THEN
          v_description := 'حذف نرم بارگیری';

        WHEN 'monthly_targets' THEN
          v_description := 'حذف نرم هدف فروش';

        ELSE
          v_description := format(
            'حذف نرم %s',
            TG_TABLE_NAME
          );
      END CASE;


    -- ========================================================================
    -- Order
    -- ========================================================================

    ELSIF TG_TABLE_NAME = 'orders'
      AND (v_old ->> 'status')
          IS DISTINCT FROM
          (v_new ->> 'status')
    THEN

      v_old_status := v_old ->> 'status';
      v_new_status := v_new ->> 'status';

      v_description := format(
        'تغییر وضعیت سفارش: %s → %s',
        COALESCE(v_old_status, 'null'),
        COALESCE(v_new_status, 'null')
      );


    ELSIF TG_TABLE_NAME = 'orders'
      AND (v_old ->> 'total_tonnage')
          IS DISTINCT FROM
          (v_new ->> 'total_tonnage')
    THEN

      v_old_total_tonnage :=
        NULLIF(v_old ->> 'total_tonnage', '')::numeric;

      v_new_total_tonnage :=
        NULLIF(v_new ->> 'total_tonnage', '')::numeric;

      v_description := format(
        'تغییر تناژ سفارش: %s → %s تن',
        COALESCE(v_old_total_tonnage, 0),
        COALESCE(v_new_total_tonnage, 0)
      );


    ELSIF TG_TABLE_NAME = 'orders'
      AND (v_old ->> 'sales_user_id')
          IS DISTINCT FROM
          (v_new ->> 'sales_user_id')
    THEN

      v_description := 'تغییر بازاریاب سفارش';


    ELSIF TG_TABLE_NAME = 'orders'
      AND (v_old ->> 'customer_id')
          IS DISTINCT FROM
          (v_new ->> 'customer_id')
    THEN

      v_description := 'تغییر مشتری سفارش';


    ELSIF TG_TABLE_NAME = 'orders'
      AND (v_old ->> 'order_date')
          IS DISTINCT FROM
          (v_new ->> 'order_date')
    THEN

      v_description := format(
        'تغییر تاریخ سفارش: %s → %s',
        COALESCE(v_old ->> 'order_date', 'null'),
        COALESCE(v_new ->> 'order_date', 'null')
      );


    -- ========================================================================
    -- Waybill
    -- ========================================================================

    ELSIF TG_TABLE_NAME = 'waybills'
      AND (v_old ->> 'status')
          IS DISTINCT FROM
          (v_new ->> 'status')
    THEN

      v_old_status := v_old ->> 'status';
      v_new_status := v_new ->> 'status';

      v_description := format(
        'تغییر وضعیت حواله: %s → %s',
        COALESCE(v_old_status, 'null'),
        COALESCE(v_new_status, 'null')
      );


    ELSIF TG_TABLE_NAME = 'waybills'
      AND (v_old ->> 'order_id')
          IS DISTINCT FROM
          (v_new ->> 'order_id')
    THEN

      v_old_order_id := v_old ->> 'order_id';
      v_new_order_id := v_new ->> 'order_id';

      v_description := 'تغییر سفارش مرتبط با حواله';


    ELSIF TG_TABLE_NAME = 'waybills'
      AND (v_old ->> 'waybill_date')
          IS DISTINCT FROM
          (v_new ->> 'waybill_date')
    THEN

      v_old_waybill_date := v_old ->> 'waybill_date';
      v_new_waybill_date := v_new ->> 'waybill_date';

      v_description := format(
        'تغییر تاریخ حواله: %s → %s',
        COALESCE(v_old_waybill_date, 'null'),
        COALESCE(v_new_waybill_date, 'null')
      );


    -- ========================================================================
    -- Loading
    -- ========================================================================

    ELSIF TG_TABLE_NAME = 'loading'
      AND (v_old ->> 'status')
          IS DISTINCT FROM
          (v_new ->> 'status')
    THEN

      v_old_status := v_old ->> 'status';
      v_new_status := v_new ->> 'status';

      v_description := format(
        'تغییر وضعیت بارگیری: %s → %s',
        COALESCE(v_old_status, 'null'),
        COALESCE(v_new_status, 'null')
      );


    ELSIF TG_TABLE_NAME = 'loading'
      AND (v_old ->> 'confirmed_at')
          IS DISTINCT FROM
          (v_new ->> 'confirmed_at')
    THEN

      v_old_confirmed_at := v_old ->> 'confirmed_at';
      v_new_confirmed_at := v_new ->> 'confirmed_at';

      IF v_new_confirmed_at IS NOT NULL THEN
        v_description := 'تأیید بارگیری';
      ELSE
        v_description := 'لغو تأیید بارگیری';
      END IF;


    ELSIF TG_TABLE_NAME = 'loading'
      AND (v_old ->> 'loading_date')
          IS DISTINCT FROM
          (v_new ->> 'loading_date')
    THEN

      v_old_loading_date := v_old ->> 'loading_date';
      v_new_loading_date := v_new ->> 'loading_date';

      v_description := format(
        'تغییر تاریخ بارگیری: %s → %s',
        COALESCE(v_old_loading_date, 'null'),
        COALESCE(v_new_loading_date, 'null')
      );


    -- ========================================================================
    -- Monthly target
    -- ========================================================================

    ELSIF TG_TABLE_NAME = 'monthly_targets'
      AND (v_old ->> 'target_tonnage')
          IS DISTINCT FROM
          (v_new ->> 'target_tonnage')
    THEN

      v_old_target_tonnage :=
        NULLIF(v_old ->> 'target_tonnage', '')::numeric;

      v_new_target_tonnage :=
        NULLIF(v_new ->> 'target_tonnage', '')::numeric;

      v_description := format(
        'تغییر هدف فروش: %s → %s تن',
        COALESCE(v_old_target_tonnage, 0),
        COALESCE(v_new_target_tonnage, 0)
      );


    -- ========================================================================
    -- Generic fallback
    -- ========================================================================

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


  -- ===========================================================================
  -- Write audit entry
  -- ===========================================================================

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
  'Generic multi-table audit function. Table-specific fields are accessed through JSONB to avoid record-field errors.';

COMMIT;
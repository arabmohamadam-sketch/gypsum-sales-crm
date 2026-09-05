BEGIN;

CREATE OR REPLACE FUNCTION public.audit_core_business_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_changes jsonb;
  v_action public.activity_action;
  v_description text;
  v_entity_id uuid;
  v_company_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  v_old := CASE
    WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD)
    ELSE NULL
  END;

  v_new := CASE
    WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW)
    ELSE NULL
  END;

  /*
   * اگر تنها فیلدی که تغییر کرده updated_at است،
   * هیچ Audit Record جدیدی ثبت نکن.
   */
  IF TG_OP = 'UPDATE'
     AND (v_old - 'updated_at') IS NOT DISTINCT FROM (v_new - 'updated_at')
  THEN
    RETURN NEW;
  END IF;

  v_entity_id := COALESCE(
    (v_new ->> 'id')::uuid,
    (v_old ->> 'id')::uuid
  );

  v_company_id := COALESCE(
    (v_new ->> 'company_id')::uuid,
    (v_old ->> 'company_id')::uuid
  );

  v_changes := jsonb_build_object(
    'old', v_old,
    'new', v_new
  );

  /*
   * Action
   */
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
  ELSE
    IF (v_old ->> 'deleted_at') IS DISTINCT FROM (v_new ->> 'deleted_at') THEN
      IF v_new ->> 'deleted_at' IS NULL THEN
        v_action := 'restore';
      ELSE
        v_action := 'delete';
      END IF;
    ELSE
      v_action := 'update';
    END IF;
  END IF;

  /*
   * Description
   */
  IF TG_TABLE_NAME = 'orders' THEN

    IF TG_OP = 'INSERT' THEN
      v_description := 'ایجاد سفارش';

    ELSIF TG_OP = 'DELETE' THEN
      v_description := 'حذف سفارش';

    ELSIF (v_old ->> 'status') IS DISTINCT FROM (v_new ->> 'status') THEN
      v_description :=
        format(
          'تغییر وضعیت سفارش: %s → %s',
          COALESCE(v_old ->> 'status', '-'),
          COALESCE(v_new ->> 'status', '-')
        );

    ELSIF (v_old ->> 'total_tonnage') IS DISTINCT FROM (v_new ->> 'total_tonnage') THEN
      v_description := 'تغییر تناژ سفارش';

    ELSIF (v_old ->> 'customer_id') IS DISTINCT FROM (v_new ->> 'customer_id') THEN
      v_description := 'تغییر مشتری سفارش';

    ELSIF (v_old ->> 'sales_user_id') IS DISTINCT FROM (v_new ->> 'sales_user_id') THEN
      v_description := 'تغییر کارشناس فروش سفارش';

    ELSIF (v_old ->> 'order_date') IS DISTINCT FROM (v_new ->> 'order_date') THEN
      v_description := 'تغییر تاریخ سفارش';

    ELSE
      v_description := 'ویرایش سفارش';
    END IF;

  ELSIF TG_TABLE_NAME = 'waybills' THEN

    IF TG_OP = 'INSERT' THEN
      v_description := 'ایجاد حواله';

    ELSIF TG_OP = 'DELETE' THEN
      v_description := 'حذف حواله';

    ELSIF (v_old ->> 'status') IS DISTINCT FROM (v_new ->> 'status') THEN
      v_description :=
        format(
          'تغییر وضعیت حواله: %s → %s',
          COALESCE(v_old ->> 'status', '-'),
          COALESCE(v_new ->> 'status', '-')
        );

    ELSE
      v_description := 'ویرایش حواله';
    END IF;

  ELSIF TG_TABLE_NAME = 'loading' THEN

    IF TG_OP = 'INSERT' THEN
      v_description := 'ایجاد رکورد بارگیری';

    ELSIF TG_OP = 'DELETE' THEN
      v_description := 'حذف بارگیری';

    ELSIF (v_old ->> 'status') IS DISTINCT FROM (v_new ->> 'status') THEN
      v_description :=
        format(
          'تغییر وضعیت بارگیری: %s → %s',
          COALESCE(v_old ->> 'status', '-'),
          COALESCE(v_new ->> 'status', '-')
        );

    ELSIF (v_old ->> 'confirmed_at') IS DISTINCT FROM (v_new ->> 'confirmed_at') THEN
      v_description := 'تغییر زمان تأیید بارگیری';

    ELSE
      v_description := 'ویرایش بارگیری';
    END IF;

  ELSIF TG_TABLE_NAME = 'customers' THEN

    IF TG_OP = 'INSERT' THEN
      v_description := 'ایجاد مشتری';

    ELSIF TG_OP = 'DELETE' THEN
      v_description := 'حذف مشتری';

    ELSIF (v_old ->> 'deleted_at') IS DISTINCT FROM (v_new ->> 'deleted_at') THEN
      IF v_new ->> 'deleted_at' IS NULL THEN
        v_description := 'بازیابی مشتری';
      ELSE
        v_description := 'حذف نرم‌افزاری مشتری';
      END IF;

    ELSE
      v_description := 'ویرایش مشتری';
    END IF;

  ELSIF TG_TABLE_NAME = 'order_items' THEN

    IF TG_OP = 'INSERT' THEN
      v_description := 'ایجاد قلم سفارش';
    ELSIF TG_OP = 'DELETE' THEN
      v_description := 'حذف قلم سفارش';
    ELSE
      v_description := 'ویرایش قلم سفارش';
    END IF;

  ELSIF TG_TABLE_NAME = 'waybill_items' THEN

    IF TG_OP = 'INSERT' THEN
      v_description := 'ایجاد قلم حواله';
    ELSIF TG_OP = 'DELETE' THEN
      v_description := 'حذف قلم حواله';
    ELSE
      v_description := 'ویرایش قلم حواله';
    END IF;

  ELSIF TG_TABLE_NAME = 'monthly_targets' THEN

    IF TG_OP = 'INSERT' THEN
      v_description := 'ایجاد هدف ماهانه';
    ELSIF TG_OP = 'DELETE' THEN
      v_description := 'حذف هدف ماهانه';
    ELSIF (v_old ->> 'target_tonnage') IS DISTINCT FROM (v_new ->> 'target_tonnage') THEN
      v_description := 'تغییر هدف ماهانه';
    ELSE
      v_description := 'ویرایش هدف ماهانه';
    END IF;

  ELSE

    IF TG_OP = 'INSERT' THEN
      v_description := format('ایجاد رکورد %s', TG_TABLE_NAME);
    ELSIF TG_OP = 'DELETE' THEN
      v_description := format('حذف رکورد %s', TG_TABLE_NAME);
    ELSE
      v_description := format('ویرایش رکورد %s', TG_TABLE_NAME);
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
$$;

COMMIT;
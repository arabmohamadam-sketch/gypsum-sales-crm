BEGIN;

-- =============================================================================
-- Gypsum Sales CRM
-- P0: Closed Jalali Months + Loading / Waybill RLS
--
-- Roles:
--   company_admin
--   sales_manager
--   sales_rep
--
-- No warehouse role.
-- =============================================================================


-- =============================================================================
-- 1. CLOSED JALALI MONTHS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.closed_jalali_months (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id uuid NOT NULL
    REFERENCES public.companies (id)
    ON DELETE RESTRICT,

  jalali_year integer NOT NULL,
  jalali_month integer NOT NULL,

  start_date date NOT NULL,
  end_date date NOT NULL,

  closed_at timestamptz NOT NULL
    DEFAULT timezone('utc', now()),

  closed_by uuid
    REFERENCES public.users (id)
    ON DELETE RESTRICT,

  deleted_at timestamptz,

  CONSTRAINT closed_jalali_months_month_valid
    CHECK (jalali_month BETWEEN 1 AND 12),

  CONSTRAINT closed_jalali_months_year_valid
    CHECK (jalali_year >= 1400),

  CONSTRAINT closed_jalali_months_date_range_valid
    CHECK (start_date <= end_date)
);


CREATE UNIQUE INDEX IF NOT EXISTS uq_closed_jalali_month
  ON public.closed_jalali_months (
    company_id,
    jalali_year,
    jalali_month
  )
  WHERE deleted_at IS NULL;


CREATE INDEX IF NOT EXISTS idx_closed_jalali_months_company_dates
  ON public.closed_jalali_months (
    company_id,
    start_date,
    end_date
  )
  WHERE deleted_at IS NULL;


ALTER TABLE public.closed_jalali_months
  ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 2. CLOSED MONTH RLS
-- =============================================================================

DROP POLICY IF EXISTS closed_jalali_months_select
  ON public.closed_jalali_months;

DROP POLICY IF EXISTS closed_jalali_months_insert
  ON public.closed_jalali_months;

DROP POLICY IF EXISTS closed_jalali_months_update
  ON public.closed_jalali_months;

DROP POLICY IF EXISTS closed_jalali_months_delete
  ON public.closed_jalali_months;


CREATE POLICY closed_jalali_months_select
  ON public.closed_jalali_months
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_company_role(
        company_id,
        'sales_manager'
      )
    )
  );


CREATE POLICY closed_jalali_months_insert
  ON public.closed_jalali_months
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_company_role(
        company_id,
        'sales_manager'
      )
    )
  );


CREATE POLICY closed_jalali_months_update
  ON public.closed_jalali_months
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_company_role(
        company_id,
        'sales_manager'
      )
    )
  )
  WITH CHECK (
    company_id = public.auth_user_company_id()
  );


CREATE POLICY closed_jalali_months_delete
  ON public.closed_jalali_months
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_company_role(
        company_id,
        'sales_manager'
      )
    )
  );


-- =============================================================================
-- 3. WAYBILL ACCESS HELPER
--
-- Waybill scope follows:
-- waybill -> order -> customer
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auth_user_can_access_waybill(
  p_company_id uuid,
  p_waybill_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.waybills w
    JOIN public.orders o
      ON o.id = w.order_id
     AND o.company_id = w.company_id
    WHERE w.id = p_waybill_id
      AND w.company_id = p_company_id
      AND w.deleted_at IS NULL
      AND o.deleted_at IS NULL
      AND public.auth_user_can_access_customer(
        o.company_id,
        o.customer_id
      )
  );
$function$;


-- =============================================================================
-- 4. WAYBILLS RLS
-- =============================================================================

DROP POLICY IF EXISTS waybills_company_isolation
  ON public.waybills;

DROP POLICY IF EXISTS waybills_select_scoped
  ON public.waybills;

DROP POLICY IF EXISTS waybills_insert_scoped
  ON public.waybills;

DROP POLICY IF EXISTS waybills_update_scoped
  ON public.waybills;

DROP POLICY IF EXISTS waybills_delete_scoped
  ON public.waybills;


CREATE POLICY waybills_select_scoped
  ON public.waybills
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = waybills.order_id
        AND o.company_id = waybills.company_id
        AND o.deleted_at IS NULL
        AND public.auth_user_can_access_customer(
          o.company_id,
          o.customer_id
        )
    )
  );


CREATE POLICY waybills_insert_scoped
  ON public.waybills
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_company_role(
        company_id,
        'sales_manager'
      )
      OR (
        public.auth_user_has_company_role(
          company_id,
          'sales_rep'
        )
        AND EXISTS (
          SELECT 1
          FROM public.orders o
          WHERE o.id = waybills.order_id
            AND o.company_id = waybills.company_id
            AND o.deleted_at IS NULL
            AND public.auth_user_can_access_customer(
              o.company_id,
              o.customer_id
            )
        )
      )
    )
  );


CREATE POLICY waybills_update_scoped
  ON public.waybills
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_company_role(
        company_id,
        'sales_manager'
      )
      OR (
        public.auth_user_has_company_role(
          company_id,
          'sales_rep'
        )
        AND EXISTS (
          SELECT 1
          FROM public.orders o
          WHERE o.id = waybills.order_id
            AND o.company_id = waybills.company_id
            AND o.deleted_at IS NULL
            AND public.auth_user_can_access_customer(
              o.company_id,
              o.customer_id
            )
        )
      )
    )
  )
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_company_role(
        company_id,
        'sales_manager'
      )
      OR (
        public.auth_user_has_company_role(
          company_id,
          'sales_rep'
        )
        AND EXISTS (
          SELECT 1
          FROM public.orders o
          WHERE o.id = waybills.order_id
            AND o.company_id = waybills.company_id
            AND o.deleted_at IS NULL
            AND public.auth_user_can_access_customer(
              o.company_id,
              o.customer_id
            )
        )
      )
    )
  );


CREATE POLICY waybills_delete_scoped
  ON public.waybills
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_company_role(
        company_id,
        'sales_manager'
      )
      OR (
        public.auth_user_has_company_role(
          company_id,
          'sales_rep'
        )
        AND EXISTS (
          SELECT 1
          FROM public.orders o
          WHERE o.id = waybills.order_id
            AND o.company_id = waybills.company_id
            AND o.deleted_at IS NULL
            AND public.auth_user_can_access_customer(
              o.company_id,
              o.customer_id
            )
        )
      )
    )
  );


-- =============================================================================
-- 5. WAYBILL ITEMS RLS
-- =============================================================================

DROP POLICY IF EXISTS waybill_items_company_isolation
  ON public.waybill_items;

DROP POLICY IF EXISTS waybill_items_select_scoped
  ON public.waybill_items;

DROP POLICY IF EXISTS waybill_items_insert_scoped
  ON public.waybill_items;

DROP POLICY IF EXISTS waybill_items_update_scoped
  ON public.waybill_items;

DROP POLICY IF EXISTS waybill_items_delete_scoped
  ON public.waybill_items;


CREATE POLICY waybill_items_select_scoped
  ON public.waybill_items
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND public.auth_user_can_access_waybill(
      company_id,
      waybill_id
    )
  );


CREATE POLICY waybill_items_insert_scoped
  ON public.waybill_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_company_role(
        company_id,
        'sales_manager'
      )
      OR (
        public.auth_user_has_company_role(
          company_id,
          'sales_rep'
        )
        AND public.auth_user_can_access_waybill(
          company_id,
          waybill_id
        )
      )
    )
  );


CREATE POLICY waybill_items_update_scoped
  ON public.waybill_items
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_company_role(
        company_id,
        'sales_manager'
      )
      OR (
        public.auth_user_has_company_role(
          company_id,
          'sales_rep'
        )
        AND public.auth_user_can_access_waybill(
          company_id,
          waybill_id
        )
      )
    )
  )
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND public.auth_user_can_access_waybill(
      company_id,
      waybill_id
    )
  );


CREATE POLICY waybill_items_delete_scoped
  ON public.waybill_items
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_company_role(
        company_id,
        'sales_manager'
      )
      OR (
        public.auth_user_has_company_role(
          company_id,
          'sales_rep'
        )
        AND public.auth_user_can_access_waybill(
          company_id,
          waybill_id
        )
      )
    )
  );


-- =============================================================================
-- 6. LOADING RLS
--
-- sales_rep:
--   SELECT only
--
-- sales_manager / company_admin:
--   SELECT / INSERT / UPDATE / DELETE
-- =============================================================================

DROP POLICY IF EXISTS loading_company_isolation
  ON public.loading;

DROP POLICY IF EXISTS loading_select
  ON public.loading;

DROP POLICY IF EXISTS loading_insert
  ON public.loading;

DROP POLICY IF EXISTS loading_update
  ON public.loading;

DROP POLICY IF EXISTS loading_delete
  ON public.loading;


CREATE POLICY loading_select
  ON public.loading
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND public.auth_user_can_access_waybill(
      company_id,
      waybill_id
    )
  );


CREATE POLICY loading_insert
  ON public.loading
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_company_role(
        company_id,
        'sales_manager'
      )
    )
    AND public.auth_user_can_access_waybill(
      company_id,
      waybill_id
    )
  );


CREATE POLICY loading_update
  ON public.loading
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_company_role(
        company_id,
        'sales_manager'
      )
    )
    AND public.auth_user_can_access_waybill(
      company_id,
      waybill_id
    )
  )
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_company_role(
        company_id,
        'sales_manager'
      )
    )
    AND public.auth_user_can_access_waybill(
      company_id,
      waybill_id
    )
  );


CREATE POLICY loading_delete
  ON public.loading
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_company_role(
        company_id,
        'sales_manager'
      )
    )
  );


-- =============================================================================
-- 7. CLOSED-MONTH PROTECTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_loading_changes_in_closed_month()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN

  IF TG_OP = 'INSERT' THEN

    IF NEW.loading_date IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM public.closed_jalali_months cm
         WHERE cm.company_id = NEW.company_id
           AND cm.deleted_at IS NULL
           AND NEW.loading_date BETWEEN cm.start_date AND cm.end_date
       )
    THEN
      RAISE EXCEPTION
        'Loading date % belongs to a closed Jalali month',
        NEW.loading_date;
    END IF;

    RETURN NEW;
  END IF;


  IF TG_OP = 'UPDATE' THEN

    IF OLD.loading_date IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM public.closed_jalali_months cm
         WHERE cm.company_id = OLD.company_id
           AND cm.deleted_at IS NULL
           AND OLD.loading_date BETWEEN cm.start_date AND cm.end_date
       )
    THEN
      RAISE EXCEPTION
        'Loading record belongs to a closed Jalali month and cannot be changed';
    END IF;


    IF NEW.loading_date IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM public.closed_jalali_months cm
         WHERE cm.company_id = NEW.company_id
           AND cm.deleted_at IS NULL
           AND NEW.loading_date BETWEEN cm.start_date AND cm.end_date
       )
    THEN
      RAISE EXCEPTION
        'Loading date % belongs to a closed Jalali month',
        NEW.loading_date;
    END IF;


    IF OLD.status = 'confirmed' THEN

      IF NEW.status IS DISTINCT FROM OLD.status
         OR NEW.loading_date IS DISTINCT FROM OLD.loading_date
         OR NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at
         OR NEW.confirmed_by IS DISTINCT FROM OLD.confirmed_by
      THEN
        RAISE EXCEPTION
          'Confirmed loading cannot change status, loading date, confirmed_at or confirmed_by';
      END IF;

    END IF;

    RETURN NEW;
  END IF;


  RETURN NEW;
END;
$function$;


DROP TRIGGER IF EXISTS trg_prevent_loading_changes_in_closed_month
  ON public.loading;


CREATE TRIGGER trg_prevent_loading_changes_in_closed_month
  BEFORE INSERT OR UPDATE ON public.loading
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_loading_changes_in_closed_month();


-- =============================================================================
-- 8. PRESERVE AUTOMATIC LOADING CREATION
--
-- Existing business logic is preserved:
-- waybill status = issued
--       ->
-- loading status = pending
--
-- SECURITY DEFINER prevents the tightened loading INSERT policy from
-- blocking this internal trigger operation.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.ensure_loading_for_issued_waybill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN

  IF NEW.status = 'issued'
     AND NEW.deleted_at IS NULL
  THEN

    INSERT INTO public.loading (
      company_id,
      waybill_id,
      status,
      loading_date
    )
    VALUES (
      NEW.company_id,
      NEW.id,
      'pending',
      NEW.waybill_date
    )
    ON CONFLICT (
      company_id,
      waybill_id
    )
    WHERE deleted_at IS NULL
    DO NOTHING;

  END IF;

  RETURN NEW;
END;
$function$;


DROP TRIGGER IF EXISTS trg_create_loading_on_waybill_issue
  ON public.waybills;


CREATE TRIGGER trg_create_loading_on_waybill_issue
  AFTER INSERT OR UPDATE OF status ON public.waybills
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_loading_for_issued_waybill();


-- =============================================================================
-- 9. COMMENTS
-- =============================================================================

COMMENT ON TABLE public.closed_jalali_months IS
  'Closed Jalali months during which loading records cannot be created or changed.';

COMMENT ON FUNCTION public.auth_user_can_access_waybill(uuid, uuid) IS
  'Checks whether the authenticated user may access a waybill through its order customer scope.';

COMMENT ON FUNCTION public.prevent_loading_changes_in_closed_month() IS
  'Prevents loading changes in closed Jalali months and protects confirmed loading fields.';


COMMIT;
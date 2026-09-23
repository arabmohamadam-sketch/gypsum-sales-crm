BEGIN;

-- ============================================================
-- FIX ORDERS RLS
-- استفاده از helper مرکزی دسترسی مشتری به جای
-- خواندن مستقیم customers داخل policy
-- ============================================================

DROP POLICY IF EXISTS orders_select_scoped
  ON public.orders;

DROP POLICY IF EXISTS orders_insert_scoped
  ON public.orders;

DROP POLICY IF EXISTS orders_update_scoped
  ON public.orders;

DROP POLICY IF EXISTS orders_delete_scoped
  ON public.orders;


-- ============================================================
-- SELECT
-- ============================================================

CREATE POLICY orders_select_scoped
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND (
      public.auth_user_is_admin()

      OR public.auth_user_has_company_role(
        company_id,
        'company_admin'
      )

      OR public.auth_user_has_company_role(
        company_id,
        'sales_manager'
      )

      OR (
        sales_user_id = auth.uid()
        AND public.auth_user_can_access_customer(
          company_id,
          customer_id
        )
      )
    )
  );


-- ============================================================
-- INSERT
-- ============================================================

CREATE POLICY orders_insert_scoped
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND (
      public.auth_user_is_admin()

      OR public.auth_user_has_company_role(
        company_id,
        'company_admin'
      )

      OR public.auth_user_has_company_role(
        company_id,
        'sales_manager'
      )

      OR (
        sales_user_id = auth.uid()
        AND public.auth_user_can_access_customer(
          company_id,
          customer_id
        )
      )
    )
  );


-- ============================================================
-- UPDATE
-- ============================================================

CREATE POLICY orders_update_scoped
  ON public.orders
  FOR UPDATE
  TO authenticated

  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND (
      public.auth_user_is_admin()

      OR public.auth_user_has_company_role(
        company_id,
        'company_admin'
      )

      OR public.auth_user_has_company_role(
        company_id,
        'sales_manager'
      )

      OR (
        sales_user_id = auth.uid()
        AND public.auth_user_can_access_customer(
          company_id,
          customer_id
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
        'company_admin'
      )

      OR public.auth_user_has_company_role(
        company_id,
        'sales_manager'
      )

      OR (
        sales_user_id = auth.uid()
        AND public.auth_user_can_access_customer(
          company_id,
          customer_id
        )
      )
    )
  );


-- ============================================================
-- DELETE
-- ============================================================

CREATE POLICY orders_delete_scoped
  ON public.orders
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND (
      public.auth_user_is_admin()

      OR public.auth_user_has_company_role(
        company_id,
        'company_admin'
      )

      OR public.auth_user_has_company_role(
        company_id,
        'sales_manager'
      )

      OR (
        sales_user_id = auth.uid()
        AND public.auth_user_can_access_customer(
          company_id,
          customer_id
        )
      )
    )
  );

COMMIT;
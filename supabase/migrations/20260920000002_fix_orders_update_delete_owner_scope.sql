BEGIN;

-- ============================================================
-- ORDERS UPDATE / DELETE
-- مبنای دسترسی:
--   مدیر کل / مدیر فروش -> کل سفارش‌های شرکت
--   بازاریاب -> سفارش‌هایی که خودش ثبت کرده
--
-- برای UPDATE / DELETE دیگر customer-scope را دوباره
-- داخل policy بررسی نمی‌کنیم.
-- ============================================================


DROP POLICY IF EXISTS orders_update_scoped
  ON public.orders;

DROP POLICY IF EXISTS orders_delete_scoped
  ON public.orders;


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

      OR sales_user_id = auth.uid()
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

      OR sales_user_id = auth.uid()
    )
  );


-- ============================================================
-- DELETE / SOFT DELETE
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

      OR sales_user_id = auth.uid()
    )
  );

COMMIT;
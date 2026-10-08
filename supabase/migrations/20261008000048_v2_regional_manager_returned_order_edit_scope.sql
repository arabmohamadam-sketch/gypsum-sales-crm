BEGIN;

-- ============================================================
-- V2 ORDER EDIT SCOPE FOR REGIONAL MANAGERS
--
-- مدیر منطقه فقط سفارش‌های V2 مربوط به مشتریان منطقه خودش را
-- در وضعیت draft و قبل از ارسال مجدد برای تأیید می‌تواند ویرایش کند.
--
-- V1 عمداً خارج از این شاخه است و رفتار قبلی آن دست‌نخورده می‌ماند.
--
-- وضعیت‌های قابل ویرایش:
--   approval_status IS NULL -> پیش‌نویس اولیه V2
--   approval_status = returned -> برگشت برای اصلاح
--   approval_status = rejected -> رد شده و نیازمند اصلاح
--
-- وضعیت pending/approved/cancelled قابل ویرایش توسط این شاخه نیست.
-- ============================================================

DROP POLICY IF EXISTS orders_update_scoped
  ON public.orders;

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

      OR (
        public.auth_user_has_company_role(
          company_id,
          'regional_manager'
        )
        AND workflow_version = 'v2'
        AND status = 'draft'
        AND (
          approval_status IS NULL
          OR approval_status IN (
            'returned',
            'rejected'
          )
        )
        AND EXISTS (
          SELECT 1
          FROM public.customers AS customer
          WHERE customer.id = orders.customer_id
            AND customer.company_id = orders.company_id
            AND customer.regional_manager_id = auth.uid()
            AND customer.deleted_at IS NULL
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

      OR sales_user_id = auth.uid()

      OR (
        public.auth_user_has_company_role(
          company_id,
          'regional_manager'
        )
        AND workflow_version = 'v2'
        AND status = 'draft'
        AND (
          approval_status IS NULL
          OR approval_status IN (
            'returned',
            'rejected'
          )
        )
        AND EXISTS (
          SELECT 1
          FROM public.customers AS customer
          WHERE customer.id = orders.customer_id
            AND customer.company_id = orders.company_id
            AND customer.regional_manager_id = auth.uid()
            AND customer.deleted_at IS NULL
        )
      )
    )
  );

COMMIT;
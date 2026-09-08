BEGIN;

-- ============================================================
-- SALES REP ACTIVITY OWNER LOCK
--
-- Sales Rep:
--   - can update/delete only own activities
--   - cannot transfer activity ownership to another user
--
-- Company Admin / Sales Manager:
--   - retain management access
-- ============================================================


-- ============================================================
-- 1) CALLS
-- ============================================================

DROP POLICY IF EXISTS calls_update_scoped
  ON public.calls;

CREATE POLICY calls_update_scoped
  ON public.calls
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND public.auth_user_can_access_customer(
      company_id,
      customer_id
    )
    AND (
      user_id = auth.uid()
      OR public.auth_user_is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r
          ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
          AND ur.deleted_at IS NULL
          AND r.deleted_at IS NULL
          AND r.company_id = public.auth_user_company_id()
          AND r.slug IN ('company_admin', 'sales_manager')
          AND r.is_active = true
      )
    )
  )
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND public.auth_user_can_access_customer(
      company_id,
      customer_id
    )
    AND (
      user_id = auth.uid()
      OR public.auth_user_is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r
          ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
          AND ur.deleted_at IS NULL
          AND r.deleted_at IS NULL
          AND r.company_id = public.auth_user_company_id()
          AND r.slug IN ('company_admin', 'sales_manager')
          AND r.is_active = true
      )
    )
  );


-- ============================================================
-- 2) FOLLOW UPS
-- ============================================================

DROP POLICY IF EXISTS follow_ups_update_scoped
  ON public.follow_ups;

CREATE POLICY follow_ups_update_scoped
  ON public.follow_ups
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND public.auth_user_can_access_customer(
      company_id,
      customer_id
    )
    AND (
      user_id = auth.uid()
      OR public.auth_user_is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r
          ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
          AND ur.deleted_at IS NULL
          AND r.deleted_at IS NULL
          AND r.company_id = public.auth_user_company_id()
          AND r.slug IN ('company_admin', 'sales_manager')
          AND r.is_active = true
      )
    )
  )
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND public.auth_user_can_access_customer(
      company_id,
      customer_id
    )
    AND (
      user_id = auth.uid()
      OR public.auth_user_is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r
          ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
          AND ur.deleted_at IS NULL
          AND r.deleted_at IS NULL
          AND r.company_id = public.auth_user_company_id()
          AND r.slug IN ('company_admin', 'sales_manager')
          AND r.is_active = true
      )
    )
  );


-- ============================================================
-- 3) CUSTOMER VISITS
-- ============================================================

DROP POLICY IF EXISTS customer_visits_update_scoped
  ON public.customer_visits;

CREATE POLICY customer_visits_update_scoped
  ON public.customer_visits
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND public.auth_user_can_access_customer(
      company_id,
      customer_id
    )
    AND (
      user_id = auth.uid()
      OR public.auth_user_is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r
          ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
          AND ur.deleted_at IS NULL
          AND r.deleted_at IS NULL
          AND r.company_id = public.auth_user_company_id()
          AND r.slug IN ('company_admin', 'sales_manager')
          AND r.is_active = true
      )
    )
  )
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND public.auth_user_can_access_customer(
      company_id,
      customer_id
    )
    AND (
      user_id = auth.uid()
      OR public.auth_user_is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r
          ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
          AND ur.deleted_at IS NULL
          AND r.deleted_at IS NULL
          AND r.company_id = public.auth_user_company_id()
          AND r.slug IN ('company_admin', 'sales_manager')
          AND r.is_active = true
      )
    )
  );

COMMIT;
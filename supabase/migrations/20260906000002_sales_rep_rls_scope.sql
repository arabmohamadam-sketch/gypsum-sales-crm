BEGIN;

-- ============================================================
-- SALES REP RLS — CUSTOMERS
-- ============================================================

DROP POLICY IF EXISTS customers_company_isolation
  ON public.customers;

-- -------------------------
-- SELECT
-- -------------------------
CREATE POLICY customers_select_scoped
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND (
      -- Admin / manager: whole company
      public.auth_user_is_admin()

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

      -- Sales rep:
      -- assigned customers OR unassigned customers
      -- inside a region assigned to the rep
      OR (
        EXISTS (
          SELECT 1
          FROM public.user_roles ur
          JOIN public.roles r
            ON r.id = ur.role_id
          WHERE ur.user_id = auth.uid()
            AND ur.deleted_at IS NULL
            AND r.id = ur.role_id
            AND r.deleted_at IS NULL
            AND r.company_id = public.auth_user_company_id()
            AND r.slug = 'sales_rep'
            AND r.is_active = true
        )
        AND (
          customers.assigned_user_id = auth.uid()

          OR (
            customers.assigned_user_id IS NULL
            AND EXISTS (
              SELECT 1
              FROM public.cities city
              JOIN public.user_regions usr
                ON usr.region_id = city.region_id
               AND usr.company_id = city.company_id
               AND usr.user_id = auth.uid()
               AND usr.deleted_at IS NULL
              WHERE city.id = customers.city_id
                AND city.company_id = customers.company_id
                AND city.deleted_at IS NULL
            )
          )
        )
      )
    )
  );

-- -------------------------
-- INSERT
-- -------------------------
CREATE POLICY customers_insert_scoped
  ON public.customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND (
      public.auth_user_is_admin()

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

      OR (
        EXISTS (
          SELECT 1
          FROM public.user_roles ur
          JOIN public.roles r
            ON r.id = ur.role_id
          WHERE ur.user_id = auth.uid()
            AND ur.deleted_at IS NULL
            AND r.deleted_at IS NULL
            AND r.company_id = public.auth_user_company_id()
            AND r.slug = 'sales_rep'
            AND r.is_active = true
        )
        AND assigned_user_id = auth.uid()
      )
    )
  );

-- -------------------------
-- UPDATE
-- -------------------------
CREATE POLICY customers_update_scoped
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND (
      public.auth_user_is_admin()

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

      OR assigned_user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND (
      public.auth_user_is_admin()

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

      OR assigned_user_id = auth.uid()
    )
  );

-- -------------------------
-- DELETE
-- -------------------------
CREATE POLICY customers_delete_scoped
  ON public.customers
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND (
      public.auth_user_is_admin()

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

      OR assigned_user_id = auth.uid()
    )
  );

-- ============================================================
-- SALES REP RLS — ORDERS
-- ============================================================

DROP POLICY IF EXISTS orders_company_isolation
  ON public.orders;

-- -------------------------
-- SELECT
-- -------------------------
CREATE POLICY orders_select_scoped
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND (
      public.auth_user_is_admin()

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

      OR sales_user_id = auth.uid()
    )
  );

-- -------------------------
-- INSERT
-- -------------------------
CREATE POLICY orders_insert_scoped
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND (
      public.auth_user_is_admin()

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

      OR sales_user_id = auth.uid()
    )
  );

-- -------------------------
-- UPDATE
-- -------------------------
CREATE POLICY orders_update_scoped
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND (
      public.auth_user_is_admin()

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

      OR sales_user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND (
      public.auth_user_is_admin()

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

      OR sales_user_id = auth.uid()
    )
  );

-- -------------------------
-- DELETE
-- -------------------------
CREATE POLICY orders_delete_scoped
  ON public.orders
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND (
      public.auth_user_is_admin()

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

      OR sales_user_id = auth.uid()
    )
  );

COMMIT;
-- =============================================================================
-- Gypsum Sales CRM — Finalize sales representative security scope
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1) Remove legacy public customer policies
-- =============================================================================

DROP POLICY IF EXISTS customers_public_read_company
  ON public.customers;

DROP POLICY IF EXISTS customers_anon_insert_company
  ON public.customers;

DROP POLICY IF EXISTS customers_anon_update_company
  ON public.customers;


-- =============================================================================
-- 2) Secure user_regions
-- =============================================================================

ALTER TABLE public.user_regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_regions_select_own
  ON public.user_regions;

CREATE POLICY user_regions_select_own
  ON public.user_regions
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
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
          AND r.slug = 'sales_manager'::citext
          AND r.is_active = true
      )
    )
    AND deleted_at IS NULL
  );


-- =============================================================================
-- 3) Orders must also respect customer scope
-- =============================================================================

DROP POLICY IF EXISTS orders_select_scoped
  ON public.orders;

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
          AND r.slug IN (
            'company_admin'::citext,
            'sales_manager'::citext
          )
          AND r.is_active = true
      )

      OR (
        sales_user_id = auth.uid()
        AND EXISTS (
          SELECT 1
          FROM public.customers c
          WHERE c.id = orders.customer_id
            AND c.company_id = orders.company_id
            AND c.deleted_at IS NULL
        )
      )
    )
  );


DROP POLICY IF EXISTS orders_insert_scoped
  ON public.orders;

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
          AND r.slug IN (
            'company_admin'::citext,
            'sales_manager'::citext
          )
          AND r.is_active = true
      )

      OR (
        sales_user_id = auth.uid()
        AND EXISTS (
          SELECT 1
          FROM public.customers c
          WHERE c.id = orders.customer_id
            AND c.company_id = orders.company_id
            AND c.deleted_at IS NULL
        )
      )
    )
  );


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

      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r
          ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
          AND ur.deleted_at IS NULL
          AND r.deleted_at IS NULL
          AND r.company_id = public.auth_user_company_id()
          AND r.slug IN (
            'company_admin'::citext,
            'sales_manager'::citext
          )
          AND r.is_active = true
      )

      OR (
        sales_user_id = auth.uid()
        AND EXISTS (
          SELECT 1
          FROM public.customers c
          WHERE c.id = orders.customer_id
            AND c.company_id = orders.company_id
            AND c.deleted_at IS NULL
        )
      )
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
          AND r.slug IN (
            'company_admin'::citext,
            'sales_manager'::citext
          )
          AND r.is_active = true
      )

      OR (
        sales_user_id = auth.uid()
        AND EXISTS (
          SELECT 1
          FROM public.customers c
          WHERE c.id = orders.customer_id
            AND c.company_id = orders.company_id
            AND c.deleted_at IS NULL
        )
      )
    )
  );


DROP POLICY IF EXISTS orders_delete_scoped
  ON public.orders;

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
          AND r.slug IN (
            'company_admin'::citext,
            'sales_manager'::citext
          )
          AND r.is_active = true
      )

      OR (
        sales_user_id = auth.uid()
        AND EXISTS (
          SELECT 1
          FROM public.customers c
          WHERE c.id = orders.customer_id
            AND c.company_id = orders.company_id
            AND c.deleted_at IS NULL
        )
      )
    )
  );

COMMIT;
BEGIN;

-- =============================================================================
-- 1) USER ↔ REGION MANAGEMENT
--    Sales reps can read their own assignments only.
--    Company admin / sales manager can manage assignments.
-- =============================================================================

DROP POLICY IF EXISTS user_regions_insert_admin_manager
  ON public.user_regions;

DROP POLICY IF EXISTS user_regions_update_admin_manager
  ON public.user_regions;

DROP POLICY IF EXISTS user_regions_delete_admin_manager
  ON public.user_regions;

CREATE POLICY user_regions_insert_admin_manager
  ON public.user_regions
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
    )
  );

CREATE POLICY user_regions_update_admin_manager
  ON public.user_regions
  FOR UPDATE
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
    )
  )
  WITH CHECK (
    company_id = public.auth_user_company_id()
  );

CREATE POLICY user_regions_delete_admin_manager
  ON public.user_regions
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
    )
  );


-- =============================================================================
-- 2) CUSTOMER CONTACTS
-- =============================================================================

DROP POLICY IF EXISTS customer_contacts_company_isolation
  ON public.customer_contacts;

DROP POLICY IF EXISTS customer_contacts_select_scoped
  ON public.customer_contacts;

DROP POLICY IF EXISTS customer_contacts_insert_scoped
  ON public.customer_contacts;

DROP POLICY IF EXISTS customer_contacts_update_scoped
  ON public.customer_contacts;

DROP POLICY IF EXISTS customer_contacts_delete_scoped
  ON public.customer_contacts;

CREATE POLICY customer_contacts_select_scoped
  ON public.customer_contacts
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

      OR EXISTS (
        SELECT 1
        FROM public.customers c
        WHERE c.id = customer_contacts.customer_id
          AND c.company_id = customer_contacts.company_id
          AND c.deleted_at IS NULL
      )
    )
  );

CREATE POLICY customer_contacts_insert_scoped
  ON public.customer_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = customer_contacts.customer_id
        AND c.company_id = customer_contacts.company_id
        AND c.deleted_at IS NULL
    )
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

      OR EXISTS (
        SELECT 1
        FROM public.customers c
        WHERE c.id = customer_contacts.customer_id
          AND c.assigned_user_id = auth.uid()
          AND c.company_id = customer_contacts.company_id
          AND c.deleted_at IS NULL
      )
    )
  );

CREATE POLICY customer_contacts_update_scoped
  ON public.customer_contacts
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

      OR EXISTS (
        SELECT 1
        FROM public.customers c
        WHERE c.id = customer_contacts.customer_id
          AND c.assigned_user_id = auth.uid()
          AND c.company_id = customer_contacts.company_id
          AND c.deleted_at IS NULL
      )
    )
  )
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = customer_contacts.customer_id
        AND c.company_id = customer_contacts.company_id
        AND c.deleted_at IS NULL
    )
  );

CREATE POLICY customer_contacts_delete_scoped
  ON public.customer_contacts
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

      OR EXISTS (
        SELECT 1
        FROM public.customers c
        WHERE c.id = customer_contacts.customer_id
          AND c.assigned_user_id = auth.uid()
          AND c.company_id = customer_contacts.company_id
          AND c.deleted_at IS NULL
      )
    )
  );


-- =============================================================================
-- 3) CUSTOMER ADDRESSES
-- =============================================================================

DROP POLICY IF EXISTS customer_addresses_company_isolation
  ON public.customer_addresses;

DROP POLICY IF EXISTS customer_addresses_select_scoped
  ON public.customer_addresses;

DROP POLICY IF EXISTS customer_addresses_insert_scoped
  ON public.customer_addresses;

DROP POLICY IF EXISTS customer_addresses_update_scoped
  ON public.customer_addresses;

DROP POLICY IF EXISTS customer_addresses_delete_scoped
  ON public.customer_addresses;

CREATE POLICY customer_addresses_select_scoped
  ON public.customer_addresses
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

      OR EXISTS (
        SELECT 1
        FROM public.customers c
        WHERE c.id = customer_addresses.customer_id
          AND c.company_id = customer_addresses.company_id
          AND c.deleted_at IS NULL
      )
    )
  );

CREATE POLICY customer_addresses_insert_scoped
  ON public.customer_addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = customer_addresses.customer_id
        AND c.company_id = customer_addresses.company_id
        AND c.deleted_at IS NULL
        AND (
          public.auth_user_is_admin()
          OR c.assigned_user_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.user_regions ur
            JOIN public.cities ci
              ON ci.id = c.city_id
            WHERE ur.user_id = auth.uid()
              AND ur.company_id = c.company_id
              AND ur.region_id = ci.region_id
              AND ur.deleted_at IS NULL
          )
        )
    )
  );

CREATE POLICY customer_addresses_update_scoped
  ON public.customer_addresses
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = customer_addresses.customer_id
        AND c.company_id = customer_addresses.company_id
        AND c.deleted_at IS NULL
        AND (
          public.auth_user_is_admin()
          OR c.assigned_user_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.user_regions ur
            JOIN public.cities ci
              ON ci.id = c.city_id
            WHERE ur.user_id = auth.uid()
              AND ur.company_id = c.company_id
              AND ur.region_id = ci.region_id
              AND ur.deleted_at IS NULL
          )
        )
    )
  )
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = customer_addresses.customer_id
        AND c.company_id = customer_addresses.company_id
        AND c.deleted_at IS NULL
    )
  );

CREATE POLICY customer_addresses_delete_scoped
  ON public.customer_addresses
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = customer_addresses.customer_id
        AND c.company_id = customer_addresses.company_id
        AND c.deleted_at IS NULL
        AND (
          public.auth_user_is_admin()
          OR c.assigned_user_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.user_regions ur
            JOIN public.cities ci
              ON ci.id = c.city_id
            WHERE ur.user_id = auth.uid()
              AND ur.company_id = c.company_id
              AND ur.region_id = ci.region_id
              AND ur.deleted_at IS NULL
          )
        )
    )
  );


-- =============================================================================
-- 4) CALLS
-- =============================================================================

DROP POLICY IF EXISTS calls_company_isolation
  ON public.calls;

DROP POLICY IF EXISTS calls_select_scoped
  ON public.calls;

DROP POLICY IF EXISTS calls_insert_scoped
  ON public.calls;

DROP POLICY IF EXISTS calls_update_scoped
  ON public.calls;

DROP POLICY IF EXISTS calls_delete_scoped
  ON public.calls;

CREATE POLICY calls_select_scoped
  ON public.calls
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND (
      public.auth_user_is_admin()

      OR user_id = auth.uid()

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
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = calls.customer_id
        AND c.company_id = calls.company_id
        AND c.deleted_at IS NULL
    )
  );

CREATE POLICY calls_insert_scoped
  ON public.calls
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = calls.customer_id
        AND c.company_id = calls.company_id
        AND c.deleted_at IS NULL
    )
  );

CREATE POLICY calls_update_scoped
  ON public.calls
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
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
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = calls.customer_id
        AND c.company_id = calls.company_id
        AND c.deleted_at IS NULL
    )
  )
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = calls.customer_id
        AND c.company_id = calls.company_id
        AND c.deleted_at IS NULL
    )
  );

CREATE POLICY calls_delete_scoped
  ON public.calls
  FOR DELETE
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
          AND r.slug IN ('company_admin', 'sales_manager')
          AND r.is_active = true
      )
    )
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = calls.customer_id
        AND c.company_id = calls.company_id
        AND c.deleted_at IS NULL
    )
  );


-- =============================================================================
-- 5) FOLLOW UPS
-- =============================================================================

DROP POLICY IF EXISTS follow_ups_company_isolation
  ON public.follow_ups;

DROP POLICY IF EXISTS follow_ups_select_scoped
  ON public.follow_ups;

DROP POLICY IF EXISTS follow_ups_insert_scoped
  ON public.follow_ups;

DROP POLICY IF EXISTS follow_ups_update_scoped
  ON public.follow_ups;

DROP POLICY IF EXISTS follow_ups_delete_scoped
  ON public.follow_ups;

CREATE POLICY follow_ups_select_scoped
  ON public.follow_ups
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
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
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = follow_ups.customer_id
        AND c.company_id = follow_ups.company_id
        AND c.deleted_at IS NULL
    )
  );

CREATE POLICY follow_ups_insert_scoped
  ON public.follow_ups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = follow_ups.customer_id
        AND c.company_id = follow_ups.company_id
        AND c.deleted_at IS NULL
    )
  );

CREATE POLICY follow_ups_update_scoped
  ON public.follow_ups
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
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
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = follow_ups.customer_id
        AND c.company_id = follow_ups.company_id
        AND c.deleted_at IS NULL
    )
  )
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = follow_ups.customer_id
        AND c.company_id = follow_ups.company_id
        AND c.deleted_at IS NULL
    )
  );

CREATE POLICY follow_ups_delete_scoped
  ON public.follow_ups
  FOR DELETE
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
          AND r.company_id = public.auth_user_company_id()
          AND r.slug IN ('company_admin', 'sales_manager')
          AND r.is_active = true
      )
    )
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = follow_ups.customer_id
        AND c.company_id = follow_ups.company_id
        AND c.deleted_at IS NULL
    )
  );


-- =============================================================================
-- 6) CUSTOMER VISITS
-- =============================================================================

DROP POLICY IF EXISTS customer_visits_company_isolation
  ON public.customer_visits;

DROP POLICY IF EXISTS customer_visits_select_scoped
  ON public.customer_visits;

DROP POLICY IF EXISTS customer_visits_insert_scoped
  ON public.customer_visits;

DROP POLICY IF EXISTS customer_visits_update_scoped
  ON public.customer_visits;

DROP POLICY IF EXISTS customer_visits_delete_scoped
  ON public.customer_visits;

CREATE POLICY customer_visits_select_scoped
  ON public.customer_visits
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
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
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = customer_visits.customer_id
        AND c.company_id = customer_visits.company_id
        AND c.deleted_at IS NULL
    )
  );

CREATE POLICY customer_visits_insert_scoped
  ON public.customer_visits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = customer_visits.customer_id
        AND c.company_id = customer_visits.company_id
        AND c.deleted_at IS NULL
    )
  );

CREATE POLICY customer_visits_update_scoped
  ON public.customer_visits
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
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
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = customer_visits.customer_id
        AND c.company_id = customer_visits.company_id
        AND c.deleted_at IS NULL
    )
  );

CREATE POLICY customer_visits_delete_scoped
  ON public.customer_visits
  FOR DELETE
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
          AND r.company_id = public.auth_user_company_id()
          AND r.slug IN ('company_admin', 'sales_manager')
          AND r.is_active = true
      )
    )
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = customer_visits.customer_id
        AND c.company_id = customer_visits.company_id
        AND c.deleted_at IS NULL
    )
  );


-- =============================================================================
-- 7) MONTHLY TARGETS
-- =============================================================================

DROP POLICY IF EXISTS monthly_targets_company_isolation
  ON public.monthly_targets;

DROP POLICY IF EXISTS monthly_targets_select_scoped
  ON public.monthly_targets;

DROP POLICY IF EXISTS monthly_targets_insert_scoped
  ON public.monthly_targets;

DROP POLICY IF EXISTS monthly_targets_update_scoped
  ON public.monthly_targets;

DROP POLICY IF EXISTS monthly_targets_delete_scoped
  ON public.monthly_targets;

CREATE POLICY monthly_targets_select_scoped
  ON public.monthly_targets
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
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

CREATE POLICY monthly_targets_insert_scoped
  ON public.monthly_targets
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
    )
  );

CREATE POLICY monthly_targets_update_scoped
  ON public.monthly_targets
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
    )
  )
  WITH CHECK (
    company_id = public.auth_user_company_id()
  );

CREATE POLICY monthly_targets_delete_scoped
  ON public.monthly_targets
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
    )
  );


-- =============================================================================
-- 8) MONTHLY PROGRESS
-- =============================================================================

DROP POLICY IF EXISTS monthly_progress_company_isolation
  ON public.monthly_progress;

DROP POLICY IF EXISTS monthly_progress_select_scoped
  ON public.monthly_progress;

DROP POLICY IF EXISTS monthly_progress_insert_scoped
  ON public.monthly_progress;

DROP POLICY IF EXISTS monthly_progress_update_scoped
  ON public.monthly_progress;

DROP POLICY IF EXISTS monthly_progress_delete_scoped
  ON public.monthly_progress;

CREATE POLICY monthly_progress_select_scoped
  ON public.monthly_progress
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
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

-- Sales reps must not manipulate calculated progress directly.

CREATE POLICY monthly_progress_insert_admin_manager
  ON public.monthly_progress
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
    )
  );

CREATE POLICY monthly_progress_update_admin_manager
  ON public.monthly_progress
  FOR UPDATE
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
    )
  )
  WITH CHECK (
    company_id = public.auth_user_company_id()
  );

CREATE POLICY monthly_progress_delete_admin_manager
  ON public.monthly_progress
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
    )
  );


-- =============================================================================
-- 9) DAILY AI TASKS
-- =============================================================================

DROP POLICY IF EXISTS daily_ai_tasks_company_isolation
  ON public.daily_ai_tasks;

DROP POLICY IF EXISTS daily_ai_tasks_select_scoped
  ON public.daily_ai_tasks;

DROP POLICY IF EXISTS daily_ai_tasks_insert_scoped
  ON public.daily_ai_tasks;

DROP POLICY IF EXISTS daily_ai_tasks_update_scoped
  ON public.daily_ai_tasks;

DROP POLICY IF EXISTS daily_ai_tasks_delete_scoped
  ON public.daily_ai_tasks;

CREATE POLICY daily_ai_tasks_select_scoped
  ON public.daily_ai_tasks
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
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
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = daily_ai_tasks.customer_id
        AND c.company_id = daily_ai_tasks.company_id
        AND c.deleted_at IS NULL
    )
  );

CREATE POLICY daily_ai_tasks_insert_scoped
  ON public.daily_ai_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = daily_ai_tasks.customer_id
        AND c.company_id = daily_ai_tasks.company_id
        AND c.deleted_at IS NULL
    )
  );

CREATE POLICY daily_ai_tasks_update_scoped
  ON public.daily_ai_tasks
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
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
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = daily_ai_tasks.customer_id
        AND c.company_id = daily_ai_tasks.company_id
        AND c.deleted_at IS NULL
    )
  );

CREATE POLICY daily_ai_tasks_delete_scoped
  ON public.daily_ai_tasks
  FOR DELETE
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
          AND r.slug IN ('company_admin', 'sales_manager')
          AND r.is_active = true
      )
    )
  );


-- =============================================================================
-- 10) ACTIVITY LOGS
--     Sales rep: own audit entries only.
--     Company admin / manager: company-wide audit visibility.
-- =============================================================================

DROP POLICY IF EXISTS activity_logs_company_read
  ON public.activity_logs;

DROP POLICY IF EXISTS activity_logs_select_scoped
  ON public.activity_logs;

CREATE POLICY activity_logs_select_scoped
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
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
BEGIN;

-- ============================================================
-- 1) Central customer-access helper
-- ============================================================

CREATE OR REPLACE FUNCTION public.auth_user_can_access_customer(
  p_company_id uuid,
  p_customer_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = p_customer_id
      AND c.company_id = p_company_id
      AND c.deleted_at IS NULL
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
            AND r.company_id = p_company_id
            AND r.slug IN ('company_admin', 'sales_manager')
            AND r.is_active = true
        )

        OR c.assigned_user_id = auth.uid()

        OR (
          c.assigned_user_id IS NULL
          AND EXISTS (
            SELECT 1
            FROM public.cities ci
            JOIN public.user_regions ur
              ON ur.region_id = ci.region_id
             AND ur.company_id = ci.company_id
             AND ur.user_id = auth.uid()
             AND ur.deleted_at IS NULL
            WHERE ci.id = c.city_id
              AND ci.company_id = c.company_id
              AND ci.deleted_at IS NULL
          )
        )
      )
  );
$function$;


-- ============================================================
-- 2) USERS
--    Sales rep sees only self.
--    Admin / manager see company users.
-- ============================================================

DROP POLICY IF EXISTS users_select_company
  ON public.users;

DROP POLICY IF EXISTS users_select_scoped
  ON public.users;

CREATE POLICY users_select_scoped
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND (
      id = auth.uid()
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
-- 3) CALLS
--    Customer must be accessible in every operation.
-- ============================================================

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

CREATE POLICY calls_insert_scoped
  ON public.calls
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND user_id = auth.uid()
    AND public.auth_user_can_access_customer(
      company_id,
      customer_id
    )
  );

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
  );

CREATE POLICY calls_delete_scoped
  ON public.calls
  FOR DELETE
  TO authenticated
  USING (
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
-- 4) FOLLOW UPS
-- ============================================================

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

CREATE POLICY follow_ups_insert_scoped
  ON public.follow_ups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND user_id = auth.uid()
    AND public.auth_user_can_access_customer(
      company_id,
      customer_id
    )
  );

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
  );

CREATE POLICY follow_ups_delete_scoped
  ON public.follow_ups
  FOR DELETE
  TO authenticated
  USING (
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
-- 5) CUSTOMER VISITS
-- ============================================================

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

CREATE POLICY customer_visits_insert_scoped
  ON public.customer_visits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND user_id = auth.uid()
    AND public.auth_user_can_access_customer(
      company_id,
      customer_id
    )
  );

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
  );

CREATE POLICY customer_visits_delete_scoped
  ON public.customer_visits
  FOR DELETE
  TO authenticated
  USING (
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
-- 6) DAILY AI TASKS
-- ============================================================

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
    AND user_id = auth.uid()
    AND public.auth_user_can_access_customer(
      company_id,
      customer_id
    )
  );

CREATE POLICY daily_ai_tasks_insert_scoped
  ON public.daily_ai_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND user_id = auth.uid()
    AND public.auth_user_can_access_customer(
      company_id,
      customer_id
    )
  );

CREATE POLICY daily_ai_tasks_update_scoped
  ON public.daily_ai_tasks
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND user_id = auth.uid()
    AND public.auth_user_can_access_customer(
      company_id,
      customer_id
    )
  )
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND user_id = auth.uid()
    AND public.auth_user_can_access_customer(
      company_id,
      customer_id
    )
  );

CREATE POLICY daily_ai_tasks_delete_scoped
  ON public.daily_ai_tasks
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND user_id = auth.uid()
  );


-- ============================================================
-- 7) MONTHLY TARGETS
--    Sales rep sees only targets for assigned regions.
--    NULL-region company-wide targets stay manager/admin only.
-- ============================================================

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
        user_id = auth.uid()
        AND region_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.user_regions ur
          WHERE ur.company_id = monthly_targets.company_id
            AND ur.user_id = auth.uid()
            AND ur.region_id = monthly_targets.region_id
            AND ur.deleted_at IS NULL
        )
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


-- ============================================================
-- 8) MONTHLY PROGRESS
--    Sales rep sees only region-level progress in assigned regions.
--    Overall NULL-region aggregate is manager/admin only.
-- ============================================================

DROP POLICY IF EXISTS monthly_progress_select_scoped
  ON public.monthly_progress;

DROP POLICY IF EXISTS monthly_progress_insert_admin_manager
  ON public.monthly_progress;

DROP POLICY IF EXISTS monthly_progress_update_admin_manager
  ON public.monthly_progress;

DROP POLICY IF EXISTS monthly_progress_delete_admin_manager
  ON public.monthly_progress;

CREATE POLICY monthly_progress_select_scoped
  ON public.monthly_progress
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

      OR (
        user_id = auth.uid()
        AND region_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.user_regions ur
          WHERE ur.company_id = monthly_progress.company_id
            AND ur.user_id = auth.uid()
            AND ur.region_id = monthly_progress.region_id
            AND ur.deleted_at IS NULL
        )
      )
    )
  );

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

COMMIT;
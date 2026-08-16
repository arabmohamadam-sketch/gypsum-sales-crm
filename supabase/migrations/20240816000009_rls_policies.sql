-- =============================================================================
-- Gypsum Sales CRM — Row Level Security Policies
-- =============================================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper policy templates via company_id scoping
-- ---------------------------------------------------------------------------

CREATE POLICY companies_select_own
  ON public.companies FOR SELECT
  USING (id = public.auth_user_company_id() AND deleted_at IS NULL);

CREATE POLICY companies_update_admin
  ON public.companies FOR UPDATE
  USING (id = public.auth_user_company_id() AND public.auth_user_is_admin())
  WITH CHECK (id = public.auth_user_company_id());

-- Permissions are global read-only for authenticated users
CREATE POLICY permissions_select_authenticated
  ON public.permissions FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Roles: system roles readable by all authenticated; company roles tenant-scoped
CREATE POLICY roles_select_scoped
  ON public.roles FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      is_system = true
      OR company_id = public.auth_user_company_id()
    )
  );

CREATE POLICY roles_manage_admin
  ON public.roles FOR ALL
  TO authenticated
  USING (company_id = public.auth_user_company_id() AND public.auth_user_is_admin())
  WITH CHECK (company_id = public.auth_user_company_id() AND is_system = false);

CREATE POLICY role_permissions_select_scoped
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.deleted_at IS NULL
        AND (r.is_system = true OR r.company_id = public.auth_user_company_id())
    )
  );

CREATE POLICY role_permissions_manage_admin
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (
    public.auth_user_is_admin()
    AND EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.company_id = public.auth_user_company_id()
    )
  )
  WITH CHECK (
    public.auth_user_is_admin()
    AND EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.company_id = public.auth_user_company_id()
    )
  );

CREATE POLICY users_select_company
  ON public.users FOR SELECT
  TO authenticated
  USING (company_id = public.auth_user_company_id() AND deleted_at IS NULL);

CREATE POLICY users_update_self_or_admin
  ON public.users FOR UPDATE
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND (id = auth.uid() OR public.auth_user_is_admin())
  )
  WITH CHECK (company_id = public.auth_user_company_id());

CREATE POLICY users_insert_admin
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (company_id = public.auth_user_company_id() AND public.auth_user_is_admin());

CREATE POLICY user_roles_select_company
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_roles.user_id
        AND u.company_id = public.auth_user_company_id()
    )
  );

CREATE POLICY user_roles_manage_admin
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.auth_user_is_admin())
  WITH CHECK (public.auth_user_is_admin());

-- Generic tenant isolation macro pattern for company-scoped tables
CREATE POLICY regions_company_isolation
  ON public.regions FOR ALL
  TO authenticated
  USING (company_id = public.auth_user_company_id())
  WITH CHECK (company_id = public.auth_user_company_id());

CREATE POLICY cities_company_isolation
  ON public.cities FOR ALL
  TO authenticated
  USING (company_id = public.auth_user_company_id())
  WITH CHECK (company_id = public.auth_user_company_id());

CREATE POLICY products_company_isolation
  ON public.products FOR ALL
  TO authenticated
  USING (company_id = public.auth_user_company_id())
  WITH CHECK (company_id = public.auth_user_company_id());

CREATE POLICY customers_company_isolation
  ON public.customers FOR ALL
  TO authenticated
  USING (company_id = public.auth_user_company_id())
  WITH CHECK (company_id = public.auth_user_company_id());

CREATE POLICY customer_contacts_company_isolation
  ON public.customer_contacts FOR ALL
  TO authenticated
  USING (company_id = public.auth_user_company_id())
  WITH CHECK (company_id = public.auth_user_company_id());

CREATE POLICY customer_addresses_company_isolation
  ON public.customer_addresses FOR ALL
  TO authenticated
  USING (company_id = public.auth_user_company_id())
  WITH CHECK (company_id = public.auth_user_company_id());

CREATE POLICY orders_company_isolation
  ON public.orders FOR ALL
  TO authenticated
  USING (company_id = public.auth_user_company_id())
  WITH CHECK (company_id = public.auth_user_company_id());

CREATE POLICY order_items_company_isolation
  ON public.order_items FOR ALL
  TO authenticated
  USING (company_id = public.auth_user_company_id())
  WITH CHECK (company_id = public.auth_user_company_id());

CREATE POLICY calls_company_isolation
  ON public.calls FOR ALL
  TO authenticated
  USING (company_id = public.auth_user_company_id())
  WITH CHECK (company_id = public.auth_user_company_id());

CREATE POLICY follow_ups_company_isolation
  ON public.follow_ups FOR ALL
  TO authenticated
  USING (company_id = public.auth_user_company_id())
  WITH CHECK (company_id = public.auth_user_company_id());

CREATE POLICY customer_visits_company_isolation
  ON public.customer_visits FOR ALL
  TO authenticated
  USING (company_id = public.auth_user_company_id())
  WITH CHECK (company_id = public.auth_user_company_id());

CREATE POLICY monthly_targets_company_isolation
  ON public.monthly_targets FOR ALL
  TO authenticated
  USING (company_id = public.auth_user_company_id())
  WITH CHECK (company_id = public.auth_user_company_id());

CREATE POLICY monthly_progress_company_isolation
  ON public.monthly_progress FOR ALL
  TO authenticated
  USING (company_id = public.auth_user_company_id())
  WITH CHECK (company_id = public.auth_user_company_id());

CREATE POLICY daily_ai_tasks_company_isolation
  ON public.daily_ai_tasks FOR ALL
  TO authenticated
  USING (company_id = public.auth_user_company_id())
  WITH CHECK (company_id = public.auth_user_company_id());

CREATE POLICY notifications_user_scoped
  ON public.notifications FOR ALL
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
    AND (user_id = auth.uid() OR public.auth_user_is_admin())
  )
  WITH CHECK (
    company_id = public.auth_user_company_id()
    AND (user_id = auth.uid() OR public.auth_user_is_admin())
  );

CREATE POLICY activity_logs_company_read
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (company_id = public.auth_user_company_id() AND deleted_at IS NULL);

CREATE POLICY activity_logs_company_insert
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (company_id = public.auth_user_company_id());

CREATE POLICY notes_company_isolation
  ON public.notes FOR ALL
  TO authenticated
  USING (company_id = public.auth_user_company_id())
  WITH CHECK (company_id = public.auth_user_company_id());

CREATE POLICY attachments_company_isolation
  ON public.attachments FOR ALL
  TO authenticated
  USING (company_id = public.auth_user_company_id())
  WITH CHECK (company_id = public.auth_user_company_id());

CREATE POLICY settings_select_scoped
  ON public.settings FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      scope = 'system'
      OR (scope = 'company' AND company_id = public.auth_user_company_id())
      OR (scope = 'user' AND company_id = public.auth_user_company_id() AND user_id = auth.uid())
      OR (scope = 'user' AND company_id = public.auth_user_company_id() AND public.auth_user_is_admin())
    )
  );

CREATE POLICY settings_manage_scoped
  ON public.settings FOR ALL
  TO authenticated
  USING (
    (scope = 'company' AND company_id = public.auth_user_company_id() AND public.auth_user_is_admin())
    OR (scope = 'user' AND company_id = public.auth_user_company_id() AND user_id = auth.uid())
  )
  WITH CHECK (
    (scope = 'company' AND company_id = public.auth_user_company_id() AND public.auth_user_is_admin())
    OR (scope = 'user' AND company_id = public.auth_user_company_id() AND user_id = auth.uid())
  );

-- Service role bypasses RLS by default in Supabase.
-- Grant usage to authenticated role on views
GRANT SELECT ON public.v_daily_sales TO authenticated;
GRANT SELECT ON public.v_weekly_sales TO authenticated;
GRANT SELECT ON public.v_monthly_sales TO authenticated;
GRANT SELECT ON public.v_region_comparison TO authenticated;
GRANT SELECT ON public.v_city_comparison TO authenticated;
GRANT SELECT ON public.v_customer_ranking TO authenticated;
GRANT SELECT ON public.v_inactive_customers TO authenticated;
GRANT SELECT ON public.v_lost_customers TO authenticated;
GRANT SELECT ON public.v_follow_up_performance TO authenticated;
GRANT SELECT ON public.v_target_achievement TO authenticated;
GRANT SELECT ON public.v_sales_trend TO authenticated;
GRANT SELECT ON public.v_top_products TO authenticated;
GRANT SELECT ON public.v_customer_activity TO authenticated;
GRANT SELECT ON public.v_ai_recommendations TO authenticated;
GRANT SELECT ON public.v_ai_eligible_customers TO authenticated;

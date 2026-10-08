BEGIN;

-- =============================================================================
-- V2 Waybill Writer Role + V2 Waybill RLS
--
-- Business rule:
--   Waybill Writer operates on the operational shipment/waybill layer.
--   The writer must not edit the commercial Order Item.
--
-- The V2 Waybill Writer can:
--   - view shipments prepared for dispatch
--   - create a V2 waybill from a shipment
--   - edit V2 waybill quantities while the waybill is draft
--   - issue the V2 waybill
--   - cancel/reissue according to explicit permissions
--
-- V1:
--   Legacy waybill rows are identified by shipment_id IS NULL and remain under
--   their previous company-scoped policies.
-- =============================================================================


-- =============================================================================
-- 1. CREATE WAYBILL WRITER ROLE FOR EACH COMPANY
-- =============================================================================

INSERT INTO public.roles (
  company_id,
  name,
  slug,
  description,
  is_system,
  is_active
)
SELECT
  c.id,
  'حواله نویس',
  'waybill_writer',
  'مدیریت عملیاتی حواله‌ها و تنظیم مقدار اقلام برای خودرو',
  false,
  true
FROM public.companies AS c
WHERE NOT EXISTS (
  SELECT 1
  FROM public.roles AS r
  WHERE r.company_id = c.id
    AND r.slug = 'waybill_writer'
    AND r.deleted_at IS NULL
);


-- =============================================================================
-- 2. ENSURE WAYBILL WRITER PERMISSIONS EXIST
-- =============================================================================

INSERT INTO public.permissions (
  resource,
  action,
  slug,
  description
)
SELECT *
FROM (
  VALUES
    (
      'waybills',
      'view',
      'waybills.view',
      'مشاهده حواله‌ها'
    ),
    (
      'waybills',
      'create',
      'waybills.create',
      'ایجاد حواله'
    ),
    (
      'waybills',
      'edit',
      'waybills.edit',
      'ویرایش حواله قبل از صدور'
    ),
    (
      'waybills',
      'issue',
      'waybills.issue',
      'صدور حواله'
    ),
    (
      'waybills',
      'cancel',
      'waybills.cancel',
      'لغو حواله'
    ),
    (
      'waybills',
      'reissue',
      'waybills.reissue',
      'صدور مجدد حواله'
    ),
    (
      'waybills',
      'print',
      'waybills.print',
      'چاپ حواله'
    ),
    (
      'waybills',
      'view_history',
      'waybills.view_history',
      'مشاهده سوابق حواله'
    )
) AS p(
  resource,
  action,
  slug,
  description
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.permissions existing
  WHERE existing.slug = p.slug
);


-- =============================================================================
-- 3. ASSIGN OPERATIONAL PERMISSIONS TO WAYBILL WRITER ROLE
-- =============================================================================

INSERT INTO public.role_permissions (
  role_id,
  permission_id
)
SELECT
  r.id,
  p.id
FROM public.roles AS r
JOIN public.permissions AS p
  ON p.slug IN (
    'shipments.view',
    'products.view',
    'vehicles.view',
    'drivers.view',
    'loading.view',
    'waybills.view',
    'waybills.create',
    'waybills.edit',
    'waybills.issue',
    'waybills.cancel',
    'waybills.reissue',
    'waybills.print',
    'waybills.view_history'
  )
 AND p.deleted_at IS NULL
WHERE r.slug = 'waybill_writer'
  AND r.deleted_at IS NULL
  AND r.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.role_permissions AS rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );


-- =============================================================================
-- 4. V2 WAYBILL RLS
--
-- V1 compatibility:
--   shipment_id IS NULL -> keep company-scoped legacy access.
--
-- V2:
--   shipment_id IS NOT NULL -> permission based access.
-- =============================================================================

DROP POLICY IF EXISTS waybills_company_isolation
ON public.waybills;

DROP POLICY IF EXISTS waybills_select_scoped
ON public.waybills;

DROP POLICY IF EXISTS waybills_insert_scoped
ON public.waybills;

DROP POLICY IF EXISTS waybills_update_scoped
ON public.waybills;


CREATE POLICY waybills_select_scoped
ON public.waybills
FOR SELECT
TO authenticated
USING (
  company_id = public.auth_user_company_id()
  AND deleted_at IS NULL
  AND (
    -- Legacy V1
    shipment_id IS NULL

    -- V2
    OR public.auth_user_has_permission(
      'waybills.view'
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
    -- V1 legacy creation
    shipment_id IS NULL

    -- V2 creation requires the explicit create permission
    OR (
      shipment_id IS NOT NULL
      AND public.auth_user_has_permission(
        'waybills.create'
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
    -- V1 legacy behavior
    shipment_id IS NULL

    -- V2 operational editing / issuing
    OR (
      shipment_id IS NOT NULL
      AND (
        public.auth_user_has_permission(
          'waybills.edit'
        )
        OR public.auth_user_has_permission(
          'waybills.issue'
        )
        OR public.auth_user_has_permission(
          'waybills.cancel'
        )
      )
    )
  )
)
WITH CHECK (
  company_id = public.auth_user_company_id()
  AND (
    shipment_id IS NULL
    OR (
      shipment_id IS NOT NULL
      AND (
        public.auth_user_has_permission(
          'waybills.edit'
        )
        OR public.auth_user_has_permission(
          'waybills.issue'
        )
        OR public.auth_user_has_permission(
          'waybills.cancel'
        )
      )
    )
  )
);


-- =============================================================================
-- 5. V2 WAYBILL ITEM RLS
--
-- V1 rows:
--   shipment_item_id IS NULL -> preserve legacy company-scoped access.
--
-- V2 rows:
--   shipment_item_id IS NOT NULL -> waybills.edit / waybills.view.
-- =============================================================================

DROP POLICY IF EXISTS waybill_items_company_isolation
ON public.waybill_items;

DROP POLICY IF EXISTS waybill_items_select_scoped
ON public.waybill_items;

DROP POLICY IF EXISTS waybill_items_insert_scoped
ON public.waybill_items;

DROP POLICY IF EXISTS waybill_items_update_scoped
ON public.waybill_items;


CREATE POLICY waybill_items_select_scoped
ON public.waybill_items
FOR SELECT
TO authenticated
USING (
  company_id = public.auth_user_company_id()
  AND deleted_at IS NULL
  AND (
    shipment_item_id IS NULL
    OR public.auth_user_has_permission(
      'waybills.view'
    )
  )
);


CREATE POLICY waybill_items_insert_scoped
ON public.waybill_items
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.auth_user_company_id()
  AND (
    shipment_item_id IS NULL
    OR public.auth_user_has_permission(
      'waybills.edit'
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
    shipment_item_id IS NULL
    OR public.auth_user_has_permission(
      'waybills.edit'
    )
  )
)
WITH CHECK (
  company_id = public.auth_user_company_id()
  AND (
    shipment_item_id IS NULL
    OR public.auth_user_has_permission(
      'waybills.edit'
    )
  )
);


GRANT SELECT, INSERT, UPDATE
ON public.waybills
TO authenticated;

GRANT SELECT, INSERT, UPDATE
ON public.waybill_items
TO authenticated;


-- =============================================================================
-- 6. COMMENTS
-- =============================================================================

COMMENT ON POLICY waybills_select_scoped
ON public.waybills IS
  'V1 legacy rows remain company-scoped; V2 waybills require waybills.view.';

COMMENT ON POLICY waybills_update_scoped
ON public.waybills IS
  'V1 legacy rows remain company-scoped; V2 updates require explicit waybill edit/issue/cancel permissions.';

COMMENT ON POLICY waybill_items_update_scoped
ON public.waybill_items IS
  'V1 legacy items remain company-scoped; V2 item quantity changes require waybills.edit.';

COMMIT;

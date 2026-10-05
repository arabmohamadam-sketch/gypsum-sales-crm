BEGIN;

-- =============================================================================
-- Gypsum Sales CRM V2
-- Migration: 20261005000039_v2_harden_shipment_rls.sql
--
-- Purpose:
--   Replace the broad V2 shipment FOR ALL policies with permission-based
--   policies for the V2 shipment domain.
--
-- V1 SAFETY RULE:
--   - Do not alter any V1 migration.
--   - Do not rename/delete V1 permissions.
--   - V1 shipment/waybill tables are not used by the V1 application snapshot.
--   - Only V2-only tables `shipments` and `shipment_items` are hardened here.
--
-- Important:
--   Direct UPDATE is intentionally limited to `shipments.edit`.
--   Sensitive actions represented by narrower permissions
--   (`confirm`, `cancel`, `assign_*`, `adjust_quantity`) must later be exposed
--   through controlled RPCs; RLS alone cannot safely distinguish changed columns.
-- =============================================================================

-- =============================================================================
-- 1. REPLACE BROAD SHIPMENT POLICIES
-- =============================================================================

DROP POLICY IF EXISTS shipments_company_isolation
ON public.shipments;

DROP POLICY IF EXISTS shipment_items_company_isolation
ON public.shipment_items;

DROP POLICY IF EXISTS shipments_select_scoped
ON public.shipments;

DROP POLICY IF EXISTS shipments_insert_scoped
ON public.shipments;

DROP POLICY IF EXISTS shipments_update_scoped
ON public.shipments;

DROP POLICY IF EXISTS shipments_delete_scoped
ON public.shipments;

DROP POLICY IF EXISTS shipment_items_select_scoped
ON public.shipment_items;

DROP POLICY IF EXISTS shipment_items_insert_scoped
ON public.shipment_items;

DROP POLICY IF EXISTS shipment_items_update_scoped
ON public.shipment_items;

DROP POLICY IF EXISTS shipment_items_delete_scoped
ON public.shipment_items;

-- =============================================================================
-- 2. SHIPMENTS: SELECT
-- =============================================================================

CREATE POLICY shipments_select_scoped
ON public.shipments
FOR SELECT
TO authenticated
USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND public.auth_user_has_permission('shipments.view')
);

-- =============================================================================
-- 3. SHIPMENTS: INSERT
-- =============================================================================

CREATE POLICY shipments_insert_scoped
ON public.shipments
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = public.auth_user_company_id()
    AND public.auth_user_has_permission('shipments.create')
);

-- =============================================================================
-- 4. SHIPMENTS: UPDATE
--
-- Only the broad edit capability is allowed for direct table UPDATE.
-- Fine-grained operational permissions remain available for future RPCs.
-- =============================================================================

CREATE POLICY shipments_update_scoped
ON public.shipments
FOR UPDATE
TO authenticated
USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND public.auth_user_has_permission('shipments.edit')
)
WITH CHECK (
    company_id = public.auth_user_company_id()
    AND public.auth_user_has_permission('shipments.edit')
);

-- =============================================================================
-- 5. SHIPMENTS: HARD DELETE DENIED
--
-- Business documents are soft-delete/state controlled. The existing V2
-- hard-delete trigger remains as a second line of defense.
-- =============================================================================

REVOKE DELETE
ON public.shipments
FROM authenticated;

-- =============================================================================
-- 6. SHIPMENT ITEMS: SELECT
-- =============================================================================

CREATE POLICY shipment_items_select_scoped
ON public.shipment_items
FOR SELECT
TO authenticated
USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND public.auth_user_has_permission('shipments.view')
);

-- =============================================================================
-- 7. SHIPMENT ITEMS: INSERT
--
-- Parent/child/company/product/order consistency remains enforced by the
-- existing V2 trigger `v2_validate_shipment_item_integrity`.
-- =============================================================================

CREATE POLICY shipment_items_insert_scoped
ON public.shipment_items
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = public.auth_user_company_id()
    AND public.auth_user_has_permission('shipments.create')
    AND EXISTS (
        SELECT 1
        FROM public.shipments s
        WHERE s.id = shipment_items.shipment_id
          AND s.company_id = shipment_items.company_id
          AND s.deleted_at IS NULL
    )
);

-- =============================================================================
-- 8. SHIPMENT ITEMS: UPDATE
--
-- Keep direct updates behind the general edit capability. Fine-grained
-- quantity adjustment will be handled by a dedicated RPC in the next domain
-- hardening phase.
-- =============================================================================

CREATE POLICY shipment_items_update_scoped
ON public.shipment_items
FOR UPDATE
TO authenticated
USING (
    company_id = public.auth_user_company_id()
    AND deleted_at IS NULL
    AND public.auth_user_has_permission('shipments.edit')
)
WITH CHECK (
    company_id = public.auth_user_company_id()
    AND public.auth_user_has_permission('shipments.edit')
    AND EXISTS (
        SELECT 1
        FROM public.shipments s
        WHERE s.id = shipment_items.shipment_id
          AND s.company_id = shipment_items.company_id
          AND s.deleted_at IS NULL
    )
);

-- =============================================================================
-- 9. SHIPMENT ITEMS: HARD DELETE DENIED
-- =============================================================================

REVOKE DELETE
ON public.shipment_items
FROM authenticated;

-- =============================================================================
-- 10. READ/WRITE TABLE GRANTS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE
ON public.shipments
TO authenticated;

GRANT SELECT, INSERT, UPDATE
ON public.shipment_items
TO authenticated;

-- =============================================================================
-- 11. COMMENTS
-- =============================================================================

COMMENT ON POLICY shipments_select_scoped
ON public.shipments IS
    'V2 permission-based shipment visibility within the authenticated tenant.';

COMMENT ON POLICY shipments_insert_scoped
ON public.shipments IS
    'V2 shipment creation requires shipments.create and tenant scope.';

COMMENT ON POLICY shipments_update_scoped
ON public.shipments IS
    'V2 direct shipment updates require shipments.edit and tenant scope.';

COMMENT ON POLICY shipment_items_select_scoped
ON public.shipment_items IS
    'V2 permission-based shipment-item visibility within the authenticated tenant.';

COMMENT ON POLICY shipment_items_insert_scoped
ON public.shipment_items IS
    'V2 shipment-item creation requires shipments.create plus a valid active parent shipment.';

COMMENT ON POLICY shipment_items_update_scoped
ON public.shipment_items IS
    'V2 direct shipment-item updates require shipments.edit plus a valid active parent shipment.';

COMMIT;

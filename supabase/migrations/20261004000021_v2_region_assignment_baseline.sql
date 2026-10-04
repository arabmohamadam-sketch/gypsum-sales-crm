BEGIN;

-- ============================================================
-- V2 Region Assignment Baseline / Cleanup
--
-- Purpose:
--   1. Remove the temporary test manager from the active V1
--      user_regions assignment for Tehran/Varamin.
--   2. Establish the real current regional-manager assignments
--      as the initial V2 assignment history.
--   3. Enforce one active V2 manager per region.
--
-- IMPORTANT:
--   - No customer is changed.
--   - No order is changed.
--   - No monthly target is changed.
--   - Historical orders remain untouched.
--   - The existing V1 user_regions table is preserved.
-- ============================================================


-- ============================================================
-- 1. Remove the temporary test assignment from active V1 scope
-- ============================================================

UPDATE public.user_regions
SET
    deleted_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
WHERE company_id = '11111111-1111-1111-1111-111111111111'
  AND user_id = '95632225-ebd7-47e7-a5b2-30b7c9e1cde7'
  AND region_id = 'cccccccc-0001-0001-0001-000000000001'
  AND deleted_at IS NULL;


-- ============================================================
-- 2. Baseline V2 history from the real active assignments
--
-- Current valid real assignments:
--   Region 1 -> Mohammad Arab
--   Region 2 -> Mohammad Arab
--
-- The operation is idempotent: rows are inserted only when the
-- exact baseline history row does not already exist.
-- ============================================================

INSERT INTO public.v2_region_manager_assignment_history (
    company_id,
    region_id,
    regional_manager_id,
    effective_from,
    effective_to,
    assigned_by,
    assigned_at,
    assignment_reason
)
SELECT
    ur.company_id,
    ur.region_id,
    ur.user_id,
    ur.assigned_at::date,
    NULL,
    COALESCE(ur.assigned_by, ur.user_id),
    COALESCE(
        ur.assigned_at,
        timezone('utc'::text, now())
    ),
    'ثبت مبنای اولیه مالکیت فعلی منطقه در V2'
FROM public.user_regions AS ur
WHERE ur.company_id = '11111111-1111-1111-1111-111111111111'
  AND ur.user_id = '0e67b545-f44e-4f47-b2e0-4a82d6a4943f'
  AND ur.region_id IN (
      'cccccccc-0001-0001-0001-000000000001',
      'cccccccc-0002-0002-0002-000000000002'
  )
  AND ur.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM public.v2_region_manager_assignment_history AS h
      WHERE h.company_id = ur.company_id
        AND h.region_id = ur.region_id
        AND h.regional_manager_id = ur.user_id
        AND h.effective_from = ur.assigned_at::date
  );


-- ============================================================
-- 3. V2 must have one active manager per region
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_region_active_manager
ON public.v2_region_manager_assignment_history (
    company_id,
    region_id
)
WHERE effective_to IS NULL;


-- ============================================================
-- 4. Safety check
-- ============================================================

DO $$
DECLARE
    v_duplicate_count integer;
BEGIN
    SELECT COUNT(*)
    INTO v_duplicate_count
    FROM (
        SELECT
            company_id,
            region_id
        FROM public.v2_region_manager_assignment_history
        WHERE effective_to IS NULL
        GROUP BY
            company_id,
            region_id
        HAVING COUNT(*) > 1
    ) AS duplicates;

    IF v_duplicate_count > 0 THEN
        RAISE EXCEPTION
            'V2 region assignment baseline failed: duplicate active region managers exist.';
    END IF;
END;
$$;


COMMIT;

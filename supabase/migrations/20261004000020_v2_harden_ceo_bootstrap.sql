BEGIN;

-- ============================================================
-- V2 CEO Bootstrap Hardening
--
-- Purpose:
--   Harden the one-time CEO bootstrap created in Migration 19.
--
-- Rules:
--   1. Before a CEO exists, an already authorized company/system
--      admin may perform ONE bootstrap assignment.
--   2. The bootstrap operation is permanently marked as completed.
--   3. After bootstrap, ONLY the current CEO may change the CEO.
--   4. This migration does not create or modify user accounts.
--   5. V1 roles and permissions remain unchanged.
-- ============================================================


-- ============================================================
-- 1. GOVERNANCE BOOTSTRAP STATE
-- ============================================================

ALTER TABLE public.v2_company_governance
    ADD COLUMN IF NOT EXISTS ceo_bootstrap_completed_at timestamptz,
    ADD COLUMN IF NOT EXISTS ceo_bootstrap_completed_by uuid;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_v2_governance_bootstrap_completed_by'
          AND conrelid = 'public.v2_company_governance'::regclass
    ) THEN
        ALTER TABLE public.v2_company_governance
            ADD CONSTRAINT fk_v2_governance_bootstrap_completed_by
            FOREIGN KEY (ceo_bootstrap_completed_by)
            REFERENCES public.users(id);
    END IF;
END;
$$;


-- ============================================================
-- 2. BACKFILL BOOTSTRAP STATE FOR AN ALREADY-CONFIGURED CEO
--
-- Normally this is NULL because Migration 19 has not yet
-- configured the CEO.
-- ============================================================

UPDATE public.v2_company_governance
SET
    ceo_bootstrap_completed_at =
        COALESCE(
            ceo_bootstrap_completed_at,
            ceo_assigned_at
        ),
    ceo_bootstrap_completed_by =
        COALESCE(
            ceo_bootstrap_completed_by,
            ceo_assigned_by
        )
WHERE ceo_user_id IS NOT NULL;


-- ============================================================
-- 3. HARDEN CEO ASSIGNMENT
-- ============================================================

CREATE OR REPLACE FUNCTION public.v2_set_company_ceo(
    p_company_id uuid,
    p_ceo_user_id uuid,
    p_reason text
)
RETURNS public.v2_company_governance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_current_ceo uuid;
    v_bootstrap_completed_at timestamptz;
    v_target_company_id uuid;
    v_result public.v2_company_governance;
BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required.';
    END IF;


    IF p_reason IS NULL
       OR btrim(p_reason) = ''
    THEN
        RAISE EXCEPTION
            'A reason is required.';
    END IF;


    -- --------------------------------------------------------
    -- Lock governance row
    -- --------------------------------------------------------

    SELECT
        g.ceo_user_id,
        g.ceo_bootstrap_completed_at
    INTO
        v_current_ceo,
        v_bootstrap_completed_at
    FROM public.v2_company_governance AS g
    WHERE g.company_id = p_company_id
    FOR UPDATE;


    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Company governance record does not exist.';
    END IF;


    -- --------------------------------------------------------
    -- Validate target user
    -- --------------------------------------------------------

    SELECT
        u.company_id
    INTO
        v_target_company_id
    FROM public.users AS u
    WHERE u.id = p_ceo_user_id
      AND u.deleted_at IS NULL
      AND u.is_active = true
    LIMIT 1;


    IF v_target_company_id IS NULL THEN
        RAISE EXCEPTION
            'CEO user does not exist or is inactive.';
    END IF;


    IF v_target_company_id <> p_company_id THEN
        RAISE EXCEPTION
            'CEO must belong to the same company.';
    END IF;


    -- --------------------------------------------------------
    -- ONE-TIME BOOTSTRAP
    --
    -- Before bootstrap:
    --   only an existing system/company admin can establish
    --   the first CEO.
    --
    -- Once bootstrap is marked complete:
    --   only the current CEO can change the CEO.
    -- --------------------------------------------------------

    IF v_bootstrap_completed_at IS NULL THEN

        IF NOT public.auth_user_is_admin() THEN
            RAISE EXCEPTION
                'Only an authorized company administrator can perform the initial CEO bootstrap.';
        END IF;


        UPDATE public.v2_company_governance
        SET
            ceo_user_id = p_ceo_user_id,
            ceo_assigned_at = timezone('utc'::text, now()),
            ceo_assigned_by = auth.uid(),
            ceo_bootstrap_completed_at = timezone('utc'::text, now()),
            ceo_bootstrap_completed_by = auth.uid(),
            updated_at = timezone('utc'::text, now())
        WHERE company_id = p_company_id
        RETURNING *
        INTO v_result;


        RETURN v_result;

    END IF;


    -- --------------------------------------------------------
    -- POST-BOOTSTRAP
    -- --------------------------------------------------------

    IF v_current_ceo IS NULL THEN
        RAISE EXCEPTION
            'Governance is in an invalid state: bootstrap is complete but no CEO is assigned.';
    END IF;


    IF v_current_ceo <> auth.uid() THEN
        RAISE EXCEPTION
            'Only the current CEO can change the CEO assignment.';
    END IF;


    -- Do not silently rewrite the same assignment.
    IF p_ceo_user_id = v_current_ceo THEN
        RAISE EXCEPTION
            'The selected user is already the CEO.';
    END IF;


    UPDATE public.v2_company_governance
    SET
        ceo_user_id = p_ceo_user_id,
        ceo_assigned_at = timezone('utc'::text, now()),
        ceo_assigned_by = auth.uid(),
        updated_at = timezone('utc'::text, now())
    WHERE company_id = p_company_id
    RETURNING *
    INTO v_result;


    RETURN v_result;
END;
$function$;


-- ============================================================
-- 4. FUNCTION ACCESS
-- ============================================================

REVOKE ALL
ON FUNCTION public.v2_set_company_ceo(uuid, uuid, text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.v2_set_company_ceo(uuid, uuid, text)
TO authenticated;


COMMIT;

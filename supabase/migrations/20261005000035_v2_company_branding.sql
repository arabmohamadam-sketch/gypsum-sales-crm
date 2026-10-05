BEGIN;

-- ============================================================
-- V2 Company Branding
--
-- Purpose:
--   Make company identity fully tenant-aware and manageable from
--   the application UI instead of hard-coding a company logo or
--   display name in source code.
--
-- Design:
--   - One branding row per company.
--   - Logo files live in the public Supabase Storage bucket
--     `company-branding` under <company_id>/logo.
--   - Only users with the existing settings.write permission (or
--     a system/company admin) may change branding.
--   - Clients read branding through RLS.
--   - Updates are performed through a SECURITY DEFINER RPC.
--   - Existing company.metadata.branding values are preserved as
--     the initial display name / color fallback.
--
-- V1 remains untouched.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Company branding table
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.company_branding (
  company_id uuid PRIMARY KEY
    REFERENCES public.companies (id) ON DELETE RESTRICT,
  display_name text NOT NULL,
  logo_path text,
  primary_color text,
  secondary_color text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT company_branding_display_name_not_blank
    CHECK (btrim(display_name) <> ''),
  CONSTRAINT company_branding_display_name_length
    CHECK (char_length(display_name) <= 160),
  CONSTRAINT company_branding_logo_path_check
    CHECK (
      logo_path IS NULL
      OR logo_path = company_id::text || '/logo'
    ),
  CONSTRAINT company_branding_primary_color_check
    CHECK (
      primary_color IS NULL
      OR primary_color ~ '^#[0-9A-Fa-f]{6}$'
    ),
  CONSTRAINT company_branding_secondary_color_check
    CHECK (
      secondary_color IS NULL
      OR secondary_color ~ '^#[0-9A-Fa-f]{6}$'
    )
);

CREATE INDEX IF NOT EXISTS idx_company_branding_updated_at
  ON public.company_branding (updated_at);

DROP TRIGGER IF EXISTS trg_company_branding_updated_at
  ON public.company_branding;

CREATE TRIGGER trg_company_branding_updated_at
  BEFORE UPDATE ON public.company_branding
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- 2) Backfill from existing company records
-- ------------------------------------------------------------

INSERT INTO public.company_branding (
  company_id,
  display_name,
  logo_path,
  primary_color,
  secondary_color
)
SELECT
  c.id,
  COALESCE(
    NULLIF(
      btrim(
        CASE
          WHEN jsonb_typeof(c.metadata -> 'branding') = 'object'
          THEN c.metadata -> 'branding' ->> 'display_name'
          ELSE NULL
        END
      ),
      ''
    ),
    c.name
  ),
  NULLIF(
    btrim(
      CASE
        WHEN jsonb_typeof(c.metadata -> 'branding') = 'object'
        THEN c.metadata -> 'branding' ->> 'logo_path'
        ELSE NULL
      END
    ),
    ''
  ),
  NULLIF(
    btrim(
      CASE
        WHEN jsonb_typeof(c.metadata -> 'branding') = 'object'
        THEN c.metadata -> 'branding' ->> 'primary_color'
        ELSE NULL
      END
    ),
    ''
  ),
  NULLIF(
    btrim(
      CASE
        WHEN jsonb_typeof(c.metadata -> 'branding') = 'object'
        THEN c.metadata -> 'branding' ->> 'secondary_color'
        ELSE NULL
      END
    ),
    ''
  )
FROM public.companies AS c
WHERE c.deleted_at IS NULL
ON CONFLICT (company_id) DO NOTHING;

-- ------------------------------------------------------------
-- 3) RLS
-- ------------------------------------------------------------

ALTER TABLE public.company_branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_branding_select_scoped
  ON public.company_branding;

CREATE POLICY company_branding_select_scoped
  ON public.company_branding
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.auth_user_company_id()
  );

-- No direct INSERT / UPDATE / DELETE policy on purpose.
-- Business writes go through the controlled RPC below.

-- ------------------------------------------------------------
-- 4) Controlled branding update RPC
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.v2_update_company_branding(
  p_display_name text DEFAULT NULL,
  p_logo_path text DEFAULT NULL,
  p_clear_logo boolean DEFAULT false,
  p_primary_color text DEFAULT NULL,
  p_secondary_color text DEFAULT NULL
)
RETURNS public.company_branding
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_company_id uuid;
  v_existing public.company_branding%ROWTYPE;
  v_display_name text;
  v_primary_color text;
  v_secondary_color text;
BEGIN
  v_company_id := public.auth_user_company_id();

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'شرکت کاربر مشخص نشده است.';
  END IF;

  IF NOT (
    public.auth_user_is_admin()
    OR public.auth_user_has_permission('settings.write')
  ) THEN
    RAISE EXCEPTION 'دسترسی مدیریت هویت بصری شرکت را ندارید.';
  END IF;

  SELECT *
  INTO v_existing
  FROM public.company_branding
  WHERE company_id = v_company_id
  FOR UPDATE;

  IF p_display_name IS NOT NULL THEN
    v_display_name := btrim(p_display_name);
    IF v_display_name = '' THEN
      RAISE EXCEPTION 'نام نمایشی شرکت نمی‌تواند خالی باشد.';
    END IF;

    IF char_length(v_display_name) > 160 THEN
      RAISE EXCEPTION 'نام نمایشی شرکت بیش از حد طولانی است.';
    END IF;
  ELSE
    v_display_name := COALESCE(
      v_existing.display_name,
      (
        SELECT c.name
        FROM public.companies AS c
        WHERE c.id = v_company_id
      )
    );
  END IF;

  IF p_logo_path IS NOT NULL THEN
    IF p_logo_path <> v_company_id::text || '/logo' THEN
      RAISE EXCEPTION 'مسیر لوگوی شرکت نامعتبر است.';
    END IF;
  END IF;

  IF p_clear_logo THEN
    p_logo_path := NULL;
  END IF;

  IF p_primary_color IS NOT NULL THEN
    v_primary_color := btrim(p_primary_color);
    IF v_primary_color !~ '^#[0-9A-Fa-f]{6}$' THEN
      RAISE EXCEPTION 'رنگ اصلی باید در قالب HEX شش‌رقمی باشد.';
    END IF;
  ELSE
    v_primary_color := v_existing.primary_color;
  END IF;

  IF p_secondary_color IS NOT NULL THEN
    v_secondary_color := btrim(p_secondary_color);
    IF v_secondary_color !~ '^#[0-9A-Fa-f]{6}$' THEN
      RAISE EXCEPTION 'رنگ ثانویه باید در قالب HEX شش‌رقمی باشد.';
    END IF;
  ELSE
    v_secondary_color := v_existing.secondary_color;
  END IF;

  INSERT INTO public.company_branding (
    company_id,
    display_name,
    logo_path,
    primary_color,
    secondary_color
  )
  VALUES (
    v_company_id,
    v_display_name,
    CASE
      WHEN p_clear_logo THEN NULL
      WHEN p_logo_path IS NOT NULL THEN p_logo_path
      ELSE COALESCE(v_existing.logo_path, NULL)
    END,
    v_primary_color,
    v_secondary_color
  )
  ON CONFLICT (company_id)
  DO UPDATE SET
    display_name = EXCLUDED.display_name,
    logo_path = EXCLUDED.logo_path,
    primary_color = EXCLUDED.primary_color,
    secondary_color = EXCLUDED.secondary_color,
    updated_at = timezone('utc', now())
  RETURNING *
  INTO v_existing;

  RETURN v_existing;
END;
$function$;

REVOKE ALL
ON FUNCTION public.v2_update_company_branding(
  text,
  text,
  boolean,
  text,
  text
)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.v2_update_company_branding(
  text,
  text,
  boolean,
  text,
  text
)
TO authenticated;

-- ------------------------------------------------------------
-- 5) Supabase Storage bucket
-- ------------------------------------------------------------

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'company-branding',
  'company-branding',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ------------------------------------------------------------
-- 6) Storage write policies
-- ------------------------------------------------------------

DROP POLICY IF EXISTS company_branding_storage_insert
  ON storage.objects;

CREATE POLICY company_branding_storage_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-branding'
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_permission('settings.write')
    )
    AND (storage.foldername(name))[1] = public.auth_user_company_id()::text
    AND name = public.auth_user_company_id()::text || '/logo'
  );

DROP POLICY IF EXISTS company_branding_storage_update
  ON storage.objects;

CREATE POLICY company_branding_storage_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-branding'
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_permission('settings.write')
    )
    AND (storage.foldername(name))[1] = public.auth_user_company_id()::text
    AND name = public.auth_user_company_id()::text || '/logo'
  )
  WITH CHECK (
    bucket_id = 'company-branding'
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_permission('settings.write')
    )
    AND (storage.foldername(name))[1] = public.auth_user_company_id()::text
    AND name = public.auth_user_company_id()::text || '/logo'
  );

DROP POLICY IF EXISTS company_branding_storage_delete
  ON storage.objects;

CREATE POLICY company_branding_storage_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-branding'
    AND (
      public.auth_user_is_admin()
      OR public.auth_user_has_permission('settings.write')
    )
    AND (storage.foldername(name))[1] = public.auth_user_company_id()::text
    AND name = public.auth_user_company_id()::text || '/logo'
  );

COMMENT ON TABLE public.company_branding IS
  'Tenant-scoped visual identity and branding configuration.';

COMMENT ON COLUMN public.company_branding.logo_path IS
  'Supabase Storage object path in company-branding bucket: <company_id>/logo.';

COMMIT;

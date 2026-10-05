BEGIN;

-- ============================================================
-- V2 Company Branding - Storage SELECT Policy Fix
--
-- Root cause:
--   The company-branding bucket had INSERT / UPDATE / DELETE
--   policies, but no SELECT policy on storage.objects.
--
-- Supabase Storage uploads performed with upsert=true require
-- SELECT + INSERT + UPDATE access. Storage also needs to be able
-- to return metadata for the newly-created object. Without a
-- matching SELECT policy, the upload can fail with:
--
--   new row violates row-level security policy
--
-- Design:
--   - Keep company isolation by <company_id>/logo path.
--   - Allow authenticated users to read only their own company's
--     branding object metadata.
--   - Public bucket access for the actual logo URL remains intact.
--   - No V1 changes.
-- ============================================================

DROP POLICY IF EXISTS company_branding_storage_select
  ON storage.objects;

CREATE POLICY company_branding_storage_select
  ON storage.objects
  FOR SELECT
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

COMMIT;

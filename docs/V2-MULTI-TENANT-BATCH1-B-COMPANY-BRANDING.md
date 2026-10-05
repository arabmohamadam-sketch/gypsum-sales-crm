# V2 Multi-Tenant Batch 1-B — Company Branding

## Goal

Make the visual identity of each company dynamic and tenant-scoped.

The company name and logo are data, not source-code constants. The current
company is resolved from the authenticated user's company, and branding is
read from `public.company_branding`.

## Included

- `public.company_branding` tenant-scoped table.
- Public `company-branding` Supabase Storage bucket.
- Controlled RPC for branding changes.
- Storage RLS for company-scoped logo writes.
- Dynamic logo resolution in `current-company.ts`.
- `AuthProvider.refreshCompany()` for instant UI updates.
- Company branding management UI under `/settings`.
- Upload validation: PNG/JPG/WEBP, max 2 MB.
- Stable storage path: `<company_id>/logo`.
- Cache-busting through branding `updated_at`.

## Security

- Branding reads are company-scoped through RLS.
- Branding writes are not exposed as direct table writes.
- Branding changes require the existing `settings.write` permission or admin authorization.
- Storage writes are restricted to the authenticated user's company and exact
  `<company_id>/logo` path.

## Rollout

1. Apply the migration:
   `supabase db push`
2. Start the app:
   `npm run dev`
3. Sign in with a company administrator account.
4. Open `/settings`.
5. In `هویت بصری شرکت`, select a PNG/JPG/WEBP logo and save.
6. Confirm the logo and display name update in the Sidebar/Header without a
   full logout/login.

## Compatibility

V1 data and migrations are untouched. Existing `company.metadata.branding`
values remain a fallback when a branding row is unavailable.

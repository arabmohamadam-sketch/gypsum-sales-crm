-- =============================================================================
-- Gypsum Sales CRM — Seed Data
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Default company
-- ---------------------------------------------------------------------------

INSERT INTO public.companies (id, name, slug, legal_name, timezone, locale)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Gypsum Sales CRM',
  'gypsum-sales-crm',
  'Gypsum Distribution Co.',
  'Asia/Tehran',
  'fa-IR'
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

INSERT INTO public.permissions (id, resource, action, slug, description) VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001', 'admin', 'full_access', 'admin.full_access', 'Full administrative access'),
  ('aaaaaaaa-0002-0002-0002-000000000002', 'customers', 'read', 'customers.read', 'View customers'),
  ('aaaaaaaa-0003-0003-0003-000000000003', 'customers', 'write', 'customers.write', 'Create and update customers'),
  ('aaaaaaaa-0004-0004-0004-000000000004', 'orders', 'read', 'orders.read', 'View orders'),
  ('aaaaaaaa-0005-0005-0005-000000000005', 'orders', 'write', 'orders.write', 'Create and update orders'),
  ('aaaaaaaa-0006-0006-0006-000000000006', 'targets', 'read', 'targets.read', 'View monthly targets'),
  ('aaaaaaaa-0007-0007-0007-000000000007', 'targets', 'write', 'targets.write', 'Edit monthly targets'),
  ('aaaaaaaa-0008-0008-0008-000000000008', 'reports', 'read', 'reports.read', 'View sales reports'),
  ('aaaaaaaa-0009-0009-0009-000000000009', 'ai', 'read', 'ai.read', 'View AI recommendations'),
  ('aaaaaaaa-0010-0010-0010-000000000010', 'ai', 'write', 'ai.write', 'Manage AI recommendation tasks'),
  ('aaaaaaaa-0011-0011-0011-000000000011', 'settings', 'read', 'settings.read', 'View settings'),
  ('aaaaaaaa-0012-0012-0012-000000000012', 'settings', 'write', 'settings.write', 'Manage settings'),
  ('aaaaaaaa-0013-0013-0013-000000000013', 'users', 'read', 'users.read', 'View users'),
  ('aaaaaaaa-0014-0014-0014-000000000014', 'users', 'write', 'users.write', 'Manage users')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- System and company roles
-- ---------------------------------------------------------------------------

INSERT INTO public.roles (id, company_id, name, slug, description, is_system, is_active) VALUES
  (
    'bbbbbbbb-0001-0001-0001-000000000001',
    NULL,
    'Super Admin',
    'super_admin',
    'Global system administrator',
    true,
    true
  ),
  (
    'bbbbbbbb-0002-0002-0002-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'Company Admin',
    'company_admin',
    'Company-level administrator',
    false,
    true
  ),
  (
    'bbbbbbbb-0003-0003-0003-000000000003',
    '11111111-1111-1111-1111-111111111111',
    'Sales Manager',
    'sales_manager',
    'Manages sales team and targets',
    false,
    true
  ),
  (
    'bbbbbbbb-0004-0004-0004-000000000004',
    '11111111-1111-1111-1111-111111111111',
    'Sales Representative',
    'sales_rep',
    'Field sales representative',
    false,
    true
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug = 'super_admin'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug IN (
  'admin.full_access',
  'customers.read', 'customers.write',
  'orders.read', 'orders.write',
  'targets.read', 'targets.write',
  'reports.read',
  'ai.read', 'ai.write',
  'settings.read', 'settings.write',
  'users.read', 'users.write'
)
WHERE r.slug = 'company_admin'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug IN (
  'customers.read', 'customers.write',
  'orders.read', 'orders.write',
  'targets.read', 'targets.write',
  'reports.read',
  'ai.read', 'ai.write',
  'settings.read',
  'users.read'
)
WHERE r.slug = 'sales_manager'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug IN (
  'customers.read', 'customers.write',
  'orders.read', 'orders.write',
  'targets.read',
  'reports.read',
  'ai.read', 'ai.write',
  'settings.read'
)
WHERE r.slug = 'sales_rep'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Regions and cities
-- ---------------------------------------------------------------------------

INSERT INTO public.regions (id, company_id, name, code, sort_order) VALUES
  ('cccccccc-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'Region 1', 'region-1', 1),
  ('cccccccc-0002-0002-0002-000000000002', '11111111-1111-1111-1111-111111111111', 'Region 2', 'region-2', 2)
ON CONFLICT DO NOTHING;

INSERT INTO public.cities (company_id, region_id, name, code) VALUES
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0001-0001-0001-000000000001', 'Semnan', 'semnan'),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0001-0001-0001-000000000001', 'Garmsar', 'garmsar'),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0001-0001-0001-000000000001', 'Varamin', 'varamin'),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0002-0002-0002-000000000002', 'Kelardasht', 'kelardasht'),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0002-0002-0002-000000000002', 'Marzanabad', 'marzanabad'),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0002-0002-0002-000000000002', 'Chalous', 'chalous'),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0002-0002-0002-000000000002', 'Abbasabad', 'abbasabad'),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0002-0002-0002-000000000002', 'Tonekabon', 'tonekabon'),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0002-0002-0002-000000000002', 'Ramsar', 'ramsar')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Products (tonnage calculation only — no pricing)
-- ---------------------------------------------------------------------------

INSERT INTO public.products (company_id, name, sku, product_line, weight_kg, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Ahavan 25kg', 'ahavan-25kg', 'Ahavan', 25, 1),
  ('11111111-1111-1111-1111-111111111111', 'Ahavan 30kg', 'ahavan-30kg', 'Ahavan', 30, 2),
  ('11111111-1111-1111-1111-111111111111', 'Micronized 25kg', 'micronized-25kg', 'Micronized', 25, 3),
  ('11111111-1111-1111-1111-111111111111', 'Micronized 30kg', 'micronized-30kg', 'Micronized', 30, 4),
  ('11111111-1111-1111-1111-111111111111', 'Saman Sari 25kg', 'saman-sari-25kg', 'Saman Sari', 25, 5),
  ('11111111-1111-1111-1111-111111111111', 'Saman Sari 30kg', 'saman-sari-30kg', 'Saman Sari', 30, 6),
  ('11111111-1111-1111-1111-111111111111', 'Gipton 25kg', 'gipton-25kg', 'Gipton', 25, 7),
  ('11111111-1111-1111-1111-111111111111', 'Gipton 30kg', 'gipton-30kg', 'Gipton', 30, 8),
  ('11111111-1111-1111-1111-111111111111', 'Siva Manual 25kg', 'siva-manual-25kg', 'Siva Manual', 25, 9),
  ('11111111-1111-1111-1111-111111111111', 'Siva Manual 30kg', 'siva-manual-30kg', 'Siva Manual', 30, 10),
  ('11111111-1111-1111-1111-111111111111', 'Siva Spray 25kg', 'siva-spray-25kg', 'Siva Spray', 25, 11),
  ('11111111-1111-1111-1111-111111111111', 'Siva Spray 30kg', 'siva-spray-30kg', 'Siva Spray', 30, 12)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Default system and company settings
-- ---------------------------------------------------------------------------

INSERT INTO public.settings (scope, key, value, description) VALUES
  (
    'system',
    'ai.daily_recommendation_count',
    '{"count": 5}'::jsonb,
    'Number of customers recommended by AI each day'
  ),
  (
    'system',
    'ai.inactivity_lost_threshold_days',
    '{"days": 90}'::jsonb,
    'Days without order before customer is marked as lost'
  ),
  (
    'system',
    'ai.inactivity_warning_threshold_days',
    '{"days": 30}'::jsonb,
    'Days without order before customer is flagged inactive'
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.settings (company_id, scope, key, value, description) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'company',
    'integrations.whatsapp.enabled',
    '{"enabled": false}'::jsonb,
    'WhatsApp integration toggle'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'company',
    'integrations.sms.enabled',
    '{"enabled": false}'::jsonb,
    'SMS integration toggle'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'company',
    'mobile.offline_sync.enabled',
    '{"enabled": true}'::jsonb,
    'Offline mode sync for mobile and PWA'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'company',
    'notifications.push.enabled',
    '{"enabled": true}'::jsonb,
    'Push notification delivery toggle'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'company',
    'ai.scoring.weights',
    '{"average_monthly_tonnage": 0.05, "lifetime_tonnage": 0.01, "inactivity_days": 0.20, "days_since_call": 0.15, "days_since_follow_up": 0.10}'::jsonb,
    'Configurable AI scoring weights'
  )
ON CONFLICT DO NOTHING;

COMMIT;

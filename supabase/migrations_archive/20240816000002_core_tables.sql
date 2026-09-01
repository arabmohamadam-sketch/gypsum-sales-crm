-- =============================================================================
-- File 2: Core Tables (companies, users, roles, permissions)
-- =============================================================================

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug citext NOT NULL,
  legal_name text,
  timezone text NOT NULL DEFAULT 'Asia/Tehran',
  locale text NOT NULL DEFAULT 'fa-IR',
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT companies_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT companies_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE UNIQUE INDEX uq_companies_slug_active
  ON public.companies (slug)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------

CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies (id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug citext NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT roles_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT roles_slug_not_blank CHECK (btrim(slug::text) <> ''),
  CONSTRAINT roles_system_company_check CHECK (
    (is_system = true AND company_id IS NULL)
    OR (is_system = false AND company_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX uq_roles_company_slug_active
  ON public.roles (company_id, slug)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_roles_company_id ON public.roles (company_id) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------

CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource text NOT NULL,
  action text NOT NULL,
  slug citext NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT permissions_resource_not_blank CHECK (btrim(resource) <> ''),
  CONSTRAINT permissions_action_not_blank CHECK (btrim(action) <> ''),
  CONSTRAINT permissions_slug_not_blank CHECK (btrim(slug::text) <> '')
);

CREATE UNIQUE INDEX uq_permissions_slug_active
  ON public.permissions (slug)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX uq_permissions_resource_action_active
  ON public.permissions (resource, action)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------

CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles (id) ON DELETE RESTRICT,
  permission_id uuid NOT NULL REFERENCES public.permissions (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX uq_role_permissions_active
  ON public.role_permissions (role_id, permission_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_role_permissions_role_id ON public.role_permissions (role_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions (permission_id) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------

CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE RESTRICT,
  full_name text NOT NULL,
  email citext NOT NULL,
  phone text,
  avatar_url text,
  job_title text,
  employee_code text,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  push_token text,
  push_platform text,
  gps_tracking_enabled boolean NOT NULL DEFAULT false,
  last_known_latitude numeric(10, 7),
  last_known_longitude numeric(10, 7),
  last_known_location_at timestamptz,
  offline_sync_enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT users_full_name_not_blank CHECK (btrim(full_name) <> ''),
  CONSTRAINT users_email_not_blank CHECK (btrim(email::text) <> ''),
  CONSTRAINT users_latitude_range CHECK (
    last_known_latitude IS NULL OR (last_known_latitude >= -90 AND last_known_latitude <= 90)
  ),
  CONSTRAINT users_longitude_range CHECK (
    last_known_longitude IS NULL OR (last_known_longitude >= -180 AND last_known_longitude <= 180)
  )
);

CREATE UNIQUE INDEX uq_users_company_email_active
  ON public.users (company_id, email)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_users_company_id ON public.users (company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_is_active ON public.users (company_id, is_active) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  role_id uuid NOT NULL REFERENCES public.roles (id) ON DELETE RESTRICT,
  assigned_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX uq_user_roles_active
  ON public.user_roles (user_id, role_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_user_roles_user_id ON public.user_roles (user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_roles_role_id ON public.user_roles (role_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.companies IS 'Tenant root entity. Supports multi-company architecture.';
COMMENT ON TABLE public.users IS 'Application profile linked to Supabase auth.users.';
COMMENT ON TABLE public.roles IS 'RBAC roles. System roles are global; company roles are tenant-scoped.';
COMMENT ON TABLE public.permissions IS 'Fine-grained authorization capabilities.';
COMMENT ON TABLE public.user_roles IS 'Many-to-many mapping between users and roles.';

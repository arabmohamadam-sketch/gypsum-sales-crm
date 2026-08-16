-- =============================================================================
-- Gypsum Sales CRM — Extensions, Enums, and Shared Functions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------

CREATE TYPE public.customer_type AS ENUM (
  'building_material_store',
  'contractor',
  'employer',
  'plaster_worker'
);

CREATE TYPE public.order_status AS ENUM (
  'draft',
  'confirmed',
  'cancelled'
);

CREATE TYPE public.call_direction AS ENUM (
  'inbound',
  'outbound'
);

CREATE TYPE public.call_outcome AS ENUM (
  'answered',
  'no_answer',
  'busy',
  'voicemail',
  'wrong_number',
  'scheduled_callback'
);

CREATE TYPE public.integration_source AS ENUM (
  'manual',
  'mobile_app',
  'whatsapp',
  'sms',
  'pwa',
  'api'
);

CREATE TYPE public.follow_up_status AS ENUM (
  'pending',
  'completed',
  'cancelled',
  'overdue'
);

CREATE TYPE public.follow_up_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

CREATE TYPE public.visit_outcome AS ENUM (
  'productive',
  'no_contact',
  'rescheduled',
  'order_placed'
);

CREATE TYPE public.ai_task_status AS ENUM (
  'pending',
  'accepted',
  'dismissed',
  'completed'
);

CREATE TYPE public.notification_channel AS ENUM (
  'in_app',
  'push',
  'sms',
  'whatsapp',
  'email'
);

CREATE TYPE public.contact_method AS ENUM (
  'phone',
  'whatsapp',
  'sms',
  'email',
  'in_person'
);

CREATE TYPE public.address_type AS ENUM (
  'billing',
  'delivery',
  'office',
  'warehouse',
  'other'
);

CREATE TYPE public.setting_scope AS ENUM (
  'system',
  'company',
  'user'
);

CREATE TYPE public.note_entity_type AS ENUM (
  'customer',
  'order',
  'call',
  'visit',
  'follow_up',
  'user',
  'company'
);

CREATE TYPE public.attachment_entity_type AS ENUM (
  'customer',
  'order',
  'call',
  'visit',
  'follow_up',
  'note'
);

CREATE TYPE public.activity_action AS ENUM (
  'create',
  'update',
  'delete',
  'restore',
  'login',
  'logout',
  'export',
  'ai_recommend',
  'sync'
);

-- ---------------------------------------------------------------------------
-- Shared trigger functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Hard deletes are not allowed on %. Use deleted_at for soft deletes.', TG_TABLE_NAME;
END;
$$;

CREATE OR REPLACE FUNCTION public.auth_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.company_id
  FROM public.users u
  WHERE u.id = auth.uid()
    AND u.deleted_at IS NULL
    AND u.is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auth_user_has_permission(p_permission_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
    JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL AND r.is_active = true
    JOIN public.role_permissions rp ON rp.role_id = r.id AND rp.deleted_at IS NULL
    JOIN public.permissions p ON p.id = rp.permission_id AND p.deleted_at IS NULL
    WHERE u.id = auth.uid()
      AND u.deleted_at IS NULL
      AND u.is_active = true
      AND p.slug = p_permission_slug
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.auth_user_has_permission('admin.full_access');
$$;

COMMENT ON FUNCTION public.auth_user_company_id IS
  'Returns the active company_id for the authenticated user.';
COMMENT ON FUNCTION public.auth_user_has_permission IS
  'Checks whether the authenticated user has a given permission slug.';
COMMENT ON FUNCTION public.auth_user_is_admin IS
  'Returns true when the authenticated user has admin.full_access.';

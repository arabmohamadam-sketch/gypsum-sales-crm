-- =============================================================================
-- File 1: Extensions and Enums
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

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

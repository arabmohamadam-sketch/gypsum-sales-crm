-- =============================================================================
-- Gypsum Sales CRM — Targets, AI Tasks, and System Tables
-- =============================================================================

CREATE TABLE public.monthly_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  region_id uuid REFERENCES public.regions (id) ON DELETE SET NULL,
  target_year smallint NOT NULL,
  target_month smallint NOT NULL,
  target_tonnage numeric(14, 4) NOT NULL,
  notes text,
  created_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT monthly_targets_year_valid CHECK (target_year BETWEEN 2020 AND 2100),
  CONSTRAINT monthly_targets_month_valid CHECK (target_month BETWEEN 1 AND 12),
  CONSTRAINT monthly_targets_tonnage_positive CHECK (target_tonnage > 0)
);

CREATE UNIQUE INDEX uq_monthly_targets_scope_active
  ON public.monthly_targets (
    company_id,
    user_id,
    COALESCE(region_id, '00000000-0000-0000-0000-000000000000'::uuid),
    target_year,
    target_month
  )
  WHERE deleted_at IS NULL;

CREATE INDEX idx_monthly_targets_company_period ON public.monthly_targets (
  company_id, target_year, target_month
) WHERE deleted_at IS NULL;

CREATE INDEX idx_monthly_targets_user_period ON public.monthly_targets (
  company_id, user_id, target_year, target_month
) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_monthly_targets_updated_at
  BEFORE UPDATE ON public.monthly_targets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_monthly_targets_prevent_hard_delete
  BEFORE DELETE ON public.monthly_targets
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

COMMENT ON TABLE public.monthly_targets IS
  'Editable monthly tonnage targets per sales representative and optional region.';

-- ---------------------------------------------------------------------------

CREATE TABLE public.monthly_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  region_id uuid REFERENCES public.regions (id) ON DELETE SET NULL,
  progress_year smallint NOT NULL,
  progress_month smallint NOT NULL,
  achieved_tonnage numeric(14, 4) NOT NULL DEFAULT 0,
  target_tonnage numeric(14, 4) NOT NULL DEFAULT 0,
  order_count integer NOT NULL DEFAULT 0,
  achievement_rate numeric(7, 4) GENERATED ALWAYS AS (
    CASE
      WHEN target_tonnage > 0 THEN achieved_tonnage / target_tonnage
      ELSE 0
    END
  ) STORED,
  last_calculated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT monthly_progress_year_valid CHECK (progress_year BETWEEN 2020 AND 2100),
  CONSTRAINT monthly_progress_month_valid CHECK (progress_month BETWEEN 1 AND 12),
  CONSTRAINT monthly_progress_achieved_non_negative CHECK (achieved_tonnage >= 0),
  CONSTRAINT monthly_progress_target_non_negative CHECK (target_tonnage >= 0),
  CONSTRAINT monthly_progress_order_count_non_negative CHECK (order_count >= 0)
);

CREATE UNIQUE INDEX uq_monthly_progress_scope_active
  ON public.monthly_progress (
    company_id,
    user_id,
    COALESCE(region_id, '00000000-0000-0000-0000-000000000000'::uuid),
    progress_year,
    progress_month
  )
  WHERE deleted_at IS NULL;

CREATE INDEX idx_monthly_progress_company_period ON public.monthly_progress (
  company_id, progress_year, progress_month
) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_monthly_progress_updated_at
  BEFORE UPDATE ON public.monthly_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_monthly_progress_prevent_hard_delete
  BEFORE DELETE ON public.monthly_progress
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

COMMENT ON TABLE public.monthly_progress IS
  'Aggregated monthly tonnage achievement. Maintained by database triggers.';

-- ---------------------------------------------------------------------------

CREATE TABLE public.daily_ai_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES public.customers (id) ON DELETE RESTRICT,
  task_date date NOT NULL DEFAULT (timezone('utc', now()))::date,
  recommendation_rank smallint NOT NULL,
  priority_score numeric(10, 4) NOT NULL DEFAULT 0,
  scoring_factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.ai_task_status NOT NULL DEFAULT 'pending',
  reason text,
  accepted_at timestamptz,
  completed_at timestamptz,
  dismissed_at timestamptz,
  model_version text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT daily_ai_tasks_rank_valid CHECK (recommendation_rank BETWEEN 1 AND 5),
  CONSTRAINT daily_ai_tasks_priority_score_non_negative CHECK (priority_score >= 0)
);

CREATE UNIQUE INDEX uq_daily_ai_tasks_user_date_rank_active
  ON public.daily_ai_tasks (company_id, user_id, task_date, recommendation_rank)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX uq_daily_ai_tasks_user_date_customer_active
  ON public.daily_ai_tasks (company_id, user_id, task_date, customer_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_daily_ai_tasks_user_date ON public.daily_ai_tasks (
  company_id, user_id, task_date
) WHERE deleted_at IS NULL;

CREATE INDEX idx_daily_ai_tasks_customer ON public.daily_ai_tasks (
  company_id, customer_id, task_date DESC
) WHERE deleted_at IS NULL;

CREATE INDEX idx_daily_ai_tasks_status ON public.daily_ai_tasks (
  company_id, status, task_date DESC
) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_daily_ai_tasks_updated_at
  BEFORE UPDATE ON public.daily_ai_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_daily_ai_tasks_prevent_hard_delete
  BEFORE DELETE ON public.daily_ai_tasks
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

COMMENT ON TABLE public.daily_ai_tasks IS
  'Daily AI recommendations: exactly five prioritized customers per sales rep.';
COMMENT ON COLUMN public.daily_ai_tasks.scoring_factors IS
  'JSON breakdown of AI factors: tonnage history, inactivity, last call, follow-up, region, type.';

-- ---------------------------------------------------------------------------

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  channel public.notification_channel NOT NULL DEFAULT 'in_app',
  title text NOT NULL,
  body text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  sent_at timestamptz,
  external_message_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT notifications_title_not_blank CHECK (btrim(title) <> '')
);

CREATE INDEX idx_notifications_user_unread ON public.notifications (
  company_id, user_id, created_at DESC
) WHERE deleted_at IS NULL AND read_at IS NULL;

CREATE INDEX idx_notifications_user_id ON public.notifications (company_id, user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_channel ON public.notifications (company_id, channel) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_notifications_prevent_hard_delete
  BEFORE DELETE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

-- ---------------------------------------------------------------------------

CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE RESTRICT,
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  action public.activity_action NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  description text,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  source public.integration_source NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT activity_logs_entity_type_not_blank CHECK (btrim(entity_type) <> '')
);

CREATE INDEX idx_activity_logs_company_created ON public.activity_logs (
  company_id, created_at DESC
) WHERE deleted_at IS NULL;

CREATE INDEX idx_activity_logs_entity ON public.activity_logs (
  company_id, entity_type, entity_id
) WHERE deleted_at IS NULL;

CREATE INDEX idx_activity_logs_user_id ON public.activity_logs (company_id, user_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_activity_logs_updated_at
  BEFORE UPDATE ON public.activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_activity_logs_prevent_hard_delete
  BEFORE DELETE ON public.activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

-- ---------------------------------------------------------------------------

CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE RESTRICT,
  author_id uuid NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  entity_type public.note_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  content text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  client_uuid uuid,
  sync_version integer NOT NULL DEFAULT 1,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT notes_content_not_blank CHECK (btrim(content) <> '')
);

CREATE INDEX idx_notes_entity ON public.notes (
  company_id, entity_type, entity_id
) WHERE deleted_at IS NULL;

CREATE INDEX idx_notes_author_id ON public.notes (company_id, author_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_notes_prevent_hard_delete
  BEFORE DELETE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

-- ---------------------------------------------------------------------------

CREATE TABLE public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE RESTRICT,
  uploaded_by uuid NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  entity_type public.attachment_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size_bytes bigint NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'attachments',
  storage_path text NOT NULL,
  checksum_sha256 text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_uuid uuid,
  sync_version integer NOT NULL DEFAULT 1,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT attachments_file_name_not_blank CHECK (btrim(file_name) <> ''),
  CONSTRAINT attachments_file_size_positive CHECK (file_size_bytes > 0)
);

CREATE INDEX idx_attachments_entity ON public.attachments (
  company_id, entity_type, entity_id
) WHERE deleted_at IS NULL;

CREATE INDEX idx_attachments_uploaded_by ON public.attachments (company_id, uploaded_by) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_attachments_updated_at
  BEFORE UPDATE ON public.attachments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_attachments_prevent_hard_delete
  BEFORE DELETE ON public.attachments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

-- ---------------------------------------------------------------------------

CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies (id) ON DELETE RESTRICT,
  user_id uuid REFERENCES public.users (id) ON DELETE RESTRICT,
  scope public.setting_scope NOT NULL,
  key citext NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_encrypted boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT settings_key_not_blank CHECK (btrim(key::text) <> ''),
  CONSTRAINT settings_scope_company_check CHECK (
    (scope = 'system' AND company_id IS NULL AND user_id IS NULL)
    OR (scope = 'company' AND company_id IS NOT NULL AND user_id IS NULL)
    OR (scope = 'user' AND company_id IS NOT NULL AND user_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX uq_settings_system_key_active
  ON public.settings (scope, key)
  WHERE deleted_at IS NULL AND scope = 'system';

CREATE UNIQUE INDEX uq_settings_company_key_active
  ON public.settings (company_id, key)
  WHERE deleted_at IS NULL AND scope = 'company';

CREATE UNIQUE INDEX uq_settings_user_key_active
  ON public.settings (company_id, user_id, key)
  WHERE deleted_at IS NULL AND scope = 'user';

CREATE INDEX idx_settings_company_id ON public.settings (company_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_settings_prevent_hard_delete
  BEFORE DELETE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

COMMENT ON TABLE public.settings IS
  'System, company, and user settings. Supports WhatsApp, SMS, AI, and PWA configuration.';

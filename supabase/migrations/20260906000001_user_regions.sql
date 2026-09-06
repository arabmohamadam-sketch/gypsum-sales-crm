BEGIN;

-- ============================================================
-- User ↔ Region assignment
-- ============================================================

CREATE TABLE public.user_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id uuid NOT NULL
    REFERENCES public.companies (id)
    ON DELETE RESTRICT,

  user_id uuid NOT NULL
    REFERENCES public.users (id)
    ON DELETE RESTRICT,

  region_id uuid NOT NULL
    REFERENCES public.regions (id)
    ON DELETE RESTRICT,

  assigned_by uuid
    REFERENCES public.users (id)
    ON DELETE SET NULL,

  assigned_at timestamptz NOT NULL
    DEFAULT timezone('utc', now()),

  created_at timestamptz NOT NULL
    DEFAULT timezone('utc', now()),

  updated_at timestamptz NOT NULL
    DEFAULT timezone('utc', now()),

  deleted_at timestamptz
);

-- فقط یک تخصیص فعال برای هر user/region
CREATE UNIQUE INDEX uq_user_regions_active
  ON public.user_regions (company_id, user_id, region_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_user_regions_company_user
  ON public.user_regions (company_id, user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_user_regions_company_region
  ON public.user_regions (company_id, region_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_user_regions_assigned_by
  ON public.user_regions (company_id, assigned_by)
  WHERE deleted_at IS NULL;

-- updated_at
CREATE TRIGGER trg_user_regions_updated_at
  BEFORE UPDATE ON public.user_regions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- جلوگیری از حذف فیزیکی
CREATE TRIGGER trg_user_regions_prevent_hard_delete
  BEFORE DELETE ON public.user_regions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_hard_delete();

COMMENT ON TABLE public.user_regions IS
  'Assignment of application users to sales regions. Used for manager scope and regional access control.';

COMMENT ON COLUMN public.user_regions.assigned_by IS
  'User who created the region assignment.';

COMMIT;
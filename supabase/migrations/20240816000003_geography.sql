-- =============================================================================
-- Gypsum Sales CRM — Regions and Cities
-- =============================================================================

CREATE TABLE public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE RESTRICT,
  name text NOT NULL,
  code citext NOT NULL,
  description text,
  sort_order smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT regions_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT regions_code_not_blank CHECK (btrim(code::text) <> '')
);

CREATE UNIQUE INDEX uq_regions_company_code_active
  ON public.regions (company_id, code)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX uq_regions_company_name_active
  ON public.regions (company_id, name)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_regions_company_id ON public.regions (company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_regions_sort_order ON public.regions (company_id, sort_order) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_regions_updated_at
  BEFORE UPDATE ON public.regions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_regions_prevent_hard_delete
  BEFORE DELETE ON public.regions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

-- ---------------------------------------------------------------------------

CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE RESTRICT,
  region_id uuid NOT NULL REFERENCES public.regions (id) ON DELETE RESTRICT,
  name text NOT NULL,
  code citext,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT cities_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT cities_latitude_range CHECK (
    latitude IS NULL OR (latitude >= -90 AND latitude <= 90)
  ),
  CONSTRAINT cities_longitude_range CHECK (
    longitude IS NULL OR (longitude >= -180 AND longitude <= 180)
  )
);

CREATE UNIQUE INDEX uq_cities_company_region_name_active
  ON public.cities (company_id, region_id, name)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_cities_company_id ON public.cities (company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cities_region_id ON public.cities (region_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cities_company_region ON public.cities (company_id, region_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_cities_updated_at
  BEFORE UPDATE ON public.cities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_cities_prevent_hard_delete
  BEFORE DELETE ON public.cities
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

COMMENT ON TABLE public.regions IS 'Sales territories grouped for reporting and target assignment.';
COMMENT ON TABLE public.cities IS 'Cities within a sales region. Used for customer assignment and AI prioritization.';

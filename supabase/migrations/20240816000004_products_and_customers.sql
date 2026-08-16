-- =============================================================================
-- Gypsum Sales CRM — Products and Customers
-- =============================================================================

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE RESTRICT,
  name text NOT NULL,
  sku citext NOT NULL,
  product_line text NOT NULL,
  weight_kg smallint NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT products_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT products_sku_not_blank CHECK (btrim(sku::text) <> ''),
  CONSTRAINT products_line_not_blank CHECK (btrim(product_line) <> ''),
  CONSTRAINT products_weight_kg_valid CHECK (weight_kg IN (25, 30))
);

CREATE UNIQUE INDEX uq_products_company_sku_active
  ON public.products (company_id, sku)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX uq_products_company_name_active
  ON public.products (company_id, name)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_products_company_id ON public.products (company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_company_active ON public.products (company_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_line ON public.products (company_id, product_line) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_products_prevent_hard_delete
  BEFORE DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

COMMENT ON TABLE public.products IS
  'Gypsum product catalog. Used exclusively for tonnage calculation — no pricing stored.';

-- ---------------------------------------------------------------------------

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE RESTRICT,
  city_id uuid NOT NULL REFERENCES public.cities (id) ON DELETE RESTRICT,
  assigned_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  customer_type public.customer_type NOT NULL,
  name text NOT NULL,
  code citext,
  phone text,
  whatsapp_number text,
  preferred_contact_method public.contact_method NOT NULL DEFAULT 'phone',
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  is_active boolean NOT NULL DEFAULT true,
  is_vip boolean NOT NULL DEFAULT false,
  -- Denormalized metrics for AI prioritization and reporting performance
  lifetime_tonnage numeric(14, 4) NOT NULL DEFAULT 0,
  average_monthly_tonnage numeric(14, 4) NOT NULL DEFAULT 0,
  total_order_count integer NOT NULL DEFAULT 0,
  last_order_at timestamptz,
  last_call_at timestamptz,
  last_follow_up_at timestamptz,
  last_visit_at timestamptz,
  inactivity_days integer NOT NULL DEFAULT 0,
  lost_at timestamptz,
  client_uuid uuid,
  sync_version integer NOT NULL DEFAULT 1,
  last_synced_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT customers_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT customers_latitude_range CHECK (
    latitude IS NULL OR (latitude >= -90 AND latitude <= 90)
  ),
  CONSTRAINT customers_longitude_range CHECK (
    longitude IS NULL OR (longitude >= -180 AND longitude <= 180)
  ),
  CONSTRAINT customers_lifetime_tonnage_non_negative CHECK (lifetime_tonnage >= 0),
  CONSTRAINT customers_average_monthly_tonnage_non_negative CHECK (average_monthly_tonnage >= 0),
  CONSTRAINT customers_total_order_count_non_negative CHECK (total_order_count >= 0),
  CONSTRAINT customers_inactivity_days_non_negative CHECK (inactivity_days >= 0)
);

CREATE UNIQUE INDEX uq_customers_company_code_active
  ON public.customers (company_id, code)
  WHERE deleted_at IS NULL AND code IS NOT NULL;

CREATE UNIQUE INDEX uq_customers_client_uuid_active
  ON public.customers (company_id, client_uuid)
  WHERE deleted_at IS NULL AND client_uuid IS NOT NULL;

CREATE INDEX idx_customers_company_id ON public.customers (company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_city_id ON public.customers (company_id, city_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_assigned_user ON public.customers (company_id, assigned_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_type ON public.customers (company_id, customer_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_last_order_at ON public.customers (company_id, last_order_at DESC NULLS LAST) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_last_call_at ON public.customers (company_id, last_call_at DESC NULLS LAST) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_inactivity ON public.customers (company_id, inactivity_days DESC) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX idx_customers_ai_candidates ON public.customers (
  company_id,
  assigned_user_id,
  last_order_at,
  inactivity_days,
  average_monthly_tonnage DESC
) WHERE deleted_at IS NULL AND is_active = true;

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_customers_prevent_hard_delete
  BEFORE DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

-- ---------------------------------------------------------------------------

CREATE TABLE public.customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES public.customers (id) ON DELETE RESTRICT,
  full_name text NOT NULL,
  job_title text,
  phone text,
  whatsapp_number text,
  email citext,
  is_primary boolean NOT NULL DEFAULT false,
  preferred_contact_method public.contact_method,
  notes text,
  client_uuid uuid,
  sync_version integer NOT NULL DEFAULT 1,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT customer_contacts_name_not_blank CHECK (btrim(full_name) <> '')
);

CREATE INDEX idx_customer_contacts_customer_id ON public.customer_contacts (customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_contacts_company_id ON public.customer_contacts (company_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_customer_contacts_primary_active
  ON public.customer_contacts (customer_id)
  WHERE deleted_at IS NULL AND is_primary = true;

CREATE TRIGGER trg_customer_contacts_updated_at
  BEFORE UPDATE ON public.customer_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_customer_contacts_prevent_hard_delete
  BEFORE DELETE ON public.customer_contacts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

-- ---------------------------------------------------------------------------

CREATE TABLE public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES public.customers (id) ON DELETE RESTRICT,
  city_id uuid REFERENCES public.cities (id) ON DELETE SET NULL,
  address_type public.address_type NOT NULL DEFAULT 'delivery',
  label text,
  address_line_1 text NOT NULL,
  address_line_2 text,
  postal_code text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  is_primary boolean NOT NULL DEFAULT false,
  client_uuid uuid,
  sync_version integer NOT NULL DEFAULT 1,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT customer_addresses_line_not_blank CHECK (btrim(address_line_1) <> ''),
  CONSTRAINT customer_addresses_latitude_range CHECK (
    latitude IS NULL OR (latitude >= -90 AND latitude <= 90)
  ),
  CONSTRAINT customer_addresses_longitude_range CHECK (
    longitude IS NULL OR (longitude >= -180 AND longitude <= 180)
  )
);

CREATE INDEX idx_customer_addresses_customer_id ON public.customer_addresses (customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_addresses_company_id ON public.customer_addresses (company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_addresses_city_id ON public.customer_addresses (city_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_addresses_geo ON public.customer_addresses (latitude, longitude) WHERE deleted_at IS NULL AND latitude IS NOT NULL;
CREATE UNIQUE INDEX uq_customer_addresses_primary_active
  ON public.customer_addresses (customer_id)
  WHERE deleted_at IS NULL AND is_primary = true;

CREATE TRIGGER trg_customer_addresses_updated_at
  BEFORE UPDATE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_customer_addresses_prevent_hard_delete
  BEFORE DELETE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

COMMENT ON TABLE public.customers IS
  'Gypsum distribution customers. Tonnage-centric CRM with denormalized AI scoring fields.';
COMMENT ON COLUMN public.customers.client_uuid IS
  'Offline/mobile client identifier for idempotent sync.';

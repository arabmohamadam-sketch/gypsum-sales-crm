-- =============================================================================
-- Gypsum Sales CRM — Orders and Sales Activities
-- =============================================================================

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES public.customers (id) ON DELETE RESTRICT,
  sales_user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  order_date date NOT NULL DEFAULT (timezone('utc', now()))::date,
  status public.order_status NOT NULL DEFAULT 'confirmed',
  total_tonnage numeric(14, 4) NOT NULL DEFAULT 0,
  notes text,
  source public.integration_source NOT NULL DEFAULT 'manual',
  client_uuid uuid,
  sync_version integer NOT NULL DEFAULT 1,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT orders_total_tonnage_non_negative CHECK (total_tonnage >= 0)
);

CREATE UNIQUE INDEX uq_orders_client_uuid_active
  ON public.orders (company_id, client_uuid)
  WHERE deleted_at IS NULL AND client_uuid IS NOT NULL;

CREATE INDEX idx_orders_company_id ON public.orders (company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_customer_id ON public.orders (company_id, customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_sales_user_id ON public.orders (company_id, sales_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_order_date ON public.orders (company_id, order_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_status ON public.orders (company_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_customer_month ON public.orders (
  company_id,
  customer_id,
  order_date
) WHERE deleted_at IS NULL AND status = 'confirmed';

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_orders_prevent_hard_delete
  BEFORE DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

COMMENT ON TABLE public.orders IS
  'Confirmed sales orders. Stores tonnage only — no prices or invoices.';

-- ---------------------------------------------------------------------------

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE RESTRICT,
  quantity integer NOT NULL,
  weight_kg_snapshot smallint NOT NULL,
  tonnage numeric(14, 4) GENERATED ALWAYS AS (
    (quantity::numeric * weight_kg_snapshot::numeric) / 1000.0
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT order_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT order_items_weight_kg_valid CHECK (weight_kg_snapshot IN (25, 30))
);

CREATE INDEX idx_order_items_order_id ON public.order_items (order_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_order_items_product_id ON public.order_items (company_id, product_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_order_items_company_id ON public.order_items (company_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_order_items_updated_at
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_order_items_prevent_hard_delete
  BEFORE DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

-- ---------------------------------------------------------------------------

CREATE TABLE public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES public.customers (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  call_date timestamptz NOT NULL DEFAULT timezone('utc', now()),
  direction public.call_direction NOT NULL DEFAULT 'outbound',
  outcome public.call_outcome NOT NULL DEFAULT 'answered',
  duration_seconds integer NOT NULL DEFAULT 0,
  notes text,
  source public.integration_source NOT NULL DEFAULT 'manual',
  external_reference text,
  client_uuid uuid,
  sync_version integer NOT NULL DEFAULT 1,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT calls_duration_non_negative CHECK (duration_seconds >= 0)
);

CREATE INDEX idx_calls_company_id ON public.calls (company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_calls_customer_id ON public.calls (company_id, customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_calls_user_id ON public.calls (company_id, user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_calls_call_date ON public.calls (company_id, call_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_calls_source ON public.calls (company_id, source) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_calls_updated_at
  BEFORE UPDATE ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_calls_prevent_hard_delete
  BEFORE DELETE ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

-- ---------------------------------------------------------------------------

CREATE TABLE public.follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES public.customers (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  scheduled_at timestamptz NOT NULL,
  completed_at timestamptz,
  status public.follow_up_status NOT NULL DEFAULT 'pending',
  priority public.follow_up_priority NOT NULL DEFAULT 'medium',
  subject text,
  notes text,
  source public.integration_source NOT NULL DEFAULT 'manual',
  client_uuid uuid,
  sync_version integer NOT NULL DEFAULT 1,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT follow_ups_completed_after_scheduled CHECK (
    completed_at IS NULL OR completed_at >= scheduled_at
  )
);

CREATE INDEX idx_follow_ups_company_id ON public.follow_ups (company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_follow_ups_customer_id ON public.follow_ups (company_id, customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_follow_ups_user_id ON public.follow_ups (company_id, user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_follow_ups_scheduled_at ON public.follow_ups (company_id, scheduled_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_follow_ups_status ON public.follow_ups (company_id, status, scheduled_at) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_follow_ups_updated_at
  BEFORE UPDATE ON public.follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_follow_ups_prevent_hard_delete
  BEFORE DELETE ON public.follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

-- ---------------------------------------------------------------------------

CREATE TABLE public.customer_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES public.customers (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  visit_date timestamptz NOT NULL DEFAULT timezone('utc', now()),
  check_in_latitude numeric(10, 7),
  check_in_longitude numeric(10, 7),
  check_out_latitude numeric(10, 7),
  check_out_longitude numeric(10, 7),
  check_in_at timestamptz,
  check_out_at timestamptz,
  outcome public.visit_outcome NOT NULL DEFAULT 'productive',
  notes text,
  source public.integration_source NOT NULL DEFAULT 'mobile_app',
  client_uuid uuid,
  sync_version integer NOT NULL DEFAULT 1,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT customer_visits_check_in_latitude_range CHECK (
    check_in_latitude IS NULL OR (check_in_latitude >= -90 AND check_in_latitude <= 90)
  ),
  CONSTRAINT customer_visits_check_in_longitude_range CHECK (
    check_in_longitude IS NULL OR (check_in_longitude >= -180 AND check_in_longitude <= 180)
  ),
  CONSTRAINT customer_visits_check_out_latitude_range CHECK (
    check_out_latitude IS NULL OR (check_out_latitude >= -90 AND check_out_latitude <= 90)
  ),
  CONSTRAINT customer_visits_check_out_longitude_range CHECK (
    check_out_longitude IS NULL OR (check_out_longitude >= -180 AND check_out_longitude <= 180)
  ),
  CONSTRAINT customer_visits_checkout_after_checkin CHECK (
    check_out_at IS NULL OR check_in_at IS NULL OR check_out_at >= check_in_at
  )
);

CREATE INDEX idx_customer_visits_company_id ON public.customer_visits (company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_visits_customer_id ON public.customer_visits (company_id, customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_visits_user_id ON public.customer_visits (company_id, user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_visits_visit_date ON public.customer_visits (company_id, visit_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_visits_geo ON public.customer_visits (check_in_latitude, check_in_longitude)
  WHERE deleted_at IS NULL AND check_in_latitude IS NOT NULL;

CREATE TRIGGER trg_customer_visits_updated_at
  BEFORE UPDATE ON public.customer_visits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_customer_visits_prevent_hard_delete
  BEFORE DELETE ON public.customer_visits
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

COMMENT ON TABLE public.order_items IS
  'Line items with weight snapshot for immutable tonnage calculation.';
COMMENT ON TABLE public.customer_visits IS
  'Field visits with GPS check-in/out for mobile and PWA offline sync.';

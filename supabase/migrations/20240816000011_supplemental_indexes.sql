-- =============================================================================
-- Gypsum Sales CRM — Supplemental Performance Indexes
-- =============================================================================

-- Composite reporting indexes
CREATE INDEX IF NOT EXISTS idx_orders_company_date_status_tonnage
  ON public.orders (company_id, order_date DESC, status, total_tonnage)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_company_product_tonnage
  ON public.order_items (company_id, product_id, tonnage)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_company_region_via_city
  ON public.customers (company_id, city_id, customer_type, inactivity_days)
  WHERE deleted_at IS NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_follow_ups_due
  ON public.follow_ups (company_id, user_id, scheduled_at)
  WHERE deleted_at IS NULL AND status IN ('pending', 'overdue');

CREATE INDEX IF NOT EXISTS idx_daily_ai_tasks_pending
  ON public.daily_ai_tasks (company_id, user_id, task_date, recommendation_rank)
  WHERE deleted_at IS NULL AND status = 'pending';

CREATE INDEX IF NOT EXISTS idx_activity_logs_recent
  ON public.activity_logs (company_id, created_at DESC, action)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notes_pinned
  ON public.notes (company_id, entity_type, entity_id, is_pinned)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_attachments_storage
  ON public.attachments (company_id, storage_bucket, storage_path)
  WHERE deleted_at IS NULL;

-- Full-text search support for customers
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm
  ON public.customers USING gin (name gin_trgm_ops)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX public.idx_customers_name_trgm IS
  'Requires pg_trgm extension for fuzzy customer search.';

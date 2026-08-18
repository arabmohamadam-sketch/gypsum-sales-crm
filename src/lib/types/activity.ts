export interface Call {
  id: string;
  company_id: string;
  customer_id: string;
  user_id: string;

  call_date: string;

  direction: string;
  outcome: string;

  duration_seconds: number;

  notes: string | null;

  source: string;
  external_reference: string | null;

  client_uuid: string | null;
  sync_version: number;
  last_synced_at: string | null;

  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FollowUp {
  id: string;
  company_id: string;
  customer_id: string;
  user_id: string;

  scheduled_at: string;
  completed_at: string | null;

  status: string;
  priority: string;

  subject: string | null;
  notes: string | null;

  source: string;

  client_uuid: string | null;
  sync_version: number;
  last_synced_at: string | null;

  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CustomerActivity {
  company_id: string;
  customer_id: string;
  customer_name: string;

  order_count: number;
  call_count: number;
  follow_up_count: number;
  visit_count: number;

  last_activity_at: string;
}
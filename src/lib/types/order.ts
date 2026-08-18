export interface Order {
  id: string;
  company_id: string;
  customer_id: string;
  sales_user_id: string;

  order_date: string;

  status: string;

  total_tonnage: number;

  notes: string | null;

  source: string;

  client_uuid: string | null;
  sync_version: number;
  last_synced_at: string | null;

  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
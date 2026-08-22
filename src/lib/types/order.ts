export interface OrderCustomer {
  id: string;
  name: string;
  phone: string | null;
  customer_type?: string | null;
}

export interface OrderSalesUser {
  id: string;
  full_name: string;
  phone: string | null;
  job_title: string | null;
  employee_code?: string | null;
}

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

  customer?: OrderCustomer | null;
  sales_user?: OrderSalesUser | null;
}
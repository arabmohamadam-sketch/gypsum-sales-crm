export interface OrderCustomer {
  id: string;
  name: string;
  phone: string | null;
  customer_type: string | null;
}

export interface OrderSalesUser {
  id: string;
  full_name: string;
  phone: string | null;
  job_title: string | null;
  employee_code: string | null;
}

export interface OrderItem {
  id: string;
  company_id: string;
  order_id: string;
  product_id: string | null;
  quantity: number;
  weight_kg_snapshot: number;
  tonnage: number | null;
  product_name_snapshot: string | null;
  bag_weight_kg: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface OrderItemInput {
  product_id?: string | null;
  product_name_snapshot: string;
  bag_weight_kg?: number | null;
  quantity?: number;
  weight_kg_snapshot?: number;
  tonnage?: number;
}

export type CreateOrderItemInput =
  OrderItemInput;

export interface UpdateOrderItemInput {
  product_id?: string | null;
  product_name_snapshot?: string;
  bag_weight_kg?: number | null;
  quantity?: number;
  weight_kg_snapshot?: number;
  tonnage?: number;
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
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_version: number | null;

  customer: OrderCustomer | null;
  sales_user: OrderSalesUser | null;
  items: OrderItem[];
}

export interface OrderWithRelations
  extends Order {}
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

export type OrderApprovalStage = "regional" | "sales";

export type OrderApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "returned"
  | "cancelled";

export type OrderFulfillmentStatus =
  | "not_ready"
  | "ready"
  | "partially_allocated"
  | "allocated"
  | "loading"
  | "loaded"
  | "sent"
  | "completed"
  | "cancelled";

export type OrderDeliveryStatus =
  | "not_started"
  | "partial"
  | "delivered"
  | "rejected"
  | "cancelled";

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

export type CreateOrderItemInput = OrderItemInput;

export interface UpdateOrderItemInput {
  product_id?: string | null;
  product_name_snapshot?: string;
  bag_weight_kg?: number | null;
  quantity?: number;
  weight_kg_snapshot?: number;
  tonnage?: number;
}

export interface OrderApproval {
  id: string;
  company_id: string;
  order_id: string;
  approval_stage: OrderApprovalStage;
  cycle_number: number;
  status: OrderApprovalStatus;
  acted_by: string | null;
  acted_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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

  /**
   * V2 workflow fields.
   *
   * These columns are nullable in the database intentionally so that
   * existing V1 orders keep working without receiving a false V2 state.
   */
  approval_status: OrderApprovalStatus | null;
  fulfillment_status: OrderFulfillmentStatus | null;
  delivery_status: OrderDeliveryStatus | null;

  customer: OrderCustomer | null;
  sales_user: OrderSalesUser | null;

  items: OrderItem[];
}

export interface OrderWithRelations extends Order {
  customer: OrderCustomer | null;
  sales_user: OrderSalesUser | null;
  items: OrderItem[];

  /**
   * Filled by V2 order services when approval history is requested.
   * Kept optional so existing V1 data-loading paths remain compatible.
   */
  approval_history?: OrderApproval[];
}
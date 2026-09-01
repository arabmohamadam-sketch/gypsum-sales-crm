export type WaybillStatus =
  | "draft"
  | "issued"
  | "loading_confirmed"
  | "cancelled";

export type LoadingStatus =
  | "pending"
  | "confirmed"
  | "cancelled";

export interface Waybill {
  id: string;
  company_id: string;
  order_id: string;
  waybill_number: number;
  waybill_date: string;
  status: WaybillStatus;
  notes: string | null;
  issued_at: string | null;
  issued_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  items: WaybillItem[];
  loading: Loading | null;
}

export interface WaybillItem {
  id: string;
  company_id: string;
  waybill_id: string;
  order_item_id: string;
  product_id: string;
  product_name_snapshot: string;
  quantity: number;
  weight_kg_snapshot: number;
  tonnage: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Loading {
  id: string;
  company_id: string;
  waybill_id: string;
  status: LoadingStatus;
  loading_date: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateWaybillInput {
  order_id: string;
  waybill_date: string;
  notes?: string | null;
}

export interface CreateWaybillItemInput {
  company_id: string;
  waybill_id: string;
  order_item_id: string;
  product_id: string;
  product_name_snapshot: string;
  quantity: number;
  weight_kg_snapshot: number;
}

export interface UpdateWaybillInput {
  waybill_date?: string;
  notes?: string | null;
}

export interface UpdateLoadingInput {
  loading_date?: string | null;
  notes?: string | null;
}
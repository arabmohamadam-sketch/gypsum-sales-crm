export interface CustomerCity {
    id: string;
    name: string;
    code: string | null;
  }
  
  export interface Customer {
    id: string;
    company_id: string;
    city_id: string;
    assigned_user_id: string | null;
  
    customer_type: string;
    name: string;
    code: string | null;
  
    phone: string | null;
    whatsapp_number: string | null;
    preferred_contact_method: string;
  
    latitude: number | null;
    longitude: number | null;
  
    is_active: boolean;
    is_vip: boolean;
  
    lifetime_tonnage: number;
    average_monthly_tonnage: number;
    total_order_count: number;
  
    last_order_at: string | null;
    last_call_at: string | null;
    last_follow_up_at: string | null;
    last_visit_at: string | null;
  
    inactivity_days: number;
  
    lost_at: string | null;
  
    client_uuid: string | null;
    sync_version: number;
    last_synced_at: string | null;
  
    metadata: Record<string, unknown>;
  
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  
    city?: CustomerCity | null;
  }
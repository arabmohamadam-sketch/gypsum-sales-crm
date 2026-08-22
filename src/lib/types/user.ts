export interface User {
    id: string;
    company_id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    job_title: string | null;
    employee_code: string | null;
    is_active: boolean;
    last_login_at: string | null;
    push_token: string | null;
    push_platform: string | null;
    gps_tracking_enabled: boolean;
    last_known_latitude: number | null;
    last_known_longitude: number | null;
    last_known_location_at: string | null;
    offline_sync_enabled: boolean;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  }
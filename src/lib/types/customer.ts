export interface CustomerCity {
  id: string;
  company_id?: string | null;
  name: string;
  code?: string | null;
}

export interface CustomerV2PrimaryAddress {
  id: string;
  company_id: string;
  customer_id: string;

  v2_province_code: string | null;
  v2_province_name: string | null;

  v2_city_code: string | null;
  v2_city_name: string | null;

  address_line_1: string;
  address_line_2: string | null;
  postal_code: string | null;

  latitude: number | null;
  longitude: number | null;

  address_type:
    | "billing"
    | "delivery"
    | "office"
    | "warehouse"
    | "other";

  label: string | null;
  is_primary: boolean;

  client_uuid: string | null;
  sync_version: number;
  last_synced_at: string | null;

  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CustomerV2Completeness {
  is_complete: boolean;

  missing_fields: Array<
    | "name"
    | "phone"
    | "regional_manager"
    | "province"
    | "city"
    | "address"
    | "national_id"
  >;

  customer_id: string;

  checked_at: string;
}

export interface Customer {
  id: string;
  company_id: string;

  /*
   * V1 legacy geography reference.
   *
   * V2 no longer depends on this field for the customer's province/city.
   * It may therefore be NULL for a V2 customer whose location exists only
   * in the shared V2 location master.
   */
  city_id: string | null;

  /*
   * V1 legacy sales representative assignment.
   *
   * This field remains untouched for V1 compatibility.
   * V2 ownership uses regional_manager_id.
   */
  assigned_user_id: string | null;

  /*
   * V2 commercial ownership.
   *
   * This is the Regional Manager responsible for the customer.
   * It is independent from the customer's geographic province.
   */
  regional_manager_id: string | null;

  /*
   * V2 sales-plan scope.
   *
   * regional:
   *   Customer contributes to a specific regional plan.
   *
   * out_of_region:
   *   Customer contributes to the manager's overall result without
   *   contributing to a regional target.
   */
  plan_scope:
    | "regional"
    | "out_of_region"
    | null;

  /*
   * V2 regional sales target when plan_scope = regional.
   */
  plan_region_id: string | null;

  customer_type: string;
  name: string;

  code: string | null;

  phone: string | null;
  secondary_phone: string | null;
  whatsapp_number: string | null;
  preferred_contact_method: string;

  /*
   * V2 required national identification number.
   * Stored as a 10-digit string when completed.
   */
  national_id: string | null;

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

  /*
   * Legacy V1 city relation.
   */
  city?: CustomerCity | null;

  /*
   * V2 customer's primary/master address.
   *
   * This is NOT necessarily the delivery address used later for
   * shipment or voucher issuance.
   */
  v2_primary_address?: CustomerV2PrimaryAddress | null;

  /*
   * Optional result of the V2 completeness check.
   */
  v2_completeness?: CustomerV2Completeness;
}
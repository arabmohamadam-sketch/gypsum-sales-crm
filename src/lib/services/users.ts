import { createSupabaseClient } from "@/src/lib/supabase";

const COMPANY_ID = "11111111-1111-1111-1111-111111111111";

export interface SalesUser {
  id: string;
  company_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  job_title: string | null;
  employee_code: string | null;
  is_active: boolean;
}

export const usersService = {
  async getSalesUsers(): Promise<SalesUser[]> {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("users")
      .select(
        `
          id,
          company_id,
          full_name,
          email,
          phone,
          avatar_url,
          job_title,
          employee_code,
          is_active
        `
      )
      .eq("company_id", COMPANY_ID)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("full_name", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Error fetching sales users:",
        error
      );

      throw error;
    }

    return (data ?? []) as SalesUser[];
  },
};
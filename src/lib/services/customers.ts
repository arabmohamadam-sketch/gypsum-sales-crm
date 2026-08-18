import { createSupabaseClient } from "@/src/lib/supabase";

export const customersService = {
  async getAll() {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("customers")
      .select(`
        *,
        city:cities(
          id,
          name,
          code
        )
      `)
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (error) {
      console.error("خطا در دریافت مشتریان:", error);
      throw error;
    }

    return data ?? [];
  },

  async getById(id: string) {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("customers")
      .select(`
        *,
        city:cities(
          id,
          name,
          code
        )
      `)
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      console.error("خطا در دریافت اطلاعات مشتری:", error);
      throw error;
    }

    return data;
  },

  async update(
    id: string,
    values: {
      name?: string;
      phone?: string | null;
      whatsapp_number?: string | null;
      customer_type?: string;
      is_vip?: boolean;
      is_active?: boolean;
      city_id?: string | null;
      metadata?: any;
    }
  ) {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("customers")
      .update({
        ...values,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`
        *,
        city:cities(
          id,
          name,
          code
        )
      `)
      .single();

    if (error) {
      console.error("خطا در بروزرسانی مشتری:", error);
      throw error;
    }

    return data;
  },
};
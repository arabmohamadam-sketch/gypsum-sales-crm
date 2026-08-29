import { createSupabaseClient } from "@/src/lib/supabase";
import type { Customer } from "@/src/lib/types/customer";

const COMPANY_ID = "11111111-1111-1111-1111-111111111111";

export interface CustomerCity {
  id: string;
  company_id?: string | null;
  name: string;
  code?: string | null;
}

function logSupabaseError(
  title: string,
  error: {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  }
) {
  console.error(title, {
    message: error?.message ?? "",
    details: error?.details ?? "",
    hint: error?.hint ?? "",
    code: error?.code ?? "",
  });
}

export const customersService = {
  async getAll(): Promise<Customer[]> {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("company_id", COMPANY_ID)
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (error) {
      logSupabaseError(
        "خطا در دریافت فهرست مشتریان:",
        error
      );
      throw error;
    }

    return (data ?? []) as Customer[];
  },

  async getById(id: string): Promise<Customer> {
    const supabase = createSupabaseClient();

    if (!id || !id.trim()) {
      throw new Error(
        "شناسه مشتری مشخص نیست."
      );
    }

    const customerId = id.trim();

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .eq("company_id", COMPANY_ID)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      logSupabaseError(
        "خطا در دریافت مشتری:",
        error
      );
      throw error;
    }

    if (!data) {
      throw new Error(
        `مشتری با شناسه ${customerId} پیدا نشد یا دسترسی خواندن آن وجود ندارد.`
      );
    }

    return data as Customer;
  },

  async getCities(): Promise<CustomerCity[]> {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("cities")
      .select("id, company_id, name, code")
      .eq("company_id", COMPANY_ID)
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (error) {
      logSupabaseError(
        "خطا در دریافت فهرست شهرها:",
        error
      );
      throw error;
    }

    return (data ?? []).map((item) => ({
      id: String(item.id),
      company_id:
        item.company_id !== undefined
          ? item.company_id
          : null,
      name: String(item.name ?? ""),
      code:
        item.code !== undefined
          ? item.code
          : null,
    }));
  },

  async getCityById(
    cityId: string
  ): Promise<CustomerCity | null> {
    const supabase = createSupabaseClient();

    if (!cityId || !cityId.trim()) {
      return null;
    }

    const normalizedCityId = cityId.trim();

    const { data, error } = await supabase
      .from("cities")
      .select("id, company_id, name, code")
      .eq("id", normalizedCityId)
      .eq("company_id", COMPANY_ID)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      logSupabaseError(
        "خطا در دریافت شهر مشتری:",
        error
      );
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      id: String(data.id),
      company_id:
        data.company_id !== undefined
          ? data.company_id
          : null,
      name: String(data.name ?? ""),
      code:
        data.code !== undefined
          ? data.code
          : null,
    };
  },

  async update(
    id: string,
    values: Partial<
      Pick<
        Customer,
        | "name"
        | "phone"
        | "whatsapp_number"
        | "customer_type"
        | "is_vip"
        | "is_active"
        | "city_id"
        | "metadata"
      >
    >
  ): Promise<Customer> {
    const supabase = createSupabaseClient();

    if (!id || !id.trim()) {
      throw new Error(
        "شناسه مشتری مشخص نیست."
      );
    }

    const customerId = id.trim();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (values.name !== undefined) {
      updateData.name = values.name.trim();
    }

    if (values.phone !== undefined) {
      updateData.phone = values.phone;
    }

    if (values.whatsapp_number !== undefined) {
      updateData.whatsapp_number =
        values.whatsapp_number;
    }

    if (values.customer_type !== undefined) {
      updateData.customer_type =
        values.customer_type;
    }

    if (values.is_vip !== undefined) {
      updateData.is_vip = values.is_vip;
    }

    if (values.is_active !== undefined) {
      updateData.is_active = values.is_active;
    }

    if (values.city_id !== undefined) {
      updateData.city_id = values.city_id;
    }

    if (values.metadata !== undefined) {
      updateData.metadata = values.metadata;
    }

    const { data, error } = await supabase
      .from("customers")
      .update(updateData)
      .eq("id", customerId)
      .eq("company_id", COMPANY_ID)
      .is("deleted_at", null)
      .select("*")
      .maybeSingle();

    if (error) {
      logSupabaseError(
        "خطا در بروزرسانی مشتری:",
        error
      );
      throw error;
    }

    if (!data) {
      throw new Error(
        `مشتری با شناسه ${customerId} بروزرسانی نشد.`
      );
    }

    return data as Customer;
  },

  async create(
    values: Partial<
      Pick<
        Customer,
        | "name"
        | "phone"
        | "whatsapp_number"
        | "customer_type"
        | "city_id"
        | "is_vip"
        | "is_active"
        | "metadata"
      >
    >
  ): Promise<Customer> {
    const supabase = createSupabaseClient();

    if (!values.name?.trim()) {
      throw new Error(
        "نام مشتری الزامی است."
      );
    }

    if (!values.city_id?.trim()) {
      throw new Error(
        "انتخاب شهر مشتری الزامی است."
      );
    }

    if (!values.customer_type) {
      throw new Error(
        "نوع مشتری الزامی است."
      );
    }

    const insertData: Record<string, unknown> = {
      company_id: COMPANY_ID,
      city_id: values.city_id.trim(),
      name: values.name.trim(),
      customer_type: values.customer_type,
      is_vip: values.is_vip ?? false,
      is_active: values.is_active ?? true,
    };

    if (values.phone !== undefined) {
      insertData.phone = values.phone;
    }

    if (values.whatsapp_number !== undefined) {
      insertData.whatsapp_number =
        values.whatsapp_number;
    }

    if (values.metadata !== undefined) {
      insertData.metadata = values.metadata;
    }

    const { data, error } = await supabase
      .from("customers")
      .insert(insertData)
      .select("*")
      .single();

    if (error) {
      logSupabaseError(
        "خطا در ایجاد مشتری:",
        error
      );
      throw error;
    }

    if (!data) {
      throw new Error(
        "مشتری ایجاد نشد."
      );
    }

    return data as Customer;
  },

  async delete(id: string): Promise<void> {
    const supabase = createSupabaseClient();

    if (!id || !id.trim()) {
      throw new Error(
        "شناسه مشتری مشخص نیست."
      );
    }

    const customerId = id.trim();

    const { error } = await supabase
      .from("customers")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId)
      .eq("company_id", COMPANY_ID)
      .is("deleted_at", null);

    if (error) {
      logSupabaseError(
        "خطا در حذف مشتری:",
        error
      );
      throw error;
    }
  },
};
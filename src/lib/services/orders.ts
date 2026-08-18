import { createSupabaseClient } from "@/src/lib/supabase";
import type { Order } from "@/src/lib/types/order";

export const ordersService = {
  async getAll(): Promise<Order[]> {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .is("deleted_at", null)
      .order("order_date", { ascending: false });

    if (error) {
      console.error("خطا در دریافت سفارش‌ها:", error);
      throw error;
    }

    return (data ?? []) as Order[];
  },

  async getById(id: string): Promise<Order> {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      console.error("خطا در دریافت سفارش:", error);
      throw error;
    }

    return data as Order;
  },

  async getByCustomerId(customerId: string): Promise<Order[]> {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .order("order_date", { ascending: false });

    if (error) {
      console.error("خطا در دریافت سفارش‌های مشتری:", error);
      throw error;
    }

    return (data ?? []) as Order[];
  },

  async getByDateRange(
    startDate: string,
    endDate: string
  ): Promise<Order[]> {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .gte("order_date", startDate)
      .lte("order_date", endDate)
      .is("deleted_at", null)
      .order("order_date", { ascending: false });

    if (error) {
      console.error("خطا در دریافت سفارش‌های بازه زمانی:", error);
      throw error;
    }

    return (data ?? []) as Order[];
  },
};
import { createSupabaseClient } from "@/src/lib/supabase";
import type { Customer } from "@/src/lib/types/customer";
import type { Order } from "@/src/lib/types/order";
import type {
  Call,
  FollowUp,
  CustomerActivity,
} from "@/src/lib/types/activity";

export interface DashboardStats {
  customersCount: number;
  ordersCount: number;
  totalTonnage: number;
  todayCallsCount: number;
  todayFollowUpsCount: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentActivities: CustomerActivity[];
  recommendedCustomers: Customer[];
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const supabase = createSupabaseClient();

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const startOfDayIso = startOfDay.toISOString();
    const endOfDayIso = endOfDay.toISOString();

    const [
      customersResult,
      ordersResult,
      callsResult,
      followUpsResult,
    ] = await Promise.all([
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null),

      supabase
        .from("orders")
        .select("total_tonnage")
        .is("deleted_at", null),

      supabase
        .from("calls")
        .select("id", { count: "exact", head: true })
        .gte("call_date", startOfDayIso)
        .lte("call_date", endOfDayIso)
        .is("deleted_at", null),

      supabase
        .from("follow_ups")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_at", startOfDayIso)
        .lte("scheduled_at", endOfDayIso)
        .is("deleted_at", null),
    ]);

    if (customersResult.error) {
      throw customersResult.error;
    }

    if (ordersResult.error) {
      throw ordersResult.error;
    }

    if (callsResult.error) {
      throw callsResult.error;
    }

    if (followUpsResult.error) {
      throw followUpsResult.error;
    }

    const orders = (ordersResult.data ?? []) as Pick<
      Order,
      "total_tonnage"
    >[];

    const totalTonnage = orders.reduce(
      (sum, order) =>
        sum + Number(order.total_tonnage || 0),
      0
    );

    return {
      customersCount: customersResult.count ?? 0,
      ordersCount: orders.length,
      totalTonnage,
      todayCallsCount: callsResult.count ?? 0,
      todayFollowUpsCount:
        followUpsResult.count ?? 0,
    };
  },

  async getRecentActivities(
    limit = 10
  ): Promise<CustomerActivity[]> {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("v_customer_activity")
      .select("*")
      .order("last_activity_at", {
        ascending: false,
      })
      .limit(limit);

    if (error) {
      console.error(
        "خطا در دریافت فعالیت‌های مشتریان:",
        error
      );

      throw error;
    }

    return (data ?? []) as CustomerActivity[];
  },

  async getRecommendedCustomers(
    limit = 5
  ): Promise<Customer[]> {
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
      .eq("is_active", true)
      .order("inactivity_days", {
        ascending: false,
      })
      .order("is_vip", {
        ascending: false,
      })
      .order("lifetime_tonnage", {
        ascending: false,
      })
      .limit(limit);

    if (error) {
      console.error(
        "خطا در دریافت مشتریان پیشنهادی:",
        error
      );

      throw error;
    }

    return (data ?? []) as Customer[];
  },

  async getDashboardData(): Promise<DashboardData> {
    const [
      stats,
      recentActivities,
      recommendedCustomers,
    ] = await Promise.all([
      this.getStats(),
      this.getRecentActivities(),
      this.getRecommendedCustomers(),
    ]);

    return {
      stats,
      recentActivities,
      recommendedCustomers,
    };
  },
};
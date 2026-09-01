import { createSupabaseClient } from "@/src/lib/supabase";

const COMPANY_ID =
  "11111111-1111-1111-1111-111111111111";

export interface DashboardStats {
  customersCount: number;
  ordersCount: number;
  totalTonnage: number;
  todayCallsCount: number;
  todayFollowUpsCount: number;

  waybillsCount: number;
  issuedWaybillsCount: number;
  loadingConfirmedWaybillsCount: number;
  cancelledWaybillsCount: number;
  loadingConfirmedTonnage: number;
}

export interface RecentActivity {
  customer_id: string;
  customer_name: string;
  last_activity_at: string | null;
  order_count: number;
  call_count: number;
  follow_up_count: number;
}

export interface RecommendedCustomer {
  id: string;
  name: string;
  phone: string | null;
  customer_type: string;
  is_vip: boolean;
  city: {
    id: string;
    name: string;
  } | null;
  inactivity_days: number;
  lifetime_tonnage: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentActivities: RecentActivity[];
  recommendedCustomers: RecommendedCustomer[];
}

interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  customer_type: string;
  is_vip: boolean;
  city_id: string | null;
  created_at: string;
  updated_at: string;
  city:
    | {
        id: string;
        name: string;
      }
    | null;
}

interface OrderRow {
  id: string;
  customer_id: string;
  order_date: string;
  total_tonnage: number | string | null;
}

interface CallRow {
  id: string;
  customer_id: string;
  call_date: string;
}

interface FollowUpRow {
  id: string;
  customer_id: string;
  scheduled_at: string;
  status: string;
}

interface WaybillRow {
  id: string;
  status: string;
  deleted_at: string | null;
}

interface WaybillItemRow {
  id: string;
  waybill_id: string;
  quantity: number | string | null;
  weight_kg_snapshot: number | string | null;
  tonnage: number | string | null;
  deleted_at: string | null;
}

function getTodayStart(): string {
  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  return start.toISOString();
}

function getTomorrowStart(): string {
  const now = new Date();

  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );

  return tomorrow.toISOString();
}

function calculateInactivityDays(
  lastActivity: string | null
): number {
  if (!lastActivity) {
    return 9999;
  }

  const activityDate = new Date(
    lastActivity
  );

  if (
    Number.isNaN(
      activityDate.getTime()
    )
  ) {
    return 9999;
  }

  const now = new Date();

  const difference =
    now.getTime() -
    activityDate.getTime();

  return Math.max(
    0,
    Math.floor(
      difference /
        (1000 * 60 * 60 * 24)
    )
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    const message = (
      error as {
        message?: unknown;
      }
    ).message;

    if (
      typeof message === "string"
    ) {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function logSupabaseError(
  operation: string,
  error: unknown
): void {
  console.error(
    `========== DASHBOARD ${operation} ERROR ==========`
  );

  console.error(
    getErrorMessage(
      error,
      "Unknown Supabase error"
    )
  );

  console.error(
    "=================================================="
  );
}

function getWaybillItemTonnage(
  item: WaybillItemRow
): number {
  const directTonnage =
    Number(item.tonnage ?? 0);

  if (
    Number.isFinite(
      directTonnage
    ) &&
    directTonnage > 0
  ) {
    return directTonnage;
  }

  const quantity =
    Number(item.quantity ?? 0);

  const weightKg =
    Number(
      item.weight_kg_snapshot ?? 0
    );

  if (
    !Number.isFinite(quantity) ||
    !Number.isFinite(weightKg)
  ) {
    return 0;
  }

  return (
    (quantity * weightKg) /
    1000
  );
}

export const dashboardService = {
  async getDashboardData(): Promise<DashboardData> {
    const supabase =
      createSupabaseClient();

    const todayStart =
      getTodayStart();

    const tomorrowStart =
      getTomorrowStart();

    const todayStartDate =
      new Date(todayStart);

    const tomorrowStartDate =
      new Date(tomorrowStart);

    const {
      data: customers,
      error: customersError,
    } = await supabase
      .from("customers")
      .select(`
        id,
        name,
        phone,
        customer_type,
        is_vip,
        city_id,
        created_at,
        updated_at,
        city:cities (
          id,
          name
        )
      `)
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      )
      .eq(
        "is_active",
        true
      );

    if (customersError) {
      logSupabaseError(
        "CUSTOMERS",
        customersError
      );

      throw customersError;
    }

    const customerRows =
      (customers ?? []) as unknown as CustomerRow[];

    const {
      data: orders,
      error: ordersError,
    } = await supabase
      .from("orders")
      .select(`
        id,
        customer_id,
        order_date,
        total_tonnage
      `)
      .eq(
        "company_id",
        COMPANY_ID
      )
      .eq(
        "status",
        "confirmed"
      )
      .is(
        "deleted_at",
        null
      )
      .order(
        "order_date",
        {
          ascending: false,
        }
      );

    if (ordersError) {
      logSupabaseError(
        "ORDERS",
        ordersError
      );

      throw ordersError;
    }

    const orderRows =
      (orders ?? []) as OrderRow[];

    const {
      data: calls,
      error: callsError,
    } = await supabase
      .from("calls")
      .select(`
        id,
        customer_id,
        call_date
      `)
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      )
      .order(
        "call_date",
        {
          ascending: false,
        }
      );

    if (callsError) {
      logSupabaseError(
        "CALLS",
        callsError
      );

      throw callsError;
    }

    const callRows =
      (calls ?? []) as CallRow[];

    const {
      data: followUps,
      error: followUpsError,
    } = await supabase
      .from("follow_ups")
      .select(`
        id,
        customer_id,
        scheduled_at,
        status
      `)
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      )
      .order(
        "scheduled_at",
        {
          ascending: false,
        }
      );

    if (followUpsError) {
      logSupabaseError(
        "FOLLOW UPS",
        followUpsError
      );

      throw followUpsError;
    }

    const followUpRows =
      (followUps ?? []) as FollowUpRow[];

    // ==============================
    // WAYBILLS
    // ==============================

    const {
      data: waybills,
      error: waybillsError,
    } = await supabase
      .from("waybills")
      .select(`
        id,
        status,
        deleted_at
      `)
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      );

    if (waybillsError) {
      logSupabaseError(
        "WAYBILLS",
        waybillsError
      );

      throw waybillsError;
    }

    const waybillRows =
      (waybills ?? []) as WaybillRow[];

    // ==============================
    // WAYBILL ITEMS
    // مستقل از relation
    // ==============================

    let waybillItemRows:
      WaybillItemRow[] = [];

    if (
      waybillRows.length > 0
    ) {
      const waybillIds =
        waybillRows.map(
          (waybill) =>
            waybill.id
        );

      const {
        data: waybillItems,
        error:
          waybillItemsError,
      } = await supabase
        .from("waybill_items")
        .select(`
          id,
          waybill_id,
          quantity,
          weight_kg_snapshot,
          tonnage,
          deleted_at
        `)
        .eq(
          "company_id",
          COMPANY_ID
        )
        .in(
          "waybill_id",
          waybillIds
        )
        .is(
          "deleted_at",
          null
        );

      if (waybillItemsError) {
        logSupabaseError(
          "WAYBILL ITEMS",
          waybillItemsError
        );

        throw waybillItemsError;
      }

      waybillItemRows =
        (waybillItems ??
          []) as WaybillItemRow[];
    }

    // ==============================
    // WAYBILL KPI
    // ==============================

    const waybillsCount =
      waybillRows.length;

    const issuedWaybillsCount =
      waybillRows.filter(
        (waybill) =>
          waybill.status ===
          "issued"
      ).length;

    const loadingConfirmedWaybillsCount =
      waybillRows.filter(
        (waybill) =>
          waybill.status ===
          "loading_confirmed"
      ).length;

    const cancelledWaybillsCount =
      waybillRows.filter(
        (waybill) =>
          waybill.status ===
          "cancelled"
      ).length;

    const waybillTonnageByWaybill =
      new Map<string, number>();

    for (
      const item of waybillItemRows
    ) {
      const current =
        waybillTonnageByWaybill.get(
          item.waybill_id
        ) ?? 0;

      waybillTonnageByWaybill.set(
        item.waybill_id,
        current +
          getWaybillItemTonnage(
            item
          )
      );
    }

    const loadingConfirmedTonnage =
      waybillRows
        .filter(
          (waybill) =>
            waybill.status ===
            "loading_confirmed"
        )
        .reduce(
          (
            total,
            waybill
          ) =>
            total +
            (waybillTonnageByWaybill.get(
              waybill.id
            ) ?? 0),
          0
        );

    // ==============================
    // SALES STATISTICS
    // ==============================

    const totalTonnage =
      orderRows.reduce(
        (
          total,
          order
        ) =>
          total +
          Number(
            order.total_tonnage ??
              0
          ),
        0
      );

    const ordersCount =
      orderRows.length;

    const customersCount =
      customerRows.length;

    const todayCallsCount =
      callRows.filter(
        (call) => {
          const callDate =
            new Date(
              call.call_date
            );

          return (
            !Number.isNaN(
              callDate.getTime()
            ) &&
            callDate >=
              todayStartDate &&
            callDate <
              tomorrowStartDate
          );
        }
      ).length;

    const todayFollowUpsCount =
      followUpRows.filter(
        (followUp) => {
          if (
            followUp.status !==
            "pending"
          ) {
            return false;
          }

          const scheduledDate =
            new Date(
              followUp.scheduled_at
            );

          return (
            !Number.isNaN(
              scheduledDate.getTime()
            ) &&
            scheduledDate >=
              todayStartDate &&
            scheduledDate <
              tomorrowStartDate
          );
        }
      ).length;

    // ==============================
    // CUSTOMER ACTIVITY
    // ==============================

    const customerActivity =
      new Map<
        string,
        {
          last_activity_at:
            string | null;
          order_count: number;
          call_count: number;
          follow_up_count: number;
        }
      >();

    for (
      const customer of customerRows
    ) {
      customerActivity.set(
        customer.id,
        {
          last_activity_at:
            null,
          order_count: 0,
          call_count: 0,
          follow_up_count: 0,
        }
      );
    }

    for (
      const order of orderRows
    ) {
      const current =
        customerActivity.get(
          order.customer_id
        );

      if (!current) {
        continue;
      }

      current.order_count += 1;

      if (
        !current.last_activity_at ||
        order.order_date >
          current.last_activity_at
      ) {
        current.last_activity_at =
          order.order_date;
      }
    }

    for (
      const call of callRows
    ) {
      const current =
        customerActivity.get(
          call.customer_id
        );

      if (!current) {
        continue;
      }

      current.call_count += 1;

      if (
        !current.last_activity_at ||
        call.call_date >
          current.last_activity_at
      ) {
        current.last_activity_at =
          call.call_date;
      }
    }

    for (
      const followUp of followUpRows
    ) {
      const current =
        customerActivity.get(
          followUp.customer_id
        );

      if (!current) {
        continue;
      }

      current.follow_up_count += 1;

      const scheduledDate =
        new Date(
          followUp.scheduled_at
        );

      if (
        Number.isNaN(
          scheduledDate.getTime()
        )
      ) {
        continue;
      }

      const now =
        new Date();

      if (
        scheduledDate > now
      ) {
        continue;
      }

      if (
        !current.last_activity_at ||
        followUp.scheduled_at >
          current.last_activity_at
      ) {
        current.last_activity_at =
          followUp.scheduled_at;
      }
    }

    // ==============================
    // RECENT ACTIVITIES
    // ==============================

    const recentActivities =
      customerRows
        .map(
          (customer) => {
            const activity =
              customerActivity.get(
                customer.id
              );

            return {
              customer_id:
                customer.id,
              customer_name:
                customer.name,
              last_activity_at:
                activity?.last_activity_at ??
                null,
              order_count:
                activity?.order_count ??
                0,
              call_count:
                activity?.call_count ??
                0,
              follow_up_count:
                activity?.follow_up_count ??
                0,
            };
          }
        )
        .filter(
          (item) =>
            item.last_activity_at !==
            null
        )
        .sort(
          (a, b) => {
            const dateA =
              new Date(
                a.last_activity_at!
              ).getTime();

            const dateB =
              new Date(
                b.last_activity_at!
              ).getTime();

            return (
              dateB - dateA
            );
          }
        )
        .slice(0, 10);

    // ==============================
    // LIFETIME TONNAGE
    // ==============================

    const tonnageByCustomer =
      new Map<
        string,
        number
      >();

    for (
      const order of orderRows
    ) {
      const current =
        tonnageByCustomer.get(
          order.customer_id
        ) ?? 0;

      tonnageByCustomer.set(
        order.customer_id,
        current +
          Number(
            order.total_tonnage ??
              0
          )
      );
    }

    // ==============================
    // CALLED TODAY
    // ==============================

    const calledTodayCustomerIds =
      new Set<string>();

    for (
      const call of callRows
    ) {
      const callDate =
        new Date(
          call.call_date
        );

      if (
        !Number.isNaN(
          callDate.getTime()
        ) &&
        callDate >=
          todayStartDate &&
        callDate <
          tomorrowStartDate
      ) {
        calledTodayCustomerIds.add(
          call.customer_id
        );
      }
    }

    // ==============================
    // RECOMMENDED CUSTOMERS
    // ==============================

    const recommendedCustomers =
      customerRows
        .filter(
          (customer) =>
            !calledTodayCustomerIds.has(
              customer.id
            )
        )
        .map(
          (customer) => {
            const activity =
              customerActivity.get(
                customer.id
              );

            const lastActivity =
              activity?.last_activity_at ??
              null;

            const inactivityDays =
              calculateInactivityDays(
                lastActivity
              );

            const lifetimeTonnage =
              tonnageByCustomer.get(
                customer.id
              ) ?? 0;

            return {
              id: customer.id,
              name: customer.name,
              phone: customer.phone,
              customer_type:
                customer.customer_type,
              is_vip:
                customer.is_vip ??
                false,
              city:
                customer.city,
              inactivity_days:
                inactivityDays,
              lifetime_tonnage:
                lifetimeTonnage,
            };
          }
        )
        .sort(
          (a, b) => {
            if (
              a.is_vip !==
              b.is_vip
            ) {
              return a.is_vip
                ? -1
                : 1;
            }

            if (
              a.inactivity_days !==
              b.inactivity_days
            ) {
              return (
                b.inactivity_days -
                a.inactivity_days
              );
            }

            return (
              b.lifetime_tonnage -
              a.lifetime_tonnage
            );
          }
        )
        .slice(0, 5);

    return {
      stats: {
        customersCount,
        ordersCount,
        totalTonnage,
        todayCallsCount,
        todayFollowUpsCount,
        waybillsCount,
        issuedWaybillsCount,
        loadingConfirmedWaybillsCount,
        cancelledWaybillsCount,
        loadingConfirmedTonnage,
      },

      recentActivities,
      recommendedCustomers,
    };
  },
};
import { createSupabaseClient } from "@/src/lib/supabase";

const COMPANY_ID =
  "11111111-1111-1111-1111-111111111111";

export interface ReportDateRange {
  from?: string;
  to?: string;
}

export interface SalesReport {
  ordersCount: number;
  totalTonnage: number;
}

export interface WaybillReport {
  totalCount: number;
  draftCount: number;
  issuedCount: number;
  loadingConfirmedCount: number;
  cancelledCount: number;
  loadingTonnage: number;
}

export interface ActivityReport {
  callsCount: number;
  followUpsCount: number;
  completedFollowUpsCount: number;
  pendingFollowUpsCount: number;
  cancelledFollowUpsCount: number;
}

export interface CustomerReport {
  activeCustomersCount: number;
}

export interface CityReport {
  cityId: string | null;
  cityName: string;
  customersCount: number;
  ordersCount: number;
  salesTonnage: number;
  callsCount: number;
  followUpsCount: number;
  completedFollowUpsCount: number;
  pendingFollowUpsCount: number;
  waybillsCount: number;
  loadingConfirmedCount: number;
  loadingTonnage: number;
}

export interface ReportsData {
  sales: SalesReport;
  waybills: WaybillReport;
  activities: ActivityReport;
  customers: CustomerReport;
  cityReports: CityReport[];
}

interface CustomerRow {
  id: string;
  name: string;
  city_id: string | null;
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
  status: string;
}

interface WaybillRow {
  id: string;
  customer_id: string | null;
  status: string;
  waybill_date: string;
  deleted_at: string | null;
}

interface WaybillItemRow {
  id: string;
  waybill_id: string;
  quantity: number | string | null;
  weight_kg_snapshot:
    | number
    | string
    | null;
  tonnage: number | string | null;
  deleted_at: string | null;
}

interface CallRow {
  id: string;
  customer_id: string;
  call_date: string;
  deleted_at: string | null;
}

interface FollowUpRow {
  id: string;
  customer_id: string;
  scheduled_at: string;
  status: string;
  deleted_at: string | null;
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

    if (typeof message === "string") {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function logReportError(
  operation: string,
  error: unknown
): void {
  console.error(
    `========== REPORT ${operation} ERROR ==========`
  );

  console.error(
    getErrorMessage(
      error,
      "خطای نامشخص در گزارش‌ها"
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

  const weight =
    Number(
      item.weight_kg_snapshot ?? 0
    );

  if (
    !Number.isFinite(quantity) ||
    !Number.isFinite(weight)
  ) {
    return 0;
  }

  return (
    (quantity * weight) /
    1000
  );
}

function normalizeCityName(
  name?: string | null
): string {
  if (!name?.trim()) {
    return "بدون شهر";
  }

  const value = name.trim();

  const normalized: Record<
    string,
    string
  > = {
    Garmsar: "گرمسار",
    garmsar: "گرمسار",
    Semnan: "سمنان",
    semnan: "سمنان",
    Varamin: "ورامین",
    varamin: "ورامین",
    Chalous: "چالوس",
    Chalus: "چالوس",
    chalous: "چالوس",
    Kelardasht: "کلاردشت",
    kelardasht: "کلاردشت",
    Ramsar: "رامسر",
    ramsar: "رامسر",
    Tonekabon: "تنکابن",
    tonekabon: "تنکابن",
  };

  return normalized[value] ?? value;
}

function getCitySortIndex(
  cityName: string
): number {
  const order = [
    "سمنان",
    "گرمسار",
    "ورامین",
    "چالوس",
    "کلاردشت",
    "رامسر",
    "تنکابن",
  ];

  const index =
    order.indexOf(cityName);

  if (index === -1) {
    return 999;
  }

  return index;
}

export const reportsService = {
  async getReports(
    range: ReportDateRange = {}
  ): Promise<ReportsData> {
    const supabase =
      createSupabaseClient();

    // ========================================================
    // CUSTOMERS
    // ========================================================

    const {
      data: customers,
      error: customersError,
    } = await supabase
      .from("customers")
      .select(`
        id,
        name,
        city_id,
        city:cities (
          id,
          name
        )
      `)
      .eq(
        "company_id",
        COMPANY_ID
      )
      .eq(
        "is_active",
        true
      )
      .is(
        "deleted_at",
        null
      );

    if (customersError) {
      logReportError(
        "CUSTOMERS",
        customersError
      );

      throw customersError;
    }

    const customerRows =
      (customers ??
        []) as unknown as CustomerRow[];

    const customersById =
      new Map<
        string,
        CustomerRow
      >();

    for (
      const customer of customerRows
    ) {
      customersById.set(
        customer.id,
        customer
      );
    }

    // ========================================================
    // ORDERS
    // ========================================================

    let ordersQuery = supabase
      .from("orders")
      .select(`
        id,
        customer_id,
        order_date,
        total_tonnage,
        status
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
      );

    if (range.from) {
      ordersQuery =
        ordersQuery.gte(
          "order_date",
          range.from
        );
    }

    if (range.to) {
      ordersQuery =
        ordersQuery.lte(
          "order_date",
          range.to
        );
    }

    const {
      data: orders,
      error: ordersError,
    } = await ordersQuery;

    if (ordersError) {
      logReportError(
        "ORDERS",
        ordersError
      );

      throw ordersError;
    }

    const orderRows =
      (orders ?? []) as OrderRow[];

    // ========================================================
    // WAYBILLS
    // ========================================================

    let waybillsQuery = supabase
      .from("waybills")
      .select(`
        id,
        customer_id,
        status,
        waybill_date,
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

    if (range.from) {
      waybillsQuery =
        waybillsQuery.gte(
          "waybill_date",
          range.from
        );
    }

    if (range.to) {
      waybillsQuery =
        waybillsQuery.lte(
          "waybill_date",
          range.to
        );
    }

    const {
      data: waybills,
      error: waybillsError,
    } = await waybillsQuery;

    if (waybillsError) {
      logReportError(
        "WAYBILLS",
        waybillsError
      );

      throw waybillsError;
    }

    const waybillRows =
      (waybills ??
        []) as WaybillRow[];

    // ========================================================
    // WAYBILL ITEMS
    // ========================================================

    let waybillItemRows: WaybillItemRow[] =
      [];

    if (waybillRows.length > 0) {
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
        logReportError(
          "WAYBILL ITEMS",
          waybillItemsError
        );

        throw waybillItemsError;
      }

      waybillItemRows =
        (waybillItems ??
          []) as WaybillItemRow[];
    }

    // ========================================================
    // CALLS
    // ========================================================

    let callsQuery = supabase
      .from("calls")
      .select(`
        id,
        customer_id,
        call_date,
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

    if (range.from) {
      callsQuery =
        callsQuery.gte(
          "call_date",
          range.from
        );
    }

    if (range.to) {
      callsQuery =
        callsQuery.lte(
          "call_date",
          range.to
        );
    }

    const {
      data: calls,
      error: callsError,
    } = await callsQuery;

    if (callsError) {
      logReportError(
        "CALLS",
        callsError
      );

      throw callsError;
    }

    const callRows =
      (calls ?? []) as CallRow[];

    // ========================================================
    // FOLLOW UPS
    // ========================================================

    let followUpsQuery = supabase
      .from("follow_ups")
      .select(`
        id,
        customer_id,
        scheduled_at,
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

    if (range.from) {
      followUpsQuery =
        followUpsQuery.gte(
          "scheduled_at",
          range.from
        );
    }

    if (range.to) {
      followUpsQuery =
        followUpsQuery.lte(
          "scheduled_at",
          range.to
        );
    }

    const {
      data: followUps,
      error: followUpsError,
    } = await followUpsQuery;

    if (followUpsError) {
      logReportError(
        "FOLLOW UPS",
        followUpsError
      );

      throw followUpsError;
    }

    const followUpRows =
      (followUps ??
        []) as FollowUpRow[];

    // ========================================================
    // GENERAL CUSTOMER COUNT
    // ========================================================

    const {
      count: customersCount,
      error: customersCountError,
    } = await supabase
      .from("customers")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .eq(
        "is_active",
        true
      )
      .is(
        "deleted_at",
        null
      );

    if (customersCountError) {
      logReportError(
        "CUSTOMER COUNT",
        customersCountError
      );

      throw customersCountError;
    }

    // ========================================================
    // SALES
    // ========================================================

    const ordersCount =
      orderRows.length;

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

    // ========================================================
    // WAYBILL TOTALS
    // ========================================================

    const draftCount =
      waybillRows.filter(
        (waybill) =>
          waybill.status ===
          "draft"
      ).length;

    const issuedCount =
      waybillRows.filter(
        (waybill) =>
          waybill.status ===
          "issued"
      ).length;

    const loadingConfirmedCount =
      waybillRows.filter(
        (waybill) =>
          waybill.status ===
          "loading_confirmed"
      ).length;

    const cancelledCount =
      waybillRows.filter(
        (waybill) =>
          waybill.status ===
          "cancelled"
      ).length;

    const tonnageByWaybill =
      new Map<
        string,
        number
      >();

    for (
      const item of waybillItemRows
    ) {
      const current =
        tonnageByWaybill.get(
          item.waybill_id
        ) ?? 0;

      tonnageByWaybill.set(
        item.waybill_id,
        current +
          getWaybillItemTonnage(
            item
          )
      );
    }

    const loadingTonnage =
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
            (
              tonnageByWaybill.get(
                waybill.id
              ) ?? 0
            ),
          0
        );

    // ========================================================
    // ACTIVITY TOTALS
    // ========================================================

    const callsCount =
      callRows.length;

    const followUpsCount =
      followUpRows.length;

    const completedFollowUpsCount =
      followUpRows.filter(
        (followUp) =>
          followUp.status ===
          "completed"
      ).length;

    const pendingFollowUpsCount =
      followUpRows.filter(
        (followUp) =>
          followUp.status ===
          "pending"
      ).length;

    const cancelledFollowUpsCount =
      followUpRows.filter(
        (followUp) =>
          followUp.status ===
          "cancelled"
      ).length;

    // ========================================================
    // CITY REPORT MAP
    // ========================================================

    const cityMap =
      new Map<
        string,
        CityReport
      >();

    function getCityKey(
      customerId: string | null | undefined
    ): string {
      if (!customerId) {
        return "no-city";
      }

      const customer =
        customersById.get(
          customerId
        );

      if (!customer) {
        return "no-city";
      }

      return (
        customer.city?.id ??
        customer.city_id ??
        "no-city"
      );
    }

    function getOrCreateCity(
      customerId:
        | string
        | null
        | undefined
    ): CityReport {
      const key =
        getCityKey(
          customerId
        );

      const existing =
        cityMap.get(key);

      if (existing) {
        return existing;
      }

      const customer =
        customerId
          ? customersById.get(
              customerId
            )
          : undefined;

      const cityName =
        normalizeCityName(
          customer?.city?.name
        );

      const created: CityReport = {
        cityId:
          customer?.city?.id ??
          customer?.city_id ??
          null,
        cityName,
        customersCount: 0,
        ordersCount: 0,
        salesTonnage: 0,
        callsCount: 0,
        followUpsCount: 0,
        completedFollowUpsCount: 0,
        pendingFollowUpsCount: 0,
        waybillsCount: 0,
        loadingConfirmedCount: 0,
        loadingTonnage: 0,
      };

      cityMap.set(
        key,
        created
      );

      return created;
    }

    // ========================================================
    // CITY CUSTOMER COUNTS
    // ========================================================

    for (
      const customer of customerRows
    ) {
      const city =
        customer.city;

      const key =
        city?.id ??
        customer.city_id ??
        "no-city";

      let report =
        cityMap.get(key);

      if (!report) {
        report = {
          cityId:
            city?.id ??
            customer.city_id ??
            null,
          cityName:
            normalizeCityName(
              city?.name
            ),
          customersCount: 0,
          ordersCount: 0,
          salesTonnage: 0,
          callsCount: 0,
          followUpsCount: 0,
          completedFollowUpsCount: 0,
          pendingFollowUpsCount: 0,
          waybillsCount: 0,
          loadingConfirmedCount: 0,
          loadingTonnage: 0,
        };

        cityMap.set(
          key,
          report
        );
      }

      report.customersCount +=
        1;
    }

    // ========================================================
    // CITY ORDERS
    // ========================================================

    for (
      const order of orderRows
    ) {
      const report =
        getOrCreateCity(
          order.customer_id
        );

      report.ordersCount += 1;

      report.salesTonnage +=
        Number(
          order.total_tonnage ??
            0
        );
    }

    // ========================================================
    // CITY CALLS
    // ========================================================

    for (
      const call of callRows
    ) {
      const report =
        getOrCreateCity(
          call.customer_id
        );

      report.callsCount += 1;
    }

    // ========================================================
    // CITY FOLLOW UPS
    // ========================================================

    for (
      const followUp of followUpRows
    ) {
      const report =
        getOrCreateCity(
          followUp.customer_id
        );

      report.followUpsCount +=
        1;

      if (
        followUp.status ===
        "completed"
      ) {
        report.completedFollowUpsCount +=
          1;
      }

      if (
        followUp.status ===
        "pending"
      ) {
        report.pendingFollowUpsCount +=
          1;
      }
    }

    // ========================================================
    // CITY WAYBILLS
    // ========================================================

    for (
      const waybill of waybillRows
    ) {
      const report =
        getOrCreateCity(
          waybill.customer_id
        );

      report.waybillsCount += 1;

      if (
        waybill.status ===
        "loading_confirmed"
      ) {
        report.loadingConfirmedCount +=
          1;

        report.loadingTonnage +=
          tonnageByWaybill.get(
            waybill.id
          ) ?? 0;
      }
    }

    // ========================================================
    // CITY REPORT RESULT
    // ========================================================

    const cityReports =
      Array.from(
        cityMap.values()
      )
        .sort(
          (a, b) => {
            const sortA =
              getCitySortIndex(
                a.cityName
              );

            const sortB =
              getCitySortIndex(
                b.cityName
              );

            if (
              sortA !== sortB
            ) {
              return (
                sortA - sortB
              );
            }

            return a.cityName.localeCompare(
              b.cityName,
              "fa"
            );
          }
        );

    // ========================================================
    // RETURN
    // ========================================================

    return {
      sales: {
        ordersCount,
        totalTonnage,
      },

      waybills: {
        totalCount:
          waybillRows.length,
        draftCount,
        issuedCount,
        loadingConfirmedCount,
        cancelledCount,
        loadingTonnage,
      },

      activities: {
        callsCount,
        followUpsCount,
        completedFollowUpsCount,
        pendingFollowUpsCount,
        cancelledFollowUpsCount,
      },

      customers: {
        activeCustomersCount:
          customersCount ?? 0,
      },

      cityReports,
    };
  },
};
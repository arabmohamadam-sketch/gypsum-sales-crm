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
  order_id: string;
  status: string;
  waybill_date: string;
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
      "خطای نامشخص در گزارش‌ها."
    )
  );

  if (
    typeof error === "object" &&
    error !== null
  ) {
    console.error("details:", error);
  }

  console.error(
    "=================================================="
  );
}


function getWaybillItemTonnage(
  item: WaybillItemRow
): number {
  const directTonnage = Number(
    item.tonnage ?? 0
  );

  if (
    Number.isFinite(directTonnage) &&
    directTonnage > 0
  ) {
    return directTonnage;
  }

  const quantity = Number(
    item.quantity ?? 0
  );

  const weight = Number(
    item.weight_kg_snapshot ?? 0
  );

  if (
    !Number.isFinite(quantity) ||
    !Number.isFinite(weight)
  ) {
    return 0;
  }

  return (
    (quantity * weight) / 1000
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
    گرمسار: "گرمسار",

    Semnan: "سمنان",
    semnan: "سمنان",
    سمنان: "سمنان",

    Varamin: "ورامین",
    varamin: "ورامین",
    ورامین: "ورامین",

    Chalous: "چالوس",
    Chalus: "چالوس",
    chalous: "چالوس",
    chalus: "چالوس",
    چالوس: "چالوس",

    Kelardasht: "کلاردشت",
    kelardasht: "کلاردشت",
    کلاردشت: "کلاردشت",

    Ramsar: "رامسر",
    ramsar: "رامسر",
    رامسر: "رامسر",

    Tonekabon: "تنکابن",
    tonekabon: "تنکابن",
    تنکابن: "تنکابن",
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

  return index === -1
    ? 999
    : index;
}

/**
 * تبدیل بازه گزارش به YYYY-MM-DD.
 *
 * صفحه گزارش از تاریخ جلالی استفاده می‌کند،
 * اما مقدار range از ISO ساخته شده است.
 *
 * این تابع برای این پروژه دو نکته را رعایت می‌کند:
 * 1. اگر ISO متعلق به شروع روز ایران باشد،
 *    تاریخ واقعی محلی را پیدا می‌کند.
 * 2. خروجی همیشه برای ستون DATE به فرم YYYY-MM-DD است.
 */
function getLocalDatabaseDate(
  value: string
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      "تاریخ گزارش معتبر نیست."
    );
  }

  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(date);

  const year = parts.find(
    (part) => part.type === "year"
  )?.value;

  const month = parts.find(
    (part) => part.type === "month"
  )?.value;

  const day = parts.find(
    (part) => part.type === "day"
  )?.value;

  if (!year || !month || !day) {
    throw new Error(
      "تبدیل تاریخ گزارش انجام نشد."
    );
  }

  return `${year}-${month}-${day}`;
}

export const reportsService = {
  async getReports(
    range: ReportDateRange = {}
  ): Promise<ReportsData> {
    const supabase =
      createSupabaseClient();

    console.log(
      "========== REPORT START =========="
    );

    console.log(
      "REPORT RANGE:",
      range
    );

    /*
     * تاریخ واقعی ایران برای Query ستون‌های DATE
     */
    let fromDate:
      | string
      | undefined;

    let toDate:
      | string
      | undefined;

    if (range.from) {
      fromDate =
        getLocalDatabaseDate(
          range.from
        );
    }

    if (range.to) {
      toDate =
        getLocalDatabaseDate(
          range.to
        );
    }

    console.log(
      "REPORT DATABASE RANGE:",
      {
        fromDate,
        toDate,
      }
    );

    if (
      fromDate &&
      toDate &&
      fromDate > toDate
    ) {
      throw new Error(
        "تاریخ شروع گزارش نمی‌تواند بعد از تاریخ پایان باشد."
      );
    }

    /*
     * ========================================================
     * CUSTOMERS
     * ========================================================
     */
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

      throw new Error(
        getErrorMessage(
          customersError,
          "خطا در دریافت مشتریان گزارش."
        )
      );
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

    /*
     * ========================================================
     * ORDERS
     * ========================================================
     */
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

    if (fromDate) {
      ordersQuery =
        ordersQuery.gte(
          "order_date",
          fromDate
        );
    }

    if (toDate) {
      ordersQuery =
        ordersQuery.lte(
          "order_date",
          toDate
        );
    }

    ordersQuery =
      ordersQuery
        .order(
          "order_date",
          {
            ascending: false,
          }
        );

    const {
      data: orders,
      error: ordersError,
    } = await ordersQuery;

    if (ordersError) {
      logReportError(
        "ORDERS",
        ordersError
      );

      throw new Error(
        getErrorMessage(
          ordersError,
          "خطا در دریافت سفارش‌های گزارش."
        )
      );
    }

    const orderRows =
      (orders ??
        []) as OrderRow[];

    const ordersById =
      new Map<
        string,
        OrderRow
      >();

    for (
      const order of orderRows
    ) {
      ordersById.set(
        order.id,
        order
      );
    }

    console.log(
      "REPORT CONFIRMED ORDERS:",
      orderRows.length
    );

    /*
     * ========================================================
     * WAYBILLS
     * ========================================================
     */
    let waybillsQuery = supabase
      .from("waybills")
      .select(`
        id,
        order_id,
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

    if (fromDate) {
      waybillsQuery =
        waybillsQuery.gte(
          "waybill_date",
          fromDate
        );
    }

    if (toDate) {
      waybillsQuery =
        waybillsQuery.lte(
          "waybill_date",
          toDate
        );
    }

    waybillsQuery =
      waybillsQuery
        .order(
          "waybill_date",
          {
            ascending: false,
          }
        );

    const {
      data: waybills,
      error: waybillsError,
    } = await waybillsQuery;

    if (waybillsError) {
      logReportError(
        "WAYBILLS",
        waybillsError
      );

      throw new Error(
        getErrorMessage(
          waybillsError,
          "خطا در دریافت حواله‌های گزارش."
        )
      );
    }

    const waybillRows =
      (waybills ??
        []) as WaybillRow[];

    console.log(
      "REPORT WAYBILLS:",
      waybillRows.length
    );

    /*
     * ========================================================
     * ORDERS RELATED TO WAYBILLS
     * ========================================================
     *
     * یک حواله باید بتواند شهر سفارش خودش را پیدا کند،
     * حتی اگر سفارش خارج از Query فروش بازه باشد.
     */
    const missingOrderIds =
      waybillRows
        .map(
          (waybill) =>
            waybill.order_id
        )
        .filter(
          (orderId) =>
            !ordersById.has(orderId)
        );

    if (
      missingOrderIds.length > 0
    ) {
      const uniqueMissingOrderIds =
        Array.from(
          new Set(
            missingOrderIds
          )
        );

      const {
        data:
          relatedOrders,
        error:
          relatedOrdersError,
      } = await supabase
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
        .is(
          "deleted_at",
          null
        )
        .in(
          "id",
          uniqueMissingOrderIds
        );

      if (relatedOrdersError) {
        logReportError(
          "RELATED ORDERS",
          relatedOrdersError
        );

        throw new Error(
          getErrorMessage(
            relatedOrdersError,
            "خطا در دریافت سفارش‌های مرتبط با حواله."
          )
        );
      }

      for (
        const order of (
          (relatedOrders ??
            []) as OrderRow[]
        )
      ) {
        ordersById.set(
          order.id,
          order
        );
      }
    }

    /*
     * ========================================================
     * WAYBILL ITEMS
     * ========================================================
     */
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
        logReportError(
          "WAYBILL ITEMS",
          waybillItemsError
        );

        throw new Error(
          getErrorMessage(
            waybillItemsError,
            "خطا در دریافت اقلام حواله."
          )
        );
      }

      waybillItemRows =
        (waybillItems ??
          []) as WaybillItemRow[];
    }

    /*
     * ========================================================
     * CALLS
     * ========================================================
     */
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

    /*
     * اگر call_date timestamp باشد،
     * همان ISO بازه مناسب است.
     */
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

      throw new Error(
        getErrorMessage(
          callsError,
          "خطا در دریافت تماس‌ها."
        )
      );
    }

    const callRows =
      (calls ??
        []) as CallRow[];

    /*
     * ========================================================
     * FOLLOW UPS
     * ========================================================
     */
    let followUpsQuery =
      supabase
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

      throw new Error(
        getErrorMessage(
          followUpsError,
          "خطا در دریافت پیگیری‌ها."
        )
      );
    }

    const followUpRows =
      (followUps ??
        []) as FollowUpRow[];

    /*
     * ========================================================
     * ACTIVE CUSTOMER COUNT
     * ========================================================
     */
    const {
      count: customersCount,
      error:
        customersCountError,
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

      throw new Error(
        getErrorMessage(
          customersCountError,
          "خطا در محاسبه تعداد مشتریان."
        )
      );
    }

    /*
     * ========================================================
     * SALES TOTALS
     * ========================================================
     */
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
            order.total_tonnage ?? 0
          ),
        0
      );

    /*
     * ========================================================
     * WAYBILL TOTALS
     * ========================================================
     */
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

    /*
     * ========================================================
     * ACTIVITY TOTALS
     * ========================================================
     */
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

    /*
     * ========================================================
     * CITY REPORT MAP
     * ========================================================
     */
    const cityMap =
      new Map<
        string,
        CityReport
      >();

    function getCityKey(
      customerId:
        | string
        | null
        | undefined
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

      const created:
        CityReport = {
        cityId:
          customer?.city?.id ??
          customer?.city_id ??
          null,

        cityName:
          normalizeCityName(
            customer?.city?.name
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
        created
      );

      return created;
    }

    /*
     * ========================================================
     * CITY CUSTOMER COUNTS
     * ========================================================
     */
    for (
      const customer of customerRows
    ) {
      const key =
        customer.city?.id ??
        customer.city_id ??
        "no-city";

      let report =
        cityMap.get(key);

      if (!report) {
        report = {
          cityId:
            customer.city?.id ??
            customer.city_id ??
            null,

          cityName:
            normalizeCityName(
              customer.city?.name
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

    /*
     * ========================================================
     * CITY ORDERS
     * ========================================================
     */
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

    /*
     * ========================================================
     * CITY CALLS
     * ========================================================
     */
    for (
      const call of callRows
    ) {
      const report =
        getOrCreateCity(
          call.customer_id
        );

      report.callsCount += 1;
    }

    /*
     * ========================================================
     * CITY FOLLOW UPS
     * ========================================================
     */
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

    /*
     * ========================================================
     * CITY WAYBILLS
     * ========================================================
     */
    for (
      const waybill of waybillRows
    ) {
      const order =
        ordersById.get(
          waybill.order_id
        );

      if (!order) {
        continue;
      }

      const report =
        getOrCreateCity(
          order.customer_id
        );

      report.waybillsCount +=
        1;

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

    /*
     * ========================================================
     * CITY REPORT RESULT
     * ========================================================
     */
    const cityReports =
      Array.from(
        cityMap.values()
      ).sort(
        (
          a,
          b
        ) => {
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

          if (
            b.salesTonnage !==
            a.salesTonnage
          ) {
            return (
              b.salesTonnage -
              a.salesTonnage
            );
          }

          if (
            b.loadingTonnage !==
            a.loadingTonnage
          ) {
            return (
              b.loadingTonnage -
              a.loadingTonnage
            );
          }

          return a.cityName.localeCompare(
            b.cityName,
            "fa"
          );
        }
      );

    console.log(
      "REPORT FINAL:",
      {
        ordersCount,
        totalTonnage,
        waybillsCount:
          waybillRows.length,
        loadingConfirmedCount,
        loadingTonnage,
        callsCount,
        followUpsCount,
        customersCount,
        cityReports:
          cityReports.length,
      }
    );

    console.log(
      "========== REPORT END =========="
    );

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
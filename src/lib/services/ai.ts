import {
  toGregorian,
  toJalaali,
} from "jalaali-js";

import { createSupabaseClient } from "@/src/lib/supabase";

const COMPANY_ID =
  "11111111-1111-1111-1111-111111111111";

export type AIRecommendationPriority =
  | "high"
  | "medium"
  | "low";

export type AIOpportunityType =
  | "reactivation"
  | "retention"
  | "acquisition";

export interface AIRecommendationReason {
  code: string;
  title: string;
  points: number;
}

export interface AIRecommendedCustomer {
  customerId: string;
  customerName: string;
  phone: string | null;

  customerType: string;
  isVip: boolean;

  city: {
    id: string;
    name: string;
    region_id?: string | null;
  } | null;

  score: number;
  priority: AIRecommendationPriority;

  opportunityType: AIOpportunityType;

  inactivityDays: number;
  lifetimeTonnage: number;

  orderCount: number;
  callCount: number;

  lastOrderDate: string | null;
  lastCallDate: string | null;

  daysSinceLastOrder: number;

  hasPendingFollowUp: boolean;
  calledToday: boolean;

  averageOrderTonnage: number;

  averageOrderIntervalDays: number;
  expectedNextOrderDate: string | null;
  daysUntilExpectedOrder: number | null;
  isOrderDue: boolean;

  suggestedOrderTonnage: number;
  suggestedAction: string;
  suggestedActionDescription: string;
  suggestedContactGoal: string;

  reasons: AIRecommendationReason[];
}

interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  customer_type: string;
  is_vip: boolean | null;
  city_id: string | null;
  created_at: string;

  city:
    | {
        id: string;
        name: string;
        region_id: string | null;
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

interface MonthlyRegionTargetRow {
  region_id: string | null;
  target_tonnage: number | string | null;
}

interface MonthlyRegionProgressRow {
  region_id: string | null;
  achieved_tonnage: number | string | null;
}

interface RegionPerformance {
  targetTonnage: number;
  achievedTonnage: number;
  achievementRate: number;
}

function formatTonnage(
  value: number,
): string {
  return `${new Intl.NumberFormat(
    "fa-IR",
    {
      maximumFractionDigits: 1,
    },
  ).format(value)} تن`;
}

function getCurrentGregorianPeriod(): {
  year: number;
  month: number;
} {
  const now = new Date();

  const jalali = toJalaali(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );

  const gregorian = toGregorian(
    jalali.jy,
    jalali.jm,
    1,
  );

  return {
    year: Number(gregorian.gy),
    month: Number(gregorian.gm),
  };
}

function getTodayStart(): Date {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
}

function getTomorrowStart(): Date {
  const tomorrow = getTodayStart();

  tomorrow.setDate(
    tomorrow.getDate() + 1,
  );

  return tomorrow;
}

function isToday(
  value: string,
): boolean {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return (
    date >= getTodayStart() &&
    date < getTomorrowStart()
  );
}

function calculateDaysSince(
  dateValue: string | null,
): number {
  if (!dateValue) {
    return 9999;
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return 9999;
  }

  const now = new Date();

  return Math.max(
    0,
    Math.floor(
      (now.getTime() -
        date.getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );
}

function calculateAverageOrderIntervalDays(
  orders: OrderRow[],
): number {
  if (orders.length < 2) {
    return 0;
  }

  const dates = orders
    .map(
      (order) =>
        new Date(order.order_date),
    )
    .filter(
      (date) =>
        !Number.isNaN(
          date.getTime(),
        ),
    )
    .sort(
      (a, b) =>
        a.getTime() -
        b.getTime(),
    );

  if (dates.length < 2) {
    return 0;
  }

  let totalGapDays = 0;

  for (
    let index = 1;
    index < dates.length;
    index += 1
  ) {
    const difference =
      dates[index].getTime() -
      dates[index - 1].getTime();

    totalGapDays +=
      difference /
      (1000 * 60 * 60 * 24);
  }

  return (
    totalGapDays /
    (dates.length - 1)
  );
}

function calculateExpectedNextOrderDate(
  lastOrderDate: string | null,
  averageIntervalDays: number,
): string | null {
  if (
    !lastOrderDate ||
    averageIntervalDays <= 0
  ) {
    return null;
  }

  const date = new Date(
    lastOrderDate,
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setDate(
    date.getDate() +
      Math.round(
        averageIntervalDays,
      ),
  );

  return date.toISOString();
}

function calculateDaysUntilExpectedOrder(
  expectedDate: string | null,
): number | null {
  if (!expectedDate) {
    return null;
  }

  const date = new Date(
    expectedDate,
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const now = new Date();

  return Math.ceil(
    (date.getTime() -
      now.getTime()) /
      (1000 * 60 * 60 * 24),
  );
}

function getOpportunityType(
  orderCount: number,
  daysSinceLastOrder: number,
  averageOrderIntervalDays: number,
): AIOpportunityType {
  if (orderCount === 0) {
    return "acquisition";
  }

  const dueThreshold =
    averageOrderIntervalDays > 0
      ? Math.max(
          14,
          Math.round(
            averageOrderIntervalDays *
              1.25,
          ),
        )
      : 14;

  if (
    daysSinceLastOrder >=
    dueThreshold
  ) {
    return "reactivation";
  }

  return "retention";
}

function getPriority(
  score: number,
): AIRecommendationPriority {
  if (score >= 70) {
    return "high";
  }

  if (score >= 45) {
    return "medium";
  }

  return "low";
}

function roundSuggestedTonnage(
  value: number,
): number {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return 0;
  }

  return (
    Math.round(value * 2) / 2
  );
}

function getSuggestedOrderTonnage(
  opportunityType: AIOpportunityType,
  averageOrderTonnage: number,
): number {
  if (
    opportunityType ===
    "acquisition"
  ) {
    return 0;
  }

  return roundSuggestedTonnage(
    averageOrderTonnage,
  );
}

function getSuggestedAction(
  opportunityType: AIOpportunityType,
  isOrderDue: boolean,
  suggestedOrderTonnage: number,
): {
  action: string;
  description: string;
} {
  const tonnage =
    suggestedOrderTonnage > 0
      ? formatTonnage(
          suggestedOrderTonnage,
        )
      : "";

  if (
    opportunityType ===
    "reactivation"
  ) {
    return {
      action:
        "احیای مشتری و سفارش مجدد",

      description: tonnage
        ? `مشتری از چرخه خرید فاصله گرفته است؛ برای فعال‌سازی مجدد و سفارش حدود ${tonnage} اقدام کن.`
        : "مشتری از چرخه خرید فاصله گرفته است؛ علت توقف خرید را بررسی و برای سفارش مجدد اقدام کن.",
    };
  }

  if (
    opportunityType ===
    "retention"
  ) {
    if (isOrderDue) {
      return {
        action:
          "گرفتن سفارش مجدد",

        description: tonnage
          ? `زمان مناسبی برای تماس است؛ سفارش بعدی مشتری می‌تواند حدود ${tonnage} باشد.`
          : "زمان مناسبی برای تماس و بررسی سفارش مجدد مشتری است.",
      };
    }

    return {
      action:
        "حفظ ارتباط با مشتری",

      description: tonnage
        ? `رابطه فروش را حفظ کن و نیاز مشتری برای سفارش حدود ${tonnage} را بررسی کن.`
        : "رابطه فروش را حفظ کن و نیاز جدید مشتری را بررسی کن.",
    };
  }

  return {
    action:
      "جذب مشتری جدید",

    description:
      "تماس اولیه را برای معرفی محصول، شناخت نیاز مشتری و ایجاد اولین سفارش انجام بده.",
  };
}

function getSuggestedContactGoal(
  opportunityType: AIOpportunityType,
  suggestedOrderTonnage: number,
  averageOrderTonnage: number,
  isOrderDue: boolean,
  hasPendingFollowUp: boolean,
): string {
  const tonnage =
    suggestedOrderTonnage > 0
      ? formatTonnage(
          suggestedOrderTonnage,
        )
      : "";

  if (
    opportunityType ===
    "reactivation"
  ) {
    if (tonnage) {
      return `بررسی علت فاصله از خرید و تلاش برای ثبت سفارش مجدد حدود ${tonnage}`;
    }

    return "بررسی علت توقف خرید و تلاش برای بازگرداندن مشتری به چرخه سفارش";
  }

  if (
    opportunityType ===
    "retention"
  ) {
    if (
      isOrderDue &&
      tonnage
    ) {
      return `بررسی نیاز فعلی مشتری و تلاش برای ثبت سفارش بعدی حدود ${tonnage}`;
    }

    if (
      hasPendingFollowUp
    ) {
      return "پیگیری موضوع ثبت‌شده و تبدیل پیگیری به فرصت فروش";
    }

    if (
      averageOrderTonnage > 0
    ) {
      return `حفظ ارتباط، بررسی نیاز جدید و ارزیابی آمادگی مشتری برای سفارش حدود ${tonnage}`;
    }

    return "حفظ ارتباط با مشتری و بررسی نیاز جدید برای ایجاد فرصت فروش";
  }

  if (hasPendingFollowUp) {
    return "پیگیری موضوع باز و تلاش برای تبدیل مشتری به اولین سفارش";
  }

  return "معرفی محصول، شناخت نیاز مشتری و تلاش برای ثبت اولین سفارش";
}

function toNumber(
  value:
    | number
    | string
    | null
    | undefined,
): number {
  const result = Number(
    value ?? 0,
  );

  return Number.isFinite(
    result,
  )
    ? result
    : 0;
}

function buildRegionPerformanceMap(
  targets: MonthlyRegionTargetRow[],
  progress: MonthlyRegionProgressRow[],
): Map<
  string,
  RegionPerformance
> {
  const map =
    new Map<
      string,
      RegionPerformance
    >();

  for (const target of targets) {
    if (!target.region_id) {
      continue;
    }

    const existing =
      map.get(
        target.region_id,
      ) ?? {
        targetTonnage: 0,
        achievedTonnage: 0,
        achievementRate: 0,
      };

    existing.targetTonnage +=
      toNumber(
        target.target_tonnage,
      );

    map.set(
      target.region_id,
      existing,
    );
  }

  for (const item of progress) {
    if (!item.region_id) {
      continue;
    }

    const existing =
      map.get(
        item.region_id,
      ) ?? {
        targetTonnage: 0,
        achievedTonnage: 0,
        achievementRate: 0,
      };

    existing.achievedTonnage +=
      toNumber(
        item.achieved_tonnage,
      );

    map.set(
      item.region_id,
      existing,
    );
  }

  for (const [
    regionId,
    performance,
  ] of map.entries()) {
    performance.achievementRate =
      performance.targetTonnage > 0
        ? performance.achievedTonnage /
          performance.targetTonnage
        : 0;

    map.set(
      regionId,
      performance,
    );
  }

  return map;
}

function getRegionTargetScore(
  regionPerformance:
    | RegionPerformance
    | undefined,
): {
  points: number;
  reason:
    | AIRecommendationReason
    | null;
} {
  if (
    !regionPerformance ||
    regionPerformance.targetTonnage <= 0
  ) {
    return {
      points: 0,
      reason: null,
    };
  }

  const rate =
    regionPerformance.achievementRate;

  if (rate < 0.1) {
    return {
      points: 12,
      reason: {
        code:
          "region_target_critical",
        title:
          `منطقه از هدف ماهانه عقب است؛ تحقق ${new Intl.NumberFormat(
            "fa-IR",
            {
              maximumFractionDigits: 1,
            },
          ).format(rate * 100)}٪`,
        points: 12,
      },
    };
  }

  if (rate < 0.25) {
    return {
      points: 8,
      reason: {
        code:
          "region_target_behind",
        title:
          `منطقه از هدف ماهانه عقب است؛ تحقق ${new Intl.NumberFormat(
            "fa-IR",
            {
              maximumFractionDigits: 1,
            },
          ).format(rate * 100)}٪`,
        points: 8,
      },
    };
  }

  if (rate < 0.5) {
    return {
      points: 4,
      reason: {
        code:
          "region_target_need",
        title:
          `نیاز به تقویت فروش منطقه؛ تحقق ${new Intl.NumberFormat(
            "fa-IR",
            {
              maximumFractionDigits: 1,
            },
          ).format(rate * 100)}٪`,
        points: 4,
      },
    };
  }

  return {
    points: 0,
    reason: null,
  };
}

function getErrorMessage(
  error: unknown,
  fallback: string,
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

function logAIError(
  operation: string,
  error: unknown,
): void {
  console.error(
    `========== AI ${operation} ERROR ==========`,
  );

  console.error(
    getErrorMessage(
      error,
      "خطای ناشناخته در موتور پیشنهاد فروش",
    ),
  );

  console.error(
    "============================================",
  );
}

export const aiService = {
  async getDailyCustomerRecommendations(
    limit = 5,
  ): Promise<
    AIRecommendedCustomer[]
  > {
    const safeLimit =
      Math.min(
        Math.max(
          Math.floor(limit),
          1,
        ),
        20,
      );

    const supabase =
      createSupabaseClient();

    try {
      // ==========================================
      // CURRENT MONTH
      // ==========================================

      const currentPeriod =
        getCurrentGregorianPeriod();

      // ==========================================
      // CUSTOMERS
      // ==========================================

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
          city:cities (
            id,
            name,
            region_id
          )
        `)
        .eq(
          "company_id",
          COMPANY_ID,
        )
        .eq(
          "is_active",
          true,
        )
        .is(
          "deleted_at",
          null,
        );

      if (customersError) {
        logAIError(
          "CUSTOMERS",
          customersError,
        );

        throw customersError;
      }

      const customerRows =
        (customers ??
          []) as unknown as CustomerRow[];

      if (
        customerRows.length ===
        0
      ) {
        return [];
      }

      // ==========================================
      // CONFIRMED ORDERS
      // ==========================================

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
          COMPANY_ID,
        )
        .eq(
          "status",
          "confirmed",
        )
        .is(
          "deleted_at",
          null,
        )
        .order(
          "order_date",
          {
            ascending: false,
          },
        );

      if (ordersError) {
        logAIError(
          "ORDERS",
          ordersError,
        );

        throw ordersError;
      }

      const orderRows =
        (orders ?? []) as OrderRow[];

      // ==========================================
      // CALLS
      // ==========================================

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
          COMPANY_ID,
        )
        .is(
          "deleted_at",
          null,
        )
        .order(
          "call_date",
          {
            ascending: false,
          },
        );

      if (callsError) {
        logAIError(
          "CALLS",
          callsError,
        );

        throw callsError;
      }

      const callRows =
        (calls ?? []) as CallRow[];

      // ==========================================
      // FOLLOW UPS
      // ==========================================

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
          COMPANY_ID,
        )
        .is(
          "deleted_at",
          null,
        )
        .order(
          "scheduled_at",
          {
            ascending: true,
          },
        );

      if (followUpsError) {
        logAIError(
          "FOLLOW UPS",
          followUpsError,
        );

        throw followUpsError;
      }

      const followUpRows =
        (followUps ??
          []) as FollowUpRow[];

      // ==========================================
      // MONTHLY REGION TARGETS
      // ==========================================

      const {
        data: monthlyTargets,
        error: monthlyTargetsError,
      } = await supabase
        .from("monthly_targets")
        .select(`
          region_id,
          target_tonnage
        `)
        .eq(
          "company_id",
          COMPANY_ID,
        )
        .eq(
          "target_year",
          currentPeriod.year,
        )
        .eq(
          "target_month",
          currentPeriod.month,
        )
        .is(
          "deleted_at",
          null,
        );

      if (monthlyTargetsError) {
        logAIError(
          "MONTHLY TARGETS",
          monthlyTargetsError,
        );

        throw monthlyTargetsError;
      }

      const {
        data: monthlyProgress,
        error: monthlyProgressError,
      } = await supabase
        .from("monthly_progress")
        .select(`
          region_id,
          achieved_tonnage
        `)
        .eq(
          "company_id",
          COMPANY_ID,
        )
        .eq(
          "progress_year",
          currentPeriod.year,
        )
        .eq(
          "progress_month",
          currentPeriod.month,
        )
        .is(
          "deleted_at",
          null,
        );

      if (monthlyProgressError) {
        logAIError(
          "MONTHLY PROGRESS",
          monthlyProgressError,
        );

        throw monthlyProgressError;
      }

      const monthlyTargetRows =
        (monthlyTargets ??
          []) as MonthlyRegionTargetRow[];

      const monthlyProgressRows =
        (monthlyProgress ??
          []) as MonthlyRegionProgressRow[];

      const regionPerformanceMap =
        buildRegionPerformanceMap(
          monthlyTargetRows,
          monthlyProgressRows,
        );

      // ==========================================
      // INDEX
      // ==========================================

      const ordersByCustomer =
        new Map<
          string,
          OrderRow[]
        >();

      const callsByCustomer =
        new Map<
          string,
          CallRow[]
        >();

      const followUpsByCustomer =
        new Map<
          string,
          FollowUpRow[]
        >();

      for (const order of orderRows) {
        const list =
          ordersByCustomer.get(
            order.customer_id,
          ) ?? [];

        list.push(order);

        ordersByCustomer.set(
          order.customer_id,
          list,
        );
      }

      for (const call of callRows) {
        const list =
          callsByCustomer.get(
            call.customer_id,
          ) ?? [];

        list.push(call);

        callsByCustomer.set(
          call.customer_id,
          list,
        );
      }

      for (
        const followUp of followUpRows
      ) {
        const list =
          followUpsByCustomer.get(
            followUp.customer_id,
          ) ?? [];

        list.push(followUp);

        followUpsByCustomer.set(
          followUp.customer_id,
          list,
        );
      }

      // ==========================================
      // CALCULATE
      // ==========================================

      const recommendations =
        customerRows.map(
          (
            customer,
          ): AIRecommendedCustomer => {
            const customerOrders =
              ordersByCustomer.get(
                customer.id,
              ) ?? [];

            const customerCalls =
              callsByCustomer.get(
                customer.id,
              ) ?? [];

            const customerFollowUps =
              followUpsByCustomer.get(
                customer.id,
              ) ?? [];

            const orderCount =
              customerOrders.length;

            const callCount =
              customerCalls.length;

            const lastOrderDate =
              customerOrders.length >
              0
                ? customerOrders[0]
                    .order_date
                : null;

            const lastCallDate =
              customerCalls.length >
              0
                ? customerCalls[0]
                    .call_date
                : null;

            const lifetimeTonnage =
              customerOrders.reduce(
                (
                  total,
                  order,
                ) =>
                  total +
                  Number(
                    order.total_tonnage ??
                      0,
                  ),
                0,
              );

            const averageOrderTonnage =
              orderCount > 0
                ? lifetimeTonnage /
                  orderCount
                : 0;

            const averageOrderIntervalDays =
              calculateAverageOrderIntervalDays(
                customerOrders,
              );

            const daysSinceLastOrder =
              calculateDaysSince(
                lastOrderDate,
              );

            const expectedNextOrderDate =
              calculateExpectedNextOrderDate(
                lastOrderDate,
                averageOrderIntervalDays,
              );

            const daysUntilExpectedOrder =
              calculateDaysUntilExpectedOrder(
                expectedNextOrderDate,
              );

            const isOrderDue =
              Boolean(
                averageOrderIntervalDays >
                  0 &&
                  daysUntilExpectedOrder !==
                    null &&
                  daysUntilExpectedOrder <=
                    0,
              );

            const activityDates =
              [
                lastOrderDate,
                lastCallDate,
              ].filter(
                (
                  value,
                ): value is string =>
                  Boolean(value),
              );

            const lastActivityDate =
              activityDates.length >
              0
                ? activityDates.reduce(
                    (
                      latest,
                      current,
                    ) =>
                      current >
                      latest
                        ? current
                        : latest,
                  )
                : null;

            const inactivityDays =
              calculateDaysSince(
                lastActivityDate,
              );

            const calledToday =
              customerCalls.some(
                (call) =>
                  isToday(
                    call.call_date,
                  ),
              );

            const hasPendingFollowUp =
              customerFollowUps.some(
                (followUp) =>
                  followUp.status ===
                  "pending",
              );

            const opportunityType =
              getOpportunityType(
                orderCount,
                daysSinceLastOrder,
                averageOrderIntervalDays,
              );

            const regionId =
              customer.city
                ?.region_id ??
              null;

            const regionPerformance =
              regionId
                ? regionPerformanceMap.get(
                    regionId,
                  )
                : undefined;

            const regionTargetScore =
              getRegionTargetScore(
                regionPerformance,
              );

            const reasons: AIRecommendationReason[] =
              [];

            let score = 0;

            // ==========================================
            // PURCHASE HISTORY
            // ==========================================

            if (orderCount >= 5) {
              score += 20;

              reasons.push({
                code:
                  "purchase_history_5_plus",
                title:
                  "سابقه خرید بسیار خوب",
                points: 20,
              });
            } else if (
              orderCount >= 3
            ) {
              score += 17;

              reasons.push({
                code:
                  "purchase_history_3_plus",
                title:
                  "سابقه خرید خوب",
                points: 17,
              });
            } else if (
              orderCount >= 2
            ) {
              score += 14;

              reasons.push({
                code:
                  "purchase_history_2",
                title:
                  `${orderCount} سفارش تأییدشده`,
                points: 14,
              });
            } else if (
              orderCount === 1
            ) {
              score += 10;

              reasons.push({
                code:
                  "purchase_history_1",
                title:
                  "یک سفارش تأییدشده",
                points: 10,
              });
            }

            // ==========================================
            // LIFETIME TONNAGE
            // ==========================================

            if (
              lifetimeTonnage >=
              100
            ) {
              score += 28;

              reasons.push({
                code:
                  "lifetime_100",
                title:
                  `سابقه خرید ${formatTonnage(
                    lifetimeTonnage,
                  )}`,
                points: 28,
              });
            } else if (
              lifetimeTonnage >=
              50
            ) {
              score += 23;

              reasons.push({
                code:
                  "lifetime_50",
                title:
                  `سابقه خرید ${formatTonnage(
                    lifetimeTonnage,
                  )}`,
                points: 23,
              });
            } else if (
              lifetimeTonnage >=
              20
            ) {
              score += 20;

              reasons.push({
                code:
                  "lifetime_20",
                title:
                  `سابقه خرید ${formatTonnage(
                    lifetimeTonnage,
                  )}`,
                points: 20,
              });
            } else if (
              lifetimeTonnage >=
              10
            ) {
              score += 14;

              reasons.push({
                code:
                  "lifetime_10",
                title:
                  `سابقه خرید ${formatTonnage(
                    lifetimeTonnage,
                  )}`,
                points: 14,
              });
            } else if (
              lifetimeTonnage > 0
            ) {
              score += 8;

              reasons.push({
                code:
                  "lifetime_positive",
                title:
                  `سابقه خرید ${formatTonnage(
                    lifetimeTonnage,
                  )}`,
                points: 8,
              });
            }

            // ==========================================
            // PURCHASE CADENCE
            // ==========================================

            if (isOrderDue) {
              score += 25;

              reasons.push({
                code:
                  "order_due",
                title:
                  "موعد خرید مشتری رسیده",
                points: 25,
              });
            } else if (
              daysUntilExpectedOrder !==
                null &&
              daysUntilExpectedOrder <=
                3
            ) {
              score += 20;

              reasons.push({
                code:
                  "order_near",
                title:
                  "موعد خرید نزدیک است",
                points: 20,
              });
            } else if (
              daysUntilExpectedOrder !==
                null &&
              daysUntilExpectedOrder <=
                7
            ) {
              score += 12;

              reasons.push({
                code:
                  "order_approaching",
                title:
                  "زمان خرید در حال نزدیک شدن است",
                points: 12,
              });
            }

            // ==========================================
            // RECENCY GAP
            // ==========================================

            if (
              orderCount > 0
            ) {
              if (
                daysSinceLastOrder >=
                60
              ) {
                score += 28;

                reasons.push({
                  code:
                    "recency_60",
                  title:
                    "فاصله طولانی از آخرین خرید",
                  points: 28,
                });
              } else if (
                daysSinceLastOrder >=
                30
              ) {
                score += 24;

                reasons.push({
                  code:
                    "recency_30",
                  title:
                    "فاصله قابل توجه از آخرین خرید",
                  points: 24,
                });
              } else if (
                daysSinceLastOrder >=
                14
              ) {
                score += 20;

                reasons.push({
                  code:
                    "recency_14",
                  title:
                    "بیش از دو هفته از آخرین خرید",
                  points: 20,
                });
              } else if (
                daysSinceLastOrder >=
                7
              ) {
                score += 10;

                reasons.push({
                  code:
                    "recency_7",
                  title:
                    "فاصله چندروزه از آخرین خرید",
                  points: 10,
                });
              }
            }

            // ==========================================
            // AVERAGE ORDER TONNAGE
            // ==========================================

            if (
              averageOrderTonnage >=
              20
            ) {
              score += 12;

              reasons.push({
                code:
                  "avg_order_20",
                title:
                  `میانگین سفارش ${formatTonnage(
                    averageOrderTonnage,
                  )}`,
                points: 12,
              });
            } else if (
              averageOrderTonnage >=
              10
            ) {
              score += 8;

              reasons.push({
                code:
                  "avg_order_10",
                title:
                  `میانگین سفارش ${formatTonnage(
                    averageOrderTonnage,
                  )}`,
                points: 8,
              });
            }

            // ==========================================
            // VIP
            // ==========================================

            if (customer.is_vip) {
              score += 12;

              reasons.push({
                code:
                  "vip",
                title:
                  "مشتری VIP است",
                points: 12,
              });
            }

            // ==========================================
            // FOLLOW-UP
            // ==========================================

            if (
              hasPendingFollowUp
            ) {
              score += 10;

              reasons.push({
                code:
                  "pending_follow_up",
                title:
                  "پیگیری باز دارد",
                points: 10,
              });
            }

            // ==========================================
            // TODAY CALL STATUS
            // ==========================================

            if (calledToday) {
              score -= 35;

              reasons.push({
                code:
                  "called_today",
                title:
                  "امروز تماس شده",
                points: -35,
              });
            } else {
              score += 5;

              reasons.push({
                code:
                  "not_called_today",
                title:
                  "امروز هنوز تماس نشده",
                points: 5,
              });
            }

            // ==========================================
            // OPPORTUNITY TYPE
            // ==========================================

            if (
              opportunityType ===
              "acquisition"
            ) {
              score += 3;

              reasons.push({
                code:
                  "acquisition",
                title:
                  "فرصت جذب مشتری جدید",
                points: 3,
              });
            }

            if (
              opportunityType ===
              "reactivation"
            ) {
              score += 8;

              reasons.push({
                code:
                  "reactivation",
                title:
                  "فرصت احیای مشتری",
                points: 8,
              });
            }

            if (
              opportunityType ===
                "retention" &&
              isOrderDue
            ) {
              score += 10;

              reasons.push({
                code:
                  "retention_due",
                title:
                  "زمان مناسب حفظ و پیگیری مشتری",
                points: 10,
              });
            }

            // ==========================================
            // REGION MONTHLY TARGET
            // ==========================================

            if (
              regionTargetScore.points >
              0
            ) {
              score +=
                regionTargetScore.points;

              if (
                regionTargetScore.reason
              ) {
                reasons.push(
                  regionTargetScore.reason,
                );
              }
            }

            // ==========================================
            // VERY RECENT ORDER
            // ==========================================

            if (
              orderCount > 0 &&
              daysSinceLastOrder <=
                3 &&
              !isOrderDue
            ) {
              score -= 15;

              reasons.push({
                code:
                  "recent_order",
                title:
                  "سفارش اخیر ثبت شده",
                points: -15,
              });
            }

            if (
              orderCount > 0 &&
              daysSinceLastOrder <=
                1 &&
              !isOrderDue
            ) {
              score -= 10;

              reasons.push({
                code:
                  "very_recent_order",
                title:
                  "خرید بسیار اخیر",
                points: -10,
              });
            }

            if (
              opportunityType ===
                "acquisition" &&
              hasPendingFollowUp
            ) {
              score += 5;

              reasons.push({
                code:
                  "acquisition_follow_up",
                title:
                  "برای جذب مشتری پیگیری باز وجود دارد",
                points: 5,
              });
            }

            score = Math.min(
              Math.max(
                Math.round(score),
                0,
              ),
              100,
            );

            const priority =
              getPriority(score);

            const suggestedOrderTonnage =
              getSuggestedOrderTonnage(
                opportunityType,
                averageOrderTonnage,
              );

            const suggestedAction =
              getSuggestedAction(
                opportunityType,
                isOrderDue,
                suggestedOrderTonnage,
              );

            const suggestedContactGoal =
              getSuggestedContactGoal(
                opportunityType,
                suggestedOrderTonnage,
                averageOrderTonnage,
                isOrderDue,
                hasPendingFollowUp,
              );

            return {
              customerId:
                customer.id,

              customerName:
                customer.name,

              phone:
                customer.phone,

              customerType:
                customer.customer_type,

              isVip:
                Boolean(
                  customer.is_vip,
                ),

              city:
                customer.city,

              score,
              priority,

              opportunityType,

              inactivityDays,

              lifetimeTonnage,

              orderCount,
              callCount,

              lastOrderDate,
              lastCallDate,

              daysSinceLastOrder,

              hasPendingFollowUp,
              calledToday,

              averageOrderTonnage,

              averageOrderIntervalDays,

              expectedNextOrderDate,

              daysUntilExpectedOrder,

              isOrderDue,

              suggestedOrderTonnage,

              suggestedAction:
                suggestedAction.action,

              suggestedActionDescription:
                suggestedAction.description,

              suggestedContactGoal,

              reasons:
                reasons
                  .sort(
                    (a, b) =>
                      b.points -
                      a.points,
                  )
                  .slice(
                    0,
                    6,
                  ),
            };
          },
        );

      return recommendations
        .filter(
          (customer) =>
            !customer.calledToday,
        )
        .sort(
          (a, b) => {
            if (
              b.score !==
              a.score
            ) {
              return (
                b.score -
                a.score
              );
            }

            const aDue =
              a.isOrderDue
                ? 1
                : 0;

            const bDue =
              b.isOrderDue
                ? 1
                : 0;

            if (
              bDue !==
              aDue
            ) {
              return (
                bDue -
                aDue
              );
            }

            if (
              b.lifetimeTonnage !==
              a.lifetimeTonnage
            ) {
              return (
                b.lifetimeTonnage -
                a.lifetimeTonnage
              );
            }

            if (
              b.orderCount !==
              a.orderCount
            ) {
              return (
                b.orderCount -
                a.orderCount
              );
            }

            if (
              b.daysSinceLastOrder !==
              a.daysSinceLastOrder
            ) {
              return (
                b.daysSinceLastOrder -
                a.daysSinceLastOrder
              );
            }

            if (
              Number(b.isVip) !==
              Number(a.isVip)
            ) {
              return (
                Number(b.isVip) -
                Number(a.isVip)
              );
            }

            return (
              b.inactivityDays -
              a.inactivityDays
            );
          },
        )
        .slice(
          0,
          safeLimit,
        );
    } catch (error) {
      logAIError(
        "RECOMMENDATIONS",
        error,
      );

      throw error;
    }
  },
};
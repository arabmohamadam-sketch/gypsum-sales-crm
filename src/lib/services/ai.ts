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

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function formatTonnage(value: number): string {
  return `${new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 1,
  }).format(value)} تن`;
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

function isToday(value: string): boolean {
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
      (now.getTime() - date.getTime()) /
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
    .map((order) => new Date(order.order_date))
    .filter(
      (date) => !Number.isNaN(date.getTime()),
    )
    .sort(
      (a, b) =>
        a.getTime() - b.getTime(),
    );

  if (dates.length < 2) {
    return 0;
  }

  let totalGapDays = 0;

  for (let index = 1; index < dates.length; index += 1) {
    const difference =
      dates[index].getTime() -
      dates[index - 1].getTime();

    totalGapDays +=
      difference /
      (1000 * 60 * 60 * 24);
  }

  return totalGapDays /
    (dates.length - 1);
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

  const date = new Date(lastOrderDate);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setDate(
    date.getDate() +
      Math.round(averageIntervalDays),
  );

  return date.toISOString();
}

function calculateDaysUntilExpectedOrder(
  expectedDate: string | null,
): number | null {
  if (!expectedDate) {
    return null;
  }

  const date = new Date(expectedDate);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const now = new Date();

  return Math.ceil(
    (date.getTime() - now.getTime()) /
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
            averageOrderIntervalDays * 1.25,
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

    if (typeof message === "string") {
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
  ): Promise<AIRecommendedCustomer[]> {
    const safeLimit = Math.min(
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
            name
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
        (customers ?? []) as unknown as CustomerRow[];

      if (
        customerRows.length === 0
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
        (followUps ?? []) as FollowUpRow[];

      // ==========================================
      // INDEX
      // ==========================================

      const ordersByCustomer =
        new Map<string, OrderRow[]>();

      const callsByCustomer =
        new Map<string, CallRow[]>();

      const followUpsByCustomer =
        new Map<string, FollowUpRow[]>();

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
        customerRows
          .map(
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
                customerOrders.length > 0
                  ? customerOrders[0]
                      .order_date
                  : null;

              const lastCallDate =
                customerCalls.length > 0
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
                activityDates.length > 0
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

              const reasons: AIRecommendationReason[] =
                [];

              let score = 0;

              // ========================================
              // PURCHASE HISTORY
              // ========================================

              if (
                orderCount >= 5
              ) {
                score += 20;

                reasons.push({
                  code:
                    "strong_purchase_history",
                  title:
                    `${formatNumber(orderCount)} سفارش تأییدشده`,
                  points: 20,
                });
              } else if (
                orderCount >= 3
              ) {
                score += 17;

                reasons.push({
                  code:
                    "repeat_purchase_history",
                  title:
                    `${formatNumber(orderCount)} سفارش تأییدشده`,
                  points: 17,
                });
              } else if (
                orderCount === 2
              ) {
                score += 14;

                reasons.push({
                  code:
                    "repeat_customer",
                  title:
                    "۲ سفارش تأییدشده",
                  points: 14,
                });
              } else if (
                orderCount === 1
              ) {
                score += 10;

                reasons.push({
                  code:
                    "existing_customer",
                  title:
                    "یک سفارش تأییدشده",
                  points: 10,
                });
              }

              // ========================================
              // CUSTOMER VALUE
              // ========================================

              if (
                lifetimeTonnage >=
                50
              ) {
                score += 28;

                reasons.push({
                  code:
                    "high_customer_value",
                  title:
                    `سابقه خرید ${formatTonnage(
                      lifetimeTonnage,
                    )}`,
                  points: 28,
                });
              } else if (
                lifetimeTonnage >=
                30
              ) {
                score += 23;

                reasons.push({
                  code:
                    "good_customer_value",
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
                    "valuable_customer",
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
                    "moderate_customer_value",
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
                    "some_purchase_value",
                  title:
                    `سابقه خرید ${formatTonnage(
                      lifetimeTonnage,
                    )}`,
                  points: 8,
                });
              }

              // ========================================
              // PURCHASE CADENCE
              // ========================================

              if (
                averageOrderIntervalDays >
                0
              ) {
                const roundedInterval =
                  Math.round(
                    averageOrderIntervalDays,
                  );

                if (
                  daysUntilExpectedOrder !==
                    null &&
                  daysUntilExpectedOrder <=
                    0 &&
                  daysSinceLastOrder <=
                    roundedInterval * 1.75
                ) {
                  score += 25;

                  reasons.push({
                    code:
                      "purchase_cycle_due",
                    title:
                      `موعد خرید مجدد رسیده؛ چرخه حدود ${formatNumber(
                        roundedInterval,
                      )} روز`,
                    points: 25,
                  });
                } else if (
                  daysUntilExpectedOrder !==
                    null &&
                  daysUntilExpectedOrder <=
                    5
                ) {
                  score += 20;

                  reasons.push({
                    code:
                      "purchase_cycle_near",
                    title:
                      `حدود ${formatNumber(
                        Math.max(
                          0,
                          daysUntilExpectedOrder,
                        ),
                      )} روز تا موعد خرید`,
                    points: 20,
                  });
                } else if (
                  daysUntilExpectedOrder !==
                    null &&
                  daysUntilExpectedOrder <=
                    10
                ) {
                  score += 12;

                  reasons.push({
                    code:
                      "purchase_cycle_approaching",
                    title:
                      `نزدیک شدن به چرخه خرید`,
                    points: 12,
                  });
                }
              }

              // ========================================
              // RECENCY / INACTIVITY
              // ========================================

              if (
                orderCount > 0
              ) {
                if (
                  daysSinceLastOrder >=
                  30
                ) {
                  score += 28;

                  reasons.push({
                    code:
                      "long_purchase_gap",
                    title:
                      `${formatNumber(
                        daysSinceLastOrder,
                      )} روز از آخرین خرید`,
                    points: 28,
                  });
                } else if (
                  daysSinceLastOrder >=
                  21
                ) {
                  score += 24;

                  reasons.push({
                    code:
                      "purchase_gap",
                    title:
                      `${formatNumber(
                        daysSinceLastOrder,
                      )} روز از آخرین خرید`,
                    points: 24,
                  });
                } else if (
                  daysSinceLastOrder >=
                  14
                ) {
                  score += 20;

                  reasons.push({
                    code:
                      "moderate_purchase_gap",
                    title:
                      `${formatNumber(
                        daysSinceLastOrder,
                      )} روز از آخرین خرید`,
                    points: 20,
                  });
                } else if (
                  daysSinceLastOrder >=
                  7
                ) {
                  score += 10;

                  reasons.push({
                    code:
                      "recent_purchase_gap",
                    title:
                      `${formatNumber(
                        daysSinceLastOrder,
                      )} روز از آخرین خرید`,
                    points: 10,
                  });
                }
              }

              // ========================================
              // ORDER SIZE
              // ========================================

              if (
                averageOrderTonnage >=
                20
              ) {
                score += 12;

                reasons.push({
                  code:
                    "high_average_order",
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
                    "good_average_order",
                  title:
                    `میانگین سفارش ${formatTonnage(
                      averageOrderTonnage,
                    )}`,
                  points: 8,
                });
              }

              // ========================================
              // VIP
              // ========================================

              if (
                customer.is_vip
              ) {
                score += 12;

                reasons.push({
                  code: "vip",
                  title:
                    "مشتری VIP است",
                  points: 12,
                });
              }

              // ========================================
              // FOLLOW-UP
              // ========================================

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

              // ========================================
              // TODAY CONTACT
              // ========================================

              if (
                calledToday
              ) {
                score -= 35;
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

              // ========================================
              // ACQUISITION
              // ========================================

              if (
                opportunityType ===
                "acquisition"
              ) {
                score += 3;

                reasons.push({
                  code:
                    "acquisition_opportunity",
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
                    "reactivation_opportunity",
                  title:
                    "مشتری وارد مرحله احیا شده است",
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

              // ========================================
              // VERY RECENT ORDER
              // ========================================

              if (
                orderCount > 0 &&
                daysSinceLastOrder <=
                  3
              ) {
                score -= 15;
              }

              if (
                orderCount > 0 &&
                daysSinceLastOrder <=
                  1
              ) {
                score -= 10;
              }

              // ========================================
              // ZERO-ORDER CUSTOMER
              // ========================================

              if (
                orderCount === 0
              ) {
                if (
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
              }

              score = Math.max(
                0,
                Math.min(
                  100,
                  Math.round(score),
                ),
              );

              const uniqueReasons =
                reasons
                  .sort(
                    (a, b) =>
                      b.points -
                      a.points,
                  )
                  .filter(
                    (
                      reason,
                      index,
                      all,
                    ) =>
                      all.findIndex(
                        (item) =>
                          item.code ===
                          reason.code,
                      ) === index,
                  )
                  .slice(0, 4);

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
                  customer.is_vip ??
                  false,

                city:
                  customer.city,

                score,

                priority:
                  getPriority(score),

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

                averageOrderIntervalDays:

                  averageOrderIntervalDays,

                expectedNextOrderDate,

                daysUntilExpectedOrder,

                isOrderDue,

                reasons:
                  uniqueReasons,
              };
            },
          )
          .filter(
            (customer) =>
              !customer.calledToday,
          )
          .sort(
            (a, b) => {
              if (
                a.score !== b.score
              ) {
                return (
                  b.score -
                  a.score
                );
              }

              if (
                a.isOrderDue !==
                b.isOrderDue
              ) {
                return a.isOrderDue
                  ? -1
                  : 1;
              }

              if (
                a.lifetimeTonnage !==
                b.lifetimeTonnage
              ) {
                return (
                  b.lifetimeTonnage -
                  a.lifetimeTonnage
                );
              }

              if (
                a.orderCount !==
                b.orderCount
              ) {
                return (
                  b.orderCount -
                  a.orderCount
                );
              }

              if (
                a.daysSinceLastOrder !==
                b.daysSinceLastOrder
              ) {
                return (
                  b.daysSinceLastOrder -
                  a.daysSinceLastOrder
                );
              }

              if (
                a.isVip !==
                b.isVip
              ) {
                return a.isVip
                  ? -1
                  : 1;
              }

              return (
                b.inactivityDays -
                a.inactivityDays
              );
            },
          )
          .slice(0, safeLimit);

      return recommendations;
    } catch (error) {
      logAIError(
        "RECOMMENDATIONS",
        error,
      );

      throw error;
    }
  },
};
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
    now.getDate()
  );
}

function getTomorrowStart(): Date {
  const tomorrow = getTodayStart();

  tomorrow.setDate(
    tomorrow.getDate() + 1
  );

  return tomorrow;
}

function isToday(
  value: string
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
  dateValue: string | null
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
        (1000 * 60 * 60 * 24)
    )
  );
}

function getPriority(
  score: number
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

function logAIError(
  operation: string,
  error: unknown
): void {
  console.error(
    `========== AI ${operation} ERROR ==========`
  );

  console.error(
    getErrorMessage(
      error,
      "خطای ناشناخته در موتور پیشنهاد فروش"
    )
  );

  console.error(
    "============================================"
  );
}

export const aiService = {
  async getDailyCustomerRecommendations(
    limit = 5
  ): Promise<AIRecommendedCustomer[]> {
    const safeLimit = Math.min(
      Math.max(
        Math.floor(limit),
        1
      ),
      20
    );

    const supabase =
      createSupabaseClient();

    try {
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
        logAIError(
          "CUSTOMERS",
          customersError
        );

        throw customersError;
      }

      const customerRows =
        (customers ??
          []) as unknown as CustomerRow[];

      if (
        customerRows.length === 0
      ) {
        return [];
      }

      // ========================================================
      // CONFIRMED ORDERS
      // ========================================================

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
        logAIError(
          "ORDERS",
          ordersError
        );

        throw ordersError;
      }

      const orderRows =
        (orders ??
          []) as OrderRow[];

      // ========================================================
      // CALLS
      // ========================================================

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
        logAIError(
          "CALLS",
          callsError
        );

        throw callsError;
      }

      const callRows =
        (calls ??
          []) as CallRow[];

      // ========================================================
      // FOLLOW UPS
      // ========================================================

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
            ascending: true,
          }
        );

      if (followUpsError) {
        logAIError(
          "FOLLOW UPS",
          followUpsError
        );

        throw followUpsError;
      }

      const followUpRows =
        (followUps ??
          []) as FollowUpRow[];

      // ========================================================
      // INDEX DATA
      // ========================================================

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

      for (
        const order of orderRows
      ) {
        const list =
          ordersByCustomer.get(
            order.customer_id
          ) ?? [];

        list.push(order);

        ordersByCustomer.set(
          order.customer_id,
          list
        );
      }

      for (
        const call of callRows
      ) {
        const list =
          callsByCustomer.get(
            call.customer_id
          ) ?? [];

        list.push(call);

        callsByCustomer.set(
          call.customer_id,
          list
        );
      }

      for (
        const followUp of followUpRows
      ) {
        const list =
          followUpsByCustomer.get(
            followUp.customer_id
          ) ?? [];

        list.push(followUp);

        followUpsByCustomer.set(
          followUp.customer_id,
          list
        );
      }

      // ========================================================
      // SCORE CUSTOMERS
      // ========================================================

      const recommendations =
        customerRows
          .map(
            (
              customer
            ): AIRecommendedCustomer => {
              const customerOrders =
                ordersByCustomer.get(
                  customer.id
                ) ?? [];

              const customerCalls =
                callsByCustomer.get(
                  customer.id
                ) ?? [];

              const customerFollowUps =
                followUpsByCustomer.get(
                  customer.id
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
                    order
                  ) =>
                    total +
                    Number(
                      order.total_tonnage ??
                        0
                    ),
                  0
                );

              const averageOrderTonnage =
                orderCount > 0
                  ? lifetimeTonnage /
                    orderCount
                  : 0;

              const daysSinceLastOrder =
                calculateDaysSince(
                  lastOrderDate
                );

              const activityDates =
                [
                  lastOrderDate,
                  lastCallDate,
                ].filter(
                  (
                    value
                  ): value is string =>
                    Boolean(value)
                );

              const lastActivityDate =
                activityDates.length >
                0
                  ? activityDates.reduce(
                      (
                        latest,
                        current
                      ) =>
                        current >
                        latest
                          ? current
                          : latest
                    )
                  : null;

              const inactivityDays =
                calculateDaysSince(
                  lastActivityDate
                );

              const calledToday =
                customerCalls.some(
                  (
                    call
                  ) =>
                    isToday(
                      call.call_date
                    )
                );

              const hasPendingFollowUp =
                customerFollowUps.some(
                  (
                    followUp
                  ) =>
                    followUp.status ===
                    "pending"
                );

              const reasons: AIRecommendationReason[] =
                [];

              let score = 0;

              let opportunityType:
                | AIOpportunityType;

              // ==================================================
              // OPPORTUNITY TYPE
              // ==================================================

              if (
                orderCount >= 1
              ) {
                opportunityType =
                  daysSinceLastOrder >=
                  14
                    ? "reactivation"
                    : "retention";
              } else {
                opportunityType =
                  "acquisition";
              }

              // ==================================================
              // PURCHASE HISTORY
              // ==================================================

              if (
                orderCount >= 5
              ) {
                score += 20;

                reasons.push({
                  code:
                    "strong_purchase_history",
                  title:
                    `${formatTonnage(
                      lifetimeTonnage
                    )} در ${formatNumber(
                      orderCount
                    )} سفارش`,
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
                    `${formatTonnage(
                      lifetimeTonnage
                    )} در ${formatNumber(
                      orderCount
                    )} سفارش`,
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
                    `${formatNumber(
                      orderCount
                    )} سفارش تأییدشده`,
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

              // ==================================================
              // LIFETIME TONNAGE
              // ==================================================

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
                      lifetimeTonnage
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
                      lifetimeTonnage
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
                      lifetimeTonnage
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
                      lifetimeTonnage
                    )}`,
                  points: 14,
                });
              } else if (
                lifetimeTonnage > 0
              ) {
                score += 8;

                reasons.push({
                  code:
                    "customer_value",
                  title:
                    `سابقه خرید ${formatTonnage(
                      lifetimeTonnage
                    )}`,
                  points: 8,
                });
              }

              // ==================================================
              // REORDER OPPORTUNITY
              // ==================================================

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
                      "strong_reorder_opportunity",
                    title:
                      "بیش از ۳۰ روز از آخرین خرید گذشته",
                    points: 28,
                  });
                } else if (
                  daysSinceLastOrder >=
                  21
                ) {
                  score += 24;

                  reasons.push({
                    code:
                      "reorder_opportunity",
                    title:
                      "بیش از ۲۱ روز از آخرین خرید گذشته",
                    points: 24,
                  });
                } else if (
                  daysSinceLastOrder >=
                  14
                ) {
                  score += 20;

                  reasons.push({
                    code:
                      "reorder_window",
                    title:
                      "بیش از ۱۴ روز از آخرین خرید گذشته",
                    points: 20,
                  });
                } else if (
                  daysSinceLastOrder >=
                  7
                ) {
                  score += 12;

                  reasons.push({
                    code:
                      "upcoming_reorder",
                    title:
                      "بیش از ۷ روز از آخرین خرید گذشته",
                    points: 12,
                  });
                }
              }

              // ==================================================
              // AVERAGE ORDER SIZE
              // ==================================================

              if (
                averageOrderTonnage >=
                20
              ) {
                score += 12;

                reasons.push({
                  code:
                    "large_average_order",
                  title:
                    `میانگین سفارش ${formatTonnage(
                      averageOrderTonnage
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
                    "medium_average_order",
                  title:
                    `میانگین سفارش ${formatTonnage(
                      averageOrderTonnage
                    )}`,
                  points: 8,
                });
              }

              // ==================================================
              // VIP
              // ==================================================

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

              // ==================================================
              // PENDING FOLLOW-UP
              // ==================================================

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

              // ==================================================
              // NOT CALLED TODAY
              // ==================================================

              if (
                !calledToday
              ) {
                score += 5;

                reasons.push({
                  code:
                    "not_called_today",
                  title:
                    "امروز هنوز تماس نشده",
                  points: 5,
                });
              } else {
                score -= 35;
              }

              // ==================================================
              // NEW CUSTOMER
              // ==================================================

              if (
                orderCount === 0
              ) {
                score += 3;

                reasons.push({
                  code:
                    "acquisition_opportunity",
                  title:
                    "فرصت جذب مشتری جدید",
                  points: 3,
                });

                if (
                  hasPendingFollowUp
                ) {
                  score += 5;

                  reasons.push({
                    code:
                      "new_customer_follow_up",
                    title:
                      "برای جذب مشتری پیگیری باز وجود دارد",
                    points: 5,
                  });
                }
              }

              // ==================================================
              // VERY RECENT PURCHASE PENALTY
              // ==================================================

              if (
                orderCount > 0 &&
                daysSinceLastOrder <=
                  3
              ) {
                score -= 10;
              }

              if (
                orderCount > 0 &&
                daysSinceLastOrder <=
                  1
              ) {
                score -= 10;
              }

              // ==================================================
              // FINAL SCORE
              // ==================================================

              score = Math.max(
                0,
                Math.min(
                  Math.round(score),
                  100
                )
              );

              reasons.sort(
                (a, b) =>
                  b.points -
                  a.points
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
                  customer.is_vip ??
                  false,

                city:
                  customer.city,

                score,

                priority:
                  getPriority(
                    score
                  ),

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

                reasons:
                  reasons.slice(
                    0,
                    3
                  ),
              };
            }
          )
          .filter(
            (
              customer
            ) =>
              !customer.calledToday
          )
          .sort(
            (a, b) => {
              if (
                a.score !==
                b.score
              ) {
                return (
                  b.score -
                  a.score
                );
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
            }
          )
          .slice(
            0,
            safeLimit
          );

      return recommendations;
    } catch (error) {
      logAIError(
        "DAILY CUSTOMER RECOMMENDATIONS",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در تولید پیشنهادهای هوشمند فروش."
        )
      );
    }
  },
};
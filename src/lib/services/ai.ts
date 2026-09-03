import {
  isLeapJalaaliYear,
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

  /**
   * احتمال تقریبی تبدیل تماس امروز به سفارش.
   * این مقدار پیش‌بینی قطعی نیست و صرفاً برای رتبه‌بندی
   * فرصت‌های فروش استفاده می‌شود.
   */
  estimatedPurchaseProbability: number;

  /**
   * فروش مورد انتظار از این تماس:
   * suggestedOrderTonnage × estimatedPurchaseProbability
   */
  expectedSalesTonnage: number;

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

interface PeerTonnageStats {
  total: number;
  count: number;
}

/* ==========================================
   BASIC HELPERS
   ========================================== */

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

function normalizeCustomerType(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function isBuildingMaterialStore(
  customerType: string,
): boolean {
  const normalizedType =
    normalizeCustomerType(
      customerType,
    );

  return (
    normalizedType ===
      "building_material_store" ||
    normalizedType ===
      "building_material_stores" ||
    normalizedType.includes("مصالح")
  );
}

/**
 * تعیین دوره جاری هدف بر اساس ماه جلالی.
 *
 * قرارداد پروژه:
 * دوره‌های هدف در دیتابیس با سال/ماه میلادی
 * ذخیره می‌شوند، اما مبنای انتخاب دوره در UI و
 * منطق کسب‌وکار، ماه جلالی است.
 *
 * بنابراین به‌جای تبدیل روز اول ماه جلالی،
 * روز آخر همان ماه را به میلادی تبدیل می‌کنیم.
 *
 * نمونه:
 * ۱۴۰۵/۰۶/۳۱ → 2026/09/22
 * پس دوره هدف:
 * target_year = 2026
 * target_month = 9
 */
function getCurrentTargetPeriod(): {
  year: number;
  month: number;
} {
  const now = new Date();

  const jalali = toJalaali(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );

  let lastDay: number;

  if (
    jalali.jm >= 1 &&
    jalali.jm <= 6
  ) {
    lastDay = 31;
  } else if (
    jalali.jm >= 7 &&
    jalali.jm <= 11
  ) {
    lastDay = 30;
  } else {
    lastDay = isLeapJalaaliYear(
      jalali.jy,
    )
      ? 30
      : 29;
  }

  const gregorian = toGregorian(
    jalali.jy,
    jalali.jm,
    lastDay,
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
  const tomorrow =
    getTodayStart();

  tomorrow.setDate(
    tomorrow.getDate() + 1,
  );

  return tomorrow;
}

function isToday(
  value: string,
): boolean {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
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

  const date = new Date(
    dateValue,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
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

function roundProbability(
  value: number,
): number {
  if (
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.min(
    1,
    Math.max(
      0,
      Math.round(value * 100) / 100,
    ),
  );
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

  return Number.isFinite(result)
    ? result
    : 0;
}

/* ==========================================
   ORDER CADENCE
   ========================================== */

function calculateAverageOrderIntervalDays(
  orders: OrderRow[],
): number {
  if (orders.length < 2) {
    return 0;
  }

  const dates = orders
    .map(
      (order) =>
        new Date(
          order.order_date,
        ),
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

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
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

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
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

/* ==========================================
   CUSTOMER TYPE
   ========================================== */

function getCustomerTypePriority(
  customerType: string,
): number {
  const normalizedType =
    normalizeCustomerType(
      customerType,
    );

  if (
    isBuildingMaterialStore(
      customerType,
    )
  ) {
    return 100;
  }

  if (
    normalizedType ===
      "distributor" ||
    normalizedType ===
      "distributor_company"
  ) {
    return 85;
  }

  if (
    normalizedType ===
      "contractor" ||
    normalizedType ===
      "contractor_company"
  ) {
    return 70;
  }

  if (
    normalizedType ===
      "employer" ||
    normalizedType ===
      "employers"
  ) {
    return 65;
  }

  if (
    normalizedType ===
      "plaster_worker" ||
    normalizedType ===
      "plasterer" ||
    normalizedType ===
      "plasterer_company"
  ) {
    return 50;
  }

  if (
    normalizedType ===
    "retailer"
  ) {
    return 40;
  }

  return 35;
}

/* ==========================================
   PEER TONNAGE
   ========================================== */

function addPeerTonnage(
  map: Map<
    string,
    PeerTonnageStats
  >,
  key: string,
  value: number,
): void {
  if (
    !key ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return;
  }

  const existing =
    map.get(key) ?? {
      total: 0,
      count: 0,
    };

  existing.total += value;
  existing.count += 1;

  map.set(
    key,
    existing,
  );
}

function getPeerAverage(
  map: Map<
    string,
    PeerTonnageStats
  >,
  key: string | null,
  minimumSample = 2,
): number {
  if (!key) {
    return 0;
  }

  const stats =
    map.get(key);

  if (
    !stats ||
    stats.count <
      minimumSample
  ) {
    return 0;
  }

  return (
    stats.total /
    stats.count
  );
}

function buildPeerTonnageMaps(
  customers: CustomerRow[],
  ordersByCustomer: Map<
    string,
    OrderRow[]
  >,
): {
  byTypeAndRegion: Map<
    string,
    PeerTonnageStats
  >;
  byType: Map<
    string,
    PeerTonnageStats
  >;
  byRegion: Map<
    string,
    PeerTonnageStats
  >;
  global: PeerTonnageStats;
} {
  const byTypeAndRegion =
    new Map<
      string,
      PeerTonnageStats
    >();

  const byType =
    new Map<
      string,
      PeerTonnageStats
    >();

  const byRegion =
    new Map<
      string,
      PeerTonnageStats
    >();

  const global: PeerTonnageStats = {
    total: 0,
    count: 0,
  };

  for (
    const customer of customers
  ) {
    const customerOrders =
      ordersByCustomer.get(
        customer.id,
      ) ?? [];

    if (
      customerOrders.length ===
      0
    ) {
      continue;
    }

    const validTonnages =
      customerOrders
        .map(
          (order) =>
            Number(
              order.total_tonnage ??
                0,
            ),
        )
        .filter(
          (value) =>
            Number.isFinite(
              value,
            ) &&
            value > 0,
        );

    if (
      validTonnages.length ===
      0
    ) {
      continue;
    }

    const customerAverage =
      validTonnages.reduce(
        (sum, value) =>
          sum + value,
        0,
      ) /
      validTonnages.length;

    const normalizedType =
      normalizeCustomerType(
        customer.customer_type,
      );

    const regionId =
      customer.city?.region_id ??
      null;

    addPeerTonnage(
      byType,
      normalizedType,
      customerAverage,
    );

    if (regionId) {
      addPeerTonnage(
        byRegion,
        regionId,
        customerAverage,
      );

      addPeerTonnage(
        byTypeAndRegion,
        `${normalizedType}:${regionId}`,
        customerAverage,
      );
    }

    global.total +=
      customerAverage;

    global.count += 1;
  }

  return {
    byTypeAndRegion,
    byType,
    byRegion,
    global,
  };
}

function getCustomerPeerAverageTonnage(
  customer: CustomerRow,
  peerMaps: {
    byTypeAndRegion: Map<
      string,
      PeerTonnageStats
    >;
    byType: Map<
      string,
      PeerTonnageStats
    >;
    byRegion: Map<
      string,
      PeerTonnageStats
    >;
    global: PeerTonnageStats;
  },
): number {
  const normalizedType =
    normalizeCustomerType(
      customer.customer_type,
    );

  const regionId =
    customer.city?.region_id ??
    null;

  if (regionId) {
    const typeAndRegionAverage =
      getPeerAverage(
        peerMaps.byTypeAndRegion,
        `${normalizedType}:${regionId}`,
      );

    if (
      typeAndRegionAverage > 0
    ) {
      return typeAndRegionAverage;
    }
  }

  const typeAverage =
    getPeerAverage(
      peerMaps.byType,
      normalizedType,
    );

  if (typeAverage > 0) {
    return typeAverage;
  }

  if (regionId) {
    const regionAverage =
      getPeerAverage(
        peerMaps.byRegion,
        regionId,
      );

    if (regionAverage > 0) {
      return regionAverage;
    }
  }

  if (
    peerMaps.global.count >=
    2
  ) {
    return (
      peerMaps.global.total /
      peerMaps.global.count
    );
  }

  return 0;
}

/* ==========================================
   SUGGESTED ORDER TONNAGE
   ========================================== */

function getSuggestedOrderTonnage(
  opportunityType: AIOpportunityType,
  averageOrderTonnage: number,
  customerType: string,
  isVip: boolean,
  peerAverageOrderTonnage: number,
): number {
  if (
    opportunityType !==
    "acquisition"
  ) {
    return roundSuggestedTonnage(
      averageOrderTonnage,
    );
  }

  const normalizedType =
    normalizeCustomerType(
      customerType,
    );

  let ruleBasedTonnage = 5;

  if (
    isBuildingMaterialStore(
      customerType,
    )
  ) {
    ruleBasedTonnage = 10;
  } else if (
    normalizedType ===
      "distributor" ||
    normalizedType ===
      "distributor_company"
  ) {
    ruleBasedTonnage = 15;
  } else if (
    normalizedType ===
      "contractor" ||
    normalizedType ===
      "contractor_company"
  ) {
    ruleBasedTonnage = 10;
  } else if (
    normalizedType ===
      "employer" ||
    normalizedType ===
      "employers"
  ) {
    ruleBasedTonnage = 10;
  } else if (
    normalizedType ===
      "plaster_worker" ||
    normalizedType ===
      "plasterer" ||
    normalizedType ===
      "plasterer_company"
  ) {
    ruleBasedTonnage = 5;
  } else if (
    normalizedType ===
    "retailer"
  ) {
    ruleBasedTonnage = 5;
  }

  let suggestedTonnage =
    peerAverageOrderTonnage >
    0
      ? peerAverageOrderTonnage
      : ruleBasedTonnage;

  suggestedTonnage =
    Math.max(
      5,
      suggestedTonnage,
    );

  suggestedTonnage =
    Math.min(
      30,
      suggestedTonnage,
    );

  if (
    isVip &&
    suggestedTonnage < 30
  ) {
    suggestedTonnage += 5;
  }

  return roundSuggestedTonnage(
    suggestedTonnage,
  );
}

/* ==========================================
   PURCHASE PROBABILITY
   ========================================== */

function estimatePurchaseProbability(
  customer: {
    opportunityType: AIOpportunityType;
    orderCount: number;
    lifetimeTonnage: number;
    averageOrderTonnage: number;
    averageOrderIntervalDays: number;
    daysSinceLastOrder: number;
    daysUntilExpectedOrder: number | null;
    isOrderDue: boolean;
    isVip: boolean;
    hasPendingFollowUp: boolean;
    calledToday: boolean;
    inactivityDays: number;
    customerType: string;
  },
): number {
  /*
   * پایه:
   * مشتری قدیمی به‌صورت طبیعی احتمال تبدیل
   * بالاتری از مشتری کاملاً جدید دارد.
   */
  let probability =
    customer.orderCount > 0
      ? 0.45
      : 0.25;

  /* سابقه سفارش */
  if (customer.orderCount >= 5) {
    probability += 0.16;
  } else if (
    customer.orderCount >= 3
  ) {
    probability += 0.12;
  } else if (
    customer.orderCount >= 2
  ) {
    probability += 0.08;
  } else if (
    customer.orderCount === 1
  ) {
    probability += 0.04;
  }

  /* سابقه تناژ واقعی */
  if (
    customer.lifetimeTonnage >=
    100
  ) {
    probability += 0.12;
  } else if (
    customer.lifetimeTonnage >=
    50
  ) {
    probability += 0.09;
  } else if (
    customer.lifetimeTonnage >=
    20
  ) {
    probability += 0.06;
  } else if (
    customer.lifetimeTonnage > 0
  ) {
    probability += 0.03;
  }

  /*
   * مهم‌ترین عامل:
   * اگر موعد خرید رسیده باشد،
   * احتمال تبدیل تماس به سفارش بالا می‌رود.
   */
  if (customer.isOrderDue) {
    probability += 0.20;
  } else if (
    customer.daysUntilExpectedOrder !==
      null &&
    customer.daysUntilExpectedOrder <=
      3
  ) {
    probability += 0.15;
  } else if (
    customer.daysUntilExpectedOrder !==
      null &&
    customer.daysUntilExpectedOrder <=
      7
  ) {
    probability += 0.09;
  }

  /* احیای مشتری */
  if (
    customer.opportunityType ===
    "reactivation"
  ) {
    probability +=
      customer.lifetimeTonnage >= 20
        ? 0.10
        : 0.06;
  }

  /* پیگیری باز */
  if (
    customer.hasPendingFollowUp
  ) {
    probability += 0.08;
  }

  /* VIP */
  if (customer.isVip) {
    probability += 0.06;
  }

  /* مصالح‌فروش */
  if (
    isBuildingMaterialStore(
      customer.customerType,
    )
  ) {
    probability += 0.05;
  }

  /*
   * مشتری‌ای که بسیار تازه خرید کرده،
   * احتمال سفارش فوری پایین‌تری دارد؛
   * مگر اینکه موعد خرید رسیده باشد.
   */
  if (
    customer.orderCount > 0 &&
    customer.daysSinceLastOrder <=
      3 &&
    !customer.isOrderDue
  ) {
    probability -= 0.12;
  } else if (
    customer.orderCount > 0 &&
    customer.daysSinceLastOrder <=
      7 &&
    !customer.isOrderDue
  ) {
    probability -= 0.05;
  }

  /*
   * فاصله بسیار زیاد از خرید،
   * بدون هیچ سیگنال دیگری، کمی احتمال تبدیل
   * را کاهش می‌دهد. در احیای مشتری این کاهش کمتر است.
   */
  if (
    customer.orderCount > 0 &&
    customer.daysSinceLastOrder >=
      120 &&
    customer.opportunityType !==
      "reactivation"
  ) {
    probability -= 0.08;
  }

  /*
   * مشتری جدید:
   * مصالح‌فروش بودن کمک می‌کند،
   * اما بدون سابقه واقعی سقف احتمال محدود می‌ماند.
   */
  if (
    customer.opportunityType ===
    "acquisition"
  ) {
    if (
      isBuildingMaterialStore(
        customer.customerType,
      )
    ) {
      probability = Math.max(
        probability,
        0.36,
      );
    }

    probability = Math.min(
      probability,
      0.60,
    );
  }

  if (customer.calledToday) {
    probability *= 0.15;
  }

  /*
   * احتمال نهایی بین 10٪ و 95٪ نگه داشته می‌شود.
   * این عدد «پیش‌بینی قطعی» نیست؛
   * صرفاً برای اولویت‌بندی تماس‌هاست.
   */
  return roundProbability(
    Math.min(
      0.95,
      Math.max(
        0.10,
        probability,
      ),
    ),
  );
}

/* ==========================================
   SUGGESTED ACTION
   ========================================== */

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
    description: tonnage
      ? `تماس اولیه را برای معرفی محصول، شناخت نیاز مشتری و تلاش برای ایجاد سفارش حدود ${tonnage} انجام بده.`
      : "تماس اولیه را برای معرفی محصول، شناخت نیاز مشتری و ایجاد اولین سفارش انجام بده.",
  };
}

/* ==========================================
   CONTACT GOAL
   ========================================== */

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

    if (hasPendingFollowUp) {
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

  if (tonnage) {
    return `معرفی محصول، شناخت نیاز مشتری و تلاش برای ثبت اولین سفارش حدود ${tonnage}`;
  }

  return "معرفی محصول، شناخت نیاز مشتری و تلاش برای ثبت اولین سفارش";
}

/* ==========================================
   REGION PERFORMANCE
   ========================================== */

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
    regionPerformance.targetTonnage <=
      0
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
        title: `منطقه از هدف ماهانه عقب است؛ تحقق ${new Intl.NumberFormat(
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
        title: `منطقه از هدف ماهانه عقب است؛ تحقق ${new Intl.NumberFormat(
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
        title: `نیاز به تقویت فروش منطقه؛ تحقق ${new Intl.NumberFormat(
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

/* ==========================================
   SALES PRIORITY
   ========================================== */

function getTonnagePriority(
  suggestedOrderTonnage: number,
): number {
  if (
    !Number.isFinite(
      suggestedOrderTonnage,
    ) ||
    suggestedOrderTonnage <= 0
  ) {
    return 0;
  }

  return Math.min(
    100,
    (suggestedOrderTonnage / 20) *
      100,
  );
}

function getRegionNeedPriority(
  regionPerformance:
    | RegionPerformance
    | undefined,
): number {
  if (
    !regionPerformance ||
    regionPerformance.targetTonnage <=
      0
  ) {
    return 0;
  }

  const rate = Math.max(
    0,
    regionPerformance.achievementRate,
  );

  if (rate <= 0) {
    return 100;
  }

  if (rate < 0.25) {
    return 85;
  }

  if (rate < 0.5) {
    return 65;
  }

  if (rate < 0.75) {
    return 40;
  }

  if (rate < 1) {
    return 20;
  }

  return 0;
}

function getContactTimingPriority(
  opportunityType: AIOpportunityType,
  isOrderDue: boolean,
  daysUntilExpectedOrder:
    | number
    | null,
  hasPendingFollowUp: boolean,
): number {
  if (isOrderDue) {
    return 100;
  }

  if (
    daysUntilExpectedOrder !==
      null &&
    daysUntilExpectedOrder <= 3
  ) {
    return 90;
  }

  if (
    daysUntilExpectedOrder !==
      null &&
    daysUntilExpectedOrder <= 7
  ) {
    return 75;
  }

  if (
    opportunityType ===
    "reactivation"
  ) {
    return 70;
  }

  if (hasPendingFollowUp) {
    return 65;
  }

  if (
    opportunityType ===
    "acquisition"
  ) {
    return 50;
  }

  return 35;
}

function getPurchaseHistoryPriority(
  customer: AIRecommendedCustomer,
): number {
  if (
    customer.orderCount >= 5
  ) {
    return 100;
  }

  if (
    customer.orderCount >= 3
  ) {
    return 90;
  }

  if (
    customer.orderCount >= 2
  ) {
    return 80;
  }

  if (
    customer.orderCount === 1
  ) {
    return 65;
  }

  return 30;
}

function getSalesOpportunityPriority(
  customer: AIRecommendedCustomer,
): number {
  if (
    customer.opportunityType ===
    "reactivation"
  ) {
    return 95;
  }

  if (
    customer.opportunityType ===
      "retention" &&
    customer.isOrderDue
  ) {
    return 100;
  }

  if (
    customer.opportunityType ===
    "retention"
  ) {
    return 75;
  }

  return 40;
}

function getExpectedSalesPriority(
  customer: AIRecommendedCustomer,
): number {
  if (
    customer.expectedSalesTonnage <=
    0
  ) {
    return 0;
  }

  /*
   * 10 تن فروش مورد انتظار = 100 امتیاز پایه
   */
  return Math.min(
    100,
    (customer.expectedSalesTonnage /
      10) *
      100,
  );
}

function calculateSalesPriority(
  customer: AIRecommendedCustomer,
  regionPriority: number,
): number {
  const customerTypePriority =
    getCustomerTypePriority(
      customer.customerType,
    );

  const tonnagePriority =
    getTonnagePriority(
      customer.suggestedOrderTonnage,
    );

  const timingPriority =
    getContactTimingPriority(
      customer.opportunityType,
      customer.isOrderDue,
      customer.daysUntilExpectedOrder,
      customer.hasPendingFollowUp,
    );

  const purchaseHistoryPriority =
    getPurchaseHistoryPriority(
      customer,
    );

  const salesOpportunityPriority =
    getSalesOpportunityPriority(
      customer,
    );

  const expectedSalesPriority =
    getExpectedSalesPriority(
      customer,
    );

  /*
   * فروش مورد انتظار: 40%
   * سابقه خرید واقعی: 20%
   * زمان مناسب تماس: 15%
   * نیاز منطقه: 10%
   * تناژ پیشنهادی خام: 5%
   * نوع مشتری: 5%
   * نوع فرصت فروش: 5%
   */

  let priority =
    expectedSalesPriority * 0.4 +
    purchaseHistoryPriority * 0.2 +
    timingPriority * 0.15 +
    regionPriority * 0.1 +
    tonnagePriority * 0.05 +
    customerTypePriority * 0.05 +
    salesOpportunityPriority *
      0.05;

  /*
   * مشتری دارای سابقه که موعد خریدش رسیده،
   * یک تقویت اضافه دریافت می‌کند.
   */
  if (
    customer.orderCount > 0 &&
    customer.isOrderDue
  ) {
    priority += 7;
  }

  /*
   * مشتری قدیمی با سابقه تناژ بالا
   * در احیا ارزش بیشتری دارد.
   */
  if (
    customer.opportunityType ===
      "reactivation" &&
    customer.lifetimeTonnage > 0
  ) {
    priority += Math.min(
      6,
      customer.lifetimeTonnage /
        15,
    );
  }

  /*
   * مصالح‌فروش جدید همچنان فرصت مهمی است.
   */
  if (
    customer.opportunityType ===
      "acquisition" &&
    isBuildingMaterialStore(
      customer.customerType,
    )
  ) {
    priority += 2;
  }

  return Math.min(
    100,
    Math.max(
      0,
      priority,
    ),
  );
}

/* ==========================================
   ERROR HANDLING
   ========================================== */

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

/* ==========================================
   AI SERVICE
   ========================================== */

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
      /* ==========================================
         CURRENT TARGET PERIOD
         ========================================== */

      const currentPeriod =
        getCurrentTargetPeriod();

      /* ==========================================
         CUSTOMERS
         ========================================== */

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

      /* ==========================================
         CONFIRMED ORDERS
         ========================================== */

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
        (orders ??
          []) as OrderRow[];

      /* ==========================================
         CALLS
         ========================================== */

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

      /* ==========================================
         FOLLOW UPS
         ========================================== */

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

      /* ==========================================
         MONTHLY TARGETS
         ========================================== */

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

      /* ==========================================
         MONTHLY PROGRESS
         ========================================== */

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

      /* ==========================================
         INDEX
         ========================================== */

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
            order.customer_id,
          ) ?? [];

        list.push(order);

        ordersByCustomer.set(
          order.customer_id,
          list,
        );
      }

      for (
        const call of callRows
      ) {
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
        const followUp of
        followUpRows
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

      /* ==========================================
         PEER TONNAGE INDEX
         ========================================== */

      const peerTonnageMaps =
        buildPeerTonnageMaps(
          customerRows,
          ordersByCustomer,
        );

      /* ==========================================
         CALCULATE
         ========================================== */

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

            const activityDates = [
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
              customer.city?.region_id ??
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

            const peerAverageOrderTonnage =
              opportunityType ===
              "acquisition"
                ? getCustomerPeerAverageTonnage(
                    customer,
                    peerTonnageMaps,
                  )
                : 0;

            const suggestedOrderTonnage =
              getSuggestedOrderTonnage(
                opportunityType,
                averageOrderTonnage,
                customer.customer_type,
                Boolean(
                  customer.is_vip,
                ),
                peerAverageOrderTonnage,
              );

            const reasons: AIRecommendationReason[] =
              [];

            let score = 0;

            /* ==========================================
               PURCHASE HISTORY
               ========================================== */

            if (
              orderCount >= 5
            ) {
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
                title: `${orderCount} سفارش تأییدشده`,
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

            /* ==========================================
               LIFETIME TONNAGE
               ========================================== */

            if (
              lifetimeTonnage >=
              100
            ) {
              score += 28;

              reasons.push({
                code:
                  "lifetime_100",
                title: `سابقه خرید ${formatTonnage(
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
                title: `سابقه خرید ${formatTonnage(
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
                title: `سابقه خرید ${formatTonnage(
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
                title: `سابقه خرید ${formatTonnage(
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
                title: `سابقه خرید ${formatTonnage(
                  lifetimeTonnage,
                )}`,
                points: 8,
              });
            }

            /* ==========================================
               PURCHASE CADENCE
               ========================================== */

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

            /* ==========================================
               RECENCY GAP
               ========================================== */

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

            /* ==========================================
               AVERAGE ORDER TONNAGE
               ========================================== */

            if (
              averageOrderTonnage >=
              20
            ) {
              score += 12;

              reasons.push({
                code:
                  "avg_order_20",
                title: `میانگین سفارش ${formatTonnage(
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
                title: `میانگین سفارش ${formatTonnage(
                  averageOrderTonnage,
                )}`,
                points: 8,
              });
            }

            /* ==========================================
               CUSTOMER TYPE
               ========================================== */

            if (
              isBuildingMaterialStore(
                customer.customer_type,
              )
            ) {
              score += 15;

              reasons.push({
                code:
                  "building_material_store",
                title:
                  "مصالح‌فروش؛ مشتری اصلی شرکت",
                points: 15,
              });
            }

            /* ==========================================
               VIP
               ========================================== */

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

            /* ==========================================
               FOLLOW-UP
               ========================================== */

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

            /* ==========================================
               TODAY CALL STATUS
               ========================================== */

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

            /* ==========================================
               OPPORTUNITY TYPE
               ========================================== */

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

            /* ==========================================
               REGION MONTHLY TARGET
               ========================================== */

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

            /* ==========================================
               VERY RECENT ORDER
               ========================================== */

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

            const estimatedPurchaseProbability =
              estimatePurchaseProbability(
                {
                  opportunityType,
                  orderCount,
                  lifetimeTonnage,
                  averageOrderTonnage,
                  averageOrderIntervalDays,
                  daysSinceLastOrder,
                  daysUntilExpectedOrder,
                  isOrderDue,
                  isVip:
                    Boolean(
                      customer.is_vip,
                    ),
                  hasPendingFollowUp,
                  calledToday,
                  inactivityDays,
                  customerType:
                    customer.customer_type,
                },
              );

            const expectedSalesTonnage =
              roundSuggestedTonnage(
                suggestedOrderTonnage *
                  estimatedPurchaseProbability,
              );

            /*
             * دلایل مهم فروش مورد انتظار
             */
            if (
              estimatedPurchaseProbability >=
              0.75
            ) {
              reasons.push({
                code:
                  "high_purchase_probability",
                title:
                  "احتمال تبدیل تماس به سفارش بالاست",
                points: 12,
              });
            } else if (
              estimatedPurchaseProbability >=
              0.55
            ) {
              reasons.push({
                code:
                  "medium_purchase_probability",
                title:
                  "احتمال مناسبی برای تبدیل تماس به سفارش دارد",
                points: 8,
              });
            }

            if (
              expectedSalesTonnage >=
              10
            ) {
              reasons.push({
                code:
                  "high_expected_sales",
                title: `فروش مورد انتظار حدود ${formatTonnage(
                  expectedSalesTonnage,
                )}`,
                points: 10,
              });
            }

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

              estimatedPurchaseProbability,

              expectedSalesTonnage,

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

      /* ==========================================
         FINAL SALES-FOCUSED RANKING
         ========================================== */

      const eligibleRecommendations =
        recommendations.filter(
          (customer) =>
            !customer.calledToday,
        );

      const salesCandidates =
        eligibleRecommendations
          .filter(
            (customer) =>
              customer
                .suggestedOrderTonnage >
              0,
          )
          .sort(
            (a, b) => {
              const aRegionPriority =
                getRegionNeedPriority(
                  a.city?.region_id
                    ? regionPerformanceMap.get(
                        a.city
                          .region_id,
                      )
                    : undefined,
                );

              const bRegionPriority =
                getRegionNeedPriority(
                  b.city?.region_id
                    ? regionPerformanceMap.get(
                        b.city
                          .region_id,
                      )
                    : undefined,
                );

              const aSalesPriority =
                calculateSalesPriority(
                  a,
                  aRegionPriority,
                );

              const bSalesPriority =
                calculateSalesPriority(
                  b,
                  bRegionPriority,
                );

              if (
                bSalesPriority !==
                aSalesPriority
              ) {
                return (
                  bSalesPriority -
                  aSalesPriority
                );
              }

              /*
               * اگر امتیاز نهایی نزدیک باشد،
               * فروش مورد انتظار معیار اصلی دوم است.
               */
              if (
                b.expectedSalesTonnage !==
                a.expectedSalesTonnage
              ) {
                return (
                  b.expectedSalesTonnage -
                  a.expectedSalesTonnage
                );
              }

              if (
                b.isOrderDue !==
                a.isOrderDue
              ) {
                return b.isOrderDue
                  ? -1
                  : 1;
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
                b.lifetimeTonnage !==
                a.lifetimeTonnage
              ) {
                return (
                  b.lifetimeTonnage -
                  a.lifetimeTonnage
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

              if (
                b.suggestedOrderTonnage !==
                a.suggestedOrderTonnage
              ) {
                return (
                  b.suggestedOrderTonnage -
                  a.suggestedOrderTonnage
                );
              }

              return (
                b.inactivityDays -
                a.inactivityDays
              );
            },
          );

      const salesCandidateIds =
        new Set(
          salesCandidates.map(
            (customer) =>
              customer.customerId,
          ),
        );

      const supportCandidates =
        eligibleRecommendations
          .filter(
            (customer) =>
              !salesCandidateIds.has(
                customer.customerId,
              ),
          )
          .sort(
            (a, b) => {
              const aRegionPriority =
                getRegionNeedPriority(
                  a.city?.region_id
                    ? regionPerformanceMap.get(
                        a.city
                          .region_id,
                      )
                    : undefined,
                );

              const bRegionPriority =
                getRegionNeedPriority(
                  b.city?.region_id
                    ? regionPerformanceMap.get(
                        b.city
                          .region_id,
                      )
                    : undefined,
                );

              if (
                bRegionPriority !==
                aRegionPriority
              ) {
                return (
                  bRegionPriority -
                  aRegionPriority
                );
              }

              const aStore =
                isBuildingMaterialStore(
                  a.customerType,
                );

              const bStore =
                isBuildingMaterialStore(
                  b.customerType,
                );

              if (
                aStore !== bStore
              ) {
                return aStore
                  ? -1
                  : 1;
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

              if (
                Number(
                  b.hasPendingFollowUp,
                ) !==
                Number(
                  a.hasPendingFollowUp,
                )
              ) {
                return (
                  Number(
                    b.hasPendingFollowUp,
                  ) -
                  Number(
                    a.hasPendingFollowUp,
                  )
                );
              }

              if (
                b.expectedSalesTonnage !==
                a.expectedSalesTonnage
              ) {
                return (
                  b.expectedSalesTonnage -
                  a.expectedSalesTonnage
                );
              }

              if (
                b.score !==
                a.score
              ) {
                return (
                  b.score -
                  a.score
                );
              }

              if (
                b.isOrderDue !==
                a.isOrderDue
              ) {
                return b.isOrderDue
                  ? -1
                  : 1;
              }

              if (
                b.inactivityDays !==
                a.inactivityDays
              ) {
                return (
                  b.inactivityDays -
                  a.inactivityDays
                );
              }

              return (
                b.lifetimeTonnage -
                a.lifetimeTonnage
              );
            },
          );

      return [
        ...salesCandidates,
        ...supportCandidates,
      ].slice(
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
"use client";

import Link from "next/link";

import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Phone,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  isLeapJalaaliYear,
} from "jalaali-js";

import {
  aiService,
  type AIRecommendedCustomer,
  type AIRecommendationPriority,
} from "@/src/lib/services/ai";

import {
  reportTargetsService,
  type MonthlyTargetReport,
} from "@/src/lib/services/report-targets";

import {
  getTodayJalali,
} from "@/src/lib/utils/jalali";

function formatNumber(
  value: number,
): string {
  return new Intl.NumberFormat(
    "fa-IR",
  ).format(value);
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

function formatPercent(
  value: number,
): string {
  return new Intl.NumberFormat(
    "fa-IR",
    {
      maximumFractionDigits: 1,
    },
  ).format(value);
}

function getPriorityLabel(
  priority: AIRecommendationPriority,
): string {
  switch (priority) {
    case "high":
      return "اولویت بالا";

    case "medium":
      return "اولویت متوسط";

    default:
      return "اولویت عادی";
  }
}

function getPriorityClass(
  priority: AIRecommendationPriority,
): string {
  switch (priority) {
    case "high":
      return "bg-red-50 text-red-700";

    case "medium":
      return "bg-amber-50 text-amber-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getOpportunityLabel(
  customer: AIRecommendedCustomer,
): string {
  switch (
    customer.opportunityType
  ) {
    case "reactivation":
      return "احیای مشتری";

    case "retention":
      return "خرید مجدد";

    default:
      return "جذب مشتری";
  }
}

function getOpportunityClass(
  customer: AIRecommendedCustomer,
): string {
  switch (
    customer.opportunityType
  ) {
    case "reactivation":
      return "bg-orange-50 text-orange-700";

    case "retention":
      return "bg-emerald-50 text-emerald-700";

    default:
      return "bg-violet-50 text-violet-700";
  }
}

function getCityName(
  name?: string | null,
): string {
  if (!name) {
    return "نامشخص";
  }

  const cityNames: Record<
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

  return (
    cityNames[name] ??
    name
  );
}

function getCustomerTypeLabel(
  type: string,
): string {
  const labels: Record<
    string,
    string
  > = {
    building_material_store:
      "مصالح‌فروشی",

    building_material_stores:
      "مصالح‌فروشی",

    contractor:
      "پیمانکار",

    contractor_company:
      "پیمانکار",

    employer:
      "کارفرما",

    employers:
      "کارفرما",

    plaster_worker:
      "گچ‌کار",

    plasterer:
      "گچ‌کار",

    plasterer_company:
      "گچ‌کار",

    distributor:
      "توزیع‌کننده",

    distributor_company:
      "توزیع‌کننده",

    retailer:
      "خرده‌فروشی",
  };

  return (
    labels[type] ??
    type
  );
}

function getDaysInJalaliMonth(
  year: number,
  month: number,
): number {
  if (month >= 1 && month <= 6) {
    return 31;
  }

  if (month >= 7 && month <= 11) {
    return 30;
  }

  return isLeapJalaaliYear(year)
    ? 30
    : 29;
}

function getProbabilityLabel(
  probability: number,
): string {
  return `${formatPercent(
    probability * 100,
  )}%`;
}

function getProbabilityClass(
  probability: number,
): string {
  if (probability >= 0.75) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (probability >= 0.55) {
    return "bg-blue-50 text-blue-700";
  }

  if (probability >= 0.4) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
}

function getExpectedSalesClass(
  expectedSalesTonnage: number,
): string {
  if (expectedSalesTonnage >= 10) {
    return "border-emerald-100 bg-emerald-50/70 text-emerald-800";
  }

  if (expectedSalesTonnage >= 5) {
    return "border-blue-100 bg-blue-50/70 text-blue-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getExpectedSalesLabel(
  expectedSalesTonnage: number,
): string {
  if (expectedSalesTonnage >= 10) {
    return "پتانسیل فروش بالا";
  }

  if (expectedSalesTonnage >= 5) {
    return "پتانسیل فروش متوسط";
  }

  return "پتانسیل فروش محدود";
}

function RecommendationCard({
  customer,
  index,
}: {
  customer: AIRecommendedCustomer;
  index: number;
}) {
  const averageInterval =
    customer.averageOrderIntervalDays >
    0
      ? Math.round(
          customer.averageOrderIntervalDays,
        )
      : null;

  return (
    <div className="rounded-2xl border border-slate-100 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-100 hover:bg-blue-50/20 hover:shadow-sm">
      <div className="flex flex-col gap-4">
        <Link
          href={`/customers/${customer.customerId}`}
          className="flex min-w-0 items-start gap-3"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white">
            {formatNumber(
              index + 1,
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-black text-slate-900">
                {customer.customerName}
              </p>

              {customer.isVip && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                  VIP
                </span>
              )}

              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-black ${getPriorityClass(
                  customer.priority,
                )}`}
              >
                {getPriorityLabel(
                  customer.priority,
                )}
              </span>

              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-black ${getOpportunityClass(
                  customer,
                )}`}
              >
                {getOpportunityLabel(
                  customer,
                )}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
              <span>
                شهر:{" "}
                {getCityName(
                  customer.city?.name,
                )}
              </span>

              <span>
                نوع:{" "}
                {getCustomerTypeLabel(
                  customer.customerType,
                )}
              </span>

              <span>
                عدم فعالیت:{" "}
                {customer.inactivityDays >=
                9999
                  ? "بدون فعالیت قبلی"
                  : `${formatNumber(
                      customer.inactivityDays,
                    )} روز`}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-500">
              <span>
                تناژ کل:{" "}
                {formatTonnage(
                  customer.lifetimeTonnage,
                )}
              </span>

              <span>
                سفارش:{" "}
                {formatNumber(
                  customer.orderCount,
                )}
              </span>

              <span>
                میانگین سفارش:{" "}
                {formatTonnage(
                  customer.averageOrderTonnage,
                )}
              </span>
            </div>

            {averageInterval !==
              null && (
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700">
                  <Clock3 size={13} />
                  چرخه خرید:{" "}
                  {formatNumber(
                    averageInterval,
                  )}{" "}
                  روز
                </span>

                {customer.isOrderDue ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2
                      size={13}
                    />
                    موعد خرید رسیده
                  </span>
                ) : customer.daysUntilExpectedOrder !==
                    null &&
                  customer.daysUntilExpectedOrder >
                    0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-600">
                    <CalendarClock
                      size={13}
                    />
                    حدود{" "}
                    {formatNumber(
                      customer.daysUntilExpectedOrder,
                    )}{" "}
                    روز تا خرید
                  </span>
                ) : null}
              </div>
            )}

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600">
                  <Target size={13} />
                  تناژ پیشنهادی
                </div>

                <p className="mt-1 text-sm font-black text-blue-800">
                  {formatTonnage(
                    customer.suggestedOrderTonnage,
                  )}
                </p>
              </div>

              <div
                className={`rounded-xl px-3 py-2.5 ${getProbabilityClass(
                  customer.estimatedPurchaseProbability,
                )}`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-bold">
                  <TrendingUp size={13} />
                  احتمال خرید
                </div>

                <p className="mt-1 text-sm font-black">
                  {getProbabilityLabel(
                    customer.estimatedPurchaseProbability,
                  )}
                </p>
              </div>

              <div
                className={`rounded-xl border px-3 py-2.5 ${getExpectedSalesClass(
                  customer.expectedSalesTonnage,
                )}`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-bold">
                  <Sparkles size={13} />
                  فروش مورد انتظار
                </div>

                <p className="mt-1 text-sm font-black">
                  {formatTonnage(
                    customer.expectedSalesTonnage,
                  )}
                </p>
              </div>
            </div>

            <div className="mt-2">
              <span
                className={`inline-flex rounded-lg px-2.5 py-1.5 text-[11px] font-black ${getProbabilityClass(
                  customer.estimatedPurchaseProbability,
                )}`}
              >
                {getExpectedSalesLabel(
                  customer.expectedSalesTonnage,
                )}
              </span>
            </div>

            {customer.reasons.length >
              0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {customer.reasons.map(
                  (reason) => (
                    <span
                      key={`${reason.code}-${reason.points}`}
                      className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-600"
                    >
                      {reason.title}
                    </span>
                  ),
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <span className="text-sm font-black">
                {formatNumber(
                  customer.score,
                )}
              </span>
            </div>

            <p className="mt-1 text-[10px] font-bold text-slate-400">
              امتیاز
            </p>
          </div>
        </Link>

        <div
          className={`rounded-xl px-3 py-3 ${
            customer.opportunityType ===
            "reactivation"
              ? "bg-orange-50 text-orange-700"
              : customer.opportunityType ===
                  "retention"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-violet-50 text-violet-700"
          }`}
        >
          <div className="flex items-start gap-2">
            {customer.opportunityType ===
            "reactivation" ? (
              <TrendingUp
                size={16}
                className="mt-0.5 shrink-0"
              />
            ) : customer.opportunityType ===
              "retention" ? (
              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0"
              />
            ) : (
              <Sparkles
                size={16}
                className="mt-0.5 shrink-0"
              />
            )}

            <div>
              <div className="text-sm font-black">
                {customer.suggestedAction}
              </div>

              <div className="mt-1 text-xs font-medium leading-6">
                {
                  customer.suggestedActionDescription
                }
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Target size={14} />
            هدف تماس
          </div>

          <div className="text-sm font-medium leading-6 text-slate-800">
            {
              customer.suggestedContactGoal
            }
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/activities/calls/new?customerId=${customer.customerId}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700"
          >
            <Phone size={15} />
            ثبت تماس
          </Link>

          <Link
            href={`/activities/follow-ups/new?customerId=${customer.customerId}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
          >
            <CalendarClock
              size={15}
            />
            ثبت پیگیری
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AIRecommendations() {
  const [
    recommendations,
    setRecommendations,
  ] = useState<
    AIRecommendedCustomer[]
  >([]);

  const [
    monthlyTargetReport,
    setMonthlyTargetReport,
  ] = useState<
    MonthlyTargetReport | null
  >(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendations() {
      try {
        setLoading(true);
        setError(null);

        const today =
          getTodayJalali();

        const [
          result,
          targetReport,
        ] = await Promise.all([
          aiService.getDailyCustomerRecommendations(
            5,
          ),

          reportTargetsService.getMonthlyReport(
            today.year,
            today.month,
          ),
        ]);

        if (cancelled) {
          return;
        }

        setRecommendations(
          result,
        );

        setMonthlyTargetReport(
          targetReport,
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "AI DASHBOARD RECOMMENDATIONS ERROR:",
          err,
        );

        setRecommendations([]);

        setMonthlyTargetReport(
          null,
        );

        setError(
          err instanceof Error
            ? err.message
            : "خطا در دریافت پیشنهادهای هوشمند.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRecommendations();

    return () => {
      cancelled = true;
    };
  }, []);

  const today =
    getTodayJalali();

  const suggestedTonnage =
    recommendations.reduce(
      (
        total,
        customer,
      ) =>
        total +
        customer.suggestedOrderTonnage,
      0,
    );

  const expectedSalesTonnage =
    recommendations.reduce(
      (
        total,
        customer,
      ) =>
        total +
        customer.expectedSalesTonnage,
      0,
    );

  const targetRemaining =
    Math.max(
      monthlyTargetReport?.remainingTonnage ??
        0,
      0,
    );

  const targetCoverage =
    targetRemaining > 0
      ? (suggestedTonnage /
          targetRemaining) *
        100
      : 0;

  const expectedSalesCoverage =
    targetRemaining > 0
      ? (expectedSalesTonnage /
          targetRemaining) *
        100
      : 0;

  const daysInCurrentMonth =
    getDaysInJalaliMonth(
      today.year,
      today.month,
    );

  const remainingDays =
    Math.max(
      daysInCurrentMonth -
        today.day,
      0,
    );

  const dailyRequiredTonnage =
    remainingDays > 0 &&
    targetRemaining > 0
      ? targetRemaining /
        remainingDays
      : 0;

  const dailyNeedCoverage =
    dailyRequiredTonnage > 0
      ? (suggestedTonnage /
          dailyRequiredTonnage) *
        100
      : 0;

  const expectedDailyNeedCoverage =
    dailyRequiredTonnage > 0
      ? (expectedSalesTonnage /
          dailyRequiredTonnage) *
        100
      : 0;

  return (
    <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500" />

      <div className="p-6 md:p-7">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Sparkles size={19} />
            </div>

            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                پیشنهاد هوشمند امروز
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                پیشنهادها بر اساس سابقه فروش، چرخه خرید، تناژ، احتمال خرید و فعالیت CRM محاسبه می‌شوند.
              </p>
            </div>
          </div>

          <Link
            href="/customers"
            className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 transition hover:text-blue-700"
          >
            همه مشتریان
            <ArrowLeft size={15} />
          </Link>
        </div>

        {!loading &&
          !error &&
          monthlyTargetReport ? (
          <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
            <div className="mb-4 flex items-center gap-2">
              <Target
                size={17}
                className="text-blue-600"
              />

              <div>
                <h3 className="text-sm font-black text-slate-800">
                  اتصال پیشنهادهای AI به هدف ماهانه
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  سناریوی پیشنهادی بر اساس{" "}
                  {formatNumber(
                    recommendations.length,
                  )}{" "}
                  مشتری منتخب امروز
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-[11px] font-bold text-slate-400">
                  هدف ماه
                </p>

                <p className="mt-1 text-lg font-black text-slate-900">
                  {formatTonnage(
                    monthlyTargetReport.targetTonnage,
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-[11px] font-bold text-slate-400">
                  فروش محقق‌شده
                </p>

                <p className="mt-1 text-lg font-black text-emerald-700">
                  {formatTonnage(
                    monthlyTargetReport.achievedTonnage,
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-[11px] font-bold text-slate-400">
                  باقی‌مانده هدف
                </p>

                <p className="mt-1 text-lg font-black text-amber-700">
                  {formatTonnage(
                    targetRemaining,
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-[11px] font-bold text-slate-400">
                  تناژ پیشنهادی امروز
                </p>

                <p className="mt-1 text-lg font-black text-blue-700">
                  {formatTonnage(
                    suggestedTonnage,
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-[11px] font-bold text-slate-400">
                  فروش مورد انتظار
                </p>

                <p className="mt-1 text-lg font-black text-violet-700">
                  {formatTonnage(
                    expectedSalesTonnage,
                  )}
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-bold text-slate-400">
                  پوشش نظری هدف
                </p>

                <p className="mt-1 text-xl font-black text-blue-700">
                  {formatPercent(
                    targetCoverage,
                  )}
                  %
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  بر اساس کل تناژ پیشنهادی
                </p>
              </div>

              <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                <p className="text-[11px] font-bold text-violet-600">
                  پوشش مورد انتظار هدف
                </p>

                <p className="mt-1 text-xl font-black text-violet-800">
                  {formatPercent(
                    expectedSalesCoverage,
                  )}
                  %
                </p>

                <p className="mt-1 text-xs leading-5 text-violet-700/70">
                  بر اساس فروش مورد انتظار
                </p>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <p className="text-[11px] font-bold text-emerald-600">
                  پوشش نیاز روزانه مورد انتظار
                </p>

                <p className="mt-1 text-xl font-black text-emerald-800">
                  {formatPercent(
                    expectedDailyNeedCoverage,
                  )}
                  %
                </p>

                <p className="mt-1 text-xs leading-5 text-emerald-700/70">
                  بر اساس فروش مورد انتظار
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400">
                      روز باقی‌مانده تا پایان ماه
                    </p>

                    <p className="mt-1 text-xl font-black text-slate-800">
                      {formatNumber(
                        remainingDays,
                      )}{" "}
                      روز
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                    <CalendarClock size={18} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400">
                      نیاز فروش روزانه
                    </p>

                    <p className="mt-1 text-xl font-black text-slate-800">
                      {formatTonnage(
                        dailyRequiredTonnage,
                      )}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <TrendingUp size={18} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500">
                    پوشش نیاز روزانه توسط پیشنهادهای امروز
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-800">
                    {formatPercent(
                      dailyNeedCoverage,
                    )}
                    %
                  </p>
                </div>

                <p className="text-xs leading-5 text-slate-500">
                  این شاخص نشان می‌دهد تناژ پیشنهادی{" "}
                  {formatNumber(
                    recommendations.length,
                  )}{" "}
                  مشتری منتخب امروز، معادل چند درصد از نیاز متوسط یک روز فروش تا پایان ماه است.
                </p>
              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      Math.max(
                        dailyNeedCoverage,
                        0,
                      ),
                      100,
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold text-violet-700">
                    فروش مورد انتظار از ۵ تماس
                  </p>

                  <p className="mt-1 text-sm font-black text-violet-900">
                    {formatTonnage(
                      expectedSalesTonnage,
                    )}
                  </p>
                </div>

                <p className="text-xs leading-5 text-violet-700/80">
                  این عدد حاصل‌ضرب تناژ پیشنهادی هر مشتری در احتمال تقریبی تبدیل تماس به سفارش است و پیش‌بینی قطعی فروش نیست.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-xs leading-6 text-amber-800">
                احتمال خرید و فروش مورد انتظار شاخص‌های تحلیلی موتور پیشنهاد فروش هستند و به معنی تضمین ثبت سفارش نیستند.
              </p>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="flex min-h-40 items-center justify-center rounded-2xl bg-slate-50">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
              <Loader2
                size={18}
                className="animate-spin"
              />
              در حال محاسبه پیشنهادهای هوشمند...
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-medium leading-7 text-red-700">
            {error}
          </div>
        ) : recommendations.length ===
          0 ? (
          <div className="rounded-2xl bg-slate-50 p-6 text-center">
            <p className="text-sm font-bold text-slate-700">
              در حال حاضر پیشنهاد هوشمندی برای نمایش وجود ندارد.
            </p>

            <p className="mt-1 text-xs text-slate-500">
              با ثبت تماس، پیگیری و سفارش‌های بیشتر، پیشنهادها دقیق‌تر خواهند شد.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map(
              (
                customer,
                index,
              ) => (
                <RecommendationCard
                  key={
                    customer.customerId
                  }
                  customer={
                    customer
                  }
                  index={index}
                />
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
}
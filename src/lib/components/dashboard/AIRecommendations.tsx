"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Phone,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

import {
  aiService,
  type AIRecommendedCustomer,
  type AIRecommendationPriority,
} from "@/src/lib/services/ai";

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

    retailer:
      "خرده‌فروشی",
  };

  return (
    labels[type] ??
    type
  );
}

function RecommendationCard({
  customer,
  index,
}: {
  customer: AIRecommendedCustomer;
  index: number;
}) {
  const averageInterval =
    customer.averageOrderIntervalDays > 0
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
                    <CheckCircle2 size={13} />
                    موعد خرید رسیده
                  </span>
                ) : customer.daysUntilExpectedOrder !==
                    null &&
                  customer.daysUntilExpectedOrder >
                    0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-600">
                    <CalendarClock size={13} />
                    حدود{" "}
                    {formatNumber(
                      customer.daysUntilExpectedOrder,
                    )}{" "}
                    روز تا خرید
                  </span>
                ) : null}
              </div>
            )}

            {customer.reasons.length >
              0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {customer.reasons.map(
                  (reason) => (
                    <span
                      key={
                        `${reason.code}-${reason.points}`
                      }
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

        {customer.opportunityType ===
          "reactivation" && (
          <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2.5 text-xs font-bold text-orange-700">
            <TrendingUp
              size={14}
            />
            پیشنهاد: تماس برای فعال‌سازی مجدد و بررسی نیاز به سفارش جدید
          </div>
        )}

        {customer.opportunityType ===
          "retention" &&
          customer.isOrderDue && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700">
              <CheckCircle2
                size={14}
              />
              پیشنهاد: زمان مناسبی برای تماس و گرفتن سفارش مجدد است
            </div>
          )}

        {customer.opportunityType ===
          "acquisition" && (
          <div className="flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2.5 text-xs font-bold text-violet-700">
            <Sparkles
              size={14}
            />
            پیشنهاد: تماس برای معرفی محصول و ایجاد اولین سفارش
          </div>
        )}

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

        const result =
          await aiService.getDailyCustomerRecommendations(
            5,
          );

        if (cancelled) {
          return;
        }

        setRecommendations(
          result,
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
                پیشنهادها بر اساس سابقه فروش، چرخه خرید، تناژ و فعالیت CRM
                محاسبه می‌شوند.
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

        {loading ? (
          <div className="flex min-h-40 items-center justify-center rounded-2xl bg-slate-50">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
              <Loader2
                size={18}
                className="animate-spin"
              />
              در حال تحلیل مشتریان...
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div>
                <p className="font-black text-red-800">
                  خطا در تولید پیشنهادهای هوشمند
                </p>

                <p className="mt-1 text-sm leading-6 text-red-600">
                  {error}
                </p>
              </div>
            </div>
          </div>
        ) : recommendations.length ===
          0 ? (
          <div className="rounded-2xl bg-slate-50 p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
              <Sparkles size={24} />
            </div>

            <p className="mt-4 font-bold text-slate-700">
              برای امروز پیشنهاد جدیدی وجود ندارد
            </p>

            <p className="mt-1 text-xs leading-6 text-slate-400">
              مشتریانی که امروز تماس گرفته‌اند از فهرست پیشنهاد حذف شده‌اند.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map(
              (customer, index) => (
                <RecommendationCard
                  key={
                    customer.customerId
                  }
                  customer={customer}
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
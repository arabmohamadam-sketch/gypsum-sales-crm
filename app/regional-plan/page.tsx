"use client";

import { useMemo, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  MapPin,
  RefreshCw,
  Target,
  Truck,
} from "lucide-react";

import {
  regionalPlanService,
  type RegionalPlanResult,
  type RegionalPlanRow,
} from "@/src/lib/services/regional-plan";
import { gregorianToJalali } from "@/src/lib/utils/jalali";

const MONTH_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function formatDecimal(value: number): string {
  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatYear(value: number): string {
  return value.toLocaleString("fa-IR", {
    useGrouping: false,
  });
}

function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? `ماه ${month}`;
}

function getInitialPeriod(): { year: number; month: number } {
  const today = gregorianToJalali(new Date());

  return today
    ? { year: today.year, month: today.month }
    : { year: 1405, month: 7 };
}

function moveMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  let nextYear = year;
  let nextMonth = month + delta;

  while (nextMonth > 12) {
    nextMonth -= 12;
    nextYear += 1;
  }

  while (nextMonth < 1) {
    nextMonth += 12;
    nextYear -= 1;
  }

  return {
    year: nextYear,
    month: nextMonth,
  };
}

function getErrorMessage(error: unknown): string {
  let message: string | null = null;

  if (error instanceof Error) {
    message = error.message;
  } else if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    message = error.message;
  }

  if (!message) {
    return "دریافت اطلاعات برنامه منطقه‌ای ناموفق بود.";
  }

  if (
    message.includes(
      "User does not have regional_manager role",
    )
  ) {
    return "این بخش فقط برای مدیر منطقه قابل دسترسی است.";
  }

  if (message.includes("Authentication is required")) {
    return "نشست کاربر معتبر نیست. لطفاً دوباره وارد سامانه شوید.";
  }

  return message;
}

function ProgressBar({ rate }: { rate: number | null }) {
  const percentage = Math.max(
    0,
    Math.min(rate ?? 0, 100),
  );

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="font-bold text-slate-500">نرخ تحقق</span>
        <span className="font-black text-slate-800">
          {formatDecimal(rate ?? 0)}٪
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  suffix,
  icon,
  description,
}: {
  title: string;
  value: string;
  suffix?: string;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">{title}</p>

          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-black tracking-tight text-slate-900">
              {value}
            </span>
            {suffix && (
              <span className="text-xs font-bold text-slate-400">
                {suffix}
              </span>
            )}
          </div>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

function RegionCard({ row }: { row: RegionalPlanRow }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <MapPin size={17} />
            </div>

            <h3 className="truncate text-base font-black text-slate-900">
              {row.region_name}
            </h3>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-400">
            تحقق بر اساس بارگیری واقعی تأییدشده
          </p>
        </div>

        <div className="shrink-0 rounded-2xl bg-emerald-50 px-3 py-2 text-center">
          <p className="text-[10px] font-bold text-emerald-600">تحقق</p>
          <p className="mt-0.5 text-lg font-black text-emerald-700">
            {formatDecimal(row.achieved_tonnage)}
            <span className="mr-1 text-[10px]">تن</span>
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-[11px] font-bold text-slate-400">هدف</p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {formatDecimal(row.target_tonnage)} تن
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-[11px] font-bold text-slate-400">باقی‌مانده</p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {formatDecimal(row.remaining_tonnage)} تن
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 p-3">
        <span className="text-[11px] font-bold text-slate-400">
          سفارش‌های بارگیری‌شده
        </span>
        <span className="text-sm font-black text-slate-900">
          {formatNumber(row.loaded_order_count)} سفارش
        </span>
      </div>

      <ProgressBar rate={row.achievement_rate} />
    </div>
  );
}

function RegionalPlanContent() {
  const initialPeriod = useMemo(
    () => getInitialPeriod(),
    [],
  );

  const [year, setYear] = useState(initialPeriod.year);
  const [month, setMonth] = useState(initialPeriod.month);

  const planQuery = useQuery<RegionalPlanResult, Error>({
    queryKey: ["regional-plan", year, month],
    queryFn: () =>
      regionalPlanService.getMyPlan(year, month),
  });

  const result = planQuery.data ?? null;
  const overall = result?.overall ?? null;
  const periodLabel = `${getMonthName(month)} ${formatYear(year)}`;

  return (
    <main className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-lg">
        <div className="relative p-6 sm:p-7">
          <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="absolute -bottom-32 right-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-blue-200">
                <Target size={18} />
                <span className="text-xs font-bold">Plan Manager V2</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                برنامه منطقه‌ای
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                عملکرد مناطق بر اساس تناژ واقعی بارگیری‌شده و تأییدشده، نه مقدار اولیه سفارش.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const previous = moveMonth(year, month, -1);
                  setYear(previous.year);
                  setMonth(previous.month);
                }}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]"
                title="ماه قبل"
                aria-label="ماه قبل"
              >
                <ChevronRight size={18} />
              </button>

              <div className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4">
                <CalendarRange size={17} className="text-blue-200" />
                <span className="text-sm font-black">{periodLabel}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const next = moveMonth(year, month, 1);
                  setYear(next.year);
                  setMonth(next.month);
                }}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]"
                title="ماه بعد"
                aria-label="ماه بعد"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                type="button"
                onClick={() => void planQuery.refetch()}
                disabled={planQuery.isFetching}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={planQuery.isFetching ? "animate-spin" : ""}
                />
                بروزرسانی
              </button>
            </div>
          </div>
        </div>
      </section>

      {planQuery.error ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800">
          <div className="flex items-start gap-3">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-black">دریافت برنامه منطقه‌ای ناموفق بود</p>
              <p className="mt-1 text-sm leading-6 text-red-700">{getErrorMessage(planQuery.error)}</p>
            </div>
          </div>
        </section>
      ) : null}

      {planQuery.isPending && !result ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <RefreshCw
            size={28}
            className="mx-auto animate-spin text-blue-600"
          />
          <p className="mt-4 text-sm font-bold text-slate-600">
            در حال دریافت عملکرد منطقه‌ای...
          </p>
        </section>
      ) : result ? (
        <>
          {overall && (
            <section>
              <div className="mb-3 flex items-center gap-2 px-1">
                <ClipboardCheck size={18} className="text-blue-600" />
                <h2 className="text-lg font-black text-slate-900">
                  جمع عملکرد مدیر منطقه
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  title="هدف کل"
                  value={formatDecimal(overall.target_tonnage)}
                  suffix="تن"
                  icon={<Target size={21} />}
                  description={`هدف ثبت‌شده برای ${periodLabel}`}
                />

                <SummaryCard
                  title="تحقق واقعی"
                  value={formatDecimal(overall.achieved_tonnage)}
                  suffix="تن"
                  icon={<Truck size={21} />}
                  description="تناژ بارگیری و تأییدشده"
                />

                <SummaryCard
                  title="باقی‌مانده هدف"
                  value={formatDecimal(overall.remaining_tonnage)}
                  suffix="تن"
                  icon={<Target size={21} />}
                  description="فاصله تا هدف ماه"
                />

                <SummaryCard
                  title="نرخ تحقق"
                  value={formatDecimal(overall.achievement_rate ?? 0)}
                  suffix="٪"
                  icon={<CheckCircle2 size={21} />}
                  description={`${formatNumber(overall.loaded_order_count)} سفارش بارگیری‌شده`}
                />
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  عملکرد مناطق
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  محاسبه بر اساس تاریخ واقعی بارگیری تأییدشده
                </p>
              </div>
            </div>

            {result.regions.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {result.regions.map((row) => (
                  <RegionCard key={row.region_id} row={row} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <MapPin
                  size={28}
                  className="mx-auto text-slate-300"
                />
                <p className="mt-4 font-bold text-slate-600">
                  منطقه‌ای برای این مدیر ثبت نشده است.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Truck
                className="mt-0.5 shrink-0 text-blue-600"
                size={18}
              />
              <div>
                <p className="text-sm font-black text-slate-800">
                  مبنای محاسبه
                </p>
                <p className="mt-1 text-xs leading-6 text-slate-600">
                  فقط آیتم‌های بارنامه‌ای که وضعیت بارنامه آن‌ها «بارگیری تأییدشده» و وضعیت بارگیری آن‌ها «تأییدشده» است در تحقق ماه لحاظ می‌شوند. تاریخ مبنای گزارش، تاریخ واقعی بارگیری است.
                </p>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}


export default function RegionalPlanPage() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <RegionalPlanContent />
    </QueryClientProvider>
  );
}

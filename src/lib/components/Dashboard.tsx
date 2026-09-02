"use client";

import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Bell,
  Box,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  FileText,
  Phone,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Truck,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import MonthlyTargetSummary from "@/src/lib/components/dashboard/MonthlyTargetSummary";
import { useDashboard } from "@/src/lib/hooks/useDashboard";
import { waybillsService } from "@/src/lib/services/waybills";
import type { Waybill } from "@/src/lib/types/waybill";
import { formatJalaliDateTime } from "@/src/lib/utils/jalali";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function formatTonnage(value: number): string {
  return `${new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
  }).format(value)} تن`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "بدون فعالیت";
  }

  try {
    return formatJalaliDateTime(value);
  } catch {
    return "بدون فعالیت";
  }
}

function getTodayGregorianDate(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCustomerTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    building_material_store: "مصالح‌فروشی",
    building_material_stores: "مصالح‌فروشی",
    contractor: "پیمانکار",
    contractor_company: "پیمانکار",
    employer: "کارفرما",
    employers: "کارفرما",
    plaster_worker: "گچ‌کار",
    plasterer: "گچ‌کار",
    plasterer_company: "گچ‌کار",
    distributor: "توزیع‌کننده",
    retailer: "خرده‌فروشی",
  };

  return labels[type] ?? type;
}

function getCityName(name?: string | null): string {
  if (!name) {
    return "نامشخص";
  }

  const cityNames: Record<string, string> = {
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

  return cityNames[name] ?? name;
}

function getInactivityLabel(days: number): string {
  if (days >= 9999) {
    return "بدون فعالیت قبلی";
  }

  if (days <= 0) {
    return "فعال امروز";
  }

  return `${formatNumber(days)} روز`;
}

function getWaybillTonnage(waybill: Waybill): number {
  return (waybill.items ?? []).reduce((sum, item) => {
    const directTonnage = Number(item.tonnage ?? 0);

    if (directTonnage > 0) {
      return sum + directTonnage;
    }

    return (
      sum +
      (Number(item.quantity ?? 0) *
        Number(item.weight_kg_snapshot ?? 0)) /
        1000
    );
  }, 0);
}

function StatCard({
  title,
  value,
  description,
  icon,
  iconClass,
  valueClass = "text-slate-900",
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  iconClass: string;
  valueClass?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 transition group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">
            {title}
          </p>

          <p
            className={`mt-3 text-3xl font-black tracking-tight ${valueClass}`}
          >
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  href,
  hrefLabel,
  icon,
}: {
  title: string;
  description: string;
  href?: string;
  hrefLabel?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 sm:flex">
            {icon}
          </div>
        )}

        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      {href && hrefLabel && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 transition hover:text-blue-700"
        >
          {hrefLabel}
          <ArrowLeft size={15} />
        </Link>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
        {icon}
      </div>

      <p className="mt-4 font-bold text-slate-700">
        {title}
      </p>

      <p className="mt-1 text-xs leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="h-4 w-28 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-3 w-20 animate-pulse rounded-lg bg-slate-100" />
        </div>

        <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const {
    data,
    loading,
    error,
    refresh,
  } = useDashboard();

  const [waybills, setWaybills] = useState<Waybill[]>([]);
  const [waybillsLoading, setWaybillsLoading] =
    useState(true);
  const [waybillsError, setWaybillsError] =
    useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] =
    useState(false);

  const loadWaybills = useCallback(
    async () => {
      try {
        setWaybillsLoading(true);
        setWaybillsError(null);

        const result =
          await waybillsService.getAll();

        setWaybills(result);
      } catch (err) {
        console.error(
          "DASHBOARD WAYBILLS LOAD ERROR:",
          err
        );

        setWaybillsError(
          err instanceof Error
            ? err.message
            : "خطا در دریافت اطلاعات حواله‌ها."
        );
      } finally {
        setWaybillsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadWaybills();
  }, [loadWaybills]);

  async function handleRefreshAll() {
    try {
      setRefreshingAll(true);

      await Promise.all([
        refresh(),
        loadWaybills(),
      ]);
    } finally {
      setRefreshingAll(false);
    }
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="mx-auto max-w-[1600px] space-y-6"
      >
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 animate-pulse bg-slate-200" />

          <div className="p-6 md:p-8">
            <div className="h-6 w-36 animate-pulse rounded-full bg-slate-200" />

            <div className="mt-5 h-10 w-80 max-w-full animate-pulse rounded-xl bg-slate-200" />

            <div className="mt-3 h-5 w-[520px] max-w-full animate-pulse rounded-xl bg-slate-100" />

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="h-11 w-32 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-11 w-40 animate-pulse rounded-xl bg-slate-200" />
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map(
            (_, index) => (
              <SkeletonCard key={index} />
            )
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map(
            (_, index) => (
              <SkeletonCard key={index} />
            )
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="h-[390px] animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-[390px] animate-pulse rounded-3xl bg-slate-100" />
        </section>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main
        dir="rtl"
        className="mx-auto max-w-[1600px]"
      >
        <section className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm">
          <div className="h-1.5 bg-red-500" />

          <div className="p-7 md:p-9">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Activity size={24} />
            </div>

            <h1 className="mt-5 text-2xl font-black text-slate-900">
              خطا در دریافت اطلاعات داشبورد
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-7 text-red-600">
              {error ??
                "اطلاعات داشبورد در دسترس نیست."}
            </p>

            <button
              type="button"
              onClick={() =>
                void handleRefreshAll()
              }
              disabled={refreshingAll}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={
                  refreshingAll
                    ? "animate-spin"
                    : ""
                }
              />
              تلاش مجدد
            </button>
          </div>
        </section>
      </main>
    );
  }

  const {
    stats,
    recentActivities,
    recommendedCustomers,
  } = data;

  const todayKey =
    getTodayGregorianDate();

  const waybillsCount =
    waybills.length;

  const issuedWaybillsCount =
    waybills.filter(
      (waybill) =>
        waybill.status === "issued"
    ).length;

  const loadingConfirmedWaybillsCount =
    waybills.filter(
      (waybill) =>
        waybill.status ===
        "loading_confirmed"
    ).length;

  const cancelledWaybillsCount =
    waybills.filter(
      (waybill) =>
        waybill.status ===
        "cancelled"
    ).length;

  const draftWaybillsCount =
    waybills.filter(
      (waybill) =>
        waybill.status === "draft"
    ).length;

  const pendingLoadingCount =
    waybills.filter(
      (waybill) =>
        waybill.status === "issued" &&
        waybill.loading?.status ===
          "pending"
    ).length;

  const loadingConfirmedTonnage =
    waybills
      .filter(
        (waybill) =>
          waybill.status ===
          "loading_confirmed"
      )
      .reduce(
        (total, waybill) =>
          total +
          getWaybillTonnage(waybill),
        0
      );

  /* ============================================================
   * TODAY OPERATIONAL KPIs
   * ============================================================ */

  const todayWaybills =
    waybills.filter(
      (waybill) =>
        waybill.waybill_date ===
        todayKey
    );

  const todayWaybillsCount =
    todayWaybills.length;

  const todayIssuedWaybillsCount =
    todayWaybills.filter(
      (waybill) =>
        waybill.status === "issued"
    ).length;

  const todayLoadingConfirmedWaybills =
    todayWaybills.filter(
      (waybill) =>
        waybill.status ===
        "loading_confirmed"
    );

  const todayLoadingConfirmedCount =
    todayLoadingConfirmedWaybills.length;

  const todayCancelledWaybillsCount =
    todayWaybills.filter(
      (waybill) =>
        waybill.status ===
        "cancelled"
    ).length;

  const todayLoadingTonnage =
    todayLoadingConfirmedWaybills.reduce(
      (total, waybill) =>
        total +
        getWaybillTonnage(waybill),
      0
    );

  return (
    <main
      dir="rtl"
      className="mx-auto max-w-[1600px] space-y-6"
    >
      {/* ===================================================== */}
      {/* HERO */}
      {/* ===================================================== */}

      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500" />

        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-100/50 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-emerald-100/40 blur-3xl" />

        <div className="relative flex flex-col gap-7 p-6 md:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>

              سیستم فروش فعال
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-lg">
                <Sparkles size={21} />
              </div>

              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-4xl">
                  داشبورد CRM گچ آهوان
                </h1>

                <p className="mt-2 text-sm leading-7 text-slate-500 md:text-base">
                  مدیریت مشتریان، سفارش‌ها، تماس‌ها،
                  پیگیری‌ها و عملیات حواله در یک نگاه
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                void handleRefreshAll()
              }
              disabled={refreshingAll}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={
                  refreshingAll
                    ? "animate-spin"
                    : ""
                }
              />
              به‌روزرسانی
            </button>

            <Link
              href="/orders/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-200 transition hover:-translate-y-0.5 hover:bg-blue-600"
            >
              <Plus size={18} />
              ثبت سفارش جدید
            </Link>
          </div>
        </div>
      </section>

      {/* ===================================================== */}
      {/* SALES KPI */}
      {/* ===================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="تعداد مشتریان"
          value={formatNumber(
            stats.customersCount
          )}
          description="مشتریان فعال"
          icon={<Users size={22} />}
          iconClass="bg-blue-50 text-blue-700"
        />

        <StatCard
          title="تعداد سفارش‌ها"
          value={formatNumber(
            stats.ordersCount
          )}
          description="سفارش‌های تأییدشده"
          icon={<Box size={22} />}
          iconClass="bg-violet-50 text-violet-700"
        />

        <StatCard
          title="تناژ فروش"
          value={formatTonnage(
            stats.totalTonnage
          )}
          description="مجموع فروش ثبت‌شده"
          icon={
            <TrendingUp size={22} />
          }
          iconClass="bg-emerald-50 text-emerald-700"
          valueClass="text-emerald-700"
        />

        <StatCard
          title="تماس‌های امروز"
          value={formatNumber(
            stats.todayCallsCount
          )}
          description="تماس ثبت‌شده امروز"
          icon={<Phone size={22} />}
          iconClass="bg-sky-50 text-sky-700"
          valueClass="text-sky-700"
        />

        <StatCard
          title="پیگیری‌های امروز"
          value={formatNumber(
            stats.todayFollowUpsCount
          )}
          description="پیگیری‌های در انتظار امروز"
          icon={<Bell size={22} />}
          iconClass="bg-amber-50 text-amber-700"
          valueClass="text-amber-700"
        />
      </section>

      {/* ===================================================== */}
      {/* MONTHLY TARGET */}
      {/* ===================================================== */}

      <MonthlyTargetSummary />

      {/* ===================================================== */}
      {/* TODAY OPERATIONAL KPI */}
      {/* ===================================================== */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 md:p-7">
          <SectionHeader
            title="عملیات امروز"
            description="وضعیت واقعی حواله‌ها و بارگیری‌های مربوط به امروز"
            href="/waybills"
            hrefLabel="مدیریت حواله‌ها"
            icon={<Truck size={19} />}
          />

          {waybillsError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <XCircle size={18} />
                </div>

                <div>
                  <p className="font-black text-red-800">
                    خطا در دریافت اطلاعات عملیات
                  </p>

                  <p className="mt-1 text-sm leading-6 text-red-600">
                    {waybillsError}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard
                  title="حواله‌های امروز"
                  value={
                    waybillsLoading
                      ? "..."
                      : formatNumber(
                          todayWaybillsCount
                        )
                  }
                  description="حواله صادرشده یا ثبت‌شده امروز"
                  icon={
                    <FileText size={22} />
                  }
                  iconClass="bg-slate-100 text-slate-700"
                />

                <StatCard
                  title="در انتظار بارگیری"
                  value={
                    waybillsLoading
                      ? "..."
                      : formatNumber(
                          pendingLoadingCount
                        )
                  }
                  description="حواله صادر شده و هنوز بارگیری نشده"
                  icon={
                    <Clock3 size={22} />
                  }
                  iconClass="bg-amber-50 text-amber-700"
                  valueClass="text-amber-700"
                />

                <StatCard
                  title="حواله صادرشده امروز"
                  value={
                    waybillsLoading
                      ? "..."
                      : formatNumber(
                          todayIssuedWaybillsCount
                        )
                  }
                  description="وضعیت صادرشده"
                  icon={<Truck size={22} />}
                  iconClass="bg-blue-50 text-blue-700"
                  valueClass="text-blue-700"
                />

                <StatCard
                  title="بارگیری تأییدشده امروز"
                  value={
                    waybillsLoading
                      ? "..."
                      : formatNumber(
                          todayLoadingConfirmedCount
                        )
                  }
                  description="بارگیری نهایی امروز"
                  icon={
                    <CheckCircle2
                      size={22}
                    />
                  }
                  iconClass="bg-emerald-50 text-emerald-700"
                  valueClass="text-emerald-700"
                />

                <StatCard
                  title="تناژ بارگیری امروز"
                  value={
                    waybillsLoading
                      ? "..."
                      : formatTonnage(
                          todayLoadingTonnage
                        )
                  }
                  description="تناژ نهایی بارگیری‌شده امروز"
                  icon={
                    <TrendingUp size={22} />
                  }
                  iconClass="bg-violet-50 text-violet-700"
                  valueClass="text-violet-700"
                />
              </div>

              {!waybillsLoading && (
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-400">
                      کل حواله‌های فعال
                    </p>

                    <p className="mt-2 text-2xl font-black text-slate-900">
                      {formatNumber(
                        waybillsCount -
                          cancelledWaybillsCount
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      بدون احتساب حواله‌های لغوشده
                    </p>
                  </div>

                  <div className="rounded-2xl bg-red-50 p-4">
                    <p className="text-xs font-bold text-red-500">
                      لغوشده امروز
                    </p>

                    <p className="mt-2 text-2xl font-black text-red-700">
                      {formatNumber(
                        todayCancelledWaybillsCount
                      )}
                    </p>

                    <p className="mt-1 text-xs text-red-500">
                      حواله‌های لغوشده در امروز
                    </p>
                  </div>

                  <div className="rounded-2xl bg-blue-50 p-4">
                    <p className="text-xs font-bold text-blue-500">
                      تاریخ مبنای عملیات
                    </p>

                    <p className="mt-2 text-base font-black text-blue-800">
                      {formatDate(
                        `${todayKey}T00:00:00`
                      )}
                    </p>

                    <p className="mt-1 text-xs text-blue-500">
                      بر اساس تاریخ روز جاری سیستم
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ===================================================== */}
      {/* WAYBILL OVERALL STATUS */}
      {/* ===================================================== */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 md:p-7">
          <SectionHeader
            title="وضعیت کلی حواله‌ها"
            description="نمایش وضعیت فعلی چرخه صدور تا بارگیری"
            href="/waybills"
            hrefLabel="فهرست کامل حواله‌ها"
            icon={<FileText size={19} />}
          />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <OverviewItem
              title="کل حواله‌ها"
              value={
                waybillsLoading
                  ? "..."
                  : formatNumber(
                      waybillsCount
                    )
              }
              description="همه حواله‌های فعال"
              icon={
                <FileText size={20} />
              }
              iconClass="bg-slate-100 text-slate-700"
            />

            <OverviewItem
              title="پیش‌نویس"
              value={
                waybillsLoading
                  ? "..."
                  : formatNumber(
                      draftWaybillsCount
                    )
              }
              description="هنوز صادر نشده"
              icon={
                <FileText size={20} />
              }
              iconClass="bg-amber-50 text-amber-700"
            />

            <OverviewItem
              title="صادرشده"
              value={
                waybillsLoading
                  ? "..."
                  : formatNumber(
                      issuedWaybillsCount
                    )
              }
              description="در انتظار بارگیری"
              icon={<Truck size={20} />}
              iconClass="bg-blue-50 text-blue-700"
            />

            <OverviewItem
              title="بارگیری تأییدشده"
              value={
                waybillsLoading
                  ? "..."
                  : formatNumber(
                      loadingConfirmedWaybillsCount
                    )
              }
              description="بارگیری نهایی"
              icon={
                <CheckCircle2
                  size={20}
                />
              }
              iconClass="bg-emerald-50 text-emerald-700"
            />

            <OverviewItem
              title="لغوشده"
              value={
                waybillsLoading
                  ? "..."
                  : formatNumber(
                      cancelledWaybillsCount
                    )
              }
              description="حواله‌های لغوشده"
              icon={<XCircle size={20} />}
              iconClass="bg-red-50 text-red-700"
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <OverviewItem
              title="تناژ بارگیری‌شده"
              value={
                waybillsLoading
                  ? "..."
                  : formatTonnage(
                      loadingConfirmedTonnage
                    )
              }
              description="مجموع تناژ حواله‌های بارگیری‌شده"
              icon={<Truck size={20} />}
              iconClass="bg-violet-50 text-violet-700"
            />

            <OverviewItem
              title="حواله آماده بارگیری"
              value={
                waybillsLoading
                  ? "..."
                  : formatNumber(
                      pendingLoadingCount
                    )
              }
              description="وضعیت صادرشده با بارگیری در انتظار"
              icon={<Clock3 size={20} />}
              iconClass="bg-amber-50 text-amber-700"
            />
          </div>
        </div>
      </section>

      {/* ===================================================== */}
      {/* QUICK ACTIONS */}
      {/* ===================================================== */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
        <SectionHeader
          title="دسترسی سریع"
          description="پرکاربردترین عملیات فروش و مدیریت مشتری"
          icon={<Target size={19} />}
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
          <QuickAction
            href="/orders/new"
            title="ثبت سفارش"
            description="ایجاد سفارش جدید"
            icon={<Plus size={20} />}
            className="bg-slate-900 text-white"
            descriptionClass="text-slate-300"
          />

          <QuickAction
            href="/orders"
            title="سفارش‌ها"
            description="مدیریت سفارش‌ها"
            icon={<Box size={20} />}
            className="bg-violet-50 text-violet-700"
          />

          <QuickAction
            href="/waybills"
            title="حواله‌ها"
            description="مدیریت ارسال و بارگیری"
            icon={<Truck size={20} />}
            className="bg-blue-50 text-blue-700"
          />

          <QuickAction
            href="/customers"
            title="مشتریان"
            description="جستجو و مدیریت مشتریان"
            icon={<Users size={20} />}
            className="bg-sky-50 text-sky-700"
          />

          <QuickAction
            href="/activities/calls/new"
            title="ثبت تماس"
            description="ثبت تماس با مشتری"
            icon={<Phone size={20} />}
            className="bg-cyan-50 text-cyan-700"
          />

          <QuickAction
            href="/activities/follow-ups/new"
            title="ثبت پیگیری"
            description="ایجاد پیگیری جدید"
            icon={
              <CalendarClock size={20} />
            }
            className="bg-emerald-50 text-emerald-700"
          />

          <QuickAction
            href="/activities"
            title="فعالیت‌ها"
            description="تماس و پیگیری"
            icon={<Activity size={20} />}
            className="bg-amber-50 text-amber-700"
          />
        </div>
      </section>

      {/* ===================================================== */}
      {/* RECENT + RECOMMENDED */}
      {/* ===================================================== */}

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6 md:p-7">
            <SectionHeader
              title="آخرین فعالیت‌ها"
              description="مشتریانی که اخیراً فعالیت داشته‌اند"
              href="/activities"
              hrefLabel="مشاهده همه"
              icon={<Activity size={19} />}
            />

            {recentActivities.length ===
            0 ? (
              <EmptyState
                icon={
                  <Activity size={24} />
                }
                title="هنوز فعالیتی ثبت نشده است"
                description="با ثبت تماس یا پیگیری، فعالیت مشتریان در این بخش نمایش داده می‌شود."
              />
            ) : (
              <div className="space-y-3">
                {recentActivities.map(
                  (activity) => (
                    <Link
                      key={
                        activity.customer_id
                      }
                      href={`/customers/${activity.customer_id}`}
                      className="group block rounded-2xl border border-slate-100 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-100 hover:bg-blue-50/30 hover:shadow-sm"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-700 transition group-hover:bg-blue-100 group-hover:text-blue-700">
                            {activity.customer_name?.charAt(
                              0
                            ) || "م"}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-black text-slate-800">
                              {
                                activity.customer_name
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              آخرین فعالیت:{" "}
                              {formatDate(
                                activity.last_activity_at
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 font-bold text-blue-700">
                            سفارش{" "}
                            {formatNumber(
                              activity.order_count
                            )}
                          </span>

                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">
                            تماس{" "}
                            {formatNumber(
                              activity.call_count
                            )}
                          </span>

                          <span className="rounded-full bg-violet-50 px-2.5 py-1 font-bold text-violet-700">
                            پیگیری{" "}
                            {formatNumber(
                              activity.follow_up_count
                            )}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6 md:p-7">
            <SectionHeader
              title="مشتریان پیشنهادی برای تماس"
              description="مشتریانی که به توجه بیشتری نیاز دارند"
              href="/customers"
              hrefLabel="همه مشتریان"
              icon={<Users size={19} />}
            />

            {recommendedCustomers.length ===
            0 ? (
              <EmptyState
                icon={
                  <CheckCircle2 size={24} />
                }
                title="موردی برای پیگیری فوری وجود ندارد"
                description="در حال حاضر مشتری پیشنهادی برای تماس ندارید."
              />
            ) : (
              <div className="space-y-3">
                {recommendedCustomers.map(
                  (customer, index) => (
                    <div
                      key={customer.id}
                      className="rounded-2xl border border-slate-100 p-4 transition-all duration-200 hover:border-slate-200 hover:shadow-sm"
                    >
                      <div className="flex flex-col gap-4">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="flex min-w-0 items-start gap-3"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white">
                            {formatNumber(
                              index + 1
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-black text-slate-900">
                                {customer.name}
                              </p>

                              {customer.is_vip && (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                                  VIP
                                </span>
                              )}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                              <span>
                                شهر:{" "}
                                {getCityName(
                                  customer.city?.name
                                )}
                              </span>

                              <span>
                                نوع:{" "}
                                {getCustomerTypeLabel(
                                  customer.customer_type
                                )}
                              </span>

                              <span>
                                وضعیت:{" "}
                                {getInactivityLabel(
                                  customer.inactivity_days
                                )}
                              </span>
                            </div>

                            <div className="mt-2 text-xs font-medium text-slate-500">
                              تناژ کل:{" "}
                              {formatTonnage(
                                Number(
                                  customer.lifetime_tonnage
                                )
                              )}
                            </div>
                          </div>

                          <ChevronLeft
                            size={18}
                            className="mt-1 shrink-0 text-slate-300"
                          />
                        </Link>

                        <div className="grid grid-cols-2 gap-2">
                          <Link
                            href={`/activities/calls/new?customerId=${customer.id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700"
                          >
                            <Phone size={15} />
                            ثبت تماس
                          </Link>

                          <Link
                            href={`/activities/follow-ups/new?customerId=${customer.id}`}
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
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===================================================== */}
      {/* TODAY */}
      {/* ===================================================== */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 md:p-7">
          <SectionHeader
            title="فعالیت امروز"
            description="خلاصه عملکرد امروز تیم فروش"
            href="/activities"
            hrefLabel="مدیریت فعالیت‌ها"
            icon={<Clock3 size={19} />}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/activities/calls"
              className="group rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-blue-900">
                    تماس‌های امروز
                  </p>

                  <p className="mt-3 text-4xl font-black text-blue-600">
                    {formatNumber(
                      stats.todayCallsCount
                    )}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    تماس ثبت‌شده امروز
                  </p>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                  <Phone size={23} />
                </div>
              </div>

              <div className="mt-6 flex items-center gap-1 text-xs font-bold text-blue-700">
                مشاهده تماس‌ها
                <ArrowLeft size={14} />
              </div>
            </Link>

            <Link
              href="/activities/follow-ups"
              className="group rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-emerald-900">
                    پیگیری‌های امروز
                  </p>

                  <p className="mt-3 text-4xl font-black text-emerald-600">
                    {formatNumber(
                      stats.todayFollowUpsCount
                    )}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    پیگیری‌های در انتظار امروز
                  </p>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                  <CalendarClock size={23} />
                </div>
              </div>

              <div className="mt-6 flex items-center gap-1 text-xs font-bold text-emerald-700">
                مشاهده پیگیری‌ها
                <ArrowLeft size={14} />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ===================================================== */}
      {/* SALES OVERVIEW */}
      {/* ===================================================== */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 md:p-7">
          <SectionHeader
            title="نمای کلی فروش و عملیات"
            description="شاخص‌های اصلی فعلی CRM"
            icon={
              <TrendingUp size={19} />
            }
          />

          <div className="grid gap-4 md:grid-cols-3">
            <OverviewItem
              title="مشتریان فعال"
              value={formatNumber(
                stats.customersCount
              )}
              description="مشتری در سیستم"
              icon={<Users size={20} />}
              iconClass="bg-blue-50 text-blue-700"
            />

            <OverviewItem
              title="سفارش‌های تأییدشده"
              value={formatNumber(
                stats.ordersCount
              )}
              description="سفارش ثبت‌شده"
              icon={<Box size={20} />}
              iconClass="bg-violet-50 text-violet-700"
            />

            <OverviewItem
              title="تناژ فروش"
              value={formatTonnage(
                stats.totalTonnage
              )}
              description="مجموع تناژ فروش"
              icon={
                <TrendingUp size={20} />
              }
              iconClass="bg-emerald-50 text-emerald-700"
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <OverviewItem
              title="حواله‌های امروز"
              value={
                waybillsLoading
                  ? "..."
                  : formatNumber(
                      todayWaybillsCount
                    )
              }
              description="حواله ثبت‌شده امروز"
              icon={
                <FileText size={20} />
              }
              iconClass="bg-slate-100 text-slate-700"
            />

            <OverviewItem
              title="بارگیری امروز"
              value={
                waybillsLoading
                  ? "..."
                  : formatNumber(
                      todayLoadingConfirmedCount
                    )
              }
              description="بارگیری تأییدشده"
              icon={
                <CheckCircle2
                  size={20}
                />
              }
              iconClass="bg-emerald-50 text-emerald-700"
            />

            <OverviewItem
              title="تناژ بارگیری امروز"
              value={
                waybillsLoading
                  ? "..."
                  : formatTonnage(
                      todayLoadingTonnage
                    )
              }
              description="تناژ نهایی امروز"
              icon={<Truck size={20} />}
              iconClass="bg-blue-50 text-blue-700"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon,
  className,
  descriptionClass = "text-slate-500",
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  className: string;
  descriptionClass?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-md"
    >
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${className}`}
      >
        {icon}
      </div>

      <h3 className="font-black text-slate-900">
        {title}
      </h3>

      <p
        className={`mt-1 text-xs leading-6 ${descriptionClass}`}
      >
        {description}
      </p>
    </Link>
  );
}

function OverviewItem({
  title,
  value,
  description,
  icon,
  iconClass,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
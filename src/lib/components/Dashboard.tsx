"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { toJalaali } from "jalaali-js";

import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  PackageCheck,
  Phone,
  Plus,
  RefreshCw,
  Target,
  Truck,
  Users,
  XCircle,
} from "lucide-react";

import MonthlyTargetSummary from "@/src/lib/components/dashboard/MonthlyTargetSummary";
import AIRecommendations from "@/src/lib/components/dashboard/AIRecommendations";
import { useDashboard } from "@/src/lib/hooks/useDashboard";

type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  href?: string;
};

type SectionHeaderProps = {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
};

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description?: string;
};

type QuickActionProps = {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
};

type OverviewItemProps = {
  label: string;
  value: string;
  href?: string;
  icon: ReactNode;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function formatTonnage(value: number): string {
  return `${new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 1,
  }).format(value)} تن`;
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const { jy, jm, jd } = toJalaali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );

  return `${new Intl.NumberFormat("fa-IR").format(jy)}/${String(jm).padStart(
    2,
    "0",
  )}/${String(jd).padStart(2, "0")}`;
}

function getTodayGregorianDate(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  href,
}: StatCardProps) {
  const content = (
    <div className="group flex h-full items-start justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:p-6">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{title}</p>

        <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
          {value}
        </div>

        {subtitle ? (
          <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
        ) : null}
      </div>

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white">
        {icon}
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}

function SectionHeader({
  title,
  description,
  href,
  linkLabel = "مشاهده همه",
}: SectionHeaderProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>

        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>

      {href ? (
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-700 transition hover:text-slate-950"
        >
          {linkLabel}
          <ArrowLeft className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        {icon}
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-800">{title}</h3>

      {description ? (
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="h-32 animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-4 w-28 rounded bg-slate-200" />
      <div className="mt-4 h-8 w-20 rounded bg-slate-200" />
      <div className="mt-2 h-3 w-36 rounded bg-slate-100" />
    </div>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon,
}: QuickActionProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-extrabold text-slate-900">
          {title}
        </div>

        <div className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </div>
      </div>

      <ArrowLeft className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:-translate-x-0.5 group-hover:text-slate-800" />
    </Link>
  );
}

function OverviewItem({
  label,
  value,
  href,
  icon,
}: OverviewItemProps) {
  const content = (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </div>

        <span className="truncate text-sm font-medium text-slate-600">
          {label}
        </span>
      </div>

      <span className="shrink-0 text-base font-extrabold text-slate-900">
        {value}
      </span>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

export default function Dashboard() {
  const {
    data,
    loading,
    error,
    refresh,
  } = useDashboard();

  const todayKey = useMemo(() => getTodayGregorianDate(), []);

  const stats = data?.stats;

  const recentActivities =
    data?.recentActivities ?? [];

  const todayDateLabel = formatDate(
    `${todayKey}T00:00:00`,
  );

  const totalWaybillTonnage =
    stats?.loadingConfirmedTonnage ?? 0;

  const waybillTotal =
    stats?.waybillsCount ?? 0;

  const issuedWaybills =
    stats?.issuedWaybillsCount ?? 0;

  const loadingConfirmedWaybills =
    stats?.loadingConfirmedWaybillsCount ?? 0;

  const cancelledWaybills =
    stats?.cancelledWaybillsCount ?? 0;

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="h-8 w-64 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-100" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonCard key={`skeleton-${index}`} />
          ))}
        </div>

        <div className="h-56 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />

        <div className="h-96 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-red-500 shadow-sm">
            <XCircle className="h-6 w-6" />
          </div>

          <h2 className="mt-4 text-base font-extrabold text-red-900">
            دریافت اطلاعات داشبورد انجام نشد
          </h2>

          <p className="mt-2 text-sm text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={() => {
              void refresh();
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4" />
            تلاش مجدد
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="absolute inset-y-0 left-0 hidden w-1/3 bg-gradient-to-r from-slate-50 to-transparent md:block" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
                <CalendarDays className="h-4 w-4" />
                امروز {todayDateLabel}
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
                داشبورد فروش
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
                نمای کلی عملکرد فروش، سفارش‌ها، حواله‌ها و فعالیت‌های امروز.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/orders/new"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                ثبت سفارش
              </Link>

              <Link
                href="/customers"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
              >
                <Users className="h-4 w-4" />
                مشتریان
              </Link>

              <button
                type="button"
                onClick={() => {
                  void refresh();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                بروزرسانی
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Sales KPI */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="مشتریان فعال"
          value={formatNumber(stats?.customersCount ?? 0)}
          subtitle="مشتریان فعال CRM"
          icon={<Users className="h-5 w-5" />}
          href="/customers"
        />

        <StatCard
          title="سفارش‌ها"
          value={formatNumber(stats?.ordersCount ?? 0)}
          subtitle="سفارش‌های تأییدشده"
          icon={<ClipboardList className="h-5 w-5" />}
          href="/orders"
        />

        <StatCard
          title="تناژ فروش"
          value={formatTonnage(stats?.totalTonnage ?? 0)}
          subtitle="مجموع تناژ سفارش‌های تأییدشده"
          icon={<PackageCheck className="h-5 w-5" />}
          href="/reports"
        />

        <StatCard
          title="تماس امروز"
          value={formatNumber(stats?.todayCallsCount ?? 0)}
          subtitle="تماس‌های ثبت‌شده امروز"
          icon={<Phone className="h-5 w-5" />}
          href="/activities"
        />

        <StatCard
          title="پیگیری امروز"
          value={formatNumber(stats?.todayFollowUpsCount ?? 0)}
          subtitle="پیگیری‌های ثبت‌شده امروز"
          icon={<Clock3 className="h-5 w-5" />}
          href="/activities"
        />
      </section>

      {/* Monthly Target */}
      <MonthlyTargetSummary />

      {/* AI Recommendations */}
      <AIRecommendations />

      {/* Today's Operational KPI */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 md:p-7">
          <SectionHeader
            title="عملیات امروز"
            description="وضعیت فعالیت‌ها و عملیات فروش در امروز"
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <OverviewItem
              label="تماس‌های امروز"
              value={formatNumber(stats?.todayCallsCount ?? 0)}
              icon={<Phone className="h-5 w-5" />}
              href="/activities"
            />

            <OverviewItem
              label="پیگیری‌های امروز"
              value={formatNumber(stats?.todayFollowUpsCount ?? 0)}
              icon={<Clock3 className="h-5 w-5" />}
              href="/activities"
            />

            <OverviewItem
              label="حواله‌های صادرشده"
              value={formatNumber(issuedWaybills)}
              icon={<FileText className="h-5 w-5" />}
              href="/waybills"
            />

            <OverviewItem
              label="بارگیری تأییدشده"
              value={formatNumber(loadingConfirmedWaybills)}
              icon={<CheckCircle2 className="h-5 w-5" />}
              href="/waybills"
            />
          </div>
        </div>
      </section>

      {/* Waybill Overall Status */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 md:p-7">
          <SectionHeader
            title="وضعیت کلی حواله‌ها"
            description="نمای کلی گردش حواله‌های ثبت‌شده در سیستم"
            href="/waybills"
            linkLabel="مشاهده حواله‌ها"
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-500">
                    کل حواله‌ها
                  </div>

                  <div className="mt-2 text-2xl font-extrabold text-slate-900">
                    {formatNumber(waybillTotal)}
                  </div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm">
                  <FileText className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-amber-700">
                    صادرشده
                  </div>

                  <div className="mt-2 text-2xl font-extrabold text-amber-900">
                    {formatNumber(issuedWaybills)}
                  </div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
                  <Truck className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-emerald-700">
                    بارگیری تأییدشده
                  </div>

                  <div className="mt-2 text-2xl font-extrabold text-emerald-900">
                    {formatNumber(loadingConfirmedWaybills)}
                  </div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-red-700">
                    لغوشده
                  </div>

                  <div className="mt-2 text-2xl font-extrabold text-red-900">
                    {formatNumber(cancelledWaybills)}
                  </div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-red-600 shadow-sm">
                  <XCircle className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                <PackageCheck className="h-5 w-5" />
              </div>

              <div>
                <div className="text-sm font-bold text-slate-800">
                  تناژ بارگیری تأییدشده
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  مجموع تناژ حواله‌هایی که بارگیری آن‌ها تأیید شده است
                </div>
              </div>
            </div>

            <div className="text-xl font-extrabold text-slate-900">
              {formatTonnage(totalWaybillTonnage)}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <SectionHeader
          title="دسترسی سریع"
          description="اقدام‌های پرتکرار فروش و عملیات"
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <QuickAction
            href="/customers"
            title="مدیریت مشتریان"
            description="جستجو، مشاهده و مدیریت مشتریان"
            icon={<Users className="h-5 w-5" />}
          />

          <QuickAction
            href="/orders/new"
            title="ثبت سفارش جدید"
            description="ثبت سریع سفارش برای مشتری"
            icon={<ClipboardList className="h-5 w-5" />}
          />

          <QuickAction
            href="/waybills"
            title="مدیریت حواله‌ها"
            description="صدور و پیگیری وضعیت حواله‌ها"
            icon={<Truck className="h-5 w-5" />}
          />

          <QuickAction
            href="/reports"
            title="گزارش‌های فروش"
            description="بررسی فروش و عملکرد ماهانه"
            icon={<Target className="h-5 w-5" />}
          />
        </div>
      </section>

      {/* Recent Activities */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 md:p-7">
          <SectionHeader
            title="آخرین فعالیت‌ها"
            description="مشتریانی که اخیراً فعالیت فروش یا ارتباطی داشته‌اند"
            href="/activities"
          />

          {recentActivities.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-5 w-5" />}
              title="فعالیتی ثبت نشده است"
              description="با ثبت سفارش، تماس یا پیگیری، این بخش تکمیل خواهد شد."
            />
          ) : (
            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
              {recentActivities.map(
                (activity, index) => (
                  <Link
                    key={`${activity.customer_id}-${index}`}
                    href={`/customers/${activity.customer_id}`}
                    className="flex flex-col gap-4 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Activity className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-900">
                            {activity.customer_name}
                          </span>

                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                            آخرین فعالیت
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>
                            سفارش:{" "}
                            {formatNumber(
                              activity.order_count,
                            )}
                          </span>

                          <span>
                            تماس:{" "}
                            {formatNumber(
                              activity.call_count,
                            )}
                          </span>

                          <span>
                            پیگیری:{" "}
                            {formatNumber(
                              activity.follow_up_count,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-xs font-medium text-slate-400">
                      {formatDate(
                        activity.last_activity_at,
                      )}
                    </div>
                  </Link>
                ),
              )}
            </div>
          )}
        </div>
      </section>

      {/* Today Activity / Sales Overview */}
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6 md:p-7">
            <SectionHeader
              title="فعالیت امروز"
              description="شاخص‌های عملیاتی مربوط به امروز"
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                    <Phone className="h-5 w-5" />
                  </div>

                  <span className="text-sm font-medium text-slate-600">
                    تماس‌های امروز
                  </span>
                </div>

                <span className="text-lg font-extrabold text-slate-900">
                  {formatNumber(
                    stats?.todayCallsCount ?? 0,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                    <Clock3 className="h-5 w-5" />
                  </div>

                  <span className="text-sm font-medium text-slate-600">
                    پیگیری‌های امروز
                  </span>
                </div>

                <span className="text-lg font-extrabold text-slate-900">
                  {formatNumber(
                    stats?.todayFollowUpsCount ?? 0,
                  )}
                </span>
              </div>
            </div>

            <div className="mt-5">
              <Link
                href="/activities"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                مدیریت فعالیت‌ها
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6 md:p-7">
            <SectionHeader
              title="نمای کلی فروش"
              description="اعداد کلیدی فروش فعلی سیستم"
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                    <Users className="h-5 w-5" />
                  </div>

                  <span className="text-sm font-medium text-slate-600">
                    مشتریان فعال
                  </span>
                </div>

                <span className="text-lg font-extrabold text-slate-900">
                  {formatNumber(
                    stats?.customersCount ?? 0,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                    <ClipboardList className="h-5 w-5" />
                  </div>

                  <span className="text-sm font-medium text-slate-600">
                    سفارش‌های تأییدشده
                  </span>
                </div>

                <span className="text-lg font-extrabold text-slate-900">
                  {formatNumber(
                    stats?.ordersCount ?? 0,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                    <PackageCheck className="h-5 w-5" />
                  </div>

                  <span className="text-sm font-medium text-slate-600">
                    مجموع تناژ
                  </span>
                </div>

                <span className="text-lg font-extrabold text-slate-900">
                  {formatTonnage(
                    stats?.totalTonnage ?? 0,
                  )}
                </span>
              </div>
            </div>

            <div className="mt-5">
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                مشاهده گزارش فروش
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
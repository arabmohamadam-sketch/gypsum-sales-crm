"use client";

import Link from "next/link";
import StatCard from "./StatCard";
import { useDashboard } from "@/src/lib/hooks/useDashboard";

function formatNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function formatTonnage(value: number) {
  return `${new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
  }).format(value)} تن`;
}

function formatDate(value: string | null) {
  if (!value) return "بدون فعالیت";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "بدون فعالیت";
  }

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getCustomerTypeLabel(type: string) {
  const labels: Record<string, string> = {
    مصالح_فروش: "مصالح‌فروش",
    مصالح_فروشی: "مصالح‌فروشی",
    پیمانکار: "پیمانکار",
    کارفرما: "کارفرما",
    گچکار: "گچکار",
    گچ_کار: "گچکار",
  };

  return labels[type] ?? type;
}

function StatSkeleton() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
      <div className="mt-4 h-8 w-20 animate-pulse rounded bg-gray-200" />
    </div>
  );
}

export default function Dashboard() {
  const { data, loading, error, refresh } = useDashboard();

  if (loading) {
    return (
      <div
        dir="rtl"
        className="mx-auto max-w-7xl"
      >
        <div className="mb-10">
          <div className="h-9 w-64 animate-pulse rounded bg-gray-200" />
          <div className="mt-3 h-5 w-96 max-w-full animate-pulse rounded bg-gray-200" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <StatSkeleton key={index} />
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-2xl border bg-gray-100" />
          <div className="h-72 animate-pulse rounded-2xl border bg-gray-100" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        dir="rtl"
        className="mx-auto max-w-7xl"
      >
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-bold text-red-700">
            خطا در دریافت اطلاعات داشبورد
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {error ?? "اطلاعات داشبورد در دسترس نیست."}
          </p>

          <button
            type="button"
            onClick={refresh}
            className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            تلاش مجدد
          </button>
        </div>
      </div>
    );
  }

  const {
    stats,
    recentActivities,
    recommendedCustomers,
  } = data;

  return (
    <div
      dir="rtl"
      className="mx-auto max-w-7xl"
    >
      {/* Header */}
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            داشبورد CRM گچ آهوان
          </h1>

          <p className="mt-2 text-gray-500">
            مدیریت مشتریان، سفارش‌ها، پیگیری‌ها و عملکرد فروش
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          className="w-fit rounded-xl border bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          بروزرسانی اطلاعات
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="تعداد مشتریان"
          value={formatNumber(stats.customersCount)}
        />

        <StatCard
          title="تعداد سفارش‌ها"
          value={formatNumber(stats.ordersCount)}
        />

        <StatCard
          title="تناژ فروش"
          value={formatTonnage(stats.totalTonnage)}
        />

        <StatCard
          title="تماس‌های امروز"
          value={formatNumber(stats.todayCallsCount)}
        />

        <StatCard
          title="پیگیری‌های امروز"
          value={formatNumber(stats.todayFollowUpsCount)}
        />
      </div>

      {/* Main Sections */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Recent Activities */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                آخرین فعالیت‌ها
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                آخرین وضعیت فعالیت مشتریان
              </p>
            </div>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
              {formatNumber(recentActivities.length)} مورد
            </span>
          </div>

          {recentActivities.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">
              هنوز فعالیتی ثبت نشده است.
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <Link
                  key={activity.customer_id}
                  href={`/customers/${activity.customer_id}`}
                  className="block rounded-xl border p-4 transition hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">
                        {activity.customer_name}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        آخرین فعالیت:{" "}
                        {formatDate(
                          activity.last_activity_at
                        )}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2 text-xs">
                      <span className="rounded-lg bg-blue-50 px-2 py-1 text-blue-700">
                        سفارش {formatNumber(activity.order_count)}
                      </span>

                      <span className="rounded-lg bg-green-50 px-2 py-1 text-green-700">
                        تماس {formatNumber(activity.call_count)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recommended Customers */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-gray-900">
              پیشنهاد تماس امروز
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              مشتریانی که برای پیگیری فروش در اولویت قرار گرفته‌اند
            </p>
          </div>

          {recommendedCustomers.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">
              مشتری پیشنهادی برای تماس وجود ندارد.
            </div>
          ) : (
            <div className="space-y-3">
              {recommendedCustomers.map((customer, index) => (
                <Link
                  key={customer.id}
                  href={`/customers/${customer.id}`}
                  className="block rounded-xl border p-4 transition hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-700">
                      {formatNumber(index + 1)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          {customer.name}
                        </p>

                        {customer.is_vip && (
                          <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
                            VIP
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>
                          شهر:{" "}
                          {customer.city?.name ??
                            "نامشخص"}
                        </span>

                        <span>
                          نوع:{" "}
                          {getCustomerTypeLabel(
                            customer.customer_type
                          )}
                        </span>

                        <span>
                          عدم فعالیت:{" "}
                          {formatNumber(
                            customer.inactivity_days
                          )}{" "}
                          روز
                        </span>
                      </div>
                    </div>

                    <div className="hidden text-left sm:block">
                      <p className="text-xs text-gray-500">
                        تناژ کل
                      </p>

                      <p className="mt-1 font-semibold text-gray-900">
                        {formatTonnage(
                          Number(
                            customer.lifetime_tonnage
                          )
                        )}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Sales Status */}
      <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-gray-900">
            وضعیت فعلی فروش
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            خلاصه وضعیت ثبت‌شده در دیتابیس
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-5">
            <p className="text-sm text-gray-500">
              مشتریان فعال
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {formatNumber(stats.customersCount)}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-5">
            <p className="text-sm text-gray-500">
              سفارش‌های ثبت‌شده
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {formatNumber(stats.ordersCount)}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-5">
            <p className="text-sm text-gray-500">
              مجموع تناژ
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {formatTonnage(stats.totalTonnage)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
"use client";

import Link from "next/link";
import CustomerTable from "@/src/lib/components/customers/CustomerTable";
import { useCustomers } from "@/src/lib/hooks/useCustomers";

const customerTypeLabels: Record<string, string> = {
  building_material_store: "مصالح‌فروشی",
  contractor: "پیمانکار",
  employer: "کارفرما",
  plasterer: "گچ‌کار",
  plaster_worker: "گچ‌کار",
};

const cityLabels: Record<string, string> = {
  Garmsar: "گرمسار",
  garmsar: "گرمسار",
  Semnan: "سمنان",
  semnan: "سمنان",
  Varamin: "ورامین",
  varamin: "ورامین",
};

export default function Page() {
  const {
    filteredCustomers,
    loading,
    error,
    search,
    setSearch,
    cityFilter,
    setCityFilter,
    typeFilter,
    setTypeFilter,
    vipFilter,
    setVipFilter,
    statusFilter,
    setStatusFilter,
    cities,
    customerTypes,
  } = useCustomers();

  const hasFilters =
    search ||
    cityFilter !== "all" ||
    typeFilter !== "all" ||
    vipFilter !== "all" ||
    statusFilter !== "all";

  function clearFilters() {
    setSearch("");
    setCityFilter("all");
    setTypeFilter("all");
    setVipFilter("all");
    setStatusFilter("all");
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 px-6 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            مشتریان
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            مدیریت و پیگیری مشتریان
          </p>
        </div>

        <Link
          href="/customers/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
        >
          <span className="text-lg leading-none">
            +
          </span>

          افزودن مشتری
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mx-6 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="font-bold text-slate-800">
            جستجو و فیلتر مشتریان
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            برای پیدا کردن سریع مشتری از فیلترهای زیر استفاده کنید.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* Search */}
          <div className="lg:col-span-1">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              جستجوی مشتری
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                🔎
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="نام یا شماره تماس..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-10 pl-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* City */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              شهر
            </label>

            <select
              value={cityFilter}
              onChange={(event) =>
                setCityFilter(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">
                همه شهرها
              </option>

              {cities.map((city) => (
                <option
                  key={city}
                  value={city}
                >
                  {cityLabels[city] ?? city}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              نوع مشتری
            </label>

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">
                همه انواع
              </option>

              {customerTypes.map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {customerTypeLabels[type] ?? type}
                </option>
              ))}
            </select>
          </div>

          {/* VIP */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              وضعیت VIP
            </label>

            <select
              value={vipFilter}
              onChange={(event) =>
                setVipFilter(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">
                همه مشتریان
              </option>

              <option value="vip">
                ⭐ فقط VIP
              </option>

              <option value="normal">
                مشتری عادی
              </option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              وضعیت مشتری
            </label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">
                همه وضعیت‌ها
              </option>

              <option value="active">
                🟢 فعال
              </option>

              <option value="inactive">
                🔴 غیرفعال
              </option>
            </select>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-5 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            تعداد مشتری نمایش داده‌شده:

            <span className="mr-2 font-bold text-slate-800">
              {filteredCustomers.length.toLocaleString(
                "fa-IR"
              )}
            </span>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              پاک کردن همه فیلترها
            </button>
          )}
        </div>
      </div>

      {/* Customer Table */}
      <CustomerTable
        customers={filteredCustomers}
        loading={loading}
      />
    </div>
  );
}
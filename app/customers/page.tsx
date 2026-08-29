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
  distributor: "توزیع‌کننده",
  retailer: "خرده‌فروشی",
};

const cityLabels: Record<string, string> = {
  Garmsar: "گرمسار",
  garmsar: "گرمسار",
  Semnan: "سمنان",
  semnan: "سمنان",
  Varamin: "ورامین",
  varamin: "ورامین",
  Chalous: "چالوس",
  Chalus: "چالوس",
  Kelardasht: "کلاردشت",
  kelardasht: "کلاردشت",
  Ramsar: "رامسر",
  ramsar: "رامسر",
  Tonekabon: "تنکابن",
  tonekabon: "تنکابن",
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
    Boolean(search.trim()) ||
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
    <div
      dir="rtl"
      className="mx-auto max-w-7xl space-y-6 p-4 md:p-6"
    >
      {/* =====================================================
          HEADER
          ===================================================== */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500" />

        <div className="absolute -left-20 -top-24 h-60 w-60 rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-60 w-60 rounded-full bg-emerald-100/40 blur-3xl" />

        <div className="relative flex flex-col gap-6 p-6 md:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-2xl text-white shadow-lg shadow-blue-100">
              👥
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                  مشتریان
                </h1>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                  CRM فروش
                </span>
              </div>

              <p className="mt-2 text-sm leading-7 text-slate-500 md:text-base">
                مدیریت، جستجو و پیگیری مشتریان گچ آهوان
              </p>
            </div>
          </div>

          <Link
            href="/customers/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 hover:shadow-md"
          >
            <span className="text-lg leading-none">+</span>
            افزودن مشتری
          </Link>
        </div>
      </section>

      {/* =====================================================
          ERROR
          ===================================================== */}
      {error && (
        <section className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
          <div className="h-1.5 bg-red-500" />

          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-red-800">
                خطا در دریافت اطلاعات مشتریان
              </p>

              <p className="mt-1 text-sm text-red-600">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
            >
              تلاش مجدد
            </button>
          </div>
        </section>
      )}

      {/* =====================================================
          FILTERS
          ===================================================== */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              جستجو و فیلتر مشتریان
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              با نام، شماره تماس، شهر، نوع مشتری و وضعیت VIP جستجو کنید.
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
            {filteredCustomers.length.toLocaleString("fa-IR")} مشتری
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {/* Search */}
          <div className="xl:col-span-1">
            <label
              htmlFor="customer-search"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              جستجوی مشتری
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-slate-400">
                🔎
              </span>

              <input
                id="customer-search"
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="نام یا شماره تماس..."
                autoComplete="off"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-10 pl-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>
          </div>

          {/* City */}
          <div>
            <label
              htmlFor="customer-city"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              شهر
            </label>

            <select
              id="customer-city"
              value={cityFilter}
              onChange={(event) =>
                setCityFilter(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
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

          {/* Type */}
          <div>
            <label
              htmlFor="customer-type"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              نوع مشتری
            </label>

            <select
              id="customer-type"
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
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
            <label
              htmlFor="customer-vip"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              وضعیت VIP
            </label>

            <select
              id="customer-vip"
              value={vipFilter}
              onChange={(event) =>
                setVipFilter(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            >
              <option value="all">
                همه مشتریان
              </option>

              <option value="vip">
                فقط VIP
              </option>

              <option value="normal">
                مشتری عادی
              </option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="customer-status"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              وضعیت مشتری
            </label>

            <select
              id="customer-status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
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
        <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>
              تعداد مشتریان نمایش داده‌شده:
            </span>

            <span className="rounded-full bg-blue-50 px-3 py-1 font-black text-blue-700">
              {filteredCustomers.length.toLocaleString("fa-IR")}
            </span>
          </div>

          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              پاک کردن فیلترها
            </button>
          ) : (
            <div className="text-xs text-slate-400">
              همه مشتریان نمایش داده می‌شوند
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          CUSTOMER TABLE
          ===================================================== */}
      <section>
        <CustomerTable
          customers={filteredCustomers}
          loading={loading}
        />
      </section>
    </div>
  );
}
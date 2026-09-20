"use client";

import Link from "next/link";

import CustomerTable from "@/src/lib/components/customers/CustomerTable";
import { useAuth } from "@/src/lib/auth/AuthProvider";
import { useCustomers } from "@/src/lib/hooks/useCustomers";

const customerTypeLabels: Record<string, string> = {
  building_material_store: "Ù…ØµØ§Ù„Ø­â€ŒÙØ±ÙˆØ´ÛŒ",
  contractor: "Ù¾ÛŒÙ…Ø§Ù†Ú©Ø§Ø±",
  employer: "Ú©Ø§Ø±ÙØ±Ù…Ø§",
  plasterer: "Ú¯Ú†â€ŒÚ©Ø§Ø±",
  plaster_worker: "Ú¯Ú†â€ŒÚ©Ø§Ø±",
  distributor: "ØªÙˆØ²ÛŒØ¹â€ŒÚ©Ù†Ù†Ø¯Ù‡",
  retailer: "Ø®Ø±Ø¯Ù‡â€ŒÙØ±ÙˆØ´ÛŒ",
};

const cityLabels: Record<string, string> = {
  Garmsar: "Ú¯Ø±Ù…Ø³Ø§Ø±",
  garmsar: "Ú¯Ø±Ù…Ø³Ø§Ø±",
  Semnan: "Ø³Ù…Ù†Ø§Ù†",
  semnan: "Ø³Ù…Ù†Ø§Ù†",
  Varamin: "ÙˆØ±Ø§Ù…ÛŒÙ†",
  varamin: "ÙˆØ±Ø§Ù…ÛŒÙ†",
  Chalous: "Ú†Ø§Ù„ÙˆØ³",
  Chalus: "Ú†Ø§Ù„ÙˆØ³",
  Kelardasht: "Ú©Ù„Ø§Ø±Ø¯Ø´Øª",
  kelardasht: "Ú©Ù„Ø§Ø±Ø¯Ø´Øª",
  Ramsar: "Ø±Ø§Ù…Ø³Ø±",
  ramsar: "Ø±Ø§Ù…Ø³Ø±",
  Tonekabon: "ØªÙ†Ú©Ø§Ø¨Ù†",
  tonekabon: "ØªÙ†Ú©Ø§Ø¨Ù†",
};

export default function Page() {
  const { company } = useAuth();
  const companyName =
    company?.branding.display_name?.trim() ||
    company?.name?.trim() ||
    "CRM مدیریت فروش";

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
              ðŸ‘¥
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                  Ù…Ø´ØªØ±ÛŒØ§Ù†
                </h1>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                  CRM ÙØ±ÙˆØ´
                </span>
              </div>

              <p className="mt-2 text-sm leading-7 text-slate-500 md:text-base">
                Ù…Ø¯ÛŒØ±ÛŒØªØŒ Ø¬Ø³ØªØ¬Ùˆ Ùˆ Ù¾ÛŒÚ¯ÛŒØ±ÛŒ Ù…Ø´ØªØ±ÛŒØ§Ù† Ú¯Ú† Ø¢Ù‡ÙˆØ§Ù†
              </p>
            </div>
          </div>

          <Link
            href="/customers/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 hover:shadow-md"
          >
            <span className="text-lg leading-none">+</span>
            Ø§ÙØ²ÙˆØ¯Ù† Ù…Ø´ØªØ±ÛŒ
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
                Ø®Ø·Ø§ Ø¯Ø± Ø¯Ø±ÛŒØ§ÙØª Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ù…Ø´ØªØ±ÛŒØ§Ù†
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
              ØªÙ„Ø§Ø´ Ù…Ø¬Ø¯Ø¯
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
              Ø¬Ø³ØªØ¬Ùˆ Ùˆ ÙÛŒÙ„ØªØ± Ù…Ø´ØªØ±ÛŒØ§Ù†
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Ø¨Ø§ Ù†Ø§Ù…ØŒ Ø´Ù…Ø§Ø±Ù‡ ØªÙ…Ø§Ø³ØŒ Ø´Ù‡Ø±ØŒ Ù†ÙˆØ¹ Ù…Ø´ØªØ±ÛŒ Ùˆ ÙˆØ¶Ø¹ÛŒØª VIP Ø¬Ø³ØªØ¬Ùˆ Ú©Ù†ÛŒØ¯.
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
            {filteredCustomers.length.toLocaleString("fa-IR")} Ù…Ø´ØªØ±ÛŒ
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {/* Search */}
          <div className="xl:col-span-1">
            <label
              htmlFor="customer-search"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              Ø¬Ø³ØªØ¬ÙˆÛŒ Ù…Ø´ØªØ±ÛŒ
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-slate-400">
                ðŸ”Ž
              </span>

              <input
                id="customer-search"
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Ù†Ø§Ù… ÛŒØ§ Ø´Ù…Ø§Ø±Ù‡ ØªÙ…Ø§Ø³..."
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
              Ø´Ù‡Ø±
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
                Ù‡Ù…Ù‡ Ø´Ù‡Ø±Ù‡Ø§
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
              Ù†ÙˆØ¹ Ù…Ø´ØªØ±ÛŒ
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
                Ù‡Ù…Ù‡ Ø§Ù†ÙˆØ§Ø¹
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
              ÙˆØ¶Ø¹ÛŒØª VIP
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
                Ù‡Ù…Ù‡ Ù…Ø´ØªØ±ÛŒØ§Ù†
              </option>

              <option value="vip">
                ÙÙ‚Ø· VIP
              </option>

              <option value="normal">
                Ù…Ø´ØªØ±ÛŒ Ø¹Ø§Ø¯ÛŒ
              </option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="customer-status"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              ÙˆØ¶Ø¹ÛŒØª Ù…Ø´ØªØ±ÛŒ
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
                Ù‡Ù…Ù‡ ÙˆØ¶Ø¹ÛŒØªâ€ŒÙ‡Ø§
              </option>

              <option value="active">
                ðŸŸ¢ ÙØ¹Ø§Ù„
              </option>

              <option value="inactive">
                ðŸ”´ ØºÛŒØ±ÙØ¹Ø§Ù„
              </option>
            </select>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>
              ØªØ¹Ø¯Ø§Ø¯ Ù…Ø´ØªØ±ÛŒØ§Ù† Ù†Ù…Ø§ÛŒØ´ Ø¯Ø§Ø¯Ù‡â€ŒØ´Ø¯Ù‡:
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
              Ù¾Ø§Ú© Ú©Ø±Ø¯Ù† ÙÛŒÙ„ØªØ±Ù‡Ø§
            </button>
          ) : (
            <div className="text-xs text-slate-400">
              Ù‡Ù…Ù‡ Ù…Ø´ØªØ±ÛŒØ§Ù† Ù†Ù…Ø§ÛŒØ´ Ø¯Ø§Ø¯Ù‡ Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯
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

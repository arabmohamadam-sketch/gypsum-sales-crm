"use client";

import { useCustomers } from "@/src/lib/hooks/useCustomers";
import CustomerTable from "./CustomerTable";
import CustomerStats from "./CustomerStats";

const customerTypes = [
  {
    value: "building_material_store",
    label: "مصالح‌فروشی",
  },
  {
    value: "contractor",
    label: "پیمانکار",
  },
  {
    value: "employer",
    label: "کارفرما",
  },
  {
    value: "plaster_worker",
    label: "گچ‌کار",
  },
];

export default function CustomerPage() {
  const {
    customers,
    filteredCustomers,
    loading,
    error,

    search,
    setSearch,

    cityFilter,
    setCityFilter,

    typeFilter,
    setTypeFilter,
  } = useCustomers();

  const activeCustomers =
    customers.filter(
      (customer) => customer.is_active
    ).length;

  const vipCustomers =
    customers.filter(
      (customer) => customer.is_vip
    ).length;

  const totalTonnage =
    customers.reduce(
      (sum, customer) =>
        sum +
        Number(
          customer.lifetime_tonnage ?? 0
        ),
      0
    );

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 p-4 md:p-6"
    >
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            مدیریت مشتریان
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            مدیریت و جستجوی مشتریان فروش
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <CustomerStats
            title="کل مشتریان"
            value={
              loading
                ? "..."
                : customers.length.toLocaleString(
                    "fa-IR"
                  )
            }
            color="#2563EB"
          />

          <CustomerStats
            title="مشتریان فعال"
            value={
              loading
                ? "..."
                : activeCustomers.toLocaleString(
                    "fa-IR"
                  )
            }
            color="#22C55E"
          />

          <CustomerStats
            title="VIP"
            value={
              loading
                ? "..."
                : vipCustomers.toLocaleString(
                    "fa-IR"
                  )
            }
            color="#F59E0B"
          />

          <CustomerStats
            title="تناژ کل"
            value={
              loading
                ? "..."
                : `${totalTonnage.toLocaleString(
                    "fa-IR"
                  )} تن`
            }
            color="#EF4444"
          />

        </div>

        {/* Filters */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">

          <div className="grid gap-4 md:grid-cols-3">

            {/* Search */}
            <div className="md:col-span-1">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                جستجوی مشتری
              </label>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="نام یا شماره تماس..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
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

                <option value="سمنان">
                  سمنان
                </option>

                <option value="گرمسار">
                  گرمسار
                </option>

                <option value="ورامین">
                  ورامین
                </option>
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
                    key={type.value}
                    value={type.value}
                  >
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Result count */}
          <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="text-sm text-slate-500">
              نمایش{" "}
              <span className="font-bold text-slate-800">
                {filteredCustomers.length.toLocaleString(
                  "fa-IR"
                )}
              </span>{" "}
              مشتری از{" "}
              <span className="font-bold text-slate-800">
                {customers.length.toLocaleString(
                  "fa-IR"
                )}
              </span>
            </div>

            {(search ||
              cityFilter !== "all" ||
              typeFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCityFilter("all");
                  setTypeFilter("all");
                }}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                پاک کردن فیلترها
              </button>
            )}

          </div>
        </div>

        {/* Table */}
        <CustomerTable
          customers={filteredCustomers}
          loading={loading}
        />

      </div>
    </main>
  );
}
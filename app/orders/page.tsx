"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import { useOrders } from "@/src/lib/hooks/useOrders";
import {
  formatJalaliDateTime,
} from "@/src/lib/utils/jalali";

type OrderStatus =
  | "all"
  | "draft"
  | "confirmed"
  | "cancelled";

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "۰";
  }

  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatOrderDate(value: string): string {
  if (!value) {
    return "—";
  }

  try {
    return formatJalaliDateTime(value);
  } catch {
    return value;
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "پیش‌نویس",
    confirmed: "تأیید شده",
    cancelled: "لغو شده",
  };

  return labels[status] ?? status;
}

function getStatusClass(status: string): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";

    case "cancelled":
      return "bg-red-50 text-red-700 ring-1 ring-red-100";

    case "draft":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case "confirmed":
      return "✓";

    case "cancelled":
      return "×";

    default:
      return "•";
  }
}

export default function OrdersPage() {
  const {
    data: orders,
    loading,
    error,
    refresh,
    deleteOrder,
  } = useOrders();

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<OrderStatus>("all");

  const [
    deletingId,
    setDeletingId,
  ] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    const query =
      search
        .trim()
        .toLowerCase();

    return orders.filter(
      (order) => {
        const matchesStatus =
          statusFilter === "all" ||
          order.status === statusFilter;

        if (!matchesStatus) {
          return false;
        }

        if (!query) {
          return true;
        }

        const searchableText = [
          order.id,
          order.customer_id,
          order.sales_user_id,
          order.order_date,
          order.notes ?? "",
          order.customer?.name ?? "",
          order.customer?.phone ?? "",
          order.sales_user?.full_name ?? "",
          order.sales_user?.phone ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(
          query
        );
      }
    );
  }, [
    orders,
    search,
    statusFilter,
  ]);

  const totalTonnage =
    filteredOrders.reduce(
      (sum, order) =>
        sum +
        Number(
          order.total_tonnage ?? 0
        ),
      0
    );

  const confirmedCount =
    filteredOrders.filter(
      (order) =>
        order.status ===
        "confirmed"
    ).length;

  const draftCount =
    filteredOrders.filter(
      (order) =>
        order.status ===
        "draft"
    ).length;

  const cancelledCount =
    filteredOrders.filter(
      (order) =>
        order.status ===
        "cancelled"
    ).length;

  async function handleDelete(
    id: string
  ) {
    const confirmed =
      window.confirm(
        "آیا از حذف این سفارش مطمئن هستید؟"
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteOrder(id);
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "خطا در حذف سفارش."
      );
    } finally {
      setDeletingId(null);
    }
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
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-slate-900 via-violet-500 to-blue-500" />

        <div className="absolute -left-20 -top-24 h-60 w-60 rounded-full bg-violet-100/40 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-60 w-60 rounded-full bg-blue-100/40 blur-3xl" />

        <div className="relative flex flex-col gap-6 p-6 md:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-violet-600 text-2xl text-white shadow-lg shadow-violet-100">
              📦
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                  سفارش‌ها
                </h1>

                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 ring-1 ring-violet-100">
                  مدیریت فروش
                </span>
              </div>

              <p className="mt-2 text-sm leading-7 text-slate-500 md:text-base">
                مدیریت، جستجو و پیگیری سفارش‌های ثبت‌شده
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              ↻
              به‌روزرسانی
            </button>

            <Link
              href="/orders/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 hover:shadow-md"
            >
              <span className="text-lg leading-none">
                +
              </span>
              ثبت سفارش
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================
          STATS
          ===================================================== */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                کل سفارش‌ها
              </p>

              <p className="mt-2 text-3xl font-black text-slate-900">
                {formatNumber(
                  filteredOrders.length
                )}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                سفارش نمایش داده‌شده
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl">
              📋
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                مجموع تناژ
              </p>

              <p className="mt-2 text-3xl font-black text-slate-900">
                {formatNumber(
                  totalTonnage
                )}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                تن
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl">
              ⚖️
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-emerald-700">
                تأیید شده
              </p>

              <p className="mt-2 text-3xl font-black text-emerald-700">
                {formatNumber(
                  confirmedCount
                )}
              </p>

              <p className="mt-1 text-xs text-emerald-600/70">
                سفارش آماده فروش
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
              ✓
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-amber-100 bg-amber-50/40 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-amber-700">
                پیش‌نویس
              </p>

              <p className="mt-2 text-3xl font-black text-amber-700">
                {formatNumber(
                  draftCount
                )}
              </p>

              <p className="mt-1 text-xs text-amber-600/70">
                نیازمند بررسی
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
              📝
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-red-100 bg-red-50/40 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-red-700">
                لغو شده
              </p>

              <p className="mt-2 text-3xl font-black text-red-700">
                {formatNumber(
                  cancelledCount
                )}
              </p>

              <p className="mt-1 text-xs text-red-600/70">
                سفارش لغوشده
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
              ×
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          FILTERS
          ===================================================== */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              جستجو و فیلتر سفارش‌ها
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              بر اساس مشتری، بازاریاب، شماره سفارش یا وضعیت جستجو کنید.
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
            {filteredOrders.length.toLocaleString(
              "fa-IR"
            )} سفارش
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_240px]">
          <div>
            <label
              htmlFor="orders-search"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              جستجوی سفارش
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-slate-400">
                🔎
              </span>

              <input
                id="orders-search"
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="نام مشتری، شماره تماس، بازاریاب یا شناسه سفارش..."
                autoComplete="off"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-10 pl-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="orders-status"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              وضعیت سفارش
            </label>

            <select
              id="orders-status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as OrderStatus
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            >
              <option value="all">
                همه وضعیت‌ها
              </option>

              <option value="draft">
                پیش‌نویس
              </option>

              <option value="confirmed">
                تأیید شده
              </option>

              <option value="cancelled">
                لغو شده
              </option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            تعداد سفارش‌های نمایش‌داده‌شده:
            <span className="mr-2 rounded-full bg-blue-50 px-3 py-1 font-black text-blue-700">
              {filteredOrders.length.toLocaleString(
                "fa-IR"
              )}
            </span>
          </div>

          {(search.trim() ||
            statusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter(
                  "all"
                );
              }}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              پاک کردن فیلترها
            </button>
          )}
        </div>
      </section>

      {/* =====================================================
          CONTENT
          ===================================================== */}
      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
            📦
          </div>

          <p className="mt-4 text-sm font-medium text-slate-500">
            در حال دریافت سفارش‌ها...
          </p>
        </div>
      ) : error ? (
        <div className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm">
          <div className="h-1.5 bg-red-500" />

          <div className="p-6 md:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-600">
              !
            </div>

            <h2 className="mt-4 text-xl font-black text-slate-900">
              خطا در دریافت سفارش‌ها
            </h2>

            <p className="mt-2 text-sm leading-7 text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-5 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
            >
              تلاش مجدد
            </button>
          </div>
        </div>
      ) : filteredOrders.length ===
        0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
            📭
          </div>

          <h2 className="mt-5 text-xl font-black text-slate-800">
            سفارشی پیدا نشد
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500">
            برای شروع می‌توانید یک سفارش جدید ثبت کنید یا فیلترهای فعلی را پاک کنید.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/orders/new"
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              + ثبت سفارش
            </Link>

            {(search.trim() ||
              statusFilter !==
                "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter(
                    "all"
                  );
                }}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                پاک کردن فیلترها
              </button>
            )}
          </div>
        </div>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {/* Table Header */}
          <div className="flex flex-col gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                فهرست سفارش‌ها
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                آخرین سفارش‌های ثبت‌شده در سیستم
              </p>
            </div>

            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
              {filteredOrders.length.toLocaleString(
                "fa-IR"
              )} مورد
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="whitespace-nowrap px-5 py-4 font-bold">
                    تاریخ
                  </th>

                  <th className="px-5 py-4 font-bold">
                    مشتری
                  </th>

                  <th className="px-5 py-4 font-bold">
                    بازاریاب
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 font-bold">
                    تناژ
                  </th>

                  <th className="px-5 py-4 font-bold">
                    وضعیت
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 font-bold">
                    عملیات
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map(
                  (order) => (
                    <tr
                      key={order.id}
                      className="group transition hover:bg-slate-50/70"
                    >
                      {/* Date */}
                      <td className="whitespace-nowrap px-5 py-5">
                        <div className="text-sm font-semibold text-slate-700">
                          {formatOrderDate(
                            order.order_date
                          )}
                        </div>

                        <div className="mt-1 max-w-[160px] truncate text-[11px] text-slate-400">
                          {order.id}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-5">
                        <Link
                          href={`/customers/${order.customer_id}`}
                          className="group/customer flex min-w-[220px] items-center gap-3"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-700 transition group-hover/customer:bg-blue-100">
                            {order.customer?.name
                              ?.charAt(0) ||
                              "م"}
                          </div>

                          <div className="min-w-0">
                            <span className="block truncate text-sm font-black text-slate-900 transition group-hover/customer:text-blue-600">
                              {order.customer?.name ??
                                "مشتری نامشخص"}
                            </span>

                            {order.customer?.phone && (
                              <span
                                dir="ltr"
                                className="mt-1 block text-xs text-slate-500"
                              >
                                {
                                  order
                                    .customer
                                    .phone
                                }
                              </span>
                            )}

                            {!order.customer && (
                              <span className="mt-1 block max-w-[180px] truncate text-xs text-slate-400">
                                {
                                  order.customer_id
                                }
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>

                      {/* Sales User */}
                      <td className="px-5 py-5">
                        <div className="min-w-[170px]">
                          <span className="block text-sm font-bold text-slate-800">
                            {order.sales_user
                              ?.full_name ??
                              "بازاریاب نامشخص"}
                          </span>

                          {order.sales_user
                            ?.job_title && (
                            <span className="mt-1 block text-xs text-slate-500">
                              {
                                order
                                  .sales_user
                                  .job_title
                              }
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tonnage */}
                      <td className="whitespace-nowrap px-5 py-5">
                        <div className="inline-flex items-center rounded-xl bg-slate-100 px-3 py-2">
                          <span className="font-black text-slate-900">
                            {formatNumber(
                              Number(
                                order.total_tonnage ??
                                  0
                              )
                            )}
                          </span>

                          <span className="mr-1 text-xs text-slate-500">
                            تن
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClass(
                            order.status
                          )}`}
                        >
                          <span>
                            {getStatusIcon(
                              order.status
                            )}
                          </span>

                          {getStatusLabel(
                            order.status
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/orders/${order.id}`}
                            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                          >
                            مشاهده
                          </Link>

                          <Link
                            href={`/orders/${order.id}`}
                            className="inline-flex items-center justify-center rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                          >
                            ویرایش
                          </Link>

                          <Link
                            href={`/customers/${order.customer_id}`}
                            className="inline-flex items-center justify-center rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            مشتری
                          </Link>

                          <button
                            type="button"
                            disabled={
                              deletingId ===
                              order.id
                            }
                            onClick={() =>
                              void handleDelete(
                                order.id
                              )
                            }
                            className="inline-flex items-center justify-center rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId ===
                            order.id
                              ? "در حال حذف..."
                              : "حذف"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
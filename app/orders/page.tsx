"use client";

import Link from "next/link";
import {
  Box,
  CheckCircle2,
  Clock3,
  FileText,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useOrders } from "@/src/lib/hooks/useOrders";
import { formatJalaliDateTime } from "@/src/lib/utils/jalali";

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
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "confirmed":
      return <CheckCircle2 size={14} />;

    case "cancelled":
      return <XCircle size={14} />;

    default:
      return <Clock3 size={14} />;
  }
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
        <div>
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

function EmptyState({
  filtered,
  hasFilters,
  onReset,
}: {
  filtered: boolean;
  hasFilters: boolean;
  onReset: () => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        {filtered ? (
          <Search size={28} />
        ) : (
          <ShoppingCart size={28} />
        )}
      </div>

      <h2 className="mt-5 text-xl font-black text-slate-900">
        {filtered
          ? "سفارشی با این فیلترها پیدا نشد"
          : "هنوز سفارشی ثبت نشده است"}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500">
        {filtered
          ? "عبارت جستجو یا وضعیت انتخاب‌شده را تغییر دهید."
          : "اولین سفارش مشتری را ثبت کنید تا در این بخش نمایش داده شود."}
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {!filtered && (
          <Link
            href="/orders/new"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
          >
            <Plus size={17} />
            ثبت سفارش
          </Link>
        )}

        {hasFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            پاک کردن فیلترها
          </button>
        )}
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-12 shadow-sm">
      <div className="mx-auto max-w-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <ShoppingCart
            size={24}
            className="animate-pulse"
          />
        </div>

        <p className="mt-4 font-bold text-slate-700">
          در حال دریافت سفارش‌ها...
        </p>

        <div className="mx-auto mt-5 h-2 w-48 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-500" />
        </div>
      </div>
    </section>
  );
}

export default function OrdersPage() {
  const {
    data: orders,
    loading,
    error,
    refresh,
    deleteOrder,
  } = useOrders();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<OrderStatus>("all");
  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
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

      return searchableText.includes(query);
    });
  }, [orders, search, statusFilter]);

  const totalTonnage = filteredOrders.reduce(
    (sum, order) =>
      sum + Number(order.total_tonnage ?? 0),
    0
  );

  const confirmedCount = filteredOrders.filter(
    (order) => order.status === "confirmed"
  ).length;

  const draftCount = filteredOrders.filter(
    (order) => order.status === "draft"
  ).length;

  const cancelledCount = filteredOrders.filter(
    (order) => order.status === "cancelled"
  ).length;

  const hasFilters =
    Boolean(search.trim()) ||
    statusFilter !== "all";

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
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

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
  }

  return (
    <main
      dir="rtl"
      className="mx-auto max-w-[1600px] space-y-6"
    >
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-slate-900 via-violet-500 to-blue-500" />

        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-100/40 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl" />

        <div className="relative flex flex-col gap-7 p-6 md:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-violet-600 text-white shadow-lg">
              <ShoppingCart size={24} />
            </div>

            <div className="min-w-0">
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
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />
              به‌روزرسانی
            </button>

            <Link
              href="/orders/new"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-200 transition hover:-translate-y-0.5 hover:bg-blue-600"
            >
              <Plus size={18} />
              ثبت سفارش
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="کل سفارش‌ها"
          value={formatNumber(filteredOrders.length)}
          description="سفارش نمایش داده‌شده"
          icon={<FileText size={21} />}
          iconClass="bg-slate-100 text-slate-700"
        />

        <StatCard
          title="مجموع تناژ"
          value={formatNumber(totalTonnage)}
          description="تن فروش"
          icon={<Box size={21} />}
          iconClass="bg-blue-50 text-blue-700"
          valueClass="text-blue-700"
        />

        <StatCard
          title="تأیید شده"
          value={formatNumber(confirmedCount)}
          description="سفارش تأییدشده"
          icon={<CheckCircle2 size={21} />}
          iconClass="bg-emerald-50 text-emerald-700"
          valueClass="text-emerald-700"
        />

        <StatCard
          title="پیش‌نویس"
          value={formatNumber(draftCount)}
          description="نیازمند بررسی"
          icon={<Clock3 size={21} />}
          iconClass="bg-amber-50 text-amber-700"
          valueClass="text-amber-700"
        />

        <StatCard
          title="لغو شده"
          value={formatNumber(cancelledCount)}
          description="سفارش لغوشده"
          icon={<XCircle size={21} />}
          iconClass="bg-red-50 text-red-700"
          valueClass="text-red-700"
        />
      </section>

      {/* Filters */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              جستجو و فیلتر سفارش‌ها
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              بر اساس مشتری، بازاریاب، شماره سفارش یا وضعیت جستجو کنید.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
            <ShoppingCart size={13} />

            {formatNumber(filteredOrders.length)} سفارش
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <div>
            <label
              htmlFor="orders-search"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              جستجوی سفارش
            </label>

            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="orders-search"
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="نام مشتری، شماره تماس، بازاریاب یا شناسه سفارش..."
                autoComplete="off"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pr-11 pl-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
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
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="draft">پیش‌نویس</option>
              <option value="confirmed">تأیید شده</option>
              <option value="cancelled">لغو شده</option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            نمایش{" "}
            <span className="font-black text-slate-800">
              {formatNumber(filteredOrders.length)}
            </span>{" "}
            سفارش
          </p>

          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex w-fit items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              پاک کردن فیلترها
            </button>
          )}
        </div>
      </section>

      {/* Content */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <section className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm">
          <div className="h-1.5 bg-red-500" />

          <div className="p-7 md:p-9">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <XCircle size={25} />
            </div>

            <h2 className="mt-5 text-xl font-black text-slate-900">
              خطا در دریافت سفارش‌ها
            </h2>

            <p className="mt-2 text-sm leading-7 text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
            >
              <RefreshCw size={17} />
              تلاش مجدد
            </button>
          </div>
        </section>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          filtered={hasFilters}
          hasFilters={hasFilters}
          onReset={resetFilters}
        />
      ) : (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                فهرست سفارش‌ها
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                آخرین سفارش‌های ثبت‌شده در سیستم
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
              <Users size={13} />
              {formatNumber(filteredOrders.length)} مورد
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[1180px] w-full text-right text-sm">
              <thead className="border-b border-slate-100 bg-white">
                <tr>
                  <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                    تاریخ
                  </th>

                  <th className="px-5 py-4 font-bold text-slate-600">
                    مشتری
                  </th>

                  <th className="px-5 py-4 font-bold text-slate-600">
                    بازاریاب
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                    تناژ
                  </th>

                  <th className="px-5 py-4 font-bold text-slate-600">
                    وضعیت
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                    عملیات
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="group transition hover:bg-slate-50/70"
                  >
                    <td className="whitespace-nowrap px-5 py-5">
                      <div className="font-semibold text-slate-700">
                        {formatOrderDate(order.order_date)}
                      </div>

                      <div className="mt-1 max-w-[170px] truncate text-[11px] text-slate-400">
                        {order.id}
                      </div>
                    </td>

                    <td className="px-5 py-5">
                      <Link
                        href={`/customers/${order.customer_id}`}
                        className="group/customer flex min-w-[220px] items-center gap-3"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-700 transition group-hover/customer:bg-blue-100">
                          {order.customer?.name?.charAt(0) ||
                            "م"}
                        </div>

                        <div className="min-w-0">
                          <span className="block truncate font-black text-slate-900 transition group-hover/customer:text-blue-600">
                            {order.customer?.name ??
                              "مشتری نامشخص"}
                          </span>

                          {order.customer?.phone && (
                            <span
                              dir="ltr"
                              className="mt-1 block text-xs text-slate-500"
                            >
                              {order.customer.phone}
                            </span>
                          )}

                          {!order.customer && (
                            <span className="mt-1 block max-w-[180px] truncate text-xs text-slate-400">
                              {order.customer_id}
                            </span>
                          )}
                        </div>
                      </Link>
                    </td>

                    <td className="px-5 py-5">
                      <div className="min-w-[170px]">
                        <span className="block font-bold text-slate-800">
                          {order.sales_user?.full_name ??
                            "بازاریاب نامشخص"}
                        </span>

                        {order.sales_user?.job_title && (
                          <span className="mt-1 block text-xs text-slate-500">
                            {order.sales_user.job_title}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-5 py-5">
                      <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2">
                        <span className="font-black text-slate-900">
                          {formatNumber(
                            Number(
                              order.total_tonnage ?? 0
                            )
                          )}
                        </span>

                        <span className="text-xs text-slate-500">
                          تن
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClass(
                          order.status
                        )}`}
                      >
                        {getStatusIcon(order.status)}
                        {getStatusLabel(order.status)}
                      </span>
                    </td>

                    <td className="px-5 py-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/orders/${order.id}`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-600"
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
                            deletingId === order.id
                          }
                          onClick={() =>
                            void handleDelete(order.id)
                          }
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 size={13} />

                          {deletingId === order.id
                            ? "در حال حذف..."
                            : "حذف"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="divide-y divide-slate-100 md:hidden">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/customers/${order.customer_id}`}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-700">
                      {order.customer?.name?.charAt(0) ||
                        "م"}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate font-black text-slate-900">
                        {order.customer?.name ??
                          "مشتری نامشخص"}
                      </h2>

                      {order.customer?.phone && (
                        <p
                          dir="ltr"
                          className="mt-1 text-xs text-slate-400"
                        >
                          {order.customer.phone}
                        </p>
                      )}
                    </div>
                  </Link>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClass(
                      order.status
                    )}`}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        تاریخ
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {formatOrderDate(order.order_date)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        تناژ
                      </p>

                      <p className="mt-1 text-sm font-black text-blue-700">
                        {formatNumber(
                          Number(
                            order.total_tonnage ?? 0
                          )
                        )}{" "}
                        تن
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        بازاریاب
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {order.sales_user?.full_name ??
                          "نامشخص"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        شناسه
                      </p>

                      <p className="mt-1 truncate text-xs text-slate-400">
                        {order.id}
                      </p>
                    </div>
                  </div>

                  {order.notes && (
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <p className="text-xs font-medium text-slate-400">
                        توضیحات
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {order.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href={`/orders/${order.id}`}
                    className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-xs font-black text-white transition hover:bg-blue-600"
                  >
                    مشاهده سفارش
                  </Link>

                  <Link
                    href={`/customers/${order.customer_id}`}
                    className="inline-flex items-center justify-center rounded-xl bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
                  >
                    مشتری
                  </Link>

                  <Link
                    href={`/orders/${order.id}`}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-50 px-4 py-3 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                  >
                    ویرایش
                  </Link>

                  <button
                    type="button"
                    disabled={
                      deletingId === order.id
                    }
                    onClick={() =>
                      void handleDelete(order.id)
                    }
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-50 px-4 py-3 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={13} />

                    {deletingId === order.id
                      ? "در حال حذف..."
                      : "حذف"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useOrders } from "@/src/lib/hooks/useOrders";

function formatNumber(value: number) {
  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fa-IR").format(date);
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "پیش‌نویس",
    pending: "در انتظار تأیید",
    confirmed: "تأیید شده",
    cancelled: "لغو شده",
  };

  return labels[status] ?? status;
}

function getStatusClass(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-green-50 text-green-700";

    case "cancelled":
      return "bg-red-50 text-red-700";

    case "pending":
      return "bg-yellow-50 text-yellow-700";

    default:
      return "bg-gray-100 text-gray-700";
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

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" ||
        order.status === statusFilter;

      if (!query) {
        return matchesStatus;
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

      return (
        matchesStatus &&
        searchableText.includes(query)
      );
    });
  }, [orders, search, statusFilter]);

  const totalTonnage = filteredOrders.reduce(
    (sum, order) =>
      sum + Number(order.total_tonnage || 0),
    0
  );

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "آیا از حذف این سفارش مطمئن هستید؟"
    );

    if (!confirmed) return;

    try {
      await deleteOrder(id);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "خطا در حذف سفارش"
      );
    }
  }

  return (
    <div
      dir="rtl"
      className="mx-auto max-w-7xl"
    >
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            سفارش‌ها
          </h1>

          <p className="mt-2 text-gray-500">
            مدیریت سفارش‌ها و تناژ فروش
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={refresh}
            className="rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            بروزرسانی
          </button>

          <Link
            href="/orders/new"
            className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            + ثبت سفارش
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            تعداد سفارش‌ها
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatNumber(filteredOrders.length)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            مجموع تناژ
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatNumber(totalTonnage)} تن
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            سفارش تأیید شده
          </p>

          <p className="mt-2 text-2xl font-bold text-green-700">
            {formatNumber(
              filteredOrders.filter(
                (order) =>
                  order.status === "confirmed"
              ).length
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="جستجو بر اساس مشتری، بازاریاب، شماره یا شناسه سفارش..."
            className="rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="rounded-xl border px-4 py-3 text-sm outline-none"
          >
            <option value="all">
              همه وضعیت‌ها
            </option>

            <option value="draft">
              پیش‌نویس
            </option>

            <option value="pending">
              در انتظار تأیید
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

      {/* Content */}
      {loading ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-gray-500">
          در حال دریافت سفارش‌ها...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="font-bold text-red-700">
            خطا در دریافت سفارش‌ها
          </h2>

          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={refresh}
            className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white"
          >
            تلاش مجدد
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border bg-white p-12 text-center">
          <p className="text-lg font-semibold text-gray-700">
            هنوز سفارشی ثبت نشده است.
          </p>

          <p className="mt-2 text-sm text-gray-500">
            برای شروع، اولین سفارش را ثبت کنید.
          </p>

          <Link
            href="/orders/new"
            className="mt-5 inline-flex rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white"
          >
            ثبت اولین سفارش
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-right">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-5 py-4 text-sm font-semibold text-gray-700">
                    تاریخ
                  </th>

                  <th className="px-5 py-4 text-sm font-semibold text-gray-700">
                    مشتری
                  </th>

                  <th className="px-5 py-4 text-sm font-semibold text-gray-700">
                    بازاریاب
                  </th>

                  <th className="px-5 py-4 text-sm font-semibold text-gray-700">
                    تناژ
                  </th>

                  <th className="px-5 py-4 text-sm font-semibold text-gray-700">
                    وضعیت
                  </th>

                  <th className="px-5 py-4 text-sm font-semibold text-gray-700">
                    عملیات
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="transition hover:bg-gray-50"
                  >
                    {/* Date */}
                    <td className="whitespace-nowrap px-5 py-4 text-sm">
                      {formatDate(order.order_date)}
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4">
                      <Link
                        href={`/customers/${order.customer_id}`}
                        className="group block"
                      >
                        <span className="block text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                          {order.customer?.name ??
                            "مشتری نامشخص"}
                        </span>

                        {order.customer?.phone && (
                          <span className="mt-1 block text-xs text-gray-500">
                            {order.customer.phone}
                          </span>
                        )}

                        {!order.customer && (
                          <span className="mt-1 block text-xs text-gray-400">
                            {order.customer_id}
                          </span>
                        )}
                      </Link>
                    </td>

                    {/* Sales User */}
                    <td className="px-5 py-4">
                      <div>
                        <span className="block text-sm font-medium text-gray-900">
                          {order.sales_user?.full_name ??
                            "بازاریاب نامشخص"}
                        </span>

                        {order.sales_user?.job_title && (
                          <span className="mt-1 block text-xs text-gray-500">
                            {order.sales_user.job_title}
                          </span>
                        )}

                        {!order.sales_user && (
                          <span className="mt-1 block text-xs text-gray-400">
                            {order.sales_user_id}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Tonnage */}
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold">
                      {formatNumber(
                        Number(order.total_tonnage)
                      )}{" "}
                      تن
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                          order.status
                        )}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-sm font-medium text-gray-700 transition hover:text-blue-600"
                        >
                          مشاهده
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(order.id)
                          }
                          className="text-sm font-medium text-red-600 transition hover:text-red-800"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
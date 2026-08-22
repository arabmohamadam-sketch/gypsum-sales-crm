"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toGregorian, toJalaali } from "jalaali-js";

import { useOrders } from "@/src/lib/hooks/useOrders";
import type { Order } from "@/src/lib/types/order";

interface JalaliDate {
  year: number;
  month: number;
  day: number;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toPersianDigits(value: string | number) {
  return String(value).replace(/\d/g, (digit) => {
    return "۰۱۲۳۴۵۶۷۸۹"[Number(digit)];
  });
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "۰";
  }

  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * تبدیل تاریخ میلادی YYYY-MM-DD به تاریخ جلالی
 */
function gregorianToJalali(
  value: string | null | undefined
): JalaliDate | null {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) {
    return null;
  }

  const gy = Number(match[1]);
  const gm = Number(match[2]);
  const gd = Number(match[3]);

  try {
    const result = toJalaali(gy, gm, gd);

    return {
      year: result.jy,
      month: result.jm,
      day: result.jd,
    };
  } catch {
    return null;
  }
}

/**
 * تبدیل تاریخ جلالی به YYYY-MM-DD میلادی
 */
function jalaliToGregorianDate(
  date: JalaliDate
): string {
  const result = toGregorian(
    date.year,
    date.month,
    date.day
  );

  return `${result.gy}-${pad(result.gm)}-${pad(result.gd)}`;
}

/**
 * نمایش تاریخ جلالی بدون وابستگی به Locale مرورگر
 */
function formatJalaliDate(
  value: string | null | undefined
) {
  const date = gregorianToJalali(value);

  if (!date) {
    return "-";
  }

  return `${toPersianDigits(date.year)}/${toPersianDigits(
    pad(date.month)
  )}/${toPersianDigits(pad(date.day))}`;
}

/**
 * اعتبارسنجی تاریخ جلالی
 */
function isValidJalaliDate(
  date: JalaliDate
) {
  if (
    !Number.isInteger(date.year) ||
    !Number.isInteger(date.month) ||
    !Number.isInteger(date.day)
  ) {
    return false;
  }

  if (
    date.year < 1300 ||
    date.year > 1500 ||
    date.month < 1 ||
    date.month > 12 ||
    date.day < 1 ||
    date.day > 31
  ) {
    return false;
  }

  try {
    const gregorian = toGregorian(
      date.year,
      date.month,
      date.day
    );

    const back = toJalaali(
      gregorian.gy,
      gregorian.gm,
      gregorian.gd
    );

    return (
      back.jy === date.year &&
      back.jm === date.month &&
      back.jd === date.day
    );
  } catch {
    return false;
  }
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

function getSourceLabel(source: string | null | undefined) {
  const labels: Record<string, string> = {
    manual: "ثبت دستی",
    mobile_app: "اپلیکیشن موبایل",
    whatsapp: "واتساپ",
    sms: "پیامک",
    pwa: "PWA",
    api: "API",
  };

  if (!source) {
    return "-";
  }

  return labels[source] ?? source;
}

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const orderId =
    typeof params.id === "string"
      ? params.id
      : "";

  const {
    data: orders,
    loading,
    error,
    updateOrder,
    deleteOrder,
  } = useOrders();

  const [order, setOrder] =
    useState<Order | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [formError, setFormError] =
    useState("");

  const [jalaliYear, setJalaliYear] =
    useState("");

  const [jalaliMonth, setJalaliMonth] =
    useState("");

  const [jalaliDay, setJalaliDay] =
    useState("");

  const [status, setStatus] =
    useState("draft");

  const [totalTonnage, setTotalTonnage] =
    useState("");

  const [notes, setNotes] =
    useState("");

  /**
   * دریافت سفارش
   */
  useEffect(() => {
    if (!orderId || orders.length === 0) {
      return;
    }

    const foundOrder = orders.find(
      (item) => item.id === orderId
    );

    if (!foundOrder) {
      return;
    }

    setOrder(foundOrder);

    const jalaliDate =
      gregorianToJalali(
        foundOrder.order_date
      );

    if (jalaliDate) {
      setJalaliYear(
        String(jalaliDate.year)
      );

      setJalaliMonth(
        String(jalaliDate.month)
      );

      setJalaliDay(
        String(jalaliDate.day)
      );
    }

    setStatus(foundOrder.status);

    setTotalTonnage(
      String(foundOrder.total_tonnage ?? "")
    );

    setNotes(foundOrder.notes ?? "");
  }, [orders, orderId]);

  /**
   * ذخیره تغییرات
   */
  async function handleSave() {
    if (!order) {
      return;
    }

    setSaving(true);
    setMessage("");
    setFormError("");

    try {
      const year = Number(jalaliYear);
      const month = Number(jalaliMonth);
      const day = Number(jalaliDay);

      const jalaliDate: JalaliDate = {
        year,
        month,
        day,
      };

      if (
        !isValidJalaliDate(jalaliDate)
      ) {
        throw new Error(
          "تاریخ جلالی واردشده معتبر نیست."
        );
      }

      const tonnage = Number(
        totalTonnage.replace(",", ".")
      );

      if (
        !Number.isFinite(tonnage) ||
        tonnage <= 0
      ) {
        throw new Error(
          "تناژ سفارش باید بیشتر از صفر باشد."
        );
      }

      const gregorianDate =
        jalaliToGregorianDate(
          jalaliDate
        );

      const updated =
        await updateOrder(
          order.id,
          {
            order_date: gregorianDate,
            status,
            total_tonnage: tonnage,
            notes: notes.trim() || null,
          }
        );

      setOrder({
        ...updated,
        customer:
          updated.customer ??
          order.customer ??
          null,
        sales_user:
          updated.sales_user ??
          order.sales_user ??
          null,
      });

      setMessage(
        "اطلاعات سفارش با موفقیت ذخیره شد."
      );

      window.setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "خطا در ذخیره سفارش."
      );
    } finally {
      setSaving(false);
    }
  }

  /**
   * حذف سفارش
   */
  async function handleDelete() {
    if (!order) {
      return;
    }

    const confirmed = window.confirm(
      "آیا از حذف این سفارش مطمئن هستید؟"
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setFormError("");

    try {
      await deleteOrder(order.id);

      router.push("/orders");
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "خطا در حذف سفارش."
      );
    } finally {
      setDeleting(false);
    }
  }

  /**
   * Loading
   */
  if (loading) {
    return (
      <div
        dir="rtl"
        className="mx-auto max-w-5xl"
      >
        <div className="rounded-2xl border bg-white p-10 text-center text-gray-500 shadow-sm">
          در حال دریافت اطلاعات سفارش...
        </div>
      </div>
    );
  }

  /**
   * Error
   */
  if (error) {
    return (
      <div
        dir="rtl"
        className="mx-auto max-w-5xl"
      >
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-bold text-red-700">
            خطا در دریافت سفارش
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>

          <Link
            href="/orders"
            className="mt-5 inline-flex rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            بازگشت به سفارش‌ها
          </Link>
        </div>
      </div>
    );
  }

  /**
   * Order not found
   */
  if (!order) {
    return (
      <div
        dir="rtl"
        className="mx-auto max-w-5xl"
      >
        <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-800">
            سفارش پیدا نشد
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            سفارش موردنظر وجود ندارد یا حذف شده است.
          </p>

          <Link
            href="/orders"
            className="mt-5 inline-flex rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            بازگشت به سفارش‌ها
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="mx-auto max-w-5xl pb-12"
    >
      {/* Header */}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3">
            <Link
              href="/orders"
              className="text-sm text-gray-500 transition hover:text-gray-900"
            >
              ← بازگشت به سفارش‌ها
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gray-900">
            جزئیات سفارش
          </h1>

          <p className="mt-2 break-all text-sm text-gray-500">
            شناسه سفارش: {order.id}
          </p>
        </div>

        <span
          className={`w-fit rounded-full px-4 py-2 text-sm font-medium ${getStatusClass(
            order.status
          )}`}
        >
          {getStatusLabel(order.status)}
        </span>
      </div>

      {/* Messages */}

      {message && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
          {message}
        </div>
      )}

      {formError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {formError}
        </div>
      )}

      {/* Customer / Sales User */}

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {/* Customer */}

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              مشتری
            </h2>

            <Link
              href={`/customers/${order.customer_id}`}
              className="text-xs font-medium text-gray-500 hover:text-gray-900"
            >
              مشاهده مشتری
            </Link>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs text-gray-500">
              نام مشتری
            </p>

            <p className="mt-2 text-base font-semibold text-gray-900">
              {order.customer?.name ??
                "اطلاعات مشتری موجود نیست"}
            </p>

            {order.customer?.phone && (
              <p className="mt-2 text-sm text-gray-500">
                {order.customer.phone}
              </p>
            )}

            <p className="mt-3 break-all text-xs text-gray-400">
              شناسه: {order.customer_id}
            </p>
          </div>
        </section>

        {/* Sales User */}

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            بازاریاب
          </h2>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs text-gray-500">
              نام بازاریاب
            </p>

            <p className="mt-2 text-base font-semibold text-gray-900">
              {order.sales_user?.full_name ??
                "اطلاعات بازاریاب موجود نیست"}
            </p>

            {order.sales_user?.job_title && (
              <p className="mt-2 text-sm text-gray-500">
                {order.sales_user.job_title}
              </p>
            )}

            {order.sales_user?.phone && (
              <p className="mt-1 text-sm text-gray-500">
                {order.sales_user.phone}
              </p>
            )}

            <p className="mt-3 break-all text-xs text-gray-400">
              شناسه: {order.sales_user_id}
            </p>
          </div>
        </section>
      </div>

      {/* Edit */}

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            اطلاعات سفارش
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            اطلاعات ثبت‌شده سفارش را ویرایش کنید.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Jalali Date */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              تاریخ سفارش
            </label>

            <div className="grid grid-cols-3 gap-3">
              {/* Year */}

              <div>
                <label
                  htmlFor="jalali-year"
                  className="mb-1 block text-xs text-gray-400"
                >
                  سال
                </label>

                <input
                  id="jalali-year"
                  type="text"
                  inputMode="numeric"
                  value={jalaliYear}
                  onChange={(event) =>
                    setJalaliYear(
                      event.target.value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }
                  placeholder="۱۴۰۵"
                  className="w-full rounded-xl border px-3 py-3 text-center text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                />
              </div>

              {/* Month */}

              <div>
                <label
                  htmlFor="jalali-month"
                  className="mb-1 block text-xs text-gray-400"
                >
                  ماه
                </label>

                <select
                  id="jalali-month"
                  value={jalaliMonth}
                  onChange={(event) =>
                    setJalaliMonth(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border px-3 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                >
                  {Array.from(
                    { length: 12 },
                    (_, index) => {
                      const value =
                        index + 1;

                      return (
                        <option
                          key={value}
                          value={value}
                        >
                          {formatNumber(value)}
                        </option>
                      );
                    }
                  )}
                </select>
              </div>

              {/* Day */}

              <div>
                <label
                  htmlFor="jalali-day"
                  className="mb-1 block text-xs text-gray-400"
                >
                  روز
                </label>

                <select
                  id="jalali-day"
                  value={jalaliDay}
                  onChange={(event) =>
                    setJalaliDay(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border px-3 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                >
                  {Array.from(
                    { length: 31 },
                    (_, index) => {
                      const value =
                        index + 1;

                      return (
                        <option
                          key={value}
                          value={value}
                        >
                          {formatNumber(value)}
                        </option>
                      );
                    }
                  )}
                </select>
              </div>
            </div>

            <p className="mt-2 text-xs text-gray-400">
              تاریخ فعلی:{" "}
              {formatJalaliDate(
                order.order_date
              )}
            </p>
          </div>

          {/* Status */}

          <div>
            <label
              htmlFor="order-status"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              وضعیت سفارش
            </label>

            <select
              id="order-status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
            >
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

          {/* Tonnage */}

          <div>
            <label
              htmlFor="total-tonnage"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              تناژ سفارش
            </label>

            <div className="relative">
              <input
                id="total-tonnage"
                type="number"
                min="0.01"
                step="0.01"
                value={totalTonnage}
                onChange={(event) =>
                  setTotalTonnage(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border px-4 py-3 pl-14 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
              />

              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                تن
              </span>
            </div>

            <p className="mt-2 text-xs text-gray-400">
              مقدار فعلی:{" "}
              {formatNumber(
                Number(order.total_tonnage)
              )}{" "}
              تن
            </p>
          </div>

          {/* Source */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              منبع سفارش
            </label>

            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
              {getSourceLabel(order.source)}
            </div>
          </div>
        </div>

        {/* Notes */}

        <div className="mt-6">
          <label
            htmlFor="order-notes"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            توضیحات
          </label>

          <textarea
            id="order-notes"
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            rows={5}
            placeholder="توضیحات سفارش..."
            className="w-full resize-y rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
          />
        </div>

        {/* Actions */}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting
              ? "در حال حذف..."
              : "حذف سفارش"}
          </button>

          <div className="flex gap-3">
            <Link
              href="/orders"
              className="rounded-xl border bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              انصراف
            </Link>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || deleting}
              className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "در حال ذخیره..."
                : "ذخیره تغییرات"}
            </button>
          </div>
        </div>
      </section>

      {/* System Information */}

      <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          اطلاعات سیستم
        </h2>

        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs text-gray-500">
              ایجاد شده در
            </p>

            <p className="mt-2 font-medium text-gray-700">
              {formatJalaliDate(
                order.created_at
              )}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs text-gray-500">
              آخرین بروزرسانی
            </p>

            <p className="mt-2 font-medium text-gray-700">
              {formatJalaliDate(
                order.updated_at
              )}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs text-gray-500">
              نسخه همگام‌سازی
            </p>

            <p className="mt-2 font-medium text-gray-700">
              {formatNumber(
                Number(order.sync_version)
              )}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
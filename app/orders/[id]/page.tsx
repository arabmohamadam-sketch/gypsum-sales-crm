"use client";

import Link from "next/link";
import { useState } from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  gregorianToJalali,
  jalaliToGregorianDate,
  formatJalaliDate,
  isValidJalaliDate,
} from "@/src/lib/utils/jalali";

import { useOrders } from "@/src/lib/hooks/useOrders";

type OrderStatus =
  | "draft"
  | "confirmed"
  | "cancelled";

function toPersianDigits(
  value: string | number
): string {
  const digits = "۰۱۲۳۴۵۶۷۸۹";

  return String(value).replace(
    /\d/g,
    (digit) => digits[Number(digit)]
  );
}

function formatNumber(
  value: number
): string {
  if (!Number.isFinite(value)) {
    return "۰";
  }

  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getStatusLabel(
  status: string
): string {
  const labels: Record<
    string,
    string
  > = {
    draft: "پیش‌نویس",
    confirmed: "تأیید شده",
    cancelled: "لغو شده",
  };

  return labels[status] ?? status;
}

function getStatusClass(
  status: string
): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";

    case "cancelled":
      return "bg-red-50 text-red-700 ring-1 ring-red-100";

    case "draft":
    default:
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
  }
}

function getStatusIcon(
  status: string
): string {
  switch (status) {
    case "confirmed":
      return "✓";

    case "cancelled":
      return "×";

    case "draft":
    default:
      return "•";
  }
}

function getSourceLabel(
  source:
    | string
    | null
    | undefined
): string {
  const labels: Record<
    string,
    string
  > = {
    manual: "ثبت دستی",
    mobile_app: "اپلیکیشن موبایل",
    whatsapp: "واتساپ",
    sms: "پیامک",
    pwa: "PWA",
    api: "API",
  };

  if (!source) {
    return "—";
  }

  return labels[source] ?? source;
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">
            {label}
          </p>

          <p className="mt-1 truncate text-sm font-black text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
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

  const order =
    orders.find(
      (item) =>
        item.id === orderId
    ) ?? null;

  const currentJalaliDate =
    order
      ? gregorianToJalali(
          order.order_date
        )
      : null;

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

  const [
    status,
    setStatus,
  ] = useState<
    "" |
    "draft" |
    "confirmed" |
    "cancelled"
  >("");

  const [
    totalTonnage,
    setTotalTonnage,
  ] = useState("");

  const [notes, setNotes] =
    useState("");

  const displayJalaliYear =
    jalaliYear ||
    (currentJalaliDate
      ? String(
          currentJalaliDate.year
        )
      : "");

  const displayJalaliMonth =
    jalaliMonth ||
    (currentJalaliDate
      ? String(
          currentJalaliDate.month
        )
      : "1");

  const displayJalaliDay =
    jalaliDay ||
    (currentJalaliDate
      ? String(
          currentJalaliDate.day
        )
      : "1");

  const displayStatus =
    status ||
    (order?.status as OrderStatus | undefined) ||
    "draft";

  const displayTotalTonnage =
    totalTonnage ||
    (order
      ? String(
          order.total_tonnage ?? ""
        )
      : "");

  const displayNotes =
    notes !== ""
      ? notes
      : order?.notes ?? "";

  async function handleSave() {
    if (!order) {
      return;
    }

    setSaving(true);
    setMessage("");
    setFormError("");

    try {
      const year =
        Number(
          displayJalaliYear
        );

      const month =
        Number(
          displayJalaliMonth
        );

      const day =
        Number(
          displayJalaliDay
        );

      const jalaliDate = {
        year,
        month,
        day,
      };

      if (
        !isValidJalaliDate(
          jalaliDate
        )
      ) {
        throw new Error(
          "تاریخ جلالی واردشده معتبر نیست."
        );
      }

      const normalizedTonnage =
        displayTotalTonnage.replace(
          ",",
          "."
        );

      const tonnage =
        Number(
          normalizedTonnage
        );

      if (
        !Number.isFinite(
          tonnage
        ) ||
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

      await updateOrder(
        order.id,
        {
          order_date:
            gregorianDate,
          status:
            displayStatus,
          total_tonnage:
            tonnage,
          notes:
            displayNotes.trim() ||
            null,
        }
      );

      setJalaliYear("");
      setJalaliMonth("");
      setJalaliDay("");
      setStatus("");
      setTotalTonnage("");
      setNotes("");

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

  async function handleDelete() {
    if (!order) {
      return;
    }

    const confirmed =
      window.confirm(
        "آیا از حذف این سفارش مطمئن هستید؟"
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setFormError("");

    try {
      await deleteOrder(
        order.id
      );

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

  if (loading) {
    return (
      <div
        dir="rtl"
        className="mx-auto max-w-6xl p-4 md:p-6"
      >
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-slate-900 via-violet-600 to-blue-600" />

          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              📦
            </div>

            <p className="mt-4 text-sm font-medium text-slate-500">
              در حال دریافت اطلاعات سفارش...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        dir="rtl"
        className="mx-auto max-w-6xl p-4 md:p-6"
      >
        <div className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm">
          <div className="h-1.5 bg-red-500" />

          <div className="p-6 md:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-600">
              !
            </div>

            <h1 className="mt-5 text-xl font-black text-slate-900">
              خطا در دریافت سفارش
            </h1>

            <p className="mt-2 text-sm leading-7 text-red-600">
              {error}
            </p>

            <Link
              href="/orders"
              className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              بازگشت به سفارش‌ها
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div
        dir="rtl"
        className="mx-auto max-w-6xl p-4 md:p-6"
      >
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
            📭
          </div>

          <h1 className="mt-5 text-xl font-black text-slate-900">
            سفارش پیدا نشد
          </h1>

          <p className="mt-2 text-sm leading-7 text-slate-500">
            سفارش موردنظر وجود ندارد یا قبلاً حذف شده است.
          </p>

          <Link
            href="/orders"
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
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
      className="mx-auto max-w-6xl space-y-6 p-4 pb-12 md:p-6"
    >
      {/* =====================================================
          HEADER
          ===================================================== */}

      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-slate-900 via-violet-600 to-blue-600" />

        <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-violet-100/40 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-blue-100/40 blur-3xl" />

        <div className="relative p-6 md:p-8">
          <Link
            href="/orders"
            className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            ← بازگشت به سفارش‌ها
          </Link>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-violet-600 text-2xl text-white shadow-lg shadow-violet-100">
                📦
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                    جزئیات سفارش
                  </h1>

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
                </div>

                <p className="mt-2 break-all text-xs text-slate-400">
                  شناسه سفارش: {order.id}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/customers/${order.customer_id}`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                مشاهده مشتری
              </Link>

              <Link
                href="/orders"
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                فهرست سفارش‌ها
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          MESSAGES
          ===================================================== */}

      {message && (
        <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
          <div className="h-1 bg-emerald-500" />

          <div className="flex items-start gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              ✓
            </div>

            <div>
              <p className="font-bold text-emerald-800">
                عملیات موفق
              </p>

              <p className="mt-1 text-sm text-emerald-600">
                {message}
              </p>
            </div>
          </div>
        </div>
      )}

      {formError && (
        <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
          <div className="h-1 bg-red-500" />

          <div className="flex items-start gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              !
            </div>

            <div>
              <p className="font-bold text-red-800">
                خطا
              </p>

              <p className="mt-1 text-sm leading-6 text-red-600">
                {formError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          CUSTOMER + SALES USER
          ===================================================== */}

      <section className="grid gap-6 lg:grid-cols-2">
        {/* Customer */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-600">
                مشتری
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-900">
                اطلاعات مشتری
              </h2>
            </div>

            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-xl">
              👤
            </span>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white shadow-sm">
                {order.customer?.name?.charAt(
                  0
                ) || "م"}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/customers/${order.customer_id}`}
                    className="truncate text-lg font-black text-slate-900 transition hover:text-blue-600"
                  >
                    {order.customer?.name ??
                      "مشتری نامشخص"}
                  </Link>

                  {order.customer?.customer_type && (
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                      {order.customer.customer_type ===
                      "plasterer"
                        ? "گچ‌کار"
                        : order.customer.customer_type ===
                          "plaster_worker"
                        ? "گچ‌کار"
                        : order.customer.customer_type ===
                          "building_material_store"
                        ? "مصالح‌فروشی"
                        : order.customer.customer_type}
                    </span>
                  )}
                </div>

                {order.customer?.phone && (
                  <p
                    dir="ltr"
                    className="mt-2 text-sm text-slate-500"
                  >
                    {order.customer.phone}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sales User */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-violet-600">
                مسئول فروش
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-900">
                اطلاعات بازاریاب
              </h2>
            </div>

            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-xl">
              👨‍💼
            </span>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 to-white p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-lg font-black text-white shadow-sm">
                {order.sales_user?.full_name?.charAt(
                  0
                ) || "ب"}
              </div>

              <div className="min-w-0">
                <p className="text-lg font-black text-slate-900">
                  {order.sales_user?.full_name ??
                    "بازاریاب نامشخص"}
                </p>

                {order.sales_user?.job_title && (
                  <p className="mt-1 text-sm text-slate-500">
                    {order.sales_user.job_title}
                  </p>
                )}

                {order.sales_user?.phone && (
                  <p
                    dir="ltr"
                    className="mt-2 text-sm text-slate-500"
                  >
                    {order.sales_user.phone}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          ORDER SUMMARY
          ===================================================== */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
        <div className="mb-6">
          <p className="text-xs font-bold text-slate-400">
            خلاصه
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-900">
            اطلاعات اصلی سفارش
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            label="تاریخ سفارش"
            value={formatJalaliDate(
              order.order_date
            )}
            icon="📅"
          />

          <InfoCard
            label="تناژ سفارش"
            value={`${formatNumber(
              Number(
                order.total_tonnage ?? 0
              )
            )} تن`}
            icon="⚖️"
          />

          <InfoCard
            label="وضعیت"
            value={getStatusLabel(
              order.status
            )}
            icon="◉"
          />

          <InfoCard
            label="منبع سفارش"
            value={getSourceLabel(
              order.source
            )}
            icon="↗"
          />
        </div>
      </section>

      {/* =====================================================
          EDIT ORDER
          ===================================================== */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
        <div className="mb-6">
          <p className="text-xs font-bold text-blue-600">
            ویرایش
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-900">
            ویرایش اطلاعات سفارش
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            در صورت نیاز تاریخ، وضعیت، تناژ و توضیحات سفارش را اصلاح کنید.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Date */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
            <label className="mb-4 block text-sm font-bold text-slate-700">
              تاریخ سفارش
            </label>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="jalali-year"
                  className="mb-2 block text-xs font-bold text-slate-400"
                >
                  سال
                </label>

                <input
                  id="jalali-year"
                  type="text"
                  inputMode="numeric"
                  value={toPersianDigits(
                    displayJalaliYear
                  )}
                  onChange={(event) => {
                    const value =
                      event.target.value.replace(
                        /[۰-۹]/g,
                        (digit) =>
                          String(
                            "۰۱۲۳۴۵۶۷۸۹".indexOf(
                              digit
                            )
                          )
                      );

                    setJalaliYear(
                      value.replace(
                        /[^\d]/g,
                        ""
                      )
                    );
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label
                  htmlFor="jalali-month"
                  className="mb-2 block text-xs font-bold text-slate-400"
                >
                  ماه
                </label>

                <select
                  id="jalali-month"
                  value={
                    displayJalaliMonth
                  }
                  onChange={(event) =>
                    setJalaliMonth(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                >
                  {Array.from(
                    {
                      length: 12,
                    },
                    (_, index) => {
                      const value =
                        index + 1;

                      return (
                        <option
                          key={value}
                          value={value}
                        >
                          {formatNumber(
                            value
                          )}
                        </option>
                      );
                    }
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="jalali-day"
                  className="mb-2 block text-xs font-bold text-slate-400"
                >
                  روز
                </label>

                <select
                  id="jalali-day"
                  value={
                    displayJalaliDay
                  }
                  onChange={(event) =>
                    setJalaliDay(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                >
                  {Array.from(
                    {
                      length: 31,
                    },
                    (_, index) => {
                      const value =
                        index + 1;

                      return (
                        <option
                          key={value}
                          value={value}
                        >
                          {formatNumber(
                            value
                          )}
                        </option>
                      );
                    }
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="order-status"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              وضعیت سفارش
            </label>

            <select
              id="order-status"
              value={displayStatus}
              onChange={(event) =>
                setStatus(
                  event.target.value as
                    | "draft"
                    | "confirmed"
                    | "cancelled"
                )
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            >
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

          {/* Tonnage */}
          <div>
            <label
              htmlFor="total-tonnage"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              تناژ سفارش
            </label>

            <div className="relative">
              <input
                id="total-tonnage"
                type="number"
                min="0.01"
                step="0.01"
                value={
                  displayTotalTonnage
                }
                onChange={(event) =>
                  setTotalTonnage(
                    event.target.value
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 pl-16 text-lg font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />

              <span className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg bg-slate-200 px-2 py-1 text-sm font-bold text-slate-500">
                تن
              </span>
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              منبع سفارش
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-700">
              {getSourceLabel(
                order.source
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-6">
          <label
            htmlFor="order-notes"
            className="mb-2 block text-sm font-bold text-slate-700"
          >
            توضیحات
          </label>

          <textarea
            id="order-notes"
            value={displayNotes}
            onChange={(event) =>
              setNotes(
                event.target.value
              )
            }
            rows={5}
            placeholder="توضیحات سفارش..."
            className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
          />
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={
              handleDelete
            }
            disabled={
              deleting ||
              saving
            }
            className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting
              ? "در حال حذف..."
              : "حذف سفارش"}
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/orders"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              انصراف
            </Link>

            <button
              type="button"
              onClick={
                handleSave
              }
              disabled={
                saving ||
                deleting
              }
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-7 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "در حال ذخیره..."
                : "ذخیره تغییرات"}
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================
          SYSTEM INFO
          ===================================================== */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <p className="text-xs font-bold text-slate-400">
            سیستم
          </p>

          <h2 className="mt-1 text-lg font-black text-slate-900">
            اطلاعات سیستمی
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard
            label="ایجاد شده در"
            value={formatJalaliDate(
              order.created_at
            )}
            icon="＋"
          />

          <InfoCard
            label="آخرین بروزرسانی"
            value={formatJalaliDate(
              order.updated_at
            )}
            icon="↻"
          />

          <InfoCard
            label="نسخه همگام‌سازی"
            value={formatNumber(
              Number(
                order.sync_version ?? 0
              )
            )}
            icon="⇄"
          />
        </div>
      </section>
    </div>
  );
}
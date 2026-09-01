"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Package,
  RefreshCw,
  Trash2,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  formatJalaliDate,
  getTodayJalali,
  gregorianToJalali,
  isValidJalaliDate,
  jalaliToGregorianDate,
} from "@/src/lib/utils/jalali";

import {
  useOrders,
} from "@/src/lib/hooks/useOrders";

import {
  waybillsService,
} from "@/src/lib/services/waybills";

import type {
  Waybill,
} from "@/src/lib/types/waybill";

import type {
  OrderWithRelations,
  UpdateOrderInput,
} from "@/src/lib/services/orders";

import type {
  OrderItem,
} from "@/src/lib/types/order";

type OrderStatus =
  | "draft"
  | "confirmed"
  | "cancelled";

function formatNumber(
  value: number
): string {
  if (!Number.isFinite(value)) {
    return "۰";
  }

  return new Intl.NumberFormat(
    "fa-IR",
    {
      maximumFractionDigits: 2,
    }
  ).format(value);
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
) {
  switch (status) {
    case "confirmed":
      return (
        <CheckCircle2
          size={15}
        />
      );

    case "cancelled":
      return (
        <XCircle
          size={15}
        />
      );

    case "draft":
    default:
      return (
        <FileText
          size={15}
        />
      );
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

function getCustomerTypeLabel(
  value:
    | string
    | null
    | undefined
): string {
  if (!value) {
    return "—";
  }

  const labels: Record<
    string,
    string
  > = {
    building_material_store:
      "مصالح‌فروشی",
    building_material_stores:
      "مصالح‌فروشی",
    contractor:
      "پیمانکار",
    contractor_company:
      "پیمانکار",
    employer:
      "کارفرما",
    employers:
      "کارفرما",
    plasterer:
      "گچ‌کار",
    plaster_worker:
      "گچ‌کار",
    plasterer_company:
      "گچ‌کار",
    distributor:
      "توزیع‌کننده",
    retailer:
      "خرده‌فروشی",
  };

  return (
    labels[value] ??
    value
  );
}

function getWaybillStatusLabel(
  status: string
): string {
  switch (status) {
    case "draft":
      return "پیش‌نویس";

    case "issued":
      return "صادر شده";

    case "loading_confirmed":
      return "بارگیری تأیید شده";

    case "cancelled":
      return "لغو شده";

    default:
      return status;
  }
}

function getWaybillStatusClass(
  status: string
): string {
  switch (status) {
    case "issued":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-100";

    case "loading_confirmed":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";

    case "cancelled":
      return "bg-red-50 text-red-700 ring-1 ring-red-100";

    case "draft":
    default:
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
  }
}

function getLoadingStatusLabel(
  status:
    | string
    | null
    | undefined
): string {
  switch (status) {
    case "confirmed":
      return "بارگیری تأیید شده";

    case "cancelled":
      return "بارگیری لغو شده";

    case "pending":
      return "در انتظار بارگیری";

    default:
      return "ثبت نشده";
  }
}

function InfoCard({
  label,
  value,
  icon,
  tone = "slate",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?:
    | "slate"
    | "blue"
    | "emerald"
    | "violet";
}) {
  const toneClasses = {
    slate:
      "bg-slate-100 text-slate-700",
    blue:
      "bg-blue-50 text-blue-700",
    emerald:
      "bg-emerald-50 text-emerald-700",
    violet:
      "bg-violet-50 text-violet-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 transition hover:bg-white hover:shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClasses[tone]}`}
        >
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

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      {eyebrow && (
        <p className="text-xs font-bold text-blue-600">
          {eyebrow}
        </p>
      )}

      <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">
        {title}
      </h2>

      {description && (
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

function ProductItemCard({
  item,
  index,
}: {
  item: OrderItem;
  index: number;
}) {
  const quantity =
    Number(
      item.quantity ?? 0
    );

  const weight =
    Number(
      item.weight_kg_snapshot ??
        item.bag_weight_kg ??
        0
    );

  const tonnage =
    Number(
      item.tonnage ?? 0
    );

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 transition hover:bg-white hover:shadow-sm">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-sm font-black text-white shadow-sm">
            {formatNumber(
              index + 1
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-black text-slate-900">
                {item.product_name_snapshot ||
                  "بدون نام کالا"}
              </h3>

              {item.product_id && (
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-400 ring-1 ring-slate-200">
                  محصول ثبت‌شده
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-slate-400">
              تعداد کیسه
            </p>

            <p className="mt-1 text-lg font-black text-slate-900">
              {formatNumber(
                quantity
              )}{" "}
              <span className="text-xs font-bold text-slate-400">
                کیسه
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-slate-400">
              وزن هر کیسه
            </p>

            <p className="mt-1 text-lg font-black text-slate-900">
              {formatNumber(
                weight
              )}{" "}
              <span className="text-xs font-bold text-slate-400">
                کیلو
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-bold text-blue-500">
              وزن کل
            </p>

            <p className="mt-1 text-lg font-black text-blue-800">
              {formatNumber(
                quantity *
                  weight
              )}{" "}
              <span className="text-xs font-bold">
                کیلو
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-bold text-emerald-600">
              تناژ این قلم
            </p>

            <p className="mt-1 text-lg font-black text-emerald-800">
              {formatNumber(
                tonnage
              )}{" "}
              <span className="text-xs font-bold">
                تن
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            محاسبه:
            {" "}
            {formatNumber(
              quantity
            )}
            {" × "}
            {formatNumber(
              weight
            )}
            {" ÷ ۱۰۰۰"}
          </p>

          <p className="text-sm font-black text-emerald-700">
            {formatNumber(
              tonnage
            )}{" "}
            تن
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailsPage() {
  const params =
    useParams();

  const router =
    useRouter();

  const orderId =
    typeof params.id ===
    "string"
      ? params.id
      : "";

  const {
    data: orders,
    loading,
    error,
    updateOrder,
    deleteOrder,
    refresh,
  } = useOrders();

  const order =
    (
      orders.find(
        (item) =>
          item.id ===
          orderId
      ) as
        | OrderWithRelations
        | undefined
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

  const [waybillLoading, setWaybillLoading] =
    useState(false);

  const [waybillCreating, setWaybillCreating] =
    useState(false);

  const [waybills, setWaybills] =
    useState<Waybill[]>([]);

  const [message, setMessage] =
    useState("");

  const [formError, setFormError] =
    useState("");

  const [
    jalaliYear,
    setJalaliYear,
  ] = useState("");

  const [
    jalaliMonth,
    setJalaliMonth,
  ] = useState("");

  const [
    jalaliDay,
    setJalaliDay,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState<
    | ""
    | "draft"
    | "confirmed"
    | "cancelled"
  >("");

  const [
    notes,
    setNotes,
  ] = useState("");

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
    (order?.status as
      | OrderStatus
      | undefined) ||
    "draft";

  const displayNotes =
    notes !== ""
      ? notes
      : order?.notes ??
        "";

  const orderItems =
    (
      order?.items ??
      []
    ).filter(
      (item) =>
        !item.deleted_at
    );

  const calculatedItemsTonnage =
    orderItems.reduce(
      (sum, item) =>
        sum +
        Number(
          item.tonnage ?? 0
        ),
      0
    );

  const canIssueWaybill =
    Boolean(
      order &&
        order.status ===
          "confirmed" &&
        orderItems.length >
          0 &&
        waybills.length === 0
    );

  async function loadOrderWaybills() {
    if (!orderId) {
      return;
    }

    setWaybillLoading(
      true
    );

    try {
      const result =
        await waybillsService.getByOrderId(
          orderId
        );

      setWaybills(
        result
      );
    } catch (err) {
      console.error(
        "ORDER WAYBILLS LOAD:",
        err
      );

      setWaybills([]);
    } finally {
      setWaybillLoading(
        false
      );
    }
  }

  useEffect(() => {
    void loadOrderWaybills();
  }, [orderId]);

  async function handleIssueWaybill() {
    if (!order) {
      return;
    }

    if (order.status !== "confirmed") {
      setFormError(
        "فقط سفارش‌های تأییدشده امکان صدور حواله دارند."
      );
      return;
    }

    if (orderItems.length === 0) {
      setFormError(
        "این سفارش هیچ قلم فعال کالایی برای صدور حواله ندارد."
      );
      return;
    }

    if (waybills.length > 0) {
      setFormError(
        "برای این سفارش قبلاً حواله فعال صادر شده است."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "آیا از صدور حواله برای این سفارش مطمئن هستید؟"
      );

    if (!confirmed) {
      return;
    }

    setWaybillCreating(
      true
    );
    setMessage("");
    setFormError("");

    try {
      const today =
        getTodayJalali();

      const waybill =
        await waybillsService.create(
          {
            order_id:
              order.id,
            waybill_date:
              jalaliToGregorianDate(
                today
              ),
            notes:
              displayNotes.trim() ||
              null,
          }
        );

      setMessage(
        `حواله شماره ${formatNumber(
          Number(
            waybill.waybill_number
          )
        )} با موفقیت صادر شد.`
      );

      await loadOrderWaybills();

      window.setTimeout(
        () => {
          setMessage("");
        },
        4000
      );
    } catch (err) {
      console.error(
        "ORDER ISSUE WAYBILL:",
        err
      );

      setFormError(
        err instanceof Error
          ? err.message
          : "خطا در صدور حواله."
      );
    } finally {
      setWaybillCreating(
        false
      );
    }
  }

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

      const gregorianDate =
        jalaliToGregorianDate(
          jalaliDate
        );

      const payload:
        UpdateOrderInput =
        {
          order_date:
            gregorianDate,
          status:
            displayStatus,
          notes:
            displayNotes.trim() ||
            null,
        };

      await updateOrder(
        order.id,
        payload
      );

      setJalaliYear("");
      setJalaliMonth("");
      setJalaliDay("");
      setStatus("");
      setNotes("");

      setMessage(
        "اطلاعات سفارش با موفقیت ذخیره شد."
      );

      await loadOrderWaybills();

      window.setTimeout(
        () => {
          setMessage("");
        },
        3000
      );
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

      router.push(
        "/orders"
      );
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
      <main
        dir="rtl"
        className="mx-auto max-w-[1300px]"
      >
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 animate-pulse bg-gradient-to-r from-slate-900 via-violet-600 to-blue-600" />

          <div className="p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100">
              <Package
                size={28}
                className="animate-pulse text-slate-400"
              />
            </div>

            <p className="mt-5 text-sm font-bold text-slate-600">
              در حال دریافت اطلاعات سفارش...
            </p>

            <div className="mx-auto mt-5 h-2 w-52 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-500" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main
        dir="rtl"
        className="mx-auto max-w-[1300px]"
      >
        <section className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm">
          <div className="h-1.5 bg-red-500" />

          <div className="p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <XCircle size={25} />
            </div>

            <h1 className="mt-5 text-2xl font-black text-slate-900">
              خطا در دریافت سفارش
            </h1>

            <p className="mt-2 text-sm leading-7 text-red-600">
              {error}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  void refresh()
                }
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-blue-600"
              >
                <RefreshCw size={16} />
                تلاش مجدد
              </button>

              <Link
                href="/orders"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                بازگشت
                <ArrowLeft size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!order) {
    return (
      <main
        dir="rtl"
        className="mx-auto max-w-[1300px]"
      >
        <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
            <Package size={28} />
          </div>

          <h1 className="mt-5 text-2xl font-black text-slate-900">
            سفارش پیدا نشد
          </h1>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-slate-500">
            سفارش موردنظر وجود ندارد یا قبلاً حذف شده است.
          </p>

          <Link
            href="/orders"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-blue-600"
          >
            بازگشت به سفارش‌ها
            <ArrowLeft size={16} />
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="mx-auto max-w-[1300px] space-y-6 pb-14"
    >
      {/* Header */}

      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-slate-900 via-violet-600 to-blue-600" />

        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-100/40 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl" />

        <div className="relative p-6 md:p-8">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-blue-600"
          >
            <ArrowLeft size={16} />
            بازگشت به سفارش‌ها
          </Link>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-15 w-15 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-slate-900 to-violet-600 text-white shadow-lg">
                <Package size={28} />
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
                    {getStatusIcon(
                      order.status
                    )}

                    {getStatusLabel(
                      order.status
                    )}
                  </span>
                </div>

                <p className="mt-2 break-all text-xs text-slate-400">
                  شناسه سفارش:
                  {" "}
                  {order.id}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/customers/${order.customer_id}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <UserRound size={16} />
                مشاهده مشتری
              </Link>

              {waybills.length > 0 && (
                <Link
                  href={`/waybills/${waybills[0].id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700"
                >
                  <Truck size={16} />
                  مشاهده حواله
                </Link>
              )}

              {canIssueWaybill && (
                <button
                  type="button"
                  onClick={() =>
                    void handleIssueWaybill()
                  }
                  disabled={
                    waybillCreating ||
                    waybillLoading
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {waybillCreating ? (
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Truck size={16} />
                  )}

                  {waybillCreating
                    ? "در حال صدور حواله..."
                    : "صدور حواله"}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  void refresh();
                  void loadOrderWaybills();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw size={16} />
                بروزرسانی
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Messages */}

      {message && (
        <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
          <div className="h-1 bg-emerald-500" />

          <div className="flex items-start gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={18} />
            </div>

            <div>
              <p className="font-black text-emerald-800">
                عملیات موفق
              </p>

              <p className="mt-1 text-sm text-emerald-600">
                {message}
              </p>
            </div>
          </div>
        </section>
      )}

      {formError && (
        <section className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
          <div className="h-1 bg-red-500" />

          <div className="flex items-start gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <XCircle size={18} />
            </div>

            <div>
              <p className="font-black text-red-800">
                خطا در عملیات
              </p>

              <p className="mt-1 text-sm leading-6 text-red-600">
                {formError}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Customer / Sales */}

      <section className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
          <SectionTitle
            eyebrow="مشتری"
            title="اطلاعات مشتری"
            description="مشتری مرتبط با این سفارش"
          />

          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white">
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
                      {getCustomerTypeLabel(
                        order.customer.customer_type
                      )}
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
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
          <SectionTitle
            eyebrow="مسئول فروش"
            title="اطلاعات بازاریاب"
            description="بازاریاب ثبت‌کننده سفارش"
          />

          <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-lg font-black text-white">
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
        </section>
      </section>

      {/* Main summary */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
        <SectionTitle
          eyebrow="خلاصه سفارش"
          title="اطلاعات اصلی سفارش"
          description="مشخصات اصلی و وضعیت فعلی سفارش"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            label="تاریخ سفارش"
            value={formatJalaliDate(
              order.order_date
            )}
            icon={
              <CalendarDays
                size={19}
              />
            }
            tone="blue"
          />

          <InfoCard
            label="تعداد اقلام"
            value={`${formatNumber(
              orderItems.length
            )} قلم`}
            icon={
              <Package size={19} />
            }
            tone="violet"
          />

          <InfoCard
            label="تناژ کل"
            value={`${formatNumber(
              Number(
                order.total_tonnage ??
                  0
              )
            )} تن`}
            icon={
              <CheckCircle2
                size={19}
              />
            }
            tone="emerald"
          />

          <InfoCard
            label="منبع سفارش"
            value={getSourceLabel(
              order.source
            )}
            icon={
              <FileText size={19} />
            }
            tone="slate"
          />
        </div>
      </section>

      {/* Order items */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle
            eyebrow="اقلام سفارش"
            title="کالاهای این سفارش"
            description="جزئیات هر محصول، وزن کیسه، تعداد کیسه و تناژ محاسبه‌شده"
          />

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3">
            <p className="text-xs font-bold text-emerald-600">
              مجموع تناژ اقلام
            </p>

            <p className="mt-1 text-xl font-black text-emerald-800">
              {formatNumber(
                calculatedItemsTonnage
              )}{" "}
              تن
            </p>
          </div>
        </div>

        {orderItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
              <Package size={24} />
            </div>

            <h3 className="mt-4 font-black text-slate-800">
              این سفارش هنوز قلم کالایی ندارد
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              اطلاعات اقلام این سفارش در دیتابیس ثبت نشده است.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orderItems.map(
              (
                item,
                index
              ) => (
                <ProductItemCard
                  key={
                    item.id
                  }
                  item={
                    item
                  }
                  index={
                    index
                  }
                />
              )
            )}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-white">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400">
                    جمع نهایی
                  </p>

                  <p className="mt-1 text-base font-black">
                    {formatNumber(
                      orderItems.reduce(
                        (
                          sum,
                          item
                        ) =>
                          sum +
                          Number(
                            item.quantity ??
                              0
                          ),
                        0
                      )
                    )}{" "}
                    کیسه در{" "}
                    {formatNumber(
                      orderItems.length
                    )}{" "}
                    قلم
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-6 py-4">
                  <p className="text-xs text-emerald-300">
                    تناژ نهایی سفارش
                  </p>

                  <p className="mt-1 text-3xl font-black text-emerald-200">
                    {formatNumber(
                      Number(
                        order.total_tonnage ??
                          calculatedItemsTonnage
                      )
                    )}{" "}
                    <span className="text-base">
                      تن
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Waybills */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SectionTitle
            eyebrow="ارسال و بارگیری"
            title="وضعیت حواله"
            description="حواله‌های مرتبط با این سفارش و وضعیت بارگیری آنها"
          />

          {waybills.length > 0 && (
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
              <Truck size={14} />
              {formatNumber(
                waybills.length
              )}{" "}
              حواله
            </span>
          )}
        </div>

        {waybillLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
            <RefreshCw
              size={22}
              className="mx-auto animate-spin text-blue-600"
            />

            <p className="mt-3 text-sm font-bold text-slate-600">
              در حال دریافت وضعیت حواله...
            </p>
          </div>
        ) : waybills.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
              <Truck size={24} />
            </div>

            <h3 className="mt-4 font-black text-slate-800">
              هنوز حواله‌ای برای این سفارش وجود ندارد
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              پس از صدور حواله، وضعیت ارسال و بارگیری آن در این بخش نمایش داده می‌شود.
            </p>

            {order.status ===
              "confirmed" &&
              orderItems.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    void handleIssueWaybill()
                  }
                  disabled={
                    waybillCreating
                  }
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {waybillCreating ? (
                    <RefreshCw
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Truck size={17} />
                  )}

                  {waybillCreating
                    ? "در حال صدور حواله..."
                    : "صدور حواله"}
                </button>
              )}
          </div>
        ) : (
          <div className="space-y-4">
            {waybills.map(
              (waybill) => {
                const loadingStatus =
                  waybill.loading?.status ??
                  null;

                return (
                  <div
                    key={
                      waybill.id
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                          <Truck
                            size={21}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black text-slate-900">
                              حواله شماره{" "}
                              {formatNumber(
                                Number(
                                  waybill.waybill_number
                                )
                              )}
                            </h3>

                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ${getWaybillStatusClass(
                                waybill.status
                              )}`}
                            >
                              {getWaybillStatusLabel(
                                waybill.status
                              )}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-slate-500">
                            تاریخ حواله:
                            {" "}
                            <span className="font-black text-slate-700">
                              {formatJalaliDate(
                                waybill.waybill_date
                              )}
                            </span>
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            وضعیت بارگیری:
                            {" "}
                            <span className="font-black text-slate-700">
                              {getLoadingStatusLabel(
                                loadingStatus
                              )}
                            </span>
                          </p>

                          {waybill.loading?.loading_date && (
                            <p className="mt-1 text-sm text-slate-500">
                              تاریخ بارگیری:
                              {" "}
                              <span className="font-black text-slate-700">
                                {formatJalaliDate(
                                  waybill.loading.loading_date
                                )}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Link
                          href={`/waybills/${waybill.id}`}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-600"
                        >
                          جزئیات حواله
                          <ArrowLeft
                            size={16}
                          />
                        </Link>

                        <Link
                          href={`/orders/${order.id}`}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          سفارش
                          <Package
                            size={15}
                          />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* Edit order */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
        <SectionTitle
          eyebrow="ویرایش"
          title="ویرایش اطلاعات سفارش"
          description="تاریخ، وضعیت و توضیحات سفارش را اصلاح کنید."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Date */}

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <CalendarDays size={18} />
              </div>

              <div>
                <p className="text-sm font-black text-slate-800">
                  تاریخ سفارش
                </p>

                <p className="mt-0.5 text-xs text-slate-400">
                  تقویم جلالی
                </p>
              </div>
            </div>

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
                  value={
                    displayJalaliYear
                  }
                  onChange={(
                    event
                  ) => {
                    const value =
                      event.target.value
                        .replace(
                          /[۰-۹]/g,
                          (
                            digit
                          ) =>
                            String(
                              "۰۱۲۳۴۵۶۷۸۹".indexOf(
                                digit
                              )
                            )
                        )
                        .replace(
                          /[^\d]/g,
                          ""
                        );

                    setJalaliYear(
                      value
                    );
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm font-black text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
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
                  onChange={(
                    event
                  ) =>
                    setJalaliMonth(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                >
                  {Array.from(
                    {
                      length: 12,
                    },
                    (
                      _,
                      index
                    ) => {
                      const value =
                        index + 1;

                      return (
                        <option
                          key={
                            value
                          }
                          value={
                            value
                          }
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
                  onChange={(
                    event
                  ) =>
                    setJalaliDay(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                >
                  {Array.from(
                    {
                      length: 31,
                    },
                    (
                      _,
                      index
                    ) => {
                      const value =
                        index + 1;

                      return (
                        <option
                          key={
                            value
                          }
                          value={
                            value
                          }
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

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
            <label
              htmlFor="order-status"
              className="mb-3 block text-sm font-bold text-slate-700"
            >
              وضعیت سفارش
            </label>

            <select
              id="order-status"
              value={
                displayStatus
              }
              onChange={(
                event
              ) =>
                setStatus(
                  event.target
                    .value as OrderStatus
                )
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
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

            <div
              className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClass(
                displayStatus
              )}`}
            >
              {getStatusIcon(
                displayStatus
              )}

              وضعیت فعلی:
              {" "}
              {getStatusLabel(
                displayStatus
              )}
            </div>
          </div>

          {/* Tonnage */}

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
                <Package size={18} />
              </div>

              <div>
                <p className="text-sm font-black text-slate-800">
                  تناژ سفارش
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  محاسبه‌شده از اقلام سفارش
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-5">
              <p className="text-3xl font-black text-emerald-800">
                {formatNumber(
                  Number(
                    order.total_tonnage ??
                      calculatedItemsTonnage
                  )
                )}{" "}
                <span className="text-base">
                  تن
                </span>
              </p>

              <p className="mt-2 text-xs leading-6 text-slate-400">
                این مقدار توسط اقلام سفارش و Trigger دیتابیس مدیریت می‌شود.
              </p>
            </div>
          </div>

          {/* Source */}

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
            <label className="mb-3 block text-sm font-bold text-slate-700">
              منبع سفارش
            </label>

            <div className="flex min-h-[58px] items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700">
              <FileText
                size={17}
                className="ml-2 text-slate-400"
              />

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
            className="mb-3 block text-sm font-bold text-slate-700"
          >
            توضیحات سفارش
          </label>

          <textarea
            id="order-notes"
            value={
              displayNotes
            }
            onChange={(
              event
            ) =>
              setNotes(
                event.target.value
              )
            }
            rows={5}
            placeholder="توضیحات مربوط به سفارش..."
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
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? (
              <>
                <RefreshCw
                  size={16}
                  className="animate-spin"
                />
                در حال حذف...
              </>
            ) : (
              <>
                <Trash2
                  size={16}
                />
                حذف سفارش
              </>
            )}
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/orders"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
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
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-7 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw
                    size={16}
                    className="animate-spin"
                  />
                  در حال ذخیره...
                </>
              ) : (
                <>
                  <CheckCircle2
                    size={17}
                  />
                  ذخیره تغییرات
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* System info */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
        <SectionTitle
          eyebrow="سیستم"
          title="اطلاعات سیستمی"
          description="اطلاعات ثبت و بروزرسانی سفارش"
        />

        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard
            label="ایجاد شده در"
            value={formatJalaliDate(
              order.created_at
            )}
            icon={
              <CalendarDays
                size={19}
              />
            }
            tone="slate"
          />

          <InfoCard
            label="آخرین بروزرسانی"
            value={formatJalaliDate(
              order.updated_at
            )}
            icon={
              <RefreshCw
                size={19}
              />
            }
            tone="blue"
          />

          <InfoCard
            label="نسخه همگام‌سازی"
            value={formatNumber(
              Number(
                order.sync_version ??
                  0
              )
            )}
            icon={
              <ClipboardList
                size={19}
              />
            }
            tone="violet"
          />
        </div>
      </section>
    </main>
  );
}
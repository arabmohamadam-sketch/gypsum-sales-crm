"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronLeft,
  Clock3,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  Phone,
  ShoppingCart,
  Star,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { activitiesService } from "@/src/lib/services/activities";

import type {
  CallWithRelations,
  FollowUpWithRelations,
} from "@/src/lib/services/activities";

import { customersService } from "@/src/lib/services/customers";

import type { Customer } from "@/src/lib/types/customer";

import {
  ordersService,
  type OrderWithRelations,
} from "@/src/lib/services/orders";

import { formatJalaliDateTime } from "@/src/lib/utils/jalali";

interface CustomerPageProps {
  customerId: string;
}

const customerTypeLabels: Record<string, string> = {
  building_material_store: "مصالح‌فروشی",
  contractor: "پیمانکار",
  employer: "کارفرما",
  plasterer: "گچ‌کار",
  plaster_worker: "گچ‌کار",
  distributor: "توزیع‌کننده",
  retailer: "خرده‌فروشی",
};

const cityNames: Record<string, string> = {
  Garmsar: "گرمسار",
  garmsar: "گرمسار",

  Semnan: "سمنان",
  semnan: "سمنان",

  Varamin: "ورامین",
  varamin: "ورامین",

  Chalous: "چالوس",
  Chalus: "چالوس",
  chalous: "چالوس",

  Kelardasht: "کلاردشت",
  kelardasht: "کلاردشت",

  Ramsar: "رامسر",
  ramsar: "رامسر",

  Tonekabon: "تنکابن",
  tonekabon: "تنکابن",
};

function getCustomerTypeLabel(
  type?: string | null
): string {
  if (!type) {
    return "—";
  }

  return (
    customerTypeLabels[type] ??
    type
  );
}

function getCityName(
  customer: Customer
): string {
  const customerWithCity =
    customer as Customer & {
      city?: {
        id?: string;
        name?: string;
        code?: string | null;
      } | null;
    };

  const city =
    customerWithCity.city;

  if (city?.name) {
    return (
      cityNames[city.name] ??
      city.name
    );
  }

  const sourceCity =
    customer.metadata?.source_city;

  if (
    typeof sourceCity === "string" &&
    sourceCity.trim()
  ) {
    return (
      cityNames[sourceCity.trim()] ??
      sourceCity.trim()
    );
  }

  return "—";
}

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

function formatTonnage(
  value: unknown
): string {
  return formatNumber(
    Number(value ?? 0)
  );
}

function formatDate(
  value?: string | null
): string {
  if (!value) {
    return "بدون فعالیت";
  }

  try {
    return formatJalaliDateTime(
      value
    );
  } catch {
    return "بدون فعالیت";
  }
}

function normalizeWhatsappNumber(
  phone: string
): string {
  let normalized = phone.replace(
    /[^\d+]/g,
    ""
  );

  if (
    normalized.startsWith("+98")
  ) {
    normalized =
      normalized.substring(1);
  }

  if (
    normalized.startsWith("0098")
  ) {
    normalized =
      normalized.substring(2);
  }

  if (normalized.startsWith("0")) {
    normalized = `98${normalized.substring(
      1
    )}`;
  }

  if (
    !normalized.startsWith("98")
  ) {
    normalized = `98${normalized}`;
  }

  return normalized;
}

function getOrderStatusLabel(
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

  return (
    labels[status] ?? status
  );
}

function getOrderStatusClass(
  status: string
): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";

    case "cancelled":
      return "bg-red-50 text-red-700 ring-1 ring-red-100";

    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
}

function getOrderSourceLabel(
  source: string | null | undefined
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

  return (
    labels[source] ?? source
  );
}

function getCallDirectionLabel(
  direction:
    | string
    | null
    | undefined
): string {
  const labels: Record<
    string,
    string
  > = {
    inbound: "تماس ورودی",
    outbound: "تماس خروجی",
  };

  if (!direction) {
    return "—";
  }

  return (
    labels[direction] ??
    direction
  );
}

function getCallOutcomeLabel(
  outcome:
    | string
    | null
    | undefined
): string {
  const labels: Record<
    string,
    string
  > = {
    answered: "پاسخ داده شد",
    connected: "پاسخ داده شد",
    no_answer: "پاسخ داده نشد",
    busy: "مشغول",
    wrong_number: "شماره اشتباه",
    voicemail: "پیام‌گیر",
    scheduled_callback:
      "درخواست تماس مجدد",
    callback_requested:
      "درخواست تماس مجدد",
  };

  if (!outcome) {
    return "—";
  }

  return (
    labels[outcome] ??
    outcome
  );
}

function formatDuration(
  seconds:
    | number
    | null
    | undefined
): string {
  const totalSeconds =
    Number(seconds ?? 0);

  if (
    !Number.isFinite(
      totalSeconds
    ) ||
    totalSeconds <= 0
  ) {
    return "—";
  }

  const minutes = Math.floor(
    totalSeconds / 60
  );

  const remainingSeconds =
    Math.floor(
      totalSeconds % 60
    );

  if (minutes === 0) {
    return `${formatNumber(
      remainingSeconds
    )} ثانیه`;
  }

  if (remainingSeconds === 0) {
    return `${formatNumber(
      minutes
    )} دقیقه`;
  }

  return `${formatNumber(
    minutes
  )} دقیقه و ${formatNumber(
    remainingSeconds
  )} ثانیه`;
}

function getPriorityClass(
  priority:
    | string
    | null
    | undefined
): string {
  switch (priority) {
    case "high":
      return "bg-red-50 text-red-700 ring-1 ring-red-100";

    case "medium":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";

    case "low":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-100";

    case "urgent":
      return "bg-red-50 text-red-700 ring-1 ring-red-100";

    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
}

function getFollowUpPriorityLabel(
  priority:
    | string
    | null
    | undefined
): string {
  const labels: Record<
    string,
    string
  > = {
    high: "بالا",
    medium: "متوسط",
    low: "پایین",
    urgent: "فوری",
  };

  if (!priority) {
    return "—";
  }

  return (
    labels[priority] ??
    priority
  );
}

function getStatusClass(
  status:
    | string
    | null
    | undefined
): string {
  switch (status) {
    case "pending":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-100";

    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";

    case "cancelled":
      return "bg-red-50 text-red-700 ring-1 ring-red-100";

    case "overdue":
      return "bg-orange-50 text-orange-700 ring-1 ring-orange-100";

    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
}

function getFollowUpStatusLabel(
  status:
    | string
    | null
    | undefined
): string {
  const labels: Record<
    string,
    string
  > = {
    pending: "در انتظار",
    completed: "انجام شده",
    cancelled: "لغو شده",
    overdue: "معوق",
  };

  if (!status) {
    return "—";
  }

  return (
    labels[status] ??
    status
  );
}

function calculateInactivityDays(
  values: Array<
    string | null | undefined
  >
): number {
  const validDates = values
    .filter(
      (
        value
      ): value is string =>
        Boolean(value)
    )
    .map(
      (value) =>
        new Date(value)
    )
    .filter(
      (date) =>
        !Number.isNaN(
          date.getTime()
        )
    );

  if (validDates.length === 0) {
    return 0;
  }

  const latestTime = Math.max(
    ...validDates.map((date) =>
      date.getTime()
    )
  );

  const now = Date.now();

  return Math.max(
    0,
    Math.floor(
      (now - latestTime) /
        (1000 *
          60 *
          60 *
          24)
    )
  );
}

export default function CustomerPage({
  customerId,
}: CustomerPageProps) {
  const router = useRouter();

  const [customer, setCustomer] =
    useState<Customer | null>(
      null
    );

  const [orders, setOrders] =
    useState<
      OrderWithRelations[]
    >([]);

  const [calls, setCalls] =
    useState<
      CallWithRelations[]
    >([]);

  const [followUps, setFollowUps] =
    useState<
      FollowUpWithRelations[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [
    activitiesLoading,
    setActivitiesLoading,
  ] = useState(true);

  const [
    ordersLoading,
    setOrdersLoading,
  ] = useState(true);

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [
    activitiesError,
    setActivitiesError,
  ] = useState<string | null>(
    null
  );

  const [
    ordersError,
    setOrdersError,
  ] = useState<string | null>(
    null
  );

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    deleteError,
    setDeleteError,
  ] = useState<string | null>(
    null
  );

  useEffect(() => {
    let mounted = true;

    async function loadCustomer() {
      if (!customerId) {
        setError(
          "شناسه مشتری مشخص نیست."
        );
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const data =
          await customersService.getById(
            customerId
          );

        if (!mounted) {
          return;
        }

        setCustomer(data);
      } catch (err) {
        console.error(
          "خطا در دریافت مشتری:",
          err
        );

        if (!mounted) {
          return;
        }

        setCustomer(null);

        setError(
          err instanceof Error
            ? err.message
            : "اطلاعات مشتری دریافت نشد."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadCustomer();

    return () => {
      mounted = false;
    };
  }, [customerId]);

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      if (!customerId) {
        setOrdersLoading(false);
        return;
      }

      try {
        setOrdersLoading(true);
        setOrdersError(null);

        const data =
          await ordersService.getByCustomerId(
            customerId
          );

        if (!mounted) {
          return;
        }

        setOrders(data);
      } catch (err) {
        console.error(
          "خطا در دریافت سوابق سفارش مشتری:",
          err
        );

        if (!mounted) {
          return;
        }

        setOrders([]);

        setOrdersError(
          err instanceof Error
            ? err.message
            : "سوابق سفارش مشتری دریافت نشد."
        );
      } finally {
        if (mounted) {
          setOrdersLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      mounted = false;
    };
  }, [customerId]);

  useEffect(() => {
    let mounted = true;

    async function loadActivities() {
      if (!customerId) {
        setActivitiesLoading(false);
        return;
      }

      try {
        setActivitiesLoading(true);
        setActivitiesError(null);

        const [
          customerCalls,
          customerFollowUps,
        ] = await Promise.all([
          activitiesService.getCallsByCustomerId(
            customerId
          ),
          activitiesService.getFollowUpsByCustomerId(
            customerId
          ),
        ]);

        if (!mounted) {
          return;
        }

        setCalls(customerCalls);

        setFollowUps(
          customerFollowUps
        );
      } catch (err) {
        console.error(
          "خطا در دریافت سوابق فعالیت مشتری:",
          err
        );

        if (!mounted) {
          return;
        }

        setCalls([]);
        setFollowUps([]);

        setActivitiesError(
          err instanceof Error
            ? err.message
            : "سوابق فعالیت مشتری دریافت نشد."
        );
      } finally {
        if (mounted) {
          setActivitiesLoading(false);
        }
      }
    }

    void loadActivities();

    return () => {
      mounted = false;
    };
  }, [customerId]);

  const confirmedOrders =
    useMemo(
      () =>
        orders.filter(
          (order) =>
            order.status ===
            "confirmed"
        ),
      [orders]
    );

  const totalOrderTonnage =
    useMemo(
      () =>
        confirmedOrders.reduce(
          (sum, order) =>
            sum +
            Number(
              order.total_tonnage ??
                0
            ),
          0
        ),
      [confirmedOrders]
    );

  const averageMonthlyTonnage =
    useMemo(() => {
      if (
        confirmedOrders.length ===
        0
      ) {
        return 0;
      }

      const months =
        new Set<string>();

      for (const order of confirmedOrders) {
        const date =
          new Date(
            order.order_date
          );

        if (
          !Number.isNaN(
            date.getTime()
          )
        ) {
          months.add(
            `${date.getFullYear()}-${date.getMonth() + 1}`
          );
        }
      }

      if (months.size === 0) {
        return 0;
      }

      return (
        totalOrderTonnage /
        months.size
      );
    }, [
      confirmedOrders,
      totalOrderTonnage,
    ]);

  const latestOrder =
    useMemo(() => {
      if (orders.length === 0) {
        return null;
      }

      return [...orders].sort(
        (a, b) =>
          new Date(
            b.order_date
          ).getTime() -
          new Date(
            a.order_date
          ).getTime()
      )[0];
    }, [orders]);

  const latestCall =
    useMemo(() => {
      if (calls.length === 0) {
        return null;
      }

      return [...calls].sort(
        (a, b) =>
          new Date(
            b.call_date
          ).getTime() -
          new Date(
            a.call_date
          ).getTime()
      )[0];
    }, [calls]);

  const latestFollowUp =
    useMemo(() => {
      if (followUps.length === 0) {
        return null;
      }

      return [...followUps].sort(
        (a, b) =>
          new Date(
            b.scheduled_at
          ).getTime() -
          new Date(
            a.scheduled_at
          ).getTime()
      )[0];
    }, [followUps]);

  const inactivityDays =
    useMemo(
      () =>
        calculateInactivityDays([
          latestOrder?.order_date,
          latestCall?.call_date,
          latestFollowUp?.scheduled_at,
        ]),
      [
        latestOrder,
        latestCall,
        latestFollowUp,
      ]
    );

  async function handleDeleteCustomer() {
    if (!customer) {
      return;
    }

    try {
      setDeleting(true);
      setDeleteError(null);

      await customersService.delete(
        customer.id
      );

      router.push("/customers");
      router.refresh();
    } catch (err) {
      console.error(
        "DELETE CUSTOMER ERROR:",
        err
      );

      setDeleteError(
        err instanceof Error
          ? err.message
          : "حذف مشتری انجام نشد."
      );

      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div
        dir="rtl"
        className="mx-auto max-w-7xl"
      >
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-2 bg-gradient-to-l from-blue-600 via-cyan-500 to-emerald-500" />

          <div className="space-y-5 p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 animate-pulse rounded-2xl bg-slate-200" />

              <div className="flex-1">
                <div className="h-7 w-48 animate-pulse rounded-lg bg-slate-200" />

                <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded bg-slate-100" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({
                length: 4,
              }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="h-28 animate-pulse rounded-2xl bg-slate-100"
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div
        dir="rtl"
        className="mx-auto max-w-7xl"
      >
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
              !
            </div>

            <div>
              <h1 className="font-black text-red-800">
                مشتری پیدا نشد
              </h1>

              <p className="mt-1 text-sm leading-6 text-red-700">
                {error ??
                  "اطلاعات مشتری در دسترس نیست."}
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/customers"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
        >
          <ArrowLeft size={16} />
          بازگشت به مشتریان
        </Link>
      </div>
    );
  }

  const cityName =
    getCityName(customer);

  const customerType =
    getCustomerTypeLabel(
      customer.customer_type
    );

  const phone =
    customer.phone ?? undefined;

  const whatsapp =
    customer.whatsapp_number ??
    customer.phone ??
    undefined;

  const customerCode =
    customer.code != null
      ? String(customer.code)
      : "—";

  const whatsappUrl =
    whatsapp
      ? `https://wa.me/${normalizeWhatsappNumber(
          whatsapp
        )}`
      : null;

  const inactivityTone =
    inactivityDays >= 30
      ? {
          box: "bg-red-50 text-red-600",
          text: "text-red-700",
        }
      : inactivityDays >= 7
        ? {
            box: "bg-amber-50 text-amber-600",
            text: "text-amber-700",
          }
        : {
            box: "bg-emerald-50 text-emerald-600",
            text: "text-emerald-700",
          };

  return (
    <>
      <div
        dir="rtl"
        className="mx-auto max-w-7xl space-y-6"
      >
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-blue-600"
        >
          <ArrowLeft size={16} />
          بازگشت به فهرست مشتریان
        </Link>

        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-l from-blue-600 via-cyan-500 to-emerald-500" />

          <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl" />

          <div className="absolute -bottom-32 right-0 h-72 w-72 rounded-full bg-emerald-100/30 blur-3xl" />

          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="flex flex-col gap-7 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-2xl font-black text-white shadow-xl shadow-blue-100 sm:h-20 sm:w-20 sm:text-3xl">
                  {customer.name?.charAt(
                    0
                  ) || "م"}

                  {customer.is_vip && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-amber-400 text-xs text-white shadow-sm">
                      ★
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                      {customer.name ||
                        "بدون نام"}
                    </h1>

                    {customer.is_vip && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 ring-1 ring-amber-200">
                        <Star size={12} />
                        VIP
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${
                        customer.is_active
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                          : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          customer.is_active
                            ? "bg-emerald-500"
                            : "bg-slate-400"
                        }`}
                      />

                      {customer.is_active
                        ? "فعال"
                        : "غیرفعال"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
                      <UserRound size={15} />
                      {customerType}
                    </span>

                    {cityName !==
                      "—" && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={15} />
                        {cityName}
                      </span>
                    )}

                    {phone && (
                      <span
                        dir="ltr"
                        className="inline-flex items-center gap-1.5"
                      >
                        <Phone size={15} />
                        {phone}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-slate-400">
                    کد مشتری:{" "}
                    <span className="font-bold text-slate-600">
                      {customerCode}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md"
                  >
                    <Phone size={16} />
                    تماس
                  </a>
                )}

                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md"
                  >
                    <MessageCircle
                      size={16}
                    />
                    واتساپ
                  </a>
                )}

                <Link
                  href={`/orders/new?customerId=${customer.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-black text-white shadow-sm transition hover:bg-slate-800 hover:shadow-md"
                >
                  <ShoppingCart
                    size={16}
                  />
                  ثبت سفارش
                </Link>

                <Link
                  href={`/activities/calls/new?customerId=${customer.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-xs font-black text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-100"
                >
                  <Phone size={16} />
                  ثبت تماس
                </Link>

                <Link
                  href={`/activities/follow-ups/new?customerId=${customer.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-100"
                >
                  <Bell size={16} />
                  ثبت پیگیری
                </Link>

                <Link
                  href={`/customers/${customer.id}/edit`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                >
                  <Pencil size={15} />
                  ویرایش
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(
                      null
                    );
                    setShowDeleteModal(
                      true
                    );
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-xs font-black text-red-700 ring-1 ring-red-100 transition hover:bg-red-100"
                >
                  <Trash2 size={15} />
                  حذف مشتری
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="تناژ کل"
            value={formatTonnage(
              totalOrderTonnage
            )}
            suffix="تن"
            icon={
              <Package size={21} />
            }
            iconClass="bg-blue-50 text-blue-700"
          />

          <StatCard
            title="میانگین ماهانه"
            value={formatTonnage(
              averageMonthlyTonnage
            )}
            suffix="تن در ماه"
            icon={
              <CalendarDays
                size={21}
              />
            }
            iconClass="bg-cyan-50 text-cyan-700"
          />

          <StatCard
            title="تعداد سفارش"
            value={formatNumber(
              orders.length
            )}
            suffix="سفارش"
            icon={
              <ShoppingCart
                size={21}
              />
            }
            iconClass="bg-emerald-50 text-emerald-700"
          />

          <StatCard
            title="عدم فعالیت"
            value={formatNumber(
              inactivityDays
            )}
            suffix="روز"
            icon={
              <Clock3 size={21} />
            }
            iconClass={
              inactivityTone.box
            }
            valueClass={
              inactivityTone.text
            }
          />
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            icon={
              <UserRound size={19} />
            }
            iconClass="bg-slate-100 text-slate-700"
            title="اطلاعات مشتری"
            description="مشخصات پایه و اطلاعات ارتباطی مشتری"
            badge={
              customer.is_vip
                ? "مشتری VIP"
                : undefined
            }
          />

          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <Info
              label="نام مشتری"
              value={
                customer.name ||
                "—"
              }
            />

            <Info
              label="شهر"
              value={cityName}
            />

            <Info
              label="نوع مشتری"
              value={
                customerType
              }
            />

            <Info
              label="کد مشتری"
              value={customerCode}
            />

            <Info
              label="شماره تماس"
              value={
                customer.phone ||
                "—"
              }
            />

            <Info
              label="شماره واتساپ"
              value={
                customer.whatsapp_number ??
                customer.phone ??
                "—"
              }
            />

            <Info
              label="وضعیت مشتری"
              value={
                customer.is_active
                  ? "فعال"
                  : "غیرفعال"
              }
            />

            <Info
              label="وضعیت VIP"
              value={
                customer.is_vip
                  ? "بله"
                  : "خیر"
              }
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            icon={
              <Clock3 size={19} />
            }
            iconClass="bg-indigo-50 text-indigo-700"
            title="آخرین فعالیت‌ها"
            description="آخرین تعاملات ثبت‌شده برای این مشتری"
          />

          <div className="grid gap-4 p-5 lg:grid-cols-3">
            <ActivityCard
              title="آخرین سفارش"
              date={formatDate(
                latestOrder?.order_date
              )}
              detail={
                latestOrder
                  ? `${formatTonnage(
                      latestOrder.total_tonnage
                    )} تن`
                  : "هنوز سفارشی ثبت نشده"
              }
              icon={
                <Package size={20} />
              }
              theme="blue"
            />

            <ActivityCard
              title="آخرین تماس"
              date={formatDate(
                latestCall?.call_date
              )}
              detail={
                latestCall
                  ? getCallOutcomeLabel(
                      latestCall.outcome
                    )
                  : "هنوز تماسی ثبت نشده"
              }
              icon={
                <Phone size={20} />
              }
              theme="emerald"
            />

            <ActivityCard
              title="آخرین پیگیری"
              date={formatDate(
                latestFollowUp?.scheduled_at
              )}
              detail={
                latestFollowUp?.subject ??
                "هنوز پیگیری‌ای ثبت نشده"
              }
              icon={
                <Bell size={20} />
              }
              theme="amber"
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            icon={
              <ShoppingCart
                size={19}
              />
            }
            iconClass="bg-blue-50 text-blue-700"
            title="سوابق سفارش‌ها"
            description={`${formatNumber(
              orders.length
            )} سفارش ثبت شده`}
            action={
              <Link
                href={`/orders/new?customerId=${customer.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800"
              >
                <ShoppingCart
                  size={15}
                />
                ثبت سفارش
              </Link>
            }
          />

          {ordersLoading ? (
            <LoadingBlock text="در حال دریافت سوابق سفارش..." />
          ) : ordersError ? (
            <ErrorBlock
              message={
                ordersError
              }
            />
          ) : orders.length === 0 ? (
            <EmptyBlock
              icon={
                <Package size={25} />
              }
              title="هنوز سفارشی برای این مشتری ثبت نشده است"
              actionHref={`/orders/new?customerId=${customer.id}`}
              actionText="ثبت اولین سفارش"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-right text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70">
                  <tr>
                    <th className="whitespace-nowrap px-5 py-4 font-black text-slate-600">
                      تاریخ سفارش
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 font-black text-slate-600">
                      تناژ
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 font-black text-slate-600">
                      وضعیت
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 font-black text-slate-600">
                      مسئول فروش
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 font-black text-slate-600">
                      منبع
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 font-black text-slate-600">
                      عملیات
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {orders.map(
                    (order) => (
                      <tr
                        key={
                          order.id
                        }
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                          {formatDate(
                            order.order_date
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-black text-slate-900">
                          {formatTonnage(
                            order.total_tonnage
                          )}{" "}
                          <span className="text-xs text-slate-400">
                            تن
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${getOrderStatusClass(
                              order.status
                            )}`}
                          >
                            {getOrderStatusLabel(
                              order.status
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {order
                            .sales_user
                            ?.full_name ??
                            "—"}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {getOrderSourceLabel(
                            order.source
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <Link
                            href={`/orders/${order.id}`}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-blue-600 hover:text-white"
                          >
                            مشاهده
                            <ChevronLeft
                              size={14}
                            />
                          </Link>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {activitiesError && (
          <ErrorBlock
            message={
              activitiesError
            }
            title="خطا در دریافت سوابق فعالیت"
          />
        )}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            icon={
              <Phone size={19} />
            }
            iconClass="bg-blue-50 text-blue-700"
            title="سوابق تماس‌ها"
            description={`${formatNumber(
              calls.length
            )} تماس ثبت شده`}
            action={
              <Link
                href={`/activities/calls/new?customerId=${customer.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-700"
              >
                <Phone size={15} />
                ثبت تماس
              </Link>
            }
          />

          {activitiesLoading ? (
            <LoadingBlock text="در حال دریافت سوابق تماس..." />
          ) : calls.length === 0 ? (
            <EmptyBlock
              icon={
                <Phone size={25} />
              }
              title="هنوز تماسی برای این مشتری ثبت نشده است"
              actionHref={`/activities/calls/new?customerId=${customer.id}`}
              actionText="ثبت اولین تماس"
              actionClass="bg-blue-600 hover:bg-blue-700"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-right text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70">
                  <tr>
                    <th className="whitespace-nowrap px-5 py-4 font-black text-slate-600">
                      تاریخ
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 font-black text-slate-600">
                      مسئول
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 font-black text-slate-600">
                      جهت
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 font-black text-slate-600">
                      نتیجه
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 font-black text-slate-600">
                      مدت
                    </th>

                    <th className="px-5 py-4 font-black text-slate-600">
                      توضیحات
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 font-black text-slate-600">
                      عملیات
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {calls.map(
                    (call) => (
                      <tr
                        key={
                          call.id
                        }
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                          {formatDate(
                            call.call_date
                          )}
                        </td>

                        <td className="px-5 py-4 font-medium text-slate-700">
                          {call.user
                            ?.full_name ??
                            "—"}
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                            {getCallDirectionLabel(
                              call.direction
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                            {getCallOutcomeLabel(
                              call.outcome
                            )}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                          {formatDuration(
                            call.duration_seconds
                          )}
                        </td>

                        <td className="max-w-sm px-5 py-4 text-slate-600">
                          <div className="line-clamp-2">
                            {call.notes ??
                              "—"}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <Link
                            href={`/activities/calls/${call.id}/edit`}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-blue-600 hover:text-white"
                          >
                            ویرایش
                            <Pencil
                              size={13}
                            />
                          </Link>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            icon={
              <Bell size={19} />
            }
            iconClass="bg-emerald-50 text-emerald-700"
            title="سوابق پیگیری‌ها"
            description={`${formatNumber(
              followUps.length
            )} پیگیری ثبت شده`}
            action={
              <Link
                href={`/activities/follow-ups/new?customerId=${customer.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700"
              >
                <Bell size={15} />
                ثبت پیگیری
              </Link>
            }
          />

          {activitiesLoading ? (
            <LoadingBlock text="در حال دریافت سوابق پیگیری..." />
          ) : followUps.length === 0 ? (
            <EmptyBlock
              icon={
                <Bell size={25} />
              }
              title="هنوز پیگیری‌ای برای این مشتری ثبت نشده است"
              actionHref={`/activities/follow-ups/new?customerId=${customer.id}`}
              actionText="ثبت اولین پیگیری"
              actionClass="bg-emerald-600 hover:bg-emerald-700"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-right text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70">
                  <tr>
                    <th className="whitespace-nowrap px-5 py-4 font-black text-slate-600">
                      موضوع
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 font-black text-slate-600">
                      مسئول
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 font-black text-slate-600">
                      زمان پیگیری
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 font-black text-slate-600">
                      اولویت
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 font-black text-slate-600">
                      وضعیت
                    </th>

                    <th className="px-5 py-4 font-black text-slate-600">
                      توضیحات
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 font-black text-slate-600">
                      عملیات
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {followUps.map(
                    (followUp) => (
                      <tr
                        key={
                          followUp.id
                        }
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-4">
                          <div className="font-black text-slate-800">
                            {followUp.subject ??
                              "بدون موضوع"}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {followUp.user
                            ?.full_name ??
                            "—"}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                          {formatDate(
                            followUp.scheduled_at
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${getPriorityClass(
                              followUp.priority
                            )}`}
                          >
                            {getFollowUpPriorityLabel(
                              followUp.priority
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClass(
                              followUp.status
                            )}`}
                          >
                            {getFollowUpStatusLabel(
                              followUp.status
                            )}
                          </span>
                        </td>

                        <td className="max-w-sm px-5 py-4 text-slate-600">
                          <div className="line-clamp-2">
                            {followUp.notes ??
                              "—"}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <Link
                            href={`/activities/follow-ups/${followUp.id}/edit`}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-emerald-600 hover:text-white"
                          >
                            ویرایش
                            <Pencil
                              size={13}
                            />
                          </Link>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-customer-title"
            className="w-full max-w-md overflow-hidden rounded-3xl border border-red-100 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <Trash2 size={22} />
                </div>

                <div>
                  <h2
                    id="delete-customer-title"
                    className="text-lg font-black text-slate-900"
                  >
                    حذف مشتری
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    مشتری از فهرست مشتریان فعال حذف خواهد شد.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!deleting) {
                    setShowDeleteModal(
                      false
                    );
                  }
                }}
                disabled={deleting}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="بستن"
              >
                <X size={17} />
              </button>
            </div>

            <div className="p-5">
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <p className="text-sm leading-7 text-red-800">
                  آیا از حذف مشتری{" "}
                  <span className="font-black">
                    {customer.name}
                  </span>{" "}
                  مطمئن هستید؟
                </p>

                <p className="mt-2 text-xs leading-6 text-red-600">
                  سوابق مشتری حذف دائمی نمی‌شود و به‌صورت حذف نرم در دیتابیس نگهداری خواهد شد.
                </p>
              </div>

              {deleteError && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-white p-4">
                  <p className="text-sm font-bold text-red-800">
                    خطا در حذف مشتری
                  </p>

                  <p className="mt-1 text-xs leading-6 text-red-600">
                    {deleteError}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowDeleteModal(
                    false
                  )
                }
                disabled={deleting}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleDeleteCustomer()
                }
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    در حال حذف...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    بله، حذف مشتری
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatCard({
  title,
  value,
  suffix,
  icon,
  iconClass,
  valueClass = "text-slate-900",
}: {
  title: string;
  value: string;
  suffix: string;
  icon: React.ReactNode;
  iconClass: string;
  valueClass?: string;
}) {
  return (
    <div className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">
            {title}
          </p>

          <div className="mt-2 flex items-baseline gap-2">
            <p
              className={`text-3xl font-black tracking-tight ${valueClass}`}
            >
              {value}
            </p>

            <span className="text-xs font-bold text-slate-400">
              {suffix}
            </span>
          </div>
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

function SectionHeader({
  icon,
  iconClass,
  title,
  description,
  badge,
  action,
}: {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  description: string;
  badge?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-100 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-black text-slate-900">
              {title}
            </h2>

            {badge && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700 ring-1 ring-amber-200">
                {badge}
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>
      </div>

      {action}
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-slate-200 hover:bg-slate-50">
      <div className="mb-1.5 text-xs font-medium text-slate-400">
        {label}
      </div>

      <div className="break-words font-bold text-slate-800">
        {value}
      </div>
    </div>
  );
}

function ActivityCard({
  title,
  date,
  detail,
  icon,
  theme,
}: {
  title: string;
  date: string;
  detail: string;
  icon: React.ReactNode;
  theme:
    | "blue"
    | "emerald"
    | "amber";
}) {
  const themes = {
    blue: {
      wrapper:
        "border-blue-100 bg-gradient-to-br from-blue-50 to-white",
      icon: "bg-white text-blue-700",
      title: "text-blue-900",
    },

    emerald: {
      wrapper:
        "border-emerald-100 bg-gradient-to-br from-emerald-50 to-white",
      icon: "bg-white text-emerald-700",
      title: "text-emerald-900",
    },

    amber: {
      wrapper:
        "border-amber-100 bg-gradient-to-br from-amber-50 to-white",
      icon: "bg-white text-amber-700",
      title: "text-amber-900",
    },
  };

  const current =
    themes[theme];

  return (
    <div
      className={`rounded-2xl border p-5 ${current.wrapper}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className={`text-sm font-black ${current.title}`}
          >
            {title}
          </p>

          <p className="mt-2 text-sm font-bold text-slate-700">
            {date}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ${current.icon}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-4 border-t border-black/5 pt-3 text-xs leading-6 text-slate-500">
        {detail}
      </div>
    </div>
  );
}

function LoadingBlock({
  text,
}: {
  text: string;
}) {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl bg-slate-100" />

      <p className="mt-4 text-sm font-medium text-slate-500">
        {text}
      </p>
    </div>
  );
}

function ErrorBlock({
  message,
  title = "خطا در دریافت اطلاعات",
}: {
  message: string;
  title?: string;
}) {
  return (
    <div className="m-5 rounded-2xl border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
          !
        </div>

        <div>
          <p className="font-black text-red-800">
            {title}
          </p>

          <p className="mt-1 text-sm leading-6 text-red-700">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyBlock({
  icon,
  title,
  actionHref,
  actionText,
  actionClass = "bg-slate-900 hover:bg-slate-800",
}: {
  icon: React.ReactNode;
  title: string;
  actionHref: string;
  actionText: string;
  actionClass?: string;
}) {
  return (
    <div className="p-10 text-center sm:p-12">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        {icon}
      </div>

      <p className="mx-auto mt-4 max-w-md text-sm font-medium leading-7 text-slate-500">
        {title}
      </p>

      <Link
        href={actionHref}
        className={`mt-5 inline-flex rounded-xl px-4 py-2.5 text-sm font-black text-white transition ${actionClass}`}
      >
        {actionText}
      </Link>
    </div>
  );
}
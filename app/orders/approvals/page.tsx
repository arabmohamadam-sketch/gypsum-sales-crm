"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileEdit,
  Loader2,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { settingsService } from "@/src/lib/services/settings";
import {
  ordersService,
  type OrderApprovalQueueItem,
  type RegionalActionKind,
  type RegionalActionQueueItem,
} from "@/src/lib/services/orders";
import { formatJalaliDateTime } from "@/src/lib/utils/jalali";

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "۰";
  }

  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(
  value: string | null | undefined,
): string {
  if (!value) {
    return "—";
  }

  try {
    return formatJalaliDateTime(value);
  } catch {
    return value;
  }
}

function getOrderShortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function getCustomerTypeLabel(
  value: string | null | undefined,
): string {
  const labels: Record<string, string> = {
    building_material_store: "مصالح‌فروشی",
    building_material_stores: "مصالح‌فروشی",
    contractor: "پیمانکار",
    contractor_company: "پیمانکار",
    employer: "کارفرما",
    employers: "کارفرما",
    plasterer: "گچ‌کار",
    plaster_worker: "گچ‌کار",
    plasterer_company: "گچ‌کار",
    distributor: "توزیع‌کننده",
    retailer: "خرده‌فروشی",
  };

  if (!value) {
    return "—";
  }

  return labels[value] ?? value;
}

function getAgeLabel(
  createdAt: string,
): string {
  const createdAtMs = Date.parse(createdAt);

  if (!Number.isFinite(createdAtMs)) {
    return "";
  }

  const elapsedMinutes = Math.max(
    0,
    Math.floor(
      (Date.now() - createdAtMs) / 60000,
    ),
  );

  if (elapsedMinutes < 1) {
    return "همین الان ثبت شده";
  }

  if (elapsedMinutes < 60) {
    return `${formatNumber(
      elapsedMinutes,
    )} دقیقه در صف`;
  }

  const elapsedHours =
    Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${formatNumber(
      elapsedHours,
    )} ساعت در صف`;
  }

  const elapsedDays =
    Math.floor(elapsedHours / 24);

  return `${formatNumber(
    elapsedDays,
  )} روز در صف`;
}

function getRegionalActionLabel(
  kind: RegionalActionKind,
): string {
  switch (kind) {
    case "pending_approval":
      return "منتظر تأیید مدیر منطقه";

    case "draft":
      return "پیش‌نویس نیازمند بررسی";

    case "sales_returned":
      return "برگشتی از مدیر فروش";

    case "sales_rejected":
      return "ردشده توسط مدیر فروش";

    default:
      return "نیازمند اقدام";
  }
}

function getRegionalActionDescription(
  kind: RegionalActionKind,
): string {
  switch (kind) {
    case "pending_approval":
      return "این سفارش منتظر بررسی و تصمیم مدیر منطقه است.";

    case "draft":
      return "این سفارش هنوز نهایی نشده و در محدوده مشتریان این مدیر منطقه قرار دارد.";

    case "sales_returned":
      return "مدیر فروش سفارش را برای اصلاح و بررسی مجدد برگردانده است.";

    case "sales_rejected":
      return "سفارش در مرحله مدیر فروش رد شده و باید توسط مدیر منطقه بررسی و اصلاح شود.";

    default:
      return "این سفارش نیازمند اقدام است.";
  }
}

function getRegionalActionBadgeClass(
  kind: RegionalActionKind,
): string {
  switch (kind) {
    case "pending_approval":
      return "bg-amber-50 text-amber-700 ring-amber-100";

    case "draft":
      return "bg-slate-100 text-slate-700 ring-slate-200";

    case "sales_returned":
      return "bg-orange-50 text-orange-700 ring-orange-100";

    case "sales_rejected":
      return "bg-red-50 text-red-700 ring-red-100";

    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function getRegionalActionIcon(
  kind: RegionalActionKind,
) {
  switch (kind) {
    case "pending_approval":
      return <ShieldCheck size={14} />;

    case "draft":
      return <FileEdit size={14} />;

    case "sales_returned":
      return <RotateCcw size={14} />;

    case "sales_rejected":
      return <XCircle size={14} />;

    default:
      return <ClipboardCheck size={14} />;
  }
}

function getRegionalActionButtonLabel(
  kind: RegionalActionKind,
): string {
  switch (kind) {
    case "pending_approval":
      return "بررسی و تأیید سفارش";

    case "draft":
      return "باز کردن پیش‌نویس";

    case "sales_returned":
      return "بررسی و اصلاح سفارش";

    case "sales_rejected":
      return "بررسی سفارش ردشده";

    default:
      return "بررسی سفارش";
  }
}

function ApprovalOrderCard({
  item,
}: {
  item: OrderApprovalQueueItem;
}) {
  const { order, approval } = item;

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-blue-500" />

      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-black text-amber-700 ring-1 ring-amber-100">
                <ClipboardCheck size={14} />
                منتظر تأیید مدیر فروش
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                دور{" "}
                {formatNumber(
                  approval.cycle_number,
                )}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <h2 className="text-lg font-black tracking-tight text-slate-900 md:text-xl">
                {order.customer?.name?.trim() ||
                  "مشتری بدون نام"}
              </h2>

              <span
                dir="ltr"
                className="font-mono text-[11px] font-bold text-slate-400"
              >
                #{getOrderShortId(order.id)}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                  <UserRound size={14} />
                  بازاریاب سفارش
                </div>

                <p className="mt-2 truncate text-sm font-black text-slate-800">
                  {order.sales_user?.full_name?.trim() ||
                    "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                  <Package size={14} />
                  نوع مشتری
                </div>

                <p className="mt-2 truncate text-sm font-black text-slate-800">
                  {getCustomerTypeLabel(
                    order.customer?.customer_type,
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                  <CalendarClock size={14} />
                  زمان ثبت در صف
                </div>

                <p className="mt-2 text-sm font-black text-slate-800">
                  {formatDate(
                    approval.created_at,
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 xl:w-52">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-[11px] font-bold text-blue-500">
                مجموع سفارش
              </p>

              <p className="mt-1 text-2xl font-black tracking-tight text-blue-900">
                {formatNumber(
                  order.total_tonnage,
                )}

                <span className="mr-1 text-sm font-bold text-blue-500">
                  تن
                </span>
              </p>
            </div>

            <Link
              href={`/orders/view?id=${encodeURIComponent(
                order.id,
              )}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-300/50 transition hover:-translate-y-0.5 hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70"
            >
              بررسی و تأیید سفارش
              <ArrowLeft size={16} />
            </Link>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 text-[11px] font-bold text-slate-400">
              <Package size={14} />
              اقلام سفارش
            </div>

            <span className="text-[11px] font-bold text-slate-400">
              {formatNumber(
                order.items.length,
              )}{" "}
              قلم
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {order.items.length > 0 ? (
              order.items
                .slice(0, 6)
                .map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    <span className="truncate">
                      {item.product_name_snapshot ||
                        "محصول بدون نام"}
                    </span>

                    <span className="shrink-0 rounded-lg bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-500">
                      {formatNumber(
                        item.quantity,
                      )}
                    </span>
                  </span>
                ))
            ) : (
              <span className="text-xs font-bold text-slate-400">
                اطلاعات اقلام سفارش در دسترس نیست.
              </span>
            )}

            {order.items.length > 6 && (
              <span className="inline-flex items-center rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-500">
                +
                {formatNumber(
                  order.items.length - 6,
                )}{" "}
                قلم دیگر
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-amber-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          {getAgeLabel(
            approval.created_at,
          )}
        </div>
      </div>
    </article>
  );
}

function RegionalActionCard({
  item,
}: {
  item: RegionalActionQueueItem;
}) {
  const {
    order,
    kind,
    reason,
    created_at,
  } = item;

  const isPendingApproval =
    kind === "pending_approval";

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg">
      <div
        className={`absolute inset-x-0 top-0 h-1.5 ${
          kind === "sales_rejected"
            ? "bg-gradient-to-r from-red-500 via-orange-500 to-slate-700"
            : kind === "sales_returned"
              ? "bg-gradient-to-r from-orange-400 via-amber-500 to-blue-500"
              : kind === "draft"
                ? "bg-gradient-to-r from-slate-500 via-slate-700 to-blue-500"
                : "bg-gradient-to-r from-amber-400 via-blue-500 to-emerald-500"
        }`}
      />

      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black ring-1 ${getRegionalActionBadgeClass(
                  kind,
                )}`}
              >
                {getRegionalActionIcon(kind)}
                {getRegionalActionLabel(kind)}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                <Clock3 size={13} />
                {getAgeLabel(created_at)}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <h2 className="text-lg font-black tracking-tight text-slate-900 md:text-xl">
                {order.customer?.name?.trim() ||
                  "مشتری بدون نام"}
              </h2>

              <span
                dir="ltr"
                className="font-mono text-[11px] font-bold text-slate-400"
              >
                #{getOrderShortId(order.id)}
              </span>
            </div>

            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
              {getRegionalActionDescription(
                kind,
              )}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                  <UserRound size={14} />
                  بازاریاب سفارش
                </div>

                <p className="mt-2 truncate text-sm font-black text-slate-800">
                  {order.sales_user?.full_name?.trim() ||
                    "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                  <Package size={14} />
                  نوع مشتری
                </div>

                <p className="mt-2 truncate text-sm font-black text-slate-800">
                  {getCustomerTypeLabel(
                    order.customer?.customer_type,
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                  <CalendarClock size={14} />
                  زمان آخرین اقدام
                </div>

                <p className="mt-2 text-sm font-black text-slate-800">
                  {formatDate(created_at)}
                </p>
              </div>
            </div>

            {!isPendingApproval &&
              reason?.trim() && (
                <div
                  className={`mt-4 rounded-2xl border p-4 ${
                    kind === "sales_rejected"
                      ? "border-red-100 bg-red-50"
                      : "border-orange-100 bg-orange-50"
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 text-[11px] font-black ${
                      kind === "sales_rejected"
                        ? "text-red-700"
                        : "text-orange-700"
                    }`}
                  >
                    <AlertCircle size={14} />
                    دلیل اقدام مدیر فروش
                  </div>

                  <p
                    className={`mt-2 text-sm font-bold leading-7 ${
                      kind === "sales_rejected"
                        ? "text-red-900"
                        : "text-orange-900"
                    }`}
                  >
                    {reason}
                  </p>
                </div>
              )}
          </div>

          <div className="flex shrink-0 flex-col gap-3 xl:w-52">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-[11px] font-bold text-blue-500">
                مجموع سفارش
              </p>

              <p className="mt-1 text-2xl font-black tracking-tight text-blue-900">
                {formatNumber(
                  order.total_tonnage,
                )}

                <span className="mr-1 text-sm font-bold text-blue-500">
                  تن
                </span>
              </p>
            </div>

            <Link
              href={`/orders/view?id=${encodeURIComponent(
                order.id,
              )}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-300/50 transition hover:-translate-y-0.5 hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70"
            >
              {getRegionalActionButtonLabel(
                kind,
              )}
              <ArrowLeft size={16} />
            </Link>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 text-[11px] font-bold text-slate-400">
              <Package size={14} />
              اقلام سفارش
            </div>

            <span className="text-[11px] font-bold text-slate-400">
              {formatNumber(
                order.items.length,
              )}{" "}
              قلم
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {order.items.length > 0 ? (
              order.items
                .slice(0, 6)
                .map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    <span className="truncate">
                      {item.product_name_snapshot ||
                        "محصول بدون نام"}
                    </span>

                    <span className="shrink-0 rounded-lg bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-500">
                      {formatNumber(
                        item.quantity,
                      )}
                    </span>
                  </span>
                ))
            ) : (
              <span className="text-xs font-bold text-slate-400">
                اطلاعات اقلام سفارش در دسترس نیست.
              </span>
            )}

            {order.items.length > 6 && (
              <span className="inline-flex items-center rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-500">
                +
                {formatNumber(
                  order.items.length - 6,
                )}{" "}
                قلم دیگر
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function OrderApprovalQueuePage() {
  const [isSalesManager, setIsSalesManager] =
    useState<boolean | null>(null);

  const [isRegionalManager, setIsRegionalManager] =
    useState<boolean | null>(null);

  const [salesQueue, setSalesQueue] = useState<
    OrderApprovalQueueItem[]
  >([]);

  const [regionalQueue, setRegionalQueue] =
    useState<RegionalActionQueueItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const loadQueue = useCallback(
    async (showRefreshState = false) => {
      if (showRefreshState) {
        setRefreshing(true);
      }

      setError("");

      try {
        const overview =
          await settingsService.getOverview();

        const salesManager =
          overview.roles.some(
            (role) =>
              role.slug === "sales_manager",
          );

        const regionalManager =
          overview.roles.some(
            (role) =>
              role.slug ===
              "regional_manager",
          );

        setIsSalesManager(salesManager);
        setIsRegionalManager(
          regionalManager,
        );

        setSalesQueue([]);
        setRegionalQueue([]);

        if (salesManager) {
          const nextQueue =
            await ordersService.getApprovalQueue(
              "sales",
            );

          setSalesQueue(nextQueue);
          return;
        }

        if (regionalManager) {
          const nextQueue =
            await ordersService.getRegionalActionQueue();

          setRegionalQueue(nextQueue);
          return;
        }
      } catch (loadError) {
        console.error(
          "Failed to load order action queue:",
          loadError,
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "خطا در دریافت صف سفارش‌ها.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    // Initial client-side data hydration intentionally uses
    // the existing async loader to synchronize React state
    // with Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadQueue();

    const intervalId =
      window.setInterval(
        () => {
          void loadQueue();
        },
        30_000,
      );

    const handleFocus = () => {
      void loadQueue();
    };

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      window.clearInterval(
        intervalId,
      );

      window.removeEventListener(
        "focus",
        handleFocus,
      );
    };
  }, [loadQueue]);

  const activeMode =
    isSalesManager === true
      ? "sales"
      : isRegionalManager === true
        ? "regional"
        : null;

  const filteredSalesQueue = useMemo(() => {
    const normalized = search
      .trim()
      .toLocaleLowerCase("fa-IR");

    return salesQueue
      .slice()
      .sort(
        (first, second) =>
          Date.parse(
            second.approval.created_at,
          ) -
          Date.parse(
            first.approval.created_at,
          ),
      )
      .filter((item) => {
        if (!normalized) {
          return true;
        }

        const haystack = [
          item.order.customer?.name,
          item.order.sales_user?.full_name,
          item.order.id,
          ...item.order.items.map(
            (orderItem) =>
              orderItem.product_name_snapshot,
          ),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("fa-IR");

        return haystack.includes(
          normalized,
        );
      });
  }, [salesQueue, search]);

  const filteredRegionalQueue =
    useMemo(() => {
      const normalized = search
        .trim()
        .toLocaleLowerCase("fa-IR");

      return regionalQueue
        .slice()
        .sort(
          (first, second) =>
            Date.parse(
              second.created_at,
            ) -
            Date.parse(
              first.created_at,
            ),
        )
        .filter((item) => {
          if (!normalized) {
            return true;
          }

          const haystack = [
            item.order.customer?.name,
            item.order.sales_user?.full_name,
            item.order.id,
            item.kind,
            item.reason,
            ...item.order.items.map(
              (orderItem) =>
                orderItem.product_name_snapshot,
            ),
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase("fa-IR");

          return haystack.includes(
            normalized,
          );
        });
    }, [regionalQueue, search]);

  const rawQueueLength =
    activeMode === "sales"
      ? salesQueue.length
      : regionalQueue.length;

  const visibleQueueLength =
    activeMode === "sales"
      ? filteredSalesQueue.length
      : filteredRegionalQueue.length;

  const pageTitle =
    activeMode === "regional"
      ? "اقدام روی سفارش‌ها"
      : "سفارش‌های در انتظار تأیید";

  const pageSubtitle =
    activeMode === "regional"
      ? "سفارش‌های مرتبط با محدوده شما، شامل پیش‌نویس‌ها، موارد منتظر تأیید و سفارش‌های برگشتی یا ردشده از مدیر فروش در اینجا نمایش داده می‌شوند."
      : "اینجا فقط سفارش‌هایی نمایش داده می‌شوند که مرحله تأیید نهایی مدیر فروش را منتظر هستند.";

  const pageBadge =
    activeMode === "regional"
      ? "صف اقدام مدیر منطقه"
      : "صف اقدام مدیر فروش";

  const emptyTitle =
    activeMode === "regional"
      ? "صف اقدام مدیر منطقه خالی است"
      : "صف تأیید مدیر فروش خالی است";

  const emptyDescription =
    activeMode === "regional"
      ? "در حال حاضر هیچ پیش‌نویس، سفارش منتظر تأیید یا سفارش برگشتی و ردشده‌ای برای اقدام شما وجود ندارد."
      : "در حال حاضر هیچ سفارشی منتظر تأیید نهایی مدیر فروش نیست.";

  if (loading) {
    return (
      <main
        dir="rtl"
        className="mx-auto max-w-[1380px] pb-14"
      >
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-slate-900 via-amber-500 to-blue-600" />

          <div className="p-10 text-center md:p-14">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-500">
              <Loader2
                size={28}
                className="animate-spin"
              />
            </div>

            <h1 className="mt-5 text-xl font-black text-slate-900">
              در حال دریافت صف سفارش‌ها...
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              سفارش‌های نیازمند اقدام در حال بارگذاری هستند.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (
    isSalesManager === false &&
    isRegionalManager === false
  ) {
    return (
      <main
        dir="rtl"
        className="mx-auto max-w-[900px] pb-14"
      >
        <section className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm">
          <div className="h-1.5 bg-red-500" />

          <div className="p-8 md:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle size={25} />
            </div>

            <h1 className="mt-5 text-2xl font-black text-slate-900">
              دسترسی به صف سفارش‌ها مجاز نیست
            </h1>

            <p className="mt-2 text-sm leading-7 text-slate-500">
              این بخش فقط برای مدیر منطقه و مدیر فروش در نظر گرفته شده است.
            </p>

            <Link
              href="/orders"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-blue-600"
            >
              بازگشت به سفارش‌ها
              <ArrowLeft size={16} />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="mx-auto max-w-[1380px] space-y-6 pb-14"
    >
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-slate-900 via-amber-500 to-blue-600" />

        <div className="pointer-events-none absolute -left-28 -top-28 h-72 w-72 rounded-full bg-amber-100/50 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl" />

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-black text-amber-700 ring-1 ring-amber-100">
                  <ClipboardCheck size={14} />
                  {pageBadge}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black ring-1 ${
                    activeMode === "regional"
                      ? "bg-blue-50 text-blue-700 ring-blue-100"
                      : "bg-emerald-50 text-emerald-700 ring-emerald-100"
                  }`}
                >
                  {activeMode === "regional" ? (
                    <>
                      <ShieldCheck size={14} />
                      مخصوص محدوده شما
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      فقط سفارش‌های نیازمند تأیید نهایی
                    </>
                  )}
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                {pageTitle}
              </h1>

              <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-500">
                {pageSubtitle}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-center">
                <p className="text-[11px] font-bold text-amber-600">
                  منتظر اقدام
                </p>

                <p className="mt-1 text-3xl font-black text-amber-900">
                  {formatNumber(
                    rawQueueLength,
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  void loadQueue(true)
                }
                disabled={refreshing}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={17}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />
                بروزرسانی صف
              </button>
            </div>
          </div>

          <div className="mt-6 max-w-xl">
            <label className="relative block">
              <span className="sr-only">
                جست‌وجو در صف سفارش‌ها
              </span>

              <Search
                size={17}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="جست‌وجوی مشتری، بازاریاب، محصول یا شناسه سفارش..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>
        </div>
      </section>

      {error && (
        <section className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm">
          <div className="border-b border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {error}
          </div>

          <div className="p-6">
            <button
              type="button"
              onClick={() =>
                void loadQueue(true)
              }
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-blue-600"
            >
              <RefreshCw size={16} />
              تلاش مجدد
            </button>
          </div>
        </section>
      )}

      {!error &&
        rawQueueLength === 0 && (
          <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
            <div className="h-1.5 bg-emerald-500" />

            <div className="p-10 text-center md:p-14">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={30} />
              </div>

              <h2 className="mt-5 text-2xl font-black text-slate-900">
                {emptyTitle}
              </h2>

              <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                {emptyDescription}
              </p>
            </div>
          </section>
        )}

      {!error &&
        rawQueueLength > 0 &&
        visibleQueueLength === 0 && (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="p-8 text-center">
              <Search
                size={28}
                className="mx-auto text-slate-400"
              />

              <h2 className="mt-4 text-lg font-black text-slate-900">
                نتیجه‌ای پیدا نشد
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                برای عبارت جست‌وجوی واردشده موردی در صف پیدا نشد.
              </p>

              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                پاک کردن جست‌وجو
              </button>
            </div>
          </section>
        )}

      {!error &&
        activeMode === "sales" &&
        filteredSalesQueue.length > 0 && (
          <div className="space-y-4">
            {filteredSalesQueue.map(
              (item) => (
                <ApprovalOrderCard
                  key={item.approval.id}
                  item={item}
                />
              ),
            )}
          </div>
        )}

      {!error &&
        activeMode === "regional" &&
        filteredRegionalQueue.length > 0 && (
          <div className="space-y-4">
            {filteredRegionalQueue.map(
              (item) => (
                <RegionalActionCard
                  key={`${item.kind}-${item.order.id}`}
                  item={item}
                />
              ),
            )}
          </div>
        )}
    </main>
  );
}
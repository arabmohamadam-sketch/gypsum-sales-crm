"use client";

import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { waybillsService } from "@/src/lib/services/waybills";

import {
  ordersService,
  type OrderWithRelations,
} from "@/src/lib/services/orders";

import type {
  Waybill,
  WaybillStatus,
} from "@/src/lib/types/waybill";

import { formatJalaliDate } from "@/src/lib/utils/jalali";

type FilterStatus =
  | "all"
  | WaybillStatus;

type OrderMap = Record<
  string,
  OrderWithRelations
>;

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

function getStatusClass(
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

function getStatusIcon(
  status: string
) {
  switch (status) {
    case "loading_confirmed":
      return (
        <CheckCircle2 size={14} />
      );

    case "cancelled":
      return (
        <XCircle size={14} />
      );

    case "issued":
      return (
        <Truck size={14} />
      );

    case "draft":
    default:
      return (
        <Clock3 size={14} />
      );
  }
}

function getLoadingStatusLabel(
  waybill: Waybill
): string {
  if (
    waybill.status ===
    "loading_confirmed"
  ) {
    return "بارگیری تأیید شده";
  }

  if (
    waybill.loading?.status ===
    "confirmed"
  ) {
    return "بارگیری تأیید شده";
  }

  if (
    waybill.loading?.status ===
    "pending"
  ) {
    return "در انتظار بارگیری";
  }

  if (
    waybill.loading?.status ===
    "cancelled"
  ) {
    return "بارگیری لغو شده";
  }

  if (
    waybill.status ===
    "issued"
  ) {
    return "آماده بارگیری";
  }

  if (
    waybill.status ===
    "draft"
  ) {
    return "هنوز صادر نشده";
  }

  return "—";
}

function getLoadingStatusClass(
  waybill: Waybill
): string {
  if (
    waybill.status ===
      "loading_confirmed" ||
    waybill.loading?.status ===
      "confirmed"
  ) {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  }

  if (
    waybill.loading?.status ===
    "pending"
  ) {
    return "bg-blue-50 text-blue-700 ring-1 ring-blue-100";
  }

  if (
    waybill.loading?.status ===
    "cancelled"
  ) {
    return "bg-red-50 text-red-700 ring-1 ring-red-100";
  }

  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}

function getWaybillTonnage(
  waybill: Waybill
): number {
  return (
    waybill.items ?? []
  ).reduce(
    (sum, item) => {
      const directTonnage =
        Number(item.tonnage ?? 0);

      if (
        Number.isFinite(
          directTonnage
        ) &&
        directTonnage > 0
      ) {
        return (
          sum + directTonnage
        );
      }

      const quantity =
        Number(
          item.quantity ?? 0
        );

      const weight =
        Number(
          item.weight_kg_snapshot ??
            0
        );

      if (
        !Number.isFinite(
          quantity
        ) ||
        !Number.isFinite(
          weight
        )
      ) {
        return sum;
      }

      return (
        sum +
        (quantity * weight) /
          1000
      );
    },
    0
  );
}

function getLoadingTonnage(
  waybill: Waybill
): number {
  if (
    waybill.status !==
    "loading_confirmed"
  ) {
    return 0;
  }

  return getWaybillTonnage(
    waybill
  );
}

function formatDateSafe(
  value?: string | null
): string {
  if (!value) {
    return "—";
  }

  try {
    return formatJalaliDate(
      value
    );
  } catch {
    return value;
  }
}

function StatCard({
  title,
  value,
  description,
  icon,
  className,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  className: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-black text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${className}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  hasFilter,
}: {
  hasFilter: boolean;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <FileText size={28} />
      </div>

      <h2 className="mt-5 text-xl font-black text-slate-900">
        {hasFilter
          ? "حواله‌ای با این فیلتر پیدا نشد"
          : "هنوز حواله‌ای ثبت نشده است"}
      </h2>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-slate-500">
        {hasFilter
          ? "وضعیت یا عبارت جستجو را تغییر دهید."
          : "پس از تأیید سفارش، حواله آن در این بخش ایجاد خواهد شد."}
      </p>
    </section>
  );
}

export default function WaybillsPage() {
  const [waybills, setWaybills] =
    useState<Waybill[]>([]);

  const [ordersById, setOrdersById] =
    useState<OrderMap>({});

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [relationsLoading, setRelationsLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<FilterStatus>("all");

  async function loadWaybills(
    showRefreshState = false
  ) {
    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const result =
        await waybillsService.getAll();

      setWaybills(result);

      const orderIds =
        Array.from(
          new Set(
            result
              .map(
                (waybill) =>
                  waybill.order_id
              )
              .filter(Boolean)
          )
        );

      if (
        orderIds.length > 0
      ) {
        setRelationsLoading(
          true
        );

        const entries =
          await Promise.all(
            orderIds.map(
              async (orderId) => {
                try {
                  const order =
                    await ordersService.getById(
                      orderId
                    );

                  return [
                    orderId,
                    order,
                  ] as const;
                } catch (err) {
                  console.error(
                    "WAYBILL ORDER LOAD ERROR:",
                    orderId,
                    err
                  );

                  return null;
                }
              }
            )
          );

        const nextOrders: OrderMap =
          {};

        for (
          const entry of entries
        ) {
          if (!entry) {
            continue;
          }

          nextOrders[
            entry[0]
          ] = entry[1];
        }

        setOrdersById(
          nextOrders
        );
      } else {
        setOrdersById({});
      }
    } catch (err) {
      console.error(
        "WAYBILLS LOAD ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "خطا در دریافت حواله‌ها."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      setRelationsLoading(false);
    }
  }

  /*
   * بارگذاری اولیه بدون فراخوانی مستقیم
   * تابعی که در بدنه خودش setState دارد.
   */
  useEffect(() => {
    let cancelled = false;

    waybillsService
      .getAll()
      .then(async (result) => {
        if (cancelled) {
          return;
        }

        setWaybills(result);
        setError("");

        const orderIds =
          Array.from(
            new Set(
              result
                .map(
                  (waybill) =>
                    waybill.order_id
                )
                .filter(Boolean)
            )
          );

        if (
          orderIds.length === 0
        ) {
          setOrdersById({});
          return;
        }

        setRelationsLoading(
          true
        );

        const entries =
          await Promise.all(
            orderIds.map(
              async (orderId) => {
                try {
                  const order =
                    await ordersService.getById(
                      orderId
                    );

                  return [
                    orderId,
                    order,
                  ] as const;
                } catch (err) {
                  console.error(
                    "WAYBILL ORDER LOAD ERROR:",
                    orderId,
                    err
                  );

                  return null;
                }
              }
            )
          );

        if (cancelled) {
          return;
        }

        const nextOrders: OrderMap =
          {};

        for (
          const entry of entries
        ) {
          if (!entry) {
            continue;
          }

          nextOrders[
            entry[0]
          ] = entry[1];
        }

        setOrdersById(
          nextOrders
        );
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }

        console.error(
          "WAYBILLS LOAD ERROR:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "خطا در دریافت حواله‌ها."
        );
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        setLoading(false);
        setRefreshing(false);
        setRelationsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredWaybills =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return waybills.filter(
        (waybill) => {
          const matchesStatus =
            statusFilter ===
              "all" ||
            waybill.status ===
              statusFilter;

          if (
            !matchesStatus
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const order =
            ordersById[
              waybill.order_id
            ];

          const searchableText = [
            String(
              waybill.waybill_number
            ),
            waybill.id,
            waybill.order_id,
            waybill.waybill_date,
            waybill.notes ?? "",
            order?.customer?.name ??
              "",
            order?.customer?.phone ??
              "",
            order?.customer
              ?.customer_type ??
              "",
            order?.total_tonnage ??
              "",
            ...(
              waybill.items ??
              []
            ).map(
              (item) =>
                `${
                  item.product_name_snapshot ??
                  ""
                } ${
                  item.product_id
                }`
            ),
            getStatusLabel(
              waybill.status
            ),
            getLoadingStatusLabel(
              waybill
            ),
          ]
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            query
          );
        }
      );
    }, [
      waybills,
      ordersById,
      search,
      statusFilter,
    ]);

  const totalTonnage =
    useMemo(() => {
      return filteredWaybills.reduce(
        (sum, waybill) =>
          sum +
          getWaybillTonnage(
            waybill
          ),
        0
      );
    }, [filteredWaybills]);

  const loadingTonnage =
    useMemo(() => {
      return filteredWaybills.reduce(
        (sum, waybill) =>
          sum +
          getLoadingTonnage(
            waybill
          ),
        0
      );
    }, [filteredWaybills]);

  const issuedCount =
    filteredWaybills.filter(
      (waybill) =>
        waybill.status ===
        "issued"
    ).length;

  const loadingConfirmedCount =
    filteredWaybills.filter(
      (waybill) =>
        waybill.status ===
        "loading_confirmed"
    ).length;

  const draftCount =
    filteredWaybills.filter(
      (waybill) =>
        waybill.status ===
        "draft"
    ).length;

  const cancelledCount =
    filteredWaybills.filter(
      (waybill) =>
        waybill.status ===
        "cancelled"
    ).length;

  const hasFilters =
    Boolean(
      search.trim()
    ) ||
    statusFilter !== "all";

  function resetFilters() {
    setSearch("");
    setStatusFilter(
      "all"
    );
  }

  return (
    <main
      dir="rtl"
      className="mx-auto max-w-[1600px] space-y-6 pb-14"
    >
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-slate-900 via-violet-600 to-blue-600" />

        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-100/40 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl" />

        <div className="relative flex flex-col gap-6 p-6 md:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-violet-600 text-white shadow-lg">
              <Truck size={26} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                  حواله‌ها
                </h1>

                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 ring-1 ring-violet-100">
                  مدیریت ارسال
                </span>
              </div>

              <p className="mt-2 text-sm leading-7 text-slate-500 md:text-base">
                ایجاد، پیگیری و کنترل حواله‌های سفارش‌های تأییدشده
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                void loadWaybills(
                  true
                )
              }
              disabled={
                refreshing ||
                loading
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              به‌روزرسانی
            </button>

            <Link
              href="/orders"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-600"
            >
              <Package size={17} />
              سفارش‌ها
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <StatCard
          title="کل حواله‌ها"
          value={formatNumber(
            filteredWaybills.length
          )}
          description="حواله نمایش داده‌شده"
          icon={
            <FileText size={20} />
          }
          className="bg-slate-100 text-slate-700"
        />

        <StatCard
          title="مجموع تناژ"
          value={formatNumber(
            totalTonnage
          )}
          description="تناژ حواله‌ها"
          icon={
            <Package size={20} />
          }
          className="bg-blue-50 text-blue-700"
        />

        <StatCard
          title="صادر شده"
          value={formatNumber(
            issuedCount
          )}
          description="حواله آماده بارگیری"
          icon={
            <Truck size={20} />
          }
          className="bg-blue-50 text-blue-700"
        />

        <StatCard
          title="بارگیری تأیید شده"
          value={formatNumber(
            loadingConfirmedCount
          )}
          description="بارگیری نهایی"
          icon={
            <CheckCircle2
              size={20}
            />
          }
          className="bg-emerald-50 text-emerald-700"
        />

        <StatCard
          title="تناژ بارگیری"
          value={formatNumber(
            loadingTonnage
          )}
          description="تناژ نهایی بارگیری"
          icon={
            <Truck size={20} />
          }
          className="bg-violet-50 text-violet-700"
        />

        <StatCard
          title="پیش‌نویس / لغو"
          value={formatNumber(
            draftCount +
              cancelledCount
          )}
          description="وضعیت‌های غیرنهایی"
          icon={
            <Clock3 size={20} />
          }
          className="bg-amber-50 text-amber-700"
        />
      </section>

      {/* Filters */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              جستجو و فیلتر حواله‌ها
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              بر اساس شماره حواله، مشتری، شناسه سفارش، محصول یا وضعیت جستجو کنید.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
            <FileText size={13} />

            {formatNumber(
              filteredWaybills.length
            )}{" "}
            حواله
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div>
            <label
              htmlFor="waybill-search"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              جستجوی حواله
            </label>

            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="waybill-search"
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="شماره حواله، مشتری، شناسه سفارش، نام محصول..."
                autoComplete="off"
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pr-11 pl-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="waybill-status"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              وضعیت حواله
            </label>

            <select
              id="waybill-status"
              value={
                statusFilter
              }
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as FilterStatus
                )
              }
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            >
              <option value="all">
                همه وضعیت‌ها
              </option>

              <option value="draft">
                پیش‌نویس
              </option>

              <option value="issued">
                صادر شده
              </option>

              <option value="loading_confirmed">
                بارگیری تأیید شده
              </option>

              <option value="cancelled">
                لغو شده
              </option>
            </select>
          </div>
        </div>

        {hasFilters && (
          <div className="mt-5 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={
                resetFilters
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              پاک کردن فیلترها
            </button>
          </div>
        )}
      </section>

      {/* Loading / Error / Empty / List */}
      {loading ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Loader2
              size={26}
              className="animate-spin"
            />
          </div>

          <p className="mt-4 font-bold text-slate-700">
            در حال دریافت حواله‌ها...
          </p>
        </section>
      ) : error ? (
        <section className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm">
          <div className="h-1.5 bg-red-500" />

          <div className="p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <XCircle
                size={25}
              />
            </div>

            <h2 className="mt-5 text-xl font-black text-slate-900">
              خطا در دریافت حواله‌ها
            </h2>

            <p className="mt-2 text-sm leading-7 text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadWaybills(
                  true
                )
              }
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
            >
              <RefreshCw
                size={17}
              />

              تلاش مجدد
            </button>
          </div>
        </section>
      ) : filteredWaybills.length ===
        0 ? (
        <EmptyState
          hasFilter={
            hasFilters
          }
        />
      ) : (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 md:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  فهرست حواله‌ها
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  آخرین حواله‌های ثبت‌شده در سیستم
                </p>
              </div>

              {relationsLoading && (
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                  <Loader2
                    size={13}
                    className="animate-spin"
                  />

                  در حال دریافت اطلاعات سفارش
                </div>
              )}

              {!relationsLoading && (
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                  <FileText
                    size={13}
                  />

                  {formatNumber(
                    filteredWaybills.length
                  )}{" "}
                  مورد
                </div>
              )}
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[1500px] w-full text-right text-sm">
              <thead className="border-b border-slate-100 bg-white">
                <tr>
                  <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                    شماره حواله
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                    تاریخ
                  </th>

                  <th className="px-5 py-4 font-bold text-slate-600">
                    مشتری
                  </th>

                  <th className="px-5 py-4 font-bold text-slate-600">
                    سفارش
                  </th>

                  <th className="px-5 py-4 font-bold text-slate-600">
                    اقلام
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                    تناژ سفارش
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                    تناژ حواله
                  </th>

                  <th className="px-5 py-4 font-bold text-slate-600">
                    وضعیت
                  </th>

                  <th className="px-5 py-4 font-bold text-slate-600">
                    بارگیری
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                    تاریخ بارگیری
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                    عملیات
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredWaybills.map(
                  (waybill) => {
                    const order =
                      ordersById[
                        waybill.order_id
                      ];

                    const waybillTonnage =
                      getWaybillTonnage(
                        waybill
                      );

                    return (
                      <tr
                        key={
                          waybill.id
                        }
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="whitespace-nowrap px-5 py-5">
                          <div className="font-black text-slate-900">
                            {formatNumber(
                              Number(
                                waybill.waybill_number
                              )
                            )}
                          </div>

                          <div
                            dir="ltr"
                            className="mt-1 max-w-[170px] truncate text-[11px] text-slate-400"
                          >
                            {
                              waybill.id
                            }
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-5 py-5">
                          <div className="inline-flex items-center gap-2 text-slate-700">
                            <CalendarDays
                              size={16}
                              className="text-slate-400"
                            />

                            {formatDateSafe(
                              waybill.waybill_date
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          {order ? (
                            <Link
                              href={`/customers/${order.customer_id}`}
                              className="group/customer flex min-w-[240px] items-center gap-3"
                            >
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-700 transition group-hover/customer:bg-blue-100">
                                {order.customer?.name?.charAt(
                                  0
                                ) ||
                                  "م"}
                              </div>

                              <div className="min-w-0">
                                <span className="block truncate font-black text-slate-900 transition group-hover/customer:text-blue-600">
                                  {order
                                    .customer
                                    ?.name ??
                                    "مشتری نامشخص"}
                                </span>

                                {order
                                  .customer
                                  ?.phone && (
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
                              </div>
                            </Link>
                          ) : (
                            <div className="flex min-w-[240px] items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                                <UserRound
                                  size={18}
                                />
                              </div>

                              <div>
                                <span className="block font-bold text-slate-500">
                                  اطلاعات مشتری در دسترس نیست
                                </span>

                                <span
                                  dir="ltr"
                                  className="mt-1 block text-[11px] text-slate-400"
                                >
                                  {
                                    waybill.order_id
                                  }
                                </span>
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-5">
                          <Link
                            href={`/orders/${waybill.order_id}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Package
                              size={14}
                            />

                            مشاهده سفارش
                          </Link>

                          <p
                            dir="ltr"
                            className="mt-2 max-w-[220px] truncate text-[11px] text-slate-400"
                          >
                            {
                              waybill.order_id
                            }
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <span className="inline-flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 font-bold text-violet-700">
                            <FileText
                              size={14}
                            />

                            {formatNumber(
                              waybill.items
                                ?.length ??
                                0
                            )}{" "}
                            قلم
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-5">
                          <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2">
                            <span className="font-black text-slate-800">
                              {formatNumber(
                                Number(
                                  order?.total_tonnage ??
                                    0
                                )
                              )}
                            </span>

                            <span className="text-xs text-slate-500">
                              تن
                            </span>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-5 py-5">
                          <div className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2">
                            <span className="font-black text-emerald-800">
                              {formatNumber(
                                waybillTonnage
                              )}
                            </span>

                            <span className="text-xs font-bold text-emerald-600">
                              تن
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClass(
                              waybill.status
                            )}`}
                          >
                            {getStatusIcon(
                              waybill.status
                            )}

                            {getStatusLabel(
                              waybill.status
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ${getLoadingStatusClass(
                              waybill
                            )}`}
                          >
                            {getLoadingStatusLabel(
                              waybill
                            )}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-5">
                          {waybill.loading
                            ?.loading_date ? (
                            <div className="text-xs font-bold text-slate-700">
                              {formatDateSafe(
                                waybill
                                  .loading
                                  .loading_date
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              —
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/waybills/${waybill.id}`}
                              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-600"
                            >
                              جزئیات حواله

                              <ArrowLeft
                                size={14}
                              />
                            </Link>

                            <Link
                              href={`/orders/${waybill.order_id}`}
                              className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                            >
                              سفارش
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="divide-y divide-slate-100 md:hidden">
            {filteredWaybills.map(
              (waybill) => {
                const order =
                  ordersById[
                    waybill.order_id
                  ];

                const waybillTonnage =
                  getWaybillTonnage(
                    waybill
                  );

                return (
                  <article
                    key={
                      waybill.id
                    }
                    className="p-4"
                  >
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-400">
                            شماره حواله
                          </p>

                          <p className="mt-1 text-xl font-black text-slate-900">
                            {formatNumber(
                              Number(
                                waybill.waybill_number
                              )
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {formatDateSafe(
                              waybill.waybill_date
                            )}
                          </p>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold ${getStatusClass(
                            waybill.status
                          )}`}
                        >
                          {getStatusIcon(
                            waybill.status
                          )}

                          {getStatusLabel(
                            waybill.status
                          )}
                        </span>
                      </div>

                      <div className="mt-4 rounded-2xl bg-blue-50/70 p-4">
                        <p className="text-[10px] font-bold text-blue-400">
                          مشتری
                        </p>

                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-blue-700">
                            {order
                              ?.customer
                              ?.name?.charAt(
                                0
                              ) || "م"}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-blue-900">
                              {order
                                ?.customer
                                ?.name ??
                                "مشتری نامشخص"}
                            </p>

                            {order
                              ?.customer
                              ?.phone && (
                              <p
                                dir="ltr"
                                className="mt-1 text-xs text-blue-700"
                              >
                                {
                                  order
                                    .customer
                                    .phone
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] font-bold text-slate-400">
                            تناژ سفارش
                          </p>

                          <p className="mt-1 text-sm font-black text-slate-800">
                            {formatNumber(
                              Number(
                                order?.total_tonnage ??
                                  0
                              )
                            )}{" "}
                            تن
                          </p>
                        </div>

                        <div className="rounded-xl bg-emerald-50 p-3">
                          <p className="text-[10px] font-bold text-emerald-500">
                            تناژ حواله
                          </p>

                          <p className="mt-1 text-sm font-black text-emerald-800">
                            {formatNumber(
                              waybillTonnage
                            )}{" "}
                            تن
                          </p>
                        </div>

                        <div className="rounded-xl bg-violet-50 p-3">
                          <p className="text-[10px] font-bold text-violet-500">
                            تعداد اقلام
                          </p>

                          <p className="mt-1 text-sm font-black text-violet-800">
                            {formatNumber(
                              waybill
                                .items
                                ?.length ??
                                0
                            )}{" "}
                            قلم
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] font-bold text-slate-400">
                            تاریخ حواله
                          </p>

                          <p className="mt-1 text-xs font-black text-slate-700">
                            {formatDateSafe(
                              waybill.waybill_date
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-bold text-slate-400">
                          وضعیت بارگیری
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1.5 text-[10px] font-bold ${getLoadingStatusClass(
                              waybill
                            )}`}
                          >
                            {getLoadingStatusLabel(
                              waybill
                            )}
                          </span>

                          {waybill.loading
                            ?.loading_date && (
                            <span className="text-[10px] font-bold text-slate-500">
                              تاریخ:{" "}
                              {formatDateSafe(
                                waybill
                                  .loading
                                  .loading_date
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-bold text-slate-400">
                          شناسه سفارش
                        </p>

                        <p
                          dir="ltr"
                          className="mt-1 truncate text-[10px] font-medium text-slate-500"
                        >
                          {
                            waybill.order_id
                          }
                        </p>
                      </div>

                      <div className="mt-4 flex flex-col gap-2">
                        <Link
                          href={`/waybills/${waybill.id}`}
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-600"
                        >
                          جزئیات حواله

                          <ArrowLeft
                            size={14}
                          />
                        </Link>

                        <Link
                          href={`/orders/${waybill.order_id}`}
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          مشاهده سفارش

                          <Package
                            size={14}
                          />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        </section>
      )}
    </main>
  );
}
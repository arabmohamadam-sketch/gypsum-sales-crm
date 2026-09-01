"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Package,
  RefreshCw,
  Truck,
  XCircle,
} from "lucide-react";

import {
  waybillsService,
} from "@/src/lib/services/waybills";

import type {
  Loading,
  Waybill,
  WaybillItem,
} from "@/src/lib/types/waybill";

import {
  formatJalaliDate,
  getTodayJalali,
  jalaliToGregorianDate,
} from "@/src/lib/utils/jalali";

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "۰";
  }

  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getWaybillStatusLabel(status: string): string {
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

function getWaybillStatusClass(status: string): string {
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

function getLoadingStatusLabel(status?: string | null): string {
  switch (status) {
    case "pending":
      return "در انتظار بارگیری";

    case "confirmed":
      return "بارگیری تأیید شده";

    case "cancelled":
      return "بارگیری لغو شده";

    default:
      return "ثبت نشده";
  }
}

function getLoadingStatusClass(status?: string | null): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";

    case "cancelled":
      return "bg-red-50 text-red-700 ring-1 ring-red-100";

    case "pending":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";

    default:
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  }
}

function getItemTonnage(item: WaybillItem): number {
  const tonnage = Number(item.tonnage ?? 0);

  if (tonnage > 0) {
    return tonnage;
  }

  return (
    Number(item.quantity ?? 0) *
    Number(item.weight_kg_snapshot ?? 0) /
    1000
  );
}

export default function WaybillDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const waybillId =
    typeof params.id === "string"
      ? params.id
      : "";

  const [waybill, setWaybill] =
    useState<Waybill | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  async function loadWaybill(
    showRefreshing = false
  ) {
    if (!waybillId) {
      setError("شناسه حواله نامعتبر است.");
      setLoading(false);
      return;
    }

    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const result =
        await waybillsService.getById(
          waybillId
        );

      if (!result) {
        setWaybill(null);
        setError(
          "حواله موردنظر پیدا نشد."
        );
        return;
      }

      setWaybill(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در دریافت اطلاعات حواله."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadWaybill();
  }, [waybillId]);

  async function handleConfirmLoading() {
    if (!waybill) {
      return;
    }

    if (waybill.status !== "issued") {
      setError(
        "فقط حواله صادرشده امکان تأیید بارگیری دارد."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "آیا بارگیری این حواله تأیید شود؟"
      );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      const today =
        getTodayJalali();

      await waybillsService.updateLoading(
        waybill.id,
        {
          loading_date:
            jalaliToGregorianDate(today),
        }
      );

      await waybillsService.confirmLoading(
        waybill.id
      );

      setMessage(
        "بارگیری حواله با موفقیت تأیید شد."
      );

      await loadWaybill(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در تأیید بارگیری."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelLoading() {
    if (!waybill) {
      return;
    }

    if (
      waybill.status !== "issued"
    ) {
      setError(
        "فقط حواله صادرشده امکان لغو بارگیری دارد."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "آیا بارگیری این حواله لغو شود؟"
      );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      await waybillsService.cancelLoading(
        waybill.id
      );

      setMessage(
        "بارگیری حواله لغو شد."
      );

      await loadWaybill(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در لغو بارگیری."
      );
    } finally {
      setActionLoading(false);
    }
  }

  const items =
    useMemo(
      () =>
        (waybill?.items ?? []).filter(
          (item) =>
            !item.deleted_at
        ),
      [waybill]
    );

  const totalQuantity =
    useMemo(
      () =>
        items.reduce(
          (sum, item) =>
            sum +
            Number(
              item.quantity ?? 0
            ),
          0
        ),
      [items]
    );

  const totalTonnage =
    useMemo(
      () =>
        items.reduce(
          (sum, item) =>
            sum +
            getItemTonnage(item),
          0
        ),
      [items]
    );

  const loadingRecord:
    Loading | null =
    waybill?.loading ?? null;

  if (loading) {
    return (
      <main
        dir="rtl"
        className="mx-auto max-w-[1300px]"
      >
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-slate-900 via-violet-600 to-blue-600" />

          <div className="p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100">
              <Loader2
                size={28}
                className="animate-spin text-blue-600"
              />
            </div>

            <p className="mt-5 text-sm font-bold text-slate-600">
              در حال دریافت اطلاعات حواله...
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (error && !waybill) {
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
              خطا در دریافت حواله
            </h1>

            <p className="mt-2 text-sm leading-7 text-red-600">
              {error}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  void loadWaybill(true)
                }
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-blue-600"
              >
                <RefreshCw size={16} />
                تلاش مجدد
              </button>

              <Link
                href="/waybills"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <ArrowRight size={16} />
                بازگشت به حواله‌ها
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!waybill) {
    return null;
  }

  return (
    <main
      dir="rtl"
      className="mx-auto max-w-[1300px] space-y-6 pb-14"
    >
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-slate-900 via-violet-600 to-blue-600" />

        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-100/40 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl" />

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                href="/waybills"
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-blue-600"
              >
                <ArrowRight size={16} />
                بازگشت به حواله‌ها
              </Link>

              <div className="mt-5 flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-violet-600 text-white shadow-lg">
                  <Truck size={27} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                      جزئیات حواله
                    </h1>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${getWaybillStatusClass(
                        waybill.status
                      )}`}
                    >
                      {waybill.status ===
                      "loading_confirmed" ? (
                        <CheckCircle2
                          size={14}
                        />
                      ) : waybill.status ===
                        "cancelled" ? (
                        <XCircle
                          size={14}
                        />
                      ) : waybill.status ===
                        "issued" ? (
                        <Truck
                          size={14}
                        />
                      ) : (
                        <FileText
                          size={14}
                        />
                      )}

                      {getWaybillStatusLabel(
                        waybill.status
                      )}
                    </span>
                  </div>

                  <p className="mt-2 text-lg font-black text-blue-700">
                    حواله شماره{" "}
                    {formatNumber(
                      Number(
                        waybill.waybill_number
                      )
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/orders/${waybill.order_id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <Package size={16} />
                مشاهده سفارش
              </Link>

              <button
                type="button"
                onClick={() =>
                  void loadWaybill(true)
                }
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />
                بروزرسانی
              </button>
            </div>
          </div>
        </div>
      </section>

      {(message || error) && (
        <section
          className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
            error
              ? "border-red-200"
              : "border-emerald-200"
          }`}
        >
          <div
            className={`h-1 ${
              error
                ? "bg-red-500"
                : "bg-emerald-500"
            }`}
          />

          <div className="flex items-start gap-3 p-5">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                error
                  ? "bg-red-50 text-red-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {error ? (
                <XCircle size={18} />
              ) : (
                <CheckCircle2
                  size={18}
                />
              )}
            </div>

            <div>
              <p
                className={`font-black ${
                  error
                    ? "text-red-800"
                    : "text-emerald-800"
                }`}
              >
                {error
                  ? "خطا در عملیات"
                  : "عملیات موفق"}
              </p>

              <p
                className={`mt-1 text-sm leading-6 ${
                  error
                    ? "text-red-600"
                    : "text-emerald-600"
                }`}
              >
                {error || message}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <CalendarDays size={20} />
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400">
                تاریخ حواله
              </p>

              <p className="mt-1 font-black text-slate-900">
                {formatJalaliDate(
                  waybill.waybill_date
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <ClipboardList size={20} />
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400">
                تعداد اقلام
              </p>

              <p className="mt-1 font-black text-slate-900">
                {formatNumber(
                  items.length
                )}{" "}
                قلم
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Package size={20} />
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400">
                تعداد کیسه
              </p>

              <p className="mt-1 font-black text-slate-900">
                {formatNumber(
                  totalQuantity
                )}{" "}
                کیسه
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
              <Truck size={20} />
            </div>

            <div>
              <p className="text-xs font-bold text-emerald-600">
                تناژ کل
              </p>

              <p className="mt-1 font-black text-emerald-900">
                {formatNumber(
                  totalTonnage
                )}{" "}
                تن
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-blue-600">
              اقلام حواله
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900">
              کالاهای این حواله
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              اطلاعات کالاها به‌صورت Snapshot از سفارش ثبت شده است.
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
            {formatNumber(
              items.length
            )}{" "}
            قلم
          </span>
        </div>

        {items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <Package
              size={28}
              className="mx-auto text-slate-400"
            />

            <p className="mt-4 font-black text-slate-700">
              این حواله قلم فعالی ندارد.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {items.map(
              (
                item,
                index
              ) => {
                const tonnage =
                  getItemTonnage(
                    item
                  );

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">
                          {formatNumber(
                            index + 1
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-black text-slate-900">
                            {item.product_name_snapshot ||
                              "بدون نام محصول"}
                          </h3>

                          <p className="mt-1 text-xs text-slate-400">
                            شناسه قلم سفارش:{" "}
                            {item.order_item_id}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-bold text-slate-400">
                            تعداد کیسه
                          </p>

                          <p className="mt-1 text-lg font-black text-slate-900">
                            {formatNumber(
                              Number(
                                item.quantity
                              )
                            )}{" "}
                            کیسه
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-bold text-slate-400">
                            وزن هر کیسه
                          </p>

                          <p className="mt-1 text-lg font-black text-slate-900">
                            {formatNumber(
                              Number(
                                item.weight_kg_snapshot
                              )
                            )}{" "}
                            کیلو
                          </p>
                        </div>

                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                          <p className="text-xs font-bold text-emerald-600">
                            تناژ
                          </p>

                          <p className="mt-1 text-lg font-black text-emerald-900">
                            {formatNumber(
                              tonnage
                            )}{" "}
                            تن
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              }
            )}

            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400">
                    جمع اقلام
                  </p>

                  <p className="mt-1 text-lg font-black">
                    {formatNumber(
                      totalQuantity
                    )}{" "}
                    کیسه
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold text-emerald-300">
                    تناژ کل حواله
                  </p>

                  <p className="mt-1 text-3xl font-black text-emerald-200">
                    {formatNumber(
                      totalTonnage
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

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Truck size={20} />
          </div>

          <div>
            <p className="text-xs font-bold text-blue-600">
              وضعیت بارگیری
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900">
              کنترل بارگیری
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${getLoadingStatusClass(
                  loadingRecord?.status
                )}`}
              >
                {loadingRecord?.status ===
                "confirmed" ? (
                  <CheckCircle2
                    size={15}
                  />
                ) : loadingRecord?.status ===
                  "cancelled" ? (
                  <XCircle size={15} />
                ) : (
                  <Truck size={15} />
                )}

                {getLoadingStatusLabel(
                  loadingRecord?.status
                )}
              </span>

              {loadingRecord?.loading_date && (
                <p className="mt-3 text-sm text-slate-500">
                  تاریخ بارگیری:{" "}
                  <span className="font-black text-slate-800">
                    {formatJalaliDate(
                      loadingRecord.loading_date
                    )}
                  </span>
                </p>
              )}
            </div>

            {waybill.status ===
              "issued" &&
              loadingRecord?.status ===
                "pending" && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() =>
                      void handleConfirmLoading()
                    }
                    disabled={
                      actionLoading
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <CheckCircle2
                        size={16}
                      />
                    )}

                    تأیید بارگیری
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void handleCancelLoading()
                    }
                    disabled={
                      actionLoading
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-6 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    لغو بارگیری
                  </button>
                </div>
              )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-xs font-bold text-slate-400">
              شناسه سفارش
            </p>

            <Link
              href={`/orders/${waybill.order_id}`}
              className="mt-2 block break-all text-sm font-black text-blue-700 hover:text-blue-900"
            >
              {waybill.order_id}
            </Link>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-xs font-bold text-slate-400">
              توضیحات حواله
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {waybill.notes ||
                "توضیحی ثبت نشده است."}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  reportTargetsService,
  type MonthlyTargetReport,
} from "@/src/lib/services/report-targets";

import { getTodayJalali } from "@/src/lib/utils/jalali";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 1,
  }).format(value * 100);
}

function getMonthName(month: number): string {
  const months = [
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
  ];

  return months[month - 1] ?? "";
}

function clampPercent(value: number): number {
  return Math.min(Math.max(value * 100, 0), 100);
}

export default function MonthlyTargetSummary() {
  const today = useMemo(
    () => getTodayJalali(),
    []
  );

  const [report, setReport] =
    useState<MonthlyTargetReport | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        setLoading(true);
        setError(null);

        const result =
          await reportTargetsService.getMonthlyReport(
            today.year,
            today.month
          );

        if (cancelled) {
          return;
        }

        setReport(result);
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "DASHBOARD MONTHLY TARGET LOAD ERROR:",
          err
        );

        setReport(null);

        setError(
          err instanceof Error
            ? err.message
            : "خطا در دریافت هدف ماهانه"
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [today.year, today.month]);

  const monthTitle = `${getMonthName(
    today.month
  )} ${today.year}`;

  if (loading) {
    return (
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 md:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Target size={20} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">
                هدف فروش ماهانه
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {monthTitle}
              </p>
            </div>
          </div>

          <div className="mt-6 flex min-h-32 items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2
                size={18}
                className="animate-spin"
              />
              در حال دریافت اطلاعات هدف...
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm">
        <div className="p-6 md:p-7">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle size={20} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">
                هدف فروش ماهانه
              </h2>

              <p className="mt-1 text-sm leading-6 text-red-600">
                {error}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 md:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Target size={20} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">
                هدف فروش ماهانه
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                برای {monthTitle} هدفی ثبت نشده است.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <Link
              href="/targets"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
            >
              مدیریت اهداف فروش
              <ArrowLeft size={16} />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const achievementRate =
    report.achievementRate ?? 0;

  const progressWidth =
    clampPercent(achievementRate);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-500" />

      <div className="p-6 md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Target size={20} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">
                هدف فروش ماهانه
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                عملکرد فروش در {monthTitle}
              </p>
            </div>
          </div>

          <Link
            href="/targets"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            جزئیات اهداف
            <ArrowLeft size={16} />
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            title="هدف فروش"
            value={`${formatNumber(
              report.targetTonnage
            )} تن`}
            valueClass="text-slate-900"
          />

          <Metric
            title="فروش محقق‌شده"
            value={`${formatNumber(
              report.achievedTonnage
            )} تن`}
            valueClass="text-emerald-700"
          />

          <Metric
            title="باقی‌مانده"
            value={`${formatNumber(
              report.remainingTonnage
            )} تن`}
            valueClass="text-amber-700"
          />

          <Metric
            title="درصد تحقق"
            value={`${formatPercent(
              achievementRate
            )}%`}
            valueClass="text-blue-700"
          />
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-700">
                پیشرفت هدف ماه
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {formatNumber(
                  report.achievedTonnage
                )}{" "}
                تن از{" "}
                {formatNumber(
                  report.targetTonnage
                )}{" "}
                تن
              </p>
            </div>

            <span className="text-sm font-black text-slate-700">
              {formatPercent(
                achievementRate
              )}
              %
            </span>
          </div>

          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-500"
              style={{
                width: `${progressWidth}%`,
              }}
            />
          </div>
        </div>

        {report.regions.length > 0 && (
          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  عملکرد مناطق
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  {formatNumber(
                    report.orderCount
                  )}{" "}
                  سفارش تأییدشده
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {report.regions.map(
                (region) => {
                  const regionRate =
                    region.achievementRate ??
                    0;

                  const regionProgress =
                    clampPercent(
                      regionRate
                    );

                  return (
                    <div
                      key={region.regionId}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-800">
                            {region.regionName}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {formatNumber(
                              region.orderCount
                            )}{" "}
                            سفارش
                          </p>
                        </div>

                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
                          {formatPercent(
                            regionRate
                          )}
                          %
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[11px] text-slate-400">
                            هدف
                          </p>

                          <p className="mt-1 text-sm font-black text-slate-800">
                            {formatNumber(
                              region.targetTonnage
                            )}{" "}
                            تن
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[11px] text-slate-400">
                            محقق‌شده
                          </p>

                          <p className="mt-1 text-sm font-black text-slate-800">
                            {formatNumber(
                              region.achievedTonnage
                            )}{" "}
                            تن
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-teal-500 transition-all duration-500"
                          style={{
                            width: `${regionProgress}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({
  title,
  value,
  valueClass,
}: {
  title: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-500">
        {title}
      </p>

      <p
        className={`mt-2 text-2xl font-black ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}
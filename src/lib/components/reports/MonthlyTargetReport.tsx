"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Target } from "lucide-react";

import {
  reportTargetsService,
  type MonthlyTargetReport,
  type MonthlyTargetReportRegion,
} from "@/src/lib/services/report-targets";

interface MonthlyTargetReportProps {
  year: number | null;
  month: number | null;
  enabled: boolean;
}

function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

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

export default function MonthlyTargetReport({
  year,
  month,
  enabled,
}: MonthlyTargetReportProps) {
  const [report, setReport] = useState<MonthlyTargetReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || year === null || month === null) {
      setReport(null);
      setError(null);
      setLoading(false);
      return;
    }

    const selectedYear = year;
    const selectedMonth = month;

    let cancelled = false;

    async function loadReport() {
      try {
        setLoading(true);
        setError(null);

        const data = await reportTargetsService.getMonthlyReport(
          selectedYear,
          selectedMonth
        );

        if (cancelled) {
          return;
        }

        setReport(data);
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error("Failed to load monthly target report:", err);

        setReport(null);

        setError(
          err instanceof Error
            ? err.message
            : "خطا در دریافت گزارش هدف ماهانه"
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
  }, [enabled, year, month]);

  const monthTitle = useMemo(() => {
    if (year === null || month === null) {
      return "";
    }

    return `${getMonthName(month)} ${toPersianDigits(year)}`;
  }, [year, month]);

  if (!enabled || year === null || month === null) {
    return null;
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Target className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              گزارش هدف فروش ماهانه
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              عملکرد نسبت به هدف ثبت‌شده برای {monthTitle}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[180px] items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>در حال دریافت گزارش هدف ماهانه...</span>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-semibold">خطا در دریافت گزارش</p>

            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      ) : !report ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          اطلاعات هدفی برای این ماه ثبت نشده است.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard
              title="هدف فروش"
              value={formatNumber(report.targetTonnage)}
              suffix="تن"
            />

            <SummaryCard
              title="فروش محقق‌شده"
              value={formatNumber(report.achievedTonnage)}
              suffix="تن"
            />

            <SummaryCard
              title="باقی‌مانده"
              value={formatNumber(report.remainingTonnage)}
              suffix="تن"
            />

            <SummaryCard
              title="تعداد سفارش تأییدشده"
              value={formatNumber(report.orderCount)}
              suffix="سفارش"
            />

            <SummaryCard
              title="درصد تحقق"
              value={formatPercent(report.achievementRate)}
              suffix="%"
            />
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  پیشرفت هدف کل
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {formatNumber(report.achievedTonnage)} تن از{" "}
                  {formatNumber(report.targetTonnage)} تن
                </p>
              </div>

              <span className="text-sm font-bold text-slate-700">
                {formatPercent(report.achievementRate)}%
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{
                  width: `${clampPercent(report.achievementRate)}%`,
                }}
              />
            </div>
          </div>

          {report.regions.length > 0 && (
            <div className="mt-6">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900">
                  عملکرد مناطق
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  مقایسه هدف و فروش محقق‌شده هر منطقه
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {report.regions.map(
                  (region: MonthlyTargetReportRegion) => (
                    <RegionCard
                      key={region.regionId}
                      region={region}
                    />
                  )
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function SummaryCard({
  title,
  value,
  suffix,
}: {
  title: string;
  value: string;
  suffix: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{title}</p>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">
          {toPersianDigits(value)}
        </span>

        <span className="text-xs font-medium text-slate-500">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function RegionCard({
  region,
}: {
  region: MonthlyTargetReportRegion;
}) {
  const achievementRate = region.achievementRate ?? 0;
  const progressWidth = clampPercent(achievementRate);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-900">
            {region.regionName}
          </h4>

          <p className="mt-1 text-xs text-slate-500">
            {formatNumber(region.orderCount)} سفارش تأییدشده
          </p>
        </div>

        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
          {formatPercent(achievementRate)}%
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">هدف</p>

          <p className="mt-1 font-bold text-slate-900">
            {formatNumber(region.targetTonnage)} تن
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">محقق‌شده</p>

          <p className="mt-1 font-bold text-slate-900">
            {formatNumber(region.achievedTonnage)} تن
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-teal-500 transition-all"
            style={{
              width: `${progressWidth}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
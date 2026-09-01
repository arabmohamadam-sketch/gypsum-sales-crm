"use client";

import Link from "next/link";

import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  FileText,
  Phone,
  RefreshCw,
  ShoppingCart,
  Truck,
  Users,
  XCircle,
} from "lucide-react";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  reportsService,
  type CityReport,
  type ReportsData,
} from "@/src/lib/services/reports";

import {
  gregorianToJalali,
  isValidJalaliDate,
  jalaliToGregorian,
} from "@/src/lib/utils/jalali";

type ReportPeriod = {
  from: string;
  to: string;
};

type ReportCardProps = {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
};

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
  return new Intl.NumberFormat(
    "fa-IR"
  ).format(value);
}

function formatDecimal(
  value: number
): string {
  return new Intl.NumberFormat(
    "fa-IR",
    {
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function formatTonnage(
  value: number
): string {
  return `${formatDecimal(value)} تن`;
}

function getTodayJalali() {
  const now = new Date();

  const jalali =
    gregorianToJalali(now);

  if (!jalali) {
    return {
      year: 1405,
      month: 1,
      day: 1,
    };
  }

  return {
    year: jalali.year,
    month: jalali.month,
    day: jalali.day,
  };
}

function getJalaliMonthLastDay(
  month: number
): number {
  if (month >= 1 && month <= 6) {
    return 31;
  }

  if (month >= 7 && month <= 11) {
    return 30;
  }

  return 29;
}

function buildStartOfDayIso(
  year: number,
  month: number,
  day: number
): string {
  if (
    !isValidJalaliDate({
      year,
      month,
      day,
    })
  ) {
    throw new Error(
      "تاریخ جلالی معتبر نیست."
    );
  }

  const gregorian =
    jalaliToGregorian(
      year,
      month,
      day
    );

  const date = new Date(
    gregorian.gy,
    gregorian.gm - 1,
    gregorian.gd,
    0,
    0,
    0,
    0
  );

  return date.toISOString();
}

function buildEndOfDayIso(
  year: number,
  month: number,
  day: number
): string {
  if (
    !isValidJalaliDate({
      year,
      month,
      day,
    })
  ) {
    throw new Error(
      "تاریخ جلالی معتبر نیست."
    );
  }

  const gregorian =
    jalaliToGregorian(
      year,
      month,
      day
    );

  const date = new Date(
    gregorian.gy,
    gregorian.gm - 1,
    gregorian.gd,
    23,
    59,
    59,
    999
  );

  return date.toISOString();
}

function getJalaliDateParts(
  isoDate: string
) {
  const date = new Date(
    isoDate
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return gregorianToJalali(date);
}

function ReportCard({
  title,
  value,
  description,
  icon,
  className = "bg-slate-50 text-slate-700",
}: ReportCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">
            {title}
          </p>

          <p className="mt-3 break-words text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            {value}
          </p>

          <p className="mt-1 text-xs leading-6 text-slate-400">
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

function SectionHeader({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 sm:flex">
        {icon}
      </div>

      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function SummaryItem({
  title,
  value,
  description,
  icon,
  iconClass,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-2xl font-black text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs leading-6 text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function getCityTableOrder(
  city: CityReport
): number {
  const order = [
    "سمنان",
    "گرمسار",
    "ورامین",
    "چالوس",
    "کلاردشت",
    "رامسر",
    "تنکابن",
    "بدون شهر",
  ];

  const index =
    order.indexOf(
      city.cityName
    );

  return index === -1
    ? 999
    : index;
}

function sortCityReports(
  cities: CityReport[]
): CityReport[] {
  return [...cities].sort(
    (a, b) => {
      const orderA =
        getCityTableOrder(a);

      const orderB =
        getCityTableOrder(b);

      if (
        orderA !== orderB
      ) {
        return (
          orderA - orderB
        );
      }

      if (
        b.salesTonnage !==
        a.salesTonnage
      ) {
        return (
          b.salesTonnage -
          a.salesTonnage
        );
      }

      if (
        b.loadingTonnage !==
        a.loadingTonnage
      ) {
        return (
          b.loadingTonnage -
          a.loadingTonnage
        );
      }

      return a.cityName.localeCompare(
        b.cityName,
        "fa"
      );
    }
  );
}

function CityPerformanceCard({
  city,
}: {
  city: CityReport;
}) {
  const loadingRate =
    city.salesTonnage > 0
      ? Math.round(
          (city.loadingTonnage /
            city.salesTonnage) *
            100
        )
      : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900">
            {city.cityName}
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            عملکرد فروش و عملیات
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
          {formatNumber(
            city.customersCount
          )}{" "}
          مشتری
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-blue-50 p-4">
          <p className="text-xs font-bold text-blue-700">
            سفارش
          </p>

          <p className="mt-2 text-xl font-black text-blue-900">
            {formatNumber(
              city.ordersCount
            )}
          </p>
        </div>

        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-xs font-bold text-emerald-700">
            فروش
          </p>

          <p className="mt-2 text-xl font-black text-emerald-900">
            {formatTonnage(
              city.salesTonnage
            )}
          </p>
        </div>

        <div className="rounded-xl bg-violet-50 p-4">
          <p className="text-xs font-bold text-violet-700">
            بارگیری
          </p>

          <p className="mt-2 text-xl font-black text-violet-900">
            {formatTonnage(
              city.loadingTonnage
            )}
          </p>
        </div>

        <div className="rounded-xl bg-amber-50 p-4">
          <p className="text-xs font-bold text-amber-700">
            تحقق بارگیری
          </p>

          <p className="mt-2 text-xl font-black text-amber-900">
            {toPersianDigits(
              loadingRate
            )}
            ٪
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl bg-slate-50 px-3 py-3">
          <span className="text-slate-400">
            تماس
          </span>

          <span className="mr-2 font-black text-slate-800">
            {formatNumber(
              city.callsCount
            )}
          </span>
        </div>

        <div className="rounded-xl bg-slate-50 px-3 py-3">
          <span className="text-slate-400">
            پیگیری
          </span>

          <span className="mr-2 font-black text-slate-800">
            {formatNumber(
              city.followUpsCount
            )}
          </span>
        </div>

        <div className="rounded-xl bg-slate-50 px-3 py-3">
          <span className="text-slate-400">
            حواله
          </span>

          <span className="mr-2 font-black text-slate-800">
            {formatNumber(
              city.waybillsCount
            )}
          </span>
        </div>

        <div className="rounded-xl bg-slate-50 px-3 py-3">
          <span className="text-slate-400">
            بارگیری نهایی
          </span>

          <span className="mr-2 font-black text-slate-800">
            {formatNumber(
              city.loadingConfirmedCount
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const today = useMemo(
    () => getTodayJalali(),
    []
  );

  /*
   * پیش‌فرض گزارش:
   * ماه جاری جلالی
   *
   * مثال:
   * اگر امروز ۱۴۰۵/۰۶/۱۰ باشد:
   * از ۱۴۰۵/۰۶/۰۱
   * تا ۱۴۰۵/۰۶/۳۱
   */
  const currentMonthLastDay =
    getJalaliMonthLastDay(
      today.month
    );

  const [fromYear, setFromYear] =
    useState(
      String(today.year)
    );

  const [fromMonth, setFromMonth] =
    useState(
      String(today.month).padStart(
        2,
        "0"
      )
    );

  const [fromDay, setFromDay] =
    useState("01");

  const [toYear, setToYear] =
    useState(
      String(today.year)
    );

  const [toMonth, setToMonth] =
    useState(
      String(today.month).padStart(
        2,
        "0"
      )
    );

  const [toDay, setToDay] =
    useState(
      String(
        currentMonthLastDay
      ).padStart(2, "0")
    );

  const [report, setReport] =
    useState<ReportsData | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [citySearch, setCitySearch] =
    useState("");

  const currentPeriod =
    useMemo<ReportPeriod | null>(
      () => {
        const fromYearNumber =
          Number(fromYear);

        const fromMonthNumber =
          Number(fromMonth);

        const fromDayNumber =
          Number(fromDay);

        const toYearNumber =
          Number(toYear);

        const toMonthNumber =
          Number(toMonth);

        const toDayNumber =
          Number(toDay);

        if (
          !Number.isInteger(
            fromYearNumber
          ) ||
          !Number.isInteger(
            fromMonthNumber
          ) ||
          !Number.isInteger(
            fromDayNumber
          ) ||
          !Number.isInteger(
            toYearNumber
          ) ||
          !Number.isInteger(
            toMonthNumber
          ) ||
          !Number.isInteger(
            toDayNumber
          )
        ) {
          return null;
        }

        try {
          return {
            from:
              buildStartOfDayIso(
                fromYearNumber,
                fromMonthNumber,
                fromDayNumber
              ),

            to:
              buildEndOfDayIso(
                toYearNumber,
                toMonthNumber,
                toDayNumber
              ),
          };
        } catch {
          return null;
        }
      },
      [
        fromYear,
        fromMonth,
        fromDay,
        toYear,
        toMonth,
        toDay,
      ]
    );

  async function loadReport(
    showRefresh = false
  ) {
    if (!currentPeriod) {
      setError(
        "بازه تاریخ واردشده معتبر نیست."
      );

      setLoading(false);
      setRefreshing(false);

      return;
    }

    const fromDate =
      new Date(
        currentPeriod.from
      );

    const toDate =
      new Date(
        currentPeriod.to
      );

    if (
      Number.isNaN(
        fromDate.getTime()
      ) ||
      Number.isNaN(
        toDate.getTime()
      )
    ) {
      setError(
        "بازه تاریخ واردشده معتبر نیست."
      );

      return;
    }

    if (
      fromDate > toDate
    ) {
      setError(
        "تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد."
      );

      return;
    }

    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const result =
        await reportsService.getReports(
          currentPeriod
        );

      setReport(result);
    } catch (err) {
      console.error(
        "REPORT PAGE LOAD ERROR:",
        err
      );

      setReport(null);

      setError(
        err instanceof Error
          ? err.message
          : "خطا در دریافت اطلاعات گزارش."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        void loadReport();
      }, 0);

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, []);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    void loadReport();
  }

  function setToday() {
    const current =
      getTodayJalali();

    setFromYear(
      String(current.year)
    );

    setFromMonth(
      String(
        current.month
      ).padStart(2, "0")
    );

    setFromDay(
      String(
        current.day
      ).padStart(2, "0")
    );

    setToYear(
      String(current.year)
    );

    setToMonth(
      String(
        current.month
      ).padStart(2, "0")
    );

    setToDay(
      String(
        current.day
      ).padStart(2, "0")
    );
  }

  function setCurrentMonth() {
    const current =
      getTodayJalali();

    const month =
      current.month;

    const lastDay =
      getJalaliMonthLastDay(
        month
      );

    setFromYear(
      String(current.year)
    );

    setFromMonth(
      String(month).padStart(
        2,
        "0"
      )
    );

    setFromDay("01");

    setToYear(
      String(current.year)
    );

    setToMonth(
      String(month).padStart(
        2,
        "0"
      )
    );

    setToDay(
      String(lastDay).padStart(
        2,
        "0"
      )
    );
  }

  const currentRangeLabel =
    useMemo(() => {
      return `${toPersianDigits(
        fromYear
      )}/${toPersianDigits(
        fromMonth
      )}/${toPersianDigits(
        fromDay
      )} تا ${toPersianDigits(
        toYear
      )}/${toPersianDigits(
        toMonth
      )}/${toPersianDigits(
        toDay
      )}`;
    }, [
      fromYear,
      fromMonth,
      fromDay,
      toYear,
      toMonth,
      toDay,
    ]);

  const cityReports =
    useMemo(() => {
      const cities =
        report?.cityReports ?? [];

      const query =
        citySearch
          .trim()
          .toLowerCase();

      const sorted =
        sortCityReports(
          cities
        );

      if (!query) {
        return sorted;
      }

      return sorted.filter(
        (city) =>
          city.cityName
            .toLowerCase()
            .includes(query)
      );
    }, [
      report?.cityReports,
      citySearch,
    ]);

  const cityTotals =
    useMemo(() => {
      return cityReports.reduce(
        (total, city) => {
          total.customersCount +=
            city.customersCount;

          total.ordersCount +=
            city.ordersCount;

          total.salesTonnage +=
            city.salesTonnage;

          total.callsCount +=
            city.callsCount;

          total.followUpsCount +=
            city.followUpsCount;

          total.completedFollowUpsCount +=
            city.completedFollowUpsCount;

          total.pendingFollowUpsCount +=
            city.pendingFollowUpsCount;

          total.waybillsCount +=
            city.waybillsCount;

          total.loadingConfirmedCount +=
            city.loadingConfirmedCount;

          total.loadingTonnage +=
            city.loadingTonnage;

          return total;
        },
        {
          customersCount: 0,
          ordersCount: 0,
          salesTonnage: 0,
          callsCount: 0,
          followUpsCount: 0,
          completedFollowUpsCount: 0,
          pendingFollowUpsCount: 0,
          waybillsCount: 0,
          loadingConfirmedCount: 0,
          loadingTonnage: 0,
        }
      );
    }, [cityReports]);

  const bestSalesCity =
    useMemo(() => {
      return (
        cityReports
          .filter(
            (city) =>
              city.salesTonnage > 0
          )
          .sort(
            (a, b) =>
              b.salesTonnage -
              a.salesTonnage
          )[0] ?? null
      );
    }, [cityReports]);

  const bestLoadingCity =
    useMemo(() => {
      return (
        cityReports
          .filter(
            (city) =>
              city.loadingTonnage > 0
          )
          .sort(
            (a, b) =>
              b.loadingTonnage -
              a.loadingTonnage
          )[0] ?? null
      );
    }, [cityReports]);

  const loadingAchievementRate =
    (report?.sales.totalTonnage ??
      0) > 0
      ? Math.round(
          ((report?.waybills
            .loadingTonnage ??
            0) /
            (report?.sales
              .totalTonnage ??
              1)) *
            100
        )
      : 0;

  const completedRate =
    (report?.activities
      .followUpsCount ??
      0) > 0
      ? Math.round(
          ((report?.activities
            .completedFollowUpsCount ??
            0) /
            (report?.activities
              .followUpsCount ??
              1)) *
            100
        )
      : 0;

  const reportFrom =
    currentPeriod
      ? getJalaliDateParts(
          currentPeriod.from
        )
      : null;

  const reportTo =
    currentPeriod
      ? getJalaliDateParts(
          currentPeriod.to
        )
      : null;

  if (loading) {
    return (
      <main
        dir="rtl"
        className="mx-auto max-w-[1600px] space-y-6"
      >
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 animate-pulse bg-slate-200" />

          <div className="p-7 md:p-9">
            <div className="h-5 w-28 animate-pulse rounded-full bg-slate-200" />

            <div className="mt-5 h-10 w-80 max-w-full animate-pulse rounded-xl bg-slate-200" />

            <div className="mt-3 h-5 w-[500px] max-w-full animate-pulse rounded-xl bg-slate-100" />

            <div className="mt-8 h-36 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({
            length: 8,
          }).map(
            (_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-3xl bg-slate-100"
              />
            )
          )}
        </section>
      </main>
    );
  }

  if (error && !report) {
    return (
      <main
        dir="rtl"
        className="mx-auto max-w-[1600px]"
      >
        <section className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm">
          <div className="h-1.5 bg-red-500" />

          <div className="p-7 md:p-9">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <BarChart3 size={25} />
            </div>

            <h1 className="mt-5 text-2xl font-black text-slate-900">
              خطا در دریافت گزارش
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-7 text-red-600">
              {error}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  void loadReport(
                    true
                  )
                }
                disabled={
                  refreshing
                }
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={17}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                تلاش مجدد
              </button>

              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                بازگشت به داشبورد
                <ArrowLeft size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const sales =
    report?.sales;

  const waybills =
    report?.waybills;

  const activities =
    report?.activities;

  const customers =
    report?.customers;

  return (
    <main
      dir="rtl"
      className="mx-auto max-w-[1600px] space-y-6"
    >
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-slate-900 via-blue-600 to-emerald-500" />

        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-emerald-100/30 blur-3xl" />

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-blue-600"
              >
                <ArrowLeft size={16} />
                بازگشت به داشبورد
              </Link>

              <div className="mt-6 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-lg">
                  <BarChart3 size={26} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                      گزارش‌های فروش و عملیات
                    </h1>

                    <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                      گزارش مدیریتی
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-7 text-slate-500 md:text-base">
                    بررسی عملکرد فروش، حواله، بارگیری و فعالیت مشتریان در بازه زمانی انتخاب‌شده
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  void loadReport(
                    true
                  )
                }
                disabled={
                  refreshing
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                href="/waybills"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700"
              >
                <Truck size={17} />
                حواله‌ها
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
        <SectionHeader
          title="فیلتر بازه گزارش"
          description="بازه زمانی را با تقویم جلالی مشخص کنید."
          icon={
            <CalendarDays size={19} />
          }
        />

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-5"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
              <p className="mb-4 text-sm font-black text-blue-800">
                از تاریخ
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-500">
                    سال
                  </label>

                  <input
                    type="number"
                    min="1300"
                    max="1500"
                    value={fromYear}
                    onChange={(event) =>
                      setFromYear(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-500">
                    ماه
                  </label>

                  <select
                    value={
                      fromMonth
                    }
                    onChange={(event) =>
                      setFromMonth(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    required
                  >
                    {Array.from({
                      length: 12,
                    }).map(
                      (_, index) => {
                        const value =
                          String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          );

                        return (
                          <option
                            key={
                              value
                            }
                            value={
                              value
                            }
                          >
                            {toPersianDigits(
                              value
                            )}
                          </option>
                        );
                      }
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-500">
                    روز
                  </label>

                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={fromDay}
                    onChange={(event) =>
                      setFromDay(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
              <p className="mb-4 text-sm font-black text-emerald-800">
                تا تاریخ
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-500">
                    سال
                  </label>

                  <input
                    type="number"
                    min="1300"
                    max="1500"
                    value={toYear}
                    onChange={(event) =>
                      setToYear(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-500">
                    ماه
                  </label>

                  <select
                    value={
                      toMonth
                    }
                    onChange={(event) =>
                      setToMonth(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                    required
                  >
                    {Array.from({
                      length: 12,
                    }).map(
                      (_, index) => {
                        const value =
                          String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          );

                        return (
                          <option
                            key={
                              value
                            }
                            value={
                              value
                            }
                          >
                            {toPersianDigits(
                              value
                            )}
                          </option>
                        );
                      }
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-500">
                    روز
                  </label>

                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={toDay}
                    onChange={(event) =>
                      setToDay(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={
                  setToday
                }
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
              >
                امروز
              </button>

              <button
                type="button"
                onClick={
                  setCurrentMonth
                }
                className="rounded-xl bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
              >
                ماه جاری
              </button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-xl bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-600">
                بازه:
                <span className="mr-1 text-slate-900">
                  {currentRangeLabel}
                </span>
              </div>

              <button
                type="submit"
                disabled={
                  refreshing ||
                  !currentPeriod
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <BarChart3 size={17} />
                نمایش گزارش
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-lg md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400">
              بازه گزارش انتخاب‌شده
            </p>

            <h2 className="mt-2 text-2xl font-black">
              {currentRangeLabel}
            </h2>
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            <span className="rounded-xl bg-white/10 px-4 py-2.5 font-bold text-slate-300">
              شروع:
              {reportFrom
                ? ` ${toPersianDigits(
                    reportFrom.year
                  )}/${toPersianDigits(
                    reportFrom.month
                  )}/${toPersianDigits(
                    reportFrom.day
                  )}`
                : " —"}
            </span>

            <span className="rounded-xl bg-white/10 px-4 py-2.5 font-bold text-slate-300">
              پایان:
              {reportTo
                ? ` ${toPersianDigits(
                    reportTo.year
                  )}/${toPersianDigits(
                    reportTo.month
                  )}/${toPersianDigits(
                    reportTo.day
                  )}`
                : " —"}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <ReportCard
          title="تعداد سفارش"
          value={formatNumber(
            sales?.ordersCount ??
              0
          )}
          description="سفارش تأییدشده"
          icon={
            <ShoppingCart
              size={22}
            />
          }
          className="bg-violet-50 text-violet-700"
        />

        <ReportCard
          title="تناژ فروش"
          value={formatTonnage(
            sales?.totalTonnage ??
              0
          )}
          description="تناژ فروش در بازه"
          icon={
            <BarChart3
              size={22}
            />
          }
          className="bg-emerald-50 text-emerald-700"
        />

        <ReportCard
          title="تناژ بارگیری"
          value={formatTonnage(
            waybills?.loadingTonnage ??
              0
          )}
          description="بارگیری نهایی"
          icon={
            <Truck size={22} />
          }
          className="bg-blue-50 text-blue-700"
        />

        <ReportCard
          title="تحقق بارگیری"
          value={`${toPersianDigits(
            loadingAchievementRate
          )}٪`}
          description="نسبت بارگیری به فروش"
          icon={
            <CheckCircle2
              size={22}
            />
          }
          className="bg-amber-50 text-amber-700"
        />

        <ReportCard
          title="تکمیل پیگیری"
          value={`${toPersianDigits(
            completedRate
          )}٪`}
          description="پیگیری‌های تکمیل‌شده"
          icon={
            <Bell size={22} />
          }
          className="bg-cyan-50 text-cyan-700"
        />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 md:p-7">
          <SectionHeader
            title="گزارش فروش"
            description="خلاصه سفارش‌های تأییدشده و تناژ فروش"
            icon={
              <ShoppingCart
                size={19}
              />
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryItem
              title="تعداد سفارش‌ها"
              value={formatNumber(
                sales?.ordersCount ??
                  0
              )}
              description="سفارش‌های تأییدشده در بازه"
              icon={
                <ShoppingCart
                  size={20}
                />
              }
              iconClass="bg-violet-50 text-violet-700"
            />

            <SummaryItem
              title="تناژ فروش"
              value={formatTonnage(
                sales?.totalTonnage ??
                  0
              )}
              description="مجموع تناژ سفارش‌های تأییدشده"
              icon={
                <BarChart3
                  size={20}
                />
              }
              iconClass="bg-emerald-50 text-emerald-700"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 md:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeader
              title="گزارش حواله و بارگیری"
              description="وضعیت چرخه حواله از ثبت تا بارگیری نهایی"
              icon={
                <Truck size={19} />
              }
            />

            <Link
              href="/waybills"
              className="mb-6 inline-flex items-center gap-1 text-sm font-bold text-blue-600 transition hover:text-blue-700"
            >
              فهرست حواله‌ها
              <ArrowLeft size={15} />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ReportCard
              title="کل حواله‌ها"
              value={formatNumber(
                waybills?.totalCount ??
                  0
              )}
              description="حواله‌های بازه"
              icon={
                <FileText
                  size={22}
                />
              }
              className="bg-slate-100 text-slate-700"
            />

            <ReportCard
              title="پیش‌نویس"
              value={formatNumber(
                waybills?.draftCount ??
                  0
              )}
              description="هنوز صادر نشده"
              icon={
                <FileText
                  size={22}
                />
              }
              className="bg-slate-100 text-slate-700"
            />

            <ReportCard
              title="صادرشده"
              value={formatNumber(
                waybills?.issuedCount ??
                  0
              )}
              description="در انتظار بارگیری"
              icon={
                <Truck size={22} />
              }
              className="bg-blue-50 text-blue-700"
            />

            <ReportCard
              title="بارگیری تأییدشده"
              value={formatNumber(
                waybills?.loadingConfirmedCount ??
                  0
              )}
              description="بارگیری نهایی"
              icon={
                <CheckCircle2
                  size={22}
                />
              }
              className="bg-emerald-50 text-emerald-700"
            />

            <ReportCard
              title="لغوشده"
              value={formatNumber(
                waybills?.cancelledCount ??
                  0
              )}
              description="حواله لغوشده"
              icon={
                <XCircle
                  size={22}
                />
              }
              className="bg-red-50 text-red-700"
            />

            <ReportCard
              title="تناژ بارگیری"
              value={formatTonnage(
                waybills?.loadingTonnage ??
                  0
              )}
              description="مجموع بارگیری نهایی"
              icon={
                <Truck size={22} />
              }
              className="bg-violet-50 text-violet-700"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 md:p-7">
          <SectionHeader
            title="گزارش فعالیت فروش"
            description="بررسی تماس‌ها و پیگیری‌های ثبت‌شده"
            icon={
              <Activity size={19} />
            }
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <ReportCard
              title="تماس‌ها"
              value={formatNumber(
                activities?.callsCount ??
                  0
              )}
              description="تماس ثبت‌شده"
              icon={
                <Phone size={22} />
              }
              className="bg-sky-50 text-sky-700"
            />

            <ReportCard
              title="کل پیگیری‌ها"
              value={formatNumber(
                activities?.followUpsCount ??
                  0
              )}
              description="پیگیری‌های بازه"
              icon={
                <Bell size={22} />
              }
              className="bg-amber-50 text-amber-700"
            />

            <ReportCard
              title="تکمیل‌شده"
              value={formatNumber(
                activities?.completedFollowUpsCount ??
                  0
              )}
              description="پیگیری تکمیل‌شده"
              icon={
                <CheckCircle2
                  size={22}
                />
              }
              className="bg-emerald-50 text-emerald-700"
            />

            <ReportCard
              title="در انتظار"
              value={formatNumber(
                activities?.pendingFollowUpsCount ??
                  0
              )}
              description="پیگیری در انتظار"
              icon={
                <Bell size={22} />
              }
              className="bg-blue-50 text-blue-700"
            />

            <ReportCard
              title="لغوشده"
              value={formatNumber(
                activities?.cancelledFollowUpsCount ??
                  0
              )}
              description="پیگیری لغوشده"
              icon={
                <XCircle
                  size={22}
                />
              }
              className="bg-red-50 text-red-700"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 md:p-7">
          <SectionHeader
            title="گزارش مشتریان"
            description="تصویر کلی مشتریان فعال و کیفیت پیگیری"
            icon={
              <Users size={19} />
            }
          />

          <div className="grid gap-4 md:grid-cols-2">
            <SummaryItem
              title="مشتریان فعال"
              value={formatNumber(
                customers?.activeCustomersCount ??
                  0
              )}
              description="مشتریان فعال شرکت"
              icon={
                <Users size={20} />
              }
              iconClass="bg-blue-50 text-blue-700"
            />

            <SummaryItem
              title="نرخ تکمیل پیگیری"
              value={`${toPersianDigits(
                completedRate
              )}٪`}
              description="درصد پیگیری‌های تکمیل‌شده در بازه"
              icon={
                <CheckCircle2
                  size={20}
                />
              }
              iconClass="bg-emerald-50 text-emerald-700"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 md:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeader
              title="عملکرد به تفکیک شهر"
              description="مقایسه فروش، بارگیری و فعالیت فروش در شهرهای تحت پوشش"
              icon={
                <BarChart3
                  size={19}
                />
              }
            />

            <div className="mb-6 w-full lg:w-72">
              <input
                type="search"
                value={citySearch}
                onChange={(event) =>
                  setCitySearch(
                    event.target.value
                  )
                }
                placeholder="جستجوی شهر..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cityReports.map(
              (city) => (
                <CityPerformanceCard
                  key={
                    city.cityId ??
                    city.cityName
                  }
                  city={city}
                />
              )
            )}
          </div>

          {cityReports.length ===
            0 && (
            <div className="rounded-2xl bg-slate-50 p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                <Users size={24} />
              </div>

              <p className="mt-4 font-bold text-slate-700">
                شهری برای نمایش پیدا نشد
              </p>

              <p className="mt-1 text-xs text-slate-400">
                عبارت جستجو را تغییر دهید.
              </p>
            </div>
          )}

          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[1100px] w-full text-right text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="whitespace-nowrap px-4 py-4 font-black text-slate-700">
                    شهر
                  </th>

                  <th className="whitespace-nowrap px-4 py-4 font-black text-slate-700">
                    مشتری
                  </th>

                  <th className="whitespace-nowrap px-4 py-4 font-black text-slate-700">
                    سفارش
                  </th>

                  <th className="whitespace-nowrap px-4 py-4 font-black text-slate-700">
                    فروش
                  </th>

                  <th className="whitespace-nowrap px-4 py-4 font-black text-slate-700">
                    تماس
                  </th>

                  <th className="whitespace-nowrap px-4 py-4 font-black text-slate-700">
                    پیگیری
                  </th>

                  <th className="whitespace-nowrap px-4 py-4 font-black text-slate-700">
                    حواله
                  </th>

                  <th className="whitespace-nowrap px-4 py-4 font-black text-slate-700">
                    بارگیری
                  </th>

                  <th className="whitespace-nowrap px-4 py-4 font-black text-slate-700">
                    تناژ بارگیری
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {cityReports.map(
                  (city) => (
                    <tr
                      key={`table-${
                        city.cityId ??
                        city.cityName
                      }`}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <span className="font-black text-slate-900">
                          {
                            city.cityName
                          }
                        </span>
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {formatNumber(
                          city.customersCount
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {formatNumber(
                          city.ordersCount
                        )}
                      </td>

                      <td className="px-4 py-4 font-black text-emerald-700">
                        {formatTonnage(
                          city.salesTonnage
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {formatNumber(
                          city.callsCount
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {formatNumber(
                          city.followUpsCount
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {formatNumber(
                          city.waybillsCount
                        )}
                      </td>

                      <td className="px-4 py-4 font-black text-blue-700">
                        {formatNumber(
                          city.loadingConfirmedCount
                        )}
                      </td>

                      <td className="px-4 py-4 font-black text-violet-700">
                        {formatTonnage(
                          city.loadingTonnage
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>

              <tfoot className="border-t bg-slate-50">
                <tr>
                  <td className="px-4 py-4 font-black text-slate-900">
                    جمع
                  </td>

                  <td className="px-4 py-4 font-black text-slate-900">
                    {formatNumber(
                      cityTotals.customersCount
                    )}
                  </td>

                  <td className="px-4 py-4 font-black text-slate-900">
                    {formatNumber(
                      cityTotals.ordersCount
                    )}
                  </td>

                  <td className="px-4 py-4 font-black text-emerald-700">
                    {formatTonnage(
                      cityTotals.salesTonnage
                    )}
                  </td>

                  <td className="px-4 py-4 font-black text-slate-900">
                    {formatNumber(
                      cityTotals.callsCount
                    )}
                  </td>

                  <td className="px-4 py-4 font-black text-slate-900">
                    {formatNumber(
                      cityTotals.followUpsCount
                    )}
                  </td>

                  <td className="px-4 py-4 font-black text-slate-900">
                    {formatNumber(
                      cityTotals.waybillsCount
                    )}
                  </td>

                  <td className="px-4 py-4 font-black text-blue-700">
                    {formatNumber(
                      cityTotals.loadingConfirmedCount
                    )}
                  </td>

                  <td className="px-4 py-4 font-black text-violet-700">
                    {formatTonnage(
                      cityTotals.loadingTonnage
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <SummaryItem
          title="شهر برتر فروش"
          value={
            bestSalesCity
              ? bestSalesCity.cityName
              : "—"
          }
          description={
            bestSalesCity
              ? formatTonnage(
                  bestSalesCity.salesTonnage
                )
              : "فروشی در بازه ثبت نشده است"
          }
          icon={
            <ShoppingCart
              size={20}
            />
          }
          iconClass="bg-emerald-50 text-emerald-700"
        />

        <SummaryItem
          title="شهر برتر بارگیری"
          value={
            bestLoadingCity
              ? bestLoadingCity.cityName
              : "—"
          }
          description={
            bestLoadingCity
              ? formatTonnage(
                  bestLoadingCity.loadingTonnage
                )
              : "بارگیری در بازه ثبت نشده است"
          }
          icon={
            <Truck size={20} />
          }
          iconClass="bg-blue-50 text-blue-700"
        />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 md:p-7">
          <SectionHeader
            title="جمع‌بندی مدیریتی"
            description="نمای سریع از وضعیت فروش، فعالیت و عملیات در بازه انتخاب‌شده"
            icon={
              <BarChart3
                size={19}
              />
            }
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem
              title="فروش"
              value={formatTonnage(
                sales?.totalTonnage ??
                  0
              )}
              description={`${formatNumber(
                sales?.ordersCount ??
                  0
              )} سفارش تأییدشده`}
              icon={
                <ShoppingCart
                  size={20}
                />
              }
              iconClass="bg-violet-50 text-violet-700"
            />

            <SummaryItem
              title="بارگیری"
              value={formatTonnage(
                waybills?.loadingTonnage ??
                  0
              )}
              description={`${formatNumber(
                waybills?.loadingConfirmedCount ??
                  0
              )} حواله بارگیری‌شده`}
              icon={
                <Truck size={20} />
              }
              iconClass="bg-emerald-50 text-emerald-700"
            />

            <SummaryItem
              title="فعالیت"
              value={formatNumber(
                activities?.callsCount ??
                  0
              )}
              description={`${formatNumber(
                activities?.followUpsCount ??
                  0
              )} پیگیری ثبت‌شده`}
              icon={
                <Activity
                  size={20}
                />
              }
              iconClass="bg-sky-50 text-sky-700"
            />

            <SummaryItem
              title="عملیات حواله"
              value={formatNumber(
                waybills?.totalCount ??
                  0
              )}
              description="مجموع حواله‌های بازه"
              icon={
                <FileText
                  size={20}
                />
              }
              iconClass="bg-slate-100 text-slate-700"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
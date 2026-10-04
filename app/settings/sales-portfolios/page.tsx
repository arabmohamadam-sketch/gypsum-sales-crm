"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  ChevronDown,
  Filter,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import {
  salesPortfoliosService,
  type ManagedSalesPortfolio,
  type SalesPortfolioAssignmentHistory,
  type SalesPortfolioKind,
  type SalesPortfolioManager,
} from "@/src/lib/services/sales-portfolios";
import {
  formatJalaliDate,
  getTodayJalali,
  isValidJalaliDate,
  jalaliToGregorianDate,
  toEnglishDigits,
  toPersianDigits,
} from "@/src/lib/utils/jalali";

const KIND_LABELS: Record<
  SalesPortfolioKind,
  string
> = {
  representative: "نماینده فروش",
  territory: "محدوده تجاری",
  market: "بازار",
  export: "صادرات",
  special: "ویژه",
  other: "سایر",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "خطا در مدیریت سبدهای فروش.";
}

function getTodayJalaliText(): string {
  const today = getTodayJalali();

  return `${toPersianDigits(today.year)}/${toPersianDigits(
    String(today.month).padStart(2, "0")
  )}/${toPersianDigits(
    String(today.day).padStart(2, "0")
  )}`;
}

function parseJalaliDate(value: string): string {
  const normalized = toEnglishDigits(
    value.trim().replace(/-/g, "/")
  );

  const match = normalized.match(
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/
  );

  if (!match) {
    throw new Error(
      "تاریخ را به شکل ۱۴۰۵/۰۷/۰۴ وارد کنید."
    );
  }

  const date = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };

  if (!isValidJalaliDate(date)) {
    throw new Error("تاریخ جلالی واردشده معتبر نیست.");
  }

  return jalaliToGregorianDate(date);
}

function roleLabel(
  manager: SalesPortfolioManager
): string {
  return manager.role_slug === "sales_manager"
    ? "مدیر فروش"
    : "مدیر منطقه";
}

export default function SalesPortfoliosManagementPage() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(
    null
  );

  const [canManage, setCanManage] = useState(false);
  const [portfolios, setPortfolios] = useState<
    ManagedSalesPortfolio[]
  >([]);
  const [managers, setManagers] = useState<
    SalesPortfolioManager[]
  >([]);

  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<
    "all" | SalesPortfolioKind
  >("all");
  const [effectiveDate, setEffectiveDate] = useState(
    getTodayJalaliText()
  );
  const [reason, setReason] = useState("");
  const [pendingManagers, setPendingManagers] =
    useState<Record<string, string>>({});

  const [historyPortfolio, setHistoryPortfolio] =
    useState<ManagedSalesPortfolio | null>(null);
  const [historyRows, setHistoryRows] =
    useState<SalesPortfolioAssignmentHistory[]>([]);
  const [historyLoading, setHistoryLoading] =
    useState(false);
  const [historyError, setHistoryError] =
    useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const result =
        await salesPortfoliosService.getManagementData();

      setCanManage(result.canManage);
      setPortfolios(result.portfolios);
      setManagers(result.managers);

      const nextSelections: Record<string, string> = {};

      for (const portfolio of result.portfolios) {
        nextSelections[portfolio.id] =
          portfolio.current_manager_id ?? "";
      }

      setPendingManagers(nextSelections);
    } catch (err) {
      console.error(
        "Failed to load sales portfolio management:",
        err
      );
      setError(getErrorMessage(err));
      setCanManage(false);
      setPortfolios([]);
      setManagers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadData]);

  const filteredPortfolios = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fa-IR");

    return portfolios.filter((portfolio) => {
      const matchesKind =
        kindFilter === "all" ||
        portfolio.portfolio_kind === kindFilter;

      if (!matchesKind) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        portfolio.name,
        portfolio.code ?? "",
        portfolio.current_manager_name ?? "",
      ].some((value) =>
        value.toLocaleLowerCase("fa-IR").includes(query)
      );
    });
  }, [kindFilter, portfolios, search]);

  const assignedCount = portfolios.filter(
    (portfolio) => portfolio.current_manager_id
  ).length;

  const unassignedCount =
    portfolios.length - assignedCount;

  async function handleOpenHistory(
    portfolio: ManagedSalesPortfolio
  ) {
    try {
      setHistoryPortfolio(portfolio);
      setHistoryRows([]);
      setHistoryError(null);
      setHistoryLoading(true);

      const rows =
        await salesPortfoliosService.getAssignmentHistory(
          portfolio.id
        );

      setHistoryRows(rows);
    } catch (err) {
      console.error(
        "Failed to load sales portfolio assignment history:",
        err
      );
      setHistoryError(getErrorMessage(err));
    } finally {
      setHistoryLoading(false);
    }
  }

  function closeHistory() {
    if (historyLoading) {
      return;
    }

    setHistoryPortfolio(null);
    setHistoryRows([]);
    setHistoryError(null);
  }

  async function handleAssign(
    portfolio: ManagedSalesPortfolio
  ) {
    const managerId =
      pendingManagers[portfolio.id] ?? "";

    if (!managerId) {
      setError(
        `برای «${portfolio.name}» یک مدیر مسئول انتخاب کنید.`
      );
      setSuccess(null);
      return;
    }

    if (managerId === portfolio.current_manager_id) {
      setError(
        `«${portfolio.name}» هم‌اکنون به همین مدیر واگذار شده است.`
      );
      setSuccess(null);
      return;
    }

    try {
      const gregorianDate = parseJalaliDate(
        effectiveDate
      );

      if (!reason.trim()) {
        throw new Error(
          "علت واگذاری را وارد کنید. این متن در سابقه مدیریت ثبت می‌شود."
        );
      }

      setSavingId(portfolio.id);
      setError(null);
      setSuccess(null);

      await salesPortfoliosService.assignManager(
        portfolio.id,
        managerId,
        gregorianDate,
        reason
      );

      const manager = managers.find(
        (item) => item.id === managerId
      );

      setSuccess(
        `واگذاری «${portfolio.name}» به ${
          manager?.full_name ?? "مدیر انتخاب‌شده"
        } با موفقیت ثبت شد.`
      );
      setReason("");
      await loadData();
    } catch (err) {
      console.error(
        "Failed to assign sales portfolio manager:",
        err
      );
      setError(getErrorMessage(err));
      setSuccess(null);
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="flex min-h-[520px] items-center justify-center"
      >
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <Loader2
              size={24}
              className="animate-spin text-blue-600"
            />
          </div>
          <p className="mt-4 text-sm font-black text-slate-700">
            در حال دریافت ساختار پورتفولیوها...
          </p>
        </div>
      </main>
    );
  }

  if (!canManage) {
    return (
      <main dir="rtl" className="mx-auto max-w-[1100px]">
        <section className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">
                دسترسی محدود است
              </h1>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                فقط مدیرعامل، مدیر کل فنی یا مدیر فروشی که این اختیار به او واگذار شده است می‌تواند مسئولیت پورتفولیوها را مدیریت کند.
              </p>
              {error && (
                <p className="mt-3 text-xs leading-6 text-red-600">
                  {error}
                </p>
              )}
              <Link
                href="/settings"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800"
              >
                <ArrowRight size={15} />
                بازگشت به تنظیمات
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="mx-auto max-w-[1500px] space-y-6"
    >
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-slate-900" />

        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
          <div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 transition hover:text-slate-700"
            >
              <ArrowRight size={14} />
              تنظیمات
            </Link>

            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
              <BriefcaseBusiness size={15} />
              مدیریت سازمان
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
              مدیریت سبدهای فروش
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
              تعیین مدیر مسئول برای مناطق تجاری، نمایندگان فروش، بازارها و سبدهای صادراتی. هر واگذاری به‌صورت تاریخ‌دار در سابقه سازمان ثبت می‌شود.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadData();
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw size={17} />
            بروزرسانی
          </button>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-7 text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-7 text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <BriefcaseBusiness size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">
                تعداد پورتفولیوها
              </p>
              <p className="mt-1 text-2xl font-black text-slate-900">
                {toPersianDigits(portfolios.length)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <UserRound size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">
                دارای مدیر مسئول
              </p>
              <p className="mt-1 text-2xl font-black text-slate-900">
                {toPersianDigits(assignedCount)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <UsersRound size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">
                بدون مدیر مسئول
              </p>
              <p className="mt-1 text-2xl font-black text-slate-900">
                {toPersianDigits(unassignedCount)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-7">
        <div className="grid gap-5 xl:grid-cols-[1fr_220px_230px]">
          <div>
            <label className="text-xs font-black text-slate-600">
              جستجو
            </label>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
              placeholder="نام پورتفولیو، کد یا مدیر مسئول..."
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="inline-flex items-center gap-2 text-xs font-black text-slate-600">
              <Filter size={14} />
              نوع
            </label>
            <div className="relative mt-2">
              <select
                value={kindFilter}
                onChange={(event) => {
                  setKindFilter(
                    event.target.value as
                      | "all"
                      | SalesPortfolioKind
                  );
                }}
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pl-10 text-sm font-bold text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
              >
                <option value="all">همه</option>
                {Object.entries(KIND_LABELS).map(
                  ([kind, label]) => (
                    <option key={kind} value={kind}>
                      {label}
                    </option>
                  )
                )}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-600">
              تاریخ شروع مسئولیت
            </label>
            <input
              value={effectiveDate}
              onChange={(event) => {
                const value = toEnglishDigits(
                  event.target.value
                )
                  .replace(/[^0-9/]/g, "")
                  .slice(0, 10);
                setEffectiveDate(value);
              }}
              placeholder="۱۴۰۵/۰۷/۰۴"
              dir="ltr"
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-center text-sm font-bold text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
            />
            <p className="mt-2 text-[11px] leading-5 text-slate-400">
              تاریخ به تقویم جلالی ثبت می‌شود و در دیتابیس به شکل استاندارد ذخیره خواهد شد.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label className="text-xs font-black text-slate-600">
            علت واگذاری
          </label>
          <input
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
            }}
            placeholder="مثلاً: تنظیم ساختار سازمان فروش مهر ۱۴۰۵"
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
          />
          <p className="mt-2 text-[11px] leading-5 text-slate-400">
            این متن برای سابقه مدیریتی ثبت می‌شود و هنگام تغییر مسئولیت قبلی نیز حفظ خواهد شد.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-4 text-right text-xs font-black text-slate-500">
                  پورتفولیو
                </th>
                <th className="px-5 py-4 text-right text-xs font-black text-slate-500">
                  نوع
                </th>
                <th className="px-5 py-4 text-right text-xs font-black text-slate-500">
                  مدیر مسئول فعلی
                </th>
                <th className="px-5 py-4 text-right text-xs font-black text-slate-500">
                  تاریخ شروع فعلی
                </th>
                <th className="px-5 py-4 text-right text-xs font-black text-slate-500">
                  مدیر جدید
                </th>
                <th className="px-5 py-4 text-center text-xs font-black text-slate-500">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPortfolios.map((portfolio) => {
                const selectedManager =
                  pendingManagers[portfolio.id] ?? "";
                const isUnchanged =
                  selectedManager ===
                  (portfolio.current_manager_id ?? "");
                const isSaving =
                  savingId === portfolio.id;

                return (
                  <tr
                    key={portfolio.id}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <td className="px-5 py-5 align-top">
                      <p className="text-sm font-black text-slate-900">
                        {portfolio.name}
                      </p>
                      {portfolio.code && (
                        <p
                          dir="ltr"
                          className="mt-1 text-[11px] text-slate-400"
                        >
                          {portfolio.code}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-5 align-top">
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                        {KIND_LABELS[
                          portfolio.portfolio_kind
                        ]}
                      </span>
                    </td>

                    <td className="px-5 py-5 align-top">
                      {portfolio.current_manager_name ? (
                        <div>
                          <p className="text-sm font-black text-slate-800">
                            {portfolio.current_manager_name}
                          </p>
                          {portfolio.current_manager_role && (
                            <p className="mt-1 text-[11px] font-bold text-slate-400">
                              {portfolio.current_manager_role}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-amber-600">
                          بدون مدیر مسئول
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-5 align-top">
                      <p className="text-sm font-bold text-slate-700">
                        {portfolio.current_effective_from
                          ? formatJalaliDate(
                              portfolio.current_effective_from
                            )
                          : "—"}
                      </p>
                    </td>

                    <td className="px-5 py-5 align-top">
                      <select
                        value={selectedManager}
                        onChange={(event) => {
                          setPendingManagers((current) => ({
                            ...current,
                            [portfolio.id]:
                              event.target.value,
                          }));
                          setError(null);
                          setSuccess(null);
                        }}
                        className="h-11 min-w-[270px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-slate-400"
                      >
                        <option value="">
                          انتخاب مدیر مسئول
                        </option>
                        {managers.map((manager) => (
                          <option
                            key={manager.id}
                            value={manager.id}
                          >
                            {manager.full_name} — {roleLabel(manager)}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-5 py-5 text-center align-top">
                      <div className="flex flex-col items-center gap-2">
                        <button
                          type="button"
                          disabled={
                            isSaving ||
                            isUnchanged ||
                            !portfolio.plan_area_id
                          }
                          onClick={() => {
                            void handleAssign(portfolio);
                          }}
                          className="inline-flex min-w-[130px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                        >
                          {isSaving ? (
                            <Loader2
                              size={15}
                              className="animate-spin"
                            />
                          ) : (
                            <CheckCircle2 size={15} />
                          )}
                          {isSaving
                            ? "در حال ثبت"
                            : "ثبت واگذاری"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void handleOpenHistory(portfolio);
                          }}
                          className="inline-flex min-w-[130px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <Clock3 size={15} />
                          سوابق واگذاری
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!filteredPortfolios.length && (
          <div className="p-10 text-center">
            <p className="text-sm font-bold text-slate-500">
              نتیجه‌ای برای فیلتر فعلی پیدا نشد.
            </p>
          </div>
        )}
      </section>

      {historyPortfolio && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeHistory();
            }
          }}
        >
          <section
            dir="rtl"
            className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="portfolio-history-title"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
                  <Clock3 size={15} />
                  تاریخچه سازمانی
                </div>
                <h2
                  id="portfolio-history-title"
                  className="mt-3 text-xl font-black text-slate-900"
                >
                  سوابق واگذاری «{historyPortfolio.name}»
                </h2>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  سوابق قبلی حذف نمی‌شوند و هر مسئولیت با بازه زمانی مستقل نگهداری می‌شود.
                </p>
              </div>

              <button
                type="button"
                onClick={closeHistory}
                disabled={historyLoading}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="بستن"
              >
                <span className="text-xl leading-none">×</span>
              </button>
            </div>

            <div className="max-h-[62vh] overflow-y-auto p-5 sm:p-6">
              {historyLoading ? (
                <div className="flex min-h-[240px] items-center justify-center">
                  <div className="text-center">
                    <Loader2
                      size={26}
                      className="mx-auto animate-spin text-blue-600"
                    />
                    <p className="mt-3 text-sm font-bold text-slate-600">
                      در حال دریافت سوابق...
                    </p>
                  </div>
                </div>
              ) : historyError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold leading-7 text-red-700">
                  {historyError}
                </div>
              ) : historyRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                  <Clock3 size={24} className="mx-auto text-slate-400" />
                  <p className="mt-3 text-sm font-black text-slate-700">
                    هنوز سابقه‌ای برای این پورتفولیو ثبت نشده است.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-[1050px] w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 py-3 text-right text-xs font-black text-slate-500">
                          مدیر مسئول
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-black text-slate-500">
                          بازه مسئولیت
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-black text-slate-500">
                          علت واگذاری
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-black text-slate-500">
                          ثبت‌کننده
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-black text-slate-500">
                          پایان‌دهنده / علت پایان
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.map((history) => (
                        <tr
                          key={history.id}
                          className="border-b border-slate-100 last:border-b-0"
                        >
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm font-black text-slate-800">
                              {history.manager_name}
                            </p>
                            {history.manager_role_name && (
                              <p className="mt-1 text-[11px] font-bold text-slate-400">
                                {history.manager_role_name}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm font-bold text-slate-700">
                              {formatJalaliDate(history.effective_from)}
                              <span className="mx-1 text-slate-300">→</span>
                              {history.effective_to
                                ? formatJalaliDate(history.effective_to)
                                : "در حال مسئولیت"}
                            </p>
                            <p className="mt-1 text-[11px] font-medium text-slate-400">
                              ثبت: {new Date(history.assigned_at).toLocaleString("fa-IR")}
                            </p>
                          </td>
                          <td className="max-w-[260px] px-4 py-4 align-top">
                            <p className="text-xs font-medium leading-6 text-slate-600">
                              {history.assignment_reason}
                            </p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm font-bold text-slate-700">
                              {history.assigned_by_name}
                            </p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            {history.ended_by_name ? (
                              <div>
                                <p className="text-sm font-bold text-slate-700">
                                  {history.ended_by_name}
                                </p>
                                {history.end_reason && (
                                  <p className="mt-1 text-xs leading-5 text-slate-500">
                                    {history.end_reason}
                                  </p>
                                )}
                                {history.ended_at && (
                                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                                    ثبت پایان: {new Date(history.ended_at).toLocaleString("fa-IR")}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                سابقه جاری
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck
            size={19}
            className="mt-0.5 shrink-0 text-blue-600"
          />
          <div>
            <p className="text-sm font-black text-blue-900">
              نکته کنترلی
            </p>
            <p className="mt-1 text-xs leading-6 text-blue-800">
              واگذاری مدیر از طریق RPC امن انجام می‌شود؛ سابقه قبلی حذف نمی‌شود و مشتریان با مالکیت ثابت نیز به‌صورت خودکار جابه‌جا نمی‌شوند. در این مرحله فقط مسئولیت Portfolio مدیریت می‌شود.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useActivities } from "@/src/lib/hooks/useActivities";
import { formatJalaliDateTime } from "@/src/lib/utils/jalali";

const statusLabels: Record<string, string> = {
  pending: "در انتظار",
  completed: "تکمیل شده",
  cancelled: "لغو شده",
  overdue: "عقب‌افتاده",
};

const priorityLabels: Record<string, string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
  urgent: "فوری",
};

function toPersianDigits(value: string | number): string {
  return String(value).replace(
    /\d/g,
    (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]
  );
}

function getStatusLabel(value?: string | null): string {
  if (!value) {
    return "—";
  }

  return statusLabels[value] ?? value;
}

function getPriorityLabel(value?: string | null): string {
  if (!value) {
    return "—";
  }

  return priorityLabels[value] ?? value;
}

function getStatusClass(value?: string | null): string {
  switch (value) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";

    case "pending":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-100";

    case "overdue":
      return "bg-red-50 text-red-700 ring-1 ring-red-100";

    case "cancelled":
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";

    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
}

function getPriorityClass(value?: string | null): string {
  switch (value) {
    case "urgent":
      return "bg-red-50 text-red-700 ring-1 ring-red-100";

    case "high":
      return "bg-orange-50 text-orange-700 ring-1 ring-orange-100";

    case "medium":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";

    case "low":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";

    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
}

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

  return "خطایی در انجام عملیات رخ داد.";
}

function StatCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string;
  icon: string;
  tone: "slate" | "blue" | "emerald" | "red";
}) {
  const toneClasses = {
    slate: {
      icon: "bg-slate-100 text-slate-700",
      value: "text-slate-900",
    },
    blue: {
      icon: "bg-blue-50 text-blue-700",
      value: "text-blue-700",
    },
    emerald: {
      icon: "bg-emerald-50 text-emerald-700",
      value: "text-emerald-700",
    },
    red: {
      icon: "bg-red-50 text-red-700",
      value: "text-red-700",
    },
  };

  const current = toneClasses[tone];

  return (
    <div className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p
            className={`mt-3 text-3xl font-black ${current.value}`}
          >
            {value}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl transition group-hover:scale-105 ${current.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-xl text-white shadow-sm">
        {icon}
      </div>

      <div>
        <h2 className="text-xl font-black text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function ActivitiesPage() {
  const {
    followUps,
    followUpsLoading,
    followUpsError,
    completeFollowUp,
    deleteFollowUp,
  } = useActivities();

  const [search, setSearch] = useState("");

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const [statusFilter, setStatusFilter] =
    useState<
      "all" |
      "pending" |
      "completed" |
      "cancelled" |
      "overdue"
    >("all");

  const [priorityFilter, setPriorityFilter] =
    useState<
      "all" |
      "low" |
      "medium" |
      "high" |
      "urgent"
    >("all");

  const filteredFollowUps = useMemo(() => {
    const query = search.trim().toLowerCase();

    return followUps.filter((followUp) => {
      const matchesStatus =
        statusFilter === "all" ||
        followUp.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        followUp.priority === priorityFilter;

      if (!matchesStatus || !matchesPriority) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchableText = [
        followUp.customer?.name ?? "",
        followUp.customer?.phone ?? "",
        followUp.user?.full_name ?? "",
        followUp.subject ?? "",
        followUp.notes ?? "",
        getStatusLabel(followUp.status),
        getPriorityLabel(followUp.priority),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [
    followUps,
    search,
    statusFilter,
    priorityFilter,
  ]);

  const pendingCount = followUps.filter(
    (item) => item.status === "pending"
  ).length;

  const completedCount = followUps.filter(
    (item) => item.status === "completed"
  ).length;

  const overdueCount = followUps.filter(
    (item) => item.status === "overdue"
  ).length;

  async function handleComplete(id: string) {
    try {
      setActionLoading(`complete-${id}`);

      await completeFollowUp(id);
    } catch (error) {
      console.error(
        "خطا در تکمیل پیگیری:",
        error
      );

      window.alert(
        getErrorMessage(error)
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "آیا از حذف این پیگیری مطمئن هستید؟"
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(`delete-${id}`);

      await deleteFollowUp(id);
    } catch (error) {
      console.error(
        "خطا در حذف پیگیری:",
        error
      );

      window.alert(
        getErrorMessage(error)
      );
    } finally {
      setActionLoading(null);
    }
  }

  const hasFilters =
    Boolean(search.trim()) ||
    statusFilter !== "all" ||
    priorityFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 p-4 md:p-6"
    >
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-slate-900 via-emerald-600 to-teal-500" />

          <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-emerald-100/50 blur-3xl" />

          <div className="absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl" />

          <div className="relative p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-2xl text-white shadow-lg shadow-emerald-100">
                  📌
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                      فعالیت‌های فروش
                    </h1>

                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                      CRM
                    </span>
                  </div>

                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500 md:text-base">
                    مدیریت تماس‌ها و پیگیری‌های مشتریان در یک صفحه.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/activities/calls"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  📞 تماس‌ها
                </Link>

                <Link
                  href="/activities/follow-ups"
                  className="inline-flex items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                >
                  📌 پیگیری‌ها
                </Link>

                <Link
                  href="/activities/calls/new"
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
                >
                  + ثبت تماس
                </Link>

                <Link
                  href="/activities/follow-ups/new"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700"
                >
                  + ثبت پیگیری
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* Error */}
        {followUpsError && (
          <section className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
            <div className="h-1 bg-red-500" />

            <div className="flex items-start gap-3 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 font-black text-red-600">
                !
              </div>

              <div>
                <p className="font-black text-red-800">
                  خطا در دریافت پیگیری‌ها
                </p>

                <p className="mt-1 text-sm leading-6 text-red-600">
                  {followUpsError}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="کل پیگیری‌ها"
            value={toPersianDigits(
              followUps.length
            )}
            icon="📌"
            tone="slate"
          />

          <StatCard
            title="در انتظار"
            value={toPersianDigits(
              pendingCount
            )}
            icon="⏳"
            tone="blue"
          />

          <StatCard
            title="تکمیل شده"
            value={toPersianDigits(
              completedCount
            )}
            icon="✓"
            tone="emerald"
          />

          <StatCard
            title="عقب‌افتاده"
            value={toPersianDigits(
              overdueCount
            )}
            icon="!"
            tone="red"
          />
        </section>

        {/* Quick Links */}
        <section className="grid gap-4 md:grid-cols-2">

          <Link
            href="/activities/calls"
            className="group overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="h-1.5 bg-blue-600" />

            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black tracking-wider text-blue-600">
                    تماس مشتری
                  </p>

                  <h2 className="mt-2 text-xl font-black text-slate-900">
                    مدیریت تماس‌ها
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    تماس‌های ورودی و خروجی را مشاهده و مدیریت کنید.
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                  📞
                </div>
              </div>

              <div className="mt-5 inline-flex items-center text-sm font-black text-blue-700">
                مشاهده تماس‌ها
                <span className="mr-2 transition-transform group-hover:-translate-x-1">
                  ←
                </span>
              </div>
            </div>
          </Link>

          <Link
            href="/activities/follow-ups"
            className="group overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="h-1.5 bg-emerald-600" />

            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black tracking-wider text-emerald-600">
                    پیگیری فروش
                  </p>

                  <h2 className="mt-2 text-xl font-black text-slate-900">
                    مدیریت پیگیری‌ها
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    پیگیری‌های زمان‌بندی‌شده را بررسی و تکمیل کنید.
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                  📌
                </div>
              </div>

              <div className="mt-5 inline-flex items-center text-sm font-black text-emerald-700">
                مشاهده پیگیری‌ها
                <span className="mr-2 transition-transform group-hover:-translate-x-1">
                  ←
                </span>
              </div>
            </div>
          </Link>

        </section>

        {/* Search + Filters */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">

          <SectionTitle
            icon="🔎"
            title="جستجو و فیلتر"
            description="پیگیری موردنظر را سریع‌تر پیدا کنید."
          />

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_220px_220px]">

            <div className="relative">
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                🔎
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="نام مشتری، تلفن، موضوع، مسئول یا توضیحات..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pr-11 pl-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="پاک کردن جستجو"
                >
                  ×
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | "all"
                    | "pending"
                    | "completed"
                    | "cancelled"
                    | "overdue"
                )
              }
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            >
              <option value="all">
                همه وضعیت‌ها
              </option>

              <option value="pending">
                در انتظار
              </option>

              <option value="completed">
                تکمیل شده
              </option>

              <option value="cancelled">
                لغو شده
              </option>

              <option value="overdue">
                عقب‌افتاده
              </option>
            </select>

            <select
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(
                  event.target.value as
                    | "all"
                    | "low"
                    | "medium"
                    | "high"
                    | "urgent"
                )
              }
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            >
              <option value="all">
                همه اولویت‌ها
              </option>

              <option value="urgent">
                فوری
              </option>

              <option value="high">
                زیاد
              </option>

              <option value="medium">
                متوسط
              </option>

              <option value="low">
                کم
              </option>
            </select>

          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">
              تعداد نتایج:
              <span className="mr-2 font-black text-slate-900">
                {toPersianDigits(
                  filteredFollowUps.length
                )}
              </span>
            </p>

            {hasFilters && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
              >
                پاک کردن فیلترها
              </button>
            )}
          </div>

        </section>

        {/* Loading */}
        {followUpsLoading && (
          <section className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
            <div className="mx-auto max-w-sm text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                📌
              </div>

              <p className="mt-4 font-black text-slate-700">
                در حال دریافت پیگیری‌ها...
              </p>

              <div className="mx-auto mt-4 h-2 w-48 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" />
              </div>

            </div>
          </section>
        )}

        {/* Empty */}
        {!followUpsLoading &&
          !followUpsError &&
          filteredFollowUps.length === 0 && (
            <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                📌
              </div>

              <h2 className="mt-5 text-xl font-black text-slate-900">
                پیگیری‌ای برای نمایش وجود ندارد
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500">
                {hasFilters
                  ? "با فیلترهای دیگری جستجو کنید."
                  : "اولین پیگیری مشتری را ثبت کنید تا در این بخش نمایش داده شود."}
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">

                {hasFilters && (
                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    پاک کردن فیلترها
                  </button>
                )}

                <Link
                  href="/activities/follow-ups/new"
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
                >
                  + ثبت پیگیری
                </Link>

              </div>

            </section>
          )}

        {/* List */}
        {!followUpsLoading &&
          !followUpsError &&
          filteredFollowUps.length > 0 && (
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

              <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <h2 className="font-black text-slate-900">
                    فهرست پیگیری‌ها
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    نمایش{" "}
                    {toPersianDigits(
                      filteredFollowUps.length
                    )}{" "}
                    پیگیری
                  </p>
                </div>

                {hasFilters && (
                  <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                    فیلتر فعال است
                  </span>
                )}

              </div>

              {/* Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-right text-sm">

                  <thead className="border-b border-slate-100 bg-white">
                    <tr>
                      <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                        مشتری
                      </th>

                      <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                        موضوع
                      </th>

                      <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                        مسئول
                      </th>

                      <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                        زمان پیگیری
                      </th>

                      <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                        اولویت
                      </th>

                      <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                        وضعیت
                      </th>

                      <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                        عملیات
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {filteredFollowUps.map(
                      (followUp) => (
                        <tr
                          key={followUp.id}
                          className="transition hover:bg-slate-50"
                        >

                          <td className="px-5 py-4">
                            {followUp.customer?.id ? (
                              <Link
                                href={`/customers/${followUp.customer.id}`}
                                className="group flex items-center gap-3"
                              >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-700">
                                  {followUp.customer?.name?.charAt(
                                    0
                                  ) || "م"}
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-bold text-slate-900 group-hover:text-blue-600">
                                    {followUp.customer.name}
                                  </p>

                                  {followUp.customer.phone && (
                                    <p
                                      dir="ltr"
                                      className="mt-1 text-xs text-slate-400"
                                    >
                                      {followUp.customer.phone}
                                    </p>
                                  )}
                                </div>
                              </Link>
                            ) : (
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-600">
                                  م
                                </div>

                                <span className="font-bold text-slate-500">
                                  مشتری نامشخص
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <p className="max-w-xs font-bold text-slate-800">
                              {followUp.subject ||
                                "بدون موضوع"}
                            </p>

                            {followUp.notes && (
                              <p className="mt-1 max-w-xs truncate text-xs text-slate-400">
                                {followUp.notes}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-slate-700">
                            {followUp.user?.full_name ??
                              "—"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                            {formatJalaliDateTime(
                              followUp.scheduled_at
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${getPriorityClass(
                                followUp.priority
                              )}`}
                            >
                              {getPriorityLabel(
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
                              {getStatusLabel(
                                followUp.status
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-2">

                              {followUp.status !==
                                "completed" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleComplete(
                                      followUp.id
                                    )
                                  }
                                  disabled={
                                    actionLoading ===
                                    `complete-${followUp.id}`
                                  }
                                  className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {actionLoading ===
                                  `complete-${followUp.id}`
                                    ? "در حال تکمیل..."
                                    : "✓ تکمیل"}
                                </button>
                              )}

                              <Link
                                href={`/activities/follow-ups/${followUp.id}/edit`}
                                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                              >
                                ویرایش
                              </Link>

                              <button
                                type="button"
                                onClick={() =>
                                  void handleDelete(
                                    followUp.id
                                  )
                                }
                                disabled={
                                  actionLoading ===
                                  `delete-${followUp.id}`
                                }
                                className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {actionLoading ===
                                `delete-${followUp.id}`
                                  ? "در حال حذف..."
                                  : "حذف"}
                              </button>

                            </div>
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="divide-y divide-slate-100 md:hidden">

                {filteredFollowUps.map(
                  (followUp) => (
                    <div
                      key={followUp.id}
                      className="p-5"
                    >

                      <div className="flex items-start justify-between gap-3">

                        {followUp.customer?.id ? (
                          <Link
                            href={`/customers/${followUp.customer.id}`}
                            className="flex min-w-0 items-center gap-3"
                          >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-700">
                              {followUp.customer?.name?.charAt(
                                0
                              ) || "م"}
                            </div>

                            <div className="min-w-0">
                              <h2 className="truncate font-black text-slate-900">
                                {followUp.customer.name}
                              </h2>

                              {followUp.customer.phone && (
                                <p
                                  dir="ltr"
                                  className="mt-1 text-xs text-slate-400"
                                >
                                  {followUp.customer.phone}
                                </p>
                              )}
                            </div>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 font-black text-slate-600">
                              م
                            </div>

                            <span className="font-bold text-slate-500">
                              مشتری نامشخص
                            </span>
                          </div>
                        )}

                        <span
                          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClass(
                            followUp.status
                          )}`}
                        >
                          {getStatusLabel(
                            followUp.status
                          )}
                        </span>

                      </div>

                      <div className="mt-5 rounded-2xl bg-slate-50 p-4">

                        <div>
                          <p className="text-xs font-medium text-slate-400">
                            موضوع پیگیری
                          </p>

                          <p className="mt-1 font-black text-slate-800">
                            {followUp.subject ||
                              "بدون موضوع"}
                          </p>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4">

                          <div>
                            <p className="text-xs font-medium text-slate-400">
                              مسئول
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-700">
                              {followUp.user?.full_name ??
                                "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-slate-400">
                              اولویت
                            </p>

                            <span
                              className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-bold ${getPriorityClass(
                                followUp.priority
                              )}`}
                            >
                              {getPriorityLabel(
                                followUp.priority
                              )}
                            </span>
                          </div>

                        </div>

                        <div className="mt-4">
                          <p className="text-xs font-medium text-slate-400">
                            زمان پیگیری
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-700">
                            {formatJalaliDateTime(
                              followUp.scheduled_at
                            )}
                          </p>
                        </div>

                        {followUp.notes && (
                          <div className="mt-4 border-t border-slate-200 pt-4">

                            <p className="text-xs font-medium text-slate-400">
                              توضیحات
                            </p>

                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {followUp.notes}
                            </p>

                          </div>
                        )}

                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">

                        {followUp.status !==
                          "completed" && (
                          <button
                            type="button"
                            onClick={() =>
                              void handleComplete(
                                followUp.id
                              )
                            }
                            disabled={
                              actionLoading ===
                              `complete-${followUp.id}`
                            }
                            className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {actionLoading ===
                            `complete-${followUp.id}`
                              ? "در حال تکمیل..."
                              : "✓ تکمیل پیگیری"}
                          </button>
                        )}

                        <Link
                          href={`/activities/follow-ups/${followUp.id}/edit`}
                          className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-center text-xs font-black text-slate-700 transition hover:bg-slate-200"
                        >
                          ویرایش
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDelete(
                              followUp.id
                            )
                          }
                          disabled={
                            actionLoading ===
                            `delete-${followUp.id}`
                          }
                          className="rounded-xl bg-red-50 px-4 py-3 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading ===
                          `delete-${followUp.id}`
                            ? "در حال حذف..."
                            : "حذف"}
                        </button>

                      </div>

                    </div>
                  )
                )}

              </div>

            </section>
          )}

      </div>
    </main>
  );
}
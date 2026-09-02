"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useActivities } from "@/src/lib/hooks/useActivities";
import { formatJalaliDateTime } from "@/src/lib/utils/jalali";

const statusLabels: Record<string, string> = {
  pending: "در انتظار",
  completed: "تکمیل شده",
  cancelled: "لغو شده",
  overdue: "عقب‌افتاده",
  not_due: "سررسید نشده",
};

const priorityLabels: Record<string, string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
  urgent: "فوری",
};

type DisplayStatus =
  | "pending"
  | "completed"
  | "cancelled"
  | "overdue"
  | "not_due";

type StatusFilter = "all" | DisplayStatus;
type PriorityFilter = "all" | "low" | "medium" | "high" | "urgent";

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

function getStatusClass(value: DisplayStatus): string {
  switch (value) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";

    case "pending":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-100";

    case "not_due":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";

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

function isFutureScheduled(scheduledAt?: string | null, now = Date.now()) {
  if (!scheduledAt) {
    return false;
  }

  const scheduledTime = new Date(scheduledAt).getTime();

  if (Number.isNaN(scheduledTime)) {
    return false;
  }

  return scheduledTime > now;
}

function isOverdueFollowUp(
  status?: string | null,
  scheduledAt?: string | null,
  now = Date.now()
) {
  if (status === "overdue") {
    return true;
  }

  if (status !== "pending" || !scheduledAt) {
    return false;
  }

  const scheduledTime = new Date(scheduledAt).getTime();

  if (Number.isNaN(scheduledTime)) {
    return false;
  }

  return scheduledTime <= now;
}

function getDisplayStatus(
  status?: string | null,
  scheduledAt?: string | null,
  now = Date.now()
): DisplayStatus {
  if (status === "completed") {
    return "completed";
  }

  if (status === "cancelled") {
    return "cancelled";
  }

  if (isFutureScheduled(scheduledAt, now)) {
    return "not_due";
  }

  if (isOverdueFollowUp(status, scheduledAt, now)) {
    return "overdue";
  }

  return "pending";
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
  tone: "slate" | "blue" | "amber" | "emerald" | "red";
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
    amber: {
      icon: "bg-amber-50 text-amber-700",
      value: "text-amber-700",
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
          <p className="text-sm font-medium text-slate-500">{title}</p>

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
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [now, setNow] = useState(() => Date.now());

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>("all");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const followUpsWithStatus = useMemo(() => {
    return followUps.map((followUp) => ({
      followUp,
      displayStatus: getDisplayStatus(
        followUp.status,
        followUp.scheduled_at,
        now
      ),
    }));
  }, [followUps, now]);

  const filteredFollowUps = useMemo(() => {
    const query = search.trim().toLowerCase();

    return followUpsWithStatus.filter(
      ({ followUp, displayStatus }) => {
        const matchesStatus =
          statusFilter === "all" ||
          displayStatus === statusFilter;

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
          getStatusLabel(displayStatus),
          getPriorityLabel(followUp.priority),
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      }
    );
  }, [
    followUpsWithStatus,
    search,
    statusFilter,
    priorityFilter,
  ]);

  const pendingCount = followUpsWithStatus.filter(
    ({ displayStatus }) => displayStatus === "pending"
  ).length;

  const notDueCount = followUpsWithStatus.filter(
    ({ displayStatus }) => displayStatus === "not_due"
  ).length;

  const completedCount = followUpsWithStatus.filter(
    ({ displayStatus }) => displayStatus === "completed"
  ).length;

  const overdueCount = followUpsWithStatus.filter(
    ({ displayStatus }) => displayStatus === "overdue"
  ).length;

  async function handleComplete(id: string) {
    const target = followUpsWithStatus.find(
      ({ followUp }) => followUp.id === id
    );

    if (!target) {
      return;
    }

    if (target.displayStatus === "not_due") {
      window.alert(
        "این پیگیری هنوز سررسید نشده است و امکان تکمیل آن وجود ندارد."
      );
      return;
    }

    if (
      target.displayStatus === "completed" ||
      target.displayStatus === "cancelled"
    ) {
      return;
    }

    try {
      setActionLoading(`complete-${id}`);

      await completeFollowUp(id);
    } catch (error) {
      console.error("خطا در تکمیل پیگیری:", error);

      window.alert(getErrorMessage(error));
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
      console.error("خطا در حذف پیگیری:", error);

      window.alert(getErrorMessage(error));
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

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="کل پیگیری‌ها"
            value={toPersianDigits(followUps.length)}
            icon="📌"
            tone="slate"
          />

          <StatCard
            title="در انتظار"
            value={toPersianDigits(pendingCount)}
            icon="⏳"
            tone="blue"
          />

          <StatCard
            title="سررسید نشده"
            value={toPersianDigits(notDueCount)}
            icon="🕒"
            tone="amber"
          />

          <StatCard
            title="تکمیل شده"
            value={toPersianDigits(completedCount)}
            icon="✓"
            tone="emerald"
          />

          <StatCard
            title="عقب‌افتاده"
            value={toPersianDigits(overdueCount)}
            icon="!"
            tone="red"
          />
        </section>

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
                  setSearch(event.target.value)
                }
                placeholder="نام مشتری، تلفن، موضوع، مسئول یا توضیحات..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pr-11 pl-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
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
                  event.target.value as StatusFilter
                )
              }
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="pending">در انتظار</option>
              <option value="not_due">سررسید نشده</option>
              <option value="completed">تکمیل شده</option>
              <option value="cancelled">لغو شده</option>
              <option value="overdue">عقب‌افتاده</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(
                  event.target.value as PriorityFilter
                )
              }
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            >
              <option value="all">همه اولویت‌ها</option>
              <option value="urgent">فوری</option>
              <option value="high">زیاد</option>
              <option value="medium">متوسط</option>
              <option value="low">کم</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">
              تعداد نتایج:
              <span className="mr-2 font-black text-slate-900">
                {toPersianDigits(filteredFollowUps.length)}
              </span>
            </p>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
              >
                حذف فیلترها
              </button>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 md:px-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  لیست پیگیری‌ها
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  پیگیری‌های زمان‌بندی‌شده مشتریان را مدیریت کنید.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                {toPersianDigits(filteredFollowUps.length)} مورد
              </span>
            </div>
          </div>

          {followUpsLoading ? (
            <div className="p-10 text-center">
              <div className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                📌
              </div>

              <p className="mt-4 font-bold text-slate-600">
                در حال دریافت پیگیری‌ها...
              </p>
            </div>
          ) : filteredFollowUps.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                📭
              </div>

              <h3 className="mt-4 text-lg font-black text-slate-900">
                پیگیری‌ای پیدا نشد
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                برای ثبت پیگیری جدید از دکمه «ثبت پیگیری» استفاده کنید.
              </p>

              <Link
                href="/activities/follow-ups/new"
                className="mt-5 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
              >
                + ثبت پیگیری جدید
              </Link>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-right">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-black text-slate-500">
                      <th className="px-5 py-4">مشتری</th>
                      <th className="px-5 py-4">موضوع</th>
                      <th className="px-5 py-4">سررسید</th>
                      <th className="px-5 py-4">اولویت</th>
                      <th className="px-5 py-4">وضعیت</th>
                      <th className="px-5 py-4">مسئول</th>
                      <th className="px-5 py-4 text-left">عملیات</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredFollowUps.map(
                      ({ followUp, displayStatus }) => {
                        const isNotDue =
                          displayStatus === "not_due";

                        const isCompleteLoading =
                          actionLoading ===
                          `complete-${followUp.id}`;

                        const isDeleteLoading =
                          actionLoading ===
                          `delete-${followUp.id}`;

                        return (
                          <tr
                            key={followUp.id}
                            className="transition hover:bg-slate-50/70"
                          >
                            <td className="px-5 py-5">
                              <div className="font-black text-slate-900">
                                {followUp.customer?.name ?? "—"}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {followUp.customer?.phone ?? "بدون تلفن"}
                              </div>
                            </td>

                            <td className="px-5 py-5">
                              <div className="font-bold text-slate-800">
                                {followUp.subject ?? "بدون موضوع"}
                              </div>

                              {followUp.notes && (
                                <div className="mt-1 max-w-xs truncate text-xs text-slate-500">
                                  {followUp.notes}
                                </div>
                              )}
                            </td>

                            <td className="px-5 py-5">
                              <div className="font-bold text-slate-700">
                                {followUp.scheduled_at
                                  ? formatJalaliDateTime(
                                      followUp.scheduled_at
                                    )
                                  : "—"}
                              </div>

                              {isNotDue && (
                                <div className="mt-1 text-xs font-bold text-amber-600">
                                  هنوز موعد فرا نرسیده
                                </div>
                              )}
                            </td>

                            <td className="px-5 py-5">
                              <span
                                className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${getPriorityClass(
                                  followUp.priority
                                )}`}
                              >
                                {getPriorityLabel(
                                  followUp.priority
                                )}
                              </span>
                            </td>

                            <td className="px-5 py-5">
                              <span
                                className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${getStatusClass(
                                  displayStatus
                                )}`}
                              >
                                {getStatusLabel(
                                  displayStatus
                                )}
                              </span>
                            </td>

                            <td className="px-5 py-5">
                              <div className="font-bold text-slate-700">
                                {followUp.user?.full_name ?? "—"}
                              </div>
                            </td>

                            <td className="px-5 py-5">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={`/activities/follow-ups/${followUp.id}/edit`}
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                                >
                                  ویرایش
                                </Link>

                                {displayStatus !==
                                  "completed" &&
                                  displayStatus !==
                                    "cancelled" && (
                                    <button
                                      type="button"
                                      disabled={
                                        isNotDue ||
                                        isCompleteLoading ||
                                        isDeleteLoading
                                      }
                                      onClick={() =>
                                        handleComplete(
                                          followUp.id
                                        )
                                      }
                                      className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                                        isNotDue
                                          ? "cursor-not-allowed bg-amber-50 text-amber-500"
                                          : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                      }`}
                                    >
                                      {isCompleteLoading
                                        ? "در حال ثبت..."
                                        : isNotDue
                                          ? "هنوز سررسید نشده"
                                          : "تکمیل"}
                                    </button>
                                  )}

                                <button
                                  type="button"
                                  disabled={
                                    isDeleteLoading ||
                                    isCompleteLoading
                                  }
                                  onClick={() =>
                                    handleDelete(
                                      followUp.id
                                    )
                                  }
                                  className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isDeleteLoading
                                    ? "در حال حذف..."
                                    : "حذف"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 md:hidden">
                {filteredFollowUps.map(
                  ({ followUp, displayStatus }) => {
                    const isNotDue =
                      displayStatus === "not_due";

                    const isCompleteLoading =
                      actionLoading ===
                      `complete-${followUp.id}`;

                    const isDeleteLoading =
                      actionLoading ===
                      `delete-${followUp.id}`;

                    return (
                      <article
                        key={followUp.id}
                        className="p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-black text-slate-900">
                              {followUp.customer?.name ?? "—"}
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              {followUp.customer?.phone ?? "بدون تلفن"}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${getStatusClass(
                              displayStatus
                            )}`}
                          >
                            {getStatusLabel(
                              displayStatus
                            )}
                          </span>
                        </div>

                        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                          <p className="font-black text-slate-800">
                            {followUp.subject ?? "بدون موضوع"}
                          </p>

                          {followUp.notes && (
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              {followUp.notes}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-2xl border border-slate-100 bg-white p-3">
                            <p className="text-xs text-slate-400">
                              سررسید
                            </p>

                            <p className="mt-1 font-bold text-slate-700">
                              {followUp.scheduled_at
                                ? formatJalaliDateTime(
                                    followUp.scheduled_at
                                  )
                                : "—"}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-100 bg-white p-3">
                            <p className="text-xs text-slate-400">
                              اولویت
                            </p>

                            <p className="mt-1">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${getPriorityClass(
                                  followUp.priority
                                )}`}
                              >
                                {getPriorityLabel(
                                  followUp.priority
                                )}
                              </span>
                            </p>
                          </div>
                        </div>

                        {isNotDue && (
                          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-700">
                            این پیگیری هنوز سررسید نشده است و دکمه
                            تکمیل تا رسیدن زمان سررسید غیرفعال است.
                          </div>
                        )}

                        <div className="mt-4 text-sm">
                          <span className="text-slate-400">
                            مسئول:
                          </span>

                          <span className="mr-2 font-bold text-slate-700">
                            {followUp.user?.full_name ?? "—"}
                          </span>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-2">
                          <Link
                            href={`/activities/follow-ups/${followUp.id}/edit`}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                          >
                            ویرایش
                          </Link>

                          {displayStatus !==
                            "completed" &&
                            displayStatus !==
                              "cancelled" && (
                              <button
                                type="button"
                                disabled={
                                  isNotDue ||
                                  isCompleteLoading ||
                                  isDeleteLoading
                                }
                                onClick={() =>
                                  handleComplete(
                                    followUp.id
                                  )
                                }
                                className={`rounded-xl px-3 py-3 text-xs font-black transition ${
                                  isNotDue
                                    ? "cursor-not-allowed bg-amber-50 text-amber-600"
                                    : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                }`}
                              >
                                {isCompleteLoading
                                  ? "در حال ثبت..."
                                  : isNotDue
                                    ? "هنوز سررسید نشده"
                                    : "تکمیل"}
                              </button>
                            )}

                          {displayStatus ===
                            "completed" && (
                            <div className="col-span-2 rounded-xl bg-emerald-50 px-3 py-3 text-center text-xs font-black text-emerald-700">
                              این پیگیری تکمیل شده است.
                            </div>
                          )}

                          {displayStatus ===
                            "cancelled" && (
                            <div className="col-span-2 rounded-xl bg-slate-100 px-3 py-3 text-center text-xs font-black text-slate-600">
                              این پیگیری لغو شده است.
                            </div>
                          )}

                          <button
                            type="button"
                            disabled={
                              isDeleteLoading ||
                              isCompleteLoading
                            }
                            onClick={() =>
                              handleDelete(
                                followUp.id
                              )
                            }
                            className="col-span-2 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isDeleteLoading
                              ? "در حال حذف..."
                              : "حذف پیگیری"}
                          </button>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
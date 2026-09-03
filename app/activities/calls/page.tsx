"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  activitiesService,
  type CallWithRelations,
} from "@/src/lib/services/activities";

import { formatJalaliDateTime } from "@/src/lib/utils/jalali";

const directionLabels: Record<string, string> = {
  inbound: "تماس ورودی",
  outbound: "تماس خروجی",
};

const outcomeLabels: Record<string, string> = {
  answered: "پاسخ داده شد",
  no_answer: "پاسخ داده نشد",
  busy: "مشغول",
  voicemail: "پیام صوتی",
  wrong_number: "شماره اشتباه",
  scheduled_callback: "تماس مجدد برنامه‌ریزی شد",
};

function getDirectionLabel(
  value?: string | null
): string {
  if (!value) {
    return "—";
  }

  return directionLabels[value] ?? value;
}

function getOutcomeLabel(
  value?: string | null
): string {
  if (!value) {
    return "—";
  }

  return outcomeLabels[value] ?? value;
}

function getDirectionClass(
  value?: string | null
): string {
  switch (value) {
    case "inbound":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-100";

    case "outbound":
    default:
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-100";
  }
}

function getOutcomeClass(
  value?: string | null
): string {
  switch (value) {
    case "answered":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";

    case "busy":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";

    case "no_answer":
      return "bg-orange-50 text-orange-700 ring-1 ring-orange-100";

    case "wrong_number":
      return "bg-red-50 text-red-700 ring-1 ring-red-100";

    case "voicemail":
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";

    case "scheduled_callback":
      return "bg-purple-50 text-purple-700 ring-1 ring-purple-100";

    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
}

function formatDuration(
  seconds?: number | null
): string {
  if (
    seconds === null ||
    seconds === undefined ||
    seconds <= 0
  ) {
    return "—";
  }

  const minutes = Math.floor(
    seconds / 60
  );

  const remainingSeconds =
    seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds} ثانیه`;
  }

  if (remainingSeconds === 0) {
    return `${minutes} دقیقه`;
  }

  return `${minutes} دقیقه و ${remainingSeconds} ثانیه`;
}

function toPersianDigits(
  value: string | number
): string {
  const persianDigits =
    "۰۱۲۳۴۵۶۷۸۹";

  return String(value).replace(
    /\d/g,
    (digit) =>
      persianDigits[Number(digit)]
  );
}

function getErrorMessage(
  error: unknown
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (
      error as {
        message?: unknown;
      }
    ).message === "string"
  ) {
    return (
      error as {
        message: string;
      }
    ).message;
  }

  return "خطایی در دریافت تماس‌ها رخ داد.";
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
  tone:
    | "slate"
    | "blue"
    | "emerald"
    | "violet";
}) {
  const styles = {
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
    violet: {
      icon: "bg-violet-50 text-violet-700",
      value: "text-violet-700",
    },
  };

  const current = styles[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p
            className={`mt-2 text-3xl font-black ${current.value}`}
          >
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${current.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function CallsPage() {
  const [calls, setCalls] =
    useState<CallWithRelations[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [
    deletingId,
    setDeletingId,
  ] = useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const fetchCalls =
    useCallback(
      () =>
        activitiesService.getCalls(),
      []
    );

  const loadCalls =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        const data =
          await fetchCalls();

        setCalls(data);
      } catch (err) {
        console.error(
          "خطا در دریافت لیست تماس‌ها:",
          err
        );

        setError(
          getErrorMessage(err)
        );
      } finally {
        setLoading(false);
      }
    }, [fetchCalls]);

  useEffect(() => {
    let cancelled = false;

    fetchCalls()
      .then((data) => {
        if (cancelled) {
          return;
        }

        setCalls(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        console.error(
          "خطا در دریافت لیست تماس‌ها:",
          err
        );

        setError(
          getErrorMessage(err)
        );
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchCalls]);

  const filteredCalls = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return calls;
    }

    return calls.filter((call) => {
      const customerName =
        call.customer?.name ??
        "";

      const customerPhone =
        call.customer?.phone ??
        "";

      const userName =
        call.user?.full_name ??
        "";

      const direction =
        getDirectionLabel(
          call.direction
        );

      const outcome =
        getOutcomeLabel(
          call.outcome
        );

      const notes =
        call.notes ?? "";

      return [
        customerName,
        customerPhone,
        userName,
        direction,
        outcome,
        notes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [calls, search]);

  const answeredCount =
    calls.filter(
      (call) =>
        call.outcome ===
        "answered"
    ).length;

  const outboundCount =
    calls.filter(
      (call) =>
        call.direction ===
        "outbound"
    ).length;

  const inboundCount =
    calls.filter(
      (call) =>
        call.direction ===
        "inbound"
    ).length;

  async function handleDelete(
    id: string
  ) {
    const confirmed =
      window.confirm(
        "آیا از حذف این تماس مطمئن هستید؟"
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);

      await activitiesService.softDeleteCall(
        id
      );

      setCalls((current) =>
        current.filter(
          (call) =>
            call.id !== id
        )
      );
    } catch (err) {
      console.error(
        "خطا در حذف تماس:",
        err
      );

      window.alert(
        getErrorMessage(err)
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 p-4 md:p-6"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-slate-900 via-blue-600 to-violet-600" />

          <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-blue-100/40 blur-3xl" />

          <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-violet-100/30 blur-3xl" />

          <div className="relative flex flex-col gap-6 p-6 md:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-2xl text-white shadow-lg shadow-blue-100">
                📞
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                    تماس‌های مشتریان
                  </h1>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    فعالیت فروش
                  </span>
                </div>

                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500 md:text-base">
                  تماس‌های ثبت‌شده با مشتریان را مشاهده و مدیریت کنید.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/activities"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                فعالیت‌ها
              </Link>

              <Link
                href="/activities/calls/new"
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md"
              >
                + ثبت تماس جدید
              </Link>
            </div>
          </div>
        </section>

        {error && (
          <section className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
            <div className="h-1 bg-red-500" />

            <div className="flex items-start gap-3 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                !
              </div>

              <div>
                <p className="font-bold text-red-800">
                  خطا در دریافت تماس‌ها
                </p>

                <p className="mt-1 text-sm leading-6 text-red-600">
                  {error}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="کل تماس‌ها"
            value={toPersianDigits(
              calls.length
            )}
            icon="📞"
            tone="slate"
          />

          <StatCard
            title="تماس‌های خروجی"
            value={toPersianDigits(
              outboundCount
            )}
            icon="↗"
            tone="blue"
          />

          <StatCard
            title="تماس‌های ورودی"
            value={toPersianDigits(
              inboundCount
            )}
            icon="↙"
            tone="violet"
          />

          <StatCard
            title="پاسخ داده شده"
            value={toPersianDigits(
              answeredCount
            )}
            icon="✓"
            tone="emerald"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-black text-slate-900">
              جستجوی تماس‌ها
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              جستجو بر اساس نام مشتری، شماره تماس، بازاریاب، نتیجه یا توضیحات
            </p>
          </div>

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
              placeholder="مثلاً آذرنیا، 0912...، محمد عرب یا مشغول"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pr-11 pl-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
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
        </section>

        {loading && (
          <section className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
            <div className="mx-auto max-w-sm text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                📞
              </div>

              <p className="mt-4 font-bold text-slate-700">
                در حال دریافت تماس‌ها...
              </p>

              <div className="mx-auto mt-4 h-2 w-48 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-500" />
              </div>
            </div>
          </section>
        )}

        {!loading &&
          !error &&
          filteredCalls.length === 0 && (
            <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                📞
              </div>

              <h2 className="mt-5 text-xl font-black text-slate-900">
                {search
                  ? "تماسی با این جستجو پیدا نشد"
                  : "هنوز تماسی ثبت نشده است"}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500">
                {search
                  ? "عبارت جستجو را تغییر دهید."
                  : "اولین تماس مشتری را ثبت کنید تا سوابق فروش اینجا نمایش داده شود."}
              </p>

              {!search && (
                <Link
                  href="/activities/calls/new"
                  className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700"
                >
                  + ثبت اولین تماس
                </Link>
              )}
            </section>
          )}

        {!loading &&
          !error &&
          filteredCalls.length > 0 && (
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-black text-slate-900">
                    فهرست تماس‌ها
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    نمایش{" "}
                    {toPersianDigits(
                      filteredCalls.length
                    )}{" "}
                    تماس
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void loadCalls()
                  }
                  disabled={loading}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "در حال بروزرسانی..."
                    : "↻ بروزرسانی"}
                </button>
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-right text-sm">
                  <thead className="border-b border-slate-100 bg-white">
                    <tr>
                      <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                        مشتری
                      </th>

                      <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                        بازاریاب
                      </th>

                      <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                        تاریخ و زمان
                      </th>

                      <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                        جهت
                      </th>

                      <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                        نتیجه
                      </th>

                      <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                        مدت
                      </th>

                      <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600">
                        عملیات
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredCalls.map(
                      (call) => (
                        <tr
                          key={
                            call.id
                          }
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <Link
                              href={
                                call.customer
                                  ?.id
                                  ? `/customers/${call.customer.id}`
                                  : "#"
                              }
                              className="group flex items-center gap-3"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-700">
                                {call.customer?.name?.charAt(
                                  0
                                ) || "م"}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-bold text-slate-900 group-hover:text-blue-600">
                                  {call.customer
                                    ?.name ??
                                    "مشتری نامشخص"}
                                </p>

                                {call.customer
                                  ?.phone && (
                                  <p
                                    dir="ltr"
                                    className="mt-1 text-xs text-slate-400"
                                  >
                                    {
                                      call
                                        .customer
                                        .phone
                                    }
                                  </p>
                                )}
                              </div>
                            </Link>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-medium text-slate-800">
                              {call.user
                                ?.full_name ??
                                "—"}
                            </p>

                            {call.user
                              ?.job_title && (
                              <p className="mt-1 text-xs text-slate-400">
                                {
                                  call.user
                                    .job_title
                                }
                              </p>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-700">
                            {formatJalaliDateTime(
                              call.call_date
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${getDirectionClass(
                                call.direction
                              )}`}
                            >
                              {getDirectionLabel(
                                call.direction
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${getOutcomeClass(
                                call.outcome
                              )}`}
                            >
                              {getOutcomeLabel(
                                call.outcome
                              )}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                            {formatDuration(
                              call.duration_seconds
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={`/activities/calls/${call.id}/edit`}
                                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                              >
                                ویرایش
                              </Link>

                              <button
                                type="button"
                                onClick={() =>
                                  void handleDelete(
                                    call.id
                                  )
                                }
                                disabled={
                                  deletingId ===
                                  call.id
                                }
                                className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {deletingId ===
                                call.id
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

              <div className="divide-y divide-slate-100 md:hidden">
                {filteredCalls.map(
                  (call) => (
                    <div
                      key={
                        call.id
                      }
                      className="p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={
                            call.customer
                              ?.id
                              ? `/customers/${call.customer.id}`
                              : "#"
                          }
                          className="flex min-w-0 items-center gap-3"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-700">
                            {call.customer?.name?.charAt(
                              0
                            ) || "م"}
                          </div>

                          <div className="min-w-0">
                            <h2 className="truncate font-black text-slate-900">
                              {call.customer
                                ?.name ??
                                "مشتری نامشخص"}
                            </h2>

                            {call.customer
                              ?.phone && (
                              <p
                                dir="ltr"
                                className="mt-1 text-xs text-slate-400"
                              >
                                {
                                  call
                                    .customer
                                    .phone
                                }
                              </p>
                            )}
                          </div>
                        </Link>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${getDirectionClass(
                            call.direction
                          )}`}
                        >
                          {getDirectionLabel(
                            call.direction
                          )}
                        </span>
                      </div>

                      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium text-slate-400">
                              بازاریاب
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-700">
                              {call.user
                                ?.full_name ??
                                "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-slate-400">
                              تاریخ و زمان
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-700">
                              {formatJalaliDateTime(
                                call.call_date
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-slate-400">
                              نتیجه
                            </p>

                            <span
                              className={`mt-1 inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${getOutcomeClass(
                                call.outcome
                              )}`}
                            >
                              {getOutcomeLabel(
                                call.outcome
                              )}
                            </span>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-slate-400">
                              مدت تماس
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-700">
                              {formatDuration(
                                call.duration_seconds
                              )}
                            </p>
                          </div>
                        </div>

                        {call.notes && (
                          <div className="mt-4 border-t border-slate-200 pt-4">
                            <p className="text-xs font-medium text-slate-400">
                              توضیحات
                            </p>

                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {
                                call.notes
                              }
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Link
                          href={`/activities/calls/${call.id}/edit`}
                          className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-center text-xs font-black text-slate-700 transition hover:bg-slate-200"
                        >
                          ویرایش
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDelete(
                              call.id
                            )
                          }
                          disabled={
                            deletingId ===
                            call.id
                          }
                          className="flex-1 rounded-xl bg-red-50 px-4 py-3 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId ===
                          call.id
                            ? "در حال حذف..."
                            : "حذف تماس"}
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
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  FileText,
  Phone,
  RefreshCw,
  UserRound,
  XCircle,
} from "lucide-react";

import {
  activitiesService,
  type CallWithRelations,
} from "@/src/lib/services/activities";

import { formatJalaliDate } from "@/src/lib/utils/jalali";

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "۰";
  }

  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function toPersianDigits(value: string | number): string {
  const digits = "۰۱۲۳۴۵۶۷۸۹";

  return String(value).replace(
    /\d/g,
    (digit) => digits[Number(digit)]
  );
}

function getDirectionLabel(
  direction?: string | null
): string {
  switch (direction) {
    case "inbound":
      return "تماس ورودی";

    case "outbound":
      return "تماس خروجی";

    default:
      return direction ?? "—";
  }
}

function getDirectionClass(
  direction?: string | null
): string {
  switch (direction) {
    case "inbound":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-100";

    case "outbound":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-100";

    default:
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  }
}

function getOutcomeLabel(
  outcome?: string | null
): string {
  switch (outcome) {
    case "answered":
      return "پاسخ داده شد";

    case "no_answer":
      return "پاسخ داده نشد";

    case "busy":
      return "مشغول";

    case "voicemail":
      return "پیام صوتی";

    case "wrong_number":
      return "شماره اشتباه";

    case "scheduled_callback":
      return "نیاز به تماس مجدد";

    default:
      return outcome ?? "—";
  }
}

function getOutcomeClass(
  outcome?: string | null
): string {
  switch (outcome) {
    case "answered":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";

    case "scheduled_callback":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";

    case "no_answer":
    case "busy":
      return "bg-orange-50 text-orange-700 ring-1 ring-orange-100";

    case "wrong_number":
      return "bg-red-50 text-red-700 ring-1 ring-red-100";

    case "voicemail":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-100";

    default:
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  }
}

function formatDuration(
  seconds?: number | null
): string {
  if (
    seconds === null ||
    seconds === undefined ||
    !Number.isFinite(seconds)
  ) {
    return "ثبت نشده";
  }

  const totalSeconds = Math.max(
    0,
    Math.round(seconds)
  );

  const minutes = Math.floor(
    totalSeconds / 60
  );

  const remainingSeconds =
    totalSeconds % 60;

  if (minutes === 0) {
    return `${toPersianDigits(
      remainingSeconds
    )} ثانیه`;
  }

  if (remainingSeconds === 0) {
    return `${toPersianDigits(
      minutes
    )} دقیقه`;
  }

  return `${toPersianDigits(
    minutes
  )} دقیقه و ${toPersianDigits(
    remainingSeconds
  )} ثانیه`;
}

function formatDateTime(
  value?: string | null
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${formatJalaliDate(
    date
  )} - ${toPersianDigits(
    date.toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  )}`;
}

function getSourceLabel(
  source?: string | null
): string {
  switch (source) {
    case "manual":
      return "ثبت دستی";

    case "mobile_app":
      return "اپلیکیشن موبایل";

    case "whatsapp":
      return "واتساپ";

    case "sms":
      return "پیامک";

    case "pwa":
      return "PWA";

    case "api":
      return "API";

    default:
      return source ?? "—";
  }
}

function InfoCard({
  label,
  value,
  icon,
  tone = "slate",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "slate" | "blue" | "violet" | "emerald";
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tones[tone]}`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-400">
            {label}
          </p>

          <p className="mt-1 break-words text-sm font-black text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CallDetailsPage() {
  const params = useParams<{
    id: string;
  }>();

  const callId =
    typeof params?.id === "string"
      ? params.id
      : "";

  const [call, setCall] =
    useState<CallWithRelations | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  async function loadCall(
    showRefresh = false
  ) {
    if (!callId) {
      setError(
        "شناسه تماس معتبر نیست."
      );
      setLoading(false);
      return;
    }

    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const result =
        await activitiesService.getCallById(
          callId
        );

      setCall(result);
    } catch (err) {
      console.error(
        "GET CALL DETAILS:",
        err
      );

      setCall(null);

      setError(
        err instanceof Error
          ? err.message
          : "خطا در دریافت اطلاعات تماس."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadCall();
  }, [callId]);

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-50 p-4 md:p-6"
      >
        <div className="mx-auto max-w-5xl">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 bg-gradient-to-r from-slate-900 via-blue-600 to-indigo-600" />

            <div className="p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
                <Phone
                  size={28}
                  className="animate-pulse"
                />
              </div>

              <p className="mt-5 text-sm font-bold text-slate-600">
                در حال دریافت اطلاعات تماس...
              </p>

              <div className="mx-auto mt-5 h-2 w-52 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-500" />
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!call) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-50 p-4 md:p-6"
      >
        <div className="mx-auto max-w-5xl">
          <section className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm">
            <div className="h-1 bg-red-500" />

            <div className="p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <XCircle size={25} />
              </div>

              <h1 className="mt-5 text-2xl font-black text-slate-900">
                تماس پیدا نشد
              </h1>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-red-600">
                {error ||
                  "اطلاعات تماس موردنظر پیدا نشد."}
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    void loadCall(true)
                  }
                  disabled={refreshing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw
                    size={16}
                    className={
                      refreshing
                        ? "animate-spin"
                        : ""
                    }
                  />
                  تلاش مجدد
                </button>

                <Link
                  href="/activities/calls"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  بازگشت به تماس‌ها
                  <ArrowLeft size={16} />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 p-4 md:p-6"
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-slate-900 via-blue-600 to-indigo-600" />

          <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-blue-100/40 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-indigo-100/30 blur-3xl" />

          <div className="relative p-6 md:p-8">
            <Link
              href="/activities/calls"
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-blue-600"
            >
              <ArrowLeft size={16} />
              بازگشت به تماس‌ها
            </Link>

            <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
                  <Phone size={27} />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                      جزئیات تماس
                    </h1>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${getDirectionClass(
                        call.direction
                      )}`}
                    >
                      <Phone size={13} />
                      {getDirectionLabel(
                        call.direction
                      )}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${getOutcomeClass(
                        call.outcome
                      )}`}
                    >
                      {call.outcome ===
                      "answered" ? (
                        <CheckCircle2
                          size={13}
                        />
                      ) : (
                        <Clock3
                          size={13}
                        />
                      )}
                      {getOutcomeLabel(
                        call.outcome
                      )}
                    </span>
                  </div>

                  <p className="mt-2 break-all text-xs text-slate-400">
                    شناسه تماس:{" "}
                    {call.id}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/activities/calls/${call.id}/edit`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700"
                >
                  <Edit3 size={16} />
                  ویرایش تماس
                </Link>

                <button
                  type="button"
                  onClick={() =>
                    void loadCall(true)
                  }
                  disabled={refreshing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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

        {error && (
          <section className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
            <div className="h-1 bg-red-500" />

            <div className="flex items-start gap-3 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <XCircle size={18} />
              </div>

              <div>
                <p className="font-black text-red-800">
                  خطا
                </p>

                <p className="mt-1 text-sm leading-6 text-red-600">
                  {error}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            label="تاریخ و زمان تماس"
            value={formatDateTime(
              call.call_date
            )}
            icon={
              <CalendarDays size={19} />
            }
            tone="blue"
          />

          <InfoCard
            label="مدت تماس"
            value={formatDuration(
              call.duration_seconds
            )}
            icon={
              <Clock3 size={19} />
            }
            tone="violet"
          />

          <InfoCard
            label="منبع تماس"
            value={getSourceLabel(
              call.source
            )}
            icon={
              <FileText size={19} />
            }
            tone="slate"
          />

          <InfoCard
            label="نتیجه تماس"
            value={getOutcomeLabel(
              call.outcome
            )}
            icon={
              <CheckCircle2 size={19} />
            }
            tone="emerald"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <div className="mb-6">
              <p className="text-xs font-bold text-blue-600">
                مشتری
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-900">
                اطلاعات مشتری
              </h2>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white">
                  {call.customer?.name?.charAt(
                    0
                  ) || "م"}
                </div>

                <div className="min-w-0 flex-1">
                  {call.customer ? (
                    <Link
                      href={`/customers/${call.customer.id}`}
                      className="block truncate text-lg font-black text-slate-900 transition hover:text-blue-600"
                    >
                      {call.customer.name}
                    </Link>
                  ) : (
                    <p className="text-lg font-black text-slate-900">
                      مشتری نامشخص
                    </p>
                  )}

                  {call.customer?.phone && (
                    <p
                      dir="ltr"
                      className="mt-2 text-sm text-slate-500"
                    >
                      {call.customer.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <div className="mb-6">
              <p className="text-xs font-bold text-violet-600">
                مسئول تماس
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-900">
                اطلاعات بازاریاب
              </h2>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 to-white p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-lg font-black text-white">
                  {call.user?.full_name?.charAt(
                    0
                  ) || "ب"}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-black text-slate-900">
                    {call.user?.full_name ??
                      "کاربر نامشخص"}
                  </p>

                  {call.user?.job_title && (
                    <p className="mt-1 text-sm text-slate-500">
                      {call.user.job_title}
                    </p>
                  )}

                  {call.user?.phone && (
                    <p
                      dir="ltr"
                      className="mt-2 text-sm text-slate-500"
                    >
                      {call.user.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
          <div className="mb-6">
            <p className="text-xs font-bold text-blue-600">
              جزئیات تماس
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900">
              اطلاعات مکالمه
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              خلاصه کامل ثبت‌شده برای این تماس
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-bold text-slate-400">
                جهت تماس
              </p>

              <p className="mt-2 text-base font-black text-slate-900">
                {getDirectionLabel(
                  call.direction
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-bold text-slate-400">
                نتیجه
              </p>

              <p className="mt-2 text-base font-black text-slate-900">
                {getOutcomeLabel(
                  call.outcome
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-bold text-slate-400">
                مدت تماس
              </p>

              <p className="mt-2 text-base font-black text-slate-900">
                {formatDuration(
                  call.duration_seconds
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5 sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-bold text-slate-400">
                توضیحات
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-8 text-slate-700">
                {call.notes ||
                  "توضیحی برای این تماس ثبت نشده است."}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
          <div className="mb-6">
            <p className="text-xs font-bold text-slate-400">
              اطلاعات سیستمی
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900">
              سوابق ثبت
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
              <p className="text-xs font-bold text-slate-400">
                ایجاد شده در
              </p>

              <p className="mt-2 text-sm font-black text-slate-800">
                {formatDateTime(
                  call.created_at
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
              <p className="text-xs font-bold text-slate-400">
                آخرین بروزرسانی
              </p>

              <p className="mt-2 text-sm font-black text-slate-800">
                {formatDateTime(
                  call.updated_at
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 md:col-span-2">
              <p className="text-xs font-bold text-slate-400">
                مرجع خارجی
              </p>

              <p className="mt-2 break-all text-sm font-black text-slate-800">
                {call.external_reference ||
                  "ثبت نشده است"}
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/activities/calls"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            بازگشت به تماس‌ها
            <ArrowLeft size={16} />
          </Link>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/customers/${call.customer_id}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
            >
              <UserRound size={16} />
              پروفایل مشتری
            </Link>

            <Link
              href={`/activities/calls/${call.id}/edit`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3 text-sm font-black text-white transition hover:bg-blue-700"
            >
              <Edit3 size={16} />
              ویرایش تماس
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
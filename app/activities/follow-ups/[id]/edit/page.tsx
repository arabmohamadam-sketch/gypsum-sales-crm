"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import { useActivities } from "@/src/lib/hooks/useActivities";
import { useCustomers } from "@/src/lib/hooks/useCustomers";
import { useUsers } from "@/src/lib/hooks/useUsers";

import {
  gregorianToJalali,
  jalaliToGregorian,
  isValidJalaliDate,
} from "@/src/lib/utils/jalali";

const priorityOptions = [
  {
    value: "low",
    label: "کم",
    icon: "↓",
  },
  {
    value: "medium",
    label: "متوسط",
    icon: "•",
  },
  {
    value: "high",
    label: "زیاد",
    icon: "↑",
  },
  {
    value: "urgent",
    label: "فوری",
    icon: "!",
  },
] as const;

const statusOptions = [
  {
    value: "pending",
    label: "در انتظار",
  },
  {
    value: "completed",
    label: "تکمیل شده",
  },
  {
    value: "cancelled",
    label: "لغو شده",
  },
] as const;

function toPersianDigits(
  value: string | number
): string {
  const persianDigits =
    "۰۱۲۳۴۵۶۷۸۹";

  return String(value).replace(
    /\d/g,
    (digit) =>
      persianDigits[
        Number(digit)
      ]
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

  return "خطایی در انجام عملیات رخ داد.";
}

function getTodayJalali() {
  const today = new Date();
  const jalali =
    gregorianToJalali(today);

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

function getDaysInJalaliMonth(
  year: number,
  month: number
): number {
  if (
    month >= 1 &&
    month <= 6
  ) {
    return 31;
  }

  if (
    month >= 7 &&
    month <= 11
  ) {
    return 30;
  }

  if (month === 12) {
    try {
      const firstDay =
        jalaliToGregorian(
          year,
          12,
          1
        );

      const nextYearFirstDay =
        jalaliToGregorian(
          year + 1,
          1,
          1
        );

      const firstDate =
        new Date(
          firstDay.gy,
          firstDay.gm - 1,
          firstDay.gd
        );

      const nextDate =
        new Date(
          nextYearFirstDay.gy,
          nextYearFirstDay.gm - 1,
          nextYearFirstDay.gd
        );

      return Math.round(
        (nextDate.getTime() -
          firstDate.getTime()) /
          (1000 *
            60 *
            60 *
            24)
      );
    } catch {
      return 29;
    }
  }

  return 31;
}

function buildGregorianIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): string {
  if (
    !isValidJalaliDate({
      year,
      month,
      day,
    })
  ) {
    throw new Error(
      "تاریخ جلالی واردشده معتبر نیست."
    );
  }

  if (
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error(
      "ساعت یا دقیقه واردشده معتبر نیست."
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
    hour,
    minute,
    0,
    0
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new Error(
      "تاریخ یا زمان واردشده معتبر نیست."
    );
  }

  return date.toISOString();
}

function SectionHeader({
  number,
  title,
  description,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-lg text-white shadow-sm">
        {icon}
      </div>

      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-emerald-600">
            مرحله {number}
          </span>

          <span className="h-1 w-1 rounded-full bg-slate-300" />

          <h2 className="text-xl font-black text-slate-900">
            {title}
          </h2>
        </div>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function ChoiceCard({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-right transition ${
        active
          ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-50"
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black ${
            active
              ? "bg-emerald-600 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {icon}
        </div>

        <span
          className={`text-sm font-black ${
            active
              ? "text-emerald-800"
              : "text-slate-700"
          }`}
        >
          {label}
        </span>
      </div>
    </button>
  );
}

export default function EditFollowUpPage() {
  const router = useRouter();

  const params =
    useParams<{
      id: string;
    }>();

  const followUpId =
    typeof params?.id ===
    "string"
      ? params.id
      : "";

  const {
    followUpsLoading,
    updateFollowUp,
  } = useActivities();

  const {
    customers,
    loading:
      customersLoading,
  } = useCustomers();

  const {
    users,
    loading:
      usersLoading,
  } = useUsers();

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<
      string | null
    >(null);

  const [success, setSuccess] =
    useState<
      string | null
    >(null);

  const [customerId, setCustomerId] =
    useState("");

  const [userId, setUserId] =
    useState("");

  const [subject, setSubject] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [
    jalaliYear,
    setJalaliYear,
  ] = useState("");

  const [
    jalaliMonth,
    setJalaliMonth,
  ] = useState("");

  const [
    jalaliDay,
    setJalaliDay,
  ] = useState("");

  const [hour, setHour] =
    useState("00");

  const [minute, setMinute] =
    useState("00");

  const [
    priority,
    setPriority,
  ] = useState<
    "low" |
    "medium" |
    "high" |
    "urgent"
  >("medium");

  const [
    status,
    setStatus,
  ] = useState<
    "pending" |
    "completed" |
    "cancelled"
  >("pending");

  const today = useMemo(
    () => getTodayJalali(),
    []
  );

  useEffect(() => {
    if (!followUpId) {
      setError(
        "شناسه پیگیری معتبر نیست."
      );

      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadFollowUp() {
      try {
        setLoading(true);
        setError(null);

        const {
          activitiesService,
        } = await import(
          "@/src/lib/services/activities"
        );

        const data =
          await activitiesService.getFollowUpById(
            followUpId
          );

        if (!mounted) {
          return;
        }

        setCustomerId(
          data.customer_id ??
            data.customer?.id ??
            ""
        );

        setUserId(
          data.user_id ??
            data.user?.id ??
            ""
        );

        setSubject(
          data.subject ?? ""
        );

        setNotes(
          data.notes ?? ""
        );

        setPriority(
          (data.priority ??
            "medium") as
            | "low"
            | "medium"
            | "high"
            | "urgent"
        );

        setStatus(
          (data.status ??
            "pending") as
            | "pending"
            | "completed"
            | "cancelled"
        );

        const scheduledDate =
          new Date(
            data.scheduled_at
          );

        if (
          !Number.isNaN(
            scheduledDate.getTime()
          )
        ) {
          const jalali =
            gregorianToJalali(
              scheduledDate
            );

          if (jalali) {
            setJalaliYear(
              String(
                jalali.year
              )
            );

            setJalaliMonth(
              String(
                jalali.month
              ).padStart(2, "0")
            );

            setJalaliDay(
              String(
                jalali.day
              ).padStart(2, "0")
            );
          }

          setHour(
            String(
              scheduledDate.getHours()
            ).padStart(2, "0")
          );

          setMinute(
            String(
              scheduledDate.getMinutes()
            ).padStart(2, "0")
          );
        }
      } catch (err) {
        if (!mounted) {
          return;
        }

        console.error(
          "خطا در دریافت اطلاعات پیگیری:",
          err
        );

        setError(
          getErrorMessage(err)
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadFollowUp();

    return () => {
      mounted = false;
    };
  }, [followUpId]);

  const selectedCustomer =
    customers.find(
      (customer) =>
        customer.id ===
        customerId
    );

  const selectedUser =
    users.find(
      (user) =>
        user.id === userId
    );

  const selectedYear =
    Number(jalaliYear);

  const selectedMonth =
    Number(jalaliMonth);

  const daysInMonth =
    useMemo(() => {
      if (
        !Number.isInteger(
          selectedYear
        ) ||
        !Number.isInteger(
          selectedMonth
        )
      ) {
        return 31;
      }

      return getDaysInJalaliMonth(
        selectedYear,
        selectedMonth
      );
    }, [
      selectedYear,
      selectedMonth,
    ]);

  useEffect(() => {
    if (
      !jalaliYear ||
      !jalaliMonth ||
      !jalaliDay
    ) {
      setJalaliYear(
        String(today.year)
      );

      setJalaliMonth(
        String(
          today.month
        ).padStart(2, "0")
      );

      setJalaliDay(
        String(
          today.day
        ).padStart(2, "0")
      );
    }
  }, [
    jalaliYear,
    jalaliMonth,
    jalaliDay,
    today,
  ]);

  useEffect(() => {
    const day =
      Number(jalaliDay);

    if (
      Number.isInteger(day) &&
      day > daysInMonth
    ) {
      setJalaliDay(
        String(
          daysInMonth
        ).padStart(2, "0")
      );
    }
  }, [
    jalaliDay,
    daysInMonth,
  ]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    if (!followUpId) {
      setError(
        "شناسه پیگیری معتبر نیست."
      );
      return;
    }

    if (!customerId) {
      setError(
        "انتخاب مشتری الزامی است."
      );
      return;
    }

    if (!userId) {
      setError(
        "انتخاب مسئول پیگیری الزامی است."
      );
      return;
    }

    if (!subject.trim()) {
      setError(
        "موضوع پیگیری را وارد کنید."
      );
      return;
    }

    const year =
      Number(jalaliYear);

    const month =
      Number(jalaliMonth);

    const day =
      Number(jalaliDay);

    const selectedHour =
      Number(hour);

    const selectedMinute =
      Number(minute);

    if (
      !Number.isInteger(
        year
      ) ||
      !Number.isInteger(
        month
      ) ||
      !Number.isInteger(
        day
      ) ||
      !Number.isInteger(
        selectedHour
      ) ||
      !Number.isInteger(
        selectedMinute
      )
    ) {
      setError(
        "تاریخ یا زمان واردشده معتبر نیست."
      );
      return;
    }

    if (
      day < 1 ||
      day > daysInMonth
    ) {
      setError(
        "روز انتخاب‌شده برای این ماه معتبر نیست."
      );
      return;
    }

    let scheduledAt: string;

    try {
      scheduledAt =
        buildGregorianIso(
          year,
          month,
          day,
          selectedHour,
          selectedMinute
        );
    } catch (err) {
      setError(
        getErrorMessage(err)
      );
      return;
    }

    try {
      setSaving(true);

      await updateFollowUp(
        followUpId,
        {
          customer_id:
            customerId,

          user_id:
            userId,

          scheduled_at:
            scheduledAt,

          status,

          priority,

          subject:
            subject.trim(),

          notes:
            notes.trim() ||
            null,
        }
      );

      setSuccess(
        "پیگیری با موفقیت ویرایش شد."
      );

      window.setTimeout(
        () => {
          router.push(
            "/activities/follow-ups"
          );

          router.refresh();
        },
        700
      );
    } catch (err) {
      console.error(
        "خطا در ویرایش پیگیری:",
        err
      );

      setError(
        getErrorMessage(err)
      );
    } finally {
      setSaving(false);
    }
  }

  if (
    loading ||
    followUpsLoading
  ) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-50 p-4 md:p-6"
      >
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 bg-gradient-to-r from-slate-900 via-emerald-600 to-teal-600" />

            <div className="p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                📌
              </div>

              <p className="mt-4 font-bold text-slate-700">
                در حال دریافت اطلاعات پیگیری...
              </p>

              <div className="mx-auto mt-4 h-2 w-48 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!followUpId) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-50 p-4 md:p-6"
      >
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm">
            <div className="h-1 bg-red-500" />

            <div className="p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl">
                !
              </div>

              <p className="mt-4 font-bold text-red-700">
                شناسه پیگیری معتبر نیست.
              </p>

              <Link
                href="/activities/follow-ups"
                className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                بازگشت به پیگیری‌ها
              </Link>
            </div>
          </div>
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

        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-slate-900 via-emerald-600 to-teal-600" />

          <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-emerald-100/40 blur-3xl" />

          <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-teal-100/30 blur-3xl" />

          <div className="relative p-6 md:p-8">
            <Link
              href="/activities/follow-ups"
              className="text-sm font-bold text-slate-500 transition hover:text-slate-900"
            >
              ← بازگشت به پیگیری‌ها
            </Link>

            <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-2xl text-white shadow-lg shadow-emerald-100">
                  📌
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                      ویرایش پیگیری
                    </h1>

                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      ویرایش اطلاعات
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    اطلاعات پیگیری را بررسی و در صورت نیاز اصلاح کنید.
                  </p>
                </div>
              </div>

              {selectedCustomer && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-bold text-slate-400">
                    مشتری
                  </p>

                  <p className="mt-1 font-black text-slate-800">
                    {selectedCustomer.name}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Alerts */}
        {error && (
          <section className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
            <div className="h-1 bg-red-500" />

            <div className="flex items-start gap-3 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 font-black text-red-600">
                !
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

        {success && (
          <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
            <div className="h-1 bg-emerald-500" />

            <div className="flex items-start gap-3 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 font-black text-emerald-600">
                ✓
              </div>

              <div>
                <p className="font-black text-emerald-800">
                  انجام شد
                </p>

                <p className="mt-1 text-sm leading-6 text-emerald-600">
                  {success}
                </p>
              </div>
            </div>
          </section>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Customer / User */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              number="۱"
              title="مشتری و مسئول"
              description="مشتری و مسئول پیگیری را مشخص کنید."
              icon="👤"
            />

            <div className="grid gap-6 md:grid-cols-2">

              <div>
                <label
                  htmlFor="customer"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  مشتری
                </label>

                {selectedCustomer ? (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">
                        {selectedCustomer.name?.charAt(
                          0
                        ) || "م"}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-900">
                          {
                            selectedCustomer.name
                          }
                        </p>

                        {selectedCustomer.phone && (
                          <p
                            dir="ltr"
                            className="mt-1 text-xs text-slate-500"
                          >
                            {
                              selectedCustomer.phone
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    <Link
                      href={`/customers/${selectedCustomer.id}`}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-2.5 text-xs font-black text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-50"
                    >
                      مشاهده پروفایل مشتری
                    </Link>
                  </div>
                ) : (
                  <select
                    id="customer"
                    value={
                      customerId
                    }
                    onChange={(
                      event
                    ) =>
                      setCustomerId(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      customersLoading
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                    required
                  >
                    <option value="">
                      {customersLoading
                        ? "در حال دریافت مشتریان..."
                        : "انتخاب مشتری"}
                    </option>

                    {customers.map(
                      (
                        customer
                      ) => (
                        <option
                          key={
                            customer.id
                          }
                          value={
                            customer.id
                          }
                        >
                          {customer.name}
                        </option>
                      )
                    )}
                  </select>
                )}
              </div>

              <div>
                <label
                  htmlFor="user"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  مسئول پیگیری
                </label>

                <select
                  id="user"
                  value={
                    userId
                  }
                  onChange={(
                    event
                  ) =>
                    setUserId(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    usersLoading
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-800 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-50"
                  required
                >
                  <option value="">
                    {usersLoading
                      ? "در حال دریافت کاربران..."
                      : "انتخاب مسئول"}
                  </option>

                  {users.map(
                    (user) => (
                      <option
                        key={
                          user.id
                        }
                        value={
                          user.id
                        }
                      >
                        {
                          user.full_name
                        }
                      </option>
                    )
                  )}
                </select>

                {selectedUser && (
                  <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    مسئول فعلی:{" "}
                    <span className="font-black text-slate-800">
                      {
                        selectedUser.full_name
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Subject / Priority / Status */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              number="۲"
              title="موضوع، اولویت و وضعیت"
              description="جزئیات اصلی پیگیری را مدیریت کنید."
              icon="🎯"
            />

            <div className="space-y-6">
              <div>
                <label
                  htmlFor="subject"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  موضوع پیگیری
                </label>

                <input
                  id="subject"
                  type="text"
                  value={
                    subject
                  }
                  onChange={(
                    event
                  ) =>
                    setSubject(
                      event.target
                        .value
                    )
                  }
                  placeholder="مثلاً پیگیری سفارش، پرداخت یا تماس مجدد"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                  required
                />
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="text-sm font-bold text-slate-700">
                    اولویت پیگیری
                  </label>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {
                      priorityOptions.find(
                        (item) =>
                          item.value ===
                          priority
                      )?.label ??
                        priority
                    }
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {priorityOptions.map(
                    (option) => (
                      <ChoiceCard
                        key={
                          option.value
                        }
                        label={
                          option.label
                        }
                        icon={
                          option.icon
                        }
                        active={
                          priority ===
                          option.value
                        }
                        onClick={() =>
                          setPriority(
                            option.value
                          )
                        }
                      />
                    )
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  وضعیت پیگیری
                </label>

                <select
                  id="status"
                  value={
                    status
                  }
                  onChange={(
                    event
                  ) =>
                    setStatus(
                      event.target
                        .value as
                        | "pending"
                        | "completed"
                        | "cancelled"
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                >
                  {statusOptions.map(
                    (option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </section>

          {/* Date */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              number="۳"
              title="زمان پیگیری"
              description="تاریخ جلالی و ساعت انجام پیگیری را مشخص کنید."
              icon="🗓️"
            />

            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label
                    htmlFor="jalaliYear"
                    className="mb-2 block text-xs font-bold text-slate-500"
                  >
                    سال
                  </label>

                  <input
                    id="jalaliYear"
                    type="number"
                    min="1300"
                    max="1500"
                    value={
                      jalaliYear
                    }
                    onChange={(
                      event
                    ) =>
                      setJalaliYear(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="jalaliMonth"
                    className="mb-2 block text-xs font-bold text-slate-500"
                  >
                    ماه
                  </label>

                  <select
                    id="jalaliMonth"
                    value={
                      jalaliMonth
                    }
                    onChange={(
                      event
                    ) =>
                      setJalaliMonth(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                    required
                  >
                    {Array.from(
                      {
                        length: 12,
                      },
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
                  <label
                    htmlFor="jalaliDay"
                    className="mb-2 block text-xs font-bold text-slate-500"
                  >
                    روز
                  </label>

                  <select
                    id="jalaliDay"
                    value={
                      jalaliDay
                    }
                    onChange={(
                      event
                    ) =>
                      setJalaliDay(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                    required
                  >
                    {Array.from(
                      {
                        length:
                          daysInMonth,
                      },
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
                  <label
                    htmlFor="hour"
                    className="mb-2 block text-xs font-bold text-slate-500"
                  >
                    ساعت
                  </label>

                  <select
                    id="hour"
                    value={
                      hour
                    }
                    onChange={(
                      event
                    ) =>
                      setHour(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                    required
                  >
                    {Array.from(
                      {
                        length: 24,
                      },
                      (_, index) => {
                        const value =
                          String(
                            index
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
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-500 ring-1 ring-slate-100">
                  دقیقه
                </span>

                <select
                  value={
                    minute
                  }
                  onChange={(
                    event
                  ) =>
                    setMinute(
                      event.target
                        .value
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-emerald-500"
                  required
                >
                  {Array.from(
                    {
                      length: 60,
                    },
                    (_, index) => {
                      const value =
                        String(
                          index
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

                <span className="text-xs text-slate-500">
                  تاریخ به‌صورت جلالی مدیریت می‌شود.
                </span>
              </div>

              <div className="mt-4 rounded-xl bg-white px-4 py-3 text-xs text-slate-500 ring-1 ring-slate-100">
                امروز:{" "}
                <span className="font-bold text-slate-800">
                  {toPersianDigits(
                    today.year
                  )}
                  /
                  {toPersianDigits(
                    today.month
                  )}
                  /
                  {toPersianDigits(
                    today.day
                  )}
                </span>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              number="۴"
              title="یادداشت"
              description="توضیحات تکمیلی پیگیری را ثبت یا اصلاح کنید."
              icon="📝"
            />

            <textarea
              value={
                notes
              }
              onChange={(
                event
              ) =>
                setNotes(
                  event.target
                    .value
                )
              }
              rows={6}
              placeholder="مثلاً مشتری اعلام کرد تا پایان هفته پاسخ می‌دهد..."
              className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            />
          </section>

          {/* Preview */}
          <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 text-white shadow-lg">
            <div className="p-6 md:p-7">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-400">
                    پیش‌نمایش
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    خلاصه پیگیری
                  </h2>
                </div>

                <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-slate-300">
                  آماده ذخیره
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-slate-400">
                    مشتری
                  </p>

                  <p className="mt-2 truncate font-bold">
                    {selectedCustomer?.name ??
                      "انتخاب نشده"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-slate-400">
                    موضوع
                  </p>

                  <p className="mt-2 truncate font-bold">
                    {subject ||
                      "بدون موضوع"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-slate-400">
                    مسئول
                  </p>

                  <p className="mt-2 truncate font-bold">
                    {selectedUser?.full_name ??
                      "انتخاب نشده"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-slate-400">
                    اولویت
                  </p>

                  <p className="mt-2 font-bold">
                    {
                      priorityOptions.find(
                        (item) =>
                          item.value ===
                          priority
                      )?.label ??
                        priority
                    }
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-slate-400">
                    وضعیت
                  </p>

                  <p className="mt-2 font-bold">
                    {
                      statusOptions.find(
                        (item) =>
                          item.value ===
                          status
                      )?.label ??
                        status
                    }
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/activities/follow-ups"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              انصراف
            </Link>

            <button
              type="submit"
              disabled={
                saving ||
                customersLoading ||
                usersLoading ||
                !customerId ||
                !userId ||
                !subject.trim()
              }
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "در حال ذخیره..."
                : "ذخیره تغییرات"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
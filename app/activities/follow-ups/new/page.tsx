"use client";

import {
  FormEvent,
  Suspense,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import Link from "next/link";

import { useActivities } from "@/src/lib/hooks/useActivities";
import { useCustomers } from "@/src/lib/hooks/useCustomers";
import { useUsers } from "@/src/lib/hooks/useUsers";

import { toGregorian } from "jalaali-js";

function toPersianDigits(
  value: string | number
): string {
  return String(value).replace(
    /\d/g,
    (digit) =>
      "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]
  );
}

function getTodayJalali() {
  const today = new Date();

  const formatter =
    new Intl.DateTimeFormat(
      "fa-IR-u-ca-persian",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );

  const parts =
    formatter.formatToParts(today);

  const convertDigits = (
    value: string
  ) =>
    value.replace(
      /[۰-۹]/g,
      (digit) =>
        String(
          "۰۱۲۳۴۵۶۷۸۹".indexOf(digit)
        )
    );

  return {
    year: convertDigits(
      parts.find(
        (part) =>
          part.type === "year"
      )?.value ?? ""
    ),

    month: convertDigits(
      parts.find(
        (part) =>
          part.type === "month"
      )?.value ?? ""
    ),

    day: convertDigits(
      parts.find(
        (part) =>
          part.type === "day"
      )?.value ?? ""
    ),
  };
}

function getDaysInJalaliMonth(
  year: number,
  month: number
): number {
  if (month <= 6) {
    return 31;
  }

  if (month <= 11) {
    return 30;
  }

  try {
    const firstDay = toGregorian(
      year,
      month,
      1
    );

    const nextMonth = toGregorian(
      year + 1,
      1,
      1
    );

    const firstDate = new Date(
      firstDay.gy,
      firstDay.gm - 1,
      firstDay.gd
    );

    const nextDate = new Date(
      nextMonth.gy,
      nextMonth.gm - 1,
      nextMonth.gd
    );

    return Math.round(
      (nextDate.getTime() -
        firstDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );
  } catch {
    return 29;
  }
}

function getCurrentTime(): string {
  const now = new Date();

  return `${String(
    now.getHours()
  ).padStart(
    2,
    "0"
  )}:${String(
    now.getMinutes()
  ).padStart(
    2,
    "0"
  )}`;
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

function NewFollowUpForm() {
  const router = useRouter();

  const searchParams =
    useSearchParams();

  const {
    createFollowUp,
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

  const today = useMemo(
    () => getTodayJalali(),
    []
  );

  const customerIdFromUrl =
    searchParams.get("customerId") ??
    "";

  const [
    customerId,
    setCustomerId,
  ] = useState(
    customerIdFromUrl
  );

  const [userId, setUserId] =
    useState("");

  const [subject, setSubject] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [
    jalaliYear,
    setJalaliYear,
  ] = useState(today.year);

  const [
    jalaliMonth,
    setJalaliMonth,
  ] = useState(today.month);

  const [
    jalaliDay,
    setJalaliDay,
  ] = useState(today.day);

  const [time, setTime] =
    useState(getCurrentTime);

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
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const daysInMonth = useMemo(
    () => {
      const year =
        Number(jalaliYear);

      const month =
        Number(jalaliMonth);

      if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        month < 1 ||
        month > 12
      ) {
        return 31;
      }

      return getDaysInJalaliMonth(
        year,
        month
      );
    },
    [
      jalaliYear,
      jalaliMonth,
    ]
  );

  const validCustomerId =
    customers.some(
      (customer) =>
        customer.id === customerId
    )
      ? customerId
      : "";

  const effectiveUserId =
    userId ||
    (users.length === 1
      ? users[0].id
      : "");

  const numericDay =
    Number(jalaliDay);

  const safeJalaliDay =
    Number.isInteger(numericDay) &&
    numericDay >= 1
      ? Math.min(
          numericDay,
          daysInMonth
        )
      : 1;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);

    if (!validCustomerId) {
      setError(
        "لطفاً مشتری را انتخاب کنید."
      );
      return;
    }

    if (!effectiveUserId) {
      setError(
        "لطفاً مسئول پیگیری را انتخاب کنید."
      );
      return;
    }

    if (!subject.trim()) {
      setError(
        "لطفاً موضوع پیگیری را وارد کنید."
      );
      return;
    }

    const year =
      Number(jalaliYear);

    const month =
      Number(jalaliMonth);

    const day =
      safeJalaliDay;

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > daysInMonth
    ) {
      setError(
        "تاریخ پیگیری معتبر نیست."
      );
      return;
    }

    if (
      !/^\d{2}:\d{2}$/.test(time)
    ) {
      setError(
        "ساعت پیگیری معتبر نیست."
      );
      return;
    }

    try {
      setSaving(true);

      const [
        hour,
        minute,
      ] = time
        .split(":")
        .map(Number);

      if (
        !Number.isInteger(hour) ||
        !Number.isInteger(minute) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
      ) {
        setError(
          "ساعت پیگیری معتبر نیست."
        );
        return;
      }

      const gregorian =
        toGregorian(
          year,
          month,
          day
        );

      const scheduledAt =
        new Date(
          gregorian.gy,
          gregorian.gm - 1,
          gregorian.gd,
          hour,
          minute,
          0,
          0
        ).toISOString();

      await createFollowUp({
        customer_id:
          validCustomerId,
        user_id:
          effectiveUserId,
        subject:
          subject.trim(),
        notes:
          notes.trim() || null,
        scheduled_at:
          scheduledAt,
        priority,
        status:
          "pending",
        source:
          "manual",
      });

      router.push(
        "/activities/follow-ups"
      );

      router.refresh();
    } catch (err) {
      console.error(
        "خطا در ثبت پیگیری:",
        err
      );

      setError(
        getErrorMessage(err)
      );
    } finally {
      setSaving(false);
    }
  }

  function handleMonthChange(
    value: string
  ) {
    setJalaliMonth(value);

    const year =
      Number(jalaliYear);

    const month =
      Number(value);

    const currentDay =
      Number(jalaliDay);

    if (
      Number.isInteger(year) &&
      Number.isInteger(month) &&
      Number.isInteger(currentDay)
    ) {
      const newDaysInMonth =
        getDaysInJalaliMonth(
          year,
          month
        );

      if (
        currentDay >
        newDaysInMonth
      ) {
        setJalaliDay(
          String(newDaysInMonth)
        );
      }
    }
  }

  function handleYearChange(
    value: string
  ) {
    setJalaliYear(value);

    const year =
      Number(value);

    const month =
      Number(jalaliMonth);

    const currentDay =
      Number(jalaliDay);

    if (
      Number.isInteger(year) &&
      Number.isInteger(month) &&
      Number.isInteger(currentDay)
    ) {
      const newDaysInMonth =
        getDaysInJalaliMonth(
          year,
          month
        );

      if (
        currentDay >
        newDaysInMonth
      ) {
        setJalaliDay(
          String(newDaysInMonth)
        );
      }
    }
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gray-50 p-4 md:p-6"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              ثبت پیگیری جدید
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              ثبت زمان و اطلاعات پیگیری مشتری
            </p>
          </div>

          <Link
            href="/activities/follow-ups"
            className="inline-flex items-center justify-center rounded-xl border bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            بازگشت به پیگیری‌ها
          </Link>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-gray-900">
              اطلاعات پیگیری
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  مشتری
                </label>

                <select
                  value={
                    validCustomerId
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">
                    {customersLoading
                      ? "در حال دریافت مشتریان..."
                      : "انتخاب مشتری"}
                  </option>

                  {customers.map(
                    (customer) => (
                      <option
                        key={
                          customer.id
                        }
                        value={
                          customer.id
                        }
                      >
                        {
                          customer.name
                        }

                        {customer.phone
                          ? ` - ${toPersianDigits(
                              customer.phone
                            )}`
                          : ""}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  مسئول پیگیری
                </label>

                <select
                  value={
                    effectiveUserId
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  موضوع پیگیری
                </label>

                <input
                  type="text"
                  value={subject}
                  onChange={(
                    event
                  ) =>
                    setSubject(
                      event.target
                        .value
                    )
                  }
                  placeholder="مثلاً پیگیری سفارش"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  اولویت
                </label>

                <select
                  value={priority}
                  onChange={(
                    event
                  ) =>
                    setPriority(
                      event.target
                        .value as
                        | "low"
                        | "medium"
                        | "high"
                        | "urgent"
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="low">
                    کم
                  </option>

                  <option value="medium">
                    متوسط
                  </option>

                  <option value="high">
                    زیاد
                  </option>

                  <option value="urgent">
                    فوری
                  </option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-gray-900">
              زمان پیگیری
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  سال
                </label>

                <input
                  type="number"
                  value={jalaliYear}
                  onChange={(
                    event
                  ) =>
                    handleYearChange(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  ماه
                </label>

                <select
                  value={jalaliMonth}
                  onChange={(
                    event
                  ) =>
                    handleMonthChange(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  {Array.from(
                    {
                      length: 12,
                    },
                    (
                      _,
                      index
                    ) => {
                      const month =
                        String(
                          index + 1
                        );

                      return (
                        <option
                          key={
                            month
                          }
                          value={
                            month
                          }
                        >
                          {toPersianDigits(
                            month
                          )}
                        </option>
                      );
                    }
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  روز
                </label>

                <select
                  value={String(
                    safeJalaliDay
                  )}
                  onChange={(
                    event
                  ) =>
                    setJalaliDay(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  {Array.from(
                    {
                      length:
                        daysInMonth,
                    },
                    (
                      _,
                      index
                    ) => {
                      const day =
                        String(
                          index + 1
                        );

                      return (
                        <option
                          key={
                            day
                          }
                          value={
                            day
                          }
                        >
                          {toPersianDigits(
                            day
                          )}
                        </option>
                      );
                    }
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  ساعت
                </label>

                <input
                  type="time"
                  value={time}
                  onChange={(
                    event
                  ) =>
                    setTime(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-gray-900">
              یادداشت
            </h2>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value
                )
              }
              rows={5}
              placeholder="توضیحات مربوط به پیگیری..."
              className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/activities/follow-ups"
              className="rounded-lg bg-gray-100 px-5 py-2.5 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-200"
            >
              انصراف
            </Link>

            <button
              type="submit"
              disabled={
                saving ||
                customersLoading ||
                usersLoading
              }
              className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "در حال ثبت..."
                : "ثبت پیگیری"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function NewFollowUpPage() {
  return (
    <Suspense
      fallback={
        <main
          dir="rtl"
          className="min-h-screen bg-gray-50 p-4 md:p-6"
        >
          <div className="mx-auto max-w-4xl">
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <div className="text-lg font-bold text-gray-900">
                در حال بارگذاری...
              </div>

              <p className="mt-2 text-sm text-gray-500">
                لطفاً کمی صبر کنید.
              </p>
            </div>
          </div>
        </main>
      }
    >
      <NewFollowUpForm />
    </Suspense>
  );
}
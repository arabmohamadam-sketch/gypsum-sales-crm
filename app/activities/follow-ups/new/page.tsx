"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toGregorian } from "jalaali-js";

import { useActivities } from "@/src/lib/hooks/useActivities";
import { useCustomers } from "@/src/lib/hooks/useCustomers";
import { useUsers } from "@/src/lib/hooks/useUsers";

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
  if (month >= 1 && month <= 6) {
    return 31;
  }

  if (month >= 7 && month <= 11) {
    return 30;
  }

  if (month !== 12) {
    return 31;
  }

  try {
    const firstDay = toGregorian(
      year,
      12,
      1
    );

    const nextYear = toGregorian(
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
      nextYear.gy,
      nextYear.gm - 1,
      nextYear.gd
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

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
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

function PriorityCard({
  label,
  icon,
  active,
  onClick,
}: {
  value:
    | "low"
    | "medium"
    | "high"
    | "urgent";
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
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${
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

export default function NewFollowUpPage() {
  const router = useRouter();

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

  const [
    customerId,
    setCustomerId,
  ] = useState("");

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

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    const customerIdFromUrl =
      new URLSearchParams(
        window.location.search
      ).get("customerId");

    if (!customerIdFromUrl) {
      return;
    }

    const customerExists =
      customers.some(
        (customer) =>
          customer.id ===
          customerIdFromUrl
      );

    if (customerExists) {
      setCustomerId(
        customerIdFromUrl
      );
    }
  }, [customers]);

  useEffect(() => {
    if (
      users.length === 1 &&
      !userId
    ) {
      setUserId(
        users[0].id
      );
    }
  }, [users, userId]);

  const daysInMonth =
    useMemo(() => {
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
    }, [
      jalaliYear,
      jalaliMonth,
    ]);

  useEffect(() => {
    const day =
      Number(jalaliDay);

    if (
      Number.isInteger(day) &&
      day > daysInMonth
    ) {
      setJalaliDay(
        String(daysInMonth)
      );
    }
  }, [
    jalaliDay,
    daysInMonth,
  ]);

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

  const selectedPriorityLabel =
    {
      low: "کم",
      medium: "متوسط",
      high: "زیاد",
      urgent: "فوری",
    }[priority];

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);

    if (!customerId) {
      setError(
        "لطفاً مشتری را انتخاب کنید."
      );
      return;
    }

    if (!userId) {
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
      Number(jalaliDay);

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

    const [
      hour,
      minute,
    ] = time
      .split(":")
      .map(Number);

    if (
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

    try {
      setSaving(true);

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
          customerId,

        user_id:
          userId,

        subject:
          subject.trim(),

        notes:
          notes.trim() ||
          null,

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

  if (
    customersLoading ||
    usersLoading
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
                در حال بارگذاری اطلاعات پیگیری...
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

            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-2xl text-white shadow-lg shadow-emerald-100">
                📌
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                    ثبت پیگیری جدید
                  </h1>

                  {selectedCustomer && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      {selectedCustomer.name}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  زمان، مسئول، اولویت و توضیحات پیگیری مشتری را ثبت کنید.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <section className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
            <div className="h-1 bg-red-500" />

            <div className="flex items-start gap-3 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
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

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6"
        >
          {/* Customer and user */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              number="۱"
              title="مشتری و مسئول"
              description="مشتری و کاربر مسئول این پیگیری را مشخص کنید."
              icon="👤"
            />

            <div className="grid gap-6 md:grid-cols-2">
              {/* Customer */}
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

                    <div className="mt-4 flex gap-2">
                      <Link
                        href={`/customers/${selectedCustomer.id}`}
                        className="flex-1 rounded-xl bg-white px-3 py-2 text-center text-xs font-bold text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-50"
                      >
                        مشاهده پروفایل
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          setCustomerId(
                            ""
                          )
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                      >
                        تغییر
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    id="customer"
                    value={customerId}
                    onChange={(
                      event
                    ) =>
                      setCustomerId(
                        event.target.value
                      )
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                    required
                  >
                    <option value="">
                      انتخاب مشتری
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
                          {getCustomerLabel(
                            customer
                          )}
                        </option>
                      )
                    )}
                  </select>
                )}
              </div>

              {/* User */}
              <div>
                <label
                  htmlFor="user"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  مسئول پیگیری
                </label>

                <select
                  id="user"
                  value={userId}
                  onChange={(event) =>
                    setUserId(
                      event.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-800 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-50"
                  required
                >
                  <option value="">
                    انتخاب مسئول
                  </option>

                  {users.map(
                    (user) => (
                      <option
                        key={user.id}
                        value={user.id}
                      >
                        {
                          user.full_name
                        }
                        {user.job_title
                          ? ` - ${user.job_title}`
                          : ""}
                      </option>
                    )
                  )}
                </select>

                {selectedUser && (
                  <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    مسئول انتخاب‌شده:{" "}
                    <span className="font-bold text-slate-800">
                      {
                        selectedUser.full_name
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Subject and priority */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              number="۲"
              title="موضوع و اولویت"
              description="موضوع پیگیری و میزان اهمیت آن را مشخص کنید."
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
                  value={subject}
                  onChange={(event) =>
                    setSubject(
                      event.target.value
                    )
                  }
                  placeholder="مثلاً پیگیری سفارش، پیگیری پرداخت، تماس مجدد..."
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
                    {selectedPriorityLabel}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <PriorityCard
                    value="low"
                    label="کم"
                    icon="↓"
                    active={
                      priority ===
                      "low"
                    }
                    onClick={() =>
                      setPriority(
                        "low"
                      )
                    }
                  />

                  <PriorityCard
                    value="medium"
                    label="متوسط"
                    icon="•"
                    active={
                      priority ===
                      "medium"
                    }
                    onClick={() =>
                      setPriority(
                        "medium"
                      )
                    }
                  />

                  <PriorityCard
                    value="high"
                    label="زیاد"
                    icon="↑"
                    active={
                      priority ===
                      "high"
                    }
                    onClick={() =>
                      setPriority(
                        "high"
                      )
                    }
                  />

                  <PriorityCard
                    value="urgent"
                    label="فوری"
                    icon="!"
                    active={
                      priority ===
                      "urgent"
                    }
                    onClick={() =>
                      setPriority(
                        "urgent"
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Date and time */}
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
                    onChange={(event) =>
                      setJalaliYear(
                        event.target.value
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
                    onChange={(event) =>
                      setJalaliMonth(
                        event.target.value
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
                    onChange={(event) =>
                      setJalaliDay(
                        event.target.value
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
                    htmlFor="time"
                    className="mb-2 block text-xs font-bold text-slate-500"
                  >
                    ساعت
                  </label>

                  <input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(event) =>
                      setTime(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                    required
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
                  امروز:{" "}
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

                <span>
                  زمان پیگیری با تقویم جلالی ثبت می‌شود.
                </span>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              number="۴"
              title="توضیحات"
              description="اطلاعات تکمیلی درباره پیگیری را ثبت کنید."
              icon="📝"
            />

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value
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
                  آماده ثبت
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                    {selectedPriorityLabel}
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
                customers.length === 0 ||
                users.length === 0 ||
                !customerId ||
                !userId ||
                !subject.trim()
              }
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "در حال ثبت پیگیری..."
                : "ثبت پیگیری"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function getCustomerLabel(
  customer: {
    name?: string | null;
    phone?: string | null;
  }
): string {
  if (customer.phone) {
    return `${customer.name ?? "بدون نام"} - ${customer.phone}`;
  }

  return (
    customer.name ??
    "بدون نام"
  );
}
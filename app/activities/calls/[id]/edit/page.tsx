"use client";

import Link from "next/link";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  activitiesService,
  type CallWithRelations,
} from "@/src/lib/services/activities";

import { useCustomers } from "@/src/lib/hooks/useCustomers";

import { useUsers } from "@/src/lib/hooks/useUsers";

import type { Customer } from "@/src/lib/types/customer";

import {
  gregorianToJalali,
  jalaliToGregorian,
  isValidJalaliDate,
} from "@/src/lib/utils/jalali";

const customerTypeLabels: Record<
  string,
  string
> = {
  building_material_store:
    "مصالح‌فروشی",
  contractor:
    "پیمانکار",
  employer:
    "کارفرما",
  plasterer:
    "گچ‌کار",
  plaster_worker:
    "گچ‌کار",
  distributor:
    "توزیع‌کننده",
  retailer:
    "خرده‌فروشی",
};

const directionOptions = [
  {
    value: "outbound",
    label: "تماس خروجی",
    icon: "↗",
  },
  {
    value: "inbound",
    label: "تماس ورودی",
    icon: "↙",
  },
];

const outcomeOptions = [
  {
    value: "answered",
    label: "پاسخ داده شد",
  },
  {
    value: "no_answer",
    label: "پاسخ داده نشد",
  },
  {
    value: "busy",
    label: "مشغول",
  },
  {
    value: "voicemail",
    label: "پیام صوتی",
  },
  {
    value: "wrong_number",
    label: "شماره اشتباه",
  },
  {
    value: "scheduled_callback",
    label: "نیاز به تماس مجدد",
  },
];

function getCustomerTypeLabel(
  type?: string | null,
): string {
  if (!type) {
    return "";
  }

  return (
    customerTypeLabels[type] ??
    type
  );
}

function getCustomerLabel(
  customer: Customer,
): string {
  const type =
    getCustomerTypeLabel(
      customer.customer_type,
    );

  if (customer.phone) {
    return `${customer.name} - ${customer.phone}${
      type ? ` - ${type}` : ""
    }`;
  }

  return `${customer.name}${
    type ? ` - ${type}` : ""
  }`;
}

function toPersianDigits(
  value: string | number,
): string {
  const persianDigits =
    "۰۱۲۳۴۵۶۷۸۹";

  return String(value).replace(
    /\d/g,
    (digit) =>
      persianDigits[Number(digit)],
  );
}

function getErrorMessage(
  error: unknown,
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

function getJalaliDateTime(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  const jalali =
    gregorianToJalali(date);

  if (!jalali) {
    return null;
  }

  return {
    year: jalali.year,
    month: jalali.month,
    day: jalali.day,
    hour: String(
      date.getHours(),
    ).padStart(2, "0"),
    minute: String(
      date.getMinutes(),
    ).padStart(2, "0"),
  };
}

function buildGregorianIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): string {
  if (
    !isValidJalaliDate({
      year,
      month,
      day,
    })
  ) {
    throw new Error(
      "تاریخ جلالی واردشده معتبر نیست.",
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
      "ساعت یا دقیقه واردشده معتبر نیست.",
    );
  }

  const gregorian =
    jalaliToGregorian(
      year,
      month,
      day,
    );

  const date = new Date(
    gregorian.gy,
    gregorian.gm - 1,
    gregorian.gd,
    hour,
    minute,
    0,
    0,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new Error(
      "تاریخ یا زمان واردشده معتبر نیست.",
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
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-lg text-white shadow-sm">
        {icon}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black text-blue-600">
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
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-right transition ${
        active
          ? "border-blue-500 bg-blue-50 ring-4 ring-blue-50"
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black ${
              active
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {icon}
          </div>
        )}

        <span
          className={`text-sm font-black ${
            active
              ? "text-blue-800"
              : "text-slate-700"
          }`}
        >
          {label}
        </span>
      </div>
    </button>
  );
}

export default function EditCallPage() {
  const router = useRouter();

  const params = useParams<{
    id: string;
  }>();

  const callId =
    typeof params?.id === "string"
      ? params.id
      : "";

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

  const [call, setCall] =
    useState<
      CallWithRelations | null
    >(null);

  const [loading, setLoading] =
    useState(
      callId.length > 0,
    );

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      callId
        ? null
        : "شناسه تماس معتبر نیست.",
    );

  const [success, setSuccess] =
    useState<string | null>(null);

  const [customerId, setCustomerId] =
    useState("");

  const [userId, setUserId] =
    useState("");

  const [jalaliYear, setJalaliYear] =
    useState("");

  const [jalaliMonth, setJalaliMonth] =
    useState("");

  const [jalaliDay, setJalaliDay] =
    useState("");

  const [hour, setHour] =
    useState("00");

  const [minute, setMinute] =
    useState("00");

  const [direction, setDirection] =
    useState("outbound");

  const [outcome, setOutcome] =
    useState("answered");

  const [
    durationMinutes,
    setDurationMinutes,
  ] = useState("");

  const [notes, setNotes] =
    useState("");

  useEffect(() => {
    if (!callId) {
      return;
    }

    let mounted = true;

    activitiesService
      .getCallById(callId)
      .then((data) => {
        if (!mounted) {
          return;
        }

        setCall(data);

        setCustomerId(
          data.customer_id ??
            data.customer?.id ??
            "",
        );

        setUserId(
          data.user_id ??
            data.user?.id ??
            "",
        );

        const dateTime =
          getJalaliDateTime(
            data.call_date,
          );

        if (dateTime) {
          setJalaliYear(
            String(
              dateTime.year,
            ),
          );

          setJalaliMonth(
            String(
              dateTime.month,
            ).padStart(2, "0"),
          );

          setJalaliDay(
            String(
              dateTime.day,
            ).padStart(2, "0"),
          );

          setHour(
            dateTime.hour,
          );

          setMinute(
            dateTime.minute,
          );
        }

        setDirection(
          data.direction ??
            "outbound",
        );

        setOutcome(
          data.outcome ??
            "answered",
        );

        if (
          data.duration_seconds !==
            null &&
          data.duration_seconds !==
            undefined
        ) {
          setDurationMinutes(
            String(
              data.duration_seconds /
                60,
            ),
          );
        } else {
          setDurationMinutes("");
        }

        setNotes(
          data.notes ?? "",
        );
      })
      .catch((err) => {
        if (!mounted) {
          return;
        }

        console.error(
          "خطا در دریافت اطلاعات تماس:",
          err,
        );

        setError(
          getErrorMessage(err),
        );

        setCall(null);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [callId]);

  const selectedCustomer =
    customers.find(
      (customer) =>
        customer.id === customerId,
    );

  const selectedUser =
    users.find(
      (user) =>
        user.id === userId,
    );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    if (!callId) {
      setError(
        "شناسه تماس معتبر نیست.",
      );
      return;
    }

    if (!customerId) {
      setError(
        "انتخاب مشتری الزامی است.",
      );
      return;
    }

    if (!userId) {
      setError(
        "انتخاب کاربر الزامی است.",
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
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      !Number.isInteger(
        selectedHour,
      ) ||
      !Number.isInteger(
        selectedMinute,
      )
    ) {
      setError(
        "تاریخ یا زمان واردشده معتبر نیست.",
      );
      return;
    }

    let callDateIso: string;

    try {
      callDateIso =
        buildGregorianIso(
          year,
          month,
          day,
          selectedHour,
          selectedMinute,
        );
    } catch (err) {
      setError(
        getErrorMessage(err),
      );
      return;
    }

    let durationSeconds:
      | number
      | undefined;

    if (
      durationMinutes.trim()
    ) {
      const minutes =
        Number(
          durationMinutes,
        );

      if (
        !Number.isFinite(
          minutes,
        ) ||
        minutes < 0
      ) {
        setError(
          "مدت تماس باید یک عدد صفر یا بیشتر باشد.",
        );
        return;
      }

      durationSeconds =
        Math.round(
          minutes * 60,
        );
    }

    try {
      setSaving(true);

      const updated =
        await activitiesService.updateCall(
          callId,
          {
            customer_id:
              customerId,
            user_id:
              userId,
            call_date:
              callDateIso,
            direction,
            outcome,
            duration_seconds:
              durationSeconds,
            notes:
              notes.trim() ||
              null,
          },
        );

      setCall(updated);

      setSuccess(
        "تماس با موفقیت ویرایش شد.",
      );

      window.setTimeout(
        () => {
          router.push(
            "/activities/calls",
          );

          router.refresh();
        },
        700,
      );
    } catch (err) {
      console.error(
        "خطا در ویرایش تماس:",
        err,
      );

      setError(
        getErrorMessage(err),
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-50 p-4 md:p-6"
      >
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 bg-gradient-to-r from-slate-900 via-blue-600 to-indigo-600" />

            <div className="p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                📞
              </div>

              <p className="mt-4 font-bold text-slate-700">
                در حال دریافت اطلاعات تماس...
              </p>

              <div className="mx-auto mt-4 h-2 w-48 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-500" />
              </div>
            </div>
          </div>
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
          <div className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm">
            <div className="h-1 bg-red-500" />

            <div className="p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl">
                !
              </div>

              <p className="mt-4 font-bold text-red-700">
                {error ??
                  "اطلاعات تماس پیدا نشد."}
              </p>

              <Link
                href="/activities/calls"
                className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                بازگشت به تماس‌ها
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
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-slate-900 via-blue-600 to-indigo-600" />

          <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-blue-100/40 blur-3xl" />

          <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-indigo-100/30 blur-3xl" />

          <div className="relative p-6 md:p-8">
            <Link
              href="/activities/calls"
              className="text-sm font-bold text-slate-500 transition hover:text-slate-900"
            >
              ← بازگشت به تماس‌ها
            </Link>

            <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl text-white shadow-lg shadow-blue-100">
                  📞
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                      ویرایش تماس
                    </h1>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      ویرایش اطلاعات
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    اطلاعات تماس ثبت‌شده را بررسی و اصلاح کنید.
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
          {/* Customer and User */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              number="۱"
              title="مشتری و مسئول"
              description="مشتری و بازاریاب مرتبط با این تماس را تعیین کنید."
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
                          0,
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
                  </div>
                ) : (
                  <select
                    id="customer"
                    value={customerId}
                    onChange={(event) =>
                      setCustomerId(
                        event.target.value,
                      )
                    }
                    disabled={
                      customersLoading
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    required
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
                          {getCustomerLabel(
                            customer,
                          )}
                        </option>
                      ),
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
                  کاربر / بازاریاب
                </label>

                <select
                  id="user"
                  value={userId}
                  onChange={(event) =>
                    setUserId(
                      event.target.value,
                    )
                  }
                  disabled={
                    usersLoading
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  required
                >
                  <option value="">
                    {usersLoading
                      ? "در حال دریافت کاربران..."
                      : "انتخاب کاربر"}
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
                    ),
                  )}
                </select>

                {selectedUser && (
                  <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    مسئول فعلی:{" "}
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

          {/* Date & Time */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              number="۲"
              title="تاریخ و زمان"
              description="تاریخ و ساعت تماس را با تقویم جلالی تنظیم کنید."
              icon="🗓️"
            />

            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label
                    htmlFor="jalaliYear"
                    className="mb-2 block text-xs font-bold text-slate-500"
                  >
                    سال جلالی
                  </label>

                  <input
                    id="jalaliYear"
                    type="number"
                    min="1300"
                    max="1500"
                    value={jalaliYear}
                    onChange={(event) =>
                      setJalaliYear(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
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
                    value={jalaliMonth}
                    onChange={(event) =>
                      setJalaliMonth(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    required
                  >
                    {Array.from(
                      {
                        length: 12,
                      },
                      (_, index) => {
                        const value =
                          String(
                            index + 1,
                          ).padStart(
                            2,
                            "0",
                          );

                        return (
                          <option
                            key={value}
                            value={value}
                          >
                            {toPersianDigits(
                              value,
                            )}
                          </option>
                        );
                      },
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
                    value={jalaliDay}
                    onChange={(event) =>
                      setJalaliDay(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    required
                  >
                    {Array.from(
                      {
                        length: 31,
                      },
                      (_, index) => {
                        const value =
                          String(
                            index + 1,
                          ).padStart(
                            2,
                            "0",
                          );

                        return (
                          <option
                            key={value}
                            value={value}
                          >
                            {toPersianDigits(
                              value,
                            )}
                          </option>
                        );
                      },
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
                    value={hour}
                    onChange={(event) =>
                      setHour(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    required
                  >
                    {Array.from(
                      {
                        length: 24,
                      },
                      (_, index) => {
                        const value =
                          String(
                            index,
                          ).padStart(
                            2,
                            "0",
                          );

                        return (
                          <option
                            key={value}
                            value={value}
                          >
                            {toPersianDigits(
                              value,
                            )}
                          </option>
                        );
                      },
                    )}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-500 ring-1 ring-slate-100">
                  دقیقه
                </span>

                <select
                  value={minute}
                  onChange={(event) =>
                    setMinute(
                      event.target.value,
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                  required
                >
                  {Array.from(
                    {
                      length: 60,
                    },
                    (_, index) => {
                      const value =
                        String(
                          index,
                        ).padStart(
                          2,
                          "0",
                        );

                      return (
                        <option
                          key={value}
                          value={value}
                        >
                          {toPersianDigits(
                            value,
                          )}
                        </option>
                      );
                    },
                  )}
                </select>

                <span className="text-xs text-slate-500">
                  تاریخ و ساعت تماس با تقویم جلالی مدیریت می‌شود.
                </span>
              </div>
            </div>
          </section>

          {/* Direction */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              number="۳"
              title="نوع و نتیجه تماس"
              description="جهت تماس و نتیجه نهایی مکالمه را مشخص کنید."
              icon="📞"
            />

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-3 block text-sm font-bold text-slate-700">
                  جهت تماس
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  {directionOptions.map(
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
                          direction ===
                          option.value
                        }
                        onClick={() =>
                          setDirection(
                            option.value,
                          )
                        }
                      />
                    ),
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="outcome"
                  className="mb-3 block text-sm font-bold text-slate-700"
                >
                  نتیجه تماس
                </label>

                <select
                  id="outcome"
                  value={outcome}
                  onChange={(event) =>
                    setOutcome(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                >
                  {outcomeOptions.map(
                    (option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
          </section>

          {/* Duration and Notes */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              number="۴"
              title="جزئیات تماس"
              description="مدت مکالمه و توضیحات تکمیلی را ثبت کنید."
              icon="📝"
            />

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="duration"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  مدت تماس
                  <span className="mr-1 text-xs font-normal text-slate-400">
                    (دقیقه)
                  </span>
                </label>

                <div className="relative">
                  <input
                    id="duration"
                    type="number"
                    min="0"
                    step="1"
                    value={
                      durationMinutes
                    }
                    onChange={(event) =>
                      setDurationMinutes(
                        event.target.value,
                      )
                    }
                    placeholder="مثلاً ۱۵"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 pl-16 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />

                  <span className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg bg-white px-2 py-1 text-xs text-slate-400 ring-1 ring-slate-100">
                    دقیقه
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="text-xs font-bold text-blue-600">
                  وضعیت ویرایش
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-700">
                  تغییرات پس از ذخیره روی سابقه تماس اعمال می‌شود.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <label
                htmlFor="notes"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                توضیحات تماس
              </label>

              <textarea
                id="notes"
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value,
                  )
                }
                rows={6}
                placeholder="نتیجه گفت‌وگو، درخواست مشتری، وضعیت خرید و سایر توضیحات..."
                className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>
          </section>

          {/* Summary */}
          <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 text-white shadow-lg">
            <div className="p-6 md:p-7">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-400">
                    پیش‌نمایش
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    خلاصه تماس
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
                    مسئول
                  </p>

                  <p className="mt-2 truncate font-bold">
                    {selectedUser?.full_name ??
                      "انتخاب نشده"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-slate-400">
                    جهت
                  </p>

                  <p className="mt-2 font-bold">
                    {direction ===
                    "outbound"
                      ? "تماس خروجی"
                      : "تماس ورودی"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-slate-400">
                    نتیجه
                  </p>

                  <p className="mt-2 truncate font-bold">
                    {outcomeOptions.find(
                      (item) =>
                        item.value ===
                        outcome,
                    )?.label ??
                      outcome}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-slate-400">
                    مدت
                  </p>

                  <p className="mt-2 font-bold">
                    {durationMinutes ||
                      "۰"}{" "}
                    دقیقه
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/activities/calls"
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
                !userId
              }
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
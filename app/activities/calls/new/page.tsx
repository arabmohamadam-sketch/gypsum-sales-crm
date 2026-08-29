"use client";

import Link from "next/link";
import {
  FormEvent,
  Suspense,
  useEffect,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

import { activitiesService } from "@/src/lib/services/activities";
import { customersService } from "@/src/lib/services/customers";
import {
  usersService,
  type SalesUser,
} from "@/src/lib/services/users";
import type { Customer } from "@/src/lib/types/customer";
import {
  gregorianToJalali,
  jalaliToGregorian,
  isValidJalaliDate,
} from "@/src/lib/utils/jalali";

const customerTypeLabels: Record<string, string> = {
  building_material_store: "مصالح‌فروشی",
  building_material_stores: "مصالح‌فروشی",
  contractor: "پیمانکار",
  contractor_company: "پیمانکار",
  employer: "کارفرما",
  employers: "کارفرما",
  plasterer: "گچ‌کار",
  plaster_worker: "گچ‌کار",
  plasterer_company: "گچ‌کار",
  distributor: "توزیع‌کننده",
  retailer: "خرده‌فروشی",
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
    label: "بدون پاسخ",
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
  type?: string | null
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
  customer: Customer
): string {
  const type = getCustomerTypeLabel(
    customer.customer_type
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

function getCurrentJalaliDate() {
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

  return jalali;
}

function getCurrentTime() {
  const now = new Date();

  return {
    hour: String(
      now.getHours()
    ).padStart(2, "0"),
    minute: String(
      now.getMinutes()
    ).padStart(2, "0"),
  };
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

  if (Number.isNaN(date.getTime())) {
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
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-lg font-black text-white shadow-sm">
        {icon}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
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

function NewCallForm() {
  const searchParams =
    useSearchParams();

  const customerIdFromUrl =
    searchParams.get(
      "customerId"
    ) ?? "";

  const initialDate =
    getCurrentJalaliDate();

  const initialTime =
    getCurrentTime();

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [users, setUsers] =
    useState<SalesUser[]>([]);

  const [customerId, setCustomerId] =
    useState(
      customerIdFromUrl
    );

  const [userId, setUserId] =
    useState("");

  const [jalaliYear, setJalaliYear] =
    useState(
      String(initialDate.year)
    );

  const [jalaliMonth, setJalaliMonth] =
    useState(
      String(
        initialDate.month
      ).padStart(2, "0")
    );

  const [jalaliDay, setJalaliDay] =
    useState(
      String(
        initialDate.day
      ).padStart(2, "0")
    );

  const [hour, setHour] =
    useState(initialTime.hour);

  const [minute, setMinute] =
    useState(initialTime.minute);

  const [direction, setDirection] =
    useState("outbound");

  const [outcome, setOutcome] =
    useState("answered");

  const [durationMinutes, setDurationMinutes] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [loadingData, setLoadingData] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  useEffect(() => {
    setCustomerId(
      customerIdFromUrl
    );
  }, [customerIdFromUrl]);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoadingData(true);
        setError(null);

        const [
          customersData,
          usersData,
        ] = await Promise.all([
          customersService.getAll(),
          usersService.getSalesUsers(),
        ]);

        if (!mounted) {
          return;
        }

        setCustomers(
          customersData
        );

        setUsers(usersData);

        if (customerIdFromUrl) {
          const customerExists =
            customersData.some(
              (customer) =>
                customer.id ===
                customerIdFromUrl
            );

          if (!customerExists) {
            setCustomerId("");

            setError(
              "مشتری انتخاب‌شده در فهرست مشتریان پیدا نشد."
            );
          }
        }

        if (
          usersData.length === 1
        ) {
          setUserId(
            usersData[0].id
          );
        }
      } catch (err) {
        if (!mounted) {
          return;
        }

        console.error(
          "خطا در بارگذاری اطلاعات فرم تماس:",
          err
        );

        setError(
          getErrorMessage(err)
        );
      } finally {
        if (mounted) {
          setLoadingData(false);
        }
      }
    }

    void loadData();

    return () => {
      mounted = false;
    };
  }, [customerIdFromUrl]);

  function resetDateTime() {
    const currentDate =
      getCurrentJalaliDate();

    const currentTime =
      getCurrentTime();

    setJalaliYear(
      String(currentDate.year)
    );

    setJalaliMonth(
      String(
        currentDate.month
      ).padStart(2, "0")
    );

    setJalaliDay(
      String(
        currentDate.day
      ).padStart(2, "0")
    );

    setHour(
      currentTime.hour
    );

    setMinute(
      currentTime.minute
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    if (!customerId) {
      setError(
        "انتخاب مشتری الزامی است."
      );
      return;
    }

    if (!userId) {
      setError(
        "انتخاب کاربر الزامی است."
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
      selectedHour < 0 ||
      selectedHour > 23 ||
      selectedMinute < 0 ||
      selectedMinute > 59
    ) {
      setError(
        "ساعت یا دقیقه واردشده معتبر نیست."
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
          selectedMinute
        );
    } catch {
      setError(
        "تاریخ جلالی واردشده معتبر نیست."
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
          durationMinutes
        );

      if (
        !Number.isFinite(
          minutes
        ) ||
        minutes < 0
      ) {
        setError(
          "مدت تماس باید صفر یا بیشتر باشد."
        );
        return;
      }

      durationSeconds =
        Math.round(
          minutes * 60
        );
    }

    try {
      setSaving(true);

      await activitiesService.createCall({
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
        source: "manual",
        external_reference:
          null,
      });

      setSuccess(
        "تماس با موفقیت ثبت شد."
      );

      setCustomerId("");

      setDirection(
        "outbound"
      );

      setOutcome(
        "answered"
      );

      setDurationMinutes("");

      setNotes("");

      resetDateTime();
    } catch (err) {
      console.error(
        "خطا در ثبت تماس:",
        err
      );

      setError(
        getErrorMessage(err)
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadingData) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-slate-50 p-4 md:p-6"
      >
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 bg-gradient-to-r from-slate-900 via-blue-600 to-violet-600" />

            <div className="p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                📞
              </div>

              <p className="mt-4 font-bold text-slate-700">
                در حال بارگذاری اطلاعات تماس...
              </p>

              <div className="mx-auto mt-4 h-2 w-48 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedCustomer =
    customers.find(
      (customer) =>
        customer.id === customerId
    );

  const selectedUser =
    users.find(
      (user) =>
        user.id === userId
    );

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 p-4 md:p-6"
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-slate-900 via-blue-600 to-violet-600" />

          <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-blue-100/40 blur-3xl" />

          <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-violet-100/30 blur-3xl" />

          <div className="relative p-6 md:p-8">
            <Link
              href="/activities/calls"
              className="text-sm font-bold text-slate-500 transition hover:text-slate-900"
            >
              ← بازگشت به تماس‌ها
            </Link>

            <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-2xl text-white shadow-lg shadow-blue-100">
                  📞
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                      ثبت تماس جدید
                    </h1>

                    {customerIdFromUrl &&
                      selectedCustomer && (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                          مشتری از پروفایل انتخاب شد
                        </span>
                      )}
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    اطلاعات تماس مشتری را ثبت کنید تا در سوابق فروش ذخیره شود.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Alerts */}
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

        {success && (
          <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
            <div className="h-1 bg-emerald-500" />

            <div className="flex items-start gap-3 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                ✓
              </div>

              <div>
                <p className="font-black text-emerald-800">
                  تماس ثبت شد
                </p>

                <p className="mt-1 text-sm text-emerald-600">
                  تماس با موفقیت در سوابق مشتری ذخیره شد.
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
          {/* Customer */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              number="۱"
              title="مشتری"
              description="مشتری مرتبط با این تماس را انتخاب کنید."
              icon="👤"
            />

            {selectedCustomer ? (
              <div className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white">
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white">
                      {selectedCustomer.name?.charAt(
                        0
                      ) || "م"}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-lg font-black text-slate-900">
                        {
                          selectedCustomer.name
                        }
                      </p>

                      <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-500">
                        {selectedCustomer.phone && (
                          <span dir="ltr">
                            📞{" "}
                            {
                              selectedCustomer.phone
                            }
                          </span>
                        )}

                        {selectedCustomer.customer_type && (
                          <span>
                            {getCustomerTypeLabel(
                              selectedCustomer.customer_type
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/customers/${selectedCustomer.id}`}
                      className="rounded-xl bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                    >
                      مشاهده پروفایل
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setCustomerId(
                          ""
                        );
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                    >
                      تغییر مشتری
                    </button>
                  </div>
                </div>

                {customerIdFromUrl && (
                  <div className="border-t border-blue-100 bg-blue-50/60 px-5 py-3 text-xs font-medium text-blue-700">
                    این مشتری از پروفایل مشتری به‌صورت خودکار انتخاب شده است.
                  </div>
                )}
              </div>
            ) : (
              <>
                <label
                  htmlFor="customer"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  انتخاب مشتری
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                    🔎
                  </span>

                  <select
                    id="customer"
                    value={customerId}
                    onChange={(event) =>
                      setCustomerId(
                        event.target.value
                      )
                    }
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-4 pr-12 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
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
                </div>
              </>
            )}
          </section>

          {/* User */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              number="۲"
              title="مسئول تماس"
              description="بازاریاب یا کاربر ثبت‌کننده تماس را انتخاب کنید."
              icon="👨‍💼"
            />

            {selectedUser ? (
              <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 to-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-lg font-black text-white">
                      {selectedUser.full_name?.charAt(
                        0
                      ) || "ب"}
                    </div>

                    <div>
                      <p className="text-lg font-black text-slate-900">
                        {
                          selectedUser.full_name
                        }
                      </p>

                      <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-500">
                        {selectedUser.job_title && (
                          <span>
                            {
                              selectedUser.job_title
                            }
                          </span>
                        )}

                        {selectedUser.phone && (
                          <span dir="ltr">
                            {
                              selectedUser.phone
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setUserId("")
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    تغییر کاربر
                  </button>
                </div>
              </div>
            ) : (
              <>
                <label
                  htmlFor="user"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  بازاریاب / کاربر
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
                    انتخاب کاربر
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
                        {user.job_title
                          ? ` - ${user.job_title}`
                          : ""}
                      </option>
                    )
                  )}
                </select>
              </>
            )}
          </section>

          {/* Date / Time */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              number="۳"
              title="تاریخ و زمان"
              description="زمان دقیق تماس را به تقویم جلالی ثبت کنید."
              icon="🗓️"
            />

            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
              <div className="grid gap-4 md:grid-cols-5">
                <div className="md:col-span-2">
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
                        event.target.value
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
                        event.target.value
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
                    value={jalaliDay}
                    onChange={(event) =>
                      setJalaliDay(
                        event.target.value
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
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                        event.target.value
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

                <div>
                  <label
                    htmlFor="minute"
                    className="mb-2 block text-xs font-bold text-slate-500"
                  >
                    دقیقه
                  </label>

                  <select
                    id="minute"
                    value={minute}
                    onChange={(event) =>
                      setMinute(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
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
                </div>
              </div>
            </div>
          </section>

          {/* Call Details */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              number="۴"
              title="جزئیات تماس"
              description="جهت تماس، نتیجه و مدت تماس را مشخص کنید."
              icon="📋"
            />

            <div className="grid gap-6 md:grid-cols-2">
              {/* Direction */}
              <div>
                <label className="mb-3 block text-sm font-bold text-slate-700">
                  جهت تماس
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  {directionOptions.map(
                    (option) => {
                      const selected =
                        direction ===
                        option.value;

                      return (
                        <button
                          key={
                            option.value
                          }
                          type="button"
                          onClick={() =>
                            setDirection(
                              option.value
                            )
                          }
                          className={`rounded-2xl border p-4 text-right transition ${
                            selected
                              ? "border-blue-500 bg-blue-50 ring-4 ring-blue-50"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${
                                selected
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {
                                option.icon
                              }
                            </div>

                            <span
                              className={`text-sm font-black ${
                                selected
                                  ? "text-blue-800"
                                  : "text-slate-700"
                              }`}
                            >
                              {
                                option.label
                              }
                            </span>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Outcome */}
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
                      event.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
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
                        {
                          option.label
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label
                  htmlFor="duration"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  مدت تماس
                  <span className="mr-1 text-xs font-medium text-slate-400">
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
                        event.target.value
                      )
                    }
                    placeholder="مثلاً ۱۵"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 pl-20 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />

                  <span className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-400 ring-1 ring-slate-100">
                    دقیقه
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
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
                      event.target.value
                    )
                  }
                  rows={5}
                  placeholder="نتیجه گفت‌وگو، درخواست مشتری، وضعیت خرید یا برنامه تماس بعدی..."
                  className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>
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
                    خلاصه تماس
                  </h2>
                </div>

                <div className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-slate-300">
                  قبل از ثبت بررسی کنید
                </div>
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
                    "inbound"
                      ? "تماس ورودی"
                      : "تماس خروجی"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-slate-400">
                    نتیجه
                  </p>

                  <p className="mt-2 font-bold">
                    {
                      outcomeOptions.find(
                        (item) =>
                          item.value ===
                          outcome
                      )?.label
                    }
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between">
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
                customers.length ===
                  0 ||
                users.length ===
                  0 ||
                !customerId ||
                !userId
              }
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "در حال ثبت تماس..."
                : "ثبت تماس"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewCallPage() {
  return (
    <Suspense
      fallback={
        <div
          dir="rtl"
          className="min-h-screen bg-slate-50 p-4 md:p-6"
        >
          <div className="mx-auto max-w-5xl">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="h-1.5 bg-gradient-to-r from-slate-900 via-blue-600 to-violet-600" />

              <div className="p-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                  📞
                </div>

                <p className="mt-4 text-sm font-medium text-slate-500">
                  در حال بارگذاری فرم تماس...
                </p>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <NewCallForm />
    </Suspense>
  );
}
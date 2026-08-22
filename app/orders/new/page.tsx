"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toGregorian, toJalaali } from "jalaali-js";

import { customersService } from "@/src/lib/services/customers";
import {
  ordersService,
  type CreateOrderInput,
} from "@/src/lib/services/orders";
import {
  usersService,
  type SalesUser,
} from "@/src/lib/services/users";

import type { Customer } from "@/src/lib/types/customer";

const COMPANY_ID =
  "11111111-1111-1111-1111-111111111111";

interface JalaliDate {
  year: number;
  month: number;
  day: number;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getTodayJalali(): JalaliDate {
  const now = new Date();

  const result = toJalaali(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate()
  );

  return {
    year: result.jy,
    month: result.jm,
    day: result.jd,
  };
}

function jalaliToGregorianDate(
  date: JalaliDate
): string {
  const result = toGregorian(
    date.year,
    date.month,
    date.day
  );

  return `${result.gy}-${pad(result.gm)}-${pad(result.gd)}`;
}

function isValidJalaliDate(
  date: JalaliDate
): boolean {
  if (
    date.year < 1300 ||
    date.year > 1500 ||
    date.month < 1 ||
    date.month > 12 ||
    date.day < 1 ||
    date.day > 31
  ) {
    return false;
  }

  try {
    const gregorian = toGregorian(
      date.year,
      date.month,
      date.day
    );

    const back = toJalaali(
      gregorian.gy,
      gregorian.gm,
      gregorian.gd
    );

    return (
      back.jy === date.year &&
      back.jm === date.month &&
      back.jd === date.day
    );
  } catch {
    return false;
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function customerTypeLabel(
  value: string | null | undefined
) {
  const labels: Record<string, string> = {
    مصالح_فروش: "مصالح‌فروش",
    مصالح_فروشان: "مصالح‌فروشان",
    پیمانکار: "پیمانکار",
    پیمانکاران: "پیمانکاران",
    کارفرما: "کارفرما",
    کارفرمایان: "کارفرمایان",
    گچکار: "گچکار",
    گچکاران: "گچکاران",
  };

  return value
    ? labels[value] ?? value
    : "نامشخص";
}

export default function NewOrderPage() {
  const router = useRouter();

  /*
   * نکته:
   * تاریخ جلالی فقط در Client محاسبه می‌شود تا
   * اختلاف Server/Client باعث Hydration Error نشود.
   */
  const [today, setToday] =
    useState<JalaliDate | null>(null);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [salesUsers, setSalesUsers] =
    useState<SalesUser[]>([]);

  const [loadingCustomers, setLoadingCustomers] =
    useState(true);

  const [loadingUsers, setLoadingUsers] =
    useState(true);

  const [customerSearch, setCustomerSearch] =
    useState("");

  const [showCustomerResults, setShowCustomerResults] =
    useState(false);

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [selectedSalesUser, setSelectedSalesUser] =
    useState<SalesUser | null>(null);

  const [salesUserSearch, setSalesUserSearch] =
    useState("");

  const [showSalesUsers, setShowSalesUsers] =
    useState(false);

  const [jalaliYear, setJalaliYear] =
    useState("");

  const [jalaliMonth, setJalaliMonth] =
    useState("");

  const [jalaliDay, setJalaliDay] =
    useState("");

  const [totalTonnage, setTotalTonnage] =
    useState("");

  const [status, setStatus] =
    useState("draft");

  /*
   * مقدار واقعی Enum در PostgreSQL:
   *
   * manual
   * mobile_app
   * whatsapp
   * sms
   * pwa
   * api
   */
  const [source, setSource] =
    useState("manual");

  const [notes, setNotes] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /*
   * تنظیم تاریخ بعد از Hydration
   */
  useEffect(() => {
    const currentDate = getTodayJalali();

    setToday(currentDate);

    setJalaliYear(String(currentDate.year));
    setJalaliMonth(String(currentDate.month));
    setJalaliDay(String(currentDate.day));
  }, []);

  /*
   * دریافت مشتریان
   */
  useEffect(() => {
    let mounted = true;

    async function loadCustomers() {
      try {
        setLoadingCustomers(true);

        const result =
          await customersService.getAll();

        if (mounted) {
          setCustomers(result);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "خطا در دریافت مشتریان"
          );
        }
      } finally {
        if (mounted) {
          setLoadingCustomers(false);
        }
      }
    }

    void loadCustomers();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * دریافت بازاریابان
   */
  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      try {
        setLoadingUsers(true);

        const result =
          await usersService.getSalesUsers();

        if (mounted) {
          setSalesUsers(result);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "خطا در دریافت بازاریابان"
          );
        }
      } finally {
        if (mounted) {
          setLoadingUsers(false);
        }
      }
    }

    void loadUsers();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * جستجوی مشتری
   */
  const filteredCustomers = useMemo(() => {
    const query =
      customerSearch.trim().toLowerCase();

    if (!query) {
      return customers.slice(0, 12);
    }

    return customers
      .filter((customer) => {
        const name =
          customer.name?.toLowerCase() ?? "";

        const phone =
          customer.phone?.toLowerCase() ?? "";

        const code =
          customer.code?.toLowerCase() ?? "";

        return (
          name.includes(query) ||
          phone.includes(query) ||
          code.includes(query)
        );
      })
      .slice(0, 12);
  }, [customers, customerSearch]);

  /*
   * جستجوی بازاریاب
   */
  const filteredSalesUsers = useMemo(() => {
    const query =
      salesUserSearch.trim().toLowerCase();

    if (!query) {
      return salesUsers.slice(0, 10);
    }

    return salesUsers
      .filter((user) => {
        const name =
          user.full_name?.toLowerCase() ?? "";

        const phone =
          user.phone?.toLowerCase() ?? "";

        const code =
          user.employee_code?.toLowerCase() ?? "";

        return (
          name.includes(query) ||
          phone.includes(query) ||
          code.includes(query)
        );
      })
      .slice(0, 10);
  }, [salesUsers, salesUserSearch]);

  function selectCustomer(
    customer: Customer
  ) {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerResults(false);
  }

  function selectSalesUser(
    user: SalesUser
  ) {
    setSelectedSalesUser(user);
    setSalesUserSearch(user.full_name);
    setShowSalesUsers(false);
  }

  function clearCustomer() {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setShowCustomerResults(true);
  }

  function clearSalesUser() {
    setSelectedSalesUser(null);
    setSalesUserSearch("");
    setShowSalesUsers(true);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedCustomer) {
      setError(
        "لطفاً مشتری را انتخاب کنید."
      );
      return;
    }

    if (!selectedSalesUser) {
      setError(
        "لطفاً بازاریاب را انتخاب کنید."
      );
      return;
    }

    if (!jalaliYear || !jalaliMonth || !jalaliDay) {
      setError(
        "تاریخ سفارش هنوز آماده نشده است."
      );
      return;
    }

    const year = Number(jalaliYear);
    const month = Number(jalaliMonth);
    const day = Number(jalaliDay);

    const jalaliDate: JalaliDate = {
      year,
      month,
      day,
    };

    if (!isValidJalaliDate(jalaliDate)) {
      setError(
        "تاریخ جلالی واردشده معتبر نیست."
      );
      return;
    }

    const normalizedTonnage =
      totalTonnage.replace(",", ".");

    const tonnage =
      Number(normalizedTonnage);

    if (
      !Number.isFinite(tonnage) ||
      tonnage <= 0
    ) {
      setError(
        "تناژ سفارش باید بیشتر از صفر باشد."
      );
      return;
    }

    setSaving(true);

    try {
      const input: CreateOrderInput = {
        company_id: COMPANY_ID,

        customer_id:
          selectedCustomer.id,

        sales_user_id:
          selectedSalesUser.id,

        order_date:
          jalaliToGregorianDate(
            jalaliDate
          ),

        status,

        total_tonnage:
          tonnage,

        notes:
          notes.trim() || null,

        /*
         * بسیار مهم:
         * CRM مقدار معتبر Enum ندارد.
         * برای ثبت دستی از manual استفاده می‌کنیم.
         */
        source:
          source.trim() || "manual",
      };

      console.log(
        "Creating order:",
        input
      );

      const order =
        await ordersService.create(
          input
        );

      setSuccess(
        "سفارش با موفقیت ثبت شد."
      );

      window.setTimeout(() => {
        router.push(
          `/orders/${order.id}`
        );
      }, 500);
    } catch (err) {
      console.error(
        "New order submit error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "خطا در ثبت سفارش."
      );
    } finally {
      setSaving(false);
    }
  }

  const submitDisabled =
    Boolean(saving) ||
    !Boolean(selectedCustomer) ||
    !Boolean(selectedSalesUser) ||
    !Boolean(jalaliYear) ||
    !Boolean(jalaliMonth) ||
    !Boolean(jalaliDay);

  return (
    <div
      dir="rtl"
      className="mx-auto max-w-6xl pb-12"
    >
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/orders"
          className="text-sm text-gray-500 transition hover:text-gray-900"
        >
          ← بازگشت به سفارش‌ها
        </Link>

        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">
            ثبت سفارش جدید
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            سفارش مشتری را با اطلاعات کامل ثبت کنید.
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Customer */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              ۱. انتخاب مشتری
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              نام، شماره تلفن یا کد مشتری را جستجو کنید.
            </p>
          </div>

          <div className="relative">
            <label
              htmlFor="customer-search"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              مشتری
            </label>

            <div className="relative">
              <input
                id="customer-search"
                type="text"
                value={customerSearch}
                onChange={(event) => {
                  setCustomerSearch(
                    event.target.value
                  );

                  setSelectedCustomer(null);
                  setShowCustomerResults(true);
                }}
                onFocus={() =>
                  setShowCustomerResults(true)
                }
                placeholder="مثلاً: مصالح ساختمانی..."
                autoComplete="off"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
              />

              {loadingCustomers && (
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  در حال دریافت...
                </span>
              )}
            </div>

            {showCustomerResults &&
              !selectedCustomer && (
                <div className="absolute right-0 left-0 z-30 mt-2 max-h-80 overflow-auto rounded-2xl border bg-white shadow-xl">
                  {filteredCustomers.length ===
                  0 ? (
                    <div className="p-5 text-center text-sm text-gray-500">
                      مشتری پیدا نشد.
                    </div>
                  ) : (
                    filteredCustomers.map(
                      (customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() =>
                            selectCustomer(
                              customer
                            )
                          }
                          className="block w-full border-b px-5 py-4 text-right transition last:border-b-0 hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {customer.name}
                              </p>

                              <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                                {customer.phone && (
                                  <span>
                                    {customer.phone}
                                  </span>
                                )}

                                {customer.code && (
                                  <span>
                                    کد:{" "}
                                    {
                                      customer.code
                                    }
                                  </span>
                                )}
                              </div>
                            </div>

                            {customer.customer_type && (
                              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                                {customerTypeLabel(
                                  customer.customer_type
                                )}
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    )
                  )}
                </div>
              )}
          </div>

          {selectedCustomer && (
            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-gray-500">
                    مشتری انتخاب‌شده
                  </p>

                  <h3 className="mt-1 text-lg font-bold text-gray-900">
                    {selectedCustomer.name}
                  </h3>

                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                    {selectedCustomer.phone && (
                      <span>
                        ☎{" "}
                        {selectedCustomer.phone}
                      </span>
                    )}

                    {selectedCustomer.customer_type && (
                      <span>
                        نوع:{" "}
                        {customerTypeLabel(
                          selectedCustomer.customer_type
                        )}
                      </span>
                    )}

                    {selectedCustomer.code && (
                      <span>
                        کد:{" "}
                        {selectedCustomer.code}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearCustomer}
                  className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  تغییر مشتری
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Sales User */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              ۲. انتخاب بازاریاب
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              بازاریاب مسئول این سفارش را انتخاب کنید.
            </p>
          </div>

          <div className="relative">
            <label
              htmlFor="sales-user-search"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              بازاریاب
            </label>

            <div className="relative">
              <input
                id="sales-user-search"
                type="text"
                value={salesUserSearch}
                onChange={(event) => {
                  setSalesUserSearch(
                    event.target.value
                  );

                  setSelectedSalesUser(null);
                  setShowSalesUsers(true);
                }}
                onFocus={() =>
                  setShowSalesUsers(true)
                }
                placeholder="نام بازاریاب را جستجو کنید..."
                autoComplete="off"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
              />

              {loadingUsers && (
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  در حال دریافت...
                </span>
              )}
            </div>

            {showSalesUsers &&
              !selectedSalesUser && (
                <div className="absolute right-0 left-0 z-20 mt-2 max-h-72 overflow-auto rounded-2xl border bg-white shadow-xl">
                  {filteredSalesUsers.length ===
                  0 ? (
                    <div className="p-5 text-center text-sm text-gray-500">
                      بازاریاب فعالی پیدا نشد.
                    </div>
                  ) : (
                    filteredSalesUsers.map(
                      (user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() =>
                            selectSalesUser(
                              user
                            )
                          }
                          className="block w-full border-b px-5 py-4 text-right transition last:border-b-0 hover:bg-gray-50"
                        >
                          <p className="font-semibold text-gray-900">
                            {user.full_name}
                          </p>

                          <div className="mt-1 flex flex-wrap gap-4 text-xs text-gray-500">
                            {user.job_title && (
                              <span>
                                {user.job_title}
                              </span>
                            )}

                            {user.phone && (
                              <span>
                                {user.phone}
                              </span>
                            )}

                            {user.employee_code && (
                              <span>
                                کد پرسنلی:{" "}
                                {
                                  user.employee_code
                                }
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    )
                  )}
                </div>
              )}
          </div>

          {selectedSalesUser && (
            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-gray-500">
                    بازاریاب انتخاب‌شده
                  </p>

                  <h3 className="mt-1 text-lg font-bold text-gray-900">
                    {selectedSalesUser.full_name}
                  </h3>

                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                    {selectedSalesUser.job_title && (
                      <span>
                        {
                          selectedSalesUser.job_title
                        }
                      </span>
                    )}

                    {selectedSalesUser.phone && (
                      <span>
                        {
                          selectedSalesUser.phone
                        }
                      </span>
                    )}

                    {selectedSalesUser.employee_code && (
                      <span>
                        کد:{" "}
                        {
                          selectedSalesUser.employee_code
                        }
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearSalesUser}
                  className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  تغییر بازاریاب
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Order Information */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              ۳. اطلاعات سفارش
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              تاریخ، تناژ و وضعیت سفارش را وارد کنید.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Jalali Date */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                تاریخ سفارش
              </label>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="jalali-year"
                    className="mb-1 block text-xs text-gray-400"
                  >
                    سال
                  </label>

                  <input
                    id="jalali-year"
                    inputMode="numeric"
                    value={jalaliYear}
                    onChange={(event) =>
                      setJalaliYear(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border px-3 py-3 text-center text-sm outline-none focus:border-gray-500"
                    placeholder="۱۴۰۵"
                  />
                </div>

                <div>
                  <label
                    htmlFor="jalali-month"
                    className="mb-1 block text-xs text-gray-400"
                  >
                    ماه
                  </label>

                  <select
                    id="jalali-month"
                    value={jalaliMonth}
                    onChange={(event) =>
                      setJalaliMonth(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-gray-500"
                  >
                    {!jalaliMonth && (
                      <option value="">
                        انتخاب
                      </option>
                    )}

                    {Array.from(
                      { length: 12 },
                      (_, index) => {
                        const value =
                          index + 1;

                        return (
                          <option
                            key={value}
                            value={value}
                          >
                            {formatNumber(value)}
                          </option>
                        );
                      }
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="jalali-day"
                    className="mb-1 block text-xs text-gray-400"
                  >
                    روز
                  </label>

                  <select
                    id="jalali-day"
                    value={jalaliDay}
                    onChange={(event) =>
                      setJalaliDay(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-gray-500"
                  >
                    {!jalaliDay && (
                      <option value="">
                        انتخاب
                      </option>
                    )}

                    {Array.from(
                      { length: 31 },
                      (_, index) => {
                        const value =
                          index + 1;

                        return (
                          <option
                            key={value}
                            value={value}
                          >
                            {formatNumber(value)}
                          </option>
                        );
                      }
                    )}
                  </select>
                </div>
              </div>

              <p className="mt-2 text-xs text-gray-400">
                {today
                  ? "تقویم جلالی"
                  : "در حال آماده‌سازی تاریخ..."}
              </p>
            </div>

            {/* Tonnage */}
            <div>
              <label
                htmlFor="total-tonnage"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                تناژ سفارش
              </label>

              <div className="relative">
                <input
                  id="total-tonnage"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={totalTonnage}
                  onChange={(event) =>
                    setTotalTonnage(
                      event.target.value
                    )
                  }
                  placeholder="مثلاً ۱۰"
                  className="w-full rounded-xl border px-4 py-3 pl-14 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                />

                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  تن
                </span>
              </div>
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="order-status"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                وضعیت سفارش
              </label>

              <select
                id="order-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
              >
                <option value="draft">
                  پیش‌نویس
                </option>

                <option value="pending">
                  در انتظار تأیید
                </option>

                <option value="confirmed">
                  تأیید شده
                </option>
              </select>
            </div>

            {/* Source */}
            <div>
              <label
                htmlFor="order-source"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                منبع سفارش
              </label>

              <select
                id="order-source"
                value={source}
                onChange={(event) =>
                  setSource(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
              >
                <option value="manual">
                  ثبت دستی توسط CRM
                </option>

                <option value="mobile_app">
                  اپلیکیشن موبایل
                </option>

                <option value="whatsapp">
                  واتساپ
                </option>

                <option value="sms">
                  پیامک
                </option>

                <option value="pwa">
                  PWA
                </option>

                <option value="api">
                  API
                </option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-6">
            <label
              htmlFor="order-notes"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              توضیحات
            </label>

            <textarea
              id="order-notes"
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value
                )
              }
              rows={4}
              placeholder="توضیحات مربوط به سفارش..."
              className="w-full resize-y rounded-xl border px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
            />
          </div>
        </section>

        {/* Summary */}
        <section className="rounded-2xl border bg-gray-50 p-6">
          <h2 className="mb-5 text-lg font-bold text-gray-900">
            خلاصه سفارش
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-4">
              <p className="text-xs text-gray-400">
                مشتری
              </p>

              <p className="mt-2 font-semibold text-gray-900">
                {selectedCustomer?.name ??
                  "انتخاب نشده"}
              </p>
            </div>

            <div className="rounded-xl bg-white p-4">
              <p className="text-xs text-gray-400">
                بازاریاب
              </p>

              <p className="mt-2 font-semibold text-gray-900">
                {selectedSalesUser?.full_name ??
                  "انتخاب نشده"}
              </p>
            </div>

            <div className="rounded-xl bg-white p-4">
              <p className="text-xs text-gray-400">
                تناژ
              </p>

              <p className="mt-2 font-semibold text-gray-900">
                {totalTonnage
                  ? formatNumber(
                      Number(
                        totalTonnage.replace(
                          ",",
                          "."
                        )
                      )
                    )
                  : "۰"}{" "}
                تن
              </p>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/orders"
            className="rounded-xl border bg-white px-6 py-3 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            انصراف
          </Link>

          <button
            type="submit"
            disabled={submitDisabled}
            className="rounded-xl bg-gray-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "در حال ثبت سفارش..."
              : "ثبت سفارش"}
          </button>
        </div>
      </form>
    </div>
  );
}
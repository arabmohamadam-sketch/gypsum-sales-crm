"use client";

import Link from "next/link";
import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  toGregorian,
  toJalaali,
} from "jalaali-js";

import { customersService } from "@/src/lib/services/customers";
import {
  usersService,
  type SalesUser,
} from "@/src/lib/services/users";
import {
  ordersService,
  type CreateOrderInput,
} from "@/src/lib/services/orders";
import type { Customer } from "@/src/lib/types/customer";

const COMPANY_ID =
  "11111111-1111-1111-1111-111111111111";

type JalaliDate = {
  year: number;
  month: number;
  day: number;
};

type OrderStatus =
  | "draft"
  | "confirmed"
  | "cancelled";

function getTodayJalali(): JalaliDate {
  const now = new Date();

  const jalali = toJalaali(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate()
  );

  return {
    year: jalali.jy,
    month: jalali.jm,
    day: jalali.jd,
  };
}

function jalaliToGregorianDate(
  date: JalaliDate
): string {
  const gregorian = toGregorian(
    date.year,
    date.month,
    date.day
  );

  const result = new Date(
    gregorian.gy,
    gregorian.gm - 1,
    gregorian.gd,
    0,
    0,
    0,
    0
  );

  if (Number.isNaN(result.getTime())) {
    throw new Error(
      "تاریخ واردشده معتبر نیست."
    );
  }

  return result.toISOString();
}

function isValidJalaliDate(
  date: JalaliDate
): boolean {
  try {
    if (
      !Number.isInteger(date.year) ||
      !Number.isInteger(date.month) ||
      !Number.isInteger(date.day)
    ) {
      return false;
    }

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

function formatNumber(
  value: number
): string {
  if (!Number.isFinite(value)) {
    return "۰";
  }

  return new Intl.NumberFormat(
    "fa-IR",
    {
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function customerTypeLabel(
  value: string | null | undefined
): string {
  const labels: Record<
    string,
    string
  > = {
    building_material_store:
      "مصالح‌فروشی",
    building_material_stores:
      "مصالح‌فروشی",
    contractor:
      "پیمانکار",
    contractor_company:
      "پیمانکار",
    employer:
      "کارفرما",
    employers:
      "کارفرما",
    plasterer:
      "گچ‌کار",
    plaster_worker:
      "گچ‌کار",
    plasterer_company:
      "گچ‌کار",
    distributor:
      "توزیع‌کننده",
    retailer:
      "خرده‌فروشی",
  };

  return value
    ? labels[value] ?? value
    : "نامشخص";
}

function OrderStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white shadow-sm">
        {number}
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

function NewOrderForm() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const customerIdFromUrl =
    searchParams.get("customerId") ?? "";

  const [today] =
    useState<JalaliDate>(
      () => getTodayJalali()
    );

  const [jalaliYear, setJalaliYear] =
    useState(
      String(today.year)
    );

  const [jalaliMonth, setJalaliMonth] =
    useState(
      String(today.month)
    );

  const [jalaliDay, setJalaliDay] =
    useState(
      String(today.day)
    );

  const [
    customers,
    setCustomers,
  ] = useState<Customer[]>([]);

  const [
    salesUsers,
    setSalesUsers,
  ] = useState<SalesUser[]>([]);

  const [
    loadingCustomers,
    setLoadingCustomers,
  ] = useState(true);

  const [
    loadingUsers,
    setLoadingUsers,
  ] = useState(true);

  const [
    customerSearch,
    setCustomerSearch,
  ] = useState("");

  const [
    showCustomerResults,
    setShowCustomerResults,
  ] = useState(false);

  const [
    selectedCustomer,
    setSelectedCustomer,
  ] = useState<Customer | null>(
    null
  );

  const [
    selectedSalesUser,
    setSelectedSalesUser,
  ] = useState<SalesUser | null>(
    null
  );

  const [
    salesUserSearch,
    setSalesUserSearch,
  ] = useState("");

  const [
    showSalesUsers,
    setShowSalesUsers,
  ] = useState(false);

  const [
    totalTonnage,
    setTotalTonnage,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState<OrderStatus>(
    "draft"
  );

  const [
    source,
    setSource,
  ] = useState("manual");

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  // =========================================================
  // LOAD CUSTOMERS
  // =========================================================

  useEffect(() => {
    let mounted = true;

    async function loadCustomers() {
      try {
        setLoadingCustomers(true);
        setError("");

        const result =
          await customersService.getAll();

        if (!mounted) {
          return;
        }

        setCustomers(result);

        if (customerIdFromUrl) {
          const customerFromUrl =
            result.find(
              (customer) =>
                customer.id ===
                customerIdFromUrl
            );

          if (customerFromUrl) {
            setSelectedCustomer(
              customerFromUrl
            );

            setCustomerSearch(
              customerFromUrl.name
            );

            setShowCustomerResults(
              false
            );
          } else {
            setSelectedCustomer(null);
            setCustomerSearch("");
            setError(
              "مشتری انتخاب‌شده پیدا نشد."
            );
          }
        }
      } catch (err) {
        if (!mounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "خطا در دریافت مشتریان."
        );
      } finally {
        if (mounted) {
          setLoadingCustomers(
            false
          );
        }
      }
    }

    void loadCustomers();

    return () => {
      mounted = false;
    };
  }, [customerIdFromUrl]);

  // =========================================================
  // LOAD SALES USERS
  // =========================================================

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
              : "خطا در دریافت بازاریابان."
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

  // =========================================================
  // SEARCH CUSTOMERS
  // =========================================================

  const filteredCustomers =
    useMemo(() => {
      const query =
        customerSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return customers.slice(
          0,
          12
        );
      }

      return customers
        .filter((customer) => {
          const name =
            customer.name?.toLowerCase() ??
            "";

          const phone =
            customer.phone?.toLowerCase() ??
            "";

          const code =
            customer.code?.toLowerCase() ??
            "";

          return (
            name.includes(query) ||
            phone.includes(query) ||
            code.includes(query)
          );
        })
        .slice(0, 12);
    }, [
      customers,
      customerSearch,
    ]);

  // =========================================================
  // SEARCH SALES USERS
  // =========================================================

  const filteredSalesUsers =
    useMemo(() => {
      const query =
        salesUserSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return salesUsers.slice(
          0,
          10
        );
      }

      return salesUsers
        .filter((user) => {
          const name =
            user.full_name?.toLowerCase() ??
            "";

          const phone =
            user.phone?.toLowerCase() ??
            "";

          const code =
            user.employee_code?.toLowerCase() ??
            "";

          return (
            name.includes(query) ||
            phone.includes(query) ||
            code.includes(query)
          );
        })
        .slice(0, 10);
    }, [
      salesUsers,
      salesUserSearch,
    ]);

  // =========================================================
  // SELECT CUSTOMER
  // =========================================================

  function selectCustomer(
    customer: Customer
  ) {
    setSelectedCustomer(
      customer
    );

    setCustomerSearch(
      customer.name
    );

    setShowCustomerResults(
      false
    );
  }

  // =========================================================
  // SELECT SALES USER
  // =========================================================

  function selectSalesUser(
    user: SalesUser
  ) {
    setSelectedSalesUser(
      user
    );

    setSalesUserSearch(
      user.full_name
    );

    setShowSalesUsers(false);
  }

  // =========================================================
  // CLEAR CUSTOMER
  // =========================================================

  function clearCustomer() {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setShowCustomerResults(
      true
    );
  }

  // =========================================================
  // CLEAR SALES USER
  // =========================================================

  function clearSalesUser() {
    setSelectedSalesUser(null);
    setSalesUserSearch("");
    setShowSalesUsers(true);
  }

  // =========================================================
  // SUBMIT
  // =========================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
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

    if (
      !jalaliYear ||
      !jalaliMonth ||
      !jalaliDay
    ) {
      setError(
        "تاریخ سفارش هنوز آماده نشده است."
      );
      return;
    }

    const year =
      Number(jalaliYear);

    const month =
      Number(jalaliMonth);

    const day =
      Number(jalaliDay);

    const jalaliDate: JalaliDate = {
      year,
      month,
      day,
    };

    if (
      !isValidJalaliDate(
        jalaliDate
      )
    ) {
      setError(
        "تاریخ جلالی واردشده معتبر نیست."
      );
      return;
    }

    const normalizedTonnage =
      totalTonnage.replace(
        ",",
        "."
      );

    const tonnage =
      Number(
        normalizedTonnage
      );

    if (
      !Number.isFinite(
        tonnage
      ) ||
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
        company_id:
          COMPANY_ID,

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
          notes.trim() ||
          null,

        source:
          source.trim() ||
          "manual",
      };

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
    Boolean(
      saving ||
        loadingCustomers ||
        loadingUsers ||
        !selectedCustomer ||
        !selectedSalesUser ||
        !jalaliYear ||
        !jalaliMonth ||
        !jalaliDay
    );

  const currentTonnage =
    Number(
      totalTonnage.replace(
        ",",
        "."
      )
    );

  return (
    <div
      dir="rtl"
      className="mx-auto max-w-6xl space-y-6 pb-12"
    >
      {/* =====================================================
          HEADER
          ===================================================== */}

      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-slate-900 via-violet-600 to-blue-600" />

        <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-violet-100/40 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-blue-100/40 blur-3xl" />

        <div className="relative flex flex-col gap-6 p-6 md:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-violet-600 text-2xl text-white shadow-lg shadow-violet-100">
              📦
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                  ثبت سفارش جدید
                </h1>

                {customerIdFromUrl && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                    مشتری از پروفایل انتخاب شده
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm leading-7 text-slate-500 md:text-base">
                سفارش مشتری را با اطلاعات کامل ثبت کنید.
              </p>
            </div>
          </div>

          <Link
            href="/orders"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            ← بازگشت به سفارش‌ها
          </Link>
        </div>
      </section>

      {/* =====================================================
          ALERTS
          ===================================================== */}

      {error && (
        <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
          <div className="h-1 bg-red-500" />

          <div className="flex items-start gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              !
            </div>

            <div>
              <p className="font-bold text-red-800">
                ثبت سفارش انجام نشد
              </p>

              <p className="mt-1 text-sm leading-6 text-red-600">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
          <div className="h-1 bg-emerald-500" />

          <div className="flex items-start gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              ✓
            </div>

            <div>
              <p className="font-bold text-emerald-800">
                سفارش با موفقیت ثبت شد
              </p>

              <p className="mt-1 text-sm text-emerald-600">
                در حال انتقال به جزئیات سفارش...
              </p>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* =====================================================
            CUSTOMER
            ===================================================== */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
          <OrderStep
            number="۱"
            title="انتخاب مشتری"
            description="نام، شماره تلفن یا کد مشتری را جستجو و انتخاب کنید."
          />

          {selectedCustomer ? (
            <div className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white">
              <div className="p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white shadow-sm">
                      {selectedCustomer.name?.charAt(
                        0
                      ) || "م"}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-black text-slate-900">
                          {selectedCustomer.name}
                        </h3>

                        {selectedCustomer.is_vip && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                            ★ VIP
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
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
                            نوع:{" "}
                            {customerTypeLabel(
                              selectedCustomer.customer_type
                            )}
                          </span>
                        )}

                        {selectedCustomer.code && (
                          <span>
                            کد:{" "}
                            {
                              selectedCustomer.code
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={
                      clearCustomer
                    }
                    className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
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
            <div className="relative">
              <label
                htmlFor="customer-search"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                مشتری
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  🔎
                </span>

                <input
                  id="customer-search"
                  type="text"
                  value={customerSearch}
                  onChange={(event) => {
                    setCustomerSearch(
                      event.target.value
                    );

                    setSelectedCustomer(
                      null
                    );

                    setShowCustomerResults(
                      true
                    );
                  }}
                  onFocus={() =>
                    setShowCustomerResults(
                      true
                    )
                  }
                  placeholder="مثلاً: آذرنیا، 0912... یا کد مشتری"
                  autoComplete="off"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pr-11 pl-14 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />

                {loadingCustomers && (
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    در حال دریافت...
                  </span>
                )}

                {!loadingCustomers &&
                  customerSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerSearch(
                          ""
                        );
                        setSelectedCustomer(
                          null
                        );
                        setShowCustomerResults(
                          true
                        );
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="پاک کردن جستجو"
                    >
                      ×
                    </button>
                  )}
              </div>

              {showCustomerResults && (
                <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="max-h-80 overflow-auto">
                    {filteredCustomers.length ===
                    0 ? (
                      <div className="p-8 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                          🔎
                        </div>

                        <p className="mt-3 text-sm font-bold text-slate-700">
                          مشتری پیدا نشد
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          عبارت جستجو را تغییر دهید.
                        </p>
                      </div>
                    ) : (
                      filteredCustomers.map(
                        (customer) => (
                          <button
                            key={
                              customer.id
                            }
                            type="button"
                            onClick={() =>
                              selectCustomer(
                                customer
                              )
                            }
                            className="block w-full border-b border-slate-100 px-5 py-4 text-right transition last:border-b-0 hover:bg-blue-50/60"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-700">
                                {customer.name?.charAt(
                                  0
                                ) || "م"}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-bold text-slate-900">
                                    {
                                      customer.name
                                    }
                                  </p>

                                  {customer.is_vip && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                      VIP
                                    </span>
                                  )}
                                </div>

                                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                                  {customer.phone && (
                                    <span dir="ltr">
                                      {
                                        customer.phone
                                      }
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

                                  {customer.customer_type && (
                                    <span>
                                      {customerTypeLabel(
                                        customer.customer_type
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <span className="text-lg text-slate-300">
                                ←
                              </span>
                            </div>
                          </button>
                        )
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* =====================================================
            SALES USER
            ===================================================== */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
          <OrderStep
            number="۲"
            title="انتخاب بازاریاب"
            description="بازاریاب مسئول این سفارش را انتخاب کنید."
          />

          {selectedSalesUser ? (
            <div className="overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white">
              <div className="p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-lg font-black text-white shadow-sm">
                      {selectedSalesUser.full_name?.charAt(
                        0
                      ) || "ب"}
                    </div>

                    <div>
                      <p className="text-xs font-medium text-violet-600">
                        بازاریاب انتخاب‌شده
                      </p>

                      <h3 className="mt-1 text-lg font-black text-slate-900">
                        {
                          selectedSalesUser.full_name
                        }
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                        {selectedSalesUser.job_title && (
                          <span>
                            {
                              selectedSalesUser.job_title
                            }
                          </span>
                        )}

                        {selectedSalesUser.phone && (
                          <span dir="ltr">
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
                  </div>

                  <button
                    type="button"
                    onClick={
                      clearSalesUser
                    }
                    className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    تغییر بازاریاب
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <label
                htmlFor="sales-user-search"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                بازاریاب
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  👤
                </span>

                <input
                  id="sales-user-search"
                  type="text"
                  value={salesUserSearch}
                  onChange={(event) => {
                    setSalesUserSearch(
                      event.target.value
                    );

                    setSelectedSalesUser(
                      null
                    );

                    setShowSalesUsers(
                      true
                    );
                  }}
                  onFocus={() =>
                    setShowSalesUsers(
                      true
                    )
                  }
                  placeholder="نام بازاریاب را جستجو کنید..."
                  autoComplete="off"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pr-11 pl-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-50"
                />

                {loadingUsers && (
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    در حال دریافت...
                  </span>
                )}
              </div>

              {showSalesUsers && (
                <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="max-h-72 overflow-auto">
                    {filteredSalesUsers.length ===
                    0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">
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
                            className="block w-full border-b border-slate-100 px-5 py-4 text-right transition last:border-b-0 hover:bg-violet-50/60"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-sm font-black text-violet-700">
                                {user.full_name?.charAt(
                                  0
                                ) || "ب"}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-900">
                                  {
                                    user.full_name
                                  }
                                </p>

                                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                                  {user.job_title && (
                                    <span>
                                      {
                                        user.job_title
                                      }
                                    </span>
                                  )}

                                  {user.phone && (
                                    <span dir="ltr">
                                      {
                                        user.phone
                                      }
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
                              </div>

                              <span className="text-lg text-slate-300">
                                ←
                              </span>
                            </div>
                          </button>
                        )
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* =====================================================
            ORDER INFORMATION
            ===================================================== */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
          <OrderStep
            number="۳"
            title="اطلاعات سفارش"
            description="تاریخ، تناژ و وضعیت سفارش را مشخص کنید."
          />

          <div className="grid gap-6 md:grid-cols-2">
            {/* Date */}

            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
              <label className="mb-4 block text-sm font-bold text-slate-700">
                تاریخ سفارش
              </label>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="jalali-year"
                    className="mb-2 block text-xs font-bold text-slate-400"
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="jalali-month"
                    className="mb-2 block text-xs font-bold text-slate-400"
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  >
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
                            {formatNumber(
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
                    htmlFor="jalali-day"
                    className="mb-2 block text-xs font-bold text-slate-400"
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  >
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
                            {formatNumber(
                              value
                            )}
                          </option>
                        );
                      }
                    )}
                  </select>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-white px-4 py-3 text-xs text-slate-500 ring-1 ring-slate-100">
                تاریخ امروز:
                <span className="mr-2 font-bold text-slate-800">
                  {formatNumber(
                    today.year
                  )}
                  /
                  {formatNumber(
                    today.month
                  )}
                  /
                  {formatNumber(
                    today.day
                  )}
                </span>
              </div>
            </div>

            {/* Tonnage */}

            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
              <label
                htmlFor="total-tonnage"
                className="mb-4 block text-sm font-bold text-slate-700"
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-4 pl-16 text-lg font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />

                <span className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg bg-slate-100 px-2 py-1 text-sm font-bold text-slate-500">
                  تن
                </span>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                مقدار تناژ را به تن وارد کنید.
              </p>
            </div>

            {/* Status */}

            <div>
              <label
                htmlFor="order-status"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                وضعیت سفارش
              </label>

              <select
                id="order-status"
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as OrderStatus
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              >
                <option value="draft">
                  پیش‌نویس
                </option>

                <option value="confirmed">
                  تأیید شده
                </option>

                <option value="cancelled">
                  لغو شده
                </option>
              </select>
            </div>

            {/* Source */}

            <div>
              <label
                htmlFor="order-source"
                className="mb-2 block text-sm font-bold text-slate-700"
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
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
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
              className="mb-2 block text-sm font-bold text-slate-700"
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
              className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>
        </section>

        {/* =====================================================
            SUMMARY
            ===================================================== */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 text-white shadow-lg">
          <div className="p-6 md:p-7">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400">
                  پیش‌نمایش
                </p>

                <h2 className="mt-1 text-xl font-black">
                  خلاصه سفارش
                </h2>
              </div>

              <div className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-slate-300">
                قبل از ثبت بررسی کنید
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-slate-400">
                  مشتری
                </p>

                <p className="mt-2 truncate font-bold text-white">
                  {selectedCustomer?.name ??
                    "انتخاب نشده"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-slate-400">
                  بازاریاب
                </p>

                <p className="mt-2 truncate font-bold text-white">
                  {selectedSalesUser?.full_name ??
                    "انتخاب نشده"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-slate-400">
                  تناژ
                </p>

                <p className="mt-2 font-bold text-white">
                  {Number.isFinite(
                    currentTonnage
                  ) &&
                  currentTonnage > 0
                    ? formatNumber(
                        currentTonnage
                      )
                    : "۰"}{" "}
                  تن
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            ACTIONS
            ===================================================== */}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/orders"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            انصراف
          </Link>

          <button
            type="submit"
            disabled={submitDisabled}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-8 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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

export default function NewOrderPage() {
  return (
    <Suspense
      fallback={
        <div
          dir="rtl"
          className="min-h-screen bg-slate-50 p-4 md:p-6"
        >
          <div className="mx-auto max-w-6xl">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="h-1.5 bg-gradient-to-r from-slate-900 via-violet-600 to-blue-600" />

              <div className="p-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                  📦
                </div>

                <p className="mt-4 text-sm font-medium text-slate-500">
                  در حال بارگذاری فرم ثبت سفارش...
                </p>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <NewOrderForm />
    </Suspense>
  );
}
"use client";

import Link from "next/link";

import {
  ChevronLeft,
  MessageCircle,
  Phone,
  UserRound,
  Users,
} from "lucide-react";

import type { Customer } from "@/src/lib/types/customer";

type Props = {
  customers: Customer[];
  loading: boolean;
};

const customerTypeNames: Record<string, string> = {
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

const cityNames: Record<string, string> = {
  Garmsar: "گرمسار",
  garmsar: "گرمسار",

  Semnan: "سمنان",
  semnan: "سمنان",

  Varamin: "ورامین",
  varamin: "ورامین",

  Chalous: "چالوس",
  Chalus: "چالوس",
  chalous: "چالوس",

  Kelardasht: "کلاردشت",
  kelardasht: "کلاردشت",

  Ramsar: "رامسر",
  ramsar: "رامسر",

  Tonekabon: "تنکابن",
  tonekabon: "تنکابن",
};

function getCustomerType(
  type?: string | null
): string {
  if (!type) {
    return "سایر";
  }

  return (
    customerTypeNames[type] ??
    type
  );
}

function getCityName(
  customer: Customer
): string {
  const customerWithCity =
    customer as Customer & {
      city?: {
        id?: string;
        name?: string;
        code?: string | null;
      } | null;
    };

  const city =
    customerWithCity.city;

  if (city?.name) {
    return (
      cityNames[city.name] ??
      city.name
    );
  }

  const sourceCity =
    customer.metadata?.source_city;

  if (
    typeof sourceCity === "string" &&
    sourceCity.trim()
  ) {
    return (
      cityNames[sourceCity.trim()] ??
      sourceCity.trim()
    );
  }

  return "—";
}

function formatTonnage(
  value: unknown
): string {
  const number =
    Number(value ?? 0);

  if (!Number.isFinite(number)) {
    return "۰";
  }

  return number.toLocaleString(
    "fa-IR",
    {
      maximumFractionDigits: 2,
    }
  );
}

function getInitial(
  name: unknown
): string {
  const value =
    String(name ?? "").trim();

  return value
    ? value.charAt(0)
    : "?";
}

function normalizePhone(
  phone: string
): string {
  const persianDigits =
    "۰۱۲۳۴۵۶۷۸۹";

  const arabicDigits =
    "٠١٢٣٤٥٦٧٨٩";

  let normalized =
    phone.trim();

  normalized =
    normalized.replace(
      /[۰-۹٠-٩]/g,
      (digit) => {
        const persianIndex =
          persianDigits.indexOf(
            digit
          );

        if (persianIndex >= 0) {
          return String(
            persianIndex
          );
        }

        const arabicIndex =
          arabicDigits.indexOf(
            digit
          );

        if (arabicIndex >= 0) {
          return String(
            arabicIndex
          );
        }

        return digit;
      }
    );

  normalized =
    normalized.replace(
      /[^\d+]/g,
      ""
    );

  if (
    normalized.startsWith("+98")
  ) {
    normalized =
      `0${normalized.slice(3)}`;
  } else if (
    normalized.startsWith("0098")
  ) {
    normalized =
      `0${normalized.slice(4)}`;
  } else if (
    normalized.startsWith("98") &&
    normalized.length >= 10
  ) {
    normalized =
      `0${normalized.slice(2)}`;
  }

  return normalized;
}

function getWhatsAppUrl(
  phone: unknown
): string | null {
  if (!phone) {
    return null;
  }

  const normalized =
    normalizePhone(
      String(phone)
    );

  if (!normalized) {
    return null;
  }

  const international =
    normalized.startsWith("0")
      ? `98${normalized.slice(1)}`
      : normalized.startsWith("98")
        ? normalized
        : `98${normalized}`;

  return `https://wa.me/${international}`;
}

function formatPhone(
  phone?: string | null
): string {
  return phone || "—";
}

function StatusBadge({
  active,
}: {
  active: boolean;
}) {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        فعال
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-700 ring-1 ring-red-100">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      غیرفعال
    </span>
  );
}

function LoadingState() {
  return (
    <div
      dir="rtl"
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
        <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />

        <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-100" />
      </div>

      <div className="divide-y divide-slate-100">
        {Array.from({
          length: 6,
        }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 p-5"
          >
            <div className="h-11 w-11 shrink-0 animate-pulse rounded-2xl bg-slate-200" />

            <div className="min-w-0 flex-1">
              <div className="h-4 w-40 max-w-full animate-pulse rounded bg-slate-200" />

              <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-100" />
            </div>

            <div className="hidden h-8 w-20 animate-pulse rounded-full bg-slate-100 md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      dir="rtl"
      className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm sm:p-14"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <UserRound size={28} />
      </div>

      <h3 className="mt-5 text-xl font-black text-slate-900">
        هیچ مشتری‌ای پیدا نشد
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500">
        مشتری موردنظر با فیلترهای انتخاب‌شده پیدا نشد.
        فیلترها را تغییر دهید یا مشتری جدیدی اضافه کنید.
      </p>

      <Link
        href="/customers/new"
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5 hover:bg-blue-700"
      >
        <span className="text-lg leading-none">
          +
        </span>

        افزودن مشتری
      </Link>
    </div>
  );
}

function PhoneActions({
  phone,
  secondaryPhone,
  whatsappUrl,
  mobile = false,
}: {
  phone?: string | null;
  secondaryPhone?: string | null;
  whatsappUrl?: string | null;
  mobile?: boolean;
}) {
  const buttonBase = mobile
    ? "flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition active:scale-[0.98]"
    : "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition";

  return (
    <div
      dir="ltr"
      className={
        mobile
          ? "grid grid-cols-2 gap-2"
          : "flex flex-wrap items-center gap-2"
      }
    >
      {phone ? (
        <a
          href={`tel:${phone}`}
          onClick={(event) => {
            event.stopPropagation();
          }}
          className={`${buttonBase} ${
            mobile
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
          }`}
          title="تماس با شماره اصلی"
        >
          <Phone size={mobile ? 15 : 13} />

          {mobile ? (
            "تماس"
          ) : (
            formatPhone(phone)
          )}
        </a>
      ) : mobile ? (
        <span className="flex min-h-11 items-center justify-center rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-400">
          شماره ثبت نشده
        </span>
      ) : (
        <span className="text-xs text-slate-400">
          —
        </span>
      )}

      {secondaryPhone && (
        <a
          href={`tel:${secondaryPhone}`}
          onClick={(event) => {
            event.stopPropagation();
          }}
          className={`${buttonBase} ${
            mobile
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          }`}
          title="تماس با شماره دوم"
        >
          <Phone size={mobile ? 15 : 13} />

          {mobile ? (
            "تماس دوم"
          ) : (
            formatPhone(
              secondaryPhone
            )
          )}
        </a>
      )}

      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => {
            event.stopPropagation();
          }}
          className={`${buttonBase} ${
            mobile
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
          title="واتساپ"
        >
          <MessageCircle
            size={mobile ? 15 : 13}
          />

          {mobile ? (
            "واتساپ"
          ) : (
            "واتساپ"
          )}
        </a>
      )}
    </div>
  );
}

export default function CustomerTable({
  customers,
  loading,
}: Props) {
  if (loading) {
    return <LoadingState />;
  }

  if (customers.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      dir="rtl"
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Header */}
      <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-l from-slate-50 via-white to-blue-50/40 px-5 py-5 sm:px-6">
        <div className="absolute left-0 top-0 h-1 w-40 bg-gradient-to-l from-blue-600 to-cyan-500" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users size={19} />
            </div>

            <div>
              <h2 className="font-black text-slate-900">
                فهرست مشتریان
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                نمایش{" "}
                {customers.length.toLocaleString(
                  "fa-IR"
                )}{" "}
                مشتری
              </p>
            </div>
          </div>

          <Link
            href="/customers/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-600"
          >
            <span className="text-lg leading-none">
              +
            </span>

            افزودن مشتری
          </Link>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1180px] text-right">
          <thead className="border-b border-slate-100 bg-slate-50/60">
            <tr className="text-xs text-slate-500">
              <th className="px-5 py-4 font-black">
                مشتری
              </th>

              <th className="px-5 py-4 font-black">
                شهر
              </th>

              <th className="px-5 py-4 font-black">
                نوع مشتری
              </th>

              <th className="px-5 py-4 font-black">
                تماس
              </th>

              <th className="px-5 py-4 font-black">
                تناژ کل
              </th>

              <th className="px-5 py-4 font-black">
                وضعیت
              </th>

              <th className="px-5 py-4 font-black">
                عملیات
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {customers.map(
              (customer) => {
                const city =
                  getCityName(
                    customer
                  );

                const type =
                  getCustomerType(
                    customer.customer_type
                  );

                const whatsappUrl =
                  getWhatsAppUrl(
                    customer.whatsapp_number ??
                      customer.phone
                  );

                return (
                  <tr
                    key={
                      customer.id
                    }
                    className="group transition hover:bg-slate-50/80"
                  >
                    {/* Customer */}
                    <td className="px-5 py-4">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 font-black text-blue-700 ring-1 ring-blue-100">
                          {getInitial(
                            customer.name
                          )}

                          {customer.is_vip && (
                            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-amber-400 text-[8px] text-white">
                              ★
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-black text-slate-900 transition group-hover:text-blue-600">
                            {customer.name ||
                              "بدون نام"}
                          </p>

                          <div className="mt-1 flex items-center gap-2">
                            {customer.is_vip && (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                VIP
                              </span>
                            )}

                            <span className="text-[11px] text-slate-400">
                              مشاهده پرونده
                            </span>
                          </div>
                        </div>
                      </Link>
                    </td>

                    {/* City */}
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                        {city}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="px-5 py-4 text-sm font-medium text-slate-700">
                      {type}
                    </td>

                    {/* Phone */}
                    <td className="px-5 py-4">
                      <PhoneActions
                        phone={
                          customer.phone
                        }
                        secondaryPhone={
                          customer.secondary_phone
                        }
                        whatsappUrl={
                          whatsappUrl
                        }
                      />
                    </td>

                    {/* Tonnage */}
                    <td className="px-5 py-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-black text-slate-900">
                          {formatTonnage(
                            customer.lifetime_tonnage
                          )}
                        </span>

                        <span className="text-[11px] text-slate-400">
                          تن
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <StatusBadge
                        active={Boolean(
                          customer.is_active
                        )}
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="group/action inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs font-black text-slate-700 transition hover:bg-blue-600 hover:text-white"
                      >
                        مشاهده

                        <ChevronLeft
                          size={14}
                          className="transition-transform group-hover/action:-translate-x-0.5"
                        />
                      </Link>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="divide-y divide-slate-100 md:hidden">
        {customers.map(
          (customer) => {
            const city =
              getCityName(
                customer
              );

            const type =
              getCustomerType(
                customer.customer_type
              );

            const whatsappUrl =
              getWhatsAppUrl(
                customer.whatsapp_number ??
                  customer.phone
              );

            return (
              <div
                key={customer.id}
                className="p-3 sm:p-4"
              >
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <Link
                    href={`/customers/${customer.id}`}
                    className="block"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 text-base font-black text-blue-700 ring-1 ring-blue-100">
                        {getInitial(
                          customer.name
                        )}

                        {customer.is_vip && (
                          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-amber-400 text-[8px] text-white">
                            ★
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="truncate text-base font-black text-slate-900">
                              {customer.name ||
                                "بدون نام"}
                            </h2>

                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="text-xs font-medium text-slate-500">
                                {city}
                              </span>

                              <span className="text-slate-300">
                                •
                              </span>

                              <span className="text-xs text-slate-500">
                                {type}
                              </span>
                            </div>
                          </div>

                          <StatusBadge
                            active={Boolean(
                              customer.is_active
                            )}
                          />
                        </div>

                        <div className="mt-4 space-y-2">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold text-slate-400">
                              شماره تماس اصلی
                            </p>

                            <p
                              dir="ltr"
                              className="mt-1 truncate text-xs font-black text-slate-700"
                            >
                              {formatPhone(
                                customer.phone
                              )}
                            </p>
                          </div>

                          {customer.secondary_phone && (
                            <div className="rounded-xl bg-indigo-50/70 p-3">
                              <p className="text-[10px] font-bold text-indigo-400">
                                شماره تماس دوم
                              </p>

                              <p
                                dir="ltr"
                                className="mt-1 truncate text-xs font-black text-indigo-700"
                              >
                                {formatPhone(
                                  customer.secondary_phone
                                )}
                              </p>
                            </div>
                          )}

                          <div className="rounded-xl bg-blue-50/70 p-3">
                            <p className="text-[10px] font-bold text-blue-400">
                              تناژ کل
                            </p>

                            <p className="mt-1 text-sm font-black text-blue-700">
                              {formatTonnage(
                                customer.lifetime_tonnage
                              )}{" "}
                              <span className="text-[10px]">
                                تن
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                          <span className="text-[11px] font-bold text-slate-400">
                            مشاهده پرونده مشتری
                          </span>

                          <ChevronLeft
                            size={15}
                            className="text-slate-400"
                          />
                        </div>
                      </div>
                    </div>
                  </Link>

                  <div className="mt-3">
                    <PhoneActions
                      phone={
                        customer.phone
                      }
                      secondaryPhone={
                        customer.secondary_phone
                      }
                      whatsappUrl={
                        whatsappUrl
                      }
                      mobile
                    />
                  </div>
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}
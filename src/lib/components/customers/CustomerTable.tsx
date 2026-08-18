"use client";

import Link from "next/link";

type Props = {
  customers: any[];
  loading: boolean;
};

const customerTypeNames: Record<string, string> = {
  building_material_store: "مصالح‌فروشی",
  contractor: "پیمانکار",
  employer: "کارفرما",
  plaster_worker: "گچ‌کار",
};

function getCustomerType(type: string | null | undefined) {
  return customerTypeNames[type ?? ""] ?? "سایر";
}

function formatTonnage(value: unknown) {
  const number = Number(value ?? 0);

  return number.toLocaleString("fa-IR", {
    maximumFractionDigits: 2,
  });
}

function getCityName(customer: any) {
  if (typeof customer.city === "string" && customer.city.trim()) {
    return customer.city;
  }

  if (customer.city?.name) {
    return customer.city.name;
  }

  if (customer.city_name) {
    return customer.city_name;
  }

  if (customer.metadata?.source_city) {
    return customer.metadata.source_city;
  }

  return "—";
}

function getInitial(name: unknown) {
  const value = String(name ?? "").trim();

  return value ? value.charAt(0) : "?";
}

function getWhatsAppUrl(phone: unknown) {
  if (!phone) return null;

  let value = String(phone).replace(/\D/g, "");

  if (!value) return null;

  if (value.startsWith("0098")) {
    value = value.slice(2);
  }

  if (value.startsWith("0")) {
    value = `98${value.slice(1)}`;
  } else if (!value.startsWith("98")) {
    value = `98${value}`;
  }

  return `https://wa.me/${value}`;
}

export default function CustomerTable({
  customers,
  loading,
}: Props) {
  if (loading) {
    return (
      <div
        dir="rtl"
        className="rounded-2xl border bg-white p-8 text-center shadow-sm"
      >
        <div className="text-sm text-slate-500">
          در حال دریافت اطلاعات مشتریان...
        </div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div
        dir="rtl"
        className="rounded-2xl border bg-white p-12 text-center shadow-sm"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <span className="text-2xl">👤</span>
        </div>

        <h3 className="text-lg font-bold text-slate-800">
          هیچ مشتری‌ای پیدا نشد
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          مشتری موردنظر با فیلترهای انتخاب‌شده پیدا نشد.
        </p>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="overflow-hidden rounded-2xl border bg-white shadow-sm"
    >
      <div className="flex flex-col gap-2 border-b bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-slate-800">
            فهرست مشتریان
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            نمایش{" "}
            {customers.length.toLocaleString("fa-IR")} مشتری
          </p>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1050px] text-right">
          <thead className="border-b bg-slate-50">
            <tr className="text-sm text-slate-600">
              <th className="px-5 py-4 font-semibold">
                مشتری
              </th>

              <th className="px-5 py-4 font-semibold">
                شهر
              </th>

              <th className="px-5 py-4 font-semibold">
                نوع مشتری
              </th>

              <th className="px-5 py-4 font-semibold">
                شماره تماس
              </th>

              <th className="px-5 py-4 font-semibold">
                تناژ کل
              </th>

              <th className="px-5 py-4 font-semibold">
                وضعیت
              </th>

              <th className="px-5 py-4 font-semibold">
                عملیات
              </th>
            </tr>
          </thead>

          <tbody>
            {customers.map((customer) => {
              const city = getCityName(customer);
              const type = getCustomerType(
                customer.customer_type
              );

              const whatsappUrl = getWhatsAppUrl(
                customer.phone
              );

              return (
                <tr
                  key={customer.id}
                  className="border-b last:border-b-0 hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-600">
                        {getInitial(customer.name)}
                      </div>

                      <div>
                        <div className="font-semibold text-slate-800">
                          {customer.name || "بدون نام"}
                        </div>

                        {customer.is_vip && (
                          <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            VIP
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                      {city}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-700">
                    {type}
                  </td>

                  <td
                    className="px-5 py-4 text-sm text-slate-700"
                    dir="ltr"
                  >
                    <div className="flex items-center gap-2">
                      <span>
                        {customer.phone || "—"}
                      </span>

                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                        >
                          واتساپ
                        </a>
                      )}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span className="font-semibold text-slate-800">
                      {formatTonnage(
                        customer.lifetime_tonnage
                      )}
                    </span>

                    <span className="mr-1 text-xs text-slate-500">
                      تن
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    {customer.is_active ? (
                      <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                        فعال
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                        غیرفعال
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-blue-600 hover:text-white"
                    >
                      مشاهده پروفایل
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="divide-y md:hidden">
        {customers.map((customer) => {
          const city = getCityName(customer);

          const type = getCustomerType(
            customer.customer_type
          );

          const whatsappUrl = getWhatsAppUrl(
            customer.phone
          );

          return (
            <div
              key={customer.id}
              className="p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-600">
                    {getInitial(customer.name)}
                  </div>

                  <div>
                    <div className="font-bold text-slate-800">
                      {customer.name || "بدون نام"}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {city}
                    </div>
                  </div>
                </div>

                {customer.is_vip && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                    VIP
                  </span>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-400">
                    نوع مشتری
                  </div>

                  <div className="mt-1 font-medium text-slate-700">
                    {type}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400">
                    وضعیت
                  </div>

                  <div className="mt-1">
                    {customer.is_active ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                        فعال
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                        غیرفعال
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400">
                    شماره تماس
                  </div>

                  <div
                    className="mt-1 font-medium text-slate-700"
                    dir="ltr"
                  >
                    {customer.phone || "—"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400">
                    تناژ کل
                  </div>

                  <div className="mt-1 font-bold text-blue-600">
                    {formatTonnage(
                      customer.lifetime_tonnage
                    )}{" "}
                    تن
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-green-700"
                  >
                    واتساپ
                  </a>
                )}

                <Link
                  href={`/customers/${customer.id}`}
                  className={`flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 ${
                    whatsappUrl ? "" : "col-span-2"
                  }`}
                >
                  مشاهده پروفایل
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { customersService } from "@/src/lib/services/customers";
import type { Customer } from "@/src/lib/types/customer";

interface CustomerPageProps {
  customerId: string;
}

const customerTypeLabels: Record<string, string> = {
  building_material_store: "مصالح‌فروشی",
  contractor: "پیمانکار",
  employer: "کارفرما",
  plasterer: "گچ‌کار",
};

function getCustomerTypeLabel(type?: string | null): string {
  if (!type) return "—";
  return customerTypeLabels[type] ?? type;
}

function getCityName(customer: Customer): string {
  const customerWithCity = customer as Customer & {
    city?: {
      id?: string;
      name?: string;
      code?: string;
    } | null;
  };

  const city = customerWithCity.city;

  if (!city?.name) {
    return "—";
  }

  const cityNames: Record<string, string> = {
    Garmsar: "گرمسار",
    garmsar: "گرمسار",
    Semnan: "سمنان",
    semnan: "سمنان",
    Varamin: "ورامین",
    varamin: "ورامین",
  };

  return cityNames[city.name] ?? city.name;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("fa-IR");
}

function normalizeWhatsappNumber(phone: string): string {
  const normalized = phone.replace(/[^\d+]/g, "");

  if (normalized.startsWith("+98")) {
    return normalized.substring(1);
  }

  if (normalized.startsWith("98")) {
    return normalized;
  }

  if (normalized.startsWith("0")) {
    return `98${normalized.substring(1)}`;
  }

  return normalized;
}

export default function CustomerPage({
  customerId,
}: CustomerPageProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCustomer() {
      if (!customerId) {
        setError("شناسه مشتری مشخص نیست.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const data = await customersService.getById(customerId);

        setCustomer(data);
      } catch (err) {
        console.error("خطا در دریافت مشتری:", err);
        setCustomer(null);
        setError("اطلاعات مشتری دریافت نشد.");
      } finally {
        setLoading(false);
      }
    }

    loadCustomer();
  }, [customerId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center" dir="rtl">
        <div className="rounded-2xl border bg-white p-8">
          <div className="text-gray-500">
            در حال دریافت اطلاعات مشتری...
          </div>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="max-w-5xl mx-auto p-6" dir="rtl">
        <div className="rounded-2xl border bg-white p-6 text-red-600">
          {error ?? "مشتری پیدا نشد."}
        </div>

        <Link
          href="/customers"
          className="inline-block mt-4 text-blue-600 hover:underline"
        >
          ← بازگشت به فهرست مشتریان
        </Link>
      </div>
    );
  }

  const cityName = getCityName(customer);

  const customerType = getCustomerTypeLabel(
    customer.customer_type
  );

  const phone: string | undefined =
    customer.phone ?? undefined;

  const whatsapp: string | undefined =
    customer.whatsapp_number ??
    customer.phone ??
    undefined;

  const customerCode =
    customer.code != null
      ? String(customer.code)
      : "—";

  return (
    <div
      className="max-w-5xl mx-auto p-6"
      dir="rtl"
    >
      {/* بازگشت */}
      <div className="mb-6">
        <Link
          href="/customers"
          className="text-blue-600 hover:underline"
        >
          ← بازگشت به فهرست مشتریان
        </Link>
      </div>

      {/* هدر مشتری */}
      <div className="rounded-2xl bg-white shadow-sm border p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h1 className="text-3xl font-bold">
                {customer.name}
              </h1>

              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  customer.is_active
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {customer.is_active
                  ? "فعال"
                  : "غیرفعال"}
              </span>

              {customer.is_vip && (
                <span className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-700">
                  VIP
                </span>
              )}
            </div>

            <div className="text-gray-500">
              {customerType}

              {cityName !== "—" &&
                ` • ${cityName}`}
            </div>
          </div>

          {/* دکمه‌ها */}
          <div className="flex flex-wrap gap-2">
            {phone && (
              <a
                href={`tel:${phone}`}
                className="rounded-xl bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
              >
                📞 تماس
              </a>
            )}

            {whatsapp && (
              <a
                href={`https://wa.me/${normalizeWhatsappNumber(
                  whatsapp
                )}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-green-600 text-white px-4 py-2 hover:bg-green-700"
              >
                واتساپ
              </a>
            )}

            <Link
              href={`/customers/${customer.id}/edit`}
              className="rounded-xl bg-gray-800 text-white px-4 py-2 hover:bg-gray-900"
            >
              ✏️ ویرایش
            </Link>
          </div>
        </div>
      </div>

      {/* آمار */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Stat
          title="تناژ کل"
          value={`${customer.lifetime_tonnage ?? 0} تن`}
        />

        <Stat
          title="میانگین ماهانه"
          value={`${customer.average_monthly_tonnage ?? 0} تن`}
        />

        <Stat
          title="تعداد سفارش"
          value={String(
            customer.total_order_count ?? 0
          )}
        />

        <Stat
          title="روزهای عدم فعالیت"
          value={String(
            customer.inactivity_days ?? 0
          )}
        />
      </div>

      {/* اطلاعات مشتری */}
      <div className="rounded-2xl bg-white shadow-sm border p-6 mb-6">
        <h2 className="text-xl font-semibold mb-6">
          اطلاعات مشتری
        </h2>

        <div className="grid gap-5 md:grid-cols-2">
          <Info
            label="نام مشتری"
            value={customer.name ?? "—"}
          />

          <Info
            label="شهر"
            value={cityName}
          />

          <Info
            label="نوع مشتری"
            value={customerType}
          />

          <Info
            label="شماره تماس"
            value={customer.phone ?? "—"}
          />

          <Info
            label="شماره واتساپ"
            value={
              customer.whatsapp_number ??
              customer.phone ??
              "—"
            }
          />

          <Info
            label="وضعیت VIP"
            value={
              customer.is_vip
                ? "بله"
                : "خیر"
            }
          />

          <Info
            label="وضعیت مشتری"
            value={
              customer.is_active
                ? "فعال"
                : "غیرفعال"
            }
          />

          <Info
            label="کد مشتری"
            value={customerCode}
          />
        </div>
      </div>

      {/* آخرین فعالیت‌ها */}
      <div className="rounded-2xl bg-white shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-6">
          آخرین فعالیت‌ها
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <Activity
            icon="📦"
            title="آخرین سفارش"
            value={formatDate(
              customer.last_order_at
            )}
          />

          <Activity
            icon="📞"
            title="آخرین تماس"
            value={formatDate(
              customer.last_call_at
            )}
          />

          <Activity
            icon="🔔"
            title="آخرین پیگیری"
            value={formatDate(
              customer.last_follow_up_at
            )}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white shadow-sm border p-5">
      <div className="text-sm text-gray-500 mb-2">
        {title}
      </div>

      <div className="text-2xl font-bold">
        {value}
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-sm text-gray-500 mb-1">
        {label}
      </div>

      <div className="font-medium">
        {value}
      </div>
    </div>
  );
}

function Activity({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-2xl mb-2">
        {icon}
      </div>

      <div className="text-sm text-gray-500">
        {title}
      </div>

      <div className="font-semibold mt-1">
        {value}
      </div>
    </div>
  );
}
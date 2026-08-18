import { customersService } from "@/src/lib/services/customers";
import Link from "next/link";

const customerTypeNames: Record<string, string> = {
  building_material_store: "مصالح‌فروشی",
  contractor: "پیمانکار",
  employer: "کارفرما",
  plaster_worker: "گچ‌کار",
};

function getCustomerType(type: string | null | undefined) {
  return customerTypeNames[type ?? ""] ?? "سایر";
}

function getCityName(customer: any) {
  return (
    customer.city?.name ??
    customer.city_name ??
    customer.metadata?.source_city ??
    "—"
  );
}

function formatNumber(value: unknown) {
  return Number(value ?? 0).toLocaleString("fa-IR", {
    maximumFractionDigits: 2,
  });
}

function InfoItem({
  label,
  value,
  direction,
}: {
  label: string;
  value?: unknown;
  direction?: "ltr";
}) {
  const text =
    value === null ||
    value === undefined ||
    String(value).trim() === ""
      ? "—"
      : String(value);

  return (
    <div>
      <div className="text-sm text-slate-500">
        {label}
      </div>

      <div
        dir={direction}
        className="mt-1 break-words font-medium text-slate-900"
      >
        {text}
      </div>
    </div>
  );
}

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let customer: any = null;

  try {
    customer = await customersService.getById(id);
  } catch (error) {
    console.error(
      "خطا در دریافت پروفایل مشتری:",
      error
    );
  }

  if (!customer) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-50 p-6"
      >
        <div className="mx-auto max-w-6xl">
          <Link
            href="/customers"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← بازگشت به مشتریان
          </Link>

          <div className="mt-6 rounded-2xl border bg-white p-10 text-center shadow-sm">
            <div className="text-4xl">👤</div>

            <h1 className="mt-4 text-xl font-bold text-slate-900">
              مشتری پیدا نشد
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              اطلاعات این مشتری در سیستم موجود نیست.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const city = getCityName(customer);

  const customerType = getCustomerType(
    customer.customer_type
  );

  const tonnage = Number(
    customer.lifetime_tonnage ?? 0
  );

  const monthlyTonnage = Number(
    customer.average_monthly_tonnage ?? 0
  );

  const orderCount = Number(
    customer.total_order_count ?? 0
  );

  const phone = customer.phone ?? null;

  const whatsapp =
    customer.whatsapp_number ?? phone;

  const metadata = customer.metadata ?? {};

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 p-4 md:p-6"
    >
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <Link
              href="/customers"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              ← بازگشت به لیست مشتریان
            </Link>

            <div className="mt-4 flex items-center gap-4">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-xl font-bold text-blue-700">
                {String(customer.name ?? "?")
                  .trim()
                  .charAt(0)}
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
                  {customer.name}
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  {city} • {customerType}
                </p>
              </div>

            </div>
          </div>

          <div className="flex items-center gap-2">

            {customer.is_vip && (
              <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
                VIP
              </span>
            )}

            {customer.is_active ? (
              <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                فعال
              </span>
            ) : (
              <span className="rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">
                غیرفعال
              </span>
            )}

          </div>
        </div>

        {/* Contact Actions */}
        {(phone || whatsapp) && (
          <div className="flex flex-wrap gap-3">

            {phone && (
              <a
                href={`tel:${phone}`}
                dir="ltr"
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                ☎ تماس با مشتری
              </a>
            )}

            {whatsapp && (
              <a
                href={`https://wa.me/${String(
                  whatsapp
                ).replace(/^0/, "98")}`}
                target="_blank"
                rel="noopener noreferrer"
                dir="ltr"
                className="rounded-xl bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700"
              >
                WhatsApp
              </a>
            )}

          </div>
        )}

        {/* Statistics */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <StatCard
            title="تناژ کل"
            value={`${formatNumber(tonnage)} تن`}
            description="مجموع خرید ثبت‌شده"
            valueClass="text-blue-600"
          />

          <StatCard
            title="میانگین ماهانه"
            value={`${formatNumber(
              monthlyTonnage
            )} تن`}
            description="میانگین خرید ماهانه"
            valueClass="text-green-600"
          />

          <StatCard
            title="تعداد سفارش"
            value={formatNumber(orderCount)}
            description="تعداد سفارش‌های ثبت‌شده"
            valueClass="text-orange-500"
          />

          <StatCard
            title="وضعیت مشتری"
            value={customer.is_active ? "فعال" : "غیرفعال"}
            description={
              customer.is_vip
                ? "مشتری VIP"
                : "مشتری عادی"
            }
            valueClass={
              customer.is_active
                ? "text-green-600"
                : "text-red-600"
            }
          />

        </div>

        {/* Basic Information */}
        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">

          <div className="border-b px-5 py-4">
            <h2 className="font-bold text-slate-900">
              اطلاعات مشتری
            </h2>
          </div>

          <div className="grid gap-6 p-5 sm:grid-cols-2 xl:grid-cols-3">

            <InfoItem
              label="نام مشتری"
              value={customer.name}
            />

            <InfoItem
              label="شرکت"
              value={metadata.company}
            />

            <InfoItem
              label="شهر"
              value={city}
            />

            <InfoItem
              label="نوع مشتری"
              value={customerType}
            />

            <InfoItem
              label="شماره تماس"
              value={phone}
              direction="ltr"
            />

            <InfoItem
              label="شماره واتساپ"
              value={customer.whatsapp_number}
              direction="ltr"
            />

          </div>
        </section>

        {/* Follow Up */}
        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">

          <div className="border-b px-5 py-4">
            <h2 className="font-bold text-slate-900">
              پیگیری فروش
            </h2>
          </div>

          <div className="grid gap-6 p-5 sm:grid-cols-2 xl:grid-cols-3">

            <InfoItem
              label="آخرین تماس"
              value={metadata.last_contact}
            />

            <InfoItem
              label="اقدام بعدی"
              value={metadata.next_action}
            />

            <InfoItem
              label="تماس بعدی"
              value={metadata.next_contact}
            />

            <InfoItem
              label="وضعیت سرنخ"
              value={metadata.lead_status}
            />

            <InfoItem
              label="منبع سرنخ"
              value={metadata.lead_source}
            />

            <InfoItem
              label="یادداشت"
              value={metadata.notes}
            />

          </div>
        </section>

        {/* Sales Information */}
        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">

          <div className="border-b px-5 py-4">
            <h2 className="font-bold text-slate-900">
              اطلاعات فروش
            </h2>
          </div>

          <div className="grid gap-6 p-5 sm:grid-cols-2 xl:grid-cols-3">

            <InfoItem
              label="تناژ کل خرید"
              value={`${formatNumber(
                customer.lifetime_tonnage
              )} تن`}
            />

            <InfoItem
              label="میانگین تناژ ماهانه"
              value={`${formatNumber(
                customer.average_monthly_tonnage
              )} تن`}
            />

            <InfoItem
              label="تعداد سفارش"
              value={formatNumber(
                customer.total_order_count
              )}
            />

            <InfoItem
              label="روزهای عدم فعالیت"
              value={formatNumber(
                customer.inactivity_days
              )}
            />

            <InfoItem
              label="برآورد فروش"
              value={metadata.estimated_sales}
            />

            <InfoItem
              label="وضعیت مشتری"
              value={
                customer.is_active
                  ? "فعال"
                  : "غیرفعال"
              }
            />

          </div>
        </section>

      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  description,
  valueClass,
}: {
  title: string;
  value: string;
  description: string;
  valueClass: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">

      <div className="text-sm text-slate-500">
        {title}
      </div>

      <div
        className={`mt-3 text-2xl font-bold ${valueClass}`}
      >
        {value}
      </div>

      <div className="mt-2 text-xs text-slate-400">
        {description}
      </div>

    </div>
  );
}
"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { customersService } from "@/src/lib/services/customers";
import { useCities } from "@/src/lib/hooks/useCities";

const customerTypes = [
  {
    value: "building_material_store",
    label: "مصالح‌فروشی",
  },
  {
    value: "contractor",
    label: "پیمانکار",
  },
  {
    value: "employer",
    label: "کارفرما",
  },
  {
    value: "plaster_worker",
    label: "گچکار",
  },
];

interface FormData {
  name: string;
  phone: string;
  whatsapp_number: string;
  customer_type: string;
  city_id: string;
  is_vip: boolean;
  is_active: boolean;
}

function InputField({
  label,
  required = false,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
        {required && (
          <span className="mr-1 text-red-500">*</span>
        )}
      </label>

      {children}

      {hint && (
        <p className="mt-2 text-xs text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-600">
        {icon}
      </div>

      <div>
        <h2 className="text-lg font-black text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function ToggleCard({
  checked,
  onChange,
  title,
  description,
  icon,
  activeClass,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
  icon: string;
  activeClass: string;
}) {
  return (
    <label
      className={`group flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-5 transition ${
        checked
          ? `${activeClass} shadow-sm`
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl transition ${
            checked
              ? "bg-white shadow-sm"
              : "bg-slate-100"
          }`}
        >
          {icon}
        </div>

        <div>
          <div className="font-black text-slate-900">
            {title}
          </div>

          <div className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </div>
        </div>
      </div>

      <div className="relative shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) =>
            onChange(event.target.checked)
          }
          className="peer sr-only"
        />

        <div
          className={`h-7 w-12 rounded-full transition ${
            checked
              ? "bg-blue-600"
              : "bg-slate-200"
          }`}
        />

        <div
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            checked
              ? "right-1"
              : "right-6"
          }`}
        />
      </div>
    </label>
  );
}

export default function NewCustomerPage() {
  const router = useRouter();

  const {
    data: cities,
    loading: citiesLoading,
    error: citiesError,
  } = useCities();

  const [form, setForm] = useState<FormData>({
    name: "",
    phone: "",
    whatsapp_number: "",
    customer_type: "",
    city_id: "",
    is_vip: false,
    is_active: true,
  });

  const [saving, setSaving] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  function updateField<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setError(null);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);

    const name = form.name.trim();
    const phone = form.phone.trim();
    const whatsapp =
      form.whatsapp_number.trim();

    if (!name) {
      setError("نام مشتری الزامی است.");
      return;
    }

    if (!form.customer_type) {
      setError("نوع مشتری را انتخاب کنید.");
      return;
    }

    if (!form.city_id) {
      setError("شهر مشتری را انتخاب کنید.");
      return;
    }

    try {
      setSaving(true);

      const customer =
        await customersService.create({
          name,
          phone: phone || undefined,
          whatsapp_number:
            whatsapp || undefined,
          customer_type:
            form.customer_type,
          city_id: form.city_id,
          is_vip: form.is_vip,
          is_active: form.is_active,
        });

      router.push(
        `/customers/${customer.id}`
      );
    } catch (err) {
      console.error(
        "خطا در ایجاد مشتری:",
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : "ایجاد مشتری انجام نشد.";

      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 px-4 py-6 md:px-6 md:py-8"
    >
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-6">
          <Link
            href="/customers"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-blue-600"
          >
            <span>←</span>
            بازگشت به فهرست مشتریان
          </Link>
        </div>

        <section className="relative mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400" />

          <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-blue-100/50 blur-3xl" />

          <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-cyan-100/40 blur-3xl" />

          <div className="relative p-6 md:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-2xl text-white shadow-lg shadow-blue-100">
                  👤
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                      افزودن مشتری
                    </h1>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                      CRM
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-500 md:text-base">
                    اطلاعات مشتری جدید را ثبت کنید تا در CRM قابل مدیریت و پیگیری باشد.
                  </p>
                </div>
              </div>

              <div className="hidden rounded-2xl bg-slate-50 px-4 py-3 sm:block">
                <p className="text-xs font-medium text-slate-400">
                  وضعیت ثبت
                </p>

                <p className="mt-1 text-sm font-black text-slate-700">
                  آماده ثبت اطلاعات
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Errors */}
        {(error || citiesError) && (
          <div className="mb-6 space-y-3">
            {error && (
              <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
                <div className="h-1 bg-red-500" />

                <div className="flex items-start gap-3 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 font-black text-red-600">
                    !
                  </div>

                  <div>
                    <p className="font-black text-red-800">
                      ثبت مشتری انجام نشد
                    </p>

                    <p className="mt-1 text-sm leading-6 text-red-600">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {citiesError && (
              <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
                <div className="h-1 bg-amber-500" />

                <div className="flex items-start gap-3 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    !
                  </div>

                  <div>
                    <p className="font-black text-amber-800">
                      خطا در دریافت شهرها
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-600">
                      {citiesError}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* Main Info */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              icon="📋"
              title="اطلاعات اصلی"
              description="مشخصات پایه مشتری را وارد کنید."
            />

            <div className="grid gap-5 md:grid-cols-3">

              <InputField
                label="نام مشتری"
                required
                hint="نام شخص، فروشگاه یا مجموعه"
              >
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    updateField(
                      "name",
                      event.target.value
                    )
                  }
                  placeholder="مثلاً فروشگاه آذرنیا"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  autoFocus
                />
              </InputField>

              <InputField
                label="نوع مشتری"
                required
              >
                <select
                  value={
                    form.customer_type
                  }
                  onChange={(event) =>
                    updateField(
                      "customer_type",
                      event.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">
                    انتخاب نوع مشتری
                  </option>

                  {customerTypes.map(
                    (item) => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </option>
                    )
                  )}
                </select>
              </InputField>

              <InputField
                label="شهر"
                required
              >
                <select
                  value={form.city_id}
                  onChange={(event) =>
                    updateField(
                      "city_id",
                      event.target.value
                    )
                  }
                  disabled={
                    citiesLoading
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    {citiesLoading
                      ? "در حال دریافت شهرها..."
                      : "انتخاب شهر"}
                  </option>

                  {cities.map(
                    (city) => (
                      <option
                        key={city.id}
                        value={city.id}
                      >
                        {city.name_fa}
                      </option>
                    )
                  )}
                </select>
              </InputField>

            </div>
          </section>

          {/* Contact */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              icon="📞"
              title="اطلاعات تماس"
              description="شماره تماس و واتساپ مشتری را ثبت کنید."
            />

            <div className="grid gap-5 md:grid-cols-2">

              <InputField
                label="شماره تماس"
                hint="شماره اصلی مشتری"
              >
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    updateField(
                      "phone",
                      event.target.value
                    )
                  }
                  placeholder="0912..."
                  dir="ltr"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </InputField>

              <InputField
                label="شماره واتساپ"
                hint="در صورت متفاوت بودن با شماره تماس"
              >
                <input
                  type="tel"
                  value={
                    form.whatsapp_number
                  }
                  onChange={(event) =>
                    updateField(
                      "whatsapp_number",
                      event.target.value
                    )
                  }
                  placeholder="0912..."
                  dir="ltr"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </InputField>

            </div>
          </section>

          {/* Status */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              icon="⚙️"
              title="وضعیت مشتری"
              description="سطح اهمیت و وضعیت فعال بودن مشتری را تعیین کنید."
            />

            <div className="grid gap-4 md:grid-cols-2">

              <ToggleCard
                checked={form.is_vip}
                onChange={(checked) =>
                  updateField(
                    "is_vip",
                    checked
                  )
                }
                title="مشتری VIP"
                description="این مشتری در دسته مشتریان مهم قرار گیرد."
                icon="⭐"
                activeClass="border-amber-200 bg-amber-50"
              />

              <ToggleCard
                checked={form.is_active}
                onChange={(checked) =>
                  updateField(
                    "is_active",
                    checked
                  )
                }
                title="مشتری فعال"
                description="مشتری در فهرست مشتریان فعال قرار گیرد."
                icon="🟢"
                activeClass="border-emerald-200 bg-emerald-50"
              />

            </div>
          </section>

          {/* Preview */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 shadow-sm">
            <div className="p-6 md:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-400">
                    پیش‌نمایش
                  </p>

                  <h2 className="mt-1 text-xl font-black text-white">
                    کارت مشتری
                  </h2>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-xl text-white">
                  👤
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-xs text-slate-400">
                    نام
                  </p>

                  <p className="mt-2 truncate font-bold text-white">
                    {form.name ||
                      "هنوز وارد نشده"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-xs text-slate-400">
                    نوع مشتری
                  </p>

                  <p className="mt-2 font-bold text-white">
                    {customerTypes.find(
                      (item) =>
                        item.value ===
                        form.customer_type
                    )?.label ??
                      "انتخاب نشده"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-xs text-slate-400">
                    وضعیت
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {form.is_active && (
                      <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                        فعال
                      </span>
                    )}

                    {!form.is_active && (
                      <span className="rounded-full bg-slate-500/20 px-3 py-1 text-xs font-bold text-slate-300">
                        غیرفعال
                      </span>
                    )}

                    {form.is_vip && (
                      <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300">
                        VIP
                      </span>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="sticky bottom-4 z-20">
            <div className="flex flex-col-reverse gap-3 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-200/50 backdrop-blur sm:flex-row sm:justify-end">

              <Link
                href="/customers"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                انصراف
              </Link>

              <button
                type="submit"
                disabled={
                  saving ||
                  citiesLoading
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    در حال ذخیره...
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    ذخیره مشتری
                  </>
                )}
              </button>

            </div>
          </div>

        </form>
      </div>
    </main>
  );
}
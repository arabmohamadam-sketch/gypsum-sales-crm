"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { customersService } from "@/src/lib/services/customers";
import type { Customer } from "@/src/lib/types/customer";

interface CustomerEditPageProps {
  customerId: string;
}

interface FormData {
  name: string;
  phone: string;
  whatsapp_number: string;
  customer_type: string;
  city_id: string;
  is_vip: boolean;
  is_active: boolean;
  code: string;
}

interface City {
  id: string;
  name: string;
  code?: string | null;
}

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
    value: "plasterer",
    label: "گچ‌کار",
  },
];

const CITY_NAMES: Record<string, string> = {
  Garmsar: "گرمسار",
  Semnan: "سمنان",
  Varamin: "ورامین",
  garmsar: "گرمسار",
  semnan: "سمنان",
  varamin: "ورامین",
};

function getCityName(city?: City | null): string {
  if (!city?.name) {
    return "";
  }

  return CITY_NAMES[city.name] ?? city.name;
}

function normalizeOptionalString(
  value: string
): string | undefined {
  const trimmed = value.trim();

  return trimmed ? trimmed : undefined;
}

export default function CustomerEditPage({
  customerId,
}: CustomerEditPageProps) {
  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [cities, setCities] = useState<City[]>([]);

  const [form, setForm] = useState<FormData>({
    name: "",
    phone: "",
    whatsapp_number: "",
    customer_type: "",
    city_id: "",
    is_vip: false,
    is_active: true,
    code: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCustomer() {
      if (!customerId) {
        if (mounted) {
          setError("شناسه مشتری مشخص نیست.");
          setLoading(false);
        }

        return;
      }

      try {
        setLoading(true);
        setError(null);

        const data =
          await customersService.getById(customerId);

        if (!mounted) {
          return;
        }

        setCustomer(data);

        const customerWithCity =
          data as Customer & {
            city?: City | null;
          };

        const currentCity =
          customerWithCity.city ?? null;

        setForm({
          name: data.name ?? "",
          phone: data.phone ?? "",
          whatsapp_number:
            data.whatsapp_number ?? "",
          customer_type:
            data.customer_type ?? "",
          city_id: data.city_id ?? "",
          is_vip: Boolean(data.is_vip),
          is_active: Boolean(data.is_active),
          code:
            data.code !== null &&
            data.code !== undefined
              ? String(data.code)
              : "",
        });

        if (currentCity) {
          setCities([currentCity]);
        } else {
          setCities([]);
        }
      } catch (err) {
        console.error(
          "خطا در دریافت مشتری:",
          err
        );

        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "اطلاعات مشتری دریافت نشد."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadCustomer();

    return () => {
      mounted = false;
    };
  }, [customerId]);

  function updateField<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    const name = form.name.trim();

    if (!name) {
      setError("نام مشتری الزامی است.");
      return;
    }

    if (!form.customer_type) {
      setError("نوع مشتری را انتخاب کنید.");
      return;
    }

    try {
      setSaving(true);

      /*
       * مهم:
       * code عمداً اینجا ارسال نمی‌شود.
       * customersService.update فعلاً code را
       * در پارامترهای قابل ویرایش ندارد.
       */
      await customersService.update(customerId, {
        name,
        phone: normalizeOptionalString(form.phone),
        whatsapp_number: normalizeOptionalString(
          form.whatsapp_number
        ),
        customer_type: form.customer_type,
        is_vip: form.is_vip,
        is_active: form.is_active,
        city_id:
          normalizeOptionalString(form.city_id),
      });

      setSuccess(
        "اطلاعات مشتری با موفقیت ذخیره شد."
      );

      const updated =
        await customersService.getById(customerId);

      setCustomer(updated);

      const updatedWithCity =
        updated as Customer & {
          city?: City | null;
        };

      const updatedCity =
        updatedWithCity.city ?? null;

      setForm({
        name: updated.name ?? "",
        phone: updated.phone ?? "",
        whatsapp_number:
          updated.whatsapp_number ?? "",
        customer_type:
          updated.customer_type ?? "",
        city_id: updated.city_id ?? "",
        is_vip: Boolean(updated.is_vip),
        is_active: Boolean(updated.is_active),
        code:
          updated.code !== null &&
          updated.code !== undefined
            ? String(updated.code)
            : "",
      });

      if (updatedCity) {
        setCities([updatedCity]);
      } else {
        setCities([]);
      }
    } catch (err) {
      console.error(
        "خطا در ذخیره مشتری:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "ذخیره اطلاعات مشتری انجام نشد."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div
        className="max-w-5xl mx-auto p-6"
        dir="rtl"
      >
        <div className="rounded-2xl border bg-white p-8 text-center">
          <div className="text-gray-500">
            در حال دریافت اطلاعات مشتری...
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div
        className="max-w-5xl mx-auto p-6"
        dir="rtl"
      >
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-red-600 mb-4">
            {error ?? "مشتری پیدا نشد."}
          </div>

          <Link
            href="/customers"
            className="text-blue-600 hover:underline"
          >
            ← بازگشت به فهرست مشتریان
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="max-w-5xl mx-auto p-6"
      dir="rtl"
    >
      <div className="mb-6">
        <Link
          href={`/customers/${customerId}`}
          className="text-blue-600 hover:underline"
        >
          ← بازگشت به پروفایل مشتری
        </Link>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            ویرایش مشتری
          </h1>

          <p className="text-gray-500 mt-2">
            اطلاعات مشتری را ویرایش کنید.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-8"
        >
          <section>
            <h2 className="text-lg font-semibold mb-4">
              اطلاعات اصلی
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                label="نام مشتری"
                required
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
                  className="input-field"
                  autoComplete="name"
                />
              </FormField>

              <FormField label="کد مشتری">
                <input
                  type="text"
                  value={form.code}
                  readOnly
                  disabled
                  className="input-field bg-gray-50 text-gray-500 cursor-not-allowed"
                  dir="ltr"
                />

                <p className="text-xs text-gray-400 mt-2">
                  کد مشتری فعلاً فقط قابل مشاهده است.
                </p>
              </FormField>

              <FormField label="نوع مشتری">
                <select
                  value={form.customer_type}
                  onChange={(event) =>
                    updateField(
                      "customer_type",
                      event.target.value
                    )
                  }
                  className="input-field"
                >
                  <option value="">
                    انتخاب نوع مشتری
                  </option>

                  {customerTypes.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="شهر">
                <select
                  value={form.city_id}
                  onChange={(event) =>
                    updateField(
                      "city_id",
                      event.target.value
                    )
                  }
                  className="input-field"
                >
                  <option value="">
                    انتخاب شهر
                  </option>

                  {cities.map((city) => (
                    <option
                      key={city.id}
                      value={city.id}
                    >
                      {getCityName(city)}
                    </option>
                  ))}
                </select>

                {cities.length === 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    شهر فعلی مشتری قابل دریافت نیست.
                  </p>
                )}
              </FormField>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">
              اطلاعات تماس
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="شماره تماس">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    updateField(
                      "phone",
                      event.target.value
                    )
                  }
                  className="input-field"
                  dir="ltr"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </FormField>

              <FormField label="شماره واتساپ">
                <input
                  type="tel"
                  value={form.whatsapp_number}
                  onChange={(event) =>
                    updateField(
                      "whatsapp_number",
                      event.target.value
                    )
                  }
                  className="input-field"
                  dir="ltr"
                  inputMode="tel"
                />
              </FormField>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">
              وضعیت مشتری
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-xl border p-4 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={form.is_vip}
                  onChange={(event) =>
                    updateField(
                      "is_vip",
                      event.target.checked
                    )
                  }
                  className="h-5 w-5"
                />

                <div>
                  <div className="font-medium">
                    مشتری VIP
                  </div>

                  <div className="text-sm text-gray-500">
                    مشتری به عنوان VIP ثبت شود.
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-xl border p-4 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    updateField(
                      "is_active",
                      event.target.checked
                    )
                  }
                  className="h-5 w-5"
                />

                <div>
                  <div className="font-medium">
                    مشتری فعال
                  </div>

                  <div className="text-sm text-gray-500">
                    وضعیت فعالیت مشتری.
                  </div>
                </div>
              </label>
            </div>
          </section>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t">
            <Link
              href={`/customers/${customerId}`}
              className="rounded-xl border px-6 py-3 text-center hover:bg-gray-50"
            >
              انصراف
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 text-white px-6 py-3 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? "در حال ذخیره..."
                : "ذخیره تغییرات"}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .input-field {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          outline: none;
          background: white;
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
        }

        .input-field:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px
            rgba(37, 99, 235, 0.1);
        }

        .input-field:disabled {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}

        {required && (
          <span className="text-red-500 mr-1">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}
"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { customersService } from "@/src/lib/services/customers";

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

interface FormData {
  name: string;
  phone: string;
  whatsapp_number: string;
  customer_type: string;
  is_vip: boolean;
  is_active: boolean;
}

export default function NewCustomerPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormData>({
    name: "",
    phone: "",
    whatsapp_number: "",
    customer_type: "",
    is_vip: false,
    is_active: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const whatsapp = form.whatsapp_number.trim();

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

      const customer = await customersService.create({
        name: name,
        phone: phone || undefined,
        whatsapp_number: whatsapp || undefined,
        customer_type: form.customer_type,
        is_vip: form.is_vip,
        is_active: form.is_active,
      });

      router.push("/customers/" + customer.id);
    } catch (err) {
      console.error("خطا در ایجاد مشتری:", err);

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
    <div
      className="max-w-5xl mx-auto p-6"
      dir="rtl"
    >
      <div className="mb-6">
        <Link
          href="/customers"
          className="text-blue-600 hover:underline"
        >
          ← بازگشت به فهرست مشتریان
        </Link>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            افزودن مشتری
          </h1>

          <p className="text-gray-500 mt-2">
            اطلاعات مشتری جدید را وارد کنید.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
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
                  placeholder="نام مشتری"
                  className="input-field"
                  autoFocus
                />
              </FormField>

              <FormField
                label="نوع مشتری"
                required
              >
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
                  placeholder="0912..."
                  className="input-field"
                  dir="ltr"
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
                  placeholder="0912..."
                  className="input-field"
                  dir="ltr"
                />
              </FormField>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">
              وضعیت مشتری
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-xl border p-4 cursor-pointer">
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

              <label className="flex items-center gap-3 rounded-xl border p-4 cursor-pointer">
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
              href="/customers"
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
                : "ذخیره مشتری"}
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
        }

        .input-field:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
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
  children: ReactNode;
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
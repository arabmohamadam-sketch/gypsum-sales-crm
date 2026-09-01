"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import Link from "next/link";
import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  ArrowLeft,
  CheckCircle2,
  Phone,
  Save,
  Star,
  UserRound,
} from "lucide-react";

import {
  customersService,
} from "@/src/lib/services/customers";

import {
  useCities,
} from "@/src/lib/hooks/useCities";

import type {
  Customer,
} from "@/src/lib/types/customer";

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
    label: "گچ‌کار",
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
          <span className="mr-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children}

      {hint && (
        <p className="mt-2 text-xs leading-5 text-slate-400">
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
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
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
  activeIconClass,
}: {
  checked: boolean;
  onChange: (
    checked: boolean
  ) => void;
  title: string;
  description: string;
  icon: ReactNode;
  activeClass: string;
  activeIconClass: string;
}) {
  return (
    <label
      className={`group flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-5 transition-all ${
        checked
          ? `${activeClass} shadow-sm`
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition ${
            checked
              ? `bg-white ${activeIconClass}`
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {icon}
        </div>

        <div className="min-w-0">
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
            onChange(
              event.target.checked
            )
          }
          className="sr-only"
        />

        <div
          className={`h-7 w-12 rounded-full transition ${
            checked
              ? "bg-blue-600"
              : "bg-slate-200"
          }`}
        />

        <div
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
            checked
              ? "right-1"
              : "right-6"
          }`}
        />
      </div>
    </label>
  );
}

function LoadingState() {
  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 px-4 py-6 md:px-6 md:py-8"
    >
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="h-1.5 animate-pulse bg-slate-200" />

          <div className="p-6 md:p-8">

            <div className="flex items-center gap-4">

              <div className="h-16 w-16 animate-pulse rounded-2xl bg-slate-200" />

              <div className="flex-1">
                <div className="h-7 w-52 animate-pulse rounded-lg bg-slate-200" />

                <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-slate-100" />
              </div>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">

              {Array.from({
                length: 6,
              }).map(
                (_, index) => (
                  <div key={index}>
                    <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />

                    <div className="mt-2 h-12 animate-pulse rounded-2xl bg-slate-100" />
                  </div>
                )
              )}

            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();

  const customerId =
    typeof params.id === "string"
      ? params.id
      : "";

  const {
    data: cities,
    regions,
    loading: citiesLoading,
    error: citiesError,
    createCity,
  } = useCities();

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<FormData>({
      name: "",
      phone: "",
      whatsapp_number: "",
      customer_type: "",
      city_id: "",
      is_vip: false,
      is_active: true,
    });

  const [showNewCity, setShowNewCity] =
    useState(false);

  const [newCityName, setNewCityName] =
    useState("");

  const [newCityCode, setNewCityCode] =
    useState("");

  const [newCityRegionId, setNewCityRegionId] =
    useState("");

  const [creatingCity, setCreatingCity] =
    useState(false);

  const [cityCreateError, setCityCreateError] =
    useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCustomer() {
      if (!customerId) {
        setError(
          "شناسه مشتری معتبر نیست."
        );

        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const data =
          await customersService.getById(
            customerId
          );

        if (!mounted) {
          return;
        }

        setCustomer(data);

        setForm({
          name:
            data.name ?? "",
          phone:
            data.phone ?? "",
          whatsapp_number:
            data.whatsapp_number ??
            "",
          customer_type:
            data.customer_type ??
            "",
          city_id:
            data.city_id ?? "",
          is_vip:
            data.is_vip ?? false,
          is_active:
            data.is_active ?? true,
        });
      } catch (err) {
        if (!mounted) {
          return;
        }

        console.error(
          "خطا در دریافت اطلاعات مشتری:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "خطا در دریافت اطلاعات مشتری."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadCustomer();

    return () => {
      mounted = false;
    };
  }, [customerId]);

  function updateField<
    K extends keyof FormData
  >(
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

  async function handleCreateCity() {
    const name =
      newCityName.trim();

    const regionId =
      newCityRegionId.trim();

    if (!name) {
      setCityCreateError(
        "نام شهر را وارد کنید."
      );
      return;
    }

    if (!regionId) {
      setCityCreateError(
        "منطقه شهر را انتخاب کنید."
      );
      return;
    }

    try {
      setCreatingCity(true);
      setCityCreateError(null);

      const city =
        await createCity({
          name,
          code:
            newCityCode.trim() ||
            null,
          region_id:
            regionId,
        });

      updateField(
        "city_id",
        city.id
      );

      setNewCityName("");
      setNewCityCode("");
      setNewCityRegionId("");
      setShowNewCity(false);
    } catch (err) {
      console.error(
        "CREATE CITY ERROR:",
        err
      );

      setCityCreateError(
        err instanceof Error
          ? err.message
          : "خطا در ایجاد شهر."
      );
    } finally {
      setCreatingCity(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!customer) {
      return;
    }

    setError(null);
    setSuccess(null);

    const name =
      form.name.trim();

    const phone =
      form.phone.trim();

    const whatsapp =
      form.whatsapp_number.trim();

    if (!name) {
      setError(
        "نام مشتری الزامی است."
      );
      return;
    }

    if (!form.customer_type) {
      setError(
        "نوع مشتری را انتخاب کنید."
      );
      return;
    }

    if (!form.city_id) {
      setError(
        "شهر مشتری را انتخاب کنید."
      );
      return;
    }

    try {
      setSaving(true);

      await customersService.update(
        customer.id,
        {
          name,
          phone:
            phone || null,
          whatsapp_number:
            whatsapp || null,
          customer_type:
            form.customer_type,
          city_id:
            form.city_id,
          is_vip:
            form.is_vip,
          is_active:
            form.is_active,
        }
      );

      setSuccess(
        "اطلاعات مشتری با موفقیت ذخیره شد."
      );

      window.setTimeout(() => {
        router.push(
          `/customers/${customer.id}`
        );

        router.refresh();
      }, 700);
    } catch (err) {
      console.error(
        "خطا در بروزرسانی مشتری:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "بروزرسانی مشتری انجام نشد."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState />;
  }

  if (!customer) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-50 px-4 py-6 md:px-6 md:py-8"
      >
        <div className="mx-auto max-w-5xl">

          <section className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm">

            <div className="h-1.5 bg-red-500" />

            <div className="p-7">

              <div className="flex items-start gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-xl font-black text-red-600">
                  !
                </div>

                <div>
                  <h1 className="text-xl font-black text-red-800">
                    مشتری پیدا نشد
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-red-600">
                    {error ??
                      "اطلاعات مشتری موردنظر موجود نیست."}
                  </p>
                </div>

              </div>

              <Link
                href="/customers"
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
              >
                <ArrowLeft size={16} />
                بازگشت به مشتریان
              </Link>

            </div>
          </section>

        </div>
      </main>
    );
  }

  const selectedType =
    customerTypes.find(
      (item) =>
        item.value ===
        form.customer_type
    )?.label ??
    "انتخاب نشده";

  const selectedCity =
    cities.find(
      (city) =>
        city.id ===
        form.city_id
    )?.name_fa ??
    cities.find(
      (city) =>
        city.id ===
        form.city_id
    )?.name ??
    "انتخاب نشده";

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 px-4 py-6 md:px-6 md:py-8"
    >
      <div className="mx-auto max-w-5xl">

        <div className="mb-6">
          <Link
            href={`/customers/${customer.id}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-blue-600"
          >
            <ArrowLeft size={16} />
            بازگشت به مشتری
          </Link>
        </div>

        <section className="relative mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400" />

          <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-blue-100/50 blur-3xl" />

          <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-cyan-100/40 blur-3xl" />

          <div className="relative p-6 md:p-8">

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex min-w-0 items-start gap-4">

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-100">
                  <UserRound size={28} />
                </div>

                <div className="min-w-0">

                  <div className="flex flex-wrap items-center gap-2">

                    <h1 className="truncate text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                      ویرایش مشتری
                    </h1>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                      CRM
                    </span>

                    {customer.is_vip && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-200">
                        <Star size={12} />
                        VIP
                      </span>
                    )}

                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-500 md:text-base">
                    اطلاعات مشتری را بررسی و بروزرسانی کنید.
                  </p>

                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">

                <p className="text-xs font-medium text-slate-400">
                  مشتری فعلی
                </p>

                <p className="mt-1 max-w-[220px] truncate text-sm font-black text-slate-800">
                  {customer.name}
                </p>

              </div>

            </div>

          </div>

        </section>

        {(error ||
          success ||
          citiesError) && (
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
                      ذخیره تغییرات انجام نشد
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
                    <CheckCircle2 size={20} />
                  </div>

                  <div>
                    <p className="font-black text-emerald-800">
                      تغییرات ذخیره شد
                    </p>

                    <p className="mt-1 text-sm text-emerald-600">
                      {success}
                    </p>
                  </div>

                </div>
              </div>
            )}

            {citiesError && (
              <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">

                <div className="h-1 bg-amber-500" />

                <div className="flex items-start gap-3 p-5">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 font-black text-amber-600">
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

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">

            <SectionHeader
              icon={<UserRound size={20} />}
              title="اطلاعات اصلی"
              description="مشخصات پایه مشتری را بروزرسانی کنید."
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
                <div className="space-y-3">

                  <select
                    value={
                      form.city_id
                    }
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
                          {city.name_fa ??
                            city.name}
                        </option>
                      )
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCity(
                        (current) =>
                          !current
                      );

                      setCityCreateError(
                        null
                      );
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                  >
                    <span className="text-base">
                      +
                    </span>

                    افزودن شهر جدید
                  </button>

                  {showNewCity && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">

                      <p className="text-sm font-black text-blue-900">
                        افزودن شهر جدید
                      </p>

                      <div className="mt-3 space-y-3">

                        <input
                          type="text"
                          value={
                            newCityName
                          }
                          onChange={(
                            event
                          ) =>
                            setNewCityName(
                              event.target.value
                            )
                          }
                          placeholder="نام شهر، مثلاً قم"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                        />

                        <select
                          value={
                            newCityRegionId
                          }
                          onChange={(
                            event
                          ) =>
                            setNewCityRegionId(
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                        >
                          <option value="">
                            انتخاب منطقه
                          </option>

                          {regions.map(
                            (region) => (
                              <option
                                key={
                                  region.id
                                }
                                value={
                                  region.id
                                }
                              >
                                {region.name ===
                                "Region 1"
                                  ? "منطقه ۱"
                                  : region.name ===
                                      "Region 2"
                                    ? "منطقه ۲"
                                    : region.name}
                              </option>
                            )
                          )}
                        </select>

                        <input
                          type="text"
                          value={
                            newCityCode
                          }
                          onChange={(
                            event
                          ) =>
                            setNewCityCode(
                              event.target.value
                            )
                          }
                          placeholder="کد شهر — اختیاری"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                        />

                        {cityCreateError && (
                          <p className="text-xs font-bold text-red-600">
                            {cityCreateError}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            void handleCreateCity()
                          }
                          disabled={
                            creatingCity ||
                            regions.length ===
                              0
                          }
                          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-xs font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {creatingCity
                            ? "در حال ثبت شهر..."
                            : "ثبت شهر و انتخاب"}
                        </button>

                      </div>
                    </div>
                  )}

                </div>
              </InputField>

            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">

            <SectionHeader
              icon={<Phone size={20} />}
              title="اطلاعات تماس"
              description="شماره‌های تماس مشتری را بروزرسانی کنید."
            />

            <div className="grid gap-5 md:grid-cols-2">

              <InputField
                label="شماره تماس"
                hint="شماره اصلی مشتری"
              >
                <div className="relative">

                  <Phone
                    size={17}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

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
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-4 pr-11 text-left text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />

                </div>
              </InputField>

              <InputField
                label="شماره واتساپ"
                hint="در صورت متفاوت بودن با شماره تماس"
              >
                <div className="relative">

                  <Phone
                    size={17}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

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
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-4 pr-11 text-left text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />

                </div>
              </InputField>

            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">

            <SectionHeader
              icon={<Star size={20} />}
              title="وضعیت مشتری"
              description="اهمیت و فعال بودن مشتری را تنظیم کنید."
            />

            <div className="grid gap-4 md:grid-cols-2">

              <ToggleCard
                checked={
                  form.is_vip
                }
                onChange={(checked) =>
                  updateField(
                    "is_vip",
                    checked
                  )
                }
                title="مشتری VIP"
                description="این مشتری در گروه مشتریان مهم قرار گیرد."
                icon={
                  <Star size={21} />
                }
                activeClass="border-amber-200 bg-amber-50"
                activeIconClass="text-amber-500"
              />

              <ToggleCard
                checked={
                  form.is_active
                }
                onChange={(checked) =>
                  updateField(
                    "is_active",
                    checked
                  )
                }
                title="مشتری فعال"
                description="مشتری در فهرست مشتریان فعال قرار گیرد."
                icon={
                  <CheckCircle2
                    size={21}
                  />
                }
                activeClass="border-emerald-200 bg-emerald-50"
                activeIconClass="text-emerald-600"
              />

            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 shadow-sm">

            <div className="relative p-6 md:p-7">

              <div className="absolute -left-16 -top-20 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

              <div className="absolute -bottom-20 right-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />

              <div className="relative flex items-center justify-between gap-4">

                <div>
                  <p className="text-xs font-bold text-slate-400">
                    پیش‌نمایش اطلاعات جدید
                  </p>

                  <h2 className="mt-1 text-xl font-black text-white">
                    کارت مشتری
                  </h2>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <UserRound size={20} />
                </div>
              </div>

              <div className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                <PreviewItem
                  label="نام مشتری"
                  value={
                    form.name ||
                    "وارد نشده"
                  }
                />

                <PreviewItem
                  label="نوع مشتری"
                  value={
                    selectedType
                  }
                />

                <PreviewItem
                  label="شهر"
                  value={
                    selectedCity
                  }
                />

                <div className="rounded-2xl bg-white/5 p-4">

                  <p className="text-xs text-slate-400">
                    وضعیت
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        form.is_active
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-slate-500/20 text-slate-300"
                      }`}
                    >
                      {form.is_active
                        ? "فعال"
                        : "غیرفعال"}
                    </span>

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

          <div className="sticky bottom-4 z-20">

            <div className="flex flex-col-reverse gap-3 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-200/50 backdrop-blur sm:flex-row sm:items-center sm:justify-between">

              <Link
                href={`/customers/${customer.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft size={16} />
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
                    <Save size={17} />

                    ذخیره تغییرات
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

function PreviewItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/5 p-4">

      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p className="mt-2 truncate font-bold text-white">
        {value}
      </p>

    </div>
  );
}
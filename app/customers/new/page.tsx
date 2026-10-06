"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MapPin,
  UserRound,
  X,
} from "lucide-react";

import {
  customersService,
  type V2RegionalManager,
} from "@/src/lib/services/customers";
import { sharedLocationService } from "@/src/lib/services/shared-location";

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

interface ProvinceOption {
  code: string;
  name_fa: string;
}

interface CityOption {
  province_code: string;
  city_code: string;
  name_fa: string;
  source?: string | null;
  company_id?: string | null;
}

interface FormData {
  name: string;
  national_id: string;
  phone: string;
  secondary_phone: string;
  whatsapp_number: string;
  regional_manager_id: string;
  customer_type: string;
  province_code: string;
  province_name: string;
  city_code: string;
  city_name: string;
  address_line_1: string;
  address_line_2: string;
  postal_code: string;
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
      <div className="flex min-w-0 items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl transition ${
            checked ? "bg-white shadow-sm" : "bg-slate-100"
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
            onChange(event.target.checked)
          }
          className="peer sr-only"
        />

        <div
          className={`h-7 w-12 rounded-full transition ${
            checked ? "bg-blue-600" : "bg-slate-200"
          }`}
        />

        <div
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
            checked ? "right-1" : "right-6"
          }`}
        />
      </div>
    </label>
  );
}

function ErrorToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-x-4 top-4 z-[100] mx-auto max-w-lg sm:left-auto sm:right-6 sm:inset-x-auto">
      <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-2xl shadow-red-200/40">
        <div className="h-1 bg-red-500" />

        <div className="flex items-start gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <AlertTriangle size={20} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-red-800">
              خطا در ثبت مشتری
            </p>

            <p className="mt-1 text-sm leading-6 text-red-600">
              {message}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="بستن پیام خطا"
          >
            <X size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

function normalizeDigits(value: string): string {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = persianDigits.indexOf(digit);

    if (persianIndex >= 0) {
      return String(persianIndex);
    }

    const arabicIndex = arabicDigits.indexOf(digit);

    if (arabicIndex >= 0) {
      return String(arabicIndex);
    }

    return digit;
  });
}

function normalizeNationalId(value: string): string {
  return normalizeDigits(value).replace(/\D/g, "");
}

function normalizePhone(value: string): string {
  return normalizeDigits(value);
}

export default function NewCustomerPage() {
  const router = useRouter();

  const provinces: ProvinceOption[] =
    sharedLocationService.getProvinces();

  const [cities, setCities] = useState<CityOption[]>([]);
  const [regionalManagers, setRegionalManagers] = useState<
    V2RegionalManager[]
  >([]);

  const [form, setForm] = useState<FormData>({
    name: "",
    national_id: "",
    phone: "",
    secondary_phone: "",
    whatsapp_number: "",
    regional_manager_id: "",
    customer_type: "",
    province_code: "",
    province_name: "",
    city_code: "",
    city_name: "",
    address_line_1: "",
    address_line_2: "",
    postal_code: "",
    is_vip: false,
    is_active: true,
  });

  const [saving, setSaving] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(true);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [dataLoadingError, setDataLoadingError] = useState<
    string | null
  >(null);

  const [showNewCity, setShowNewCity] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [newCityCode, setNewCityCode] = useState("");
  const [creatingCity, setCreatingCity] = useState(false);
  const [cityCreateError, setCityCreateError] = useState<
    string | null
  >(null);

  const addressRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadManagers() {
      try {
        setLoadingManagers(true);
        setDataLoadingError(null);

        const managers =
          await customersService.getV2RegionalManagers();

        if (!cancelled) {
          setRegionalManagers(managers);
        }
      } catch (err) {
        console.error(
          "LOAD REGIONAL MANAGERS ERROR:",
          err
        );

        if (!cancelled) {
          setDataLoadingError(
            err instanceof Error
              ? err.message
              : "خطا در دریافت مدیران منطقه."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingManagers(false);
        }
      }
    }

    void loadManagers();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!form.province_code) {
      return () => {
        cancelled = true;
      };
    }

    async function loadCities() {
      try {
        setCitiesLoading(true);
        setDataLoadingError(null);

        const provinceCities =
          await sharedLocationService.getCities(
            form.province_code
          );

        if (!cancelled) {
          setCities(provinceCities as CityOption[]);
        }
      } catch (err) {
        console.error(
          "LOAD V2 CITIES ERROR:",
          err
        );

        if (!cancelled) {
          setCities([]);
          setDataLoadingError(
            err instanceof Error
              ? err.message
              : "خطا در دریافت شهرهای استان."
          );
        }
      } finally {
        if (!cancelled) {
          setCitiesLoading(false);
        }
      }
    }

    void loadCities();

    return () => {
      cancelled = true;
    };
  }, [form.province_code]);

  useEffect(() => {
    if (!error && !cityCreateError) {
      return;
    }

    const timer = window.setTimeout(() => {
      setError(null);
      setCityCreateError(null);
    }, 7000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [error, cityCreateError]);

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

  function handleProvinceChange(
    provinceCode: string
  ) {
    const province =
      provinces.find(
        (item) => item.code === provinceCode
      ) ?? null;

    setCities([]);
    setDataLoadingError(null);
    setCityCreateError(null);

    setForm((previous) => ({
      ...previous,
      province_code: provinceCode,
      province_name: province?.name_fa ?? "",
      city_code: "",
      city_name: "",
    }));
  }

  function handleCityChange(cityCode: string) {
    const city =
      cities.find(
        (item) => item.city_code === cityCode
      ) ?? null;

    setForm((previous) => ({
      ...previous,
      city_code: cityCode,
      city_name: city?.name_fa ?? "",
    }));

    if (cityCode) {
      window.setTimeout(() => {
        addressRef.current?.focus();
      }, 80);
    }
  }

  async function handleCreateCity() {
    const name = newCityName.trim();
    const provinceCode = form.province_code.trim();

    if (!provinceCode) {
      setCityCreateError(
        "ابتدا استان را انتخاب کنید."
      );
      return;
    }

    if (!name) {
      setCityCreateError(
        "نام شهر را وارد کنید."
      );
      return;
    }

    const duplicateCity = cities.some(
      (city) =>
        city.name_fa.trim() === name ||
        city.city_code.trim() === name
    );

    if (duplicateCity) {
      setCityCreateError(
        "این شهر قبلاً در فهرست شهرهای استان وجود دارد."
      );
      return;
    }

    const generatedCityCode =
      newCityCode.trim() ||
      `custom-${provinceCode}-${Date.now().toString(36)}`;

    try {
      setCreatingCity(true);
      setCityCreateError(null);
      setError(null);

      const createCustomCity =
        sharedLocationService.createCustomCity as unknown as (
          input: {
            province_code: string;
            city_code: string;
            name_fa: string;
          }
        ) => Promise<CityOption>;

      const createdCity =
        await createCustomCity({
          province_code: provinceCode,
          city_code: generatedCityCode,
          name_fa: name,
        });

      setCities((previous) => {
        const alreadyExists = previous.some(
          (city) =>
            city.city_code ===
            createdCity.city_code
        );

        if (alreadyExists) {
          return previous;
        }

        return [...previous, createdCity].sort(
          (first, second) =>
            first.name_fa.localeCompare(
              second.name_fa,
              "fa"
            )
        );
      });

      setForm((previous) => ({
        ...previous,
        city_code:
          createdCity.city_code,
        city_name:
          createdCity.name_fa,
      }));

      setNewCityName("");
      setNewCityCode("");
      setShowNewCity(false);

      window.setTimeout(() => {
        addressRef.current?.focus();
      }, 80);
    } catch (err) {
      console.error(
        "CREATE V2 CITY ERROR:",
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

    setError(null);

    const name = form.name.trim();
    const nationalId =
      normalizeNationalId(form.national_id);
    const phone = normalizePhone(
      form.phone.trim()
    );
    const secondaryPhone =
      form.secondary_phone.trim();
    const whatsapp =
      form.whatsapp_number.trim();

    if (!name) {
      setError(
        "نام و نام خانوادگی مشتری الزامی است."
      );
      return;
    }

    if (!nationalId) {
      setError(
        "کد ملی مشتری الزامی است."
      );
      return;
    }

    if (!/^\d{10}$/.test(nationalId)) {
      setError(
        "کد ملی باید دقیقاً ۱۰ رقم باشد."
      );
      return;
    }

    if (!phone) {
      setError(
        "شماره تماس مشتری الزامی است."
      );
      return;
    }

    if (!form.regional_manager_id) {
      setError(
        "مدیر منطقه مشتری را انتخاب کنید."
      );
      return;
    }

    if (!form.province_code) {
      setError(
        "استان مشتری را انتخاب کنید."
      );
      return;
    }

    if (!form.city_code) {
      setError(
        "شهر مشتری را انتخاب کنید."
      );
      return;
    }

    if (!form.address_line_1.trim()) {
      setError(
        "آدرس دقیق مشتری الزامی است."
      );
      return;
    }

    if (!form.customer_type) {
      setError(
        "نوع مشتری را انتخاب کنید."
      );
      return;
    }

    try {
      setSaving(true);

      const customer =
        await customersService.createV2({
          name,
          national_id: nationalId,
          phone,
          secondary_phone:
            secondaryPhone || undefined,
          whatsapp_number:
            whatsapp || undefined,
          regional_manager_id:
            form.regional_manager_id,
          customer_type:
            form.customer_type,
          is_vip: form.is_vip,
          is_active: form.is_active,
          primary_address: {
            province_code:
              form.province_code,
            province_name:
              form.province_name,
            city_code:
              form.city_code,
            city_name:
              form.city_name,
            address_line_1:
              form.address_line_1.trim(),
            address_line_2:
              form.address_line_2.trim() ||
              null,
            postal_code:
              normalizeDigits(
                form.postal_code.trim()
              ) || null,
            address_type: "office",
            label: "آدرس اصلی مشتری",
          },
        });

      setError(null);

      router.push(
        `/customers/view?id=${encodeURIComponent(
          customer.id
        )}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "ایجاد مشتری انجام نشد."
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedManager =
    regionalManagers.find(
      (manager) =>
        manager.id ===
        form.regional_manager_id
    ) ?? null;

  const selectedProvince =
    provinces.find(
      (province) =>
        province.code ===
        form.province_code
    ) ?? null;

  const selectedCity =
    cities.find(
      (city) =>
        city.city_code ===
        form.city_code
    ) ?? null;

  const v2FormComplete =
    Boolean(
      form.name.trim() &&
        /^\d{10}$/.test(
          normalizeNationalId(
            form.national_id
          )
        ) &&
        form.phone.trim() &&
        form.regional_manager_id &&
        form.province_code &&
        form.city_code &&
        form.address_line_1.trim() &&
        form.customer_type
    );

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 px-4 py-6 md:px-6 md:py-8"
    >
      {error && (
        <ErrorToast
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <div className="mx-auto max-w-6xl">
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
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-100">
                  <UserRound size={26} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                      افزودن مشتری
                    </h1>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                      V2
                    </span>
                  </div>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 md:text-base">
                    برای استفاده از مشتری در ثبت سفارش و
                    ادامه فرایند حواله، مشخصات اصلی مشتری را
                    کامل و دقیق ثبت کنید.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-400">
                  وضعیت فرم
                </p>

                <p
                  className={`mt-1 text-sm font-black ${
                    v2FormComplete
                      ? "text-emerald-600"
                      : "text-slate-700"
                  }`}
                >
                  {v2FormComplete
                    ? "آماده ثبت"
                    : "نیازمند تکمیل"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {dataLoadingError && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
            <div className="h-1 bg-amber-500" />

            <div className="flex items-start gap-3 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 font-black text-amber-600">
                !
              </div>

              <div>
                <p className="font-black text-amber-800">
                  دریافت اطلاعات کمکی با مشکل مواجه شد
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-600">
                  {dataLoadingError}
                </p>
              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              icon="📋"
              title="مشخصات اصلی مشتری"
              description="اطلاعات شناسایی و نوع مشتری را ثبت کنید."
            />

            <div className="grid gap-5 md:grid-cols-2">
              <InputField
                label="نام و نام خانوادگی / نام مشتری"
                required
                hint="این نام در سفارش، حواله و گزارش‌های CRM استفاده می‌شود."
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
                  placeholder="مثلاً محمد رضایی"
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </InputField>

              <InputField
                label="کد ملی"
                required
                hint="کد ملی باید دقیقاً ۱۰ رقم باشد."
              >
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.national_id}
                  onChange={(event) =>
                    updateField(
                      "national_id",
                      normalizeNationalId(
                        event.target.value
                      ).slice(0, 10)
                    )
                  }
                  placeholder="مثلاً 0012345678"
                  dir="ltr"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </InputField>

              <InputField
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
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
              </InputField>

              <InputField
                label="مدیر منطقه"
                required
                hint="در V2 مدیر منطقه جایگزین نام بازاریاب در این فرایند شده است."
              >
                <select
                  value={form.regional_manager_id}
                  onChange={(event) =>
                    updateField(
                      "regional_manager_id",
                      event.target.value
                    )
                  }
                  disabled={loadingManagers}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    {loadingManagers
                      ? "در حال دریافت مدیران منطقه..."
                      : "انتخاب مدیر منطقه"}
                  </option>

                  {regionalManagers.map(
                    (manager) => (
                      <option
                        key={manager.id}
                        value={manager.id}
                      >
                        {manager.full_name}
                      </option>
                    )
                  )}
                </select>
              </InputField>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              icon="📍"
              title="موقعیت و آدرس مشتری"
              description="استان، شهر و آدرس دقیق مشتری را برای تکمیل پرونده ثبت کنید."
            />

            <div className="grid gap-5 md:grid-cols-2">
              <InputField
                label="استان"
                required
              >
                <select
                  value={form.province_code}
                  onChange={(event) =>
                    handleProvinceChange(
                      event.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">
                    انتخاب استان
                  </option>

                  {provinces.map(
                    (province) => (
                      <option
                        key={province.code}
                        value={province.code}
                      >
                        {province.name_fa}
                      </option>
                    )
                  )}
                </select>
              </InputField>

              <InputField
                label="شهر"
                required
                hint={
                  selectedProvince
                    ? `شهرهای ${selectedProvince.name_fa} نمایش داده می‌شوند.`
                    : "ابتدا استان را انتخاب کنید."
                }
              >
                <div className="space-y-3">
                  <select
                    value={form.city_code}
                    onChange={(event) =>
                      handleCityChange(
                        event.target.value
                      )
                    }
                    disabled={
                      !form.province_code ||
                      citiesLoading
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">
                      {citiesLoading
                        ? "در حال دریافت شهرها..."
                        : form.province_code
                          ? "انتخاب شهر"
                          : "ابتدا استان را انتخاب کنید"}
                    </option>

                    {cities.map((city) => (
                      <option
                        key={city.city_code}
                        value={city.city_code}
                      >
                        {city.name_fa}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      if (!form.province_code) {
                        setCityCreateError(
                          "ابتدا استان را انتخاب کنید."
                        );
                        return;
                      }

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
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                          <MapPin
                            size={18}
                          />
                        </div>

                        <div>
                          <p className="text-sm font-black text-blue-900">
                            افزودن شهر جدید
                          </p>

                          <p className="mt-1 text-xs leading-5 text-blue-700">
                            شهر جدید فقط برای استان
                            انتخاب‌شده ثبت می‌شود و
                            در مراجعه‌های بعدی قابل
                            استفاده خواهد بود.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <input
                          type="text"
                          value={newCityName}
                          onChange={(event) =>
                            setNewCityName(
                              event.target.value
                            )
                          }
                          placeholder="نام شهر، مثلاً سیمرغ"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                        />

                        <input
                          type="text"
                          value={newCityCode}
                          onChange={(event) =>
                            setNewCityCode(
                              event.target.value
                            )
                          }
                          placeholder="کد شهر — اختیاری"
                          dir="ltr"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                        />

                        {cityCreateError && (
                          <p className="text-xs font-bold text-red-600">
                            {cityCreateError}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void handleCreateCity()
                            }
                            disabled={
                              creatingCity
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {creatingCity ? (
                              <>
                                <Loader2
                                  size={15}
                                  className="animate-spin"
                                />
                                در حال ثبت شهر...
                              </>
                            ) : (
                              "ثبت شهر و انتخاب"
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowNewCity(
                                false
                              );
                              setCityCreateError(
                                null
                              );
                            }}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                          >
                            انصراف
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </InputField>

              <div className="md:col-span-2">
                <InputField
                  label="آدرس دقیق"
                  required
                  hint="خیابان، کوچه، پلاک، واحد و هر توضیح لازم برای پیدا کردن محل تحویل را دقیق بنویسید."
                >
                  <textarea
                    ref={addressRef}
                    value={
                      form.address_line_1
                    }
                    onChange={(event) =>
                      updateField(
                        "address_line_1",
                        event.target.value
                      )
                    }
                    rows={5}
                    placeholder="مثلاً سمنان، بلوار امام رضا، خیابان ...، پلاک ...، واحد ..."
                    className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </InputField>
              </div>

              <InputField
                label="توضیحات تکمیلی آدرس"
                hint="اختیاری؛ مانند نام پاساژ، طبقه، نشانی دوم یا توضیح دسترسی."
              >
                <textarea
                  value={
                    form.address_line_2
                  }
                  onChange={(event) =>
                    updateField(
                      "address_line_2",
                      event.target.value
                    )
                  }
                  rows={4}
                  placeholder="مثلاً روبه‌روی ...، ورودی از سمت ..."
                  className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </InputField>

              <InputField
                label="کد پستی"
                hint="اختیاری"
              >
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.postal_code}
                  onChange={(event) =>
                    updateField(
                      "postal_code",
                      normalizeDigits(
                        event.target.value
                      )
                        .replace(/\D/g, "")
                        .slice(0, 10)
                    )
                  }
                  placeholder="۱۰ رقم"
                  dir="ltr"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </InputField>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              icon="📞"
              title="اطلاعات تماس"
              description="شماره تماس اصلی برای ثبت سفارش و پیگیری مشتری الزامی است."
            />

            <div className="grid gap-5 md:grid-cols-3">
              <InputField
                label="شماره تماس اصلی"
                required
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
                  autoComplete="tel"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </InputField>

              <InputField
                label="شماره تماس دوم"
                hint="اختیاری"
              >
                <input
                  type="tel"
                  value={
                    form.secondary_phone
                  }
                  onChange={(event) =>
                    updateField(
                      "secondary_phone",
                      event.target.value
                    )
                  }
                  placeholder="0912..."
                  dir="ltr"
                  autoComplete="tel"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </InputField>

              <InputField
                label="شماره واتساپ"
                hint="اختیاری"
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
                  autoComplete="tel"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </InputField>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              icon="⚙️"
              title="وضعیت مشتری"
              description="سطح اهمیت و فعال بودن پرونده مشتری را تعیین کنید."
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

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 shadow-sm">
            <div className="p-6 md:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-400">
                    پیش‌نمایش
                  </p>

                  <h2 className="mt-1 text-xl font-black text-white">
                    کارت مشتری V2
                  </h2>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <UserRound size={21} />
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                    کد ملی
                  </p>

                  <p
                    dir="ltr"
                    className="mt-2 truncate text-left font-bold text-white"
                  >
                    {form.national_id ||
                      "وارد نشده"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-xs text-slate-400">
                    مدیر منطقه
                  </p>

                  <p className="mt-2 truncate font-bold text-white">
                    {selectedManager?.full_name ??
                      "انتخاب نشده"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-xs text-slate-400">
                    محل
                  </p>

                  <p className="mt-2 truncate font-bold text-white">
                    {selectedProvince?.name_fa &&
                    selectedCity?.name_fa
                      ? `${selectedProvince.name_fa}، ${selectedCity.name_fa}`
                      : "انتخاب نشده"}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-white/5 p-4">
                <p className="text-xs text-slate-400">
                  آدرس
                </p>

                <p className="mt-2 text-sm leading-7 text-slate-200">
                  {form.address_line_1 ||
                    "آدرس هنوز وارد نشده"}
                </p>
              </div>

              <div className="mt-4 rounded-2xl bg-white/5 p-4">
                <p className="text-xs text-slate-400">
                  وضعیت تکمیل اطلاعات V2
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {form.name.trim() && (
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                      نام
                    </span>
                  )}

                  {form.national_id &&
                    /^\d{10}$/.test(
                      normalizeNationalId(
                        form.national_id
                      )
                    ) && (
                      <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                        کد ملی
                      </span>
                    )}

                  {form.phone.trim() && (
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                      تماس
                    </span>
                  )}

                  {form.regional_manager_id && (
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                      مدیر منطقه
                    </span>
                  )}

                  {form.province_code && (
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                      استان
                    </span>
                  )}

                  {form.city_code && (
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                      شهر
                    </span>
                  )}

                  {form.address_line_1.trim() && (
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                      آدرس
                    </span>
                  )}

                  {!v2FormComplete && (
                    <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300">
                      اطلاعات هنوز کامل نیست
                    </span>
                  )}

                  {v2FormComplete && (
                    <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-300">
                      آماده ثبت V2
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-bold text-slate-400">
                  نکته مهم
                </p>

                <p className="mt-2 text-sm leading-7 text-slate-300">
                  آدرس ثبت‌شده در این مرحله، آدرس اصلی پرونده
                  مشتری است. هنگام صدور حواله می‌توان آدرس تحویل
                  و شخص تحویل‌گیرنده را جداگانه ویرایش کرد.
                </p>
              </div>
            </div>
          </section>

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
                  loadingManagers ||
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
                    <CheckCircle2 size={17} />
                    ثبت مشتری V2
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
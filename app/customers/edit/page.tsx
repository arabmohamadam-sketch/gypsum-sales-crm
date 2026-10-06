"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Star,
  UserRound,
  X,
} from "lucide-react";

import { useQueryId } from "@/src/lib/hooks/useQueryId";
import { customersService } from "@/src/lib/services/customers";
import { sharedLocationService } from "@/src/lib/services/shared-location";
import type { Customer } from "@/src/lib/types/customer";

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

interface ProvinceOption {
  code: string;
  name_fa: string;
}

interface CityOption {
  province_code: string;
  city_code: string;
  name_fa: string;
  source?: string;
  company_id?: string | null;
}

interface RegionalManagerOption {
  id: string;
  full_name: string;
  email: string;
  role_slug: "regional_manager";
  is_active: boolean;
}

interface InputFieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}

function InputField({
  label,
  required = false,
  children,
  hint,
}: InputFieldProps) {
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
  onChange: (checked: boolean) => void;
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
            onChange(event.target.checked)
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
                length: 9,
              }).map((_, index) => (
                <div key={index}>
                  <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                  <div className="mt-2 h-12 animate-pulse rounded-2xl bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
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
    <div
      dir="rtl"
      className="fixed right-4 top-4 z-[100] w-[calc(100vw-2rem)] max-w-md animate-in slide-in-from-top-4 fade-in duration-200"
    >
      <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-2xl shadow-red-200/40">
        <div className="h-1 bg-red-500" />

        <div className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <AlertTriangle size={19} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-black text-red-800">
              امکان ذخیره تغییرات وجود ندارد
            </p>

            <p className="mt-1 text-sm leading-6 text-red-600">
              {message}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پیام"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      dir="rtl"
      className="fixed right-4 top-4 z-[100] w-[calc(100vw-2rem)] max-w-md animate-in slide-in-from-top-4 fade-in duration-200"
    >
      <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-2xl shadow-emerald-200/40">
        <div className="h-1 bg-emerald-500" />

        <div className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={19} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-black text-emerald-800">
              تغییرات ذخیره شد
            </p>

            <p className="mt-1 text-sm leading-6 text-emerald-600">
              {message}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پیام"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={17} />
          </button>
        </div>
      </div>
    </div>
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

function normalizeList<T>(
  value: unknown
): T[] {
  return Array.isArray(value)
    ? (value as T[])
    : [];
}

function normalizeNationalIdInput(
  value: string
): string {
  return value
    .replace(
      /[۰-۹]/g,
      (digit) =>
        String(
          "۰۱۲۳۴۵۶۷۸۹".indexOf(
            digit
          )
        )
    )
    .replace(
      /[٠-٩]/g,
      (digit) =>
        String(
          "٠١٢٣٤٥٦٧٨٩".indexOf(
            digit
          )
        )
    )
    .replace(/\D/g, "");
}

export default function EditCustomerPage() {
  const router = useRouter();
  const customerId = useQueryId();

  const addressRef =
    useRef<HTMLTextAreaElement | null>(
      null
    );

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [provinces, setProvinces] =
    useState<ProvinceOption[]>([]);

  const [cities, setCities] =
    useState<CityOption[]>([]);

  const [
    regionalManagers,
    setRegionalManagers,
  ] = useState<
    RegionalManagerOption[]
  >([]);

  const [form, setForm] =
    useState<FormData>({
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

  const [
    ownershipReason,
    setOwnershipReason,
  ] = useState("");

  const [showNewCity, setShowNewCity] =
    useState(false);

  const [newCityName, setNewCityName] =
    useState("");

  const [creatingCity, setCreatingCity] =
    useState(false);

  const [
    cityCreateError,
    setCityCreateError,
  ] = useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [catalogLoading, setCatalogLoading] =
    useState(true);

  const [citiesLoading, setCitiesLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const [
    customerError,
    setCustomerError,
  ] = useState<string | null>(null);

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
          await customersService.getByIdV2(
            customerId
          );

        if (!mounted) {
          return;
        }

        setCustomer(data);

        const address =
          data.v2_primary_address;

        setForm({
          name:
            data.name ?? "",

          national_id:
            data.national_id ?? "",

          phone:
            data.phone ?? "",

          secondary_phone:
            data.secondary_phone ?? "",

          whatsapp_number:
            data.whatsapp_number ?? "",

          regional_manager_id:
            data.regional_manager_id ??
            "",

          customer_type:
            data.customer_type ?? "",

          province_code:
            address?.v2_province_code ??
            "",

          province_name:
            address?.v2_province_name ??
            "",

          city_code:
            address?.v2_city_code ??
            "",

          city_name:
            address?.v2_city_name ??
            "",

          address_line_1:
            address?.address_line_1 ??
            "",

          address_line_2:
            address?.address_line_2 ??
            "",

          postal_code:
            address?.postal_code ??
            "",

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
          "خطا در دریافت اطلاعات مشتری V2:",
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

  useEffect(() => {
    let mounted = true;

    async function loadCatalogs() {
      try {
        setCatalogLoading(true);

        const [
          provinceRows,
          managerRows,
        ] = await Promise.all([
          sharedLocationService.getProvinces(),
          customersService.getV2RegionalManagers(),
        ]);

        if (!mounted) {
          return;
        }

        const normalizedProvinces =
          normalizeList<ProvinceOption>(
            provinceRows
          )
            .filter(
              (item) =>
                Boolean(item?.code) &&
                Boolean(item?.name_fa)
            )
            .map((item) => ({
              code: String(
                item.code
              ),
              name_fa: String(
                item.name_fa
              ),
            }));

        setProvinces(
          normalizedProvinces
        );

        setRegionalManagers(
          normalizeList<RegionalManagerOption>(
            managerRows
          )
        );
      } catch (err) {
        if (!mounted) {
          return;
        }

        console.error(
          "خطا در دریافت اطلاعات پایه مشتری V2:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "خطا در دریافت استان‌ها یا مدیران منطقه."
        );
      } finally {
        if (mounted) {
          setCatalogLoading(false);
        }
      }
    }

    void loadCatalogs();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!form.province_code) {
      return;
    }

    let mounted = true;

    async function loadCities() {
      try {
        setCitiesLoading(true);
        setError(null);

        const cityRows =
          await sharedLocationService.getCities(
            form.province_code
          );

        if (!mounted) {
          return;
        }

        const normalizedCities =
          normalizeList<CityOption>(
            cityRows
          )
            .filter(
              (item) =>
                Boolean(
                  item?.province_code
                ) &&
                Boolean(
                  item?.city_code
                ) &&
                Boolean(
                  item?.name_fa
                )
            )
            .map((item) => ({
              province_code:
                String(
                  item.province_code
                ),

              city_code:
                String(
                  item.city_code
                ),

              name_fa:
                String(
                  item.name_fa
                ),

              source:
                item.source,

              company_id:
                item.company_id ??
                null,
            }));

        setCities(
          normalizedCities
        );
      } catch (err) {
        if (!mounted) {
          return;
        }

        console.error(
          "خطا در دریافت شهرهای استان:",
          err
        );

        setCities([]);

        setError(
          err instanceof Error
            ? err.message
            : "خطا در دریافت شهرهای استان."
        );
      } finally {
        if (mounted) {
          setCitiesLoading(false);
        }
      }
    }

    void loadCities();

    return () => {
      mounted = false;
    };
  }, [form.province_code]);

  useEffect(() => {
    if (!error && !success) {
      return;
    }

    const timeoutId =
      window.setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 7000);

    return () => {
      window.clearTimeout(
        timeoutId
      );
    };
  }, [error, success]);

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
    setCustomerError(null);
  }

  function handleProvinceChange(
    provinceCode: string
  ) {
    const province =
      provinces.find(
        (item) =>
          item.code ===
          provinceCode
      );

    setCities([]);

    setForm(
      (previous) => ({
        ...previous,
        province_code:
          provinceCode,
        province_name:
          province?.name_fa ??
          "",
        city_code: "",
        city_name: "",
      })
    );

    setShowNewCity(false);
    setCityCreateError(null);
    setError(null);
  }

  function handleCityChange(
    cityCode: string
  ) {
    const city =
      cities.find(
        (item) =>
          item.province_code ===
            form.province_code &&
          item.city_code ===
            cityCode
      );

    setForm(
      (previous) => ({
        ...previous,
        city_code:
          cityCode,
        city_name:
          city?.name_fa ?? "",
      })
    );

    setError(null);
    setSuccess(null);
    setCustomerError(null);

    if (cityCode) {
      window.setTimeout(() => {
        addressRef.current?.focus();
      }, 0);
    }
  }

  async function handleCreateCity() {
    const cityName =
      newCityName.trim();

    const provinceCode =
      form.province_code.trim();

    if (!provinceCode) {
      setCityCreateError(
        "ابتدا استان مشتری را انتخاب کنید."
      );
      return;
    }

    if (!cityName) {
      setCityCreateError(
        "نام شهر را وارد کنید."
      );
      return;
    }

    const province =
      provinces.find(
        (item) =>
          item.code ===
          provinceCode
      );

    if (!province) {
      setCityCreateError(
        "استان انتخاب‌شده معتبر نیست."
      );
      return;
    }

    try {
      setCreatingCity(true);
      setCityCreateError(null);

      const service =
        sharedLocationService as unknown as {
          createCustomCity?: (input: {
            province_code: string;
            city_code?: string | null;
            name_fa: string;
          }) => Promise<CityOption>;
        };

      if (
        typeof service.createCustomCity !==
        "function"
      ) {
        throw new Error(
          "امکان ثبت شهر جدید در سرویس موقعیت مکانی فعال نیست."
        );
      }

      const generatedCode =
        `custom-${provinceCode}-${Date.now().toString(36)}`;

      const city =
        await service.createCustomCity({
          province_code:
            provinceCode,
          city_code:
            generatedCode,
          name_fa:
            cityName,
        });

      const normalizedCity: CityOption =
        {
          province_code:
            String(
              city?.province_code ??
                provinceCode
            ),

          city_code:
            String(
              city?.city_code ??
                generatedCode
            ),

          name_fa:
            String(
              city?.name_fa ??
                cityName
            ),

          source:
            city?.source ??
            "custom",

          company_id:
            city?.company_id ??
            null,
        };

      setCities(
        (previous) => {
          const filtered =
            previous.filter(
              (item) =>
                !(
                  item.province_code ===
                    normalizedCity.province_code &&
                  item.city_code ===
                    normalizedCity.city_code
                )
            );

          return [
            ...filtered,
            normalizedCity,
          ].sort(
            (first, second) =>
              first.name_fa.localeCompare(
                second.name_fa,
                "fa"
              )
          );
        }
      );

      setForm(
        (previous) => ({
          ...previous,
          city_code:
            normalizedCity.city_code,
          city_name:
            normalizedCity.name_fa,
        })
      );

      setNewCityName("");
      setShowNewCity(false);

      window.setTimeout(() => {
        addressRef.current?.focus();
      }, 0);
    } catch (err) {
      console.error(
        "CREATE V2 CITY ERROR:",
        err
      );

      setCityCreateError(
        err instanceof Error
          ? err.message
          : "خطا در ثبت شهر جدید."
      );
    } finally {
      setCreatingCity(false);
    }
  }

  function hasManagerChange() {
    return (
      (customer?.regional_manager_id ??
        null) !==
      (form.regional_manager_id.trim() ||
        null)
    );
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
    setCustomerError(null);

    const name =
      form.name.trim();

    const nationalId =
      normalizeNationalIdInput(
        form.national_id
      );

    const phone =
      form.phone.trim();

    const secondaryPhone =
      form.secondary_phone.trim();

    const whatsapp =
      form.whatsapp_number.trim();

    const managerId =
      form.regional_manager_id.trim();

    const provinceCode =
      form.province_code.trim();

    const provinceName =
      form.province_name.trim();

    const cityCode =
      form.city_code.trim();

    const cityName =
      form.city_name.trim();

    const address =
      form.address_line_1.trim();

    if (!name) {
      setCustomerError(
        "نام و نام خانوادگی مشتری الزامی است."
      );
      return;
    }

    if (!nationalId) {
      setCustomerError(
        "کد ملی مشتری الزامی است."
      );
      return;
    }

    if (
      !/^\d{10}$/.test(
        nationalId
      )
    ) {
      setCustomerError(
        "کد ملی باید دقیقاً ۱۰ رقم باشد."
      );
      return;
    }

    if (!phone) {
      setCustomerError(
        "شماره تماس مشتری الزامی است."
      );
      return;
    }

    if (!managerId) {
      setCustomerError(
        "مدیر منطقه مشتری الزامی است."
      );
      return;
    }

    if (
      !provinceCode ||
      !provinceName
    ) {
      setCustomerError(
        "استان مشتری را انتخاب کنید."
      );
      return;
    }

    if (
      !cityCode ||
      !cityName
    ) {
      setCustomerError(
        "شهر مشتری را انتخاب کنید."
      );
      return;
    }

    if (!address) {
      setCustomerError(
        "آدرس دقیق مشتری الزامی است."
      );
      return;
    }

    if (
      phone &&
      secondaryPhone &&
      phone === secondaryPhone
    ) {
      setCustomerError(
        "شماره تماس دوم نمی‌تواند با شماره تماس اصلی یکسان باشد."
      );
      return;
    }

    const managerChanged =
      hasManagerChange();

    if (
      managerChanged &&
      customer.regional_manager_id &&
      !ownershipReason.trim()
    ) {
      setCustomerError(
        "برای تغییر مدیر منطقه، ثبت دلیل الزامی است."
      );
      return;
    }

    const effectiveOwnershipReason =
      managerChanged
        ? ownershipReason.trim() ||
          "تکمیل مشخصات مشتری V2"
        : undefined;

    try {
      setSaving(true);

      await customersService.updateV2(
        customer.id,
        {
          name,

          national_id:
            nationalId,

          phone:
            phone || null,

          secondary_phone:
            secondaryPhone ||
            null,

          whatsapp_number:
            whatsapp ||
            null,

          regional_manager_id:
            managerId,

          customer_type:
            form.customer_type.trim() ||
            undefined,

          is_vip:
            form.is_vip,

          is_active:
            form.is_active,

          ownership_reason:
            effectiveOwnershipReason,

          primary_address: {
            province_code:
              provinceCode,

            province_name:
              provinceName,

            city_code:
              cityCode,

            city_name:
              cityName,

            address_line_1:
              address,

            address_line_2:
              form.address_line_2.trim() ||
              null,

            postal_code:
              form.postal_code.trim() ||
              null,

            address_type:
              "office",

            label:
              "آدرس اصلی مشتری",
          },
        }
      );

      setSuccess(
        "اطلاعات مشتری با موفقیت ذخیره شد."
      );

      window.setTimeout(() => {
        router.push(
          `/customers/view?id=${encodeURIComponent(
            customer.id
          )}`
        );

        router.refresh();
      }, 700);
    } catch (err) {
      if (
        err instanceof Error &&
        err.name ===
          "CustomerValidationError"
      ) {
        setCustomerError(
          err.message
        );
        return;
      }

      console.error(
        "خطا در بروزرسانی مشتری V2:",
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

  const selectedProvince =
    provinces.find(
      (province) =>
        province.code ===
        form.province_code
    );

  const selectedManager =
    regionalManagers.find(
      (manager) =>
        manager.id ===
        form.regional_manager_id
    );

  const managerChanged =
    hasManagerChange();

  const normalizedFormNationalId =
    normalizeNationalIdInput(
      form.national_id
    );

  const v2FormComplete =
    Boolean(
      form.name.trim() &&
        /^\d{10}$/.test(
          normalizedFormNationalId
        ) &&
        form.phone.trim() &&
        form.regional_manager_id.trim() &&
        form.province_code.trim() &&
        form.city_code.trim() &&
        form.address_line_1.trim()
    );

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 px-4 py-6 md:px-6 md:py-8"
    >
      {error && (
        <ErrorToast
          message={error}
          onClose={() =>
            setError(null)
          }
        />
      )}

      {success && (
        <SuccessToast
          message={success}
          onClose={() =>
            setSuccess(null)
          }
        />
      )}

      {customerError && (
        <ErrorToast
          message={customerError}
          onClose={() =>
            setCustomerError(null)
          }
        />
      )}

      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href={`/customers/view?id=${encodeURIComponent(
              customer.id
            )}`}
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
                      ویرایش مشتری V2
                    </h1>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                      V2
                    </span>

                    {customer.is_vip && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-200">
                        <Star size={12} />
                        VIP
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-500 md:text-base">
                    اطلاعات موردنیاز برای ثبت سفارش و فرآیند صدور حواله را تکمیل و بروزرسانی کنید.
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

        {catalogLoading && (
          <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm font-bold text-blue-700">
            در حال دریافت استان‌ها و مدیران منطقه...
          </div>
        )}

        <div className="mb-6 overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm">
          <div className="h-1 bg-amber-500" />

          <div className="flex items-start gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <ShieldCheck size={20} />
            </div>

            <div>
              <h2 className="font-black text-slate-900">
                مشخصات الزامی V2
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                نام و نام خانوادگی، شماره تماس، مدیر منطقه، استان، شهر، آدرس کامل و کد ملی باید تکمیل باشند تا مشتری برای ثبت سفارش آماده باشد.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              icon={
                <UserRound size={20} />
              }
              title="مشخصات اصلی مشتری"
              description="اطلاعات هویتی و تجاری اصلی مشتری را ثبت کنید."
            />

            <div className="grid gap-5 md:grid-cols-2">
              <InputField
                label="نام و نام خانوادگی"
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
                  placeholder="مثلاً محمد رضایی"
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </InputField>

              <InputField
                label="کد ملی"
                required
                hint="کد ملی دقیقاً ۱۰ رقم باشد."
              >
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={
                    form.national_id
                  }
                  onChange={(event) =>
                    updateField(
                      "national_id",
                      event.target.value
                    )
                  }
                  placeholder="مثلاً ۱۲۳۴۵۶۷۸۹۰"
                  dir="ltr"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </InputField>

              <InputField
                label="نوع مشتری"
                hint="این فیلد برای اطلاعات تکمیلی مشتری است."
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
                label="مدیر منطقه"
                required
                hint="مدیر منطقه با شهر محل مشتری متفاوت است و مالک تجاری مشتری محسوب می‌شود."
              >
                <select
                  value={
                    form.regional_manager_id
                  }
                  onChange={(event) =>
                    updateField(
                      "regional_manager_id",
                      event.target.value
                    )
                  }
                  disabled={
                    catalogLoading
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    {catalogLoading
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

          {managerChanged &&
            customer.regional_manager_id && (
              <section className="rounded-3xl border border-blue-200 bg-blue-50/60 p-6 shadow-sm md:p-7">
                <SectionHeader
                  icon={
                    <ShieldCheck size={20} />
                  }
                  title="دلیل تغییر مدیر منطقه"
                  description="برای تغییر مالک تجاری مشتری، ثبت دلیل الزامی است."
                />

                <InputField
                  label="دلیل تغییر"
                  required
                  hint="مثلاً انتقال مشتری به مدیر منطقه جدید"
                >
                  <textarea
                    value={
                      ownershipReason
                    }
                    onChange={(event) =>
                      setOwnershipReason(
                        event.target.value
                      )
                    }
                    rows={3}
                    placeholder="دلیل تغییر مدیر منطقه را وارد کنید..."
                    className="w-full resize-y rounded-2xl border border-blue-200 bg-white px-4 py-3.5 text-sm font-medium leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />
                </InputField>
              </section>
            )}

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              icon={
                <MapPin size={20} />
              }
              title="آدرس اصلی مشتری"
              description="این آدرس، آدرس اصلی پرونده مشتری است. آدرس تحویل و گیرنده هنگام صدور حواله جداگانه قابل تغییر خواهد بود."
            />

            <div className="grid gap-5 md:grid-cols-2">
              <InputField
                label="استان"
                required
              >
                <select
                  value={
                    form.province_code
                  }
                  onChange={(event) =>
                    handleProvinceChange(
                      event.target.value
                    )
                  }
                  disabled={
                    catalogLoading
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    {catalogLoading
                      ? "در حال دریافت استان‌ها..."
                      : "انتخاب استان"}
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
                    ? `شهرهای استان ${selectedProvince.name_fa} نمایش داده می‌شوند.`
                    : "ابتدا استان را انتخاب کنید."
                }
              >
                <div className="space-y-3">
                  <select
                    value={
                      form.city_code
                    }
                    onChange={(event) =>
                      handleCityChange(
                        event.target.value
                      )
                    }
                    disabled={
                      catalogLoading ||
                      citiesLoading ||
                      !form.province_code
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">
                      {!form.province_code
                        ? "ابتدا استان را انتخاب کنید"
                        : citiesLoading
                          ? "در حال دریافت شهرها..."
                          : cities.length ===
                              0
                            ? "شهری برای این استان ثبت نشده است"
                            : "انتخاب شهر"}
                    </option>

                    {cities.map(
                      (city) => (
                        <option
                          key={`${city.province_code}-${city.city_code}`}
                          value={
                            city.city_code
                          }
                        >
                          {city.name_fa}
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
                    disabled={
                      !form.province_code ||
                      citiesLoading
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
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

                      <p className="mt-1 text-xs leading-5 text-blue-700">
                        استان انتخاب‌شده:{" "}
                        {selectedProvince?.name_fa ??
                          "—"}
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
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="نام شهر جدید"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                        />

                        {cityCreateError && (
                          <p className="text-xs font-bold text-red-600">
                            {
                              cityCreateError
                            }
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            void handleCreateCity()
                          }
                          disabled={
                            creatingCity
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

            <div className="mt-5">
              <InputField
                label="آدرس دقیق"
                required
                hint="خیابان، کوچه، پلاک، واحد، طبقه و هر توضیحی که برای شناسایی محل لازم است."
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
                  rows={4}
                  placeholder="آدرس کامل و دقیق مشتری را وارد کنید..."
                  className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </InputField>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <InputField
                label="توضیحات تکمیلی آدرس"
                hint="اختیاری"
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
                  rows={3}
                  placeholder="مثلاً روبه‌روی بانک، ورودی دوم..."
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
                  value={
                    form.postal_code
                  }
                  onChange={(event) =>
                    updateField(
                      "postal_code",
                      event.target.value
                    )
                  }
                  placeholder="کد پستی"
                  dir="ltr"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </InputField>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              icon={
                <Phone size={20} />
              }
              title="اطلاعات تماس"
              description="شماره تماس اصلی در V2 الزامی است. شماره دوم و واتساپ اختیاری هستند."
            />

            <div className="grid gap-5 md:grid-cols-3">
              <InputField
                label="شماره تماس اصلی"
                required
              >
                <div className="relative">
                  <Phone
                    size={17}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="tel"
                    inputMode="tel"
                    value={
                      form.phone
                    }
                    onChange={(event) =>
                      updateField(
                        "phone",
                        event.target.value
                      )
                    }
                    placeholder="0912..."
                    dir="ltr"
                    autoComplete="tel"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-4 pr-11 text-left text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </InputField>

              <InputField
                label="شماره تماس دوم"
                hint="اختیاری"
              >
                <div className="relative">
                  <Phone
                    size={17}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="tel"
                    inputMode="tel"
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
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-4 pr-11 text-left text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </InputField>

              <InputField
                label="شماره واتساپ"
                hint="اختیاری"
              >
                <div className="relative">
                  <Phone
                    size={17}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="tel"
                    inputMode="tel"
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
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-4 pr-11 text-left text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </InputField>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <SectionHeader
              icon={
                <Star size={20} />
              }
              title="وضعیت مشتری"
              description="وضعیت داخلی پرونده مشتری را تنظیم کنید."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <ToggleCard
                checked={
                  form.is_vip
                }
                onChange={(
                  checked
                ) =>
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
                onChange={(
                  checked
                ) =>
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
                    پیش‌نمایش اطلاعات V2
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
                  label="نام و نام خانوادگی"
                  value={
                    form.name ||
                    "وارد نشده"
                  }
                />

                <PreviewItem
                  label="کد ملی"
                  value={
                    form.national_id ||
                    "ثبت نشده"
                  }
                />

                <PreviewItem
                  label="شماره تماس"
                  value={
                    form.phone ||
                    "ثبت نشده"
                  }
                />

                <PreviewItem
                  label="مدیر منطقه"
                  value={
                    selectedManager?.full_name ??
                    "انتخاب نشده"
                  }
                />
              </div>

              <div className="relative mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <PreviewItem
                  label="استان"
                  value={
                    selectedProvince?.name_fa ??
                    "انتخاب نشده"
                  }
                />

                <PreviewItem
                  label="شهر"
                  value={
                    form.city_name ||
                    "انتخاب نشده"
                  }
                />

                <PreviewItem
                  label="نوع مشتری"
                  value={
                    selectedType
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

              <div className="relative mt-4 grid gap-4 sm:grid-cols-2">
                <PreviewItem
                  label="آدرس اصلی"
                  value={
                    form.address_line_1 ||
                    "ثبت نشده"
                  }
                />

                <PreviewItem
                  label="وضعیت تکمیل V2"
                  value={
                    v2FormComplete
                      ? "کامل"
                      : "نیازمند تکمیل"
                  }
                />
              </div>
            </div>
          </section>

          <div className="sticky bottom-4 z-20">
            <div className="flex flex-col-reverse gap-3 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-200/50 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <Link
                href={`/customers/view?id=${encodeURIComponent(
                  customer.id
                )}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft size={16} />
                انصراف
              </Link>

              <button
                type="submit"
                disabled={
                  saving ||
                  catalogLoading ||
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
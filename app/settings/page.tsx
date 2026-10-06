"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Building2,
  CheckCircle2,
  Loader2,
  Palette,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  Settings as SettingsIcon,
  Save,
} from "lucide-react";

import { useAuth } from "@/src/lib/auth/AuthProvider";
import { usePermissions } from "@/src/lib/hooks/usePermissions";
import {
  settingsService,
  type SettingsOverview,
} from "@/src/lib/services/settings";
import { companyBrandingService } from "@/src/lib/services/company-branding";
import type { CurrentCompany } from "@/src/lib/services/current-company";

function getErrorMessage(
  error: unknown
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "خطا در دریافت یا ذخیره تنظیمات.";
}

function getRoleLabel(
  roleSlug: string,
  fallback: string
): string {
  const labels: Record<string, string> = {
    company_admin: "مدیر کل شرکت",
    regional_manager: "مدیر منطقه",
    sales_manager: "مدیر فروش",
    sales_rep: "کارشناس فروش",
    employee: "کارمند",
  };

  return (
    labels[roleSlug] ||
    fallback ||
    "نقش شرکت"
  );
}

function getRoleDescription(
  roleSlug: string,
  fallback?: string | null
): string {
  const descriptions: Record<
    string,
    string
  > = {
    company_admin:
      "مدیریت کامل تنظیمات و دسترسی‌های شرکت",
    regional_manager:
      "مدیریت عملیات و سفارش‌های حوزه منطقه",
    sales_manager:
      "مدیریت فروش و سفارش‌های حوزه فروش",
    sales_rep:
      "ثبت و پیگیری مشتریان و سفارش‌های اختصاص‌یافته",
    employee:
      "نقش پایه برای واگذاری دسترسی‌های عملیاتی",
  };

  return (
    descriptions[roleSlug] ||
    fallback ||
    "مدیریت دسترسی‌های این نقش"
  );
}

const SETTING_LABELS: Record<
  string,
  string
> = {
  "ai.scoring.weights":
    "وزن‌های امتیازدهی هوشمند",
  "integrations.sms.enabled":
    "اتصال پیامک",
  "integrations.whatsapp.enabled":
    "اتصال واتساپ",
  "mobile.offline_sync.enabled":
    "همگام‌سازی آفلاین موبایل و PWA",
  "notifications.push.enabled":
    "اعلان‌های Push",
};

const SETTING_DESCRIPTION_LABELS: Record<
  string,
  string
> = {
  "ai.scoring.weights":
    "تنظیم وزن معیارهای مورد استفاده برای امتیازدهی هوشمند مشتریان",
  "integrations.sms.enabled":
    "فعال یا غیرفعال بودن اتصال سرویس پیامک",
  "integrations.whatsapp.enabled":
    "فعال یا غیرفعال بودن اتصال واتساپ",
  "mobile.offline_sync.enabled":
    "فعال یا غیرفعال بودن همگام‌سازی آفلاین در موبایل و PWA",
  "notifications.push.enabled":
    "فعال یا غیرفعال بودن ارسال اعلان‌های Push",
};

const VALUE_KEY_LABELS: Record<
  string,
  string
> = {
  days_since_call:
    "روز از آخرین تماس",
  inactivity_days:
    "روزهای عدم فعالیت",
  lifetime_tonnage:
    "تناژ کل سابقه فروش",
  days_since_follow_up:
    "روز از آخرین پیگیری",
  average_monthly_tonnage:
    "میانگین تناژ ماهانه",
  enabled:
    "وضعیت",
};

function getSettingLabel(
  key: string
): string {
  return (
    SETTING_LABELS[key] ||
    key
  );
}

function getSettingDescription(
  key: string,
  fallback?: string | null
): string {
  return (
    SETTING_DESCRIPTION_LABELS[key] ||
    fallback ||
    "تنظیمات ثبت‌شده در سامانه"
  );
}

function formatSettingValue(
  key: string,
  value: Record<string, unknown>
): string {
  const entries = Object.entries(value);

  if (entries.length === 0) {
    return "—";
  }

  return entries
    .map(([itemKey, itemValue]) => {
      const translatedKey =
        VALUE_KEY_LABELS[itemKey] ||
        itemKey;

      let translatedValue =
        String(itemValue);

      if (
        itemKey === "enabled" &&
        typeof itemValue === "boolean"
      ) {
        translatedValue =
          itemValue
            ? "فعال"
            : "غیرفعال";
      }

      return `${translatedKey}: ${translatedValue}`;
    })
    .join("، ");
}

const MAX_LOGO_SIZE =
  2 * 1024 * 1024;

const ALLOWED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

type CompanyBrandingSectionProps = {
  authCompany: CurrentCompany | null;
  canManageBranding: boolean;
  refreshCompany: () => Promise<void>;
  loadSettings: () => Promise<void>;
};

function CompanyBrandingSection({
  authCompany,
  canManageBranding,
  refreshCompany,
  loadSettings,
}: CompanyBrandingSectionProps) {
  const [brandingError, setBrandingError] =
    useState<string | null>(null);

  const [brandingSuccess, setBrandingSuccess] =
    useState<string | null>(null);

  const [brandingSaving, setBrandingSaving] =
    useState(false);

  const [displayName, setDisplayName] =
    useState(
      authCompany?.branding.display_name?.trim() ||
        authCompany?.name?.trim() ||
        ""
    );

  const [selectedLogo, setSelectedLogo] =
    useState<File | null>(null);

  const [logoPreviewUrl, setLogoPreviewUrl] =
    useState<string | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const previewObjectUrlRef =
    useRef<string | null>(null);

  const currentLogoUrl =
    authCompany?.branding.logo_url?.trim() ||
    "/logo.png";

  const effectiveLogoPreviewUrl =
    logoPreviewUrl || currentLogoUrl;

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(
          previewObjectUrlRef.current
        );

        previewObjectUrlRef.current = null;
      }
    };
  }, []);

  function clearPreviewObjectUrl() {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(
        previewObjectUrlRef.current
      );

      previewObjectUrlRef.current = null;
    }
  }

  function handleLogoSelected(
    file: File | null
  ) {
    setBrandingError(null);
    setBrandingSuccess(null);
    clearPreviewObjectUrl();

    if (!file) {
      setSelectedLogo(null);
      setLogoPreviewUrl(null);
      return;
    }

    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      setSelectedLogo(null);
      setLogoPreviewUrl(null);

      setBrandingError(
        "فرمت لوگو باید PNG، JPG یا WEBP باشد."
      );

      return;
    }

    if (file.size <= 0) {
      setSelectedLogo(null);
      setLogoPreviewUrl(null);

      setBrandingError(
        "فایل لوگو خالی است."
      );

      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      setSelectedLogo(null);
      setLogoPreviewUrl(null);

      setBrandingError(
        "حجم فایل لوگو نباید بیشتر از ۲ مگابایت باشد."
      );

      return;
    }

    const objectUrl =
      URL.createObjectURL(file);

    previewObjectUrlRef.current =
      objectUrl;

    setSelectedLogo(file);
    setLogoPreviewUrl(objectUrl);
  }

  async function handleBrandingSave() {
    if (!canManageBranding) {
      return;
    }

    try {
      setBrandingSaving(true);
      setBrandingError(null);
      setBrandingSuccess(null);

      const trimmedDisplayName =
        displayName.trim();

      if (!trimmedDisplayName) {
        throw new Error(
          "نام نمایشی شرکت نمی‌تواند خالی باشد."
        );
      }

      let uploadedLogoPath:
        | string
        | undefined;

      if (selectedLogo) {
        uploadedLogoPath =
          await companyBrandingService.uploadLogo(
            selectedLogo
          );
      }

      await companyBrandingService.updateBranding(
        {
          displayName:
            trimmedDisplayName,
          ...(uploadedLogoPath
            ? {
                logoPath:
                  uploadedLogoPath,
              }
            : {}),
        }
      );

      await refreshCompany();
      await loadSettings();

      clearPreviewObjectUrl();

      setSelectedLogo(null);
      setLogoPreviewUrl(null);

      setBrandingSuccess(
        "هویت بصری شرکت با موفقیت ذخیره شد."
      );
    } catch (err) {
      console.error(
        "Failed to save company branding:",
        err
      );

      setBrandingError(
        getErrorMessage(err)
      );
    } finally {
      setBrandingSaving(false);
    }
  }

  async function handleLogoRemove() {
    if (
      !canManageBranding ||
      !authCompany?.branding.logo_url
    ) {
      return;
    }

    try {
      setBrandingSaving(true);
      setBrandingError(null);
      setBrandingSuccess(null);

      await companyBrandingService.removeLogo();

      await refreshCompany();
      await loadSettings();

      clearPreviewObjectUrl();

      setSelectedLogo(null);
      setLogoPreviewUrl(null);

      setBrandingSuccess(
        "لوگوی اختصاصی شرکت حذف شد و لوگوی پیش‌فرض فعال شد."
      );
    } catch (err) {
      console.error(
        "Failed to remove company branding logo:",
        err
      );

      setBrandingError(
        getErrorMessage(err)
      );
    } finally {
      setBrandingSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <Palette size={21} />
          </div>

          <div>
            <h2 className="text-lg font-black text-slate-900">
              هویت بصری شرکت
            </h2>

            <p className="mt-1 max-w-2xl text-xs leading-6 text-slate-400">
              نام نمایشی و لوگوی اختصاصی شرکت از این بخش مدیریت می‌شود و در
              کل نرم‌افزارهای متصل به همین شرکت نمایش داده خواهد شد.
            </p>
          </div>
        </div>

        {!canManageBranding && (
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-500">
            فقط مشاهده
          </span>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="mx-auto flex h-40 w-40 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div
              role="img"
              aria-label="پیش‌نمایش لوگوی شرکت"
              className="h-full w-full bg-contain bg-center bg-no-repeat"
              style={{
                backgroundImage: `url("${effectiveLogoPreviewUrl.replace(
                  /"/g,
                  "%22"
                )}")`,
              }}
            />
          </div>

          {canManageBranding && (
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={brandingSaving}
              >
                <Upload size={15} />
                انتخاب لوگو
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  handleLogoSelected(
                    event.target.files?.[0] ??
                      null
                  );

                  event.currentTarget.value =
                    "";
                }}
              />

              {authCompany?.branding
                .logo_url &&
                authCompany.branding.logo_url !==
                  "/logo.png" && (
                  <button
                    type="button"
                    onClick={() => {
                      void handleLogoRemove();
                    }}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={brandingSaving}
                  >
                    <Trash2 size={15} />
                    حذف لوگوی اختصاصی
                  </button>
                )}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="company-display-name"
                className="text-xs font-bold text-slate-500"
              >
                نام نمایشی شرکت
              </label>

              <input
                id="company-display-name"
                value={displayName}
                onChange={(event) => {
                  setDisplayName(
                    event.target.value
                  );

                  setBrandingError(null);
                  setBrandingSuccess(null);
                }}
                disabled={
                  !canManageBranding ||
                  brandingSaving
                }
                maxLength={160}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50"
                placeholder="نام نمایشی شرکت"
              />

              <p className="mt-2 text-[11px] leading-5 text-slate-400">
                این نام در Header، Sidebar، عنوان صفحات و سایر بخش‌های برندینگ
                استفاده می‌شود.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold text-slate-400">
                لوگوی فعلی
              </p>

              <p className="mt-2 text-sm font-black text-slate-700">
                {authCompany?.branding
                  .logo_url ===
                "/logo.png"
                  ? "لوگوی پیش‌فرض سیستم"
                  : "لوگوی اختصاصی شرکت"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold text-slate-400">
                محدودیت فایل
              </p>

              <p className="mt-2 text-sm font-black text-slate-700">
                PNG / JPG / WEBP — حداکثر ۲ مگابایت
              </p>
            </div>
          </div>

          {(brandingError ||
            brandingSuccess) && (
            <div
              className={`mt-5 rounded-2xl border p-4 text-sm font-medium ${
                brandingError
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
              role="alert"
            >
              {brandingError ||
                brandingSuccess}
            </div>
          )}

          {canManageBranding && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  void handleBrandingSave();
                }}
                disabled={brandingSaving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {brandingSaving ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={17} />
                )}

                ذخیره هویت بصری
              </button>

              {selectedLogo && (
                <span className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700">
                  لوگوی جدید انتخاب شده و با ذخیره ارسال می‌شود.
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const {
    loading: permissionsLoading,
    error: permissionsError,
    hasPermission,
    hasAnyPermission,
  } = usePermissions();

  const {
    company: authCompany,
    refreshCompany,
  } = useAuth();

  const [overview, setOverview] =
    useState<SettingsOverview | null>(
      null
    );

  const [error, setError] =
    useState<string | null>(null);

  const canReadSettings =
    hasPermission(
      "company.settings.view"
    );

  const canManageBranding =
    hasPermission(
      "company.branding.manage"
    );

  const canReadUsers =
    hasPermission("users.view");

  const canManageUsers =
    hasPermission("users.edit");

  const canManageRoles =
    hasAnyPermission([
      "roles.edit",
      "roles.assign_permission",
      "roles.revoke_permission",
    ]);

  const loading =
    permissionsLoading ||
    (canReadSettings &&
      overview === null &&
      error === null);

  const fetchSettings =
    useCallback(() => {
      return settingsService.getOverview();
    }, []);

  const loadSettings =
    useCallback(async () => {
      try {
        setError(null);

        const result =
          await settingsService.getOverview();

        setOverview(result);
      } catch (err) {
        console.error(
          "Failed to load settings:",
          err
        );

        setOverview(null);
        setError(
          getErrorMessage(err)
        );
      }
    }, []);

  useEffect(() => {
    if (
      permissionsLoading ||
      !canReadSettings
    ) {
      return;
    }

    let cancelled = false;

    fetchSettings()
      .then((result) => {
        if (cancelled) {
          return;
        }

        setOverview(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }

        console.error(
          "Failed to load settings:",
          err
        );

        setOverview(null);
        setError(
          getErrorMessage(err)
        );
      });

    return () => {
      cancelled = true;
    };
  }, [
    permissionsLoading,
    canReadSettings,
    fetchSettings,
  ]);

  const roleNames = useMemo(
    () =>
      overview?.roles
        .map((role) =>
          getRoleLabel(
            role.slug,
            role.name
          )
        )
        .join("، ") ||
      "بدون نقش",
    [overview]
  );

  if (loading) {
    return (
      <main
        dir="rtl"
        className="flex min-h-[420px] items-center justify-center"
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <Loader2
              size={22}
              className="animate-spin text-blue-600"
            />
          </div>

          <p className="mt-4 text-sm font-bold text-slate-600">
            در حال دریافت تنظیمات...
          </p>
        </div>
      </main>
    );
  }

  if (!canReadSettings) {
    return (
      <main
        dir="rtl"
        className="mx-auto max-w-[1100px]"
      >
        <section className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <ShieldCheck size={24} />
            </div>

            <div>
              <h1 className="text-xl font-black text-slate-900">
                دسترسی محدود است
              </h1>

              <p className="mt-2 text-sm leading-7 text-slate-500">
                شما مجوز مشاهده تنظیمات سیستم را ندارید.
              </p>

              {permissionsError && (
                <p className="mt-3 text-xs text-red-500">
                  {permissionsError}
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="mx-auto max-w-[1400px] space-y-6"
    >
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-slate-900" />

        <div className="flex flex-col gap-5 p-6 md:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
              <SettingsIcon size={15} />
              تنظیمات سیستم
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
              تنظیمات CRM
            </h1>

            <p className="mt-2 text-sm leading-7 text-slate-500">
              مدیریت پروفایل، هویت بصری، نقش‌ها و تنظیمات شرکت.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadSettings();
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw size={17} />
            بروزرسانی
          </button>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <UserRound size={21} />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-900">
                پروفایل من
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                اطلاعات حساب کاربری فعلی
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-400">
                نام و نام خانوادگی
              </p>

              <p className="mt-1 text-sm font-black text-slate-800">
                {overview?.profile
                  ?.full_name ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400">
                ایمیل
              </p>

              <p
                dir="ltr"
                className="mt-1 text-left text-sm font-semibold text-slate-700"
              >
                {overview?.profile
                  ?.email ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400">
                شماره تماس
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-700">
                {overview?.profile
                  ?.phone ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400">
                سمت
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-700">
                {overview?.profile
                  ?.job_title ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400">
                نقش
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {overview?.roles
                  .length ? (
                  overview.roles.map(
                    (role) => (
                      <span
                        key={role.id}
                        className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"
                      >
                        {getRoleLabel(
                          role.slug,
                          role.name
                        )}
                      </span>
                    )
                  )
                ) : (
                  <span className="text-sm text-slate-400">
                    {roleNames}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Building2 size={21} />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-900">
                شرکت
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                اطلاعات شرکت متصل به حساب
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-400">
                نام شرکت
              </p>

              <p className="mt-1 text-sm font-black text-slate-800">
                {overview?.company
                  ?.name ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400">
                نام حقوقی
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-700">
                {overview?.company
                  ?.legal_name ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400">
                منطقه زمانی
              </p>

              <p
                dir="ltr"
                className="mt-1 text-left text-sm font-semibold text-slate-700"
              >
                {overview?.company
                  ?.timezone ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400">
                زبان سیستم
              </p>

              <p
                dir="ltr"
                className="mt-1 text-left text-sm font-semibold text-slate-700"
              >
                {overview?.company
                  ?.locale ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400">
                وضعیت
              </p>

              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                <CheckCircle2 size={14} />

                {overview?.company
                  ?.is_active
                  ? "فعال"
                  : "غیرفعال"}
              </div>
            </div>
          </div>
        </section>
      </div>

      <CompanyBrandingSection
        key={
          authCompany?.id ??
          "no-company"
        }
        authCompany={authCompany}
        canManageBranding={
          canManageBranding
        }
        refreshCompany={
          refreshCompany
        }
        loadSettings={
          loadSettings
        }
      />

      {canReadUsers && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                نقش و سطح دسترسی
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                دسترسی‌های فعلی کاربر و مدیریت اعضای شرکت
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canManageUsers && (
                <Link
                  href="/settings/users"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <UserRound size={15} />
                  مدیریت کاربران
                </Link>
              )}

              {canManageRoles && (
                <Link
                  href="/settings/roles"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
                >
                  <ShieldCheck size={15} />
                  مدیریت نقش‌ها و دسترسی‌ها
                </Link>
              )}

              {!canManageUsers &&
                !canManageRoles && (
                  <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                    فقط مشاهده
                  </span>
                )}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {overview?.roles.map(
              (role) => (
                <div
                  key={role.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-sm font-black text-slate-800">
                    {getRoleLabel(
                      role.slug,
                      role.name
                    )}
                  </p>

                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    {getRoleDescription(
                      role.slug,
                      role.description
                    )}
                  </p>

                  <p
                    dir="ltr"
                    className="mt-2 text-[10px] text-slate-400"
                  >
                    {role.slug}
                  </p>
                </div>
              )
            )}

            {!overview?.roles
              .length && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-400">
                هیچ نقشی برای این کاربر ثبت نشده است.
              </div>
            )}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              تنظیمات شرکت
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              تنظیمات ثبت‌شده در CRM
            </p>
          </div>

          {!hasPermission(
            "company.settings.manage"
          ) && (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-500">
              فقط مشاهده
            </span>
          )}
        </div>

        <div className="mt-5 space-y-3">
          {overview?.settings.map(
            (setting) => (
              <div
                key={setting.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-800">
                      {getSettingLabel(
                        setting.key
                      )}
                    </p>

                    <p className="mt-1 text-xs leading-6 text-slate-400">
                      {getSettingDescription(
                        setting.key,
                        setting.description
                      )}
                    </p>

                    <p
                      dir="ltr"
                      className="mt-1 text-[10px] text-slate-300"
                    >
                      {setting.key}
                    </p>
                  </div>

                  <div className="max-w-full text-sm font-bold text-slate-700 md:max-w-[55%]">
                    {formatSettingValue(
                      setting.key,
                      setting.value
                    )}
                  </div>
                </div>
              </div>
            )
          )}

          {!overview?.settings
            .length && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
              تنظیمات شرکتی ثبت نشده است.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
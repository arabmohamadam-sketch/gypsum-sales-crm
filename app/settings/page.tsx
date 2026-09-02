"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Building2,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Settings as SettingsIcon,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  usePermissions,
} from "@/src/lib/hooks/usePermissions";

import {
  settingsService,
  type SettingsOverview,
} from "@/src/lib/services/settings";

function formatSettingValue(
  value: Record<string, unknown>
): string {
  if (Object.keys(value).length === 0) {
    return "—";
  }

  return Object.entries(value)
    .map(
      ([key, item]) =>
        `${key}: ${String(item)}`
    )
    .join("، ");
}

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

  return "خطا در دریافت تنظیمات.";
}

export default function SettingsPage() {
  const {
    loading: permissionsLoading,
    error: permissionsError,
    hasPermission,
  } = usePermissions();

  const [overview, setOverview] =
    useState<SettingsOverview | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const canReadSettings =
    hasPermission(
      "settings.read"
    );

  const canManageSettings =
    hasPermission(
      "settings.write"
    );

  const canReadUsers =
    hasPermission("users.read");

  const canManageUsers =
    hasPermission("users.write");

  async function loadSettings() {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (
      !permissionsLoading &&
      canReadSettings
    ) {
      void loadSettings();
    } else if (
      !permissionsLoading &&
      !canReadSettings
    ) {
      setLoading(false);
    }
  }, [
    permissionsLoading,
    canReadSettings,
  ]);

  const roleNames = useMemo(
    () =>
      overview?.roles
        .map((role) => role.name)
        .join("، ") ||
      "بدون نقش",
    [overview]
  );

  if (
    permissionsLoading ||
    loading
  ) {
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
              <ShieldCheck
                size={24}
              />
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
              <SettingsIcon
                size={15}
              />

              تنظیمات سیستم
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
              تنظیمات CRM
            </h1>

            <p className="mt-2 text-sm leading-7 text-slate-500">
              مدیریت پروفایل، نقش‌ها و تنظیمات شرکت.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadSettings();
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw
              size={17}
            />

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
        {/* Profile */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <UserRound
                size={21}
              />
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
                        key={
                          role.id
                        }
                        className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"
                      >
                        {role.name}
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

        {/* Company */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Building2
                size={21}
              />
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
                className="mt-1 text-sm font-semibold text-slate-700"
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
                className="mt-1 text-sm font-semibold text-slate-700"
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
                <CheckCircle2
                  size={14}
                />

                {overview?.company
                  ?.is_active
                  ? "فعال"
                  : "غیرفعال"}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Roles & access */}
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
                  <UserRound
                    size={15}
                  />

                  مدیریت کاربران
                </Link>
              )}

              {canManageSettings && (
                <Link
                  href="/settings/roles"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
                >
                  <ShieldCheck
                    size={15}
                  />

                  مدیریت نقش‌ها و دسترسی‌ها
                </Link>
              )}

              {!canManageUsers &&
                !canManageSettings && (
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
                    {role.name}
                  </p>

                  <p
                    dir="ltr"
                    className="mt-1 text-[11px] text-slate-400"
                  >
                    {role.slug}
                  </p>

                  {role.description && (
                    <p className="mt-3 text-xs leading-6 text-slate-500">
                      {
                        role.description
                      }
                    </p>
                  )}
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

      {/* Company settings */}
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

          {!canManageSettings && (
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
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <p
                    dir="ltr"
                    className="text-sm font-black text-slate-800"
                  >
                    {setting.key}
                  </p>

                  {setting.description && (
                    <p className="mt-1 text-xs leading-6 text-slate-400">
                      {
                        setting.description
                      }
                    </p>
                  )}
                </div>

                <div
                  dir="ltr"
                  className="max-w-full text-left text-xs font-medium text-slate-600 md:max-w-[65%]"
                >
                  {formatSettingValue(
                    setting.value
                  )}
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
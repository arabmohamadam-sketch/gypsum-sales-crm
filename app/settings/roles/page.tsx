"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";

import {
  usePermissions,
} from "@/src/lib/hooks/usePermissions";

import {
  rolePermissionsService,
  type RolePermissionItem,
  type RolePermissionRole,
} from "@/src/lib/services/role-permissions";

const RESOURCE_LABELS: Record<
  string,
  string
> = {
  admin: "مدیریت سیستم",
  customers: "مشتریان",
  orders: "سفارش‌ها",
  targets: "اهداف فروش",
  reports: "گزارش‌ها",
  ai: "هوش مصنوعی",
  settings: "تنظیمات",
  users: "کاربران",
};

const ACTION_LABELS: Record<
  string,
  string
> = {
  full_access: "دسترسی کامل",
  read: "مشاهده",
  write: "ایجاد و ویرایش",
};

function getErrorMessage(error: unknown): string {
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

  return "خطا در انجام عملیات.";
}

export default function SettingsRolesPage() {
  const {
    loading: permissionsLoading,
    error: permissionsError,
    hasPermission,
  } = usePermissions();

  const canReadSettings =
    hasPermission("settings.read");

  const canManageSettings =
    hasPermission("settings.write");

  const [roles, setRoles] = useState<
    RolePermissionRole[]
  >([]);

  const [permissions, setPermissions] =
    useState<RolePermissionItem[]>([]);

  const [rolePermissionIds, setRolePermissionIds] =
    useState<Record<string, string[]>>({});

  const [selectedRoleId, setSelectedRoleId] =
    useState<string>("");

  const [selectedPermissionIds, setSelectedPermissionIds] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  async function loadData() {
    if (!canReadSettings) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result =
        await rolePermissionsService.getData();

      setRoles(result.roles);
      setPermissions(result.permissions);
      setRolePermissionIds(
        result.rolePermissionIds
      );

      if (result.roles.length > 0) {
        setSelectedRoleId(
          (current) =>
            current &&
            result.roles.some(
              (role) =>
                role.id === current
            )
              ? current
              : result.roles[0].id
        );
      } else {
        setSelectedRoleId("");
      }
    } catch (err) {
      console.error(
        "Failed to load role permissions:",
        err
      );

      setError(
        getErrorMessage(err)
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!permissionsLoading) {
      void loadData();
    }
  }, [
    permissionsLoading,
    canReadSettings,
  ]);

  useEffect(() => {
    if (!selectedRoleId) {
      setSelectedPermissionIds([]);
      return;
    }

    setSelectedPermissionIds(
      rolePermissionIds[
        selectedRoleId
      ] ?? []
    );

    setSuccess(null);
    setError(null);
  }, [
    selectedRoleId,
    rolePermissionIds,
  ]);

  const selectedRole = useMemo(
    () =>
      roles.find(
        (role) =>
          role.id ===
          selectedRoleId
      ) ?? null,
    [roles, selectedRoleId]
  );

  const groupedPermissions =
    useMemo(() => {
      const groups: Record<
        string,
        RolePermissionItem[]
      > = {};

      for (const permission of permissions) {
        if (
          permission.slug ===
          "admin.full_access"
        ) {
          continue;
        }

        if (!groups[permission.resource]) {
          groups[permission.resource] = [];
        }

        groups[
          permission.resource
        ].push(permission);
      }

      return groups;
    }, [permissions]);

  function togglePermission(
    permissionId: string
  ) {
    if (!canManageSettings) {
      return;
    }

    setSuccess(null);

    setSelectedPermissionIds(
      (current) =>
        current.includes(permissionId)
          ? current.filter(
              (id) =>
                id !== permissionId
            )
          : [
              ...current,
              permissionId,
            ]
    );
  }

  async function handleSave() {
    if (
      !canManageSettings ||
      !selectedRoleId ||
      !selectedRole
    ) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await rolePermissionsService.updateRolePermissions(
        selectedRoleId,
        selectedPermissionIds
      );

      setRolePermissionIds(
        (current) => ({
          ...current,
          [selectedRoleId]:
            selectedPermissionIds,
        })
      );

      setSuccess(
        `دسترسی‌های نقش «${selectedRole.name}» با موفقیت ذخیره شد.`
      );
    } catch (err) {
      setError(
        getErrorMessage(err)
      );
    } finally {
      setSaving(false);
    }
  }

  function isPermissionSelected(
    permissionId: string
  ) {
    return selectedPermissionIds.includes(
      permissionId
    );
  }

  if (
    permissionsLoading ||
    loading
  ) {
    return (
      <main
        dir="rtl"
        className="flex min-h-[500px] items-center justify-center"
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <Loader2
              size={22}
              className="animate-spin text-blue-600"
            />
          </div>

          <p className="mt-4 text-sm font-bold text-slate-600">
            در حال دریافت نقش‌ها و دسترسی‌ها...
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
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/settings"
              className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900"
            >
              <ArrowRight size={17} />
              بازگشت به تنظیمات
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <ShieldCheck size={22} />
              </div>

              <div>
                <h1 className="text-2xl font-black text-slate-900">
                  نقش‌ها و سطح دسترسی
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  مدیریت دسترسی‌های هر نقش در CRM
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadData();
            }}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
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

      {success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-black text-slate-900">
              نقش‌ها
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              نقش شرکتی موردنظر را انتخاب کنید.
            </p>
          </div>

          <div className="space-y-2">
            {roles.map((role) => {
              const active =
                role.id === selectedRoleId;

              const permissionCount =
                (
                  rolePermissionIds[
                    role.id
                  ] ?? []
                ).length;

              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => {
                    setSelectedRoleId(
                      role.id
                    );
                  }}
                  className={`w-full rounded-2xl border p-4 text-right transition ${
                    active
                      ? "border-blue-200 bg-blue-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`text-sm font-black ${
                        active
                          ? "text-blue-800"
                          : "text-slate-800"
                      }`}
                    >
                      {role.name}
                    </span>

                    {active && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                        <Check size={14} />
                      </span>
                    )}
                  </div>

                  <p
                    dir="ltr"
                    className="mt-1 text-left text-[11px] text-slate-400"
                  >
                    {role.slug}
                  </p>

                  <div className="mt-3 text-xs font-bold text-slate-500">
                    {permissionCount.toLocaleString(
                      "fa-IR"
                    )}{" "}
                    دسترسی فعال
                  </div>
                </button>
              );
            })}

            {roles.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
                هیچ نقش شرکتی فعالی پیدا نشد.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {selectedRole ? (
            <>
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {selectedRole.name}
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {selectedRole.description ||
                      "مدیریت دسترسی‌های این نقش"}
                  </p>
                </div>

                {canManageSettings ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleSave();
                    }}
                    disabled={saving}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <Save size={17} />
                    )}

                    ذخیره دسترسی‌ها
                  </button>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                    فقط مشاهده
                  </span>
                )}
              </div>

              {selectedRole.slug ===
                "company_admin" && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-bold leading-6 text-amber-800">
                    این نقش مدیریتی است. دسترسی
                    `admin.full_access` در سطح سیستمی
                    مدیریت می‌شود و از این صفحه قابل
                    واگذاری یا حذف نیست.
                  </p>
                </div>
              )}

              <div className="mt-6 space-y-6">
                {Object.entries(
                  groupedPermissions
                ).map(
                  ([
                    resource,
                    resourcePermissions,
                  ]) => (
                    <div
                      key={resource}
                      className="rounded-2xl border border-slate-200 overflow-hidden"
                    >
                      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                        <h3 className="text-sm font-black text-slate-800">
                          {RESOURCE_LABELS[
                            resource
                          ] ||
                            resource}
                        </h3>
                      </div>

                      <div className="grid gap-3 p-4 md:grid-cols-2">
                        {resourcePermissions.map(
                          (permission) => {
                            const selected =
                              isPermissionSelected(
                                permission.id
                              );

                            return (
                              <label
                                key={
                                  permission.id
                                }
                                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                                  selected
                                    ? "border-blue-200 bg-blue-50"
                                    : "border-slate-200 bg-white hover:bg-slate-50"
                                } ${
                                  canManageSettings
                                    ? ""
                                    : "cursor-default"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    selected
                                  }
                                  disabled={
                                    !canManageSettings
                                  }
                                  onChange={() => {
                                    togglePermission(
                                      permission.id
                                    );
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />

                                <div className="min-w-0">
                                  <p className="text-sm font-black text-slate-800">
                                    {ACTION_LABELS[
                                      permission
                                        .action
                                    ] ||
                                      permission.action}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-400">
                                    {
                                      permission.description
                                    }
                                  </p>

                                  <p
                                    dir="ltr"
                                    className="mt-1 text-[10px] text-slate-400"
                                  >
                                    {
                                      permission.slug
                                    }
                                  </p>
                                </div>
                              </label>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </>
          ) : (
            <div className="flex min-h-[400px] items-center justify-center text-sm font-bold text-slate-400">
              یک نقش را برای مدیریت دسترسی انتخاب کنید.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
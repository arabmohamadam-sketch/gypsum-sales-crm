"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserRound,
  UserX,
} from "lucide-react";

import { usePermissions } from "@/src/lib/hooks/usePermissions";

import {
  userManagementService,
  type ManagedRole,
  type ManagedUser,
} from "@/src/lib/services/user-management";

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

function formatLastLogin(value: string | null): string {
  if (!value) {
    return "هنوز وارد نشده";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/*
 * این تابع pure است و هیچ stateای را تغییر نمی‌دهد.
 * بنابراین می‌تواند از داخل useEffect استفاده شود.
 */
function fetchUserManagementData() {
  return Promise.all([
    userManagementService.getUsers(),
    userManagementService.getRoles(),
  ]);
}

export default function SettingsUsersPage() {
  const {
    loading: permissionsLoading,
    error: permissionsError,
    hasPermission,
  } = usePermissions();

  const canReadUsers = hasPermission("users.read");
  const canManageUsers = hasPermission("users.write");

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<ManagedRole[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  /*
   * بارگذاری اولیه.
   * useEffect مستقیماً state را تغییر نمی‌دهد؛
   * تمام setStateها داخل then/catch/finally اجرا می‌شوند.
   */
  useEffect(() => {
    if (permissionsLoading || !canReadUsers) {
      return;
    }

    let cancelled = false;

    fetchUserManagementData()
      .then(([usersData, rolesData]) => {
        if (cancelled) {
          return;
        }

        setUsers(usersData);
        setRoles(rolesData);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }

        console.error(
          "Failed to load user management:",
          err
        );

        setError(getErrorMessage(err));
        setUsers([]);
        setRoles([]);
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [permissionsLoading, canReadUsers]);

  /*
   * بروزرسانی دستی.
   * چون از event handler فراخوانی می‌شود،
   * تغییر state در این تابع مجاز است.
   */
  async function loadData() {
    if (!canReadUsers) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [usersData, rolesData] =
        await fetchUserManagementData();

      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      console.error(
        "Failed to load user management:",
        err
      );

      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return users.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.full_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        item.email
          .toLowerCase()
          .includes(normalizedSearch) ||
        (item.phone ?? "").includes(
          normalizedSearch
        ) ||
        (item.job_title ?? "")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          item.is_active) ||
        (statusFilter === "inactive" &&
          !item.is_active);

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [users, search, statusFilter]);

  const activeUsersCount = useMemo(
    () =>
      users.filter(
        (user) => user.is_active
      ).length,
    [users]
  );

  const inactiveUsersCount = useMemo(
    () =>
      users.filter(
        (user) => !user.is_active
      ).length,
    [users]
  );

  async function handleToggleStatus(
    user: ManagedUser
  ) {
    if (!canManageUsers) {
      return;
    }

    try {
      setSavingUserId(user.id);
      setError(null);

      await userManagementService.updateUserStatus(
        user.id,
        !user.is_active
      );

      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? {
                ...item,
                is_active:
                  !item.is_active,
              }
            : item
        )
      );
    } catch (err) {
      setError(
        getErrorMessage(err)
      );
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleRoleChange(
    user: ManagedUser,
    roleId: string
  ) {
    if (
      !canManageUsers ||
      user.role_id === roleId
    ) {
      return;
    }

    try {
      setSavingUserId(user.id);
      setError(null);

      await userManagementService.updateUserRole(
        user.id,
        roleId
      );

      const selectedRole =
        roles.find(
          (role) =>
            role.id === roleId
        );

      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? {
                ...item,
                role_id:
                  selectedRole?.id ??
                  null,
                role_name:
                  selectedRole?.name ??
                  null,
                role_slug:
                  selectedRole?.slug ??
                  null,
              }
            : item
        )
      );
    } catch (err) {
      setError(
        getErrorMessage(err)
      );
    } finally {
      setSavingUserId(null);
    }
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
            در حال دریافت کاربران...
          </p>
        </div>
      </main>
    );
  }

  if (!canReadUsers) {
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
                شما مجوز مشاهده کاربران سیستم را ندارید.
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
      className="mx-auto max-w-[1500px] space-y-6"
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
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <UserRound size={22} />
              </div>

              <div>
                <h1 className="text-2xl font-black text-slate-900">
                  مدیریت کاربران
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  مدیریت اعضای شرکت و نقش‌های دسترسی
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadData();
            }}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
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

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400">
            کل کاربران
          </p>

          <p className="mt-2 text-2xl font-black text-slate-900">
            {users.length.toLocaleString(
              "fa-IR"
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-bold text-emerald-700">
            کاربران فعال
          </p>

          <p className="mt-2 text-2xl font-black text-emerald-800">
            {activeUsersCount.toLocaleString(
              "fa-IR"
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500">
            کاربران غیرفعال
          </p>

          <p className="mt-2 text-2xl font-black text-slate-700">
            {inactiveUsersCount.toLocaleString(
              "fa-IR"
            )}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(
                event.target.value
              );
            }}
            placeholder="جستجو بر اساس نام، ایمیل، موبایل یا سمت..."
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
          />

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(
                event.target.value as
                  | "all"
                  | "active"
                  | "inactive"
              );
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:border-blue-400"
          >
            <option value="all">
              همه کاربران
            </option>

            <option value="active">
              فعال
            </option>

            <option value="inactive">
              غیرفعال
            </option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                کاربران شرکت
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                نمایش{" "}
                {filteredUsers.length.toLocaleString(
                  "fa-IR"
                )}{" "}
                کاربر
              </p>
            </div>

            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
              {canManageUsers
                ? "قابل مدیریت"
                : "فقط مشاهده"}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-right">
                <th className="px-5 py-4 text-xs font-black text-slate-500">
                  کاربر
                </th>

                <th className="px-5 py-4 text-xs font-black text-slate-500">
                  تماس
                </th>

                <th className="px-5 py-4 text-xs font-black text-slate-500">
                  سمت
                </th>

                <th className="px-5 py-4 text-xs font-black text-slate-500">
                  نقش
                </th>

                <th className="px-5 py-4 text-xs font-black text-slate-500">
                  آخرین ورود
                </th>

                <th className="px-5 py-4 text-xs font-black text-slate-500">
                  وضعیت
                </th>

                <th className="px-5 py-4 text-xs font-black text-slate-500">
                  عملیات
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map(
                (user) => {
                  const isSaving =
                    savingUserId ===
                    user.id;

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                            <UserRound size={18} />
                          </div>

                          <div>
                            <p className="text-sm font-black text-slate-800">
                              {user.full_name}
                            </p>

                            <p
                              dir="ltr"
                              className="mt-1 text-xs text-slate-400"
                            >
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-600">
                          {user.phone ||
                            "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-600">
                          {user.job_title ||
                            "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {canManageUsers ? (
                          <select
                            value={
                              user.role_id ??
                              ""
                            }
                            disabled={
                              isSaving
                            }
                            onChange={(
                              event
                            ) => {
                              const value =
                                event
                                  .target
                                  .value;

                              if (!value) {
                                return;
                              }

                              void handleRoleChange(
                                user,
                                value
                              );
                            }}
                            className="h-10 min-w-[190px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-400 disabled:opacity-50"
                          >
                            <option
                              value=""
                              disabled
                            >
                              بدون نقش
                            </option>

                            {roles.map(
                              (
                                role
                              ) => (
                                <option
                                  key={
                                    role.id
                                  }
                                  value={
                                    role.id
                                  }
                                >
                                  {
                                    role.name
                                  }
                                </option>
                              )
                            )}
                          </select>
                        ) : (
                          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                            {user.role_name ||
                              "بدون نقش"}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-xs text-slate-500">
                          {formatLastLogin(
                            user.last_login_at
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {user.is_active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                            <CheckCircle2
                              size={14}
                            />
                            فعال
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
                            <UserX
                              size={14}
                            />
                            غیرفعال
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {canManageUsers ? (
                          <button
                            type="button"
                            disabled={
                              isSaving
                            }
                            onClick={() => {
                              void handleToggleStatus(
                                user
                              );
                            }}
                            className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              user.is_active
                                ? "bg-red-50 text-red-600 hover:bg-red-100"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {isSaving && (
                              <Loader2
                                size={14}
                                className="animate-spin"
                              />
                            )}

                            {user.is_active
                              ? "غیرفعال کردن"
                              : "فعال کردن"}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">
                            فقط مشاهده
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                }
              )}

              {filteredUsers.length ===
                0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-14 text-center"
                  >
                    <div className="text-sm font-bold text-slate-400">
                      کاربری با این مشخصات پیدا نشد.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
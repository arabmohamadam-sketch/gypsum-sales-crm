"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";

import {
  managementGovernanceService,
  type CapabilityDelegation,
  type ManagementCapability,
  type ManagementConsoleData,
} from "@/src/lib/services/management-governance";
import { formatJalaliDateTime } from "@/src/lib/utils/jalali";

const CAPABILITY_LABELS: Record<string, string> = {
  "regional_managers.manage": "مدیریت مدیران منطقه",
  "regions.manage": "مدیریت ساختار مناطق",
  "regions.reassign": "واگذاری و جابه‌جایی مناطق",
  "customers.reassign": "جابه‌جایی مالکیت مشتریان",
  "targets.manage": "مدیریت اهداف و پلن‌های ماهانه",
  "plan_areas.manage": "مدیریت واحدهای برنامه فروش",
  "sales_portfolios.manage": "مدیریت سبدهای فروش",
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

  return "خطا در مدیریت ساختار سازمانی.";
}

function getCapabilityLabel(capability: string): string {
  return CAPABILITY_LABELS[capability] ?? capability;
}

function activeDelegation(
  delegations: CapabilityDelegation[],
  userId: string,
  capability: string
): CapabilityDelegation | null {
  return (
    delegations.find(
      (item) =>
        item.user_id === userId &&
        item.capability === capability &&
        item.revoked_at === null
    ) ?? null
  );
}

export default function ManagementSettingsPage() {
  const [data, setData] = useState<ManagementConsoleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingCeo, setSavingCeo] = useState(false);
  const [savingCapability, setSavingCapability] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedCeoUserId, setSelectedCeoUserId] = useState("");
  const [ceoReason, setCeoReason] = useState("");

  const [selectedManagerByCapability, setSelectedManagerByCapability] =
    useState<Record<string, string>>({});
  const [reasonByCapability, setReasonByCapability] = useState<
    Record<string, string>
  >({});

  const loadData = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const result = await managementGovernanceService.getConsoleData();
      setData(result);
      setSelectedCeoUserId(result.governance.ceo_user_id ?? "");
    } catch (err) {
      console.error("Failed to load management governance console:", err);
      setData(null);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  const currentActiveDelegations = useMemo(
    () =>
      data?.delegations.filter((item) => item.revoked_at === null) ?? [],
    [data]
  );

  async function handleCeoSave() {
    if (!data) {
      return;
    }

    const targetUserId = selectedCeoUserId.trim();

    if (!targetUserId) {
      setError("مدیرعامل را انتخاب کنید.");
      setSuccess(null);
      return;
    }

    try {
      setSavingCeo(true);
      setError(null);
      setSuccess(null);

      await managementGovernanceService.setCompanyCeo(
        data.company_id,
        targetUserId,
        ceoReason
      );

      setSuccess("ساختار مدیرعامل با موفقیت از داخل نرم‌افزار ثبت شد.");
      setCeoReason("");
      await loadData(true);
    } catch (err) {
      console.error("Failed to save CEO assignment:", err);
      setError(getErrorMessage(err));
    } finally {
      setSavingCeo(false);
    }
  }

  async function handleCapabilityGrant(
    capability: ManagementCapability,
    managerId: string
  ) {
    const current = activeDelegation(data?.delegations ?? [], managerId, capability.capability);

    if (current) {
      setError("این دسترسی قبلاً برای همین مدیر فعال است.");
      setSuccess(null);
      return;
    }

    const reason = reasonByCapability[capability.capability] ?? "";

    try {
      setSavingCapability(capability.capability);
      setError(null);
      setSuccess(null);

      await managementGovernanceService.grantCapability(
        managerId,
        capability.capability,
        reason
      );

      setSuccess(
        `دسترسی «${getCapabilityLabel(capability.capability)}» با موفقیت واگذار شد.`
      );

      setReasonByCapability((currentState) => ({
        ...currentState,
        [capability.capability]: "",
      }));

      await loadData(true);
    } catch (err) {
      console.error("Failed to grant management capability:", err);
      setError(getErrorMessage(err));
      setSuccess(null);
    } finally {
      setSavingCapability(null);
    }
  }

  async function handleCapabilityRevoke(
    delegation: CapabilityDelegation
  ) {
    const reason = reasonByCapability[delegation.capability] ?? "";

    try {
      setSavingCapability(delegation.capability);
      setError(null);
      setSuccess(null);

      await managementGovernanceService.revokeCapability(
        delegation.user_id,
        delegation.capability,
        reason
      );

      setSuccess(
        `دسترسی «${getCapabilityLabel(delegation.capability)}» از ${delegation.user_name} لغو شد.`
      );

      setReasonByCapability((currentState) => ({
        ...currentState,
        [delegation.capability]: "",
      }));

      await loadData(true);
    } catch (err) {
      console.error("Failed to revoke management capability:", err);
      setError(getErrorMessage(err));
      setSuccess(null);
    } finally {
      setSavingCapability(null);
    }
  }

  if (loading) {
    return (
      <main dir="rtl" className="flex min-h-[520px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <Loader2 size={24} className="animate-spin text-blue-600" />
          </div>
          <p className="mt-4 text-sm font-black text-slate-700">
            در حال دریافت تنظیمات مدیریت سازمان...
          </p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main dir="rtl" className="mx-auto max-w-[1200px]">
        <section className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">دسترسی محدود است</h1>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                این بخش فقط برای مدیرعامل یا مدیر کل مجاز قابل مشاهده است.
              </p>
              {error && (
                <p className="mt-3 text-xs leading-6 text-red-600">{error}</p>
              )}
              <Link
                href="/settings"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white"
              >
                <ArrowRight size={15} />
                بازگشت به تنظیمات
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const governanceReady = Boolean(data.governance.ceo_user_id);
  const canConfigureCeo = data.is_admin && !data.governance.ceo_bootstrap_completed_at;
  const canChangeCeo = data.is_ceo;
  const canManageCapabilities = data.is_ceo;

  return (
    <main dir="rtl" className="mx-auto max-w-[1450px] space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-slate-900" />
        <div className="flex flex-col gap-5 p-6 md:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-700"
            >
              <ArrowRight size={14} />
              تنظیمات
            </Link>
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
              <ShieldCheck size={15} />
              مدیریت سازمان
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
              حاکمیت و دسترسی‌های مدیریتی
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
              مدیرعامل می‌تواند بدون ورود به Supabase، مسئولیت‌ها و دسترسی‌های حساس مدیریتی را از داخل CRM کنترل کند.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData(true)}
            disabled={refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
            بروزرسانی
          </button>
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          {success}
        </div>
      )}

      {/* CEO governance */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Crown size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">مدیرعامل شرکت</h2>
              <p className="mt-1 text-xs leading-6 text-slate-400">
                انتصاب اولیه یک‌بار انجام می‌شود؛ پس از آن فقط مدیرعامل فعلی می‌تواند مدیرعامل را تغییر دهد.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {governanceReady ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                <CheckCircle2 size={14} />
                مدیرعامل تعیین شده
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
                <XCircle size={14} />
                هنوز تعیین نشده
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-bold text-slate-400">مدیرعامل فعلی</p>
            <p className="mt-2 text-lg font-black text-slate-900">
              {data.governance.ceo_name ?? "هنوز تعیین نشده"}
            </p>
            {data.governance.ceo_role_name && (
              <p className="mt-1 text-xs font-bold text-slate-500">
                {data.governance.ceo_role_name}
              </p>
            )}
            {data.governance.ceo_assigned_at && (
              <p className="mt-3 text-xs text-slate-400">
                زمان انتصاب: {formatJalaliDateTime(data.governance.ceo_assigned_at)}
              </p>
            )}
            {data.governance.ceo_assigned_by_name && (
              <p className="mt-1 text-xs text-slate-400">
                ثبت توسط: {data.governance.ceo_assigned_by_name}
              </p>
            )}
          </div>

          {(canConfigureCeo || canChangeCeo) && (
            <div className="rounded-2xl border border-slate-200 p-5">
              <p className="text-sm font-black text-slate-900">
                {governanceReady ? "تغییر مدیرعامل" : "راه‌اندازی مدیرعامل"}
              </p>
              <p className="mt-1 text-xs leading-6 text-slate-400">
                انتخاب از بین کاربران فعال شرکت انجام می‌شود.
              </p>

              <select
                value={selectedCeoUserId}
                onChange={(event) => setSelectedCeoUserId(event.target.value)}
                disabled={savingCeo}
                className="mt-4 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-slate-400"
              >
                <option value="">انتخاب مدیرعامل</option>
                {data.eligible_ceo_users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} {user.role_name ? `— ${user.role_name}` : ""}
                  </option>
                ))}
              </select>

              <textarea
                value={ceoReason}
                onChange={(event) => setCeoReason(event.target.value)}
                rows={3}
                disabled={savingCeo}
                placeholder="علت ثبت یا تغییر مدیرعامل"
                className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 outline-none focus:border-slate-400"
              />

              <button
                type="button"
                onClick={() => void handleCeoSave()}
                disabled={savingCeo || !selectedCeoUserId}
                className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingCeo ? <Loader2 size={17} className="animate-spin" /> : <Crown size={17} />}
                ثبت مدیرعامل
              </button>
            </div>
          )}
        </div>

        {!canConfigureCeo && !canChangeCeo && (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-4 text-xs leading-6 text-slate-500">
            فقط مدیرعامل فعلی یا مدیر کل مجاز می‌تواند این بخش را تغییر دهد.
          </div>
        )}
      </section>

      {/* Capability delegation */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <KeyRound size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">واگذاری دسترسی‌های مدیریتی</h2>
              <p className="mt-1 text-xs leading-6 text-slate-400">
                هر قابلیت به‌صورت مستقل قابل واگذاری و لغو است؛ مدیرعامل به‌صورت ذاتی همه این قابلیت‌ها را دارد.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
            <UsersRound size={14} />
            مدیران فروش قابل واگذاری: {data.sales_managers.length}
          </span>
        </div>

        {!canManageCapabilities && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800">
            برای واگذاری یا لغو این دسترسی‌ها، کاربر باید مدیرعامل فعلی باشد.
          </div>
        )}

        <div className="mt-6 space-y-4">
          {data.capabilities.map((capability) => {
            const activeAssignments = currentActiveDelegations.filter(
              (item) => item.capability === capability.capability
            );
            const selectedManager =
              selectedManagerByCapability[capability.capability] ?? "";
            const reason = reasonByCapability[capability.capability] ?? "";

            return (
              <div
                key={capability.capability}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900">
                      {getCapabilityLabel(capability.capability)}
                    </h3>
                    <p className="mt-1 text-xs leading-6 text-slate-500">
                      {capability.description}
                    </p>
                    <p dir="ltr" className="mt-2 text-[11px] text-slate-400">
                      {capability.capability}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700">
                    قابلیت فعال
                  </span>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr_auto]">
                  <select
                    value={selectedManager}
                    onChange={(event) =>
                      setSelectedManagerByCapability((currentState) => ({
                        ...currentState,
                        [capability.capability]: event.target.value,
                      }))
                    }
                    disabled={!canManageCapabilities || savingCapability === capability.capability}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-slate-400 disabled:bg-slate-50"
                  >
                    <option value="">انتخاب مدیر فروش</option>
                    {data.sales_managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.full_name}
                      </option>
                    ))}
                  </select>

                  <input
                    value={reason}
                    onChange={(event) =>
                      setReasonByCapability((currentState) => ({
                        ...currentState,
                        [capability.capability]: event.target.value,
                      }))
                    }
                    disabled={!canManageCapabilities || savingCapability === capability.capability}
                    placeholder="علت واگذاری / لغو دسترسی"
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
                  />

                  <button
                    type="button"
                    onClick={() => void handleCapabilityGrant(capability, selectedManager)}
                    disabled={
                      !canManageCapabilities ||
                      !selectedManager ||
                      Boolean(
                        activeDelegation(
                          data.delegations,
                          selectedManager,
                          capability.capability
                        )
                      ) ||
                      savingCapability === capability.capability
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {savingCapability === capability.capability ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}
                    واگذاری
                  </button>
                </div>

                {activeAssignments.length > 0 ? (
                  <div className="mt-5 space-y-2">
                    <p className="text-xs font-black text-slate-500">واگذاری‌های فعال</p>
                    {activeAssignments.map((delegation) => (
                      <div
                        key={delegation.id}
                        className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200">
                            <UserRound size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800">
                              {delegation.user_name}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              ثبت: {formatJalaliDateTime(delegation.granted_at)} · توسط {delegation.granted_by_name}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              علت: {delegation.grant_reason}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleCapabilityRevoke(delegation)}
                          disabled={!canManageCapabilities || savingCapability === capability.capability}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-xs font-black text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <XCircle size={15} />
                          لغو دسترسی
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-400">
                    هیچ واگذاری فعالی برای این قابلیت ثبت نشده است.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Governance notes */}
      <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6 md:p-8">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 ring-1 ring-blue-100">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-blue-950">نکته کنترلی</h2>
            <p className="mt-2 text-xs leading-7 text-blue-900/70">
              این صفحه مستقیماً جدول‌های مدیریتی را ویرایش نمی‌کند. عملیات حساس از RPCهای امن Supabase عبور می‌کنند و مجوز نهایی در سمت دیتابیس کنترل می‌شود. لغو دسترسی نیز رکورد قبلی را حذف نمی‌کند و تاریخچه واگذاری باقی می‌ماند.
            </p>
            {data.governance.ceo_bootstrap_completed_at && (
              <p className="mt-2 text-[11px] font-bold text-blue-900/60">
                Bootstrap مدیرعامل: {formatJalaliDateTime(data.governance.ceo_bootstrap_completed_at)}
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

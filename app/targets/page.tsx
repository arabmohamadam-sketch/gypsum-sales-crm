"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

import { useTargets } from "@/src/lib/hooks/useTargets";
import {
  gregorianToJalali,
} from "@/src/lib/utils/jalali";

function formatNumber(
  value: number
): string {
  return new Intl.NumberFormat(
    "fa-IR"
  ).format(value);
}

function formatDecimal(
  value: number
): string {
  return new Intl.NumberFormat(
    "fa-IR",
    {
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function formatTonnage(
  value: number
): string {
  return `${formatDecimal(
    value
  )} تن`;
}

function clampRate(
  value: number
): number {
  return Math.max(
    0,
    Math.min(1, value)
  );
}

function getTodayJalali() {
  const jalali =
    gregorianToJalali(
      new Date()
    );

  return (
    jalali ?? {
      year: 1405,
      month: 1,
      day: 1,
    }
  );
}

function getMonthName(
  month: number
): string {
  const names = [
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
  ];

  return (
    names[month - 1] ??
    `ماه ${month}`
  );
}

function moveJalaliMonth(
  year: number,
  month: number,
  delta: number
): {
  year: number;
  month: number;
} {
  let nextYear = year;
  let nextMonth =
    month + delta;

  while (nextMonth > 12) {
    nextMonth -= 12;
    nextYear += 1;
  }

  while (nextMonth < 1) {
    nextMonth += 12;
    nextYear -= 1;
  }

  return {
    year: nextYear,
    month: nextMonth,
  };
}

function ProgressBar({
  rate,
}: {
  rate: number;
}) {
  const percentage = Math.round(
    rate * 100
  );

  return (
    <div className="min-w-[150px]">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="font-bold text-slate-500">
          تحقق
        </span>

        <span className="font-black text-slate-800">
          {formatNumber(
            percentage
          )}
          ٪
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{
            width: `${Math.min(
              percentage,
              100
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function TargetsPage() {
  const today =
    useMemo(
      () => getTodayJalali(),
      []
    );

  const [year, setYear] =
    useState(today.year);

  const [month, setMonth] =
    useState(today.month);

  const {
    targets,
    regions,
    salesUsers,
    loading,
    saving,
    error,
    refresh,
    createTarget,
    updateTarget,
    deleteTarget,
  } = useTargets(
    year,
    month
  );

  const [isFormOpen, setIsFormOpen] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [
    selectedUserId,
    setSelectedUserId,
  ] = useState("");

  const [
    selectedRegionId,
    setSelectedRegionId,
  ] = useState("");

  const [
    targetTonnage,
    setTargetTonnage,
  ] = useState("");

  const [notes, setNotes] =
    useState("");

  const [formError, setFormError] =
    useState<string | null>(
      null
    );

  const stats =
    useMemo(() => {
      const totalTarget =
        targets.reduce(
          (sum, target) =>
            sum +
            target.target_tonnage,
          0
        );

      const totalAchieved =
        targets.reduce(
          (sum, target) =>
            sum +
            target.achieved_tonnage,
          0
        );

      const totalOrders =
        targets.reduce(
          (sum, target) =>
            sum +
            target.order_count,
          0
        );

      const rate =
        totalTarget > 0
          ? totalAchieved /
            totalTarget
          : 0;

      return {
        totalTarget,
        totalAchieved,
        totalOrders,
        rate,
      };
    }, [targets]);

  function resetForm() {
    setEditingId(null);
    setSelectedUserId("");
    setSelectedRegionId("");
    setTargetTonnage("");
    setNotes("");
    setFormError(null);
  }

  function openCreateForm() {
    resetForm();
    setIsFormOpen(true);
  }

  function openEditForm(
    target: (
      typeof targets
    )[number]
  ) {
    setEditingId(
      target.id
    );

    setSelectedUserId(
      target.user_id
    );

    setSelectedRegionId(
      target.region_id ?? ""
    );

    setTargetTonnage(
      String(
        target.target_tonnage
      )
    );

    setNotes(
      target.notes ?? ""
    );

    setFormError(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setIsFormOpen(false);
    resetForm();
  }

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setFormError(null);

    const tonnage =
      Number(
        targetTonnage
      );

    if (!selectedUserId) {
      setFormError(
        "کارشناس فروش را انتخاب کنید."
      );
      return;
    }

    if (
      !Number.isFinite(
        tonnage
      ) ||
      tonnage <= 0
    ) {
      setFormError(
        "هدف تناژ باید بیشتر از صفر باشد."
      );
      return;
    }

    try {
      if (editingId) {
        await updateTarget(
          editingId,
          {
            user_id:
              selectedUserId,
            region_id:
              selectedRegionId ||
              null,
            target_year:
              year,
            target_month:
              month,
            target_tonnage:
              tonnage,
            notes:
              notes.trim() ||
              null,
          }
        );
      } else {
        await createTarget({
          user_id:
            selectedUserId,
          region_id:
            selectedRegionId ||
            null,
          target_year:
            year,
          target_month:
            month,
          target_tonnage:
            tonnage,
          notes:
            notes.trim() ||
            null,
        });
      }

      setIsFormOpen(false);
      resetForm();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "ثبت اطلاعات انجام نشد."
      );
    }
  }

  async function handleDelete(
    target: (
      typeof targets
    )[number]
  ) {
    const confirmed =
      window.confirm(
        `هدف ${target.user?.full_name ?? "این کاربر"} برای ${getMonthName(
          month
        )} ${year} حذف شود؟`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteTarget(
        target.id
      );
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "حذف هدف انجام نشد."
      );
    }
  }

  function goPreviousMonth() {
    const next =
      moveJalaliMonth(
        year,
        month,
        -1
      );

    setYear(next.year);
    setMonth(next.month);
  }

  function goNextMonth() {
    const next =
      moveJalaliMonth(
        year,
        month,
        1
      );

    setYear(next.year);
    setMonth(next.month);
  }

  function goCurrentMonth() {
    setYear(today.year);
    setMonth(today.month);
  }

  return (
    <main
      dir="rtl"
      className="mx-auto max-w-[1600px] space-y-6"
    >
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-slate-900" />

        <div className="p-6 md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
                <Target size={15} />
                مدیریت اهداف فروش
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                اهداف فروش ماهانه
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                هدف تناژ هر کارشناس و منطقه را
                ثبت کنید و میزان تحقق واقعی را
                بر اساس سفارش‌های قطعی ببینید.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={goPreviousMonth}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                title="ماه قبل"
              >
                <ChevronRight
                  size={18}
                />
              </button>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-center">
                <p className="text-xs font-bold text-slate-400">
                  دوره هدف
                </p>

                <p className="mt-0.5 text-sm font-black text-slate-900">
                  {getMonthName(
                    month
                  )}{" "}
                  {formatNumber(
                    year
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={goNextMonth}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                title="ماه بعد"
              >
                <ChevronLeft
                  size={18}
                />
              </button>

              <button
                type="button"
                onClick={goCurrentMonth}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowRight
                  size={16}
                />
                ماه جاری
              </button>

              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                <Plus size={17} />
                ثبت هدف
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="مجموع هدف"
          value={formatTonnage(
            stats.totalTarget
          )}
          description="مجموع اهداف ثبت‌شده برای این ماه"
          icon={<Target size={22} />}
        />

        <StatCard
          title="تحقق فروش"
          value={formatTonnage(
            stats.totalAchieved
          )}
          description="فروش قطعی ثبت‌شده"
          icon={
            <TrendingUp
              size={22}
            />
          }
        />

        <StatCard
          title="درصد تحقق"
          value={`${formatNumber(
            Math.round(
              stats.rate * 100
            )
          )}٪`}
          description="تحقق نسبت به مجموع هدف"
          icon={
            <Target
              size={22}
            />
          }
        />

        <StatCard
          title="تعداد سفارش"
          value={formatNumber(
            stats.totalOrders
          )}
          description="سفارش‌های قطعی این دوره"
          icon={
            <TrendingUp
              size={22}
            />
          }
        />
      </section>

      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </section>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              فهرست اهداف
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              {formatNumber(
                targets.length
              )}{" "}
              هدف برای{" "}
              {getMonthName(
                month
              )}{" "}
              {formatNumber(
                year
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void refresh()
            }
            disabled={loading}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:self-auto"
          >
            <RefreshCw
              size={16}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />
            بروزرسانی
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
              <Loader2
                size={20}
                className="animate-spin"
              />
              در حال دریافت اهداف...
            </div>
          </div>
        ) : targets.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Target
                size={28}
              />
            </div>

            <h3 className="mt-4 text-lg font-black text-slate-800">
              هنوز هدفی ثبت نشده است
            </h3>

            <p className="mt-2 max-w-md text-sm leading-7 text-slate-400">
              برای این ماه هدف فروش ثبت نشده.
              با دکمه «ثبت هدف» اولین هدف را
              اضافه کنید.
            </p>

            <button
              type="button"
              onClick={
                openCreateForm
              }
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
            >
              <Plus size={17} />
              ثبت اولین هدف
            </button>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-right">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr className="text-xs font-black text-slate-500">
                    <th className="px-5 py-4">
                      کارشناس فروش
                    </th>

                    <th className="px-5 py-4">
                      منطقه
                    </th>

                    <th className="px-5 py-4">
                      هدف
                    </th>

                    <th className="px-5 py-4">
                      تحقق
                    </th>

                    <th className="px-5 py-4">
                      سفارش
                    </th>

                    <th className="px-5 py-4">
                      درصد تحقق
                    </th>

                    <th className="px-5 py-4">
                      عملیات
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {targets.map(
                    (
                      target
                    ) => (
                      <tr
                        key={
                          target.id
                        }
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-5">
                          <div>
                            <p className="font-black text-slate-900">
                              {target
                                .user
                                ?.full_name ??
                                "کاربر نامشخص"}
                            </p>

                            {target
                              .user
                              ?.job_title && (
                              <p className="mt-1 text-xs text-slate-400">
                                {
                                  target
                                    .user
                                    .job_title
                                }
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                            {target
                              .region
                              ?.name ??
                              "کل مناطق"}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <span className="font-black text-slate-900">
                            {formatTonnage(
                              target.target_tonnage
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <span className="font-black text-emerald-700">
                            {formatTonnage(
                              target.achieved_tonnage
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <span className="font-bold text-slate-700">
                            {formatNumber(
                              target.order_count
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <ProgressBar
                            rate={
                              target.achievement_rate
                            }
                          />
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditForm(
                                  target
                                )
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                              title="ویرایش"
                            >
                              <Edit3
                                size={15}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void handleDelete(
                                  target
                                )
                              }
                              disabled={
                                saving
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                              title="حذف"
                            >
                              <Trash2
                                size={15}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-4 lg:hidden">
              {targets.map(
                (target) => (
                  <div
                    key={
                      target.id
                    }
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black text-slate-900">
                          {target
                            .user
                            ?.full_name ??
                            "کاربر نامشخص"}
                        </h3>

                        <p className="mt-1 text-xs text-slate-400">
                          {target
                            .region
                            ?.name ??
                            "کل مناطق"}
                        </p>
                      </div>

                      <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
                        {formatNumber(
                          Math.round(
                            target.achievement_rate *
                              100
                          )
                        )}
                        ٪
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">
                          هدف
                        </p>

                        <p className="mt-1 font-black text-slate-900">
                          {formatTonnage(
                            target.target_tonnage
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-emerald-50 p-3">
                        <p className="text-xs text-emerald-600">
                          تحقق
                        </p>

                        <p className="mt-1 font-black text-emerald-800">
                          {formatTonnage(
                            target.achieved_tonnage
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">
                          سفارش
                        </p>

                        <p className="mt-1 font-black text-slate-900">
                          {formatNumber(
                            target.order_count
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">
                          وضعیت
                        </p>

                        <p className="mt-1 font-black text-slate-900">
                          {target.achievement_rate >=
                          1
                            ? "هدف محقق شده"
                            : "در حال پیگیری"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <ProgressBar
                        rate={
                          clampRate(
                            target.achievement_rate
                          )
                        }
                      />
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openEditForm(
                            target
                          )
                        }
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700"
                      >
                        <Edit3
                          size={15}
                        />
                        ویرایش
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleDelete(
                            target
                          )
                        }
                        disabled={
                          saving
                        }
                        className="inline-flex items-center justify-center rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600"
                      >
                        <Trash2
                          size={15}
                        />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </section>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {editingId
                    ? "ویرایش هدف فروش"
                    : "ثبت هدف فروش"}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  {getMonthName(
                    month
                  )}{" "}
                  {formatNumber(
                    year
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeForm
                }
                disabled={saving}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-5 p-6"
            >
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  کارشناس فروش
                </label>

                <select
                  value={
                    selectedUserId
                  }
                  onChange={(event) =>
                    setSelectedUserId(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none transition focus:border-slate-400"
                >
                  <option value="">
                    انتخاب کارشناس فروش
                  </option>

                  {salesUsers.map(
                    (user) => (
                      <option
                        key={
                          user.id
                        }
                        value={
                          user.id
                        }
                      >
                        {
                          user.full_name
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  منطقه
                </label>

                <select
                  value={
                    selectedRegionId
                  }
                  onChange={(event) =>
                    setSelectedRegionId(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none transition focus:border-slate-400"
                >
                  <option value="">
                    کل مناطق
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
                        {
                          region.name
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  هدف تناژ
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={
                      targetTonnage
                    }
                    onChange={(
                      event
                    ) =>
                      setTargetTonnage(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="مثلاً ۵۰"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 pl-16 text-sm font-bold outline-none transition focus:border-slate-400"
                  />

                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    تن
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  توضیحات
                </label>

                <textarea
                  value={
                    notes
                  }
                  onChange={(
                    event
                  ) =>
                    setNotes(
                      event
                        .target
                        .value
                    )
                  }
                  rows={4}
                  placeholder="توضیحات مربوط به این هدف..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                />
              </div>

              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold leading-6 text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  disabled={saving}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  انصراف
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      در حال ذخیره...
                    </>
                  ) : (
                    <>
                      <Target
                        size={17}
                      />
                      {editingId
                        ? "ذخیره تغییرات"
                        : "ثبت هدف"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useActivities } from "@/src/lib/hooks/useActivities";
import { formatJalaliDateTime } from "@/src/lib/utils/jalali";

const statusLabels: Record<string, string> = {
  pending: "در انتظار",
  completed: "تکمیل شده",
  cancelled: "لغو شده",
  overdue: "عقب‌افتاده",
};

const priorityLabels: Record<string, string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
  urgent: "فوری",
};

function toPersianDigits(
  value: string | number
): string {
  return String(value).replace(
    /\d/g,
    (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]
  );
}

function getStatusLabel(
  value?: string | null
): string {
  if (!value) {
    return "—";
  }

  return (
    statusLabels[value] ??
    value
  );
}

function getPriorityLabel(
  value?: string | null
): string {
  if (!value) {
    return "—";
  }

  return (
    priorityLabels[value] ??
    value
  );
}

function getStatusClass(
  value?: string | null
): string {
  switch (value) {
    case "completed":
      return "bg-green-100 text-green-700";

    case "pending":
      return "bg-blue-100 text-blue-700";

    case "overdue":
      return "bg-red-100 text-red-700";

    case "cancelled":
      return "bg-gray-100 text-gray-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getPriorityClass(
  value?: string | null
): string {
  switch (value) {
    case "urgent":
      return "bg-red-100 text-red-700";

    case "high":
      return "bg-orange-100 text-orange-700";

    case "medium":
      return "bg-yellow-100 text-yellow-700";

    case "low":
      return "bg-green-100 text-green-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
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

  return "خطایی در دریافت پیگیری‌ها رخ داد.";
}

export default function FollowUpsPage() {
  const {
    followUps,
    followUpsLoading,
    followUpsError,
    completeFollowUp,
    deleteFollowUp,
  } = useActivities();

  const [search, setSearch] =
    useState("");

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const filteredFollowUps =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return followUps;
      }

      return followUps.filter(
        (followUp) => {
          const customerName =
            followUp.customer?.name ??
            "";

          const phone =
            followUp.customer?.phone ??
            "";

          const userName =
            followUp.user?.full_name ??
            "";

          const subject =
            followUp.subject ?? "";

          const notes =
            followUp.notes ?? "";

          const status =
            getStatusLabel(
              followUp.status
            );

          const priority =
            getPriorityLabel(
              followUp.priority
            );

          return [
            customerName,
            phone,
            userName,
            subject,
            notes,
            status,
            priority,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        }
      );
    }, [followUps, search]);

  const pendingCount =
    followUps.filter(
      (item) =>
        item.status === "pending"
    ).length;

  const completedCount =
    followUps.filter(
      (item) =>
        item.status === "completed"
    ).length;

  async function handleComplete(
    id: string
  ) {
    try {
      setActionLoading(
        `complete-${id}`
      );

      await completeFollowUp(id);
    } catch (error) {
      console.error(
        "خطا در تکمیل پیگیری:",
        error
      );

      window.alert(
        getErrorMessage(error)
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(
    id: string
  ) {
    const confirmed =
      window.confirm(
        "آیا از حذف این پیگیری اطمینان دارید؟"
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(
        `delete-${id}`
      );

      await deleteFollowUp(id);
    } catch (error) {
      console.error(
        "خطا در حذف پیگیری:",
        error
      );

      window.alert(
        getErrorMessage(error)
      );
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gray-50 p-4 md:p-6"
    >
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              پیگیری‌های مشتریان
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              مشاهده و مدیریت پیگیری‌های ثبت‌شده
            </p>
          </div>

          <div className="flex flex-wrap gap-2">

            <Link
              href="/activities"
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              فعالیت‌های فروش
            </Link>

            <Link
              href="/activities/follow-ups/new"
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              + ثبت پیگیری جدید
            </Link>

          </div>
        </div>

        {followUpsError && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

            <div className="font-semibold">
              خطا در دریافت پیگیری‌ها
            </div>

            <div className="mt-1">
              {followUpsError}
            </div>

          </div>
        )}

        <div className="mb-5 grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="text-sm text-gray-500">
              کل پیگیری‌ها
            </div>

            <div className="mt-2 text-2xl font-bold text-gray-900">
              {toPersianDigits(
                followUps.length
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="text-sm text-gray-500">
              در انتظار
            </div>

            <div className="mt-2 text-2xl font-bold text-blue-600">
              {toPersianDigits(
                pendingCount
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="text-sm text-gray-500">
              تکمیل‌شده
            </div>

            <div className="mt-2 text-2xl font-bold text-green-600">
              {toPersianDigits(
                completedCount
              )}
            </div>
          </div>

        </div>

        <div className="mb-5 rounded-2xl border bg-white p-4 shadow-sm">

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="جستجوی مشتری، شماره، مسئول، موضوع یا یادداشت..."
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />

        </div>

        {followUpsLoading && (
          <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
            <div className="text-gray-600">
              در حال دریافت پیگیری‌ها...
            </div>
          </div>
        )}

        {!followUpsLoading &&
          !followUpsError &&
          filteredFollowUps.length ===
            0 && (
            <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">

              <div className="text-4xl">
                📌
              </div>

              <h2 className="mt-4 text-lg font-semibold text-gray-900">
                پیگیری‌ای برای نمایش وجود ندارد
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                اولین پیگیری مشتری را ثبت کنید.
              </p>

              <Link
                href="/activities/follow-ups/new"
                className="mt-5 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700"
              >
                ثبت اولین پیگیری
              </Link>

            </div>
          )}

        {!followUpsLoading &&
          filteredFollowUps.length >
            0 && (
            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">

              <div className="overflow-x-auto">

                <table className="min-w-full text-right text-sm">

                  <thead className="border-b bg-gray-50">

                    <tr>

                      <th className="whitespace-nowrap px-5 py-4 font-semibold text-gray-700">
                        مشتری
                      </th>

                      <th className="whitespace-nowrap px-5 py-4 font-semibold text-gray-700">
                        موضوع
                      </th>

                      <th className="whitespace-nowrap px-5 py-4 font-semibold text-gray-700">
                        مسئول
                      </th>

                      <th className="whitespace-nowrap px-5 py-4 font-semibold text-gray-700">
                        زمان پیگیری
                      </th>

                      <th className="whitespace-nowrap px-5 py-4 font-semibold text-gray-700">
                        اولویت
                      </th>

                      <th className="whitespace-nowrap px-5 py-4 font-semibold text-gray-700">
                        وضعیت
                      </th>

                      <th className="whitespace-nowrap px-5 py-4 font-semibold text-gray-700">
                        عملیات
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-gray-100">

                    {filteredFollowUps.map(
                      (followUp) => (
                        <tr
                          key={
                            followUp.id
                          }
                          className="transition hover:bg-gray-50"
                        >

                          <td className="px-5 py-4">

                            <div className="font-medium text-gray-900">
                              {followUp.customer
                                ?.name ??
                                "مشتری نامشخص"}
                            </div>

                            {followUp.customer
                              ?.phone && (
                              <div className="mt-1 text-xs text-gray-500">
                                {toPersianDigits(
                                  followUp.customer
                                    .phone
                                )}
                              </div>
                            )}

                          </td>

                          <td className="px-5 py-4">

                            <div className="font-medium text-gray-800">
                              {followUp.subject ||
                                "بدون موضوع"}
                            </div>

                            {followUp.notes && (
                              <div className="mt-1 max-w-xs truncate text-xs text-gray-500">
                                {followUp.notes}
                              </div>
                            )}

                          </td>

                          <td className="px-5 py-4 text-gray-700">
                            {followUp.user
                              ?.full_name ??
                              "—"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-gray-700">
                            {formatJalaliDateTime(
                              followUp.scheduled_at
                            )}
                          </td>

                          <td className="px-5 py-4">

                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getPriorityClass(
                                followUp.priority
                              )}`}
                            >
                              {getPriorityLabel(
                                followUp.priority
                              )}
                            </span>

                          </td>

                          <td className="px-5 py-4">

                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                                followUp.status
                              )}`}
                            >
                              {getStatusLabel(
                                followUp.status
                              )}
                            </span>

                          </td>

                          <td className="whitespace-nowrap px-5 py-4">

                            <div className="flex flex-wrap gap-2">

                              {followUp.status !==
                                "completed" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleComplete(
                                      followUp.id
                                    )
                                  }
                                  disabled={
                                    actionLoading ===
                                    `complete-${followUp.id}`
                                  }
                                  className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {actionLoading ===
                                  `complete-${followUp.id}`
                                    ? "در حال تکمیل..."
                                    : "تکمیل"}
                                </button>
                              )}

                              <Link
                                href={`/activities/follow-ups/${followUp.id}/edit`}
                                className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-200"
                              >
                                ویرایش
                              </Link>

                              <button
                                type="button"
                                onClick={() =>
                                  void handleDelete(
                                    followUp.id
                                  )
                                }
                                disabled={
                                  actionLoading ===
                                  `delete-${followUp.id}`
                                }
                                className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {actionLoading ===
                                `delete-${followUp.id}`
                                  ? "در حال حذف..."
                                  : "حذف"}
                              </button>

                            </div>

                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>
          )}

      </div>
    </main>
  );
}
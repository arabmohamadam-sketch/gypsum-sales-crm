"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  targetsService,
  type CreateTargetInput,
  type MonthlyTarget,
  type TargetRegion,
  type TargetSalesUser,
  type UpdateTargetInput,
} from "@/src/lib/services/targets";

interface UseTargetsResult {
  targets: MonthlyTarget[];
  regions: TargetRegion[];
  salesUsers: TargetSalesUser[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createTarget: (
    input: CreateTargetInput
  ) => Promise<MonthlyTarget>;
  updateTarget: (
    targetId: string,
    input: UpdateTargetInput
  ) => Promise<MonthlyTarget>;
  deleteTarget: (
    targetId: string
  ) => Promise<void>;
}

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    const message = (
      error as {
        message?: unknown;
      }
    ).message;

    if (typeof message === "string") {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function useTargets(
  year: number,
  month: number
): UseTargetsResult {
  const [targets, setTargets] =
    useState<MonthlyTarget[]>([]);

  const [regions, setRegions] =
    useState<TargetRegion[]>([]);

  const [
    salesUsers,
    setSalesUsers,
  ] = useState<TargetSalesUser[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const refresh =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError(null);

          const [
            targetRows,
            regionRows,
          ] = await Promise.all([
            targetsService.getTargets(
              year,
              month
            ),
            targetsService.getRegions(),
          ]);

          setTargets(targetRows);
          setRegions(regionRows);

          const uniqueUsers =
            new Map<
              string,
              TargetSalesUser
            >();

          for (const target of targetRows) {
            if (
              target.user &&
              target.user.is_active
            ) {
              uniqueUsers.set(
                target.user.id,
                target.user
              );
            }
          }

          /*
           * برای اینکه فرم ثبت هدف
           * فقط به کاربرانی که در اهداف
           * قبلی وجود دارند محدود نشود،
           * لیست فروشندگان را از جدول users
           * مستقیم دریافت می‌کنیم.
           */

          const {
            data: users,
            error: usersError,
          } = await import(
            "@/src/lib/supabase"
          ).then(
            async ({
              createSupabaseClient,
            }) => {
              const supabase =
                createSupabaseClient();

              return supabase
                .from("users")
                .select(`
                  id,
                  full_name,
                  email,
                  phone,
                  job_title,
                  is_active
                `)
                .eq(
                  "company_id",
                  "11111111-1111-1111-1111-111111111111"
                )
                .eq(
                  "is_active",
                  true
                )
                .is(
                  "deleted_at",
                  null
                )
                .order(
                  "full_name",
                  {
                    ascending: true,
                  }
                );
            }
          );

          if (usersError) {
            throw usersError;
          }

          for (const user of users ?? []) {
            uniqueUsers.set(
              String(user.id),
              {
                id: String(user.id),
                full_name: String(
                  user.full_name
                ),
                email: String(
                  user.email
                ),
                phone: user.phone
                  ? String(user.phone)
                  : null,
                job_title:
                  user.job_title
                    ? String(
                        user.job_title
                      )
                    : null,
                is_active: Boolean(
                  user.is_active
                ),
              }
            );
          }

          setSalesUsers(
            Array.from(
              uniqueUsers.values()
            )
          );
        } catch (err) {
          console.error(
            "TARGETS LOAD ERROR:",
            err
          );

          setError(
            getErrorMessage(
              err,
              "خطا در دریافت اهداف فروش."
            )
          );
        } finally {
          setLoading(false);
        }
      },
      [year, month]
    );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [refresh]);

  const createTarget =
    useCallback(
      async (
        input: CreateTargetInput
      ) => {
        try {
          setSaving(true);
          setError(null);

          const created =
            await targetsService.createTarget(
              input
            );

          await refresh();

          return created;
        } catch (err) {
          console.error(
            "TARGET CREATE ERROR:",
            err
          );

          const message =
            getErrorMessage(
              err,
              "خطا در ثبت هدف فروش."
            );

          setError(message);

          throw err;
        } finally {
          setSaving(false);
        }
      },
      [refresh]
    );

  const updateTarget =
    useCallback(
      async (
        targetId: string,
        input: UpdateTargetInput
      ) => {
        try {
          setSaving(true);
          setError(null);

          const updated =
            await targetsService.updateTarget(
              targetId,
              input
            );

          await refresh();

          return updated;
        } catch (err) {
          console.error(
            "TARGET UPDATE ERROR:",
            err
          );

          const message =
            getErrorMessage(
              err,
              "خطا در ویرایش هدف فروش."
            );

          setError(message);

          throw err;
        } finally {
          setSaving(false);
        }
      },
      [refresh]
    );

  const deleteTarget =
    useCallback(
      async (
        targetId: string
      ) => {
        try {
          setSaving(true);
          setError(null);

          await targetsService.deleteTarget(
            targetId
          );

          await refresh();
        } catch (err) {
          console.error(
            "TARGET DELETE ERROR:",
            err
          );

          const message =
            getErrorMessage(
              err,
              "خطا در حذف هدف فروش."
            );

          setError(message);

          throw err;
        } finally {
          setSaving(false);
        }
      },
      [refresh]
    );

  return {
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
  };
}
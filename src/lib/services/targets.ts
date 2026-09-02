import { toGregorian, toJalaali, isValidJalaaliDate } from "jalaali-js";

import { createSupabaseClient } from "@/src/lib/supabase";

const COMPANY_ID =
  "11111111-1111-1111-1111-111111111111";

export interface TargetRegion {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export interface TargetSalesUser {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  is_active: boolean;
}

export interface MonthlyTarget {
  id: string;
  company_id: string;
  user_id: string;
  region_id: string | null;

  // مقدار نمایشی برای UI به صورت جلالی
  target_year: number;
  target_month: number;

  target_tonnage: number;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;

  user: TargetSalesUser | null;
  region: TargetRegion | null;

  achieved_tonnage: number;
  order_count: number;
  achievement_rate: number;
  last_calculated_at: string | null;
}

export interface CreateTargetInput {
  user_id: string;
  region_id?: string | null;

  // ورودی UI جلالی است
  target_year: number;
  target_month: number;

  target_tonnage: number;
  notes?: string | null;
}

export interface UpdateTargetInput {
  user_id?: string;
  region_id?: string | null;

  // ورودی UI جلالی است
  target_year?: number;
  target_month?: number;

  target_tonnage?: number;
  notes?: string | null;
}

interface TargetRow {
  id: string;
  company_id: string;
  user_id: string;
  region_id: string | null;

  // مقادیر DB میلادی هستند
  target_year: number;
  target_month: number;

  target_tonnage: number | string;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ProgressRow {
  id: string;
  company_id: string;
  user_id: string;
  region_id: string | null;

  // مقادیر DB میلادی هستند
  progress_year: number;
  progress_month: number;

  achieved_tonnage: number | string;
  target_tonnage: number | string;
  order_count: number | string;
  achievement_rate: number | string;
  last_calculated_at: string | null;
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

async function getCurrentUserId(): Promise<string | null> {
  const supabase = createSupabaseClient();

  const {
    data,
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.warn(
      "Unable to read authenticated user:",
      error
    );

    return null;
  }

  return data.user?.id ?? null;
}

/**
 * تبدیل سال/ماه جلالی به سال/ماه میلادی
 *
 * مثال:
 * 1405 / 6
 * =>
 * 2026 / 9
 */
function jalaliPeriodToGregorian(
  jalaliYear: number,
  jalaliMonth: number
): {
  year: number;
  month: number;
} {
  if (
    !Number.isInteger(jalaliYear) ||
    !Number.isInteger(jalaliMonth)
  ) {
    throw new Error(
      "سال و ماه جلالی باید عدد صحیح باشند."
    );
  }

  if (
    jalaliMonth < 1 ||
    jalaliMonth > 12
  ) {
    throw new Error(
      "ماه جلالی باید بین ۱ تا ۱۲ باشد."
    );
  }

  if (
    !isValidJalaaliDate(
      jalaliYear,
      jalaliMonth,
      1
    )
  ) {
    throw new Error(
      "تاریخ جلالی انتخاب‌شده معتبر نیست."
    );
  }

  const gregorian = toGregorian(
    jalaliYear,
    jalaliMonth,
    1
  );

  return {
    year: Number(gregorian.gy),
    month: Number(gregorian.gm),
  };
}

/**
 * تبدیل سال/ماه میلادی دیتابیس به سال/ماه جلالی برای UI
 */
function gregorianPeriodToJalali(
  gregorianYear: number,
  gregorianMonth: number
): {
  year: number;
  month: number;
} {
  if (
    !Number.isInteger(gregorianYear) ||
    !Number.isInteger(gregorianMonth)
  ) {
    throw new Error(
      "سال و ماه میلادی نامعتبر هستند."
    );
  }

  if (
    gregorianMonth < 1 ||
    gregorianMonth > 12
  ) {
    throw new Error(
      "ماه میلادی باید بین ۱ تا ۱۲ باشد."
    );
  }

  const jalali = toJalaali(
    gregorianYear,
    gregorianMonth,
    1
  );

  return {
    year: Number(jalali.jy),
    month: Number(jalali.jm),
  };
}

function normalizeRegion(
  region: TargetRegion | null | undefined
): TargetRegion | null {
  if (!region) {
    return null;
  }

  return {
    id: region.id,
    name: region.name,
    code: region.code,
    is_active: region.is_active,
  };
}

export const targetsService = {
  async getRegions(): Promise<TargetRegion[]> {
    const supabase =
      createSupabaseClient();

    const {
      data,
      error,
    } = await supabase
      .from("regions")
      .select(`
        id,
        name,
        code,
        is_active,
        sort_order
      `)
      .eq(
        "company_id",
        COMPANY_ID
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
        "sort_order",
        {
          ascending: true,
        }
      )
      .order(
        "name",
        {
          ascending: true,
        }
      );

    if (error) {
      console.error(
        "Error fetching target regions:",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در دریافت مناطق."
        )
      );
    }

    return (data ?? []).map(
      (row) => ({
        id: String(row.id),
        name: String(row.name),
        code: String(row.code),
        is_active: Boolean(
          row.is_active
        ),
      })
    );
  },

  async getTargets(
    year: number,
    month: number
  ): Promise<MonthlyTarget[]> {
    const supabase =
      createSupabaseClient();

    /*
     * UI جلالی است
     * DB میلادی است
     */
    const gregorianPeriod =
      jalaliPeriodToGregorian(
        year,
        month
      );

    const {
      data: targets,
      error: targetsError,
    } = await supabase
      .from("monthly_targets")
      .select(`
        id,
        company_id,
        user_id,
        region_id,
        target_year,
        target_month,
        target_tonnage,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at
      `)
      .eq(
        "company_id",
        COMPANY_ID
      )
      .eq(
        "target_year",
        gregorianPeriod.year
      )
      .eq(
        "target_month",
        gregorianPeriod.month
      )
      .is(
        "deleted_at",
        null
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

    if (targetsError) {
      console.error(
        "Error fetching monthly targets:",
        targetsError
      );

      throw new Error(
        getErrorMessage(
          targetsError,
          "خطا در دریافت اهداف فروش."
        )
      );
    }

    const targetRows =
      (targets ?? []) as TargetRow[];

    if (targetRows.length === 0) {
      return [];
    }

    const userIds =
      Array.from(
        new Set(
          targetRows.map(
            (row) =>
              row.user_id
          )
        )
      );

    const regionIds =
      Array.from(
        new Set(
          targetRows
            .map(
              (row) =>
                row.region_id
            )
            .filter(
              (
                value
              ): value is string =>
                Boolean(value)
            )
        )
      );

    const [
      usersResult,
      regionsResult,
      progressResult,
    ] = await Promise.all([
      supabase
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
          COMPANY_ID
        )
        .in(
          "id",
          userIds
        )
        .is(
          "deleted_at",
          null
        ),

      regionIds.length > 0
        ? supabase
            .from("regions")
            .select(`
              id,
              name,
              code,
              is_active
            `)
            .eq(
              "company_id",
              COMPANY_ID
            )
            .in(
              "id",
              regionIds
            )
            .is(
              "deleted_at",
              null
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),

      supabase
        .from("monthly_progress")
        .select(`
          id,
          company_id,
          user_id,
          region_id,
          progress_year,
          progress_month,
          achieved_tonnage,
          target_tonnage,
          order_count,
          achievement_rate,
          last_calculated_at
        `)
        .eq(
          "company_id",
          COMPANY_ID
        )
        .eq(
          "progress_year",
          gregorianPeriod.year
        )
        .eq(
          "progress_month",
          gregorianPeriod.month
        )
        .is(
          "deleted_at",
          null
        ),
    ]);

    if (usersResult.error) {
      throw new Error(
        getErrorMessage(
          usersResult.error,
          "خطا در دریافت کارشناسان فروش."
        )
      );
    }

    if (regionsResult.error) {
      throw new Error(
        getErrorMessage(
          regionsResult.error,
          "خطا در دریافت مناطق."
        )
      );
    }

    if (progressResult.error) {
      throw new Error(
        getErrorMessage(
          progressResult.error,
          "خطا در دریافت تحقق اهداف."
        )
      );
    }

    const usersMap =
      new Map<
        string,
        TargetSalesUser
      >();

    for (const user of
      usersResult.data ?? []) {
      usersMap.set(
        String(user.id),
        {
          id: String(user.id),
          full_name: String(
            user.full_name
          ),
          email: String(
            user.email
          ),
          phone:
            user.phone
              ? String(
                  user.phone
                )
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

    const regionsMap =
      new Map<
        string,
        TargetRegion
      >();

    for (const region of
      regionsResult.data ?? []) {
      regionsMap.set(
        String(region.id),
        {
          id: String(
            region.id
          ),
          name: String(
            region.name
          ),
          code: String(
            region.code
          ),
          is_active: Boolean(
            region.is_active
          ),
        }
      );
    }

    const progressMap =
      new Map<
        string,
        ProgressRow
      >();

    for (const progress of
      (progressResult.data ??
        []) as ProgressRow[]) {
      const key = [
        progress.user_id,
        progress.region_id ??
          "all",
      ].join(":");

      progressMap.set(
        key,
        progress
      );
    }

    return targetRows.map(
      (target) => {
        const progressKey = [
          target.user_id,
          target.region_id ??
            "all",
        ].join(":");

        const progress =
          progressMap.get(
            progressKey
          );

        /*
         * DB میلادی -> UI جلالی
         */
        const jalaliPeriod =
          gregorianPeriodToJalali(
            Number(
              target.target_year
            ),
            Number(
              target.target_month
            )
          );

        return {
          id:
            target.id,

          company_id:
            target.company_id,

          user_id:
            target.user_id,

          region_id:
            target.region_id,

          target_year:
            jalaliPeriod.year,

          target_month:
            jalaliPeriod.month,

          target_tonnage:
            Number(
              target.target_tonnage
            ),

          notes:
            target.notes,

          created_by:
            target.created_by,

          updated_by:
            target.updated_by,

          created_at:
            target.created_at,

          updated_at:
            target.updated_at,

          user:
            usersMap.get(
              target.user_id
            ) ?? null,

          region:
            target.region_id
              ? normalizeRegion(
                  regionsMap.get(
                    target.region_id
                  )
                )
              : null,

          achieved_tonnage:
            progress
              ? Number(
                  progress.achieved_tonnage
                )
              : 0,

          order_count:
            progress
              ? Number(
                  progress.order_count
                )
              : 0,

          achievement_rate:
            progress
              ? Number(
                  progress.achievement_rate
                )
              : 0,

          last_calculated_at:
            progress?.last_calculated_at ??
            null,
        };
      }
    );
  },

  async createTarget(
    input: CreateTargetInput
  ): Promise<MonthlyTarget> {
    const supabase =
      createSupabaseClient();

    const createdBy =
      await getCurrentUserId();

    /*
     * ورودی UI جلالی است
     * قبل از INSERT به میلادی تبدیل می‌شود
     *
     * 1405 / 6
     * =>
     * 2026 / 9
     */
    const gregorianPeriod =
      jalaliPeriodToGregorian(
        input.target_year,
        input.target_month
      );

    const {
      data,
      error,
    } = await supabase
      .from("monthly_targets")
      .insert({
        company_id:
          COMPANY_ID,

        user_id:
          input.user_id,

        region_id:
          input.region_id ??
          null,

        target_year:
          gregorianPeriod.year,

        target_month:
          gregorianPeriod.month,

        target_tonnage:
          input.target_tonnage,

        notes:
          input.notes ??
          null,

        created_by:
          createdBy,
      })
      .select(`
        id,
        company_id,
        user_id,
        region_id,
        target_year,
        target_month,
        target_tonnage,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      console.error(
        "Error creating monthly target:",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در ثبت هدف فروش."
        )
      );
    }

    if (!data) {
      throw new Error(
        "هدف ثبت شد اما اطلاعات آن دریافت نشد."
      );
    }

    /*
     * Trigger دیتابیس بعد از INSERT
     * monthly_progress را ایجاد/به‌روزرسانی می‌کند.
     *
     * سپس getTargets را اجرا می‌کنیم تا
     * اطلاعات کامل هدف + تحقق آن برگردد.
     */
    const targets =
      await this.getTargets(
        input.target_year,
        input.target_month
      );

    const created =
      targets.find(
        (target) =>
          target.id === data.id
      );

    if (!created) {
      throw new Error(
        "هدف ثبت شد اما اطلاعات آن دوباره بارگذاری نشد."
      );
    }

    return created;
  },

  async updateTarget(
    targetId: string,
    input: UpdateTargetInput
  ): Promise<MonthlyTarget> {
    const supabase =
      createSupabaseClient();

    const updatedBy =
      await getCurrentUserId();

    const {
      data: currentTarget,
      error:
        currentTargetError,
    } = await supabase
      .from("monthly_targets")
      .select(`
        id,
        target_year,
        target_month
      `)
      .eq(
        "id",
        targetId
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      )
      .single();

    if (currentTargetError) {
      throw new Error(
        getErrorMessage(
          currentTargetError,
          "هدف موردنظر پیدا نشد."
        )
      );
    }

    /*
     * مقدار فعلی دیتابیس میلادی است.
     * برای ساخت مقدار بعدی ابتدا آن را جلالی می‌کنیم.
     */
    const currentJalaliPeriod =
      gregorianPeriodToJalali(
        Number(
          currentTarget.target_year
        ),
        Number(
          currentTarget.target_month
        )
      );

    const nextJalaliYear =
      input.target_year ??
      currentJalaliPeriod.year;

    const nextJalaliMonth =
      input.target_month ??
      currentJalaliPeriod.month;

    /*
     * مقدار جدید را به میلادی تبدیل می‌کنیم
     * و همان را در DB ذخیره می‌کنیم.
     */
    const nextGregorianPeriod =
      jalaliPeriodToGregorian(
        nextJalaliYear,
        nextJalaliMonth
      );

    const {
      error,
    } = await supabase
      .from("monthly_targets")
      .update({
        ...(input.user_id !==
        undefined
          ? {
              user_id:
                input.user_id,
            }
          : {}),

        ...(input.region_id !==
        undefined
          ? {
              region_id:
                input.region_id,
            }
          : {}),

        target_year:
          nextGregorianPeriod.year,

        target_month:
          nextGregorianPeriod.month,

        ...(input.target_tonnage !==
        undefined
          ? {
              target_tonnage:
                input.target_tonnage,
            }
          : {}),

        ...(input.notes !==
        undefined
          ? {
              notes:
                input.notes,
            }
          : {}),

        updated_by:
          updatedBy,
      })
      .eq(
        "id",
        targetId
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      );

    if (error) {
      console.error(
        "Error updating monthly target:",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در ویرایش هدف فروش."
        )
      );
    }

    /*
     * چون مقدار ورودی UI جلالی است،
     * دوباره با همان مقدار جلالی getTargets را صدا می‌زنیم.
     */
    const targets =
      await this.getTargets(
        nextJalaliYear,
        nextJalaliMonth
      );

    const updated =
      targets.find(
        (target) =>
          target.id === targetId
      );

    if (!updated) {
      throw new Error(
        "هدف ویرایش شد اما اطلاعات آن دوباره بارگذاری نشد."
      );
    }

    return updated;
  },

  async deleteTarget(
    targetId: string
  ): Promise<void> {
    const supabase =
      createSupabaseClient();

    const now =
      new Date().toISOString();

    const updatedBy =
      await getCurrentUserId();

    const {
      data: target,
      error: targetError,
    } = await supabase
      .from("monthly_targets")
      .select(`
        id,
        company_id,
        user_id,
        region_id,
        target_year,
        target_month
      `)
      .eq(
        "id",
        targetId
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      )
      .single();

    if (targetError) {
      throw new Error(
        getErrorMessage(
          targetError,
          "هدف موردنظر پیدا نشد."
        )
      );
    }

    if (!target) {
      throw new Error(
        "هدف موردنظر پیدا نشد."
      );
    }

    const {
      error,
    } = await supabase
      .from("monthly_targets")
      .update({
        deleted_at:
          now,

        updated_by:
          updatedBy,

        updated_at:
          now,
      })
      .eq(
        "id",
        targetId
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      );

    if (error) {
      console.error(
        "Error deleting monthly target:",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در حذف هدف فروش."
        )
      );
    }

    console.log(
      "Monthly target deleted:",
      {
        id:
          target.id,

        year:
          target.target_year,

        month:
          target.target_month,

        userId:
          target.user_id,

        regionId:
          target.region_id,
      }
    );
  },
};
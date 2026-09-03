import {
  isValidJalaaliDate,
  toGregorian,
} from "jalaali-js";

import { createSupabaseClient } from "@/src/lib/supabase";

const COMPANY_ID =
  "11111111-1111-1111-1111-111111111111";

export interface MonthlyTargetReportRegion {
  regionId: string;
  regionName: string;
  targetTonnage: number;
  achievedTonnage: number;
  orderCount: number;
  achievementRate: number;
}

export interface MonthlyTargetReport {
  year: number;
  month: number;

  targetTonnage: number;
  achievedTonnage: number;
  orderCount: number;
  achievementRate: number;
  remainingTonnage: number;

  regions: MonthlyTargetReportRegion[];
}

interface TargetRow {
  region_id: string | null;
  target_tonnage: number | string | null;
}

interface ProgressRow {
  region_id: string | null;
  achieved_tonnage: number | string | null;
  order_count: number | string | null;
}

interface RegionRow {
  id: string;
  name: string;
}

function getErrorMessage(
  error: unknown,
  fallback: string
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

  return fallback;
}

function toNumber(
  value: number | string | null | undefined
): number {
  const result = Number(value ?? 0);

  return Number.isFinite(result) ? result : 0;
}

/**
 * تعداد روز آخر ماه جلالی
 *
 * ماه‌های ۱ تا ۶ = ۳۱ روز
 * ماه‌های ۷ تا ۱۱ = ۳۰ روز
 * اسفند = ۲۹ یا ۳۰ روز
 */
function getJalaliMonthLastDay(
  jalaliYear: number,
  jalaliMonth: number
): number {
  if (
    jalaliMonth >= 1 &&
    jalaliMonth <= 6
  ) {
    return 31;
  }

  if (
    jalaliMonth >= 7 &&
    jalaliMonth <= 11
  ) {
    return 30;
  }

  return isValidJalaaliDate(
    jalaliYear,
    12,
    30
  )
    ? 30
    : 29;
}

/**
 * تبدیل سال/ماه جلالی به کلید سال/ماه میلادی دیتابیس
 *
 * قرارداد فعلی دیتابیس:
 * دوره جلالی بر اساس تاریخ انتهای همان ماه جلالی
 * به سال/ماه میلادی تبدیل می‌شود.
 *
 * مثال:
 * ۱۴۰۵/۰۶/۳۱
 * =
 * 2026-09-22
 * =
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
    jalaliYear < 1200 ||
    jalaliYear > 1600
  ) {
    throw new Error(
      "سال جلالی گزارش معتبر نیست."
    );
  }

  const lastDay =
    getJalaliMonthLastDay(
      jalaliYear,
      jalaliMonth
    );

  if (
    !isValidJalaaliDate(
      jalaliYear,
      jalaliMonth,
      lastDay
    )
  ) {
    throw new Error(
      "تاریخ جلالی انتخاب‌شده معتبر نیست."
    );
  }

  const gregorian = toGregorian(
    jalaliYear,
    jalaliMonth,
    lastDay
  );

  return {
    year: Number(gregorian.gy),
    month: Number(gregorian.gm),
  };
}

export const reportTargetsService = {
  async getMonthlyReport(
    year: number,
    month: number
  ): Promise<MonthlyTargetReport> {
    /*
     * UI با تقویم جلالی کار می‌کند،
     * اما monthly_targets و monthly_progress
     * در دیتابیس با سال/ماه میلادی ذخیره شده‌اند.
     *
     * مثال:
     * ۱۴۰۵ / ۶
     * =>
     * 2026 / 9
     */

    const gregorianPeriod =
      jalaliPeriodToGregorian(
        year,
        month
      );

    const supabase =
      createSupabaseClient();

    const [
      targetsResult,
      progressResult,
      regionsResult,
    ] = await Promise.all([
      supabase
        .from("monthly_targets")
        .select(
          `
            region_id,
            target_tonnage
          `
        )
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
        ),

      supabase
        .from("monthly_progress")
        .select(
          `
            region_id,
            achieved_tonnage,
            order_count
          `
        )
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

      supabase
        .from("regions")
        .select(
          `
            id,
            name
          `
        )
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
        ),
    ]);

    if (targetsResult.error) {
      console.error(
        "Error fetching monthly targets:",
        targetsResult.error
      );

      throw new Error(
        getErrorMessage(
          targetsResult.error,
          "خطا در دریافت اهداف ماهانه."
        )
      );
    }

    if (progressResult.error) {
      console.error(
        "Error fetching monthly progress:",
        progressResult.error
      );

      throw new Error(
        getErrorMessage(
          progressResult.error,
          "خطا در دریافت تحقق اهداف."
        )
      );
    }

    if (regionsResult.error) {
      console.error(
        "Error fetching regions:",
        regionsResult.error
      );

      throw new Error(
        getErrorMessage(
          regionsResult.error,
          "خطا در دریافت مناطق."
        )
      );
    }

    const targets =
      (targetsResult.data ??
        []) as TargetRow[];

    const progress =
      (progressResult.data ??
        []) as ProgressRow[];

    const regions =
      (regionsResult.data ??
        []) as RegionRow[];

    /*
     * مجموع هدف
     */

    const totalTarget =
      targets.reduce(
        (sum, item) =>
          sum +
          toNumber(
            item.target_tonnage
          ),
        0
      );

    /*
     * رکورد کلی
     */

    const overallProgress =
      progress.find(
        (item) =>
          item.region_id === null
      );

    let totalAchieved = 0;
    let totalOrders = 0;

    if (overallProgress) {
      totalAchieved =
        toNumber(
          overallProgress.achieved_tonnage
        );

      totalOrders =
        Math.round(
          toNumber(
            overallProgress.order_count
          )
        );
    } else {
      totalAchieved =
        progress.reduce(
          (sum, item) => {
            if (
              item.region_id === null
            ) {
              return sum;
            }

            return (
              sum +
              toNumber(
                item.achieved_tonnage
              )
            );
          },
          0
        );

      totalOrders =
        Math.round(
          progress.reduce(
            (sum, item) => {
              if (
                item.region_id === null
              ) {
                return sum;
              }

              return (
                sum +
                toNumber(
                  item.order_count
                )
              );
            },
            0
          )
        );
    }

    const totalAchievementRate =
      totalTarget > 0
        ? totalAchieved /
          totalTarget
        : 0;

    /*
     * گزارش مناطق
     */

    const regionReports =
      regions
        .map((region) => {
          const targetTonnage =
            targets
              .filter(
                (target) =>
                  target.region_id ===
                  region.id
              )
              .reduce(
                (sum, target) =>
                  sum +
                  toNumber(
                    target.target_tonnage
                  ),
                0
              );

          const regionProgress =
            progress.find(
              (item) =>
                item.region_id ===
                region.id
            );

          const achievedTonnage =
            toNumber(
              regionProgress?.achieved_tonnage
            );

          const orderCount =
            Math.round(
              toNumber(
                regionProgress?.order_count
              )
            );

          const achievementRate =
            targetTonnage > 0
              ? achievedTonnage /
                targetTonnage
              : 0;

          return {
            regionId: region.id,
            regionName: region.name,
            targetTonnage,
            achievedTonnage,
            orderCount,
            achievementRate,
          };
        })
        .filter(
          (region) =>
            region.targetTonnage > 0 ||
            region.achievedTonnage > 0
        );

    return {
      year,
      month,
      targetTonnage:
        totalTarget,
      achievedTonnage:
        totalAchieved,
      orderCount:
        totalOrders,
      achievementRate:
        totalAchievementRate,
      remainingTonnage:
        Math.max(
          totalTarget -
            totalAchieved,
          0
        ),
      regions:
        regionReports,
    };
  },
};
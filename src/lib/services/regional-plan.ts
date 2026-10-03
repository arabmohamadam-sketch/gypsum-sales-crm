import { getSupabaseClient } from "@/src/lib/supabase";
import {
  isValidJalaliDate,
  jalaliToGregorianDate,
} from "@/src/lib/utils/jalali";

export interface RegionalPlanRow {
  region_id: string | null;
  region_name: string;
  target_tonnage: number;
  achieved_tonnage: number;
  remaining_tonnage: number;
  achievement_rate: number | null;
  loaded_order_count: number;
}

export interface RegionalPlanResult {
  regions: RegionalPlanRow[];
  overall: RegionalPlanRow | null;
}

function getJalaliMonthLastDay(
  year: number,
  month: number,
): number {
  if (month <= 6) {
    return 31;
  }

  if (month <= 11) {
    return 30;
  }

  return isValidJalaliDate({
    year,
    month,
    day: 30,
  })
    ? 30
    : 29;
}

function toGregorianPlanPeriod(
  jalaliYear: number,
  jalaliMonth: number,
): {
  year: number;
  month: number;
} {
  if (
    !Number.isInteger(jalaliYear) ||
    !Number.isInteger(jalaliMonth) ||
    jalaliMonth < 1 ||
    jalaliMonth > 12
  ) {
    throw new Error(
      "دوره جلالی انتخاب‌شده نامعتبر است.",
    );
  }

  const lastDay = getJalaliMonthLastDay(
    jalaliYear,
    jalaliMonth,
  );

  const gregorian = jalaliToGregorianDate({
    year: jalaliYear,
    month: jalaliMonth,
    day: lastDay,
  });

  const parts = gregorian.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month)
  ) {
    throw new Error(
      "تبدیل دوره جلالی به میلادی ناموفق بود.",
    );
  }

  return {
    year,
    month,
  };
}

function toNumber(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function normalizeRow(
  value: unknown,
): RegionalPlanRow {
  const row =
    value &&
    typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  const regionId =
    typeof row.region_id === "string"
      ? row.region_id
      : null;

  const regionName =
    typeof row.region_name === "string"
      ? row.region_name
      : "نامشخص";

  const achievementRate =
    row.achievement_rate === null ||
    row.achievement_rate === undefined
      ? null
      : toNumber(row.achievement_rate);

  return {
    region_id: regionId,
    region_name: regionName,
    target_tonnage: toNumber(
      row.target_tonnage,
    ),
    achieved_tonnage: toNumber(
      row.achieved_tonnage,
    ),
    remaining_tonnage: toNumber(
      row.remaining_tonnage,
    ),
    achievement_rate: achievementRate,
    loaded_order_count: toNumber(
      row.loaded_order_count,
    ),
  };
}

export const regionalPlanService = {
  async getMyPlan(
    jalaliYear: number,
    jalaliMonth: number,
  ): Promise<RegionalPlanResult> {
    const supabase = getSupabaseClient();

    const period =
      toGregorianPlanPeriod(
        jalaliYear,
        jalaliMonth,
      );

    const {
      data,
      error,
    } = await supabase.rpc(
      "v2_get_my_regional_manager_plan",
      {
        p_year: period.year,
        p_month: period.month,
      },
    );

    if (error) {
      throw error;
    }

    const rows = Array.isArray(data)
      ? data.map(normalizeRow)
      : [];

    return {
      regions: rows.filter(
        (row) =>
          row.region_id !== null,
      ),
      overall:
        rows.find(
          (row) =>
            row.region_id === null,
        ) ?? null,
    };
  },
};

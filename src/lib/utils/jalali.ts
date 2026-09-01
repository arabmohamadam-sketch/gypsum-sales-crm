import {
  toGregorian,
  toJalaali,
  isValidJalaaliDate as isValidJalaaliDateLib,
} from "jalaali-js";

export interface JalaliDate {
  year: number;
  month: number;
  day: number;
}

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ENGLISH_DIGITS = "0123456789";

/**
 * تبدیل اعداد انگلیسی به فارسی
 *
 * مثال:
 * 1405 → ۱۴۰۵
 */
export function toPersianDigits(
  value: string | number
): string {
  return String(value).replace(
    /\d/g,
    (digit) => PERSIAN_DIGITS[Number(digit)]
  );
}

/**
 * تبدیل اعداد فارسی به انگلیسی
 *
 * مثال:
 * ۱۴۰۵ → 1405
 */
export function toEnglishDigits(
  value: string
): string {
  return value.replace(
    /[۰-۹]/g,
    (digit) =>
      ENGLISH_DIGITS[
        PERSIAN_DIGITS.indexOf(digit)
      ]
  );
}

/**
 * تبدیل تاریخ میلادی به جلالی
 *
 * ورودی:
 * - string
 * - Date
 * - null
 * - undefined
 *
 * خروجی:
 * JalaliDate | null
 */
export function gregorianToJalali(
  value: string | Date | null | undefined
): JalaliDate | null {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const {
    jy,
    jm,
    jd,
  } = toJalaali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );

  return {
    year: jy,
    month: jm,
    day: jd,
  };
}

/**
 * دریافت تاریخ امروز به تقویم جلالی
 */
export function getTodayJalali(): JalaliDate {
  const now = new Date();

  const {
    jy,
    jm,
    jd,
  } = toJalaali(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate()
  );

  return {
    year: jy,
    month: jm,
    day: jd,
  };
}

/**
 * نمایش تاریخ جلالی
 *
 * مثال:
 * ۱۴۰۵/۰۶/۰۵
 */
export function formatJalaliDate(
  value: string | Date | null | undefined
): string {
  const date = gregorianToJalali(value);

  if (!date) {
    return "-";
  }

  return `${toPersianDigits(
    date.year
  )}/${toPersianDigits(
    String(date.month).padStart(2, "0")
  )}/${toPersianDigits(
    String(date.day).padStart(2, "0")
  )}`;
}

/**
 * نمایش تاریخ و ساعت جلالی
 *
 * مثال:
 * ۱۴۰۵/۰۶/۰۵ - ۱۰:۳۰
 */
export function formatJalaliDateTime(
  value: string | Date | null | undefined
): string {
  if (!value) {
    return "-";
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const jalali =
    gregorianToJalali(date);

  if (!jalali) {
    return "-";
  }

  const hours = String(
    date.getHours()
  ).padStart(2, "0");

  const minutes = String(
    date.getMinutes()
  ).padStart(2, "0");

  return `${toPersianDigits(
    jalali.year
  )}/${toPersianDigits(
    String(jalali.month).padStart(2, "0")
  )}/${toPersianDigits(
    String(jalali.day).padStart(2, "0")
  )} - ${toPersianDigits(
    hours
  )}:${toPersianDigits(minutes)}`;
}

/**
 * بررسی معتبر بودن تاریخ جلالی
 *
 * مثال:
 * isValidJalaliDate({
 *   year: 1405,
 *   month: 6,
 *   day: 9
 * })
 */
export function isValidJalaliDate(
  date: JalaliDate
): boolean {
  if (
    !Number.isInteger(date.year) ||
    !Number.isInteger(date.month) ||
    !Number.isInteger(date.day)
  ) {
    return false;
  }

  if (
    date.year < 1300 ||
    date.year > 1500 ||
    date.month < 1 ||
    date.month > 12 ||
    date.day < 1 ||
    date.day > 31
  ) {
    return false;
  }

  return isValidJalaaliDateLib(
    date.year,
    date.month,
    date.day
  );
}

/**
 * تبدیل تاریخ جلالی به تاریخ میلادی
 *
 * ورودی:
 * سال، ماه، روز
 *
 * مثال:
 * jalaliToGregorian(1405, 6, 9)
 */
export function jalaliToGregorian(
  year: number,
  month: number,
  day: number
) {
  const jalaliDate: JalaliDate = {
    year,
    month,
    day,
  };

  if (!isValidJalaliDate(jalaliDate)) {
    throw new Error(
      "تاریخ جلالی نامعتبر است."
    );
  }

  return toGregorian(
    year,
    month,
    day
  );
}

/**
 * تبدیل تاریخ جلالی به رشته تاریخ میلادی
 *
 * مثال:
 * 2026-08-31
 */
export function jalaliToGregorianDate(
  date: JalaliDate
): string {
  const result =
    jalaliToGregorian(
      date.year,
      date.month,
      date.day
    );

  const pad = (
    value: number
  ) =>
    String(value).padStart(2, "0");

  return `${result.gy}-${pad(
    result.gm
  )}-${pad(result.gd)}`;
}
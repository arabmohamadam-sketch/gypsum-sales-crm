import * as XLSX from "xlsx";

import { readSheet } from "./excel";
import {
  mapExcelRow,
  type CustomerImportRow,
} from "./mapper";
import {
  normalizePhone,
  normalizeText,
} from "./normalize";
import { removeDuplicates } from "./deduplicate";

/**
 * فقط شهرهای تحت پوشش محمد عرب
 *
 * خمین عمداً حذف شده است.
 */
const SHEETS = [
  "گرمسار",
  "ورامین",
  "CRM(سمنان)",
] as const;

type SourceSheet = (typeof SHEETS)[number];

function normalizeCityName(
  sheetName: SourceSheet
): string {
  switch (sheetName) {
    case "گرمسار":
      return "گرمسار";

    case "ورامین":
      return "ورامین";

    case "CRM(سمنان)":
      return "سمنان";

    default:
      throw new Error(
        `شیت پشتیبانی‌نشده: ${sheetName}`
      );
  }
}

export async function analyzeWorkbook(
  workbook: XLSX.WorkBook
): Promise<CustomerImportRow[]> {
  let customers: CustomerImportRow[] = [];

  for (const sheetName of SHEETS) {
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      console.warn(
        `شیت پیدا نشد: ${sheetName}`
      );
      continue;
    }

    const rows: Record<string, unknown>[] =
      readSheet(
        workbook,
        sheetName
      ) as Record<string, unknown>[];

    const cityName =
      normalizeCityName(sheetName);

    console.log(
      `در حال تحلیل شیت ${sheetName}: ${rows.length} ردیف`
    );

    const mapped: CustomerImportRow[] =
      rows
        .map((row) => {
          const customer =
            mapExcelRow(
              row,
              cityName
            );

          return {
            ...customer,

            name: normalizeText(
              customer.name
            ),

            phone: normalizePhone(
              customer.phone
            ),
          };
        })
        .filter(
          (customer) =>
            customer.name.trim() !== ""
        );

    console.log(
      `${cityName}: ${mapped.length} مشتری`
    );

    customers.push(...mapped);
  }

  /**
   * حذف رکوردهای تکراری
   *
   * اولویت تشخیص Duplicate:
   * phone
   * سپس name + city
   */
  customers =
    removeDuplicates(customers);

  console.log(
    `تعداد مشتری بعد از حذف تکراری‌ها: ${customers.length}`
  );

  return customers;
}

/**
 * تحلیل آماری برای Dry Run
 * هیچ تغییری در دیتابیس ایجاد نمی‌کند.
 */
export function analyzeImportResult(
  customers: CustomerImportRow[]
) {
  const result = {
    total: customers.length,

    cities: {
      گرمسار: 0,
      ورامین: 0,
      سمنان: 0,
    },

    customerTypes: {
      building_material_store: 0,
      contractor: 0,
      employer: 0,
      plaster_worker: 0,
    },

    withPhone: 0,
    withoutPhone: 0,

    withLastContact: 0,
    withNextContact: 0,

    withLeadStatus: 0,
    withLeadSource: 0,
    withNotes: 0,
  };

  for (const customer of customers) {
    if (
      customer.cityName === "گرمسار"
    ) {
      result.cities.گرمسار++;
    }

    if (
      customer.cityName === "ورامین"
    ) {
      result.cities.ورامین++;
    }

    if (
      customer.cityName === "سمنان"
    ) {
      result.cities.سمنان++;
    }

    if (
      customer.customerType in
      result.customerTypes
    ) {
      result.customerTypes[
        customer.customerType as keyof typeof result.customerTypes
      ]++;
    }

    if (customer.phone) {
      result.withPhone++;
    } else {
      result.withoutPhone++;
    }

    if (customer.lastContact) {
      result.withLastContact++;
    }

    if (customer.nextContact) {
      result.withNextContact++;
    }

    if (customer.leadStatus) {
      result.withLeadStatus++;
    }

    if (customer.leadSource) {
      result.withLeadSource++;
    }

    if (customer.notes) {
      result.withNotes++;
    }
  }

  return result;
}
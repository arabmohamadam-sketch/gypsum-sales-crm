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

const SHEETS = [
  "گرمسار",
  "ورامین",
  "CRM(سمنان)",
] as const;

type SourceSheet =
  (typeof SHEETS)[number];

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
    const worksheet =
      workbook.Sheets[sheetName];

    if (!worksheet) {
      console.warn(
        `شیت پیدا نشد: ${sheetName}`
      );

      continue;
    }

    const rows =
      readSheet(
        workbook,
        sheetName
      ) as Record<
        string,
        unknown
      >[];

    const cityName =
      normalizeCityName(sheetName);

    console.log(
      `در حال تحلیل شیت ${sheetName}: ${rows.length} ردیف`
    );

    const mapped: CustomerImportRow[] =
      rows
        .map(
          (
            row
          ): CustomerImportRow => {
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
          }
        )
        .filter(
          (
            customer
          ): customer is CustomerImportRow =>
            customer.name.trim() !== ""
        );

    console.log(
      `${cityName}: ${mapped.length} مشتری`
    );

    customers.push(...mapped);
  }

  customers =
    removeDuplicates(customers);

  console.log(
    `تعداد مشتری بعد از حذف تکراری‌ها: ${customers.length}`
  );

  return customers;
}

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
    withoutLastContact: 0,
  };

  for (const customer of customers) {
    if (
      customer.cityName ===
      "Garmsar"
    ) {
      result.cities.گرمسار++;
    }

    if (
      customer.cityName ===
      "Varamin"
    ) {
      result.cities.ورامین++;
    }

    if (
      customer.cityName ===
      "Semnan"
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
    } else {
      result.withoutLastContact++;
    }
  }

  return result;
}
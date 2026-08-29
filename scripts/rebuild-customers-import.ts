import * as XLSX from "xlsx";
import fs from "node:fs";
import path from "node:path";

const inputPath = path.resolve("./data/دیتا.xlsx");
const outputPath = path.resolve("./data/customers_import.xlsx");

/**
 * فقط شهرهای تحت پوشش محمد عرب
 *
 * خمین عمداً در این لیست نیست.
 */
const SOURCE_SHEETS = [
  "گرمسار",
  "ورامین",
  "CRM(سمنان)",
] as const;

type CustomerRow = {
  name: string | null;
  company: string | null;
  customer_type_fa: string | null;
  phone: string | null;
  estimated_sales: string | null;
  last_contact: string | null;
  next_action: string | null;
  next_contact: string | null;
  lead_status: string | null;
  lead_source: string | null;
  notes: string | null;
  source_city: string;
};

/**
 * تبدیل مقدار Excel به متن تمیز
 */
function clean(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();

  return text === "" ? null : text;
}

/**
 * استانداردسازی شماره موبایل ایران
 */
function cleanPhone(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  let digits = String(value)
    .replace(/[^\d]/g, "")
    .trim();

  if (!digits) {
    return null;
  }

  // اگر شماره به صورت 9xxxxxxxxx ذخیره شده
  if (digits.length === 10 && digits.startsWith("9")) {
    digits = `0${digits}`;
  }

  // اگر با 0098 شروع شده
  if (digits.startsWith("0098")) {
    digits = `0${digits.slice(4)}`;
  }

  // اگر با 98 شروع شده
  if (digits.length === 12 && digits.startsWith("98")) {
    digits = `0${digits.slice(2)}`;
  }

  // شماره استاندارد موبایل ایران
  if (digits.length === 11 && digits.startsWith("09")) {
    return digits;
  }

  return digits;
}

/**
 * نام شهر واقعی برای ذخیره در فایل خروجی
 */
function normalizeCity(sheetName: string): string {
  switch (sheetName) {
    case "گرمسار":
      return "گرمسار";

    case "ورامین":
      return "ورامین";

    case "CRM(سمنان)":
      return "سمنان";

    default:
      return sheetName;
  }
}

/**
 * پیدا کردن فایل ورودی
 */
if (!fs.existsSync(inputPath)) {
  throw new Error(
    `فایل اصلی پیدا نشد:\n${inputPath}\n\n` +
      `بررسی کن که فایل دقیقاً با نام "دیتا.xlsx" داخل پوشه data باشد.`
  );
}

console.log("====================================");
console.log("شروع بازسازی اطلاعات مشتریان");
console.log("====================================");
console.log("");

console.log("فایل اصلی:");
console.log(inputPath);
console.log("");

/**
 * خواندن فایل اصلی
 */
const workbook = XLSX.readFile(inputPath, {
  cellDates: false,
  raw: true,
});

console.log("شیت‌های موجود در فایل اصلی:");
console.log(workbook.SheetNames);
console.log("");

/**
 * بررسی اینکه شیت‌های مورد نیاز وجود داشته باشند
 */
for (const sheetName of SOURCE_SHEETS) {
  if (!workbook.Sheets[sheetName]) {
    throw new Error(
      `شیت مورد نیاز پیدا نشد: ${sheetName}\n\n` +
        `شیت‌های موجود:\n${workbook.SheetNames.join("\n")}`
    );
  }
}

const customers: CustomerRow[] = [];

/**
 * پردازش شیت‌ها
 */
for (const sheetName of SOURCE_SHEETS) {
  const worksheet = workbook.Sheets[sheetName];

  console.log("------------------------------------");
  console.log(`در حال پردازش: ${sheetName}`);
  console.log(`Range: ${worksheet["!ref"] ?? "نامشخص"}`);

  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  console.log(`تعداد ردیف‌های شیت: ${rows.length}`);

  /**
   * ردیف 1 تا 4 قالب Excel هستند.
   * اطلاعات مشتری از ردیف 5 شروع می‌شود.
   */
  let importedFromSheet = 0;

  for (let index = 4; index < rows.length; index++) {
    const row = rows[index];

    if (!Array.isArray(row)) {
      continue;
    }

    /**
     * ساختار واقعی فایل:
     *
     * A = مشتری ها
     * B = شرکت
     * C = سمت
     * D = تلفن
     * E = فروش تخمینی
     * F = آخرین تماس
     * G = اقدام بعدی
     * H = تماس بعدی
     * I = وضعیت سرنخ
     * J = منبع سرنخ
     * K = یادداشت ها
     */

    const name = clean(row[0]);
    const company = clean(row[1]);
    const customerType = clean(row[2]);
    const phone = cleanPhone(row[3]);
    const estimatedSales = clean(row[4]);
    const lastContact = clean(row[5]);
    const nextAction = clean(row[6]);
    const nextContact = clean(row[7]);
    const leadStatus = clean(row[8]);
    const leadSource = clean(row[9]);
    const notes = clean(row[10]);

    /**
     * ردیف کاملاً خالی نباید وارد CRM شود.
     */
    const isCompletelyEmpty =
      !name &&
      !company &&
      !customerType &&
      !phone &&
      !estimatedSales &&
      !lastContact &&
      !nextAction &&
      !nextContact &&
      !leadStatus &&
      !leadSource &&
      !notes;

    if (isCompletelyEmpty) {
      continue;
    }

    /**
     * اگر فقط یادداشت یا اطلاعات ناقص وجود داشته
     * ولی نام مشتری وجود ندارد، وارد CRM نکن.
     */
    if (!name) {
      console.warn(
        `ردیف ${index + 1} در شیت ${sheetName} بدون نام مشتری رد شد.`
      );

      continue;
    }

    customers.push({
      name,
      company,
      customer_type_fa: customerType,
      phone,
      estimated_sales: estimatedSales,
      last_contact: lastContact,
      next_action: nextAction,
      next_contact: nextContact,
      lead_status: leadStatus,
      lead_source: leadSource,
      notes,
      source_city: normalizeCity(sheetName),
    });

    importedFromSheet++;
  }

  console.log(
    `مشتری استخراج‌شده از ${sheetName}: ${importedFromSheet}`
  );
}

/**
 * نتیجه
 */
console.log("");
console.log("====================================");
console.log("نتیجه استخراج");
console.log("====================================");

console.log(`تعداد کل مشتری‌ها: ${customers.length}`);
console.log("");

for (const city of ["گرمسار", "ورامین", "سمنان"]) {
  const count = customers.filter(
    (customer) => customer.source_city === city
  ).length;

  console.log(`${city}: ${count}`);
}

/**
 * اطمینان از اینکه خمین وارد خروجی نشده باشد
 */
const khomeinCount = customers.filter(
  (customer) => customer.source_city === "خمین"
).length;

if (khomeinCount > 0) {
  throw new Error(
    `خطا: ${khomeinCount} مشتری از خمین وارد خروجی شده است.`
  );
}

/**
 * اگر هیچ مشتری پیدا نشد، عملیات متوقف شود.
 */
if (customers.length === 0) {
  throw new Error(
    "هیچ مشتری‌ای استخراج نشد. ساختار فایل Excel را بررسی کن."
  );
}

/**
 * ساخت خروجی نهایی
 */
const outputRows = customers.map((customer) => ({
  name: customer.name,
  company: customer.company,
  customer_type_fa: customer.customer_type_fa,
  phone: customer.phone,
  estimated_sales: customer.estimated_sales,
  last_contact: customer.last_contact,
  next_action: customer.next_action,
  next_contact: customer.next_contact,
  lead_status: customer.lead_status,
  lead_source: customer.lead_source,
  notes: customer.notes,
  source_city: customer.source_city,
}));

const outputWorkbook = XLSX.utils.book_new();

const outputWorksheet = XLSX.utils.json_to_sheet(outputRows);

/**
 * عرض ستون‌ها
 */
outputWorksheet["!cols"] = [
  { wch: 28 }, // name
  { wch: 25 }, // company
  { wch: 18 }, // customer_type_fa
  { wch: 15 }, // phone
  { wch: 18 }, // estimated_sales
  { wch: 15 }, // last_contact
  { wch: 25 }, // next_action
  { wch: 15 }, // next_contact
  { wch: 18 }, // lead_status
  { wch: 18 }, // lead_source
  { wch: 60 }, // notes
  { wch: 15 }, // source_city
];

XLSX.utils.book_append_sheet(
  outputWorkbook,
  outputWorksheet,
  "Customers"
);

/**
 * ذخیره فایل
 */
XLSX.writeFile(outputWorkbook, outputPath);

console.log("");
console.log("====================================");
console.log("بازسازی با موفقیت انجام شد");
console.log("====================================");
console.log("");
console.log("فایل خروجی:");
console.log(outputPath);
console.log("");
console.log(`تعداد رکوردهای خروجی: ${customers.length}`);
console.log("");
console.log("شهرهای واردشده:");

for (const city of ["گرمسار", "ورامین", "سمنان"]) {
  const count = customers.filter(
    (customer) => customer.source_city === city
  ).length;

  console.log(`- ${city}: ${count}`);
}

console.log("");
console.log("خمین: حذف شد و وارد CRM نمی‌شود.");
console.log("");
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

// =========================================================
// تنظیمات اصلی
// =========================================================

const COMPANY_ID =
  "11111111-1111-1111-1111-111111111111";

const BATCH_SIZE = 50;

const inputPath = path.resolve(
  "./data/customers_import.xlsx"
);

// =========================================================
// شناسه واقعی شهرها در Supabase
// =========================================================
//
// این IDها مستقیماً از جدول public.cities گرفته شده‌اند.
// دیگر برای پیدا کردن شهرها Query جداگانه نمی‌زنیم.
// =========================================================

const CITY_IDS: Record<string, string> = {
  "گرمسار":
    "dd74dcfd-8a02-41d5-afb1-6ed577ffdace",

  "ورامین":
    "5ece982b-d075-43e1-900f-ede95fd23d55",

  "سمنان":
    "25ee2c4c-b7ee-43a0-88dc-d6a6f120dbc3",
};

// =========================================================
// خواندن .env.local
// =========================================================

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalIndex = trimmed.indexOf("=");

    if (equalIndex === -1) {
      continue;
    }

    const key = trimmed
      .slice(0, equalIndex)
      .trim();

    let value = trimmed
      .slice(equalIndex + 1)
      .trim();

    if (
      (value.startsWith('"') &&
        value.endsWith('"')) ||
      (value.startsWith("'") &&
        value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(
  path.resolve(".env.local")
);

loadEnvFile(
  path.resolve(".env")
);

// =========================================================
// تنظیمات Supabase
// =========================================================

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "متغیر NEXT_PUBLIC_SUPABASE_URL در .env.local پیدا نشد."
  );
}

if (!serviceRoleKey) {
  throw new Error(
    [
      "متغیر SUPABASE_SERVICE_ROLE_KEY در .env.local پیدا نشد.",
      "",
      "برای وارد کردن مستقیم مشتری‌ها به Supabase باید Service Role Key تنظیم شود.",
      "این کلید را داخل کد قرار نده و در Git Commit نکن.",
    ].join("\n")
  );
}

const normalizedUrl = supabaseUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/$/, "");

const supabase = createClient(
  normalizedUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// =========================================================
// Types
// =========================================================

type ImportRow = {
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
  source_city: string | null;
};

// =========================================================
// Normalize Text
// =========================================================

function normalizeText(
  value: unknown
): string {
  return String(value ?? "")
    .replace(/\u200c/g, "")
    .replace(/\u200f/g, "")
    .replace(/\u064a/g, "ی")
    .replace(/\u0649/g, "ی")
    .replace(/\u06cc/g, "ی")
    .replace(/\u0643/g, "ک")
    .replace(/\u06a9/g, "ک")
    .replace(/\u0640/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// =========================================================
// Clean
// =========================================================

function clean(
  value: unknown
): string | null {
  const text = normalizeText(value);

  return text === "" ? null : text;
}

// =========================================================
// Phone
// =========================================================

function cleanPhone(
  value: unknown
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  let digits = String(value)
    .replace(/[^\d]/g, "");

  if (!digits) {
    return null;
  }

  // 989xxxxxxxxx -> 09xxxxxxxxx
  if (
    digits.length === 12 &&
    digits.startsWith("98")
  ) {
    digits = `0${digits.slice(2)}`;
  }

  // 9xxxxxxxxx -> 09xxxxxxxxx
  if (
    digits.length === 10 &&
    digits.startsWith("9")
  ) {
    digits = `0${digits}`;
  }

  // 09xxxxxxxxx
  if (
    digits.length === 11 &&
    digits.startsWith("0")
  ) {
    return digits;
  }

  return digits;
}

// =========================================================
// City normalization
// =========================================================

function normalizeCity(
  value: unknown
): string | null {
  const city = normalizeText(value);

  if (!city) {
    return null;
  }

  if (
    city === "گرمسار" ||
    city.toLowerCase() === "garmsar"
  ) {
    return "گرمسار";
  }

  if (
    city === "ورامین" ||
    city.toLowerCase() === "varamin"
  ) {
    return "ورامین";
  }

  if (
    city === "سمنان" ||
    city.toLowerCase() === "semnan"
  ) {
    return "سمنان";
  }

  // خمین عمداً پشتیبانی نمی‌شود
  if (
    city === "خمین" ||
    city.toLowerCase() === "khomein"
  ) {
    return null;
  }

  return null;
}

// =========================================================
// Customer Type
// =========================================================

function mapCustomerType(
  value: string | null
): string {
  const type = normalizeText(value);

  if (!type) {
    return "building_material_store";
  }

  // مصالح فروش
  if (
    type.includes("مصالح") ||
    type.includes("مصالح فروش")
  ) {
    return "building_material_store";
  }

  // پیمانکار
  if (
    type.includes("پیمانکار")
  ) {
    return "contractor";
  }

  // کارفرما
  if (
    type.includes("کارفرما")
  ) {
    return "employer";
  }

  // گچکار
  if (
    type.includes("گچکار") ||
    type.includes("گچ کار")
  ) {
    return "plaster_worker";
  }

  // در صورت وجود نوع‌های دیگر
  if (
    type.includes("رئیس اتحادیه") ||
    type.includes("اتحادیه")
  ) {
    return "building_material_store";
  }

  console.warn(
    `نوع مشتری ناشناخته: "${type}" → building_material_store`
  );

  return "building_material_store";
}

// =========================================================
// Main
// =========================================================

async function main() {
  console.log("");
  console.log(
    "=============================================="
  );
  console.log(
    "وارد کردن مشتریان به Supabase"
  );
  console.log(
    "=============================================="
  );
  console.log("");

  // -------------------------------------------------------
  // فایل Excel
  // -------------------------------------------------------

  if (!fs.existsSync(inputPath)) {
    throw new Error(
      `فایل customers_import.xlsx پیدا نشد:\n${inputPath}`
    );
  }

  console.log("فایل ورودی:");
  console.log(inputPath);
  console.log("");

  // -------------------------------------------------------
  // Read Excel
  // -------------------------------------------------------

  const workbook = XLSX.readFile(
    inputPath,
    {
      cellDates: false,
    }
  );

  const sheet =
    workbook.Sheets["Customers"];

  if (!sheet) {
    throw new Error(
      'شیت "Customers" در customers_import.xlsx پیدا نشد.'
    );
  }

  const rows =
    XLSX.utils.sheet_to_json<ImportRow>(
      sheet,
      {
        defval: null,
      }
    );

  console.log(
    `تعداد رکوردهای Excel: ${rows.length}`
  );

  console.log("");

  if (rows.length === 0) {
    throw new Error(
      "هیچ رکوردی در فایل Excel وجود ندارد."
    );
  }

  // -------------------------------------------------------
  // Validate cities
  // -------------------------------------------------------

  const cityCounters: Record<
    string,
    number
  > = {
    "گرمسار": 0,
    "ورامین": 0,
    "سمنان": 0,
  };

  let rejectedByCity = 0;
  let rejectedWithoutName = 0;

  const validRows: ImportRow[] = [];

  for (const row of rows) {
    const name = clean(row.name);
    const city = normalizeCity(
      row.source_city
    );

    // بدون نام
    if (!name) {
      rejectedWithoutName++;
      continue;
    }

    // شهر غیرمجاز
    if (!city) {
      rejectedByCity++;
      continue;
    }

    cityCounters[city]++;

    validRows.push({
      ...row,
      name,
      source_city: city,
    });
  }

  console.log(
    "=============================================="
  );
  console.log(
    "بررسی شهرها"
  );
  console.log(
    "=============================================="
  );

  console.log(
    `گرمسار: ${cityCounters["گرمسار"]}`
  );

  console.log(
    `ورامین: ${cityCounters["ورامین"]}`
  );

  console.log(
    `سمنان: ${cityCounters["سمنان"]}`
  );

  console.log("");

  console.log(
    `رد شده به دلیل شهر غیرمجاز: ${rejectedByCity}`
  );

  console.log(
    `رد شده به دلیل نداشتن نام: ${rejectedWithoutName}`
  );

  console.log("");

  if (validRows.length === 0) {
    throw new Error(
      "هیچ رکورد معتبر برای ورود وجود ندارد."
    );
  }

  // -------------------------------------------------------
  // Existing customers
  // -------------------------------------------------------

  console.log(
    "دریافت مشتریان موجود از Supabase..."
  );

  const {
    data: existingCustomers,
    error: existingError,
  } = await supabase
    .from("customers")
    .select(
      "id,name,phone,city_id"
    )
    .eq(
      "company_id",
      COMPANY_ID
    )
    .is(
      "deleted_at",
      null
    );

  if (existingError) {
    throw existingError;
  }

  console.log(
    `تعداد مشتریان فعلی Supabase: ${
      existingCustomers?.length ?? 0
    }`
  );

  console.log("");

  // -------------------------------------------------------
  // Existing keys
  // -------------------------------------------------------

  const existingKeys =
    new Set<string>();

  for (
    const customer
    of existingCustomers ?? []
  ) {
    const name =
      normalizeText(
        customer.name
      ).toLowerCase();

    const phone =
      cleanPhone(
        customer.phone
      ) ?? "";

    const cityId =
      String(
        customer.city_id ?? ""
      );

    existingKeys.add(
      `${cityId}|${name}|${phone}`
    );
  }

  // -------------------------------------------------------
  // Build payload
  // -------------------------------------------------------

  const payload: any[] = [];

  let skippedExisting = 0;
  let skippedInvalid = 0;

  for (
    const row of validRows
  ) {
    const name =
      clean(row.name);

    const phone =
      cleanPhone(row.phone);

    const sourceCity =
      normalizeCity(
        row.source_city
      );

    if (
      !name ||
      !sourceCity
    ) {
      skippedInvalid++;
      continue;
    }

    const cityId =
      CITY_IDS[sourceCity];

    if (!cityId) {
      console.warn(
        `شهر بدون ID: ${sourceCity} → ${name}`
      );

      skippedInvalid++;
      continue;
    }

    const customerType =
      mapCustomerType(
        clean(
          row.customer_type_fa
        )
      );

    const key =
      `${cityId}|${name.toLowerCase()}|${
        phone ?? ""
      }`;

    if (
      existingKeys.has(key)
    ) {
      skippedExisting++;
      continue;
    }

    payload.push({
      company_id:
        COMPANY_ID,

      city_id:
        cityId,

      name,

      phone,

      whatsapp_number:
        phone,

      customer_type:
        customerType,

      preferred_contact_method:
        "phone",

      is_active:
        true,

      is_vip:
        false,

      lifetime_tonnage:
        0,

      average_monthly_tonnage:
        0,

      total_order_count:
        0,

      inactivity_days:
        0,

      metadata: {
        source:
          "customers_import.xlsx",

        source_city:
          sourceCity,

        company:
          clean(row.company),

        customer_type_fa:
          clean(
            row.customer_type_fa
          ),

        estimated_sales:
          clean(
            row.estimated_sales
          ),

        last_contact:
          clean(
            row.last_contact
          ),

        next_action:
          clean(
            row.next_action
          ),

        next_contact:
          clean(
            row.next_contact
          ),

        lead_status:
          clean(
            row.lead_status
          ),

        lead_source:
          clean(
            row.lead_source
          ),

        notes:
          clean(row.notes),
      },
    });

    // جلوگیری از تکرار در همین فایل
    existingKeys.add(key);
  }

  // -------------------------------------------------------
  // Summary
  // -------------------------------------------------------

  console.log(
    "=============================================="
  );
  console.log(
    "آماده‌سازی ورود"
  );
  console.log(
    "=============================================="
  );

  console.log(
    `رکوردهای معتبر Excel: ${validRows.length}`
  );

  console.log(
    `رکوردهای آماده ورود: ${payload.length}`
  );

  console.log(
    `مشتریان قبلاً موجود: ${skippedExisting}`
  );

  console.log(
    `رکوردهای نامعتبر: ${skippedInvalid}`
  );

  console.log("");

  if (payload.length === 0) {
    console.log(
      "هیچ مشتری جدیدی برای ورود وجود ندارد."
    );

    return;
  }

  // -------------------------------------------------------
  // Preview
  // -------------------------------------------------------

  const payloadStats: Record<
    string,
    number
  > = {
    "گرمسار": 0,
    "ورامین": 0,
    "سمنان": 0,
  };

  for (
    const customer
    of payload
  ) {
    const city =
      customer.metadata
        ?.source_city;

    if (
      city &&
      payloadStats[city] !== undefined
    ) {
      payloadStats[city]++;
    }
  }

  console.log(
    "توزیع رکوردهای آماده ورود:"
  );

  console.log(
    `گرمسار: ${payloadStats["گرمسار"]}`
  );

  console.log(
    `ورامین: ${payloadStats["ورامین"]}`
  );

  console.log(
    `سمنان: ${payloadStats["سمنان"]}`
  );

  console.log("");

  // -------------------------------------------------------
  // Insert batches
  // -------------------------------------------------------

  console.log(
    "شروع ورود مشتریان..."
  );

  console.log("");

  let imported = 0;

  for (
    let i = 0;
    i < payload.length;
    i += BATCH_SIZE
  ) {
    const batch =
      payload.slice(
        i,
        i + BATCH_SIZE
      );

    console.log(
      `در حال ورود Batch: ${
        i + 1
      } تا ${
        i + batch.length
      } از ${
        payload.length
      }`
    );

    const {
      error,
    } = await supabase
      .from("customers")
      .insert(batch);

    if (error) {
      console.error("");
      console.error(
        "خطا هنگام Insert:"
      );

      console.error(
        error
      );

      throw error;
    }

    imported +=
      batch.length;

    console.log(
      `✓ ${imported} / ${payload.length}`
    );

    console.log("");
  }

  // -------------------------------------------------------
  // Final verification
  // -------------------------------------------------------

  console.log(
    "=============================================="
  );

  console.log(
    "بررسی نهایی"
  );

  console.log(
    "=============================================="
  );

  const {
    data: finalCustomers,
    error: finalError,
  } =
    await supabase
      .from("customers")
      .select(
        "id,name,phone,city_id"
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      );

  if (finalError) {
    throw finalError;
  }

  console.log(
    `تعداد کل مشتریان فعال Supabase: ${
      finalCustomers?.length ?? 0
    }`
  );

  // -------------------------------------------------------
  // City statistics
  // -------------------------------------------------------

  const cityNameById:
    Record<string, string> = {
      "dd74dcfd-8a02-41d5-afb1-6ed577ffdace":
        "گرمسار",

      "5ece982b-d075-43e1-900f-ede95fd23d55":
        "ورامین",

      "25ee2c4c-b7ee-43a0-88dc-d6a6f120dbc3":
        "سمنان",
    };

  const finalStats:
    Record<string, number> = {
      "گرمسار": 0,
      "ورامین": 0,
      "سمنان": 0,
    };

  for (
    const customer
    of finalCustomers ?? []
  ) {
    const city =
      cityNameById[
        customer.city_id
      ];

    if (
      city &&
      finalStats[city] !== undefined
    ) {
      finalStats[city]++;
    }
  }

  console.log("");

  console.log(
    "توزیع مشتریان در Supabase:"
  );

  console.log(
    `گرمسار: ${finalStats["گرمسار"]}`
  );

  console.log(
    `ورامین: ${finalStats["ورامین"]}`
  );

  console.log(
    `سمنان: ${finalStats["سمنان"]}`
  );

  console.log("");

  // -------------------------------------------------------
  // خمین verification
  // -------------------------------------------------------

  const khomeinRows =
    rows.filter(
      (row) =>
        normalizeText(
          row.source_city
        ) === "خمین"
    ).length;

  console.log(
    `رکوردهای خمین در Excel: ${khomeinRows}`
  );

  console.log(
    "خمین در این عملیات وارد CRM نمی‌شود."
  );

  console.log("");

  console.log(
    "=============================================="
  );

  console.log(
    "✓ عملیات با موفقیت انجام شد"
  );

  console.log(
    "=============================================="
  );

  console.log("");

  console.log(
    `تعداد واردشده در این اجرا: ${imported}`
  );

  console.log("");
}

// =========================================================
// Run
// =========================================================

main().catch(
  (error) => {
    console.error("");

    console.error(
      "=============================================="
    );

    console.error(
      "❌ عملیات ناموفق بود"
    );

    console.error(
      "=============================================="
    );

    console.error("");

    if (
      error &&
      typeof error === "object"
    ) {
      console.error(
        JSON.stringify(
          error,
          null,
          2
        )
      );
    } else {
      console.error(
        error
      );
    }

    process.exit(1);
  }
);
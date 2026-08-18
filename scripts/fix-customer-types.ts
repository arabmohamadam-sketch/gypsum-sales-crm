import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const COMPANY_ID = "11111111-1111-1111-1111-111111111111";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");

    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.resolve(".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL پیدا نشد.");
}

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY پیدا نشد.");
}

const supabase = createClient(
  supabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, ""),
  serviceRoleKey
);

async function main() {
  console.log("");
  console.log("====================================");
  console.log("اصلاح نوع مشتریان");
  console.log("====================================");
  console.log("");

  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, name, metadata")
    .eq("company_id", COMPANY_ID)
    .is("deleted_at", null);

  if (error) throw error;

  console.log(`تعداد مشتریان بررسی‌شده: ${customers?.length ?? 0}`);
  console.log("");

  let fixed = 0;

  for (const customer of customers ?? []) {
    const metadata =
      customer.metadata &&
      typeof customer.metadata === "object"
        ? customer.metadata as Record<string, unknown>
        : {};

    const originalType = String(
      metadata.customer_type_fa ?? ""
    ).trim();

    let customerType: string | null = null;

    switch (originalType) {
      case "مصالح فروش":
      case "مصالح فروشی":
        customerType = "building_material_store";
        break;

      case "پیمانکار":
        customerType = "contractor";
        break;

      case "کارفرما":
        customerType = "employer";
        break;

      case "گچکار":
      case "گچ کار":
        customerType = "plaster_worker";
        break;

      case "سازنده":
        customerType = "contractor";
        break;

      case "مدیر پروژه مسکن ملی":
        customerType = "employer";
        break;

      case "رییس صنف سفیدکاران":
        customerType = "plaster_worker";
        break;

      default:
        continue;
    }

    const { error: updateError } = await supabase
      .from("customers")
      .update({
        customer_type: customerType,
      })
      .eq("id", customer.id);

    if (updateError) {
      console.error(
        `خطا در اصلاح ${customer.name}:`,
        updateError.message
      );
      continue;
    }

    fixed++;
  }

  console.log("");
  console.log("====================================");
  console.log("✓ اصلاح انجام شد");
  console.log("====================================");
  console.log("");
  console.log(`تعداد اصلاح‌شده: ${fixed}`);
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("❌ عملیات ناموفق بود");
  console.error("");
  console.error(
    error instanceof Error ? error.message : error
  );

  process.exit(1);
});
const COMPANY_ID = "11111111-1111-1111-1111-111111111111";

const CITY_IDS: Record<string, string> = {
  گرمسار: "dd74dcfd-8a02-41d5-afb1-6ed577ffdace",
  ورامین: "5ece982b-d075-43e1-900f-ede95fd23d55",
  سمنان: "25ee2c4c-b7ee-43a0-88dc-d6a6f120dbc3",

  Garmsar: "dd74dcfd-8a02-41d5-afb1-6ed577ffdace",
  Varamin: "5ece982b-d075-43e1-900f-ede95fd23d55",
  Semnan: "25ee2c4c-b7ee-43a0-88dc-d6a6f120dbc3",
};

const CITY_NAMES: Record<string, string> = {
  گرمسار: "Garmsar",
  ورامین: "Varamin",
  سمنان: "Semnan",

  Garmsar: "Garmsar",
  Varamin: "Varamin",
  Semnan: "Semnan",
};

function clean(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();

  return text === "" ? null : text;
}

function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) =>
      String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    )
    .replace(/[٠-٩]/g, (digit) =>
      String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))
    );
}

function normalizePhone(value: unknown): string | null {
  const cleaned = clean(value);

  if (!cleaned) {
    return null;
  }

  const digits = normalizeDigits(cleaned).replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  // 912xxxxxxx → 0912xxxxxxx
  if (digits.length === 10 && digits.startsWith("9")) {
    return `0${digits}`;
  }

  // 0098912xxxxxxx → 0912xxxxxxx
  if (digits.startsWith("0098") && digits.length === 14) {
    return `0${digits.slice(4)}`;
  }

  // +98912xxxxxxx → 0912xxxxxxx
  if (digits.startsWith("98") && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }

  // شماره استاندارد ایران
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits;
  }

  return digits;
}

function normalizeDate(value: unknown): string | null {
  const cleaned = clean(value);

  if (!cleaned) {
    return null;
  }

  return cleaned;
}

function mapCustomerType(type: unknown): string {
  const value = clean(type);

  if (!value) {
    return "building_material_store";
  }

  const normalized = value
    .replace(/\u200c/g, "")
    .replace(/\s+/g, " ")
    .trim();

  switch (normalized) {
    case "مصالح فروش":
    case "مصالح فروشی":
    case "مصالح‌فروش":
    case "مصالح‌فروشی":
      return "building_material_store";

    case "پیمانکار":
      return "contractor";

    case "کارفرما":
      return "employer";

    case "گچکار":
    case "گچ کار":
      return "plaster_worker";

    default:
      // مواردی مثل رئیس اتحادیه، سازنده و...
      // فعلاً به عنوان مصالح‌فروش ثبت می‌شوند
      // تا با enum دیتابیس ناسازگار نشوند.
      return "building_material_store";
  }
}

export interface CustomerImportRow {
  companyId: string;
  cityId: string;
  cityName: string;

  name: string;
  company: string | null;

  customerType: string;

  phone: string | null;
  whatsapp: string | null;

  estimatedSales: string | null;

  lastContact: string | null;
  nextAction: string | null;
  nextContact: string | null;

  leadStatus: string | null;
  leadSource: string | null;
  notes: string | null;
}

export function mapExcelRow(
  row: Record<string, unknown>,
  city: string
): CustomerImportRow {
  const cityId = CITY_IDS[city];
  const cityName = CITY_NAMES[city];

  if (!cityId || !cityName) {
    throw new Error(
      `شهر نامعتبر برای Import: ${city}`
    );
  }

  const name =
    clean(row["مشتری ها"]) ??
    clean(row["مشتری"]) ??
    clean(row["نام مشتری"]) ??
    "";

  return {
    companyId: COMPANY_ID,

    cityId,
    cityName,

    name,

    company: clean(row["شرکت"]),

    customerType: mapCustomerType(
      row["سمت"]
    ),

    phone: normalizePhone(
      row["تلفن"]
    ),

    whatsapp: normalizePhone(
      row["واتساپ"]
    ),

    estimatedSales: clean(
      row["فروش تخمینی"]
    ),

    lastContact: normalizeDate(
      row["آخرین تماس"]
    ),

    nextAction: clean(
      row["اقدام بعدی"]
    ),

    nextContact: normalizeDate(
      row["تماس بعدی"]
    ),

    leadStatus: clean(
      row["وضعیت سرنخ"]
    ),

    leadSource: clean(
      row["منبع سرنخ"]
    ),

    notes: clean(
      row["یادداشت ها"]
    ),
  };
}

export function getCityId(city: string): string {
  const cityId = CITY_IDS[city];

  if (!cityId) {
    throw new Error(
      `شناسه شهر پیدا نشد: ${city}`
    );
  }

  return cityId;
}

export function getCityName(city: string): string {
  const cityName = CITY_NAMES[city];

  if (!cityName) {
    throw new Error(
      `نام شهر معتبر نیست: ${city}`
    );
  }

  return cityName;
}
import { getRequiredCurrentCompanyId } from "@/src/lib/services/current-company";
import { sharedLocationService } from "@/src/lib/services/shared-location";
import {
  userManagementService,
  type ManagedUser,
} from "@/src/lib/services/user-management";
import { createSupabaseClient } from "@/src/lib/supabase";
import type {
  Customer,
  CustomerV2Completeness,
  CustomerV2PrimaryAddress,
} from "@/src/lib/types/customer";

export interface CustomerCity {
  id: string;
  company_id?: string | null;
  name: string;
  code?: string | null;
}

export interface V2RegionalManager {
  id: string;
  full_name: string;
  email: string;
  role_slug: "regional_manager";
  is_active: boolean;
}

export interface CustomerV2PrimaryAddressInput {
  province_code: string;
  province_name: string;
  city_code: string;
  city_name: string;
  address_line_1: string;
  address_line_2?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address_type?:
    | "billing"
    | "delivery"
    | "office"
    | "warehouse"
    | "other";
  label?: string | null;
}

export interface CustomerV2CreateInput {
  name: string;
  phone: string;
  secondary_phone?: string | null;
  whatsapp_number?: string | null;
  customer_type: string;
  national_id: string;
  regional_manager_id: string;

  /**
   * Sales-plan ownership is optional in V2.
   * Customer commercial ownership is defined independently
   * by regional_manager_id.
   */
  plan_scope?: "regional" | "out_of_region" | null;
  plan_region_id?: string | null;

  is_vip?: boolean;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
  primary_address: CustomerV2PrimaryAddressInput;
}

export interface CustomerV2UpdateInput {
  name?: string;
  phone?: string | null;
  secondary_phone?: string | null;
  whatsapp_number?: string | null;
  customer_type?: string;
  national_id?: string | null;
  regional_manager_id?: string | null;

  /**
   * Sales-plan ownership is optional in V2.
   */
  plan_scope?: "regional" | "out_of_region" | null;
  plan_region_id?: string | null;

  ownership_reason?: string;
  is_vip?: boolean;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
  primary_address?: CustomerV2PrimaryAddressInput;
}

export class CustomerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomerValidationError";
  }
}

function logSupabaseError(
  title: string,
  error: {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  }
) {
  console.error(title, {
    message: error?.message ?? "",
    details: error?.details ?? "",
    hint: error?.hint ?? "",
    code: error?.code ?? "",
  });
}

function normalizeDigits(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

  return value
    .trim()
    .replace(/[۰-۹٠-٩]/g, (digit) => {
      const persianIndex = persianDigits.indexOf(digit);

      if (persianIndex >= 0) {
        return String(persianIndex);
      }

      const arabicIndex = arabicDigits.indexOf(digit);

      if (arabicIndex >= 0) {
        return String(arabicIndex);
      }

      return digit;
    });
}

function normalizePhone(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  let normalized = normalizeDigits(value);

  normalized = normalized.replace(/[^\d+]/g, "");

  if (normalized.startsWith("+98")) {
    normalized = `0${normalized.slice(3)}`;
  } else if (normalized.startsWith("0098")) {
    normalized = `0${normalized.slice(4)}`;
  } else if (
    normalized.startsWith("98") &&
    normalized.length >= 10
  ) {
    normalized = `0${normalized.slice(2)}`;
  }

  return normalized;
}

function cleanPhoneValue(
  value: string | null | undefined
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function normalizeNationalId(
  value: string | null | undefined
): string {
  return normalizeDigits(value).replace(/\D/g, "");
}

function validateNationalId(
  value: string | null | undefined
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = normalizeNationalId(value);

  if (!normalized) {
    return null;
  }

  if (!/^\d{10}$/.test(normalized)) {
    throw new CustomerValidationError(
      "کد ملی باید دقیقاً ۱۰ رقم باشد."
    );
  }

  return normalized;
}

function cleanText(value: string | null | undefined): string {
  return (
    value
      ?.trim()
      .replace(/\u200c/g, " ")
      .replace(/ي/g, "ی")
      .replace(/ك/g, "ک")
      .replace(/\s+/g, " ") ?? ""
  );
}

function cleanNullableText(
  value: string | null | undefined
): string | null {
  const normalized = cleanText(value);

  return normalized || null;
}

async function validatePhoneDuplicates(
  phone: string | null | undefined,
  secondaryPhone: string | null | undefined,
  excludeCustomerId?: string
): Promise<void> {
  const companyId = await getRequiredCurrentCompanyId();

  const normalizedPhone = normalizePhone(phone);
  const normalizedSecondaryPhone =
    normalizePhone(secondaryPhone);

  if (
    normalizedPhone &&
    normalizedSecondaryPhone &&
    normalizedPhone === normalizedSecondaryPhone
  ) {
    throw new CustomerValidationError(
      "شماره تماس دوم نمی‌تواند با شماره تماس اصلی یکسان باشد."
    );
  }

  const numbersToCheck = [
    normalizedPhone,
    normalizedSecondaryPhone,
  ].filter(Boolean);

  if (numbersToCheck.length === 0) {
    return;
  }

  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, secondary_phone")
    .eq("company_id", companyId)
    .is("deleted_at", null);

  if (error) {
    logSupabaseError(
      "خطا در بررسی تکراری بودن شماره تلفن:",
      error
    );
    throw error;
  }

  const duplicateCustomers = (data ?? []).filter(
    (customer) => {
      if (
        excludeCustomerId &&
        String(customer.id) === excludeCustomerId
      ) {
        return false;
      }

      const existingPhone = normalizePhone(
        customer.phone
      );
      const existingSecondaryPhone = normalizePhone(
        customer.secondary_phone
      );

      return numbersToCheck.some(
        (number) =>
          number === existingPhone ||
          number === existingSecondaryPhone
      );
    }
  );

  if (duplicateCustomers.length === 0) {
    return;
  }

  const duplicateCustomer = duplicateCustomers[0];

  const duplicateName =
    typeof duplicateCustomer.name === "string"
      ? duplicateCustomer.name.trim()
      : "";

  if (duplicateName) {
    throw new CustomerValidationError(
      `این شماره تلفن قبلاً برای مشتری «${duplicateName}» ثبت شده است.`
    );
  }

  throw new CustomerValidationError(
    "این شماره تلفن قبلاً برای مشتری دیگری ثبت شده است."
  );
}

async function validateNationalIdDuplicate(
  nationalId: string,
  excludeCustomerId?: string
): Promise<void> {
  const companyId = await getRequiredCurrentCompanyId();
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("customers")
    .select("id, name")
    .eq("company_id", companyId)
    .eq("national_id", nationalId)
    .is("deleted_at", null);

  if (error) {
    logSupabaseError(
      "خطا در بررسی تکراری بودن کد ملی:",
      error
    );
    throw error;
  }

  const duplicates = (data ?? []).filter(
    (customer) =>
      !excludeCustomerId ||
      String(customer.id) !== excludeCustomerId
  );

  if (duplicates.length === 0) {
    return;
  }

  const customerName =
    typeof duplicates[0]?.name === "string"
      ? duplicates[0].name.trim()
      : "";

  if (customerName) {
    throw new CustomerValidationError(
      `این کد ملی قبلاً برای مشتری «${customerName}» ثبت شده است.`
    );
  }

  throw new CustomerValidationError(
    "این کد ملی قبلاً برای مشتری دیگری ثبت شده است."
  );
}

function mapPrimaryAddressRow(
  row: Record<string, unknown>
): CustomerV2PrimaryAddress {
  const addressType = row.address_type;

  const normalizedAddressType =
    addressType === "billing" ||
    addressType === "delivery" ||
    addressType === "office" ||
    addressType === "warehouse" ||
    addressType === "other"
      ? addressType
      : "office";

  return {
    id: String(row.id ?? ""),
    company_id: String(row.company_id ?? ""),
    customer_id: String(row.customer_id ?? ""),

    v2_province_code:
      typeof row.v2_province_code === "string"
        ? row.v2_province_code
        : null,

    v2_province_name:
      typeof row.v2_province_name === "string"
        ? row.v2_province_name
        : null,

    v2_city_code:
      typeof row.v2_city_code === "string"
        ? row.v2_city_code
        : null,

    v2_city_name:
      typeof row.v2_city_name === "string"
        ? row.v2_city_name
        : null,

    address_line_1: String(row.address_line_1 ?? ""),

    address_line_2:
      typeof row.address_line_2 === "string"
        ? row.address_line_2
        : null,

    postal_code:
      typeof row.postal_code === "string"
        ? row.postal_code
        : null,

    latitude:
      row.latitude === null ||
      row.latitude === undefined
        ? null
        : Number(row.latitude),

    longitude:
      row.longitude === null ||
      row.longitude === undefined
        ? null
        : Number(row.longitude),

    address_type: normalizedAddressType,

    label:
      typeof row.label === "string"
        ? row.label
        : null,

    is_primary: row.is_primary === true,

    client_uuid:
      typeof row.client_uuid === "string"
        ? row.client_uuid
        : null,

    sync_version: Number(row.sync_version ?? 1),

    last_synced_at:
      typeof row.last_synced_at === "string"
        ? row.last_synced_at
        : null,

    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),

    deleted_at:
      typeof row.deleted_at === "string"
        ? row.deleted_at
        : null,
  };
}

async function getPrimaryAddressInternal(
  customerId: string
): Promise<CustomerV2PrimaryAddress | null> {
  const companyId = await getRequiredCurrentCompanyId();
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("customer_addresses")
    .select(
      `
        id,
        company_id,
        customer_id,
        v2_province_code,
        v2_province_name,
        v2_city_code,
        v2_city_name,
        address_line_1,
        address_line_2,
        postal_code,
        latitude,
        longitude,
        address_type,
        label,
        is_primary,
        client_uuid,
        sync_version,
        last_synced_at,
        created_at,
        updated_at,
        deleted_at
      `
    )
    .eq("customer_id", customerId)
    .eq("company_id", companyId)
    .eq("is_primary", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    logSupabaseError(
      "خطا در دریافت آدرس اصلی مشتری:",
      error
    );
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapPrimaryAddressRow(
    data as Record<string, unknown>
  );
}

function validatePrimaryAddressInput(
  input: CustomerV2PrimaryAddressInput
): CustomerV2PrimaryAddressInput {
  const provinceCode = cleanText(
    input.province_code
  );
  const provinceName = cleanText(
    input.province_name
  );
  const cityCode = cleanText(
    input.city_code
  );
  const cityName = cleanText(
    input.city_name
  );
  const addressLine1 = cleanText(
    input.address_line_1
  );

  if (!provinceCode) {
    throw new CustomerValidationError(
      "استان مشتری الزامی است."
    );
  }

  if (!provinceName) {
    throw new CustomerValidationError(
      "نام استان مشتری الزامی است."
    );
  }

  if (!cityCode) {
    throw new CustomerValidationError(
      "شهر مشتری الزامی است."
    );
  }

  if (!cityName) {
    throw new CustomerValidationError(
      "نام شهر مشتری الزامی است."
    );
  }

  if (!addressLine1) {
    throw new CustomerValidationError(
      "آدرس دقیق مشتری الزامی است."
    );
  }

  const province =
    sharedLocationService.getProvince(
      provinceCode
    );

  if (!province) {
    throw new CustomerValidationError(
      "استان انتخاب‌شده معتبر نیست."
    );
  }

  if (
    cleanText(province.name_fa) !==
    provinceName
  ) {
    throw new CustomerValidationError(
      "نام استان با استان انتخاب‌شده مطابقت ندارد."
    );
  }

  const baseCity =
    sharedLocationService.findBaseCity(
      cityCode,
      provinceCode
    );

  if (
    baseCity &&
    cleanText(baseCity.name_fa) !==
      cityName
  ) {
    throw new CustomerValidationError(
      "نام شهر با شهر انتخاب‌شده مطابقت ندارد."
    );
  }

  return {
    ...input,
    province_code: province.code,
    province_name: province.name_fa,
    city_code: cityCode,
    city_name: cityName,
    address_line_1: addressLine1,

    address_line_2:
      cleanNullableText(
        input.address_line_2
      ),

    postal_code:
      cleanNullableText(
        input.postal_code
      ),

    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,

    address_type:
      input.address_type ?? "office",

    label:
      cleanNullableText(
        input.label
      ),
  };
}

async function savePrimaryAddressInternal(
  customerId: string,
  input: CustomerV2PrimaryAddressInput
): Promise<CustomerV2PrimaryAddress> {
  const companyId = await getRequiredCurrentCompanyId();
  const supabase = createSupabaseClient();

  const validated =
    validatePrimaryAddressInput(input);

  const existing =
    await getPrimaryAddressInternal(
      customerId
    );

  const payload = {
    company_id: companyId,
    customer_id: customerId,

    v2_province_code:
      validated.province_code,

    v2_province_name:
      validated.province_name,

    v2_city_code:
      validated.city_code,

    v2_city_name:
      validated.city_name,

    address_line_1:
      validated.address_line_1,

    address_line_2:
      validated.address_line_2 ?? null,

    postal_code:
      validated.postal_code ?? null,

    latitude:
      validated.latitude ?? null,

    longitude:
      validated.longitude ?? null,

    address_type:
      validated.address_type ?? "office",

    label:
      validated.label ?? null,

    is_primary: true,

    updated_at:
      new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await supabase
      .from("customer_addresses")
      .update(payload)
      .eq("id", existing.id)
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .select(
        `
          id,
          company_id,
          customer_id,
          v2_province_code,
          v2_province_name,
          v2_city_code,
          v2_city_name,
          address_line_1,
          address_line_2,
          postal_code,
          latitude,
          longitude,
          address_type,
          label,
          is_primary,
          client_uuid,
          sync_version,
          last_synced_at,
          created_at,
          updated_at,
          deleted_at
        `
      )
      .single();

    if (error) {
      logSupabaseError(
        "خطا در بروزرسانی آدرس اصلی مشتری:",
        error
      );
      throw error;
    }

    return mapPrimaryAddressRow(
      data as Record<string, unknown>
    );
  }

  const { data, error } = await supabase
    .from("customer_addresses")
    .insert({
      ...payload,
      created_at:
        new Date().toISOString(),
    })
    .select(
      `
        id,
        company_id,
        customer_id,
        v2_province_code,
        v2_province_name,
        v2_city_code,
        v2_city_name,
        address_line_1,
        address_line_2,
        postal_code,
        latitude,
        longitude,
        address_type,
        label,
        is_primary,
        client_uuid,
        sync_version,
        last_synced_at,
        created_at,
        updated_at,
        deleted_at
      `
    )
    .single();

  if (error) {
    logSupabaseError(
      "خطا در ثبت آدرس اصلی مشتری:",
      error
    );
    throw error;
  }

  return mapPrimaryAddressRow(
    data as Record<string, unknown>
  );
}

function isValidNationalIdForCheck(
  value: string | null | undefined
): boolean {
  const normalized =
    normalizeNationalId(value);

  return /^\d{10}$/.test(normalized);
}

function buildCompleteness(
  customer: Customer,
  primaryAddress:
    | CustomerV2PrimaryAddress
    | null
): CustomerV2Completeness {
  const missingFields: CustomerV2Completeness["missing_fields"] =
    [];

  if (!cleanText(customer.name)) {
    missingFields.push("name");
  }

  if (!normalizePhone(customer.phone)) {
    missingFields.push("phone");
  }

  if (
    !cleanText(
      customer.regional_manager_id
    )
  ) {
    missingFields.push(
      "regional_manager"
    );
  }

  if (
    !cleanText(
      primaryAddress?.v2_province_code
    ) ||
    !cleanText(
      primaryAddress?.v2_province_name
    )
  ) {
    missingFields.push(
      "province"
    );
  }

  if (
    !cleanText(
      primaryAddress?.v2_city_code
    ) ||
    !cleanText(
      primaryAddress?.v2_city_name
    )
  ) {
    missingFields.push(
      "city"
    );
  }

  if (
    !cleanText(
      primaryAddress?.address_line_1
    )
  ) {
    missingFields.push(
      "address"
    );
  }

  if (
    !isValidNationalIdForCheck(
      customer.national_id
    )
  ) {
    missingFields.push(
      "national_id"
    );
  }

  return {
    is_complete:
      missingFields.length === 0,

    missing_fields:
      missingFields,

    customer_id:
      customer.id,

    checked_at:
      new Date().toISOString(),
  };
}

async function loadCustomerBase(
  id: string
): Promise<Customer> {
  const companyId =
    await getRequiredCurrentCompanyId();

  const supabase =
    createSupabaseClient();

  const customerId =
    id.trim();

  const { data, error } =
    await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .maybeSingle();

  if (error) {
    logSupabaseError(
      "خطا در دریافت مشتری:",
      error
    );
    throw error;
  }

  if (!data) {
    throw new Error(
      `مشتری با شناسه ${customerId} پیدا نشد یا دسترسی خواندن آن وجود ندارد.`
    );
  }

  return data as Customer;
}

function validateOptionalPlanFields(
  planScope:
    | "regional"
    | "out_of_region"
    | null
    | undefined,
  planRegionId: string | null | undefined
): void {
  const normalizedPlanRegionId =
    cleanNullableText(
      planRegionId
    );

  if (
    planScope === "regional" &&
    !normalizedPlanRegionId
  ) {
    throw new CustomerValidationError(
      "برای مشتری منطقه‌ای، منطقه برنامه فروش الزامی است."
    );
  }

  if (
    planScope === "out_of_region" &&
    normalizedPlanRegionId
  ) {
    throw new CustomerValidationError(
      "مشتری خارج از منطقه نباید منطقه برنامه فروش داشته باشد."
    );
  }

  if (
    !planScope &&
    normalizedPlanRegionId
  ) {
    throw new CustomerValidationError(
      "برای تعیین منطقه برنامه فروش، ابتدا حوزه برنامه فروش را مشخص کنید."
    );
  }
}

export const customersService = {
  /* ========================================================================
   * V1 API
   * ======================================================================== */

  async getAll(): Promise<Customer[]> {
    const companyId =
      await getRequiredCurrentCompanyId();

    const supabase =
      createSupabaseClient();

    const { data, error } =
      await supabase
        .from("customers")
        .select("*")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("name", {
          ascending: true,
        });

    if (error) {
      logSupabaseError(
        "خطا در دریافت فهرست مشتریان:",
        error
      );
      throw error;
    }

    const customers =
      (data ?? []) as Customer[];

    const cityIds =
      Array.from(
        new Set(
          customers
            .map(
              (customer) =>
                customer.city_id
            )
            .filter(
              (
                cityId
              ): cityId is string =>
                Boolean(
                  cityId?.trim()
                )
            )
        )
      );

    let cities: CustomerCity[] =
      [];

    if (
      cityIds.length > 0
    ) {
      const {
        data: cityRows,
        error: citiesError,
      } = await supabase
        .from("cities")
        .select(
          "id, company_id, name, code"
        )
        .in("id", cityIds)
        .eq(
          "company_id",
          companyId
        )
        .is(
          "deleted_at",
          null
        );

      if (citiesError) {
        logSupabaseError(
          "خطا در دریافت شهرهای مشتریان:",
          citiesError
        );
        throw citiesError;
      }

      cities =
        (cityRows ?? []).map(
          (item) => ({
            id: String(
              item.id
            ),
            company_id:
              item.company_id !==
              undefined
                ? item.company_id
                : null,
            name: String(
              item.name ?? ""
            ),
            code:
              item.code !==
              undefined
                ? item.code
                : null,
          })
        );
    }

    const citiesById =
      new Map(
        cities.map(
          (city) => [
            city.id,
            city,
          ]
        )
      );

    return customers.map(
      (customer) =>
        ({
          ...customer,
          city:
            customer.city_id
              ? citiesById.get(
                  customer.city_id
                ) ?? null
              : null,
        }) as Customer
    );
  },

  async getById(
    id: string
  ): Promise<Customer> {
    if (!id || !id.trim()) {
      throw new Error(
        "شناسه مشتری مشخص نیست."
      );
    }

    const customer =
      await loadCustomerBase(
        id
      );

    let city:
      | CustomerCity
      | null = null;

    if (
      typeof customer.city_id ===
        "string" &&
      customer.city_id.trim()
    ) {
      try {
        city =
          await this.getCityById(
            customer.city_id
          );
      } catch (cityError) {
        console.error(
          "خطا در دریافت شهر مشتری:",
          cityError
        );
      }
    }

    return {
      ...customer,
      city,
    };
  },

  async getCities(): Promise<
    CustomerCity[]
  > {
    const companyId =
      await getRequiredCurrentCompanyId();

    const supabase =
      createSupabaseClient();

    const {
      data,
      error,
    } = await supabase
      .from("cities")
      .select(
        "id, company_id, name, code"
      )
      .eq(
        "company_id",
        companyId
      )
      .is(
        "deleted_at",
        null
      )
      .order("name", {
        ascending: true,
      });

    if (error) {
      logSupabaseError(
        "خطا در دریافت فهرست شهرها:",
        error
      );
      throw error;
    }

    return (data ?? []).map(
      (item) => ({
        id: String(
          item.id
        ),
        company_id:
          item.company_id !==
          undefined
            ? item.company_id
            : null,
        name: String(
          item.name ?? ""
        ),
        code:
          item.code !==
          undefined
            ? item.code
            : null,
      })
    );
  },

  async getCityById(
    cityId: string
  ): Promise<CustomerCity | null> {
    const companyId =
      await getRequiredCurrentCompanyId();

    const supabase =
      createSupabaseClient();

    if (
      !cityId ||
      !cityId.trim()
    ) {
      return null;
    }

    const {
      data,
      error,
    } = await supabase
      .from("cities")
      .select(
        "id, company_id, name, code"
      )
      .eq(
        "id",
        cityId.trim()
      )
      .eq(
        "company_id",
        companyId
      )
      .is(
        "deleted_at",
        null
      )
      .maybeSingle();

    if (error) {
      logSupabaseError(
        "خطا در دریافت شهر مشتری:",
        error
      );
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      id: String(
        data.id
      ),
      company_id:
        data.company_id !==
        undefined
          ? data.company_id
          : null,
      name: String(
        data.name ?? ""
      ),
      code:
        data.code !==
        undefined
          ? data.code
          : null,
    };
  },

  async update(
    id: string,
    values: Partial<
      Pick<
        Customer,
        | "name"
        | "phone"
        | "secondary_phone"
        | "whatsapp_number"
        | "customer_type"
        | "is_vip"
        | "is_active"
        | "city_id"
        | "assigned_user_id"
        | "metadata"
      >
    >
  ): Promise<Customer> {
    const companyId =
      await getRequiredCurrentCompanyId();

    const supabase =
      createSupabaseClient();

    if (!id || !id.trim()) {
      throw new Error(
        "شناسه مشتری مشخص نیست."
      );
    }

    const customerId =
      id.trim();

    const currentCustomer =
      await this.getById(
        customerId
      );

    const nextPhone =
      values.phone !== undefined
        ? cleanPhoneValue(
            values.phone
          )
        : currentCustomer.phone;

    const nextSecondaryPhone =
      values.secondary_phone !==
      undefined
        ? cleanPhoneValue(
            values.secondary_phone
          )
        : currentCustomer.secondary_phone;

    await validatePhoneDuplicates(
      nextPhone,
      nextSecondaryPhone,
      customerId
    );

    const updateData:
      Record<string, unknown> = {
        updated_at:
          new Date().toISOString(),
      };

    if (
      values.name !==
      undefined
    ) {
      const name =
        values.name.trim();

      if (!name) {
        throw new Error(
          "نام مشتری نمی‌تواند خالی باشد."
        );
      }

      updateData.name = name;
    }

    if (
      values.phone !==
      undefined
    ) {
      updateData.phone =
        nextPhone;
    }

    if (
      values.secondary_phone !==
      undefined
    ) {
      updateData.secondary_phone =
        nextSecondaryPhone;
    }

    if (
      values.whatsapp_number !==
      undefined
    ) {
      updateData.whatsapp_number =
        cleanPhoneValue(
          values.whatsapp_number
        );
    }

    if (
      values.customer_type !==
      undefined
    ) {
      updateData.customer_type =
        values.customer_type;
    }

    if (
      values.is_vip !==
      undefined
    ) {
      updateData.is_vip =
        values.is_vip;
    }

    if (
      values.is_active !==
      undefined
    ) {
      updateData.is_active =
        values.is_active;
    }

    if (
      values.city_id !==
      undefined
    ) {
      if (
        values.city_id !== null &&
        !String(
          values.city_id
        ).trim()
      ) {
        throw new Error(
          "شناسه شهر معتبر نیست."
        );
      }

      updateData.city_id =
        values.city_id
          ? String(
              values.city_id
            ).trim()
          : null;
    }

    if (
      values.assigned_user_id !==
      undefined
    ) {
      updateData.assigned_user_id =
        values.assigned_user_id
          ? String(
              values.assigned_user_id
            ).trim()
          : null;
    }

    if (
      values.metadata !==
      undefined
    ) {
      updateData.metadata =
        values.metadata;
    }

    const {
      error,
    } = await supabase
      .from("customers")
      .update(updateData)
      .eq(
        "id",
        customerId
      )
      .eq(
        "company_id",
        companyId
      )
      .is(
        "deleted_at",
        null
      );

    if (error) {
      logSupabaseError(
        "خطا در بروزرسانی مشتری:",
        error
      );
      throw error;
    }

    return this.getById(
      customerId
    );
  },

  async create(
    values: Partial<
      Pick<
        Customer,
        | "name"
        | "phone"
        | "secondary_phone"
        | "whatsapp_number"
        | "customer_type"
        | "city_id"
        | "is_vip"
        | "is_active"
        | "metadata"
      >
    >
  ): Promise<Customer> {
    const companyId =
      await getRequiredCurrentCompanyId();

    const supabase =
      createSupabaseClient();

    if (!values.name?.trim()) {
      throw new CustomerValidationError(
        "نام مشتری الزامی است."
      );
    }

    if (
      !values.city_id?.trim()
    ) {
      throw new CustomerValidationError(
        "انتخاب شهر مشتری الزامی است."
      );
    }

    if (
      !values.customer_type
    ) {
      throw new CustomerValidationError(
        "نوع مشتری الزامی است."
      );
    }

    const phone =
      cleanPhoneValue(
        values.phone
      );

    const secondaryPhone =
      cleanPhoneValue(
        values.secondary_phone
      );

    await validatePhoneDuplicates(
      phone,
      secondaryPhone
    );

    const insertData:
      Record<string, unknown> = {
        company_id:
          companyId,

        city_id:
          values.city_id.trim(),

        name:
          values.name.trim(),

        customer_type:
          values.customer_type,

        is_vip:
          values.is_vip ??
          false,

        is_active:
          values.is_active ??
          true,
      };

    if (
      values.phone !==
      undefined
    ) {
      insertData.phone =
        phone;
    }

    if (
      values.secondary_phone !==
      undefined
    ) {
      insertData.secondary_phone =
        secondaryPhone;
    }

    if (
      values.whatsapp_number !==
      undefined
    ) {
      insertData.whatsapp_number =
        cleanPhoneValue(
          values.whatsapp_number
        );
    }

    if (
      values.metadata !==
      undefined
    ) {
      insertData.metadata =
        values.metadata;
    }

    const {
      data,
      error,
    } = await supabase
      .from("customers")
      .insert(insertData)
      .select("*")
      .single();

    if (error) {
      logSupabaseError(
        "خطا در ایجاد مشتری:",
        error
      );
      throw error;
    }

    if (!data) {
      throw new Error(
        "مشتری ایجاد نشد."
      );
    }

    return data as Customer;
  },

  async delete(
    id: string
  ): Promise<void> {
    const companyId =
      await getRequiredCurrentCompanyId();

    const supabase =
      createSupabaseClient();

    if (!id || !id.trim()) {
      throw new Error(
        "شناسه مشتری مشخص نیست."
      );
    }

    const customerId =
      id.trim();

    const now =
      new Date().toISOString();

    const {
      data: deletedRows,
      error,
    } = await supabase
      .from("customers")
      .update({
        deleted_at:
          now,
        updated_at:
          now,
      })
      .eq(
        "id",
        customerId
      )
      .eq(
        "company_id",
        companyId
      )
      .is(
        "deleted_at",
        null
      )
      .select("id");

    if (error) {
      logSupabaseError(
        "خطا در حذف مشتری:",
        error
      );
      throw error;
    }

    if (
      !deletedRows ||
      deletedRows.length === 0
    ) {
      throw new Error(
        "شما اجازه حذف این مشتری را ندارید."
      );
    }
  },

  /* ========================================================================
   * V2 API
   * ======================================================================== */

  async getByIdV2(
    id: string
  ): Promise<Customer> {
    if (!id || !id.trim()) {
      throw new Error(
        "شناسه مشتری مشخص نیست."
      );
    }

    const customer =
      await loadCustomerBase(
        id
      );

    const primaryAddress =
      await getPrimaryAddressInternal(
        customer.id
      );

    return {
      ...customer,
      v2_primary_address:
        primaryAddress,
    };
  },

  async getV2PrimaryAddress(
    customerId: string
  ): Promise<
    CustomerV2PrimaryAddress | null
  > {
    if (
      !customerId ||
      !customerId.trim()
    ) {
      throw new Error(
        "شناسه مشتری مشخص نیست."
      );
    }

    await loadCustomerBase(
      customerId
    );

    return getPrimaryAddressInternal(
      customerId.trim()
    );
  },

  async saveV2PrimaryAddress(
    customerId: string,
    input: CustomerV2PrimaryAddressInput
  ): Promise<CustomerV2PrimaryAddress> {
    if (
      !customerId ||
      !customerId.trim()
    ) {
      throw new Error(
        "شناسه مشتری مشخص نیست."
      );
    }

    await loadCustomerBase(
      customerId
    );

    return savePrimaryAddressInternal(
      customerId.trim(),
      input
    );
  },

  async checkV2Completeness(
    customerId: string
  ): Promise<CustomerV2Completeness> {
    const customer =
      await this.getByIdV2(
        customerId
      );

    return buildCompleteness(
      customer,
      customer.v2_primary_address ??
        null
    );
  },

  async getV2RegionalManagers(): Promise<
    V2RegionalManager[]
  > {
    const users =
      await userManagementService.getUsers();

    return users
      .filter(
        (
          user: ManagedUser
        ) =>
          user.role_slug ===
            "regional_manager" &&
          user.is_active
      )
      .map(
        (
          user: ManagedUser
        ) => ({
          id: user.id,
          full_name:
            user.full_name,
          email: user.email,
          role_slug:
            "regional_manager" as const,
          is_active:
            user.is_active,
        })
      )
      .sort(
        (
          first,
          second
        ) =>
          first.full_name.localeCompare(
            second.full_name,
            "fa"
          )
      );
  },

  async createV2(
    values: CustomerV2CreateInput
  ): Promise<Customer> {
    const companyId =
      await getRequiredCurrentCompanyId();

    const supabase =
      createSupabaseClient();

    const name =
      cleanText(
        values.name
      );

    const customerType =
      cleanText(
        values.customer_type
      );

    const phone =
      cleanPhoneValue(
        values.phone
      );

    const secondaryPhone =
      cleanPhoneValue(
        values.secondary_phone
      );

    const whatsappNumber =
      cleanPhoneValue(
        values.whatsapp_number
      );

    const nationalId =
      validateNationalId(
        values.national_id
      );

    const regionalManagerId =
      cleanNullableText(
        values.regional_manager_id
      );

    const planScope =
      values.plan_scope ??
      null;

    const planRegionId =
      cleanNullableText(
        values.plan_region_id
      );

    if (!name) {
      throw new CustomerValidationError(
        "نام و نام خانوادگی مشتری الزامی است."
      );
    }

    if (!phone) {
      throw new CustomerValidationError(
        "شماره تماس مشتری الزامی است."
      );
    }

    if (!customerType) {
      throw new CustomerValidationError(
        "نوع مشتری الزامی است."
      );
    }

    if (!nationalId) {
      throw new CustomerValidationError(
        "کد ملی مشتری الزامی است."
      );
    }

    if (!regionalManagerId) {
      throw new CustomerValidationError(
        "مدیر منطقه مشتری الزامی است."
      );
    }

    validateOptionalPlanFields(
      planScope,
      planRegionId
    );

    await validatePhoneDuplicates(
      phone,
      secondaryPhone
    );

    await validateNationalIdDuplicate(
      nationalId
    );

    const address =
      validatePrimaryAddressInput(
        values.primary_address
      );

    const insertData:
      Record<string, unknown> = {
        company_id:
          companyId,

        /*
         * V2 location is represented by
         * customer_addresses.
         *
         * Legacy V1 city_id stays NULL until
         * an explicit legacy mapping exists.
         */
        city_id: null,

        name,

        customer_type:
          customerType,

        phone,

        national_id:
          nationalId,

        regional_manager_id:
          regionalManagerId,

        plan_scope:
          planScope,

        plan_region_id:
          planRegionId,

        is_vip:
          values.is_vip ??
          false,

        is_active:
          values.is_active ??
          true,
      };

    if (
      secondaryPhone !== null
    ) {
      insertData.secondary_phone =
        secondaryPhone;
    }

    if (
      whatsappNumber !== null
    ) {
      insertData.whatsapp_number =
        whatsappNumber;
    }

    if (
      values.metadata !==
      undefined
    ) {
      insertData.metadata =
        values.metadata;
    }

    const {
      data,
      error,
    } = await supabase
      .from("customers")
      .insert(insertData)
      .select("*")
      .single();

    if (error) {
      logSupabaseError(
        "خطا در ایجاد مشتری V2:",
        error
      );
      throw error;
    }

    if (!data) {
      throw new Error(
        "مشتری V2 ایجاد نشد."
      );
    }

    const createdCustomer =
      data as Customer;

    try {
      await savePrimaryAddressInternal(
        createdCustomer.id,
        address
      );
    } catch (addressError) {
      /*
       * Best-effort compensation:
       * if address creation fails after customer creation,
       * mark the newly-created customer as deleted so
       * incomplete V2 records are not left active.
       */
      const rollbackNow =
        new Date().toISOString();

      const {
        error:
          rollbackError,
      } = await supabase
        .from("customers")
        .update({
          deleted_at:
            rollbackNow,
          updated_at:
            rollbackNow,
        })
        .eq(
          "id",
          createdCustomer.id
        )
        .eq(
          "company_id",
          companyId
        )
        .is(
          "deleted_at",
          null
        );

      if (rollbackError) {
        logSupabaseError(
          "خطا در بازگردانی مشتری پس از شکست ثبت آدرس:",
          rollbackError
        );
      }

      throw addressError;
    }

    return this.getByIdV2(
      createdCustomer.id
    );
  },

  async updateV2(
    id: string,
    values: CustomerV2UpdateInput
  ): Promise<Customer> {
    const supabase =
      createSupabaseClient();

    if (!id || !id.trim()) {
      throw new Error(
        "شناسه مشتری مشخص نیست."
      );
    }

    const customerId =
      id.trim();

    const current =
      await this.getByIdV2(
        customerId
      );

    const nextPhone =
      values.phone !== undefined
        ? cleanPhoneValue(
            values.phone
          )
        : current.phone;

    const nextSecondaryPhone =
      values.secondary_phone !==
      undefined
        ? cleanPhoneValue(
            values.secondary_phone
          )
        : current.secondary_phone;

    await validatePhoneDuplicates(
      nextPhone,
      nextSecondaryPhone,
      customerId
    );

    let nextNationalId =
      current.national_id;

    if (
      values.national_id !==
      undefined
    ) {
      nextNationalId =
        validateNationalId(
          values.national_id
        );

      if (!nextNationalId) {
        throw new CustomerValidationError(
          "کد ملی مشتری الزامی است."
        );
      }

      await validateNationalIdDuplicate(
        nextNationalId,
        customerId
      );
    }

    const nextName =
      values.name !== undefined
        ? cleanText(values.name)
        : current.name;

    if (!nextName) {
      throw new CustomerValidationError(
        "نام و نام خانوادگی مشتری الزامی است."
      );
    }

    const nextManager =
      values.regional_manager_id !==
      undefined
        ? cleanNullableText(
            values.regional_manager_id
          )
        : current.regional_manager_id;

    const nextPlanScope =
      values.plan_scope !==
      undefined
        ? values.plan_scope
        : current.plan_scope ?? null;

    const nextPlanRegion =
      values.plan_region_id !==
      undefined
        ? cleanNullableText(
            values.plan_region_id
          )
        : current.plan_region_id ?? null;

    validateOptionalPlanFields(
      nextPlanScope,
      nextPlanRegion
    );

    const ownershipChanged =
      nextManager !==
        current.regional_manager_id ||
      nextPlanScope !==
        (current.plan_scope ?? null) ||
      nextPlanRegion !==
        (current.plan_region_id ?? null);

    if (ownershipChanged) {
      if (!nextManager) {
        throw new CustomerValidationError(
          "مدیر منطقه مشتری نمی‌تواند خالی باشد."
        );
      }

      if (
        !values.ownership_reason?.trim()
      ) {
        throw new CustomerValidationError(
          "برای تغییر مدیر منطقه یا مالکیت برنامه فروش، ثبت دلیل الزامی است."
        );
      }

      const {
        error: ownershipError,
      } = await supabase.rpc(
        "v2_assign_customer_plan_owner",
        {
          p_customer_id:
            customerId,

          p_regional_manager_id:
            nextManager,

          p_plan_scope:
            nextPlanScope,

          p_plan_region_id:
            nextPlanRegion,

          p_reason:
            values.ownership_reason.trim(),
        }
      );

      if (ownershipError) {
        logSupabaseError(
          "خطا در تغییر مالکیت V2 مشتری:",
          ownershipError
        );
        throw ownershipError;
      }
    }

    const nextWhatsappNumber =
      values.whatsapp_number !==
      undefined
        ? cleanPhoneValue(
            values.whatsapp_number
          )
        : current.whatsapp_number;

    const nextCustomerType =
      values.customer_type !==
      undefined
        ? cleanText(
            values.customer_type
          )
        : current.customer_type;

    if (
      values.customer_type !==
      undefined &&
      !nextCustomerType
    ) {
      throw new CustomerValidationError(
        "نوع مشتری الزامی است."
      );
    }

    const nextIsVip =
      values.is_vip !== undefined
        ? values.is_vip
        : current.is_vip;

    const nextIsActive =
      values.is_active !== undefined
        ? values.is_active
        : current.is_active;

    const nextMetadata =
      values.metadata !== undefined
        ? values.metadata
        : current.metadata;

    const {
      data: updatedCoreRow,
      error: coreUpdateError,
    } = await supabase.rpc(
      "v2_update_customer_core",
      {
        p_customer_id: customerId,
        p_name: nextName,
        p_phone: nextPhone,
        p_secondary_phone:
          nextSecondaryPhone,
        p_whatsapp_number:
          nextWhatsappNumber,
        p_customer_type:
          nextCustomerType,
        p_national_id:
          nextNationalId,
        p_is_vip: nextIsVip,
        p_is_active: nextIsActive,
        p_metadata: nextMetadata,
      }
    );

    if (coreUpdateError) {
      logSupabaseError(
        "خطا در بروزرسانی هسته مشتری V2:",
        coreUpdateError
      );
      throw coreUpdateError;
    }

    if (!updatedCoreRow) {
      throw new Error(
        "بروزرسانی مشتری انجام نشد و رکورد به سرویس بازگردانده نشد."
      );
    }

    const persistedCore =
      updatedCoreRow as Customer;

    if (
      persistedCore.national_id !==
      nextNationalId
    ) {
      throw new Error(
        "کد ملی در پایگاه داده ذخیره نشد. ذخیره تغییرات متوقف شد؛ لطفاً دوباره تلاش کنید."
      );
    }

    if (
      values.primary_address !==
      undefined
    ) {
      await savePrimaryAddressInternal(
        customerId,
        values.primary_address
      );
    }

    return this.getByIdV2(
      customerId
    );
  },

  async getV2CompletenessSummary(
    customerId: string
  ): Promise<CustomerV2Completeness> {
    return this.checkV2Completeness(
      customerId
    );
  },
};
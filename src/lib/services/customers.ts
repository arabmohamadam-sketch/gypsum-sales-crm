import { createSupabaseClient } from "@/src/lib/supabase";

import type { Customer } from "@/src/lib/types/customer";

const COMPANY_ID =
  "11111111-1111-1111-1111-111111111111";

export interface CustomerCity {
  id: string;
  company_id?: string | null;
  name: string;
  code?: string | null;
}

type CustomerWithCity = Customer & {
  city: CustomerCity | null;
};

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

function normalizePhone(
  value: string | null | undefined
): string {
  if (!value) {
    return "";
  }

  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

  let normalized = value.trim();

  normalized = normalized.replace(
    /[۰-۹٠-٩]/g,
    (digit) => {
      const persianIndex =
        persianDigits.indexOf(digit);

      if (persianIndex >= 0) {
        return String(persianIndex);
      }

      const arabicIndex =
        arabicDigits.indexOf(digit);

      if (arabicIndex >= 0) {
        return String(arabicIndex);
      }

      return digit;
    }
  );

  normalized = normalized.replace(
    /[^\d+]/g,
    ""
  );

  if (normalized.startsWith("+98")) {
    normalized = `0${normalized.slice(3)}`;
  } else if (
    normalized.startsWith("0098")
  ) {
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
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

async function validatePhoneDuplicates(
  phone: string | null | undefined,
  secondaryPhone: string | null | undefined,
  excludeCustomerId?: string
): Promise<void> {
  const normalizedPhone =
    normalizePhone(phone);

  const normalizedSecondaryPhone =
    normalizePhone(secondaryPhone);

  /*
   * شماره اصلی و شماره دوم یک مشتری
   * نباید یکسان باشند.
   */
  if (
    normalizedPhone &&
    normalizedSecondaryPhone &&
    normalizedPhone ===
      normalizedSecondaryPhone
  ) {
    throw new CustomerValidationError(
      "شماره تماس دوم نمی‌تواند با شماره تماس اصلی یکسان باشد."
    );
  }

  const numbersToCheck = [
    normalizedPhone,
    normalizedSecondaryPhone,
  ].filter(Boolean);

  /*
   * اگر هیچ شماره‌ای برای بررسی وجود ندارد،
   * ادامه کار بدون بررسی تکراری بودن.
   */
  if (numbersToCheck.length === 0) {
    return;
  }

  const supabase =
    createSupabaseClient();

  const {
    data,
    error,
  } = await supabase
    .from("customers")
    .select(
      "id, name, phone, secondary_phone"
    )
    .eq(
      "company_id",
      COMPANY_ID
    )
    .is(
      "deleted_at",
      null
    );

  /*
   * این خطا یک خطای واقعی ارتباطی / دیتابیس است
   * و باید در لاگ باقی بماند.
   */
  if (error) {
    logSupabaseError(
      "خطا در بررسی تکراری بودن شماره تلفن:",
      error
    );

    throw error;
  }

  const duplicateCustomers =
    (data ?? []).filter(
      (customer) => {
        if (
          excludeCustomerId &&
          String(customer.id) ===
            excludeCustomerId
        ) {
          return false;
        }

        const existingPhone =
          normalizePhone(
            customer.phone
          );

        const existingSecondaryPhone =
          normalizePhone(
            customer.secondary_phone
          );

        return numbersToCheck.some(
          (number) =>
            number ===
              existingPhone ||
            number ===
              existingSecondaryPhone
        );
      }
    );

  if (
    duplicateCustomers.length === 0
  ) {
    return;
  }

  const duplicateCustomer =
    duplicateCustomers[0];

  const duplicateName =
    typeof duplicateCustomer.name ===
    "string"
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

export const customersService = {
  async getAll(): Promise<Customer[]> {
    const supabase =
      createSupabaseClient();

    const {
      data,
      error,
    } = await supabase
      .from("customers")
      .select("*")
      .eq(
        "company_id",
        COMPANY_ID
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

    if (cityIds.length > 0) {
      const {
        data: cityRows,
        error: citiesError,
      } = await supabase
        .from("cities")
        .select(
          "id, company_id, name, code"
        )
        .in(
          "id",
          cityIds
        )
        .eq(
          "company_id",
          COMPANY_ID
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
      (customer) => ({
        ...customer,
        city:
          customer.city_id
            ? citiesById.get(
                customer.city_id
              ) ?? null
            : null,
      } as Customer)
    );
  },

  async getById(
    id: string
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

    const {
      data,
      error,
    } = await supabase
      .from("customers")
      .select("*")
      .eq(
        "id",
        customerId
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      )
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

    let city:
      | CustomerCity
      | null = null;

    if (
      typeof data.city_id ===
        "string" &&
      data.city_id.trim()
    ) {
      try {
        city =
          await this.getCityById(
            data.city_id
          );
      } catch (cityError) {
        console.error(
          "خطا در دریافت شهر مشتری:",
          cityError
        );

        city = null;
      }
    }

    return {
      ...data,
      city,
    } as CustomerWithCity as Customer;
  },

  async getCities(): Promise<CustomerCity[]> {
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
        COMPANY_ID
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
    const supabase =
      createSupabaseClient();

    if (
      !cityId ||
      !cityId.trim()
    ) {
      return null;
    }

    const normalizedCityId =
      cityId.trim();

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
        normalizedCityId
      )
      .eq(
        "company_id",
        COMPANY_ID
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
        | "metadata"
      >
    >
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

    const currentCustomer =
      await this.getById(
        customerId
      );

    const nextPhone =
      values.phone !==
      undefined
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

    const updateData: Record<
      string,
      unknown
    > = {
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

      updateData.name =
        name;
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
        COMPANY_ID
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

    const updatedCustomer =
      await this.getById(
        customerId
      );

    return updatedCustomer;
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

    const insertData: Record<
      string,
      unknown
    > = {
      company_id:
        COMPANY_ID,
      city_id:
        values.city_id.trim(),
      name:
        values.name.trim(),
      customer_type:
        values.customer_type,
      is_vip:
        values.is_vip ?? false,
      is_active:
        values.is_active ?? true,
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
      error,
    } = await supabase
      .from("customers")
      .update({
        deleted_at: now,
        updated_at: now,
      })
      .eq(
        "id",
        customerId
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      );

    if (error) {
      logSupabaseError(
        "خطا در حذف مشتری:",
        error
      );

      throw error;
    }
  },
};
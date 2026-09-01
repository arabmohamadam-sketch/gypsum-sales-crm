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
  
    /*
     * شهر هر مشتری را از روی city_id
     * جداگانه دریافت می‌کنیم.
     *
     * عمداً از JOIN مستقیم استفاده نمی‌کنیم
     * تا وابسته به نام Relation در Supabase نباشیم.
     */
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
  
    /*
     * شهر را داخل آبجکت مشتری قرار می‌دهیم
     * تا CustomerPage / CustomerTable
     * بتوانند مستقیماً آن را نمایش دهند.
     */
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

    /*
     * شهر مشتری را جداگانه دریافت می‌کنیم.
     *
     * این روش عمداً بدون JOIN مستقیم انجام می‌شود
     * تا به نام Foreign Key یا Relation Name
     * وابسته نباشیم.
     */
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

    console.log(
      "CUSTOMER GET BY ID:",
      {
        id: data.id,
        name: data.name,
        city_id:
          data.city_id,
        city_name:
          city?.name ?? null,
      }
    );

    /*
     * city را به آبجکت مشتری اضافه می‌کنیم.
     *
     * Customer فعلی پروژه ممکن است فیلد city
     * را در TypeScript نداشته باشد؛ بنابراین
     * برای حفظ سازگاری، در زمان return cast می‌کنیم.
     */
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

    // ابتدا بررسی می‌کنیم مشتری واقعاً وجود دارد.
    await this.getById(customerId);

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
        values.phone;
    }

    if (
      values.whatsapp_number !==
      undefined
    ) {
      updateData.whatsapp_number =
        values.whatsapp_number;
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
      console.error(
        "SUPABASE CUSTOMER UPDATE ERROR",
        {
          message:
            error.message ??
            "",
          details:
            error.details ??
            "",
          hint:
            error.hint ??
            "",
          code:
            error.code ??
            "",
        }
      );

      throw new Error(
        error.message ||
          "خطا در بروزرسانی مشتری."
      );
    }

    // بعد از Update رکورد را دوباره می‌خوانیم.
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
      throw new Error(
        "نام مشتری الزامی است."
      );
    }

    if (
      !values.city_id?.trim()
    ) {
      throw new Error(
        "انتخاب شهر مشتری الزامی است."
      );
    }

    if (
      !values.customer_type
    ) {
      throw new Error(
        "نوع مشتری الزامی است."
      );
    }

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
        values.phone;
    }

    if (
      values.whatsapp_number !==
      undefined
    ) {
      insertData.whatsapp_number =
        values.whatsapp_number;
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
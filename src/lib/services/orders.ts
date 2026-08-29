import { createSupabaseClient } from "@/src/lib/supabase";
import type {
  Order,
  OrderCustomer,
  OrderSalesUser,
} from "@/src/lib/types/order";

const COMPANY_ID = "11111111-1111-1111-1111-111111111111";

export interface CreateOrderInput {
  company_id?: string;
  customer_id: string;
  sales_user_id: string;
  order_date: string;
  status: string;
  total_tonnage: number;
  notes?: string | null;
  source: string;
}

export interface UpdateOrderInput {
  customer_id?: string;
  sales_user_id?: string;
  order_date?: string;
  status?: string;
  total_tonnage?: number;
  notes?: string | null;
  source?: string;
}

export interface OrderWithRelations extends Order {
  customer: OrderCustomer | null;
  sales_user: OrderSalesUser | null;
}

const ORDER_SELECT = `
  *,
  customer:customers!orders_customer_id_fkey (
    id,
    name,
    phone,
    customer_type
  ),
  sales_user:users!orders_sales_user_id_fkey (
    id,
    full_name,
    phone,
    job_title,
    employee_code
  )
`;

function validateId(
  value: string | undefined,
  message: string
): string {
  if (!value?.trim()) {
    throw new Error(message);
  }

  return value.trim();
}

function validateDate(
  value: string | undefined,
  message: string
): string {
  if (!value?.trim()) {
    throw new Error(message);
  }

  return value.trim();
}

function validateTonnage(value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      "تناژ سفارش باید بیشتر از صفر باشد."
    );
  }
}

function validateStatus(value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(
      "وضعیت سفارش الزامی است."
    );
  }

  return value.trim();
}

function validateSource(value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(
      "منبع سفارش الزامی است."
    );
  }

  return value.trim();
}

interface SupabaseErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

function isSupabaseError(
  error: unknown
): error is SupabaseErrorLike {
  return (
    typeof error === "object" &&
    error !== null
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (isSupabaseError(error)) {
    return (
      error.message ??
      error.details ??
      fallback
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function logSupabaseError(
  operation: string,
  error: unknown
): void {
  console.error(
    `========== ORDER ${operation} ERROR ==========`
  );

  if (isSupabaseError(error)) {
    console.error("message :", error.message);
    console.error("code    :", error.code);
    console.error("details :", error.details);
    console.error("hint    :", error.hint);
  } else {
    console.error("error   :", error);
  }

  console.error(
    "================================================"
  );
}

export const ordersService = {
  /**
   * دریافت تمام سفارش‌های فعال
   */
  async getAll(): Promise<OrderWithRelations[]> {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("company_id", COMPANY_ID)
      .is("deleted_at", null)
      .order("order_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      logSupabaseError("GET ALL", error);
      throw new Error(
        getErrorMessage(
          error,
          "خطا در دریافت سفارش‌ها."
        )
      );
    }

    return (data ?? []) as OrderWithRelations[];
  },

  /**
   * دریافت یک سفارش بر اساس شناسه
   */
  async getById(
    id: string
  ): Promise<OrderWithRelations> {
    const supabase = createSupabaseClient();

    const orderId = validateId(
      id,
      "شناسه سفارش الزامی است."
    );

    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("id", orderId)
      .eq("company_id", COMPANY_ID)
      .is("deleted_at", null)
      .single();

    if (error) {
      logSupabaseError("GET BY ID", error);

      throw new Error(
        getErrorMessage(
          error,
          "خطا در دریافت سفارش."
        )
      );
    }

    return data as OrderWithRelations;
  },

  /**
   * دریافت سفارش‌های یک مشتری
   */
  async getByCustomerId(
    customerId: string
  ): Promise<OrderWithRelations[]> {
    const supabase = createSupabaseClient();

    const id = validateId(
      customerId,
      "شناسه مشتری الزامی است."
    );

    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("customer_id", id)
      .eq("company_id", COMPANY_ID)
      .is("deleted_at", null)
      .order("order_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      logSupabaseError(
        "GET BY CUSTOMER",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در دریافت سفارش‌های مشتری."
        )
      );
    }

    return (data ?? []) as OrderWithRelations[];
  },

  /**
   * دریافت سفارش‌ها در یک بازه زمانی
   */
  async getByDateRange(
    startDate: string,
    endDate: string
  ): Promise<OrderWithRelations[]> {
    const supabase = createSupabaseClient();

    const start = validateDate(
      startDate,
      "تاریخ شروع بازه الزامی است."
    );

    const end = validateDate(
      endDate,
      "تاریخ پایان بازه الزامی است."
    );

    if (start > end) {
      throw new Error(
        "تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد."
      );
    }

    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("company_id", COMPANY_ID)
      .gte("order_date", start)
      .lte("order_date", end)
      .is("deleted_at", null)
      .order("order_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      logSupabaseError(
        "GET BY DATE RANGE",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در دریافت سفارش‌های بازه زمانی."
        )
      );
    }

    return (data ?? []) as OrderWithRelations[];
  },

  /**
   * ایجاد سفارش جدید
   */
  async create(
    input: CreateOrderInput
  ): Promise<OrderWithRelations> {
    const supabase = createSupabaseClient();

    const customerId = validateId(
      input.customer_id,
      "انتخاب مشتری الزامی است."
    );

    const salesUserId = validateId(
      input.sales_user_id,
      "انتخاب بازاریاب الزامی است."
    );

    const orderDate = validateDate(
      input.order_date,
      "تاریخ سفارش الزامی است."
    );

    const status = validateStatus(
      input.status
    );

    const source = validateSource(
      input.source
    );

    validateTonnage(
      input.total_tonnage
    );

    const insertData = {
      company_id: COMPANY_ID,
      customer_id: customerId,
      sales_user_id: salesUserId,
      order_date: orderDate,
      status,
      total_tonnage: input.total_tonnage,
      notes: input.notes ?? null,
      source,
    };

    const { data, error } = await supabase
      .from("orders")
      .insert(insertData)
      .select(ORDER_SELECT)
      .single();

    if (error) {
      logSupabaseError("CREATE", error);

      throw new Error(
        getErrorMessage(
          error,
          "خطا در ثبت سفارش."
        )
      );
    }

    return data as OrderWithRelations;
  },

  /**
   * ویرایش سفارش
   */
  async update(
    id: string,
    input: UpdateOrderInput
  ): Promise<OrderWithRelations> {
    const supabase = createSupabaseClient();

    const orderId = validateId(
      id,
      "شناسه سفارش الزامی است."
    );

    const updateData: Record<
      string,
      unknown
    > = {};

    if (input.customer_id !== undefined) {
      updateData.customer_id = validateId(
        input.customer_id,
        "شناسه مشتری معتبر نیست."
      );
    }

    if (input.sales_user_id !== undefined) {
      updateData.sales_user_id = validateId(
        input.sales_user_id,
        "شناسه بازاریاب معتبر نیست."
      );
    }

    if (input.order_date !== undefined) {
      updateData.order_date = validateDate(
        input.order_date,
        "تاریخ سفارش معتبر نیست."
      );
    }

    if (input.status !== undefined) {
      updateData.status = validateStatus(
        input.status
      );
    }

    if (
      input.total_tonnage !== undefined
    ) {
      validateTonnage(
        input.total_tonnage
      );

      updateData.total_tonnage =
        input.total_tonnage;
    }

    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    if (input.source !== undefined) {
      updateData.source = validateSource(
        input.source
      );
    }

    if (
      Object.keys(updateData).length === 0
    ) {
      throw new Error(
        "هیچ اطلاعاتی برای ویرایش سفارش ارسال نشده است."
      );
    }

    const { data, error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .eq("company_id", COMPANY_ID)
      .is("deleted_at", null)
      .select(ORDER_SELECT)
      .single();

    if (error) {
      logSupabaseError("UPDATE", error);

      throw new Error(
        getErrorMessage(
          error,
          "خطا در ویرایش سفارش."
        )
      );
    }

    return data as OrderWithRelations;
  },

  /**
   * حذف نرم سفارش
   */
  async softDelete(
    id: string
  ): Promise<void> {
    const supabase = createSupabaseClient();

    const orderId = validateId(
      id,
      "شناسه سفارش الزامی است."
    );

    const now =
      new Date().toISOString();

    const { data, error } = await supabase
      .from("orders")
      .update({
        deleted_at: now,
        updated_at: now,
      })
      .eq("id", orderId)
      .eq("company_id", COMPANY_ID)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      logSupabaseError(
        "SOFT DELETE",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در حذف سفارش."
        )
      );
    }

    if (!data) {
      throw new Error(
        "سفارش موردنظر پیدا نشد یا قبلاً حذف شده است."
      );
    }
  },

  /**
   * بازیابی سفارش حذف‌شده
   */
  async restore(
    id: string
  ): Promise<OrderWithRelations> {
    const supabase = createSupabaseClient();

    const orderId = validateId(
      id,
      "شناسه سفارش الزامی است."
    );

    const { data, error } = await supabase
      .from("orders")
      .update({
        deleted_at: null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("company_id", COMPANY_ID)
      .not("deleted_at", "is", null)
      .select(ORDER_SELECT)
      .single();

    if (error) {
      logSupabaseError(
        "RESTORE",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در بازیابی سفارش."
        )
      );
    }

    return data as OrderWithRelations;
  },
};
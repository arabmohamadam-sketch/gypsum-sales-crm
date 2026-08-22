import { createSupabaseClient } from "@/src/lib/supabase";
import type {
  Order,
  OrderCustomer,
  OrderSalesUser,
} from "@/src/lib/types/order";

const COMPANY_ID = "11111111-1111-1111-1111-111111111111";

export interface CreateOrderInput {
  company_id: string;
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

function validateTonnage(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("تناژ سفارش باید بیشتر از صفر باشد.");
  }
}

function validateId(
  value: string | undefined,
  message: string
) {
  if (!value?.trim()) {
    throw new Error(message);
  }

  return value.trim();
}

function logSupabaseError(
  operation: string,
  error: any
) {
  console.error(
    `========== ORDER ${operation} ERROR ==========`
  );
  console.error("message :", error?.message);
  console.error("code    :", error?.code);
  console.error("details :", error?.details);
  console.error("hint    :", error?.hint);
  console.error(
    "full    :",
    JSON.stringify(error, null, 2)
  );
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
      });

    if (error) {
      logSupabaseError("GET ALL", error);
      throw error;
    }

    return (data ?? []) as OrderWithRelations[];
  },

  /**
   * دریافت سفارش بر اساس شناسه
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
      throw error;
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
      });

    if (error) {
      logSupabaseError(
        "GET BY CUSTOMER",
        error
      );

      throw error;
    }

    return (data ?? []) as OrderWithRelations[];
  },

  /**
   * دریافت سفارش‌ها در بازه زمانی
   */
  async getByDateRange(
    startDate: string,
    endDate: string
  ): Promise<OrderWithRelations[]> {
    const supabase = createSupabaseClient();

    if (!startDate || !endDate) {
      throw new Error(
        "بازه زمانی سفارش الزامی است."
      );
    }

    if (startDate > endDate) {
      throw new Error(
        "تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد."
      );
    }

    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("company_id", COMPANY_ID)
      .gte("order_date", startDate)
      .lte("order_date", endDate)
      .is("deleted_at", null)
      .order("order_date", {
        ascending: false,
      });

    if (error) {
      logSupabaseError(
        "GET BY DATE RANGE",
        error
      );

      throw error;
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

    if (!input.order_date) {
      throw new Error(
        "تاریخ سفارش الزامی است."
      );
    }

    if (!input.status) {
      throw new Error(
        "وضعیت سفارش الزامی است."
      );
    }

    if (!input.source) {
      throw new Error(
        "منبع سفارش الزامی است."
      );
    }

    validateTonnage(
      input.total_tonnage
    );

    const { data, error } = await supabase
      .from("orders")
      .insert({
        company_id: COMPANY_ID,
        customer_id: customerId,
        sales_user_id: salesUserId,
        order_date: input.order_date,
        status: input.status,
        total_tonnage: input.total_tonnage,
        notes: input.notes ?? null,
        source: input.source,
      })
      .select(ORDER_SELECT)
      .single();

    if (error) {
      logSupabaseError("CREATE", error);

      throw new Error(
        error.message ??
          error.details ??
          "خطا در ثبت سفارش"
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

    if (
      input.total_tonnage !== undefined
    ) {
      validateTonnage(
        input.total_tonnage
      );
    }

    if (
      input.customer_id !== undefined
    ) {
      input.customer_id = validateId(
        input.customer_id,
        "شناسه مشتری معتبر نیست."
      );
    }

    if (
      input.sales_user_id !== undefined
    ) {
      input.sales_user_id = validateId(
        input.sales_user_id,
        "شناسه بازاریاب معتبر نیست."
      );
    }

    if (
      input.order_date !== undefined &&
      !input.order_date
    ) {
      throw new Error(
        "تاریخ سفارش معتبر نیست."
      );
    }

    const updateData = {
      ...input,
      updated_at:
        new Date().toISOString(),
    };

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
        error.message ??
          error.details ??
          "خطا در ویرایش سفارش"
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

    const { error } = await supabase
      .from("orders")
      .update({
        deleted_at: now,
        updated_at: now,
      })
      .eq("id", orderId)
      .eq("company_id", COMPANY_ID)
      .is("deleted_at", null);

    if (error) {
      logSupabaseError(
        "SOFT DELETE",
        error
      );

      throw new Error(
        error.message ??
          error.details ??
          "خطا در حذف سفارش"
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
        error.message ??
          error.details ??
          "خطا در بازیابی سفارش"
      );
    }

    return data as OrderWithRelations;
  },
};
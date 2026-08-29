import { createSupabaseClient } from "@/src/lib/supabase";

import type {
  Order,
  OrderCustomer,
  OrderSalesUser,
  OrderItem,
  OrderItemInput,
} from "@/src/lib/types/order";

export type {
  OrderItemInput,
} from "@/src/lib/types/order";

const COMPANY_ID =
  "11111111-1111-1111-1111-111111111111";

export interface CreateOrderInput {
  company_id?: string;
  customer_id: string;
  sales_user_id: string;
  order_date: string;
  status: string;
  total_tonnage: number;
  notes?: string | null;
  source: string;
  items?: OrderItemInput[];
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

export interface OrderWithRelations
  extends Order {
  customer: OrderCustomer | null;
  sales_user: OrderSalesUser | null;
  items: OrderItem[];
}

interface ProductRecord {
  id: string;
  company_id: string;
  name: string;
  sku: string;
  product_line: string;
  weight_kg: number;
  is_active: boolean;
  sort_order: number;
  metadata: Record<
    string,
    unknown
  >;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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
  ),
  items:order_items!order_items_order_id_fkey (
    id,
    company_id,
    order_id,
    product_id,
    quantity,
    weight_kg_snapshot,
    tonnage,
    product_name_snapshot,
    bag_weight_kg,
    created_at,
    updated_at,
    deleted_at
  )
`;

const ORDER_ITEM_SELECT = `
  id,
  company_id,
  order_id,
  product_id,
  quantity,
  weight_kg_snapshot,
  tonnage,
  product_name_snapshot,
  bag_weight_kg,
  created_at,
  updated_at,
  deleted_at
`;

const PRODUCT_SELECT = `
  id,
  company_id,
  name,
  sku,
  product_line,
  weight_kg,
  is_active,
  sort_order,
  metadata,
  created_at,
  updated_at,
  deleted_at
`;

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
    console.error(
      "message :",
      error.message
    );

    console.error(
      "code    :",
      error.code
    );

    console.error(
      "details :",
      error.details
    );

    console.error(
      "hint    :",
      error.hint
    );
  } else {
    console.error(
      "error   :",
      error
    );
  }

  console.error(
    "================================================"
  );
}

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

function validateStatus(
  value: string | undefined
): string {
  if (!value?.trim()) {
    throw new Error(
      "وضعیت سفارش الزامی است."
    );
  }

  return value.trim();
}

function validateSource(
  value: string | undefined
): string {
  if (!value?.trim()) {
    throw new Error(
      "منبع سفارش الزامی است."
    );
  }

  return value.trim();
}

function validateTonnage(
  value: number
): void {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new Error(
      "تناژ سفارش باید بیشتر از صفر باشد."
    );
  }
}

function normalizeProductName(
  value: unknown
): string {
  return String(value ?? "").trim();
}

function normalizeProductId(
  value: unknown
): string | null {
  const result = String(
    value ?? ""
  ).trim();

  return result || null;
}

function normalizePositiveNumber(
  value: unknown
): number {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return 0;
  }

  return number;
}

function normalizeQuantity(
  value: unknown
): number {
  const quantity = Number(value);

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    return 0;
  }

  return quantity;
}

interface NormalizedOrderItem {
  product_id: string | null;
  product_name_snapshot: string;
  quantity: number;
  bag_weight_kg: number;
}

function normalizeOrderItem(
  item: OrderItemInput
): NormalizedOrderItem {
  const productName =
    normalizeProductName(
      item.product_name_snapshot
    );

  const quantity =
    item.quantity === undefined
      ? 1
      : normalizeQuantity(
          item.quantity
        );

  const bagWeight =
    item.bag_weight_kg !==
      undefined &&
    item.bag_weight_kg !== null
      ? normalizePositiveNumber(
          item.bag_weight_kg
        )
      : normalizePositiveNumber(
          item.weight_kg_snapshot
        );

  return {
    product_id:
      normalizeProductId(
        item.product_id
      ),

    product_name_snapshot:
      productName,

    quantity,

    bag_weight_kg:
      bagWeight,
  };
}

function validateOrderItem(
  item: NormalizedOrderItem
): void {
  if (
    !item.product_name_snapshot
  ) {
    throw new Error(
      "نام کالا الزامی است."
    );
  }

  if (
    !Number.isFinite(
      item.quantity
    ) ||
    item.quantity <= 0
  ) {
    throw new Error(
      "تعداد کیسه باید بیشتر از صفر باشد."
    );
  }

  if (
    !Number.isInteger(
      item.quantity
    )
  ) {
    throw new Error(
      "تعداد کیسه باید عدد صحیح باشد."
    );
  }

  if (
    !Number.isFinite(
      item.bag_weight_kg
    ) ||
    item.bag_weight_kg <= 0
  ) {
    throw new Error(
      "وزن کیسه باید بیشتر از صفر باشد."
    );
  }
}

function mapOrder(
  order: OrderWithRelations
): OrderWithRelations {
  return {
    ...order,

    customer:
      order.customer ?? null,

    sales_user:
      order.sales_user ?? null,

    items:
      order.items ?? [],
  };
}

function createManualSku(): string {
  const timestamp =
    Date.now().toString(36);

  const randomPart =
    Math.random()
      .toString(36)
      .slice(2, 8);

  return `manual-${timestamp}-${randomPart}`;
}

async function getProductById(
  productId: string
): Promise<ProductRecord> {
  const supabase =
    createSupabaseClient();

  const {
    data,
    error,
  } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq(
      "id",
      productId
    )
    .eq(
      "company_id",
      COMPANY_ID
    )
    .eq(
      "is_active",
      true
    )
    .is(
      "deleted_at",
      null
    )
    .maybeSingle();

  if (error) {
    logSupabaseError(
      "GET PRODUCT BY ID",
      error
    );

    throw new Error(
      getErrorMessage(
        error,
        "خطا در دریافت محصول."
      )
    );
  }

  if (!data) {
    throw new Error(
      "محصول انتخاب‌شده پیدا نشد یا غیرفعال است."
    );
  }

  return data as ProductRecord;
}

async function createManualProduct(
  name: string,
  weightKg: number
): Promise<ProductRecord> {
  const supabase =
    createSupabaseClient();

  const productName =
    normalizeProductName(name);

  if (!productName) {
    throw new Error(
      "نام محصول جدید الزامی است."
    );
  }

  if (
    !Number.isFinite(
      weightKg
    ) ||
    weightKg <= 0
  ) {
    throw new Error(
      "وزن محصول جدید باید بیشتر از صفر باشد."
    );
  }

  const productPayload = {
    company_id:
      COMPANY_ID,

    name:
      productName,

    sku:
      createManualSku(),

    product_line:
      "Manual",

    weight_kg:
      Math.round(weightKg),

    is_active:
      true,

    sort_order:
      9999,

    metadata: {
      source:
        "crm_manual_order",

      created_from:
        "order_form",
    },
  };

  const {
    data,
    error,
  } =
    await supabase
      .from("products")
      .insert(
        productPayload
      )
      .select(
        PRODUCT_SELECT
      )
      .single();

  if (error) {
    logSupabaseError(
      "CREATE MANUAL PRODUCT",
      error
    );

    throw new Error(
      getErrorMessage(
        error,
        "خطا در ایجاد محصول جدید."
      )
    );
  }

  return data as ProductRecord;
}

async function resolveOrderItemProduct(
  item: NormalizedOrderItem
): Promise<{
  product: ProductRecord;
  productId: string;
  weightKg: number;
}> {
  if (item.product_id) {
    const product =
      await getProductById(
        item.product_id
      );

    return {
      product,

      productId:
        product.id,

      /*
       * Trigger دیتابیس همین وزن
       * را در weight_kg_snapshot قرار می‌دهد.
       *
       * بنابراین برای محصولات موجود،
       * وزن واقعی از products خوانده می‌شود.
       */
      weightKg:
        Number(
          product.weight_kg
        ),
    };
  }

  /*
   * محصول جدید دستی:
   * ابتدا رکورد products ساخته می‌شود
   * تا order_items همیشه product_id معتبر داشته باشد.
   */
  const product =
    await createManualProduct(
      item.product_name_snapshot,
      item.bag_weight_kg
    );

  return {
    product,

    productId:
      product.id,

    weightKg:
      Number(
        product.weight_kg
      ),
  };
}

async function resolveOrderItems(
  items: OrderItemInput[]
): Promise<
  Array<{
    product_id: string;
    product_name_snapshot: string;
    quantity: number;
    weight_kg_snapshot: number;
    bag_weight_kg: number;
  }>
> {
  const normalizedItems =
    items.map(
      normalizeOrderItem
    );

  normalizedItems.forEach(
    validateOrderItem
  );

  const resolved = [];

  for (
    const item of normalizedItems
  ) {
    const {
      product,
      productId,
      weightKg,
    } =
      await resolveOrderItemProduct(
        item
      );

    /*
     * نکته مهم:
     *
     * Trigger دیتابیس در INSERT
     * مقدار weight_kg_snapshot را
     * از products می‌خواند.
     *
     * بنابراین برای محصول موجود،
     * bag_weight_kg صرفاً اطلاعات
     * فرم است ولی وزن نهایی معتبر
     * همان products.weight_kg است.
     */
    resolved.push({
      product_id:
        productId,

      product_name_snapshot:
        product.name,

      quantity:
        Math.trunc(
          item.quantity
        ),

      weight_kg_snapshot:
        Math.round(
          weightKg
        ),

      bag_weight_kg:
        item.bag_weight_kg,
    });
  }

  return resolved;
}

export const ordersService = {
  async getAll(): Promise<
    OrderWithRelations[]
  > {
    const supabase =
      createSupabaseClient();

    const {
      data,
      error,
    } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      )
      .order(
        "order_date",
        {
          ascending: false,
        }
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (error) {
      logSupabaseError(
        "GET ALL",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در دریافت سفارش‌ها."
        )
      );
    }

    return (
      (data ??
        []) as OrderWithRelations[]
    ).map(mapOrder);
  },

  async getById(
    id: string
  ): Promise<OrderWithRelations> {
    const supabase =
      createSupabaseClient();

    const orderId =
      validateId(
        id,
        "شناسه سفارش الزامی است."
      );

    const {
      data,
      error,
    } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq(
        "id",
        orderId
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      )
      .single();

    if (error) {
      logSupabaseError(
        "GET BY ID",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در دریافت سفارش."
        )
      );
    }

    return mapOrder(
      data as OrderWithRelations
    );
  },

  async getByCustomerId(
    customerId: string
  ): Promise<OrderWithRelations[]> {
    const supabase =
      createSupabaseClient();

    const id =
      validateId(
        customerId,
        "شناسه مشتری الزامی است."
      );

    const {
      data,
      error,
    } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq(
        "customer_id",
        id
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      )
      .order(
        "order_date",
        {
          ascending: false,
        }
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

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

    return (
      (data ??
        []) as OrderWithRelations[]
    ).map(mapOrder);
  },

  async getByDateRange(
    startDate: string,
    endDate: string
  ): Promise<OrderWithRelations[]> {
    const supabase =
      createSupabaseClient();

    const start =
      validateDate(
        startDate,
        "تاریخ شروع بازه الزامی است."
      );

    const end =
      validateDate(
        endDate,
        "تاریخ پایان بازه الزامی است."
      );

    if (start > end) {
      throw new Error(
        "تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد."
      );
    }

    const {
      data,
      error,
    } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq(
        "company_id",
        COMPANY_ID
      )
      .gte(
        "order_date",
        start
      )
      .lte(
        "order_date",
        end
      )
      .is(
        "deleted_at",
        null
      )
      .order(
        "order_date",
        {
          ascending: false,
        }
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

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

    return (
      (data ??
        []) as OrderWithRelations[]
    ).map(mapOrder);
  },

  async getProducts(): Promise<
    ProductRecord[]
  > {
    const supabase =
      createSupabaseClient();

    const {
      data,
      error,
    } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq(
        "company_id",
        COMPANY_ID
      )
      .eq(
        "is_active",
        true
      )
      .is(
        "deleted_at",
        null
      )
      .order(
        "sort_order",
        {
          ascending: true,
        }
      )
      .order(
        "name",
        {
          ascending: true,
        }
      );

    if (error) {
      logSupabaseError(
        "GET PRODUCTS",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در دریافت محصولات."
        )
      );
    }

    return (
      (data ??
        []) as ProductRecord[]
    );
  },

  async create(
    input: CreateOrderInput
  ): Promise<OrderWithRelations> {
    const supabase =
      createSupabaseClient();

    const customerId =
      validateId(
        input.customer_id,
        "انتخاب مشتری الزامی است."
      );

    const salesUserId =
      validateId(
        input.sales_user_id,
        "انتخاب بازاریاب الزامی است."
      );

    const orderDate =
      validateDate(
        input.order_date,
        "تاریخ سفارش الزامی است."
      );

    const status =
      validateStatus(
        input.status
      );

    const source =
      validateSource(
        input.source
      );

    const inputTonnage =
      Number(
        input.total_tonnage
      );

    /*
     * اگر اقلام وجود داشته باشند،
     * مجموع واقعی آن‌ها بعد از INSERT
     * توسط Trigger دیتابیس محاسبه می‌شود.
     *
     * مقدار total_tonnage برای سازگاری
     * با ساختار فعلی orders نگه داشته شده است.
     */
    validateTonnage(
      inputTonnage
    );

    let resolvedItems:
      Array<{
        product_id: string;
        product_name_snapshot: string;
        quantity: number;
        weight_kg_snapshot: number;
        bag_weight_kg: number;
      }> = [];

    if (
      input.items &&
      input.items.length > 0
    ) {
      resolvedItems =
        await resolveOrderItems(
          input.items
        );
    }

    const {
      data: order,
      error: orderError,
    } = await supabase
      .from("orders")
      .insert({
        company_id:
          COMPANY_ID,

        customer_id:
          customerId,

        sales_user_id:
          salesUserId,

        order_date:
          orderDate,

        status,

        total_tonnage:
          inputTonnage,

        notes:
          input.notes ?? null,

        source,
      })
      .select(`
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
      `)
      .single();

    if (orderError) {
      logSupabaseError(
        "CREATE ORDER",
        orderError
      );

      throw new Error(
        getErrorMessage(
          orderError,
          "خطا در ثبت سفارش."
        )
      );
    }

    let savedItems:
      OrderItem[] = [];

    if (
      resolvedItems.length > 0
    ) {
      /*
       * مهم:
       *
       * tonnage ارسال نمی‌شود.
       *
       * weight_kg_snapshot هم توسط
       * Trigger دیتابیس بازنویسی می‌شود
       * و از products.weight_kg می‌آید.
       *
       * product_id هم همیشه معتبر است.
       */
      const itemsPayload =
        resolvedItems.map(
          (item) => ({
            company_id:
              COMPANY_ID,

            order_id:
              order.id,

            product_id:
              item.product_id,

            product_name_snapshot:
              item.product_name_snapshot,

            quantity:
              item.quantity,

            weight_kg_snapshot:
              item.weight_kg_snapshot,

            bag_weight_kg:
              item.bag_weight_kg,
          })
        );

      const {
        data: items,
        error: itemsError,
      } =
        await supabase
          .from(
            "order_items"
          )
          .insert(
            itemsPayload
          )
          .select(
            ORDER_ITEM_SELECT
          );

      if (itemsError) {
        logSupabaseError(
          "CREATE ORDER ITEMS",
          itemsError
        );

        const now =
          new Date().toISOString();

        await supabase
          .from("orders")
          .update({
            deleted_at:
              now,

            updated_at:
              now,
          })
          .eq(
            "id",
            order.id
          )
          .eq(
            "company_id",
            COMPANY_ID
          );

        throw new Error(
          getErrorMessage(
            itemsError,
            "خطا در ثبت کالاهای سفارش."
          )
        );
      }

      savedItems =
        (items ??
          []) as OrderItem[];
    }

    /*
     * Trigger دیتابیس هنگام INSERT
     * روی order_items اجرا می‌شود و
     * orders.total_tonnage را تازه می‌کند.
     *
     * برای دریافت مقدار نهایی واقعی،
     * سفارش را مجدداً از دیتابیس می‌خوانیم.
     */
    if (
      resolvedItems.length > 0
    ) {
      const {
        data: refreshedOrder,
        error:
          refreshError,
      } =
        await supabase
          .from("orders")
          .select(
            ORDER_SELECT
          )
          .eq(
            "id",
            order.id
          )
          .eq(
            "company_id",
            COMPANY_ID
          )
          .is(
            "deleted_at",
            null
          )
          .single();

      if (
        !refreshError &&
        refreshedOrder
      ) {
        return mapOrder(
          refreshedOrder as OrderWithRelations
        );
      }
    }

    return {
      ...(order as OrderWithRelations),

      customer:
        order.customer ??
        null,

      sales_user:
        order.sales_user ??
        null,

      items:
        savedItems,
    };
  },

  async update(
    id: string,
    input: UpdateOrderInput
  ): Promise<OrderWithRelations> {
    const supabase =
      createSupabaseClient();

    const orderId =
      validateId(
        id,
        "شناسه سفارش الزامی است."
      );

    const updateData: Record<
      string,
      unknown
    > = {};

    if (
      input.customer_id !==
      undefined
    ) {
      updateData.customer_id =
        validateId(
          input.customer_id,
          "شناسه مشتری معتبر نیست."
        );
    }

    if (
      input.sales_user_id !==
      undefined
    ) {
      updateData.sales_user_id =
        validateId(
          input.sales_user_id,
          "شناسه بازاریاب معتبر نیست."
        );
    }

    if (
      input.order_date !==
      undefined
    ) {
      updateData.order_date =
        validateDate(
          input.order_date,
          "تاریخ سفارش معتبر نیست."
        );
    }

    if (
      input.status !==
      undefined
    ) {
      updateData.status =
        validateStatus(
          input.status
        );
    }

    if (
      input.total_tonnage !==
      undefined
    ) {
      validateTonnage(
        input.total_tonnage
      );

      updateData.total_tonnage =
        input.total_tonnage;
    }

    if (
      input.notes !==
      undefined
    ) {
      updateData.notes =
        input.notes;
    }

    if (
      input.source !==
      undefined
    ) {
      updateData.source =
        validateSource(
          input.source
        );
    }

    if (
      Object.keys(
        updateData
      ).length === 0
    ) {
      throw new Error(
        "هیچ اطلاعاتی برای ویرایش سفارش ارسال نشده است."
      );
    }

    updateData.updated_at =
      new Date().toISOString();

    const {
      data,
      error,
    } = await supabase
      .from("orders")
      .update(
        updateData
      )
      .eq(
        "id",
        orderId
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      )
      .select(
        ORDER_SELECT
      )
      .single();

    if (error) {
      logSupabaseError(
        "UPDATE",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در ویرایش سفارش."
        )
      );
    }

    return mapOrder(
      data as OrderWithRelations
    );
  },

  async getItems(
    orderId: string
  ): Promise<OrderItem[]> {
    const supabase =
      createSupabaseClient();

    const id =
      validateId(
        orderId,
        "شناسه سفارش الزامی است."
      );

    const {
      data,
      error,
    } = await supabase
      .from("order_items")
      .select(
        ORDER_ITEM_SELECT
      )
      .eq(
        "order_id",
        id
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

    if (error) {
      logSupabaseError(
        "GET ORDER ITEMS",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در دریافت کالاهای سفارش."
        )
      );
    }

    return (
      (data ??
        []) as OrderItem[]
    );
  },

  async addItem(
    orderId: string,
    input: OrderItemInput
  ): Promise<OrderItem> {
    const supabase =
      createSupabaseClient();

    const id =
      validateId(
        orderId,
        "شناسه سفارش الزامی است."
      );

    const normalized =
      normalizeOrderItem(
        input
      );

    validateOrderItem(
      normalized
    );

    const {
      productId,
      weightKg,
      productName,
    } = await (async () => {
      const result =
        await resolveOrderItemProduct(
          normalized
        );

      return {
        productId:
          result.productId,

        weightKg:
          result.weightKg,

        productName:
          result.product.name,
      };
    })();

    /*
     * tonnage ارسال نمی‌شود.
     */
    const {
      data,
      error,
    } = await supabase
      .from("order_items")
      .insert({
        company_id:
          COMPANY_ID,

        order_id:
          id,

        product_id:
          productId,

        product_name_snapshot:
          productName,

        quantity:
          Math.trunc(
            normalized.quantity
          ),

        weight_kg_snapshot:
          Math.round(
            weightKg
          ),

        bag_weight_kg:
          normalized.bag_weight_kg,
      })
      .select(
        ORDER_ITEM_SELECT
      )
      .single();

    if (error) {
      logSupabaseError(
        "ADD ORDER ITEM",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در افزودن کالا به سفارش."
        )
      );
    }

    return data as OrderItem;
  },

  async updateItem(
    itemId: string,
    input: OrderItemInput
  ): Promise<OrderItem> {
    const supabase =
      createSupabaseClient();

    const id =
      validateId(
        itemId,
        "شناسه کالا الزامی است."
      );

    const normalized =
      normalizeOrderItem(
        input
      );

    validateOrderItem(
      normalized
    );

    const {
      productId,
      weightKg,
      productName,
    } = await (async () => {
      const result =
        await resolveOrderItemProduct(
          normalized
        );

      return {
        productId:
          result.productId,

        weightKg:
          result.weightKg,

        productName:
          result.product.name,
      };
    })();

    /*
     * tonnage عمداً ارسال نمی‌شود.
     */
    const {
      data,
      error,
    } = await supabase
      .from("order_items")
      .update({
        product_id:
          productId,

        product_name_snapshot:
          productName,

        quantity:
          Math.trunc(
            normalized.quantity
          ),

        weight_kg_snapshot:
          Math.round(
            weightKg
          ),

        bag_weight_kg:
          normalized.bag_weight_kg,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        id
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      )
      .select(
        ORDER_ITEM_SELECT
      )
      .single();

    if (error) {
      logSupabaseError(
        "UPDATE ORDER ITEM",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در ویرایش کالای سفارش."
        )
      );
    }

    return data as OrderItem;
  },

  async deleteItem(
    itemId: string
  ): Promise<void> {
    const supabase =
      createSupabaseClient();

    const id =
      validateId(
        itemId,
        "شناسه کالا الزامی است."
      );

    const now =
      new Date().toISOString();

    const {
      data,
      error,
    } = await supabase
      .from("order_items")
      .update({
        deleted_at:
          now,

        updated_at:
          now,
      })
      .eq(
        "id",
        id
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      )
      .select("id")
      .maybeSingle();

    if (error) {
      logSupabaseError(
        "DELETE ORDER ITEM",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در حذف کالای سفارش."
        )
      );
    }

    if (!data) {
      throw new Error(
        "کالای موردنظر پیدا نشد یا قبلاً حذف شده است."
      );
    }
  },

  async softDelete(
    id: string
  ): Promise<void> {
    const supabase =
      createSupabaseClient();

    const orderId =
      validateId(
        id,
        "شناسه سفارش الزامی است."
      );

    const now =
      new Date().toISOString();

    const {
      data,
      error,
    } = await supabase
      .from("orders")
      .update({
        deleted_at:
          now,

        updated_at:
          now,
      })
      .eq(
        "id",
        orderId
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      )
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

  async restore(
    id: string
  ): Promise<OrderWithRelations> {
    const supabase =
      createSupabaseClient();

    const orderId =
      validateId(
        id,
        "شناسه سفارش الزامی است."
      );

    const {
      data,
      error,
    } = await supabase
      .from("orders")
      .update({
        deleted_at:
          null,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        orderId
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .not(
        "deleted_at",
        "is",
        null
      )
      .select(
        ORDER_SELECT
      )
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

    return mapOrder(
      data as OrderWithRelations
    );
  },
};
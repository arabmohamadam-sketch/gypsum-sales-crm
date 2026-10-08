import { getRequiredCurrentCompanyId } from "@/src/lib/services/current-company";
import { customersService } from "@/src/lib/services/customers";
import { createSupabaseClient } from "@/src/lib/supabase";

import type {
  Order,
  OrderApproval,
  OrderApprovalStage,
  OrderApprovalStatus,
  OrderCustomer,
  OrderDeliveryStatus,
  OrderFulfillmentStatus,
  OrderItem,
  OrderItemInput,
  OrderSalesUser,
} from "@/src/lib/types/order";

export type { OrderItemInput } from "@/src/lib/types/order";

export type OrderApprovalDecision =
  | "approve"
  | "reject"
  | "return";

export type OrderWorkflowVersion =
  | "v1"
  | "v2";

export interface CreateOrderInput {
  company_id?: string;
  customer_id: string;
  sales_user_id: string;
  order_date: string;
  status?: string;
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

export interface SubmitOrderForApprovalInput {
  order_id: string;
  idempotency_key?: string;
  notes?: string | null;
}

export interface DecideOrderApprovalInput {
  order_id: string;
  stage: OrderApprovalStage;
  decision: OrderApprovalDecision;
  idempotency_key?: string;
  reason?: string | null;
  notes?: string | null;
}

export interface OrderApprovalHistoryItem extends OrderApproval {
  return_reason?: string | null;
}

export interface OrderApprovalQueueItem {
  order: OrderWithRelations;
  approval: OrderApprovalHistoryItem;
}

export type RegionalActionKind =
  | "pending_approval"
  | "draft"
  | "sales_returned"
  | "sales_rejected";

export interface RegionalActionQueueItem {
  order: OrderWithRelations;
  kind: RegionalActionKind;
  approval: OrderApprovalHistoryItem | null;
  reason: string | null;
  created_at: string;
}

export interface SubmitOrderForApprovalResponse {
  success: boolean;
  operation: string;
  order_id: string;
  approval_stage: "regional";
  approval_id: string;
  cycle_number: number;
  approval_status: "pending";
}

export interface DecideOrderApprovalResponse {
  success: boolean;
  operation: string;
  order_id: string;
  stage: OrderApprovalStage;
  decision: OrderApprovalDecision;
  approval_id: string;
  next_approval_id?: string;
  next_stage?: OrderApprovalStage;
  approval_status: OrderApprovalStatus;
  fulfillment_status?: OrderFulfillmentStatus;
  reason?: string | null;
}

export interface OrderWorkflowSummary {
  approval_status: OrderApprovalStatus | null;
  fulfillment_status: OrderFulfillmentStatus | null;
  delivery_status: OrderDeliveryStatus | null;
  pending_stage: OrderApprovalStage | null;
}

export interface OrderWithRelations extends Order {
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
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface SupabaseErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

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

const ORDER_APPROVAL_SELECT = `
  id,
  company_id,
  order_id,
  approval_stage,
  cycle_number,
  status,
  acted_by,
  acted_at,
  rejection_reason,
  return_reason,
  notes,
  created_at,
  updated_at,
  deleted_at
`;

function isSupabaseError(
  error: unknown
): error is SupabaseErrorLike {
  return typeof error === "object" && error !== null;
}

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (isSupabaseError(error)) {
    return error.message ?? error.details ?? fallback;
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
    throw new Error("وضعیت سفارش الزامی است.");
  }

  return value.trim();
}

function validateSource(
  value: string | undefined
): string {
  if (!value?.trim()) {
    throw new Error("منبع سفارش الزامی است.");
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
  const result = String(value ?? "").trim();
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
      : normalizeQuantity(item.quantity);

  const bagWeight =
    item.bag_weight_kg !== undefined &&
    item.bag_weight_kg !== null
      ? normalizePositiveNumber(
          item.bag_weight_kg
        )
      : normalizePositiveNumber(
          item.weight_kg_snapshot
        );

  return {
    product_id: normalizeProductId(
      item.product_id
    ),
    product_name_snapshot: productName,
    quantity,
    bag_weight_kg: bagWeight,
  };
}

function validateOrderItem(
  item: NormalizedOrderItem
): void {
  if (!item.product_name_snapshot) {
    throw new Error("نام کالا الزامی است.");
  }

  if (
    !Number.isFinite(item.quantity) ||
    item.quantity <= 0
  ) {
    throw new Error(
      "تعداد کیسه باید بیشتر از صفر باشد."
    );
  }

  if (!Number.isInteger(item.quantity)) {
    throw new Error(
      "تعداد کیسه باید عدد صحیح باشد."
    );
  }

  if (
    !Number.isFinite(item.bag_weight_kg) ||
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
    customer: order.customer ?? null,
    sales_user: order.sales_user ?? null,
    items: order.items ?? [],
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

function createIdempotencyKey(
  operation: string,
  orderId: string
): string {
  const cryptoApi =
    globalThis.crypto;

  if (
    typeof cryptoApi?.randomUUID ===
    "function"
  ) {
    return `v2:${operation}:${orderId}:${cryptoApi.randomUUID()}`;
  }

  return `v2:${operation}:${orderId}:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function ensureRpcObject(
  data: unknown,
  fallbackMessage: string
): Record<string, unknown> {
  if (
    typeof data !== "object" ||
    data === null ||
    Array.isArray(data)
  ) {
    throw new Error(fallbackMessage);
  }

  return data as Record<string, unknown>;
}

function getStringField(
  data: Record<string, unknown>,
  field: string,
  fallback = ""
): string {
  const value = data[field];

  return typeof value === "string"
    ? value
    : fallback;
}

function getNumberField(
  data: Record<string, unknown>,
  field: string
): number {
  const value = Number(data[field]);

  return Number.isFinite(value)
    ? value
    : 0;
}

async function getProductById(
  productId: string
): Promise<ProductRecord> {
  const companyId =
    await getRequiredCurrentCompanyId();

  const supabase =
    createSupabaseClient();

  const {
    data,
    error,
  } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", productId)
    .eq("company_id", companyId)
    .eq("is_active", true)
    .is("deleted_at", null)
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
  const companyId =
    await getRequiredCurrentCompanyId();

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
    !Number.isFinite(weightKg) ||
    weightKg <= 0
  ) {
    throw new Error(
      "وزن محصول جدید باید بیشتر از صفر باشد."
    );
  }

  const productPayload = {
    company_id: companyId,
    name: productName,
    sku: createManualSku(),
    product_line: "Manual",
    weight_kg: Math.round(weightKg),
    is_active: true,
    sort_order: 9999,
    metadata: {
      source: "crm_manual_order",
      created_from: "order_form",
    },
  };

  const {
    data,
    error,
  } = await supabase
    .from("products")
    .insert(productPayload)
    .select(PRODUCT_SELECT)
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
      productId: product.id,
      weightKg: Number(
        product.weight_kg
      ),
    };
  }

  const product =
    await createManualProduct(
      item.product_name_snapshot,
      item.bag_weight_kg
    );

  return {
    product,
    productId: product.id,
    weightKg: Number(
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

  const resolved: Array<{
    product_id: string;
    product_name_snapshot: string;
    quantity: number;
    weight_kg_snapshot: number;
    bag_weight_kg: number;
  }> = [];

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

    resolved.push({
      product_id: productId,
      product_name_snapshot:
        product.name,
      quantity: Math.trunc(
        item.quantity
      ),
      weight_kg_snapshot:
        Math.round(weightKg),
      bag_weight_kg:
        item.bag_weight_kg,
    });
  }

  return resolved;
}

/**
 * دریافت سفارش‌ها بدون JOIN مستقیم.
 *
 * ابتدا orders خوانده می‌شود و سپس
 * customers / users / order_items جداگانه
 * دریافت و به سفارش‌ها متصل می‌شوند.
 */
async function getOrdersWithRelations(
  orderRows: Order[]
): Promise<OrderWithRelations[]> {
  const companyId =
    await getRequiredCurrentCompanyId();

  if (orderRows.length === 0) {
    return [];
  }

  const supabase =
    createSupabaseClient();

  const customerIds =
    Array.from(
      new Set(
        orderRows
          .map(
            (order) =>
              order.customer_id
          )
          .filter(
            (
              id
            ): id is string =>
              Boolean(id)
          )
      )
    );

  const salesUserIds =
    Array.from(
      new Set(
        orderRows
          .map(
            (order) =>
              order.sales_user_id
          )
          .filter(
            (
              id
            ): id is string =>
              Boolean(id)
          )
      )
    );

  const orderIds =
    orderRows.map(
      (order) => order.id
    );

  let customers:
    OrderCustomer[] = [];

  let salesUsers:
    OrderSalesUser[] = [];

  let items:
    OrderItem[] = [];

  if (customerIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from("customers")
      .select(
        `
          id,
          name,
          phone,
          customer_type
        `
      )
      .in("id", customerIds);

    if (error) {
      logSupabaseError(
        "GET ORDER CUSTOMERS",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در دریافت مشتریان سفارش‌ها."
        )
      );
    }

    customers =
      (data ??
        []) as OrderCustomer[];
  }

  if (salesUserIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from("users")
      .select(
        `
          id,
          full_name,
          phone,
          job_title,
          employee_code
        `
      )
      .in("id", salesUserIds);

    if (error) {
      logSupabaseError(
        "GET ORDER SALES USERS",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در دریافت بازاریاب‌های سفارش‌ها."
        )
      );
    }

    salesUsers =
      (data ??
        []) as OrderSalesUser[];
  }

  if (orderIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from("order_items")
      .select(
        ORDER_ITEM_SELECT
      )
      .in(
        "order_id",
        orderIds
      )
      .eq(
        "company_id",
        companyId
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
        "GET ORDER ITEMS FOR LIST",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در دریافت کالاهای سفارش‌ها."
        )
      );
    }

    items =
      (data ??
        []) as OrderItem[];
  }

  const customersById =
    new Map(
      customers.map(
        (customer) => [
          customer.id,
          customer,
        ]
      )
    );

  const salesUsersById =
    new Map(
      salesUsers.map(
        (salesUser) => [
          salesUser.id,
          salesUser,
        ]
      )
    );

  const itemsByOrderId =
    new Map<
      string,
      OrderItem[]
    >();

  for (const item of items) {
    const current =
      itemsByOrderId.get(
        item.order_id
      ) ?? [];

    current.push(item);

    itemsByOrderId.set(
      item.order_id,
      current
    );
  }

  return orderRows.map(
    (order) =>
      mapOrder({
        ...order,
        customer:
          order.customer_id
            ? customersById.get(
                order.customer_id
              ) ?? null
            : null,
        sales_user:
          order.sales_user_id
            ? salesUsersById.get(
                order.sales_user_id
              ) ?? null
            : null,
        items:
          itemsByOrderId.get(
            order.id
          ) ?? [],
      } as OrderWithRelations)
  );
}

export const ordersService = {
  async getAll(): Promise<
    OrderWithRelations[]
  > {
    const companyId =
      await getRequiredCurrentCompanyId();

    const supabase =
      createSupabaseClient();

    const {
      data: {
        session,
      },
      error: sessionError,
    } =
      await supabase.auth.getSession();

    if (sessionError) {
      console.error(
        "ORDERS SESSION ERROR:",
        sessionError
      );

      throw new Error(
        "نشست کاربر معتبر نیست. لطفاً دوباره وارد شوید."
      );
    }

    if (!session) {
      console.error(
        "ORDERS GET ALL: هیچ Session فعالی وجود ندارد."
      );

      throw new Error(
        "نشست ورود شما فعال نیست. لطفاً دوباره وارد شوید."
      );
    }

    console.log(
      "ORDERS AUTH USER:",
      session.user.id
    );

    console.log(
      "ORDERS AUTH EMAIL:",
      session.user.email
    );

    const {
      data,
      error,
    } = await supabase
      .from("orders")
      .select("*")
      .eq(
        "company_id",        companyId
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

    const orderRows =
      (data ?? []) as Order[];

    console.log(
      "ORDERS GET ALL: تعداد سفارش‌های اصلی =",
      orderRows.length
    );

    const result =
      await getOrdersWithRelations(
        orderRows
      );

    console.log(
      "ORDERS GET ALL: تعداد نهایی =",
      result.length
    );

    return result;
  },

  async getById(
    id: string
  ): Promise<OrderWithRelations> {
    const companyId =
      await getRequiredCurrentCompanyId();

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
      .select("*")
      .eq(
        "id",
        orderId
      )
      .eq(
        "company_id",
        companyId
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

    const result =
      await getOrdersWithRelations([
        data as Order,
      ]);

    const order =
      result[0];

    if (!order) {
      throw new Error(
        "سفارش موردنظر پیدا نشد."
      );
    }

    return order;
  },

  async getByIdIfVisible(
    id: string
  ): Promise<OrderWithRelations | null> {
    const companyId =
      await getRequiredCurrentCompanyId();

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
      .select("*")
      .eq(
        "id",
        orderId
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
        "GET BY ID IF VISIBLE",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در دریافت سفارش."
        )
      );
    }

    if (!data) {
      return null;
    }

    const result =
      await getOrdersWithRelations([
        data as Order,
      ]);

    return result[0] ?? null;
  },

  async getByCustomerId(
    customerId: string
  ): Promise<OrderWithRelations[]> {
    const companyId =
      await getRequiredCurrentCompanyId();

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
      .select("*")
      .eq(
        "customer_id",
        id
      )
      .eq(
        "company_id",
        companyId
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

    return getOrdersWithRelations(
      (data ??
        []) as Order[]
    );
  },

  async getByDateRange(
    startDate: string,
    endDate: string
  ): Promise<OrderWithRelations[]> {
    const companyId =
      await getRequiredCurrentCompanyId();

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
      .select("*")
      .eq(
        "company_id",
        companyId
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

    return getOrdersWithRelations(
      (data ??
        []) as Order[]
    );
  },

  async getProducts(): Promise<
    ProductRecord[]
  > {
    const companyId =
      await getRequiredCurrentCompanyId();

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
        companyId
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

  /**
   * V2 order creation boundary.
   *
   * V1 `create()` remains unchanged for backwards compatibility.
   * All V2 order-entry applications should use this method so the
   * customer-completeness rule is enforced before an order is created.
   */
  async createV2(
    input: CreateOrderInput
  ): Promise<OrderWithRelations> {
    const customerId =
      validateId(
        input.customer_id,
        "انتخاب مشتری الزامی است."
      );

    const completeness =
      await customersService.checkV2Completeness(
        customerId
      );

    if (!completeness.is_complete) {
      throw new Error(
        "مشخصات مشتری نیاز به اصلاح و یا تکمیل دارد"
      );
    }

    return this.create(
      {
        ...input,
        status: "draft",
      },
      "v2"
    );
  },

  async create(
    input: CreateOrderInput,
    workflowVersion: OrderWorkflowVersion = "v1"
  ): Promise<OrderWithRelations> {
    const companyId =
      await getRequiredCurrentCompanyId();

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
      input.status?.trim() ||
      "draft";

    const source =
      input.source?.trim() ||
      "manual";

    const inputTonnage =
      Number(
        input.total_tonnage
      );

    validateStatus(status);
    validateSource(source);
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
    } =
      await supabase
        .from("orders")
        .insert({
          company_id:
            companyId,
          workflow_version:
            workflowVersion,
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
        .select("*")
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
      const itemsPayload =
        resolvedItems.map(
          (item) => ({
            company_id:
              companyId,
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
          .from("order_items")
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
            companyId
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

    const refreshed =
      await this.getById(
        order.id
      );

    if (refreshed) {
      return refreshed;
    }

    return {
      ...(order as OrderWithRelations),
      customer: null,
      sales_user: null,
      items: savedItems,
    };
  },

  async update(
    id: string,
    input: UpdateOrderInput
  ): Promise<OrderWithRelations> {
    const companyId =
      await getRequiredCurrentCompanyId();

    const supabase =
      createSupabaseClient();

    const orderId =
      validateId(
        id,
        "شناسه سفارش الزامی است."
      );

    const {
      data: currentOrder,
      error: currentOrderError,
    } = await supabase
      .from("orders")
      .select(
        "id, status, approval_status, workflow_version"
      )
      .eq("id", orderId)
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .maybeSingle();

    if (currentOrderError) {
      logSupabaseError(
        "GET ORDER BEFORE UPDATE",
        currentOrderError
      );

      throw new Error(
        getErrorMessage(
          currentOrderError,
          "خطا در بررسی وضعیت فعلی سفارش."
        )
      );
    }

    if (!currentOrder) {
      throw new Error(
        "سفارش موردنظر پیدا نشد یا قبلاً حذف شده است."
      );
    }

    if (
      currentOrder.workflow_version === "v2" &&
      input.status === "confirmed" &&
      currentOrder.approval_status !== "approved"
    ) {
      throw new Error(
        "وضعیت سفارش فقط پس از تأیید نهایی مدیر فروش می‌تواند «تأیید شده» شود."
      );
    }

    const updateData:
      Record<string, unknown> = {};

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
    } =
      await supabase
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
          companyId
        )
        .is(
          "deleted_at",
          null
        )
        .select("*")
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

    return this.getById(
      data.id
    );
  },

  async getItems(
    orderId: string
  ): Promise<OrderItem[]> {
    const companyId =
      await getRequiredCurrentCompanyId();

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
    } =
      await supabase
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
          companyId
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
    const companyId =
      await getRequiredCurrentCompanyId();

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

    const result =
      await resolveOrderItemProduct(
        normalized
      );

    const {
      productId,
      weightKg,
      product,
    } = result;

    const {
      data,
      error,
    } =
      await supabase
        .from("order_items")
        .insert({
          company_id:
            companyId,
          order_id:
            id,
          product_id:
            productId,
          product_name_snapshot:
            product.name,
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
    const companyId =
      await getRequiredCurrentCompanyId();

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

    const result =
      await resolveOrderItemProduct(
        normalized
      );

    const {
      productId,
      weightKg,
      product,
    } = result;

    const {
      data,
      error,
    } =
      await supabase
        .from("order_items")
        .update({
          product_id:
            productId,
          product_name_snapshot:
            product.name,
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
          companyId
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

  async deleteItem(    itemId: string
  ): Promise<void> {
    const companyId =
      await getRequiredCurrentCompanyId();

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
    } =
      await supabase
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
          companyId
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
    const companyId =
      await getRequiredCurrentCompanyId();

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
    } =
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
          orderId
        )
        .eq(
          "company_id",
          companyId
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
    const companyId =
      await getRequiredCurrentCompanyId();

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
    } =
      await supabase
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
          companyId
        )
        .not(
          "deleted_at",
          "is",
          null
        )
        .select("*")
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

    return this.getById(
      data.id
    );
  },

  /**
   * ارسال یک سفارش برای شروع چرخه Approval V2.
   *
   * Backend:
   *   v2_submit_order_for_approval
   *
   * نتیجه این عملیات:
   *   Draft/Returned -> pending regional approval
   */
  async submitForApproval(
    input:
      SubmitOrderForApprovalInput
  ): Promise<
    SubmitOrderForApprovalResponse
  > {
    const orderId =
      validateId(
        input.order_id,
        "شناسه سفارش الزامی است."
      );

    const supabase =
      createSupabaseClient();

    const idempotencyKey =
      input.idempotency_key?.trim() ||
      createIdempotencyKey(
        "submit",
        orderId
      );

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "v2_submit_order_for_approval",
        {
          p_order_id:
            orderId,
          p_idempotency_key:
            idempotencyKey,
          p_notes:
            input.notes?.trim() ||
            null,
        }
      );

    if (error) {
      logSupabaseError(
        "SUBMIT FOR APPROVAL",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در ارسال سفارش برای بررسی مدیر منطقه."
        )
      );
    }

    const rpcData =
      ensureRpcObject(
        data,
        "پاسخ نامعتبر از سرویس ارسال سفارش برای تأیید."
      );

    return {
      success:
        rpcData.success ===
        true,
      operation:
        getStringField(
          rpcData,
          "operation",
          "order.submit_for_approval"
        ),
      order_id:
        getStringField(
          rpcData,
          "order_id",
          orderId
        ),
      approval_stage:
        "regional",
      approval_id:
        getStringField(
          rpcData,
          "approval_id"
        ),
      cycle_number:
        getNumberField(
          rpcData,
          "cycle_number"
        ),
      approval_status:
        "pending",
    };
  },

  /**
   * ثبت تصمیم مدیر منطقه یا مدیر فروش.
   *
   * Regional:
   *   approve -> creates pending sales approval
   *
   * Sales:
   *   approve -> approval_status=approved
   *           -> fulfillment_status=ready
   *
   * Reject / Return:
   *   دلیل باید در Backend ارسال شود.
   */
  async decideApproval(
    input:
      DecideOrderApprovalInput
  ): Promise<
    DecideOrderApprovalResponse
  > {
    const orderId =
      validateId(
        input.order_id,
        "شناسه سفارش الزامی است."
      );

    if (
      input.decision !==
        "approve" &&
      input.decision !==
        "reject" &&
      input.decision !==
        "return"
    ) {
      throw new Error(
        "تصمیم تأیید سفارش معتبر نیست."
      );
    }

    if (
      input.stage !==
        "regional" &&
      input.stage !==
        "sales"
    ) {
      throw new Error(
        "مرحله تأیید سفارش معتبر نیست."
      );
    }

    if (
      (
        input.decision ===
          "reject" ||
        input.decision ===
          "return"
      ) &&
      !input.reason?.trim()
    ) {
      throw new Error(
        "برای رد یا برگشت سفارش، دلیل الزامی است."
      );
    }

    const supabase =
      createSupabaseClient();

    const idempotencyKey =
      input.idempotency_key?.trim() ||
      createIdempotencyKey(
        `approval-${input.stage}-${input.decision}`,
        orderId
      );

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "v2_decide_order_approval",
        {
          p_order_id:
            orderId,
          p_stage:
            input.stage,
          p_decision:
            input.decision,
          p_idempotency_key:
            idempotencyKey,
          p_reason:
            input.reason?.trim() ||
            null,
          p_notes:
            input.notes?.trim() ||
            null,
        }
      );

    if (error) {
      logSupabaseError(
        "DECIDE ORDER APPROVAL",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در ثبت تصمیم تأیید سفارش."
        )
      );
    }

    const rpcData =
      ensureRpcObject(
        data,
        "پاسخ نامعتبر از سرویس تأیید سفارش."
      );

    const approvalStatus =
      getStringField(
        rpcData,
        "approval_status"
      );

    if (
      approvalStatus !==
        "pending" &&
      approvalStatus !==
        "approved" &&
      approvalStatus !==
        "rejected" &&
      approvalStatus !==
        "returned" &&
      approvalStatus !==
        "cancelled"
    ) {
      throw new Error(
        "وضعیت بازگشتی تأیید سفارش معتبر نیست."
      );
    }

    const fulfillmentStatus =
      getStringField(
        rpcData,
        "fulfillment_status"
      );

    let normalizedFulfillmentStatus:
      | OrderFulfillmentStatus
      | undefined;

    if (
      fulfillmentStatus ===
        "not_ready" ||
      fulfillmentStatus ===
        "ready" ||
      fulfillmentStatus ===
        "partially_allocated" ||
      fulfillmentStatus ===
        "allocated" ||
      fulfillmentStatus ===
        "loading" ||
      fulfillmentStatus ===
        "loaded" ||
      fulfillmentStatus ===
        "sent" ||
      fulfillmentStatus ===
        "completed" ||
      fulfillmentStatus ===
        "cancelled"
    ) {
      normalizedFulfillmentStatus =
        fulfillmentStatus;
    }

    return {
      success:
        rpcData.success ===
        true,
      operation:
        getStringField(
          rpcData,
          "operation",
          "order.approval_decision"
        ),
      order_id:
        getStringField(
          rpcData,
          "order_id",
          orderId
        ),
      stage:
        input.stage,
      decision:
        input.decision,
      approval_id:
        getStringField(
          rpcData,
          "approval_id"
        ),
      next_approval_id:
        getStringField(
          rpcData,
          "next_approval_id"
        ) || undefined,
      next_stage:
        getStringField(
          rpcData,
          "next_stage"
        ) === "sales"
          ? "sales"
          : undefined,
      approval_status:
        approvalStatus as OrderApprovalStatus,
      fulfillment_status:
        normalizedFulfillmentStatus,
      reason:
        typeof rpcData.reason ===
        "string"
          ? rpcData.reason
          : null,
    };
  },

  /**
   * دریافت تمام سوابق Approval یک سفارش.
   *
   * این متد فقط خواندن است و هیچ تصمیمی را
   * مستقیماً روی order_approvals اعمال نمی‌کند.
   */
  async getApprovalHistory(
    orderId: string
  ): Promise<
    OrderApprovalHistoryItem[]
  > {
    const companyId =
      await getRequiredCurrentCompanyId();

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
    } =
      await supabase
        .from("order_approvals")
        .select(
          ORDER_APPROVAL_SELECT
        )
        .eq(
          "order_id",
          id
        )
        .eq(
          "company_id",
          companyId
        )
        .order(
          "cycle_number",
          {
            ascending: true,
          }
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        );

    if (error) {
      logSupabaseError(
        "GET APPROVAL HISTORY",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در دریافت تاریخچه تأیید سفارش."
        )
      );
    }

    return (
      (data ??
        []) as OrderApprovalHistoryItem[]
    );
  },

  /**
   * دریافت Approval در انتظار برای یک مرحله مشخص.
   *
   * به دلیل Unique Index بک‌اند، برای هر سفارش
   * و هر مرحله در هر لحظه حداکثر یک pending داریم.
   */
  async getPendingApproval(
    orderId: string,
    stage: OrderApprovalStage
  ): Promise<
    OrderApprovalHistoryItem | null
  > {
    const companyId =
      await getRequiredCurrentCompanyId();

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
    } =
      await supabase
        .from("order_approvals")
        .select(
          ORDER_APPROVAL_SELECT
        )
        .eq(
          "order_id",
          id
        )
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "approval_stage",
          stage
        )
        .eq(
          "status",
          "pending"
        )
        .is(
          "deleted_at",
          null
        )
        .maybeSingle();

    if (error) {
      logSupabaseError(
        "GET PENDING APPROVAL",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در دریافت مرحله در انتظار تأیید."
        )
      );
    }

    return data
      ? (data as OrderApprovalHistoryItem)
      : null;
  },

  /**
   * دریافت صف سفارش‌های در انتظار تأیید.
   *
   * Scope نهایی تصمیم‌گیری همچنان در RPCهای Backend
   * enforce می‌شود؛ این متد فقط داده لازم برای UI صف
   * Approval را بارگذاری می‌کند.
   */
  async getApprovalQueue(
    stage: OrderApprovalStage
  ): Promise<OrderApprovalQueueItem[]> {
    const companyId =
      await getRequiredCurrentCompanyId();

    const supabase =
      createSupabaseClient();

    const {
      data: approvalRows,
      error: approvalError,
    } =
      await supabase
        .from("order_approvals")
        .select(
          ORDER_APPROVAL_SELECT
        )
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "approval_stage",
          stage
        )
        .eq(
          "status",
          "pending"
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

    if (approvalError) {
      logSupabaseError(
        "GET APPROVAL QUEUE",
        approvalError
      );

      throw new Error(
        getErrorMessage(
          approvalError,
          "خطا در دریافت صف تأیید سفارش."
        )
      );
    }

    const approvals =
      (approvalRows ??
        []) as OrderApprovalHistoryItem[];

    if (approvals.length === 0) {
      return [];
    }

    const orderIds =
      Array.from(
        new Set(
          approvals.map(
            (approval) =>
              approval.order_id
          )
        )
      );

    const {
      data: orderRows,
      error: orderError,
    } =
      await supabase
        .from("orders")
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "workflow_version",
          "v2"
        )
        .in(
          "id",
          orderIds
        )
        .is(
          "deleted_at",
          null
        );

    if (orderError) {
      logSupabaseError(
        "GET APPROVAL QUEUE ORDERS",
        orderError
      );

      throw new Error(
        getErrorMessage(
          orderError,
          "خطا در دریافت سفارش‌های صف تأیید."
        )
      );
    }

    const orders =
      await getOrdersWithRelations(
        (orderRows ??
          []) as Order[]
      );

    const ordersById =
      new Map(
        orders.map(
          (order) => [
            order.id,
            order,
          ]
        )
      );

    return approvals
      .map(
        (approval) => {
          const order =
            ordersById.get(
              approval.order_id
            );

          if (!order) {
            return null;
          }

          return {
            order,
            approval,
          };
        }
      )
      .filter(
        (
          item
        ): item is OrderApprovalQueueItem =>
          item !== null
      );
  },

  /**
   * صف اقدام مدیر منطقه.
   *
   * موارد نمایش‌داده‌شده: 
   * 1) سفارش‌های منتظر تأیید منطقه
   * 2) سفارش‌های پیش‌نویس متعلق به مشتریان همان مدیر منطقه
   * 3) سفارش‌های برگشتی/ردشده در مرحله مدیر فروش که نیاز به اصلاح دارند
   *
   * منطق scope بر اساس V2 `customers.regional_manager_id` انجام می‌شود
   * تا صف منطقه از مدیر فروش و سایر مناطق مستقل بماند.
   */
  async getRegionalActionQueue(): Promise<
    RegionalActionQueueItem[]
  > {
    const companyId =
      await getRequiredCurrentCompanyId();

    const supabase =
      createSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      logSupabaseError(
        "GET REGIONAL ACTION QUEUE USER",
        userError
      );

      throw new Error(
        getErrorMessage(
          userError,
          "خطا در تشخیص کاربر مدیر منطقه."
        )
      );
    }

    if (!user) {
      throw new Error(
        "نشست کاربر فعال نیست. لطفاً دوباره وارد شوید."
      );
    }

    const {
      data: customerRows,
      error: customerError,
    } = await supabase
      .from("customers")
      .select("id")
      .eq("company_id", companyId)
      .eq("regional_manager_id", user.id)
      .is("deleted_at", null);

    if (customerError) {
      logSupabaseError(
        "GET REGIONAL ACTION QUEUE CUSTOMERS",
        customerError
      );

      throw new Error(
        getErrorMessage(
          customerError,
          "خطا در دریافت مشتریان تحت مدیریت منطقه."
        )
      );
    }

    const customerIds = Array.from(
      new Set(
        (customerRows ?? [])
          .map((row) => row.id)
          .filter(
            (id): id is string =>
              typeof id === "string" && id.trim().length > 0
          )
      )
    );

    const pendingApprovals =
      await this.getApprovalQueue("regional");

    const result: RegionalActionQueueItem[] =
      pendingApprovals.map((item) => ({
        order: item.order,
        kind: "pending_approval",
        approval: item.approval,
        reason: item.approval.return_reason ?? item.approval.rejection_reason ?? null,
        created_at: item.approval.created_at,
      }));

    if (customerIds.length === 0) {
      return result.sort(
        (first, second) =>
          Date.parse(second.created_at) -
          Date.parse(first.created_at)
      );
    }

    const {
      data: draftRows,
      error: draftError,
    } = await supabase
      .from("orders")
      .select("*")
      .eq("company_id", companyId)
      .eq("workflow_version", "v2")
      .in("customer_id", customerIds)
      .eq("status", "draft")
      .is("approval_status", null)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (draftError) {
      logSupabaseError(
        "GET REGIONAL DRAFT ORDERS",
        draftError
      );

      throw new Error(
        getErrorMessage(
          draftError,
          "خطا در دریافت سفارش‌های پیش‌نویس منطقه."
        )
      );
    }

    const draftOrders =
      await getOrdersWithRelations(
        (draftRows ?? []) as Order[]
      );

    for (const order of draftOrders) {
      result.push({
        order,
        kind: "draft",
        approval: null,
        reason: null,
        created_at: order.updated_at || order.created_at,
      });
    }

    const {
      data: correctionRows,
      error: correctionError,
    } = await supabase
      .from("orders")
      .select("*")
      .eq("company_id", companyId)
      .eq("workflow_version", "v2")
      .in("customer_id", customerIds)
      .in("approval_status", ["returned", "rejected"])
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (correctionError) {
      logSupabaseError(
        "GET REGIONAL SALES CORRECTIONS",
        correctionError
      );

      throw new Error(
        getErrorMessage(
          correctionError,
          "خطا در دریافت سفارش‌های برگشتی مدیر فروش."
        )
      );
    }

    const correctionOrders =
      await getOrdersWithRelations(
        (correctionRows ?? []) as Order[]
      );

    const correctionOrderIds = correctionOrders.map(      (order) => order.id
    );

    if (correctionOrderIds.length > 0) {
      const {
        data: historyRows,
        error: historyError,
      } = await supabase
        .from("order_status_history")
        .select(
          "id, order_id, new_status, reason, changed_at"
        )
        .eq("company_id", companyId)
        .in("order_id", correctionOrderIds)
        .in("new_status", [
          "sales_returned",
          "sales_rejected",
        ])
        .order("changed_at", { ascending: false });

      if (historyError) {
        logSupabaseError(
          "GET REGIONAL SALES CORRECTION HISTORY",
          historyError
        );

        throw new Error(
          getErrorMessage(
            historyError,
            "خطا در دریافت دلیل برگشت سفارش از مدیر فروش."
          )
        );
      }

      const latestHistoryByOrder =
        new Map<
          string,
          {
            new_status: string;
            reason: string | null;
            changed_at: string;
          }
        >();

      for (const row of historyRows ?? []) {
        if (!latestHistoryByOrder.has(row.order_id)) {
          latestHistoryByOrder.set(row.order_id, {
            new_status: row.new_status,
            reason: row.reason ?? null,
            changed_at: row.changed_at,
          });
        }
      }

      for (const order of correctionOrders) {
        const history =
          latestHistoryByOrder.get(order.id);

        if (!history) {
          continue;
        }

        result.push({
          order,
          kind:
            history.new_status === "sales_rejected"
              ? "sales_rejected"
              : "sales_returned",
          approval: null,
          reason: history.reason,
          created_at: history.changed_at,
        });
      }
    }

    return result
      .sort(
        (first, second) =>
          Date.parse(second.created_at) -
          Date.parse(first.created_at)
      );
  },

  /**
   * خلاصه وضعیت Workflow سفارش.
   *
   * وضعیت pending مرحله بعدی از تاریخچه Approval
   * استخراج می‌شود تا UI مجبور نباشد منطق دیتابیس را تکرار کند.
   */
  async getWorkflowSummary(
    orderId: string
  ): Promise<OrderWorkflowSummary> {
    const order =
      await this.getById(
        orderId
      );

    const pendingRegional =
      await this.getPendingApproval(
        order.id,
        "regional"
      );

    if (pendingRegional) {
      return {
        approval_status:
          order.approval_status,
        fulfillment_status:
          order.fulfillment_status,
        delivery_status:
          order.delivery_status,
        pending_stage:
          "regional",
      };
    }

    const pendingSales =
      await this.getPendingApproval(
        order.id,
        "sales"
      );

    if (pendingSales) {
      return {
        approval_status:
          order.approval_status,
        fulfillment_status:
          order.fulfillment_status,
        delivery_status:
          order.delivery_status,
        pending_stage:
          "sales",
      };
    }

    return {
      approval_status:
        order.approval_status,
      fulfillment_status:
        order.fulfillment_status,
      delivery_status:
        order.delivery_status,
      pending_stage:
        null,
    };
  },
};
import { createSupabaseClient } from "@/src/lib/supabase";

import type {
  Waybill,
  WaybillItem,
  Loading,
  CreateWaybillInput,
  CreateWaybillItemInput,
  UpdateWaybillInput,
  UpdateLoadingInput,
} from "@/src/lib/types/waybill";

const COMPANY_ID =
  "11111111-1111-1111-1111-111111111111";

const WAYBILL_BASE_SELECT = `
  id,
  company_id,
  order_id,
  waybill_number,
  waybill_date,
  status,
  notes,
  issued_at,
  issued_by,
  created_at,
  updated_at,
  deleted_at
`;

const WAYBILL_ITEM_SELECT = `
  id,
  company_id,
  waybill_id,
  order_item_id,
  product_id,
  product_name_snapshot,
  quantity,
  weight_kg_snapshot,
  tonnage,
  created_at,
  updated_at,
  deleted_at
`;

const LOADING_SELECT = `
  id,
  company_id,
  waybill_id,
  status,
  loading_date,
  confirmed_at,
  confirmed_by,
  notes,
  created_at,
  updated_at,
  deleted_at
`;

function getErrorMessage(
  error: unknown
): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    const message =
      (error as {
        message?: unknown;
      }).message;

    if (typeof message === "string") {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "خطای نامشخص در ارتباط با حواله.";
}

function logWaybillError(
  operation: string,
  error: unknown
): void {
  console.error(
    `========== WAYBILL ${operation} ERROR ==========`
  );

  if (
    error &&
    typeof error === "object"
  ) {
    console.error(
      "message:",
      getErrorMessage(error)
    );

    if ("code" in error) {
      console.error(
        "code:",
        (error as { code?: unknown })
          .code
      );
    }

    if ("details" in error) {
      console.error(
        "details:",
        (error as { details?: unknown })
          .details
      );
    }

    if ("hint" in error) {
      console.error(
        "hint:",
        (error as { hint?: unknown })
          .hint
      );
    }
  } else {
    console.error(error);
  }

  console.error(
    "=============================================="
  );
}

function normalizeWaybill(
  row: unknown
): Waybill {
  const data =
    row as Record<string, unknown>;

  return {
    id: String(data.id),
    company_id: String(
      data.company_id
    ),
    order_id: String(
      data.order_id
    ),
    waybill_number: Number(
      data.waybill_number
    ),
    waybill_date: String(
      data.waybill_date
    ),
    status:
      data.status as Waybill["status"],
    notes:
      (data.notes as
        | string
        | null) ?? null,
    issued_at:
      (data.issued_at as
        | string
        | null) ?? null,
    issued_by:
      (data.issued_by as
        | string
        | null) ?? null,
    created_at: String(
      data.created_at
    ),
    updated_at: String(
      data.updated_at
    ),
    deleted_at:
      (data.deleted_at as
        | string
        | null) ?? null,
    items: Array.isArray(
      data.items
    )
      ? (data.items as WaybillItem[])
      : [],
    loading:
      data.loading &&
      typeof data.loading ===
        "object"
        ? (data.loading as Loading)
        : null,
  };
}

async function getWaybillItems(
  waybillId: string
): Promise<WaybillItem[]> {
  const supabase =
    createSupabaseClient();

  const {
    data,
    error,
  } = await supabase
    .from("waybill_items")
    .select(
      WAYBILL_ITEM_SELECT
    )
    .eq(
      "waybill_id",
      waybillId
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
    logWaybillError(
      "GET ITEMS",
      error
    );

    throw new Error(
      getErrorMessage(error)
    );
  }

  return (
    (data ??
      []) as WaybillItem[]
  );
}

async function getWaybillLoading(
  waybillId: string
): Promise<Loading | null> {
  const supabase =
    createSupabaseClient();

  const {
    data,
    error,
  } = await supabase
    .from("loading")
    .select(
      LOADING_SELECT
    )
    .eq(
      "waybill_id",
      waybillId
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
    logWaybillError(
      "GET LOADING",
      error
    );

    throw new Error(
      getErrorMessage(error)
    );
  }

  return (
    data as Loading | null
  );
}

async function hydrateWaybill(
  waybill: Waybill
): Promise<Waybill> {
  const [
    items,
    loading,
  ] = await Promise.all([
    getWaybillItems(
      waybill.id
    ),
    getWaybillLoading(
      waybill.id
    ),
  ]);

  return {
    ...waybill,
    items,
    loading,
  };
}

export const waybillsService = {
  async getAll(): Promise<Waybill[]> {
    const supabase =
      createSupabaseClient();

    const {
      data,
      error,
    } = await supabase
      .from("waybills")
      .select(
        WAYBILL_BASE_SELECT
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
        "waybill_date",
        {
          ascending: false,
        }
      )
      .order(
        "waybill_number",
        {
          ascending: false,
        }
      );

    if (error) {
      logWaybillError(
        "GET ALL",
        error
      );

      throw new Error(
        getErrorMessage(error)
      );
    }

    const waybills =
      (data ?? []).map(
        normalizeWaybill
      );

    return Promise.all(
      waybills.map(
        hydrateWaybill
      )
    );
  },

  async getById(
    id: string
  ): Promise<Waybill | null> {
    const supabase =
      createSupabaseClient();

    const {
      data,
      error,
    } = await supabase
      .from("waybills")
      .select(
        WAYBILL_BASE_SELECT
      )
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
      .maybeSingle();

    if (error) {
      logWaybillError(
        "GET BY ID",
        error
      );

      throw new Error(
        getErrorMessage(error)
      );
    }

    if (!data) {
      return null;
    }

    return hydrateWaybill(
      normalizeWaybill(data)
    );
  },

  async getByOrderId(
    orderId: string
  ): Promise<Waybill[]> {
    const supabase =
      createSupabaseClient();

    if (!orderId?.trim()) {
      return [];
    }

    const {
      data,
      error,
    } = await supabase
      .from("waybills")
      .select(
        WAYBILL_BASE_SELECT
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .eq(
        "order_id",
        orderId.trim()
      )
      .is(
        "deleted_at",
        null
      )
      .order(
        "waybill_number",
        {
          ascending: false,
        }
      );

    if (error) {
      logWaybillError(
        "GET BY ORDER",
        error
      );

      throw new Error(
        getErrorMessage(error)
      );
    }

    const waybills =
      (data ?? []).map(
        normalizeWaybill
      );

    console.log(
      "WAYBILLS GET BY ORDER:",
      orderId,
      waybills.map(
        (waybill) => ({
          id: waybill.id,
          order_id:
            waybill.order_id,
          status:
            waybill.status,
          waybill_number:
            waybill.waybill_number,
        })
      )
    );

    return Promise.all(
      waybills.map(
        hydrateWaybill
      )
    );
  },

  async create(
    input: CreateWaybillInput
  ): Promise<Waybill> {
    const supabase =
      createSupabaseClient();

    if (!input.order_id) {
      throw new Error(
        "شناسه سفارش الزامی است."
      );
    }

    if (!input.waybill_date) {
      throw new Error(
        "تاریخ حواله الزامی است."
      );
    }

    const {
      data: order,
      error: orderError,
    } = await supabase
      .from("orders")
      .select(`
        id,
        company_id,
        status
      `)
      .eq(
        "id",
        input.order_id
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

    if (orderError) {
      logWaybillError(
        "CREATE GET ORDER",
        orderError
      );

      throw new Error(
        getErrorMessage(
          orderError
        )
      );
    }

    if (!order) {
      throw new Error(
        "سفارش موردنظر پیدا نشد."
      );
    }

    if (
      order.status !==
      "confirmed"
    ) {
      throw new Error(
        "فقط سفارش تأییدشده امکان صدور حواله دارد."
      );
    }

    const {
      data: orderItems,
      error:
        orderItemsError,
    } = await supabase
      .from("order_items")
      .select(`
        id,
        company_id,
        product_id,
        product_name_snapshot,
        quantity,
        weight_kg_snapshot,
        deleted_at
      `)
      .eq(
        "order_id",
        input.order_id
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

    if (orderItemsError) {
      logWaybillError(
        "CREATE GET ORDER ITEMS",
        orderItemsError
      );

      throw new Error(
        getErrorMessage(
          orderItemsError
        )
      );
    }

    const activeOrderItems =
      (
        orderItems ?? []
      ) as Array<{
        id: string;
        company_id: string;
        product_id: string;
        product_name_snapshot:
          | string
          | null;
        quantity: number;
        weight_kg_snapshot: number;
        deleted_at:
          | string
          | null;
      }>;

    if (
      activeOrderItems.length ===
      0
    ) {
      throw new Error(
        "سفارش هیچ قلم فعالی برای صدور حواله ندارد."
      );
    }

    const orderItemIds =
      activeOrderItems.map(
        (item) => item.id
      );

    const {
      data: existingItems,
      error:
        existingError,
    } = await supabase
      .from("waybill_items")
      .select(
        "order_item_id"
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .in(
        "order_item_id",
        orderItemIds
      )
      .is(
        "deleted_at",
        null
      );

    if (existingError) {
      logWaybillError(
        "CHECK EXISTING ITEMS",
        existingError
      );

      throw new Error(
        getErrorMessage(
          existingError
        )
      );
    }

    if (
      existingItems &&
      existingItems.length > 0
    ) {
      throw new Error(
        "برای یکی از اقلام این سفارش قبلاً حواله فعال صادر شده است."
      );
    }

    const {
      data: waybill,
      error: waybillError,
    } = await supabase
      .from("waybills")
      .insert({
        company_id:
          COMPANY_ID,
        order_id:
          input.order_id,
        waybill_date:
          input.waybill_date,
        status: "draft",
        notes:
          input.notes ?? null,
      })
      .select(
        WAYBILL_BASE_SELECT
      )
      .single();

    if (waybillError) {
      logWaybillError(
        "CREATE",
        waybillError
      );

      throw new Error(
        getErrorMessage(
          waybillError
        )
      );
    }

    const items: CreateWaybillItemInput[] =
      activeOrderItems.map(
        (item) => ({
          company_id:
            COMPANY_ID,
          waybill_id:
            waybill.id,
          order_item_id:
            item.id,
          product_id:
            item.product_id,
          product_name_snapshot:
            item.product_name_snapshot ??
            "",
          quantity:
            item.quantity,
          weight_kg_snapshot:
            item.weight_kg_snapshot,
        })
      );

    const {
      error: itemsError,
    } = await supabase
      .from("waybill_items")
      .insert(items);

    if (itemsError) {
      logWaybillError(
        "CREATE ITEMS",
        itemsError
      );

      await supabase
        .from("waybills")
        .update({
          deleted_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          waybill.id
        )
        .eq(
          "company_id",
          COMPANY_ID
        );

      throw new Error(
        getErrorMessage(
          itemsError
        )
      );
    }

    const {
      data: authData,
    } =
      await supabase.auth.getUser();

    const {
      error: issueError,
    } = await supabase
      .from("waybills")
      .update({
        status: "issued",
        issued_at:
          new Date().toISOString(),
        issued_by:
          authData.user?.id ??
          null,
      })
      .eq(
        "id",
        waybill.id
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      );

    if (issueError) {
      logWaybillError(
        "ISSUE",
        issueError
      );

      throw new Error(
        getErrorMessage(
          issueError
        )
      );
    }

    const result =
      await this.getById(
        waybill.id
      );

    if (!result) {
      throw new Error(
        "حواله ایجاد شد اما اطلاعات آن قابل دریافت نیست."
      );
    }

    return result;
  },

  async update(
    id: string,
    input: UpdateWaybillInput
  ): Promise<Waybill> {
    const supabase =
      createSupabaseClient();

    const updateData: Record<
      string,
      unknown
    > = {};

    if (
      input.waybill_date !==
      undefined
    ) {
      updateData.waybill_date =
        input.waybill_date;
    }

    if (
      input.notes !==
      undefined
    ) {
      updateData.notes =
        input.notes;
    }

    if (
      Object.keys(
        updateData
      ).length === 0
    ) {
      const existing =
        await this.getById(id);

      if (!existing) {
        throw new Error(
          "حواله پیدا نشد."
        );
      }

      return existing;
    }

    const {
      error,
    } = await supabase
      .from("waybills")
      .update(updateData)
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
      );

    if (error) {
      logWaybillError(
        "UPDATE",
        error
      );

      throw new Error(
        getErrorMessage(error)
      );
    }

    const result =
      await this.getById(id);

    if (!result) {
      throw new Error(
        "حواله پس از ویرایش پیدا نشد."
      );
    }

    return result;
  },

  async getItems(
    waybillId: string
  ): Promise<WaybillItem[]> {
    return getWaybillItems(
      waybillId
    );
  },

  async getLoading(
    waybillId: string
  ): Promise<Loading | null> {
    return getWaybillLoading(
      waybillId
    );
  },

  async updateLoading(
    waybillId: string,
    input: UpdateLoadingInput
  ): Promise<Loading> {
    const supabase =
      createSupabaseClient();

    const updateData: Record<
      string,
      unknown
    > = {};

    if (
      input.loading_date !==
      undefined
    ) {
      updateData.loading_date =
        input.loading_date;
    }

    if (
      input.notes !==
      undefined
    ) {
      updateData.notes =
        input.notes;
    }

    if (
      Object.keys(
        updateData
      ).length === 0
    ) {
      const existing =
        await this.getLoading(
          waybillId
        );

      if (!existing) {
        throw new Error(
          "رکورد بارگیری پیدا نشد."
        );
      }

      return existing;
    }

    const {
      data,
      error,
    } = await supabase
      .from("loading")
      .update(updateData)
      .eq(
        "waybill_id",
        waybillId
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
        LOADING_SELECT
      )
      .single();

    if (error) {
      logWaybillError(
        "UPDATE LOADING",
        error
      );

      throw new Error(
        getErrorMessage(error)
      );
    }

    return data as Loading;
  },

  async confirmLoading(
    waybillId: string
  ): Promise<Waybill> {
    const supabase =
      createSupabaseClient();

    const {
      data: authData,
    } =
      await supabase.auth.getUser();

    if (!authData.user) {
      throw new Error(
        "کاربر وارد سیستم نشده است."
      );
    }

    const {
      data,
      error,
    } = await supabase
      .from("loading")
      .update({
        status: "confirmed",
        confirmed_at:
          new Date().toISOString(),
        confirmed_by:
          authData.user.id,
      })
      .eq(
        "waybill_id",
        waybillId
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .eq(
        "status",
        "pending"
      )
      .is(
        "deleted_at",
        null
      )
      .select(
        LOADING_SELECT
      )
      .single();

    if (error) {
      logWaybillError(
        "CONFIRM LOADING",
        error
      );

      throw new Error(
        getErrorMessage(error)
      );
    }

    if (!data) {
      throw new Error(
        "رکورد بارگیری قابل تأیید نیست."
      );
    }

    /*
     * وضعیت اصلی حواله نیز باید
     * پس از تأیید بارگیری به
     * loading_confirmed تبدیل شود.
     *
     * این بخش برای هماهنگی با
     * waybills.status اجرا می‌شود.
     */
    const {
      error: waybillUpdateError,
    } = await supabase
      .from("waybills")
      .update({
        status:
          "loading_confirmed",
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        waybillId
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      );

    if (waybillUpdateError) {
      logWaybillError(
        "UPDATE WAYBILL AFTER LOADING",
        waybillUpdateError
      );

      throw new Error(
        getErrorMessage(
          waybillUpdateError
        )
      );
    }

    const result =
      await this.getById(
        waybillId
      );

    if (!result) {
      throw new Error(
        "حواله پس از تأیید بارگیری پیدا نشد."
      );
    }

    return result;
  },

  async cancelLoading(
    waybillId: string
  ): Promise<Waybill> {
    const supabase =
      createSupabaseClient();

    const {
      error,
    } = await supabase
      .from("loading")
      .update({
        status:
          "cancelled",
      })
      .eq(
        "waybill_id",
        waybillId
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .eq(
        "status",
        "pending"
      )
      .is(
        "deleted_at",
        null
      );

    if (error) {
      logWaybillError(
        "CANCEL LOADING",
        error
      );

      throw new Error(
        getErrorMessage(error)
      );
    }

    const result =
      await this.getById(
        waybillId
      );

    if (!result) {
      throw new Error(
        "حواله پس از لغو بارگیری پیدا نشد."
      );
    }

    return result;
  },

  async cancel(
    id: string
  ): Promise<Waybill> {
    const supabase =
      createSupabaseClient();

    const {
      data: waybill,
      error: getError,
    } = await supabase
      .from("waybills")
      .select(
        `
          id,
          status,
          company_id
        `
      )
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
      .maybeSingle();

    if (getError) {
      throw new Error(
        getErrorMessage(
          getError
        )
      );
    }

    if (!waybill) {
      throw new Error(
        "حواله پیدا نشد."
      );
    }

    if (
      waybill.status ===
      "loading_confirmed"
    ) {
      throw new Error(
        "حواله‌ای که بارگیری آن تأیید شده قابل لغو نیست."
      );
    }

    const {
      error,
    } = await supabase
      .from("waybills")
      .update({
        status:
          "cancelled",
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
      );

    if (error) {
      logWaybillError(
        "CANCEL",
        error
      );

      throw new Error(
        getErrorMessage(error)
      );
    }

    const result =
      await this.getById(id);

    if (!result) {
      throw new Error(
        "حواله پس از لغو پیدا نشد."
      );
    }

    return result;
  },
};
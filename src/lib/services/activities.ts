import { createSupabaseClient } from "@/src/lib/supabase";
import type { Call, FollowUp } from "@/src/lib/types/activity";

const COMPANY_ID =
  "11111111-1111-1111-1111-111111111111";

export interface CallWithRelations extends Call {
  customer: {
    id: string;
    name: string;
    phone: string | null;
    secondary_phone: string | null;
  } | null;

  user: {
    id: string;
    full_name: string;
    phone: string | null;
    job_title: string | null;
  } | null;
}

export interface FollowUpWithRelations
  extends FollowUp {
  customer: {
    id: string;
    name: string;
    phone: string | null;
    secondary_phone: string | null;
  } | null;

  user: {
    id: string;
    full_name: string;
    phone: string | null;
    job_title: string | null;
  } | null;
}

export interface CreateCallInput {
  customer_id: string;
  user_id: string;
  call_date?: string;
  direction?: string;
  outcome?: string;
  duration_seconds?: number;
  notes?: string | null;
  source?: string;
  external_reference?: string | null;
}

export interface UpdateCallInput {
  customer_id?: string;
  user_id?: string;
  call_date?: string;
  direction?: string;
  outcome?: string;
  duration_seconds?: number;
  notes?: string | null;
  source?: string;
  external_reference?: string | null;
}

export interface CreateFollowUpInput {
  customer_id: string;
  user_id: string;
  scheduled_at: string;
  completed_at?: string | null;
  status?: string;
  priority?: string;
  subject?: string | null;
  notes?: string | null;
  source?: string;
}

export interface UpdateFollowUpInput {
  customer_id?: string;
  user_id?: string;
  scheduled_at?: string;
  completed_at?: string | null;
  status?: string;
  priority?: string;
  subject?: string | null;
  notes?: string | null;
  source?: string;
}

export interface CustomerLastActivity {
  customer_id: string;
  last_activity_at: string | null;
  last_activity_type:
    | "call"
    | "follow_up"
    | null;
}

const CALL_SELECT = `
  *,
  customer:customers!calls_customer_id_fkey (
    id,
    name,
    phone,
    secondary_phone
  ),
  user:users!calls_user_id_fkey (
    id,
    full_name,
    phone,
    job_title
  )
`;

const FOLLOW_UP_SELECT = `
  *,
  customer:customers!follow_ups_customer_id_fkey (
    id,
    name,
    phone,
    secondary_phone
  ),
  user:users!follow_ups_user_id_fkey (
    id,
    full_name,
    phone,
    job_title
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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(message);
  }

  return value;
}

function validatePastOrNowDate(
  value: string | undefined,
  message: string,
  futureMessage: string
): string {
  const dateValue = validateDate(
    value,
    message
  );

  const timestamp = new Date(
    dateValue
  ).getTime();

  if (
    Number.isNaN(timestamp) ||
    timestamp > Date.now()
  ) {
    throw new Error(futureMessage);
  }

  return dateValue;
}

function validateDuration(
  value: number | undefined
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(
      "مدت تماس نمی‌تواند منفی باشد."
    );
  }

  return value;
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
    `========== ACTIVITY ${operation} ERROR ==========`
  );

  if (isSupabaseError(error)) {
    console.error(
      "message:",
      error.message
    );

    console.error(
      "code:",
      error.code
    );

    console.error(
      "details:",
      error.details
    );

    console.error(
      "hint:",
      error.hint
    );
  } else {
    console.error(
      "error:",
      error
    );
  }

  console.error(
    "=================================================="
  );
}

function getValidTimestamp(
  value: string | null | undefined
): number | null {
  if (!value) {
    return null;
  }

  const timestamp =
    new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return timestamp;
}

/**
 * آخرین فعالیت واقعی مشتری:
 *
 * 1) تماس ثبت‌شده با call_date واقعی
 * 2) پیگیری فقط در صورت completed بودن،
 *    بر اساس completed_at
 *
 * scheduled_at به‌هیچ‌وجه فعالیت واقعی محسوب نمی‌شود.
 */
function getLatestActivity(
  current: CustomerLastActivity,
  activityAt: string | null,
  activityType:
    | "call"
    | "follow_up"
): CustomerLastActivity {
  if (!activityAt) {
    return current;
  }

  const nextTimestamp =
    getValidTimestamp(activityAt);

  if (nextTimestamp === null) {
    return current;
  }

  if (
    current.last_activity_at === null
  ) {
    return {
      customer_id:
        current.customer_id,
      last_activity_at: activityAt,
      last_activity_type:
        activityType,
    };
  }

  const currentTimestamp =
    getValidTimestamp(
      current.last_activity_at
    );

  if (currentTimestamp === null) {
    return {
      customer_id:
        current.customer_id,
      last_activity_at: activityAt,
      last_activity_type:
        activityType,
    };
  }

  if (
    nextTimestamp > currentTimestamp
  ) {
    return {
      customer_id:
        current.customer_id,
      last_activity_at: activityAt,
      last_activity_type:
        activityType,
    };
  }

  return current;
}

export const activitiesService = {
  // =========================================================
  // CALLS
  // =========================================================

  async getCalls(): Promise<
    CallWithRelations[]
  > {
    const supabase =
      createSupabaseClient();

    const {
      data,
      error,
    } = await supabase
      .from("calls")
      .select(CALL_SELECT)
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is("deleted_at", null)
      .order("call_date", {
        ascending: false,
      });

    if (error) {
      logSupabaseError(
        "GET CALLS",
        error
      );

      throw error;
    }

    return (data ??
      []) as CallWithRelations[];
  },

  async getCallById(
    id: string
  ): Promise<CallWithRelations> {
    const supabase =
      createSupabaseClient();

    const callId = validateId(
      id,
      "شناسه تماس الزامی است."
    );

    const {
      data,
      error,
    } = await supabase
      .from("calls")
      .select(CALL_SELECT)
      .eq("id", callId)
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is("deleted_at", null)
      .single();

    if (error) {
      logSupabaseError(
        "GET CALL BY ID",
        error
      );

      throw error;
    }

    return data as CallWithRelations;
  },

  async getCallsByCustomerId(
    customerId: string
  ): Promise<CallWithRelations[]> {
    const supabase =
      createSupabaseClient();

    const id = validateId(
      customerId,
      "شناسه مشتری الزامی است."
    );

    const {
      data,
      error,
    } = await supabase
      .from("calls")
      .select(CALL_SELECT)
      .eq(
        "customer_id",
        id
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is("deleted_at", null)
      .order("call_date", {
        ascending: false,
      });

    if (error) {
      logSupabaseError(
        "GET CALLS BY CUSTOMER",
        error
      );

      throw error;
    }

    return (data ??
      []) as CallWithRelations[];
  },

  async createCall(
    input: CreateCallInput
  ): Promise<CallWithRelations> {
    const supabase =
      createSupabaseClient();

    const customerId = validateId(
      input.customer_id,
      "انتخاب مشتری الزامی است."
    );

    const userId = validateId(
      input.user_id,
      "انتخاب کاربر الزامی است."
    );

    const callDate =
      input.call_date
        ? validatePastOrNowDate(
            input.call_date,
            "تاریخ تماس معتبر نیست.",
            "تاریخ و زمان تماس نمی‌تواند در آینده باشد."
          )
        : undefined;

    const duration =
      validateDuration(
        input.duration_seconds
      );

    const payload = {
      company_id: COMPANY_ID,
      customer_id: customerId,
      user_id: userId,

      ...(callDate
        ? {
            call_date:
              callDate,
          }
        : {}),

      ...(input.direction
        ? {
            direction:
              input.direction,
          }
        : {}),

      ...(input.outcome
        ? {
            outcome:
              input.outcome,
          }
        : {}),

      ...(duration !==
      undefined
        ? {
            duration_seconds:
              duration,
          }
        : {}),

      notes:
        input.notes ?? null,

      ...(input.source
        ? {
            source:
              input.source,
          }
        : {}),

      external_reference:
        input.external_reference ??
        null,
    };

    const {
      data,
      error,
    } = await supabase
      .from("calls")
      .insert(payload)
      .select(CALL_SELECT)
      .single();

    if (error) {
      logSupabaseError(
        "CREATE CALL",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در ثبت تماس."
        )
      );
    }

    return data as CallWithRelations;
  },

  async updateCall(
    id: string,
    input: UpdateCallInput
  ): Promise<CallWithRelations> {
    const supabase =
      createSupabaseClient();

    const callId = validateId(
      id,
      "شناسه تماس الزامی است."
    );

    const updateData: UpdateCallInput & {
      updated_at: string;
    } = {
      ...input,
      updated_at:
        new Date().toISOString(),
    };

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
      input.user_id !==
      undefined
    ) {
      updateData.user_id =
        validateId(
          input.user_id,
          "شناسه کاربر معتبر نیست."
        );
    }

    if (
      input.call_date !==
      undefined
    ) {
      updateData.call_date =
        validatePastOrNowDate(
          input.call_date,
          "تاریخ تماس معتبر نیست.",
          "تاریخ و زمان تماس نمی‌تواند در آینده باشد."
        );
    }

    if (
      input.duration_seconds !==
      undefined
    ) {
      updateData.duration_seconds =
        validateDuration(
          input.duration_seconds
        )!;
    }

    const {
      data,
      error,
    } = await supabase
      .from("calls")
      .update(updateData)
      .eq("id", callId)
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is("deleted_at", null)
      .select(CALL_SELECT)
      .single();

    if (error) {
      logSupabaseError(
        "UPDATE CALL",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در ویرایش تماس."
        )
      );
    }

    return data as CallWithRelations;
  },

  async softDeleteCall(
    id: string
  ): Promise<void> {
    const supabase =
      createSupabaseClient();

    const callId = validateId(
      id,
      "شناسه تماس الزامی است."
    );

    const now =
      new Date().toISOString();

    const {
      error,
    } = await supabase
      .from("calls")
      .update({
        deleted_at: now,
        updated_at: now,
      })
      .eq("id", callId)
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is("deleted_at", null);

    if (error) {
      logSupabaseError(
        "DELETE CALL",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در حذف تماس."
        )
      );
    }
  },

  // =========================================================
  // FOLLOW UPS
  // =========================================================

  async getFollowUps(): Promise<
    FollowUpWithRelations[]
  > {
    const supabase =
      createSupabaseClient();

    const {
      data,
      error,
    } = await supabase
      .from("follow_ups")
      .select(FOLLOW_UP_SELECT)
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is("deleted_at", null)
      .order("scheduled_at", {
        ascending: true,
      });

    if (error) {
      logSupabaseError(
        "GET FOLLOW UPS",
        error
      );

      throw error;
    }

    return (data ??
      []) as FollowUpWithRelations[];
  },

  async getFollowUpById(
    id: string
  ): Promise<FollowUpWithRelations> {
    const supabase =
      createSupabaseClient();

    const followUpId =
      validateId(
        id,
        "شناسه پیگیری الزامی است."
      );

    const {
      data,
      error,
    } = await supabase
      .from("follow_ups")
      .select(FOLLOW_UP_SELECT)
      .eq("id", followUpId)
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is("deleted_at", null)
      .single();

    if (error) {
      logSupabaseError(
        "GET FOLLOW UP BY ID",
        error
      );

      throw error;
    }

    return data as FollowUpWithRelations;
  },

  async getFollowUpsByCustomerId(
    customerId: string
  ): Promise<FollowUpWithRelations[]> {
    const supabase =
      createSupabaseClient();

    const id = validateId(
      customerId,
      "شناسه مشتری الزامی است."
    );

    const {
      data,
      error,
    } = await supabase
      .from("follow_ups")
      .select(FOLLOW_UP_SELECT)
      .eq(
        "customer_id",
        id
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is("deleted_at", null)
      .order("scheduled_at", {
        ascending: true,
      });

    if (error) {
      logSupabaseError(
        "GET FOLLOW UPS BY CUSTOMER",
        error
      );

      throw error;
    }

    return (data ??
      []) as FollowUpWithRelations[];
  },

  async createFollowUp(
    input: CreateFollowUpInput
  ): Promise<FollowUpWithRelations> {
    const supabase =
      createSupabaseClient();

    const customerId = validateId(
      input.customer_id,
      "انتخاب مشتری الزامی است."
    );

    const userId = validateId(
      input.user_id,
      "انتخاب کاربر الزامی است."
    );

    const scheduledAt =
      validateDate(
        input.scheduled_at,
        "تاریخ پیگیری معتبر نیست."
      );

    const completedAt =
      input.completed_at
        ? validateDate(
            input.completed_at,
            "تاریخ تکمیل پیگیری معتبر نیست."
          )
        : null;

    const payload = {
      company_id: COMPANY_ID,
      customer_id: customerId,
      user_id: userId,
      scheduled_at:
        scheduledAt,
      completed_at:
        completedAt,

      ...(input.status
        ? {
            status:
              input.status,
          }
        : {}),

      ...(input.priority
        ? {
            priority:
              input.priority,
          }
        : {}),

      subject:
        input.subject ?? null,

      notes:
        input.notes ?? null,

      ...(input.source
        ? {
            source:
              input.source,
          }
        : {}),
    };

    const {
      data,
      error,
    } = await supabase
      .from("follow_ups")
      .insert(payload)
      .select(FOLLOW_UP_SELECT)
      .single();

    if (error) {
      logSupabaseError(
        "CREATE FOLLOW UP",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در ثبت پیگیری."
        )
      );
    }

    return data as FollowUpWithRelations;
  },

  async updateFollowUp(
    id: string,
    input: UpdateFollowUpInput
  ): Promise<FollowUpWithRelations> {
    const supabase =
      createSupabaseClient();

    const followUpId =
      validateId(
        id,
        "شناسه پیگیری الزامی است."
      );

    const updateData:
      | UpdateFollowUpInput & {
          updated_at: string;
        } = {
      ...input,
      updated_at:
        new Date().toISOString(),
    };

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
      input.user_id !==
      undefined
    ) {
      updateData.user_id =
        validateId(
          input.user_id,
          "شناسه کاربر معتبر نیست."
        );
    }

    if (
      input.scheduled_at !==
      undefined
    ) {
      updateData.scheduled_at =
        validateDate(
          input.scheduled_at,
          "تاریخ پیگیری معتبر نیست."
        );
    }

    if (
      input.completed_at !==
      undefined &&
      input.completed_at !== null
    ) {
      updateData.completed_at =
        validatePastOrNowDate(
          input.completed_at,
          "تاریخ تکمیل پیگیری معتبر نیست.",
          "تاریخ تکمیل پیگیری نمی‌تواند در آینده باشد."
        );
    }

    const {
      data,
      error,
    } = await supabase
      .from("follow_ups")
      .update(updateData)
      .eq(
        "id",
        followUpId
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is("deleted_at", null)
      .select(FOLLOW_UP_SELECT)
      .single();

    if (error) {
      logSupabaseError(
        "UPDATE FOLLOW UP",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در ویرایش پیگیری."
        )
      );
    }

    return data as FollowUpWithRelations;
  },

  async completeFollowUp(
    id: string
  ): Promise<FollowUpWithRelations> {
    const supabase =
      createSupabaseClient();

    const followUpId =
      validateId(
        id,
        "شناسه پیگیری الزامی است."
      );

    const completedAt =
      new Date().toISOString();

    const {
      data,
      error,
    } = await supabase
      .from("follow_ups")
      .update({
        status: "completed",
        completed_at:
          completedAt,
        updated_at:
          completedAt,
      })
      .eq(
        "id",
        followUpId
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is("deleted_at", null)
      .select(FOLLOW_UP_SELECT)
      .single();

    if (error) {
      logSupabaseError(
        "COMPLETE FOLLOW UP",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در تکمیل پیگیری."
        )
      );
    }

    return data as FollowUpWithRelations;
  },

  async softDeleteFollowUp(
    id: string
  ): Promise<void> {
    const supabase =
      createSupabaseClient();

    const followUpId =
      validateId(
        id,
        "شناسه پیگیری الزامی است."
      );

    const now =
      new Date().toISOString();

    const {
      error,
    } = await supabase
      .from("follow_ups")
      .update({
        deleted_at: now,
        updated_at: now,
      })
      .eq(
        "id",
        followUpId
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is("deleted_at", null);

    if (error) {
      logSupabaseError(
        "DELETE FOLLOW UP",
        error
      );

      throw new Error(
        getErrorMessage(
          error,
          "خطا در حذف پیگیری."
        )
      );
    }
  },

  // =========================================================
  // ACTUAL CUSTOMER ACTIVITY
  // =========================================================

  /**
   * آخرین فعالیت واقعی یک مشتری را برمی‌گرداند.
   *
   * تماس:
   *   call_date
   *
   * پیگیری:
   *   فقط status = completed
   *   و completed_at
   *
   * pending / cancelled / scheduled_at
   * در این محاسبه وارد نمی‌شوند.
   */
  async getLastActualActivityByCustomerId(
    customerId: string
  ): Promise<CustomerLastActivity> {
    const supabase =
      createSupabaseClient();

    const id = validateId(
      customerId,
      "شناسه مشتری الزامی است."
    );

    const now =
      new Date().toISOString();

    const [
      callsResult,
      followUpsResult,
    ] = await Promise.all([
      supabase
        .from("calls")
        .select(
          "customer_id, call_date"
        )
        .eq(
          "company_id",
          COMPANY_ID
        )
        .eq(
          "customer_id",
          id
        )
        .is("deleted_at", null)
        .lte(
          "call_date",
          now
        )
        .order("call_date", {
          ascending: false,
        })
        .limit(1),

      supabase
        .from("follow_ups")
        .select(
          "customer_id, status, completed_at"
        )
        .eq(
          "company_id",
          COMPANY_ID
        )
        .eq(
          "customer_id",
          id
        )
        .eq(
          "status",
          "completed"
        )
        .is(
          "deleted_at",
          null
        )
        .not(
          "completed_at",
          "is",
          null
        )
        .lte(
          "completed_at",
          now
        )
        .order(
          "completed_at",
          {
            ascending: false,
          }
        )
        .limit(1),
    ]);

    if (callsResult.error) {
      logSupabaseError(
        "GET LAST ACTIVITY CALL",
        callsResult.error
      );

      throw callsResult.error;
    }

    if (
      followUpsResult.error
    ) {
      logSupabaseError(
        "GET LAST ACTIVITY FOLLOW UP",
        followUpsResult.error
      );

      throw followUpsResult.error;
    }

    const firstCall =
      callsResult.data?.[0];

    const firstFollowUp =
      followUpsResult.data?.[0];

    let result: CustomerLastActivity =
      {
        customer_id: id,
        last_activity_at:
          null,
        last_activity_type:
          null,
      };

    result =
      getLatestActivity(
        result,
        firstCall?.call_date ??
          null,
        "call"
      );

    result =
      getLatestActivity(
        result,
        firstFollowUp?.completed_at ??
          null,
        "follow_up"
      );

    return result;
  },

  /**
   * نسخه تجمیعی برای AI و لیست اولویت‌ها.
   *
   * به جای اجرای یک کوئری برای هر مشتری،
   * تماس‌ها و پیگیری‌های تکمیل‌شده را یکجا می‌گیرد.
   */
  async getLastActualActivitiesByCustomerIds(
    customerIds: string[]
  ): Promise<
    Map<string, CustomerLastActivity>
  > {
    const supabase =
      createSupabaseClient();

    const ids = Array.from(
      new Set(
        customerIds
          .map((id) =>
            id?.trim()
          )
          .filter(Boolean)
      )
    );

    const resultMap =
      new Map<
        string,
        CustomerLastActivity
      >();

    for (const id of ids) {
      resultMap.set(id, {
        customer_id: id,
        last_activity_at:
          null,
        last_activity_type:
          null,
      });
    }

    if (ids.length === 0) {
      return resultMap;
    }

    const now =
      new Date().toISOString();

    const [
      callsResult,
      followUpsResult,
    ] = await Promise.all([
      supabase
        .from("calls")
        .select(
          "customer_id, call_date"
        )
        .eq(
          "company_id",
          COMPANY_ID
        )
        .in(
          "customer_id",
          ids
        )
        .is("deleted_at", null)
        .lte(
          "call_date",
          now
        )
        .order("call_date", {
          ascending: false,
        }),

      supabase
        .from("follow_ups")
        .select(
          "customer_id, status, completed_at"
        )
        .eq(
          "company_id",
          COMPANY_ID
        )
        .in(
          "customer_id",
          ids
        )
        .eq(
          "status",
          "completed"
        )
        .is(
          "deleted_at",
          null
        )
        .not(
          "completed_at",
          "is",
          null
        )
        .lte(
          "completed_at",
          now
        )
        .order(
          "completed_at",
          {
            ascending: false,
          }
        ),
    ]);

    if (callsResult.error) {
      logSupabaseError(
        "GET LAST ACTIVITIES CALLS",
        callsResult.error
      );

      throw callsResult.error;
    }

    if (
      followUpsResult.error
    ) {
      logSupabaseError(
        "GET LAST ACTIVITIES FOLLOW UPS",
        followUpsResult.error
      );

      throw followUpsResult.error;
    }

    for (const call of callsResult.data ??
      []) {
      const customerId =
        call.customer_id;

      if (!customerId) {
        continue;
      }

      const current =
        resultMap.get(
          customerId
        );

      if (!current) {
        continue;
      }

      resultMap.set(
        customerId,
        getLatestActivity(
          current,
          call.call_date ??
            null,
          "call"
        )
      );
    }

    for (const followUp of followUpsResult.data ??
      []) {
      const customerId =
        followUp.customer_id;

      if (!customerId) {
        continue;
      }

      const current =
        resultMap.get(
          customerId
        );

      if (!current) {
        continue;
      }

      resultMap.set(
        customerId,
        getLatestActivity(
          current,
          followUp.completed_at ??
            null,
          "follow_up"
        )
      );
    }

    return resultMap;
  },
};
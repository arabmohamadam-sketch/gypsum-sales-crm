import { createSupabaseClient } from "@/src/lib/supabase";
import type { Call, FollowUp } from "@/src/lib/types/activity";

const COMPANY_ID = "11111111-1111-1111-1111-111111111111";

// ============================================================
// RELATION TYPES
// ============================================================

export interface CallWithRelations extends Call {
  customer: {
    id: string;
    name: string;
    phone: string | null;
  } | null;

  user: {
    id: string;
    full_name: string;
    phone: string | null;
    job_title: string | null;
  } | null;
}

export interface FollowUpWithRelations extends FollowUp {
  customer: {
    id: string;
    name: string;
    phone: string | null;
  } | null;

  user: {
    id: string;
    full_name: string;
    phone: string | null;
    job_title: string | null;
  } | null;
}

// ============================================================
// CALL INPUTS
// ============================================================

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

// ============================================================
// FOLLOW UP INPUTS
// ============================================================

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

// ============================================================
// SUPABASE SELECTS
// ============================================================

const CALL_SELECT = `
  *,
  customer:customers!calls_customer_id_fkey (
    id,
    name,
    phone
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
    phone
  ),
  user:users!follow_ups_user_id_fkey (
    id,
    full_name,
    phone,
    job_title
  )
`;

// ============================================================
// VALIDATION HELPERS
// ============================================================

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

function validateDuration(
  value: number | undefined
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(
      "مدت تماس نمی‌تواند منفی باشد."
    );
  }

  return value;
}

// ============================================================
// SUPABASE ERROR HELPERS
// ============================================================

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
    console.error("message:", error.message);
    console.error("code:", error.code);
    console.error("details:", error.details);
    console.error("hint:", error.hint);
  } else {
    console.error("error:", error);
  }

  console.error(
    "=================================================="
  );
}

// ============================================================
// ACTIVITIES SERVICE
// ============================================================

export const activitiesService = {
  // ==========================================================
  // CALLS
  // ==========================================================

  async getCalls(): Promise<CallWithRelations[]> {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("calls")
      .select(CALL_SELECT)
      .eq("company_id", COMPANY_ID)
      .is("deleted_at", null)
      .order("call_date", {
        ascending: false,
      });

    if (error) {
      logSupabaseError("GET CALLS", error);
      throw error;
    }

    return (data ?? []) as CallWithRelations[];
  },

  // ==========================================================
  // GET CALL BY ID
  // ==========================================================

  async getCallById(
    id: string
  ): Promise<CallWithRelations> {
    const supabase = createSupabaseClient();

    const callId = validateId(
      id,
      "شناسه تماس الزامی است."
    );

    const { data, error } = await supabase
      .from("calls")
      .select(CALL_SELECT)
      .eq("id", callId)
      .eq("company_id", COMPANY_ID)
      .is("deleted_at", null)
      .single();

    if (error) {
      logSupabaseError("GET CALL BY ID", error);
      throw error;
    }

    return data as CallWithRelations;
  },

  // ==========================================================
  // GET CALLS BY CUSTOMER
  // ==========================================================

  async getCallsByCustomerId(
    customerId: string
  ): Promise<CallWithRelations[]> {
    const supabase = createSupabaseClient();

    const id = validateId(
      customerId,
      "شناسه مشتری الزامی است."
    );

    const { data, error } = await supabase
      .from("calls")
      .select(CALL_SELECT)
      .eq("customer_id", id)
      .eq("company_id", COMPANY_ID)
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

    return (data ?? []) as CallWithRelations[];
  },

  // ==========================================================
  // CREATE CALL
  // ==========================================================

  async createCall(
    input: CreateCallInput
  ): Promise<CallWithRelations> {
    const supabase = createSupabaseClient();

    const customerId = validateId(
      input.customer_id,
      "انتخاب مشتری الزامی است."
    );

    const userId = validateId(
      input.user_id,
      "انتخاب کاربر الزامی است."
    );

    const callDate = input.call_date
      ? validateDate(
          input.call_date,
          "تاریخ تماس معتبر نیست."
        )
      : undefined;

    const duration = validateDuration(
      input.duration_seconds
    );

    const payload = {
      company_id: COMPANY_ID,
      customer_id: customerId,
      user_id: userId,

      ...(callDate
        ? {
            call_date: callDate,
          }
        : {}),

      ...(input.direction
        ? {
            direction: input.direction,
          }
        : {}),

      ...(input.outcome
        ? {
            outcome: input.outcome,
          }
        : {}),

      ...(duration !== undefined
        ? {
            duration_seconds: duration,
          }
        : {}),

      notes: input.notes ?? null,

      ...(input.source
        ? {
            source: input.source,
          }
        : {}),

      external_reference:
        input.external_reference ?? null,
    };

    const { data, error } = await supabase
      .from("calls")
      .insert(payload)
      .select(CALL_SELECT)
      .single();

    if (error) {
      logSupabaseError("CREATE CALL", error);

      throw new Error(
        getErrorMessage(
          error,
          "خطا در ثبت تماس."
        )
      );
    }

    return data as CallWithRelations;
  },

  // ==========================================================
  // UPDATE CALL
  // ==========================================================

  async updateCall(
    id: string,
    input: UpdateCallInput
  ): Promise<CallWithRelations> {
    const supabase = createSupabaseClient();

    const callId = validateId(
      id,
      "شناسه تماس الزامی است."
    );

    const updateData: UpdateCallInput & {
      updated_at: string;
    } = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    if (input.customer_id !== undefined) {
      updateData.customer_id = validateId(
        input.customer_id,
        "شناسه مشتری معتبر نیست."
      );
    }

    if (input.user_id !== undefined) {
      updateData.user_id = validateId(
        input.user_id,
        "شناسه کاربر معتبر نیست."
      );
    }

    if (input.call_date !== undefined) {
      updateData.call_date = validateDate(
        input.call_date,
        "تاریخ تماس معتبر نیست."
      );
    }

    if (input.duration_seconds !== undefined) {
      updateData.duration_seconds =
        validateDuration(
          input.duration_seconds
        )!;
    }

    const { data, error } = await supabase
      .from("calls")
      .update(updateData)
      .eq("id", callId)
      .eq("company_id", COMPANY_ID)
      .is("deleted_at", null)
      .select(CALL_SELECT)
      .single();

    if (error) {
      logSupabaseError("UPDATE CALL", error);

      throw new Error(
        getErrorMessage(
          error,
          "خطا در ویرایش تماس."
        )
      );
    }

    return data as CallWithRelations;
  },

  // ==========================================================
  // SOFT DELETE CALL
  // ==========================================================

  async softDeleteCall(
    id: string
  ): Promise<void> {
    const supabase = createSupabaseClient();

    const callId = validateId(
      id,
      "شناسه تماس الزامی است."
    );

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("calls")
      .update({
        deleted_at: now,
        updated_at: now,
      })
      .eq("id", callId)
      .eq("company_id", COMPANY_ID)
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

  // ==========================================================
  // FOLLOW UPS
  // ==========================================================

  async getFollowUps(): Promise<
    FollowUpWithRelations[]
  > {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("follow_ups")
      .select(FOLLOW_UP_SELECT)
      .eq("company_id", COMPANY_ID)
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

    return (data ?? []) as FollowUpWithRelations[];
  },

  // ==========================================================
  // GET FOLLOW UP BY ID
  // ==========================================================

  async getFollowUpById(
    id: string
  ): Promise<FollowUpWithRelations> {
    const supabase = createSupabaseClient();

    const followUpId = validateId(
      id,
      "شناسه پیگیری الزامی است."
    );

    const { data, error } = await supabase
      .from("follow_ups")
      .select(FOLLOW_UP_SELECT)
      .eq("id", followUpId)
      .eq("company_id", COMPANY_ID)
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

  // ==========================================================
  // GET FOLLOW UPS BY CUSTOMER
  // ==========================================================

  async getFollowUpsByCustomerId(
    customerId: string
  ): Promise<FollowUpWithRelations[]> {
    const supabase = createSupabaseClient();

    const id = validateId(
      customerId,
      "شناسه مشتری الزامی است."
    );

    const { data, error } = await supabase
      .from("follow_ups")
      .select(FOLLOW_UP_SELECT)
      .eq("customer_id", id)
      .eq("company_id", COMPANY_ID)
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

    return (data ?? []) as FollowUpWithRelations[];
  },

  // ==========================================================
  // CREATE FOLLOW UP
  // ==========================================================

  async createFollowUp(
    input: CreateFollowUpInput
  ): Promise<FollowUpWithRelations> {
    const supabase = createSupabaseClient();

    const customerId = validateId(
      input.customer_id,
      "انتخاب مشتری الزامی است."
    );

    const userId = validateId(
      input.user_id,
      "انتخاب کاربر الزامی است."
    );

    const scheduledAt = validateDate(
      input.scheduled_at,
      "تاریخ پیگیری معتبر نیست."
    );

    const completedAt = input.completed_at
      ? validateDate(
          input.completed_at,
          "تاریخ تکمیل پیگیری معتبر نیست."
        )
      : null;

    const payload = {
      company_id: COMPANY_ID,
      customer_id: customerId,
      user_id: userId,

      scheduled_at: scheduledAt,

      completed_at: completedAt,

      ...(input.status
        ? {
            status: input.status,
          }
        : {}),

      ...(input.priority
        ? {
            priority: input.priority,
          }
        : {}),

      subject: input.subject ?? null,

      notes: input.notes ?? null,

      ...(input.source
        ? {
            source: input.source,
          }
        : {}),
    };

    const { data, error } = await supabase
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

  // ==========================================================
  // UPDATE FOLLOW UP
  // ==========================================================

  async updateFollowUp(
    id: string,
    input: UpdateFollowUpInput
  ): Promise<FollowUpWithRelations> {
    const supabase = createSupabaseClient();

    const followUpId = validateId(
      id,
      "شناسه پیگیری الزامی است."
    );

    const updateData: UpdateFollowUpInput & {
      updated_at: string;
    } = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    if (input.customer_id !== undefined) {
      updateData.customer_id = validateId(
        input.customer_id,
        "شناسه مشتری معتبر نیست."
      );
    }

    if (input.user_id !== undefined) {
      updateData.user_id = validateId(
        input.user_id,
        "شناسه کاربر معتبر نیست."
      );
    }

    if (input.scheduled_at !== undefined) {
      updateData.scheduled_at = validateDate(
        input.scheduled_at,
        "تاریخ پیگیری معتبر نیست."
      );
    }

    if (
      input.completed_at !== undefined &&
      input.completed_at !== null
    ) {
      updateData.completed_at = validateDate(
        input.completed_at,
        "تاریخ تکمیل پیگیری معتبر نیست."
      );
    }

    const { data, error } = await supabase
      .from("follow_ups")
      .update(updateData)
      .eq("id", followUpId)
      .eq("company_id", COMPANY_ID)
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

  // ==========================================================
  // COMPLETE FOLLOW UP
  // ==========================================================

  async completeFollowUp(
    id: string
  ): Promise<FollowUpWithRelations> {
    const supabase = createSupabaseClient();

    const followUpId = validateId(
      id,
      "شناسه پیگیری الزامی است."
    );

    const completedAt =
      new Date().toISOString();

    const { data, error } = await supabase
      .from("follow_ups")
      .update({
        status: "completed",
        completed_at: completedAt,
        updated_at: completedAt,
      })
      .eq("id", followUpId)
      .eq("company_id", COMPANY_ID)
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

  // ==========================================================
  // SOFT DELETE FOLLOW UP
  // ==========================================================

  async softDeleteFollowUp(
    id: string
  ): Promise<void> {
    const supabase = createSupabaseClient();

    const followUpId = validateId(
      id,
      "شناسه پیگیری الزامی است."
    );

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("follow_ups")
      .update({
        deleted_at: now,
        updated_at: now,
      })
      .eq("id", followUpId)
      .eq("company_id", COMPANY_ID)
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
};
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  activitiesService,
  type CallWithRelations,
  type CreateCallInput,
  type UpdateCallInput,
  type FollowUpWithRelations,
  type CreateFollowUpInput,
  type UpdateFollowUpInput,
} from "@/src/lib/services/activities";

// ============================================================
// TYPES
// ============================================================

interface UseActivitiesResult {
  // Calls
  calls: CallWithRelations[];
  callsLoading: boolean;
  callsError: string | null;

  // Follow Ups
  followUps: FollowUpWithRelations[];
  followUpsLoading: boolean;
  followUpsError: string | null;

  // Calls actions
  loadCalls: () => Promise<void>;
  loadCallsByCustomer: (
    customerId: string
  ) => Promise<CallWithRelations[]>;
  createCall: (
    input: CreateCallInput
  ) => Promise<CallWithRelations>;
  updateCall: (
    id: string,
    input: UpdateCallInput
  ) => Promise<CallWithRelations>;
  deleteCall: (
    id: string
  ) => Promise<void>;

  // Follow Ups actions
  loadFollowUps: () => Promise<void>;
  loadFollowUpsByCustomer: (
    customerId: string
  ) => Promise<FollowUpWithRelations[]>;
  createFollowUp: (
    input: CreateFollowUpInput
  ) => Promise<FollowUpWithRelations>;
  updateFollowUp: (
    id: string,
    input: UpdateFollowUpInput
  ) => Promise<FollowUpWithRelations>;
  completeFollowUp: (
    id: string
  ) => Promise<FollowUpWithRelations>;
  deleteFollowUp: (
    id: string
  ) => Promise<void>;

  // General
  refresh: () => Promise<void>;
}

// ============================================================
// ERROR HELPER
// ============================================================

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (
      error as { message?: unknown }
    ).message === "string"
  ) {
    return (
      error as {
        message: string;
      }
    ).message;
  }

  return fallback;
}

// ============================================================
// HOOK
// ============================================================

export function useActivities(): UseActivitiesResult {
  // ==========================================================
  // CALLS STATE
  // ==========================================================

  const [calls, setCalls] =
    useState<CallWithRelations[]>([]);

  const [callsLoading, setCallsLoading] =
    useState(false);

  const [callsError, setCallsError] =
    useState<string | null>(null);

  // ==========================================================
  // FOLLOW UPS STATE
  // ==========================================================

  const [followUps, setFollowUps] =
    useState<FollowUpWithRelations[]>([]);

  const [
    followUpsLoading,
    setFollowUpsLoading,
  ] = useState(false);

  const [
    followUpsError,
    setFollowUpsError,
  ] = useState<string | null>(null);

  // ==========================================================
  // LOAD CALLS
  // ==========================================================

  const loadCalls = useCallback(
    async (): Promise<void> => {
      setCallsLoading(true);
      setCallsError(null);

      try {
        const data =
          await activitiesService.getCalls();

        setCalls(data);
      } catch (error) {
        const message =
          getErrorMessage(
            error,
            "خطا در دریافت تماس‌ها."
          );

        setCallsError(message);

        console.error(
          "useActivities.loadCalls:",
          error
        );
      } finally {
        setCallsLoading(false);
      }
    },
    []
  );

  // ==========================================================
  // LOAD CALLS BY CUSTOMER
  // ==========================================================

  const loadCallsByCustomer =
    useCallback(
      async (
        customerId: string
      ): Promise<CallWithRelations[]> => {
        try {
          const data =
            await activitiesService.getCallsByCustomerId(
              customerId
            );

          return data;
        } catch (error) {
          console.error(
            "useActivities.loadCallsByCustomer:",
            error
          );

          throw error;
        }
      },
      []
    );

  // ==========================================================
  // CREATE CALL
  // ==========================================================

  const createCall = useCallback(
    async (
      input: CreateCallInput
    ): Promise<CallWithRelations> => {
      setCallsError(null);

      try {
        const created =
          await activitiesService.createCall(
            input
          );

        setCalls((current) => [
          created,
          ...current.filter(
            (item) =>
              item.id !== created.id
          ),
        ]);

        return created;
      } catch (error) {
        const message =
          getErrorMessage(
            error,
            "خطا در ثبت تماس."
          );

        console.error(
          "useActivities.createCall:",
          error
        );

        setCallsError(message);

        throw error;
      }
    },
    []
  );

  // ==========================================================
  // UPDATE CALL
  // ==========================================================

  const updateCall = useCallback(
    async (
      id: string,
      input: UpdateCallInput
    ): Promise<CallWithRelations> => {
      setCallsError(null);

      try {
        const updated =
          await activitiesService.updateCall(
            id,
            input
          );

        setCalls((current) =>
          current.map((item) =>
            item.id === updated.id
              ? updated
              : item
          )
        );

        return updated;
      } catch (error) {
        const message =
          getErrorMessage(
            error,
            "خطا در ویرایش تماس."
          );

        console.error(
          "useActivities.updateCall:",
          error
        );

        setCallsError(message);

        throw error;
      }
    },
    []
  );

  // ==========================================================
  // DELETE CALL
  // ==========================================================

  const deleteCall = useCallback(
    async (
      id: string
    ): Promise<void> => {
      setCallsError(null);

      try {
        await activitiesService.softDeleteCall(
          id
        );

        setCalls((current) =>
          current.filter(
            (item) => item.id !== id
          )
        );
      } catch (error) {
        const message =
          getErrorMessage(
            error,
            "خطا در حذف تماس."
          );

        console.error(
          "useActivities.deleteCall:",
          error
        );

        setCallsError(message);

        throw error;
      }
    },
    []
  );

  // ==========================================================
  // LOAD FOLLOW UPS
  // ==========================================================

  const loadFollowUps =
    useCallback(
      async (): Promise<void> => {
        setFollowUpsLoading(true);

        // فقط خطای واقعی دریافت لیست را پاک می‌کنیم.
        setFollowUpsError(null);

        try {
          const data =
            await activitiesService.getFollowUps();

          setFollowUps(data);
        } catch (error) {
          const message =
            getErrorMessage(
              error,
              "خطا در دریافت پیگیری‌ها."
            );

          setFollowUpsError(message);

          console.error(
            "useActivities.loadFollowUps:",
            error
          );
        } finally {
          setFollowUpsLoading(false);
        }
      },
      []
    );

  // ==========================================================
  // LOAD FOLLOW UPS BY CUSTOMER
  // ==========================================================

  const loadFollowUpsByCustomer =
    useCallback(
      async (
        customerId: string
      ): Promise<
        FollowUpWithRelations[]
      > => {
        try {
          const data =
            await activitiesService.getFollowUpsByCustomerId(
              customerId
            );

          return data;
        } catch (error) {
          console.error(
            "useActivities.loadFollowUpsByCustomer:",
            error
          );

          throw error;
        }
      },
      []
    );

  // ==========================================================
  // CREATE FOLLOW UP
  // ==========================================================

  const createFollowUp =
    useCallback(
      async (
        input: CreateFollowUpInput
      ): Promise<FollowUpWithRelations> => {
        try {
          const created =
            await activitiesService.createFollowUp(
              input
            );

          setFollowUps((current) => [
            created,
            ...current.filter(
              (item) =>
                item.id !== created.id
            ),
          ]);

          return created;
        } catch (error) {
          // مهم:
          // خطای ثبت را در followUpsError قرار نمی‌دهیم،
          // چون followUpsError مخصوص خطای دریافت لیست است.
          console.error(
            "useActivities.createFollowUp:",
            error
          );

          throw error;
        }
      },
      []
    );

  // ==========================================================
  // UPDATE FOLLOW UP
  // ==========================================================

  const updateFollowUp =
    useCallback(
      async (
        id: string,
        input: UpdateFollowUpInput
      ): Promise<FollowUpWithRelations> => {
        try {
          const updated =
            await activitiesService.updateFollowUp(
              id,
              input
            );

          setFollowUps((current) =>
            current.map((item) =>
              item.id === updated.id
                ? updated
                : item
            )
          );

          return updated;
        } catch (error) {
          // خطای ویرایش نباید با خطای دریافت لیست قاطی شود.
          console.error(
            "useActivities.updateFollowUp:",
            error
          );

          throw error;
        }
      },
      []
    );

  // ==========================================================
  // COMPLETE FOLLOW UP
  // ==========================================================

  const completeFollowUp =
    useCallback(
      async (
        id: string
      ): Promise<FollowUpWithRelations> => {
        try {
          const completed =
            await activitiesService.completeFollowUp(
              id
            );

          setFollowUps((current) =>
            current.map((item) =>
              item.id === completed.id
                ? completed
                : item
            )
          );

          return completed;
        } catch (error) {
          // بسیار مهم:
          // اگر تکمیل پیگیری به علت Constraint دیتابیس شکست خورد،
          // نباید صفحه با عنوان «خطا در دریافت پیگیری‌ها» نمایش دهد.
          console.error(
            "useActivities.completeFollowUp:",
            error
          );

          throw error;
        }
      },
      []
    );

  // ==========================================================
  // DELETE FOLLOW UP
  // ==========================================================

  const deleteFollowUp =
    useCallback(
      async (
        id: string
      ): Promise<void> => {
        try {
          await activitiesService.softDeleteFollowUp(
            id
          );

          setFollowUps((current) =>
            current.filter(
              (item) => item.id !== id
            )
          );
        } catch (error) {
          // خطای حذف هم نباید به عنوان خطای دریافت لیست ثبت شود.
          console.error(
            "useActivities.deleteFollowUp:",
            error
          );

          throw error;
        }
      },
      []
    );

  // ==========================================================
  // REFRESH
  // ==========================================================

  const refresh = useCallback(
    async (): Promise<void> => {
      await Promise.all([
        loadCalls(),
        loadFollowUps(),
      ]);
    },
    [
      loadCalls,
      loadFollowUps,
    ]
  );

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [refresh]);

  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    // Calls
    calls,
    callsLoading,
    callsError,

    // Follow Ups
    followUps,
    followUpsLoading,
    followUpsError,

    // Calls actions
    loadCalls,
    loadCallsByCustomer,
    createCall,
    updateCall,
    deleteCall,

    // Follow Ups actions
    loadFollowUps,
    loadFollowUpsByCustomer,
    createFollowUp,
    updateFollowUp,
    completeFollowUp,
    deleteFollowUp,

    // General
    refresh,
  };
}
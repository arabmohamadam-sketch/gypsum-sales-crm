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
    useState<FollowUpWithRelations[]>(
      []
    );

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
          const message =
            getErrorMessage(
              error,
              "خطا در دریافت تماس‌های مشتری."
            );

          setCallsError(message);

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

        setCallsError(message);

        console.error(
          "useActivities.createCall:",
          error
        );

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

        setCallsError(message);

        console.error(
          "useActivities.updateCall:",
          error
        );

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

        setCallsError(message);

        console.error(
          "useActivities.deleteCall:",
          error
        );

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
          const message =
            getErrorMessage(
              error,
              "خطا در دریافت پیگیری‌های مشتری."
            );

          setFollowUpsError(message);

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
        setFollowUpsError(null);

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
          const message =
            getErrorMessage(
              error,
              "خطا در ثبت پیگیری."
            );

          setFollowUpsError(message);

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
        setFollowUpsError(null);

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
          const message =
            getErrorMessage(
              error,
              "خطا در ویرایش پیگیری."
            );

          setFollowUpsError(message);

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
        setFollowUpsError(null);

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
          const message =
            getErrorMessage(
              error,
              "خطا در تکمیل پیگیری."
            );

          setFollowUpsError(message);

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
        setFollowUpsError(null);

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
          const message =
            getErrorMessage(
              error,
              "خطا در حذف پیگیری."
            );

          setFollowUpsError(message);

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
    void refresh();
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
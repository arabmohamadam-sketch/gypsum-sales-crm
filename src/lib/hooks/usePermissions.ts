"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  permissionsService,
  type Permission,
} from "@/src/lib/services/permissions";

interface UsePermissionsResult {
  permissions: Permission[];
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  hasPermission: (
    permissionSlug: string
  ) => boolean;
  refresh: () => Promise<void>;
}

function getErrorMessage(
  error: unknown
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "خطا در دریافت سطح دسترسی کاربر.";
}

export function usePermissions(): UsePermissionsResult {
  const [permissions, setPermissions] =
    useState<Permission[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const refresh = useCallback(
    async () => {
      try {
        setLoading(true);
        setError(null);

        const result =
          await permissionsService.getCurrentUserPermissions();

        setPermissions(result);
      } catch (err) {
        console.error(
          "Failed to load permissions:",
          err
        );

        setPermissions([]);
        setError(
          getErrorMessage(err)
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isAdmin = useMemo(
    () =>
      permissionsService.hasPermission(
        permissions,
        "admin.full_access"
      ),
    [permissions]
  );

  const hasPermission = useCallback(
    (permissionSlug: string) =>
      permissionsService.hasPermission(
        permissions,
        permissionSlug
      ),
    [permissions]
  );

  return {
    permissions,
    loading,
    error,
    isAdmin,
    hasPermission,
    refresh,
  };
}
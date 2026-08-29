"use client";

import { useCallback, useEffect, useState } from "react";

import { usersService } from "@/src/lib/services/users";
import type { SalesUser } from "@/src/lib/services/users";

export function useUsers() {
  const [data, setData] = useState<SalesUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const users = await usersService.getSalesUsers();

      setData(users);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "خطا در دریافت فهرست بازاریابان"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchUsers();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchUsers]);

  return {
    data,
    users: data,
    salesUsers: data,
    loading,
    error,
    refresh: fetchUsers,
  };
}
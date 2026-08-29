"use client";

import { useCallback, useEffect, useState } from "react";
import {
  dashboardService,
  type DashboardData,
} from "@/src/lib/services/dashboard";

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await dashboardService.getDashboardData();

      setData(result);
    } catch (err) {
      console.error(
        "خطا در دریافت اطلاعات داشبورد:",
        err
      );

      setError(
        "دریافت اطلاعات داشبورد با خطا مواجه شد."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadDashboard]);

  return {
    data,
    loading,
    error,
    refresh: loadDashboard,
  };
}
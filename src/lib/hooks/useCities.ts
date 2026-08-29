"use client";

import { useEffect, useState } from "react";
import {
  citiesService,
  type City,
} from "@/src/lib/services/cities";

export function useCities() {
  const [data, setData] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const cities = await citiesService.getAll();

        if (mounted) {
          setData(cities);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "خطا در دریافت شهرها"
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
  };
}
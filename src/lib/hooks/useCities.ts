"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  citiesService,
  type City,
  type Region,
  type CreateCityInput,
} from "@/src/lib/services/cities";

export function useCities() {
  const [data, setData] =
    useState<City[]>([]);

  const [regions, setRegions] =
    useState<Region[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadCities =
    useCallback(async () => {
      try {
        setError("");

        const cities =
          await citiesService.getAll();

        setData(cities);
      } catch (err) {
        console.error(
          "CITIES LOAD ERROR:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "خطا در دریافت شهرها"
        );
      }
    }, []);

  const loadRegions =
    useCallback(async () => {
      try {
        const result =
          await citiesService.getRegions();

        setRegions(result);
      } catch (err) {
        console.error(
          "REGIONS LOAD ERROR:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "خطا در دریافت مناطق"
        );
      }
    }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [cities, regions] =
          await Promise.all([
            citiesService.getAll(),
            citiesService.getRegions(),
          ]);

        if (mounted) {
          setData(cities);
          setRegions(regions);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "خطا در دریافت اطلاعات شهرها"
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const createCity =
    useCallback(
      async (
        input: CreateCityInput
      ) => {
        const city =
          await citiesService.create(
            input
          );

        await loadCities();

        return city;
      },
      [loadCities]
    );

  return {
    data,
    cities: data,
    regions,
    loading,
    error,
    refresh: loadCities,
    createCity,
  };
}
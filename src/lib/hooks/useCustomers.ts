"use client";

import { useEffect, useMemo, useState } from "react";
import { customersService } from "@/src/lib/services/customers";

export function useCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    async function loadCustomers() {
      try {
        setLoading(true);
        setError(null);

        const data = await customersService.getAll();

        setCustomers(data);
      } catch (err) {
        console.error(
          "خطا در دریافت مشتریان:",
          err
        );

        setCustomers([]);
        setError(
          "دریافت اطلاعات مشتریان با خطا مواجه شد."
        );
      } finally {
        setLoading(false);
      }
    }

    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return customers.filter((customer) => {
      const city =
        customer.city?.name ??
        customer.city_name ??
        customer.metadata?.source_city ??
        "";

      const customerName =
        customer.name ?? "";

      const phone =
        customer.phone ?? "";

      const type =
        customer.customer_type ?? "";

      const matchesSearch =
        !normalizedSearch ||
        customerName
          .toLowerCase()
          .includes(normalizedSearch) ||
        phone
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesCity =
        cityFilter === "all" ||
        city === cityFilter;

      const matchesType =
        typeFilter === "all" ||
        type === typeFilter;

      return (
        matchesSearch &&
        matchesCity &&
        matchesType
      );
    });
  }, [
    customers,
    search,
    cityFilter,
    typeFilter,
  ]);

  return {
    customers,
    filteredCustomers,
    loading,
    error,

    search,
    setSearch,

    cityFilter,
    setCityFilter,

    typeFilter,
    setTypeFilter,
  };
}
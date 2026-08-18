"use client";

import { useEffect, useMemo, useState } from "react";
import { customersService } from "@/src/lib/services/customers";
import type { Customer } from "@/src/lib/types/customer";

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [vipFilter, setVipFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      try {
        setLoading(true);
        setError(null);

        const data = await customersService.getAll();

        if (!cancelled) {
          setCustomers(data);
        }
      } catch (err) {
        console.error("خطا در دریافت مشتریان:", err);

        if (!cancelled) {
          setCustomers([]);
          setError("دریافت اطلاعات مشتریان با خطا مواجه شد.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCustomers();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const city =
        customer.city?.name ??
        customer.metadata?.source_city ??
        "";

      const customerName = customer.name ?? "";
      const phone = customer.phone ?? "";
      const type = customer.customer_type ?? "";

      const matchesSearch =
        !normalizedSearch ||
        customerName.toLowerCase().includes(normalizedSearch) ||
        phone.toLowerCase().includes(normalizedSearch);

      const matchesCity =
        cityFilter === "all" ||
        city === cityFilter;

      const matchesType =
        typeFilter === "all" ||
        type === typeFilter;

      const matchesVip =
        vipFilter === "all" ||
        (vipFilter === "vip" && customer.is_vip === true) ||
        (vipFilter === "normal" && customer.is_vip === false);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          customer.is_active === true) ||
        (statusFilter === "inactive" &&
          customer.is_active === false);

      return (
        matchesSearch &&
        matchesCity &&
        matchesType &&
        matchesVip &&
        matchesStatus
      );
    });
  }, [
    customers,
    search,
    cityFilter,
    typeFilter,
    vipFilter,
    statusFilter,
  ]);

  const cities = useMemo(() => {
    const uniqueCities = new Set<string>();

    customers.forEach((customer) => {
      const city =
        customer.city?.name ??
        customer.metadata?.source_city;

      if (
        typeof city === "string" &&
        city.trim()
      ) {
        uniqueCities.add(city.trim());
      }
    });

    return Array.from(uniqueCities).sort((a, b) =>
      a.localeCompare(b, "fa")
    );
  }, [customers]);

  const customerTypes = useMemo(() => {
    const uniqueTypes = new Set<string>();

    customers.forEach((customer) => {
      if (
        typeof customer.customer_type === "string" &&
        customer.customer_type.trim()
      ) {
        uniqueTypes.add(
          customer.customer_type.trim()
        );
      }
    });

    return Array.from(uniqueTypes).sort((a, b) =>
      a.localeCompare(b, "fa")
    );
  }, [customers]);

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

    vipFilter,
    setVipFilter,

    statusFilter,
    setStatusFilter,

    cities,
    customerTypes,
  };
}
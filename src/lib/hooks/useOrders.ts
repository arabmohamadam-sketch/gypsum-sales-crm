"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ordersService,
  type CreateOrderInput,
  type UpdateOrderInput,
} from "@/src/lib/services/orders";

import type { Order } from "@/src/lib/types/order";

import { useAuth } from "@/src/lib/auth/AuthProvider";

export function useOrders() {
  const {
    loading: authLoading,
    isAuthenticated,
  } = useAuth();

  const [mounted, setMounted] =
    useState(false);

  const [data, setData] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * سرور و اولین render مرورگر باید دقیقاً
   * یک خروجی داشته باشند.
   */
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchOrders =
    useCallback(async () => {
      if (!mounted) {
        return;
      }

      if (authLoading) {
        return;
      }

      if (!isAuthenticated) {
        setData([]);
        setError(
          "برای دریافت سفارش‌ها باید وارد حساب کاربری شوید."
        );
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const orders =
          await ordersService.getAll();

        setData(orders);
      } catch (err) {
        console.error(
          "USE ORDERS ERROR:",
          err
        );

        setData([]);

        setError(
          err instanceof Error
            ? err.message
            : "خطا در دریافت سفارش‌ها."
        );
      } finally {
        setLoading(false);
      }
    }, [
      mounted,
      authLoading,
      isAuthenticated,
    ]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    if (authLoading) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        void fetchOrders();
      }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    mounted,
    authLoading,
    isAuthenticated,
    fetchOrders,
  ]);

  const createOrder =
    useCallback(
      async (
        input: CreateOrderInput
      ) => {
        const order =
          await ordersService.create(
            input
          );

        await fetchOrders();

        return order;
      },
      [fetchOrders]
    );

  const updateOrder =
    useCallback(
      async (
        id: string,
        input: UpdateOrderInput
      ) => {
        const order =
          await ordersService.update(
            id,
            input
          );

        await fetchOrders();

        return order;
      },
      [fetchOrders]
    );

  const deleteOrder =
    useCallback(
      async (id: string) => {
        await ordersService.softDelete(
          id
        );

        await fetchOrders();
      },
      [fetchOrders]
    );

  return {
    data,
    orders: data,

    /*
     * تا قبل از hydration همیشه false است
     * تا HTML سرور و اولین HTML کلاینت یکسان بمانند.
     */
    loading:
      mounted &&
      (authLoading || loading),

    error,

    refresh: fetchOrders,

    createOrder,
    updateOrder,
    deleteOrder,
  };
}
"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ordersService,
  type CreateOrderInput,
  type UpdateOrderInput,
} from "@/src/lib/services/orders";

import type { Order } from "@/src/lib/types/order";

export function useOrders() {
  const [data, setData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const orders = await ordersService.getAll();

      setData(orders);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "خطا در دریافت سفارش‌ها"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchOrders();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchOrders]);

  const createOrder = useCallback(
    async (input: CreateOrderInput) => {
      const order = await ordersService.create(input);

      await fetchOrders();

      return order;
    },
    [fetchOrders]
  );

  const updateOrder = useCallback(
    async (
      id: string,
      input: UpdateOrderInput
    ) => {
      const order = await ordersService.update(
        id,
        input
      );

      await fetchOrders();

      return order;
    },
    [fetchOrders]
  );

  const deleteOrder = useCallback(
    async (id: string) => {
      await ordersService.softDelete(id);

      await fetchOrders();
    },
    [fetchOrders]
  );

  return {
    data,
    orders: data,
    loading,
    error,
    refresh: fetchOrders,
    createOrder,
    updateOrder,
    deleteOrder,
  };
}
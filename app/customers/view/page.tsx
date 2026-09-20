"use client";

import CustomerPage from "@/src/lib/components/customers/CustomerPage";
import { useQueryId } from "@/src/lib/hooks/useQueryId";

export default function Page() {
  const customerId = useQueryId();

  if (!customerId) {
    return null;
  }

  return <CustomerPage customerId={customerId} />;
}

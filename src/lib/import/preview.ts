import {
  isValidCustomer,
  type ImportCustomer,
} from "./validate";

export interface ImportPreview {
  total: number;
  valid: number;
  duplicates: number;
  invalid: number;
  customers: ImportCustomer[];
}

export function buildPreview(
  customers: ImportCustomer[]
): ImportPreview {
  const validCustomers =
    customers.filter(isValidCustomer);

  return {
    total: customers.length,
    valid: validCustomers.length,
    duplicates: 0,
    invalid:
      customers.length -
      validCustomers.length,
    customers: validCustomers,
  };
}
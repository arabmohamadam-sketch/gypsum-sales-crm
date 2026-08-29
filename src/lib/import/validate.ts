export interface ImportCustomer {
  name?: string;
}

export function isValidCustomer(
  customer: ImportCustomer
) {
  return (customer.name?.trim().length ?? 0) > 2;
}
export interface ImportPreview {
    total: number;
    valid: number;
    duplicates: number;
    invalid: number;
    customers: any[];
  }
  
  export function buildPreview(customers: any[]): ImportPreview {
    const validCustomers = customers.filter(
      (c) => c.name && c.name.trim().length > 2
    );
  
    return {
      total: customers.length,
      valid: validCustomers.length,
      duplicates: customers.length - validCustomers.length,
      invalid: customers.length - validCustomers.length,
      customers: validCustomers,
    };
  }
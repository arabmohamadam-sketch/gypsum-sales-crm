import type { CustomerImportRow } from "./mapper";

/**
 * حذف مشتری‌های تکراری
 *
 * اولویت تشخیص Duplicate:
 * 1. شماره تلفن + شهر
 * 2. نام + شهر
 *
 * خروجی دقیقاً همان نوع CustomerImportRow است
 * تا با analyze.ts و mapper.ts سازگار باشد.
 */
export function removeDuplicates(
  customers: CustomerImportRow[]
): CustomerImportRow[] {
  const seenByPhone = new Set<string>();
  const seenByNameAndCity = new Set<string>();

  const uniqueCustomers: CustomerImportRow[] = [];

  for (const customer of customers) {
    const name = customer.name
      .trim()
      .toLowerCase();

    const phone = (
      customer.phone ?? ""
    ).trim();

    const cityId =
      customer.cityId.trim();

    /*
     * اگر شماره تلفن معتبر داشته باشیم،
     * کلید اصلی Duplicate:
     *
     * city + phone
     */
    if (phone) {
      const phoneKey =
        `${cityId}|${phone}`;

      if (seenByPhone.has(phoneKey)) {
        continue;
      }

      seenByPhone.add(phoneKey);
    }

    /*
     * حتی اگر شماره تلفن نداشته باشیم،
     * نام + شهر را بررسی می‌کنیم.
     */
    const nameCityKey =
      `${cityId}|${name}`;

    if (
      seenByNameAndCity.has(
        nameCityKey
      )
    ) {
      continue;
    }

    seenByNameAndCity.add(
      nameCityKey
    );

    uniqueCustomers.push(
      customer
    );
  }

  return uniqueCustomers;
}
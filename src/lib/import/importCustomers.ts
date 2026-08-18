import { createSupabaseClient } from "@/src/lib/supabase";
import { CustomerImportRow } from "./mapper";

const BATCH_SIZE = 500;

export async function importCustomers(
  customers: CustomerImportRow[]
) {
  const supabase = createSupabaseClient();

  let imported = 0;

  for (let i = 0; i < customers.length; i += BATCH_SIZE) {
    const batch = customers.slice(i, i + BATCH_SIZE);

    const payload = batch.map((customer) => ({
      company_id: customer.companyId,
      city_id: customer.cityId,
      name: customer.name,
      phone: customer.phone,
      whatsapp_number: customer.whatsapp,
      customer_type: customer.customerType,
      preferred_contact_method: "phone",
      is_active: true,
      is_vip: false,
      lifetime_tonnage: 0,
      average_monthly_tonnage: 0,
      total_order_count: 0,
      inactivity_days: 0,
    }));

    const { error } = await supabase
      .from("customers")
      .insert(payload);

    if (error) {
      throw error;
    }

    imported += payload.length;

    console.log(`✔ ${imported} / ${customers.length}`);
  }

  return imported;
}
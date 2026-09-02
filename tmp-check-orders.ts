import { createSupabaseClient } from "@/src/lib/supabase";

async function main() {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select("id, customer_id, order_date, status")
    .eq("company_id", "11111111-1111-1111-1111-111111111111")
    .is("deleted_at", null)
    .order("order_date", { ascending: false })
    .limit(10);

  console.log(error ?? data);
}

main();

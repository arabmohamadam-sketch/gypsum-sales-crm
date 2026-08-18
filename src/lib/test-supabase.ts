import { createSupabaseClient } from "@/src/lib/supabase";

export async function testSupabaseConnection() {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .limit(1);

  if (error) {
    console.error("❌ Supabase connection failed:", error);
    throw error;
  }

  console.log("✅ Supabase connection successful");
  console.log("Customers table accessible:", data);

  return data;
}
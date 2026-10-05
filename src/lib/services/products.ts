import { getRequiredCurrentCompanyId } from "@/src/lib/services/current-company";
import { createSupabaseClient } from "@/src/lib/supabase";

export interface Product {
  id: string;
  company_id: string;
  name: string;
  sku: string;
  product_line: string;
  weight_kg: number;
  is_active: boolean;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export const productsService = {
  async getAll(): Promise<Product[]> {
    const companyId = await getRequiredCurrentCompanyId();
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        company_id,
        name,
        sku,
        product_line,
        weight_kg,
        is_active,
        sort_order,
        metadata,
        created_at,
        updated_at,
        deleted_at
      `)
      .eq("company_id", companyId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Error fetching products:",
        error
      );

      throw error;
    }

    return (data ?? []) as Product[];
  },

  async getById(
    id: string
  ): Promise<Product> {
    const companyId = await getRequiredCurrentCompanyId();
    const supabase = createSupabaseClient();

    if (!id?.trim()) {
      throw new Error(
        "شناسه محصول الزامی است."
      );
    }

    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        company_id,
        name,
        sku,
        product_line,
        weight_kg,
        is_active,
        sort_order,
        metadata,
        created_at,
        updated_at,
        deleted_at
      `)
      .eq("id", id.trim())
      .eq("company_id", companyId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .single();

    if (error) {
      console.error(
        "Error fetching product:",
        error
      );

      throw error;
    }

    return data as Product;
  },
};

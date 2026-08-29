import { createSupabaseClient } from "@/src/lib/supabase";

const COMPANY_ID = "11111111-1111-1111-1111-111111111111";

export interface City {
  id: string;
  name: string;
  code: string | null;
  name_fa: string;
}

const cityNamesFa: Record<string, string> = {
  Abbasabad: "عباس‌آباد",
  Chalous: "چالوس",
  Garmsar: "گرمسار",
  Kelardasht: "کلاردشت",
  Marzanabad: "مرزن‌آباد",
  Ramsar: "رامسر",
  Semnan: "سمنان",
  Tonekabon: "تنکابن",
  Varamin: "ورامین",

  abbasabad: "عباس‌آباد",
  chalous: "چالوس",
  garmsar: "گرمسار",
  kelardasht: "کلاردشت",
  marzanabad: "مرزن‌آباد",
  ramsar: "رامسر",
  semnan: "سمنان",
  tonekabon: "تنکابن",
  varamin: "ورامین",
};

function getCityNameFa(
  name: string,
  code: string | null
): string {
  return (
    cityNamesFa[name] ??
    (code ? cityNamesFa[code] : undefined) ??
    name
  );
}

export const citiesService = {
  async getAll(): Promise<City[]> {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("cities")
      .select("id,name,code")
      .eq("company_id", COMPANY_ID)
      .is("deleted_at", null)
      .order("name");

    if (error) {
      throw error;
    }

    return (data ?? []).map((city) => ({
      id: String(city.id),
      name: String(city.name ?? ""),
      code: city.code ?? null,
      name_fa: getCityNameFa(
        String(city.name ?? ""),
        city.code ?? null
      ),
    }));
  },
};
import { createSupabaseClient } from "@/src/lib/supabase";

const COMPANY_ID =
  "11111111-1111-1111-1111-111111111111";

export interface City {
  id: string;
  name: string;
  code: string | null;
  name_fa: string;
  region_id: string;
}

export interface Region {
  id: string;
  name: string;
}

export interface CreateCityInput {
  name: string;
  code?: string | null;
  region_id: string;
}

const cityNamesFa: Record<string, string> = {
  Abbasabad: "عباس‌آباد",
  abbasabad: "عباس‌آباد",

  Chalous: "چالوس",
  Chalus: "چالوس",
  chalous: "چالوس",
  chalus: "چالوس",

  Garmsar: "گرمسار",
  garmsar: "گرمسار",

  Kelardasht: "کلاردشت",
  kelardasht: "کلاردشت",

  Marzanabad: "مرزن‌آباد",
  marzanabad: "مرزن‌آباد",

  Ramsar: "رامسر",
  ramsar: "رامسر",

  Semnan: "سمنان",
  semnan: "سمنان",

  Tonekabon: "تنکابن",
  tonekabon: "تنکابن",

  Varamin: "ورامین",
  varamin: "ورامین",
};

function getCityNameFa(
  name: string
): string {
  return cityNamesFa[name] ?? name;
}

function normalizeName(
  value: string
): string {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

export const citiesService = {
  async getAll(): Promise<City[]> {
    const supabase =
      createSupabaseClient();

    const {
      data,
      error,
    } = await supabase
      .from("cities")
      .select(
        "id,name,code,region_id"
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      )
      .order("name", {
        ascending: true,
      });

    if (error) {
      console.error(
        "CITIES GET ALL:",
        error
      );
      throw error;
    }

    return (data ?? []).map(
      (city) => {
        const name =
          String(
            city.name ?? ""
          ).trim();

        return {
          id: String(city.id),
          name,
          code:
            city.code ?? null,
          name_fa:
            getCityNameFa(name),
          region_id:
            String(city.region_id),
        };
      }
    );
  },

  async getRegions(): Promise<Region[]> {
    const supabase =
      createSupabaseClient();

    const {
      data,
      error,
    } = await supabase
      .from("regions")
      .select(
        "id,name"
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .order("name");

    if (error) {
      console.error(
        "REGIONS GET ALL:",
        error
      );
      throw error;
    }

    return (data ?? []).map(
      (region) => ({
        id: String(
          region.id
        ),
        name:
          String(
            region.name ?? ""
          ),
      })
    );
  },

  async create(
    input: CreateCityInput
  ): Promise<City> {
    const supabase =
      createSupabaseClient();

    const name =
      normalizeName(
        input.name
      );

    const regionId =
      input.region_id?.trim();

    const code =
      input.code?.trim() || null;

    if (!name) {
      throw new Error(
        "نام شهر الزامی است."
      );
    }

    if (!regionId) {
      throw new Error(
        "انتخاب منطقه الزامی است."
      );
    }

    /*
     * بررسی می‌کنیم منطقه واقعاً
     * متعلق به همین شرکت باشد.
     */
    const {
      data: region,
      error: regionError,
    } = await supabase
      .from("regions")
      .select("id")
      .eq(
        "id",
        regionId
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .maybeSingle();

    if (regionError) {
      console.error(
        "CITY REGION CHECK:",
        regionError
      );
      throw regionError;
    }

    if (!region) {
      throw new Error(
        "منطقه انتخاب‌شده معتبر نیست."
      );
    }

    /*
     * جلوگیری از ایجاد شهر تکراری
     */
    const {
      data: existing,
      error: existingError,
    } = await supabase
      .from("cities")
      .select(
        "id,name,code,region_id"
      )
      .eq(
        "company_id",
        COMPANY_ID
      )
      .is(
        "deleted_at",
        null
      )
      .ilike(
        "name",
        name
      )
      .maybeSingle();

    if (existingError) {
      console.error(
        "CITY CHECK EXISTING:",
        existingError
      );
      throw existingError;
    }

    if (existing) {
      return {
        id: String(
          existing.id
        ),
        name: String(
          existing.name ?? ""
        ),
        code:
          existing.code ??
          null,
        name_fa:
          getCityNameFa(
            String(
              existing.name ??
                ""
            )
          ),
        region_id:
          String(
            existing.region_id
          ),
      };
    }

    /*
     * ایجاد شهر جدید
     */
    const {
      data,
      error,
    } = await supabase
      .from("cities")
      .insert({
        company_id:
          COMPANY_ID,
        region_id:
          regionId,
        name,
        code,
        is_active: true,
      })
      .select(
        "id,name,code,region_id"
      )
      .single();

    if (error) {
      console.error(
        "CITIES CREATE:",
        error
      );

      /*
       * لاگ کامل‌تر برای اینکه
       * خطای {} دوباره مبهم نباشد.
       */
      console.error(
        "CITIES CREATE MESSAGE:",
        error.message
      );
      console.error(
        "CITIES CREATE DETAILS:",
        error.details
      );
      console.error(
        "CITIES CREATE HINT:",
        error.hint
      );
      console.error(
        "CITIES CREATE CODE:",
        error.code
      );

      throw error;
    }

    if (!data) {
      throw new Error(
        "شهر ایجاد نشد."
      );
    }

    return {
      id: String(
        data.id
      ),
      name: String(
        data.name ?? ""
      ),
      code:
        data.code ?? null,
      name_fa:
        getCityNameFa(
          String(
            data.name ?? ""
          )
        ),
      region_id:
        String(
          data.region_id
        ),
    };
  },
};
import {
  getCities,
  getProvince,
  getProvincesList,
} from "@code-plate/iran-cities";

import { getSupabaseClient } from "@/src/lib/supabase";
import { getRequiredCurrentCompanyId } from "@/src/lib/services/current-company";

export type SharedLocationSource = "system" | "custom";

export interface SharedProvince {
  code: string;
  name_fa: string;
  sort_order: number;
  is_active: boolean;
  source: "system";
}

export interface SharedCity {
  id: string | null;
  province_code: string;
  city_code: string;
  name_fa: string;
  source: SharedLocationSource;
  company_id: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateCustomCityInput {
  province_code: string;
  province_name: string;
  city_name: string;
  city_code?: string;
}

interface CustomCityRow {
  id: string;
  province_code: string;
  city_code: string;
  name_fa: string;
  source: "custom";
  company_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CUSTOM_CITY_CODE_PREFIX = "custom-";

function normalizeText(value: string): string {
  return value
    .trim()
    .replace(/\u200c/g, "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ");
}

function normalizeCode(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
}

function createCustomCityCode(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${CUSTOM_CITY_CODE_PREFIX}${crypto.randomUUID()}`;
  }

  return `${CUSTOM_CITY_CODE_PREFIX}${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

function mapSystemProvince(
  province: { en: string; fa: string },
  index: number
): SharedProvince {
  return {
    code: province.en,
    name_fa: province.fa,
    sort_order: index + 1,
    is_active: true,
    source: "system",
  };
}

function mapSystemCity(
  provinceCode: string,
  city: { en: string; fa: string }
): SharedCity {
  return {
    id: null,
    province_code: provinceCode,
    city_code: city.en,
    name_fa: city.fa,
    source: "system",
    company_id: null,
    is_active: true,
    created_at: null,
    updated_at: null,
  };
}

function mapCustomCity(row: CustomCityRow): SharedCity {
  return {
    id: row.id,
    province_code: row.province_code,
    city_code: row.city_code,
    name_fa: row.name_fa,
    source: "custom",
    company_id: row.company_id,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function sortCities(cities: SharedCity[]): SharedCity[] {
  return [...cities].sort((first, second) =>
    first.name_fa.localeCompare(second.name_fa, "fa")
  );
}

async function getAuthenticatedUserId(): Promise<string> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(
      error.message || "دریافت اطلاعات کاربر انجام نشد."
    );
  }

  if (!user) {
    throw new Error(
      "برای انجام این عملیات باید وارد حساب کاربری شوید."
    );
  }

  return user.id;
}

async function getCustomCities(
  provinceCode?: string
): Promise<SharedCity[]> {
  const supabase = getSupabaseClient();
  const companyId = await getRequiredCurrentCompanyId();

  let query = supabase
    .from("v2_geo_cities")
    .select(
      `
        id,
        province_code,
        city_code,
        name_fa,
        source,
        company_id,
        is_active,
        created_at,
        updated_at
      `
    )
    .eq("source", "custom")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name_fa", {
      ascending: true,
    });

  if (provinceCode) {
    query = query.eq(
      "province_code",
      normalizeCode(provinceCode)
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      error.message ||
        "دریافت شهرهای افزوده‌شده با خطا مواجه شد."
    );
  }

  return (data ?? []).map((row) =>
    mapCustomCity(row as CustomCityRow)
  );
}

export const sharedLocationService = {
  /**
   * استان‌های پایه ایران.
   *
   * این داده از داخل package خوانده می‌شود و بنابراین
   * برای استفاده Offline نیاز به Supabase ندارد.
   */
  getProvinces(): SharedProvince[] {
    return getProvincesList().map(
      (province, index) =>
        mapSystemProvince(province, index)
    );
  },

  /**
   * پیدا کردن یک استان با کد یا نام فارسی.
   */
  getProvince(
    provinceCodeOrName: string
  ): SharedProvince | null {
    const value = normalizeText(
      provinceCodeOrName
    );

    if (!value) {
      return null;
    }

    const province = getProvince(value);

    if (!province) {
      return null;
    }

    const index = getProvincesList().findIndex(
      (item) => item.en === province.en
    );

    return mapSystemProvince(
      province,
      index >= 0 ? index : 0
    );
  },

  /**
   * شهرهای پایه یک استان.
   *
   * این داده کاملاً Offline است.
   */
  getBaseCities(
    provinceCodeOrName: string
  ): SharedCity[] {
    const value = normalizeText(
      provinceCodeOrName
    );

    if (!value) {
      return [];
    }

    const province = getProvince(value);

    if (!province) {
      return [];
    }

    return sortCities(
      getCities(province.en).map((city) =>
        mapSystemCity(province.en, city)
      )
    );
  },

  /**
   * تمام شهرهای یک استان:
   *   1. شهرهای پایه Offline
   *   2. شهرهای سفارشی ذخیره‌شده در Supabase
   *
   * شهر سفارشی هیچ‌وقت جای شهر پایه هم‌نام را نمی‌گیرد.
   */
  async getCities(
    provinceCodeOrName: string
  ): Promise<SharedCity[]> {
    const value = normalizeText(
      provinceCodeOrName
    );

    if (!value) {
      return [];
    }

    const province = getProvince(value);

    if (!province) {
      return [];
    }

    const baseCities =
      getCities(province.en).map((city) =>
        mapSystemCity(province.en, city)
      );

    const customCities =
      await getCustomCities(province.en);

    const citiesByName =
      new Map<string, SharedCity>();

    for (const city of baseCities) {
      citiesByName.set(
        normalizeText(city.name_fa),
        city
      );
    }

    for (const city of customCities) {
      const normalizedName =
        normalizeText(city.name_fa);

      if (!citiesByName.has(normalizedName)) {
        citiesByName.set(
          normalizedName,
          city
        );
      }
    }

    return sortCities(
      Array.from(citiesByName.values())
    );
  },

  /**
   * فقط شهرهای سفارشی ذخیره‌شده شرکت.
   */
  async getCustomCities(
    provinceCode?: string
  ): Promise<SharedCity[]> {
    return getCustomCities(provinceCode);
  },

  /**
   * افزودن شهر جدید.
   *
   * شهرهای پایه دوباره ساخته نمی‌شوند.
   * اگر دو دستگاه هم‌زمان یک شهر را ثبت کنند،
   * پس از خطای Unique دوباره رکورد موجود خوانده می‌شود.
   */
  async createCustomCity(
    input: CreateCustomCityInput
  ): Promise<SharedCity> {
    const provinceCode = normalizeCode(
      input.province_code
    );

    const provinceName = normalizeText(
      input.province_name
    );

    const cityName = normalizeText(
      input.city_name
    );

    if (!provinceCode) {
      throw new Error(
        "استان برای ثبت شهر الزامی است."
      );
    }

    if (!provinceName) {
      throw new Error(
        "نام استان برای ثبت شهر الزامی است."
      );
    }

    if (!cityName) {
      throw new Error(
        "نام شهر را وارد کنید."
      );
    }

    const province = getProvince(
      provinceCode
    );

    if (!province) {
      throw new Error(
        "استان انتخاب‌شده معتبر نیست."
      );
    }

    const normalizedProvinceName =
      normalizeText(province.fa);

    if (
      normalizedProvinceName !== provinceName
    ) {
      throw new Error(
        "نام استان با کد استان مطابقت ندارد."
      );
    }

    /*
     * اگر شهر از قبل در Master Offline وجود داشته باشد،
     * نیازی به ثبت مجدد در دیتابیس نیست.
     */
    const systemCity =
      getCities(province.en).find(
        (city) =>
          normalizeText(city.fa) ===
          cityName
      );

    if (systemCity) {
      return mapSystemCity(
        province.en,
        systemCity
      );
    }

    const existingCustomCities =
      await getCustomCities(
        province.en
      );

    const existingCustomCity =
      existingCustomCities.find(
        (city) =>
          normalizeText(
            city.name_fa
          ) === cityName
      );

    if (existingCustomCity) {
      return existingCustomCity;
    }

    const supabase =
      getSupabaseClient();

    const companyId =
      await getRequiredCurrentCompanyId();

    const userId =
      await getAuthenticatedUserId();

    const cityCode =
      normalizeText(
        input.city_code ?? ""
      ) || createCustomCityCode();

    const { data, error } =
      await supabase
        .from("v2_geo_cities")
        .insert({
          province_code: province.en,
          city_code: cityCode,
          name_fa: cityName,
          source: "custom",
          company_id: companyId,
          created_by: userId,
          is_active: true,
        })
        .select(
          `
            id,
            province_code,
            city_code,
            name_fa,
            source,
            company_id,
            is_active,
            created_at,
            updated_at
          `
        )
        .single();

    if (error) {
      /*
       * Synchronization race:
       * دستگاه دیگری ممکن است دقیقاً همین شهر را
       * چند لحظه قبل ثبت کرده باشد.
       */
      const retryCities =
        await getCustomCities(
          province.en
        );

      const alreadyCreated =
        retryCities.find(
          (city) =>
            normalizeText(
              city.name_fa
            ) === cityName
        );

      if (alreadyCreated) {
        return alreadyCreated;
      }

      throw new Error(
        error.message ||
          "ثبت شهر جدید انجام نشد."
      );
    }

    return mapCustomCity(
      data as CustomCityRow
    );
  },

  /**
   * پیدا کردن یک شهر در فهرست پایه.
   */
  findBaseCity(
    cityCodeOrName: string,
    provinceCodeOrName?: string
  ): SharedCity | null {
    const cityValue =
      normalizeText(
        cityCodeOrName
      );

    if (!cityValue) {
      return null;
    }

    if (provinceCodeOrName) {
      const province =
        getProvince(
          normalizeText(
            provinceCodeOrName
          )
        );

      if (!province) {
        return null;
      }

      const city =
        getCities(province.en).find(
          (item) =>
            item.en === cityValue ||
            normalizeText(item.fa) ===
              cityValue
        );

      if (!city) {
        return null;
      }

      return mapSystemCity(
        province.en,
        city
      );
    }

    for (const province of getProvincesList()) {
      const city =
        getCities(province.en).find(
          (item) =>
            item.en === cityValue ||
            normalizeText(item.fa) ===
              cityValue
        );

      if (city) {
        return mapSystemCity(
          province.en,
          city
        );
      }
    }

    return null;
  },

  /**
   * بررسی اینکه یک شهر پایه وجود دارد یا خیر.
   */
  isBaseCity(
    provinceCodeOrName: string,
    cityCodeOrName: string
  ): boolean {
    return (
      this.findBaseCity(
        cityCodeOrName,
        provinceCodeOrName
      ) !== null
    );
  },
};
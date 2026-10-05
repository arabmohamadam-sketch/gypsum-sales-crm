import {
  getSupabaseClient,
} from "@/src/lib/supabase";

import {
  getCurrentCompanyContext,
} from "@/src/lib/services/current-company";

export interface CompanyBrandingRecord {
  company_id: string;
  display_name: string;
  logo_path: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  created_at: string;
  updated_at: string;
}

const BUCKET_NAME = "company-branding";
const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const LOGO_PATH_SUFFIX = "/logo";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "خطا در ذخیره هویت بصری شرکت.";
}

export const companyBrandingService = {
  async getCurrent(): Promise<CompanyBrandingRecord | null> {
    const supabase = getSupabaseClient();
    const context = await getCurrentCompanyContext();

    if (!context) {
      return null;
    }

    const { data, error } = await supabase
      .from("company_branding")
      .select(
        `
          company_id,
          display_name,
          logo_path,
          primary_color,
          secondary_color,
          created_at,
          updated_at
        `
      )
      .eq("company_id", context.company.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as CompanyBrandingRecord | null;
  },

  async uploadLogo(file: File): Promise<string> {
    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      throw new Error(
        "فرمت لوگو باید PNG، JPG یا WEBP باشد."
      );
    }

    if (file.size <= 0) {
      throw new Error("فایل لوگو خالی است.");
    }

    if (file.size > MAX_LOGO_SIZE) {
      throw new Error("حجم فایل لوگو نباید بیشتر از ۲ مگابایت باشد.");
    }

    const context = await getCurrentCompanyContext();

    if (!context) {
      throw new Error("کاربر وارد نشده است.");
    }

    if (!context.company.is_active) {
      throw new Error("شرکت فعال کاربر غیرفعال است.");
    }

    const supabase = getSupabaseClient();
    const path = `${context.company.id}${LOGO_PATH_SUFFIX}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: "60",
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    return path;
  },

  async updateBranding(input: {
    displayName?: string;
    logoPath?: string | null;
    clearLogo?: boolean;
    primaryColor?: string | null;
    secondaryColor?: string | null;
  }): Promise<CompanyBrandingRecord> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.rpc(
      "v2_update_company_branding",
      {
        p_display_name:
          input.displayName ?? null,
        p_logo_path:
          input.logoPath ?? null,
        p_clear_logo:
          input.clearLogo ?? false,
        p_primary_color:
          input.primaryColor ?? null,
        p_secondary_color:
          input.secondaryColor ?? null,
      }
    );

    if (error) {
      throw new Error(getErrorMessage(error));
    }

    if (!data) {
      throw new Error(
        "پاسخ ذخیره هویت بصری شرکت نامعتبر است."
      );
    }

    return data as CompanyBrandingRecord;
  },

  async removeLogo(): Promise<void> {
    const context = await getCurrentCompanyContext();

    if (!context) {
      throw new Error("کاربر وارد نشده است.");
    }

    const supabase = getSupabaseClient();

    await this.updateBranding({
      clearLogo: true,
    });

    const path = `${context.company.id}${LOGO_PATH_SUFFIX}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.warn(
        "Company logo reference was cleared, but storage cleanup failed:",
        error
      );
    }
  },

  async getPublicLogoUrl(
    logoPath: string | null,
    version?: string | null
  ): Promise<string> {
    if (!logoPath) {
      return "/logo.png";
    }

    const supabase = getSupabaseClient();
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(logoPath);

    if (!data.publicUrl) {
      return "/logo.png";
    }

    if (!version) {
      return data.publicUrl;
    }

    return `${data.publicUrl}?v=${encodeURIComponent(version)}`;
  },

};

import { getSupabaseClient } from "@/src/lib/supabase";

export interface CurrentCompanyProfile {
  id: string;
  company_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  job_title: string | null;
  employee_code: string | null;
  is_active: boolean;
}

export interface CompanyBranding {
  display_name: string;
  logo_url: string;
  primary_color?: string;
  secondary_color?: string;
}

export interface CurrentCompany {
  id: string;
  name: string;
  legal_name: string | null;
  timezone: string;
  locale: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  branding: CompanyBranding;
}

export interface CurrentCompanyContext {
  profile: CurrentCompanyProfile;
  company: CurrentCompany;
}

const DEFAULT_BRANDING: CompanyBranding = {
  display_name: "CRM مدیریت فروش",
  logo_url: "/logo.png",
};

function parseLegacyBranding(
  metadata: Record<string, unknown> | null
): CompanyBranding {
  const branding =
    metadata &&
    typeof metadata.branding === "object" &&
    metadata.branding !== null
      ? (metadata.branding as Record<string, unknown>)
      : {};

  return {
    display_name:
      typeof branding.display_name === "string" &&
      branding.display_name.trim()
        ? branding.display_name.trim()
        : DEFAULT_BRANDING.display_name,

    logo_url:
      typeof branding.logo_url === "string" &&
      branding.logo_url.trim()
        ? branding.logo_url.trim()
        : DEFAULT_BRANDING.logo_url,

    ...(typeof branding.primary_color === "string" &&
    branding.primary_color.trim()
      ? {
          primary_color: branding.primary_color.trim(),
        }
      : {}),

    ...(typeof branding.secondary_color === "string" &&
    branding.secondary_color.trim()
      ? {
          secondary_color: branding.secondary_color.trim(),
        }
      : {}),
  };
}

function toPublicLogoUrl(
  logoPath: string | null,
  updatedAt: string | null
): string {
  if (!logoPath) {
    return "/logo.png";
  }

  const supabase = getSupabaseClient();
  const { data } = supabase.storage
    .from("company-branding")
    .getPublicUrl(logoPath);

  if (!data.publicUrl) {
    return "/logo.png";
  }

  if (!updatedAt) {
    return data.publicUrl;
  }

  return `${data.publicUrl}?v=${encodeURIComponent(updatedAt)}`;
}

export async function getCurrentCompanyContext(): Promise<
  CurrentCompanyContext | null
> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    return null;
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("users")
      .select(
        `
          id,
          company_id,
          full_name,
          email,
          phone,
          avatar_url,
          job_title,
          employee_code,
          is_active
        `
      )
      .eq("id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile?.company_id) {
    throw new Error("شرکت کاربر مشخص نشده است.");
  }

  const [companyResult, brandingResult] = await Promise.all([
    supabase
      .from("companies")
      .select(
        `
          id,
          name,
          legal_name,
          timezone,
          locale,
          is_active,
          metadata
        `
      )
      .eq("id", profile.company_id)
      .is("deleted_at", null)
      .maybeSingle(),

    supabase
      .from("company_branding")
      .select(
        `
          company_id,
          display_name,
          logo_path,
          primary_color,
          secondary_color,
          updated_at
        `
      )
      .eq("company_id", profile.company_id)
      .maybeSingle(),
  ]);

  if (companyResult.error) {
    throw companyResult.error;
  }

  if (brandingResult.error) {
    throw brandingResult.error;
  }

  if (!companyResult.data) {
    throw new Error("شرکت کاربر پیدا نشد.");
  }

  const metadata =
    companyResult.data.metadata &&
    typeof companyResult.data.metadata === "object"
      ? (companyResult.data.metadata as Record<string, unknown>)
      : {};

  const legacyBranding = parseLegacyBranding(metadata);
  const brandingRecord = brandingResult.data;

  return {
    profile: profile as CurrentCompanyProfile,
    company: {
      id: companyResult.data.id,
      name: companyResult.data.name,
      legal_name: companyResult.data.legal_name,
      timezone: companyResult.data.timezone,
      locale: companyResult.data.locale,
      is_active: companyResult.data.is_active,
      metadata,
      branding: {
        display_name:
          brandingRecord?.display_name?.trim() ||
          legacyBranding.display_name,
        logo_url: brandingRecord
          ? toPublicLogoUrl(
              brandingRecord.logo_path,
              brandingRecord.updated_at
            )
          : legacyBranding.logo_url,
        ...(brandingRecord?.primary_color?.trim() ||
        legacyBranding.primary_color
          ? {
              primary_color:
                brandingRecord?.primary_color?.trim() ||
                legacyBranding.primary_color,
            }
          : {}),
        ...(brandingRecord?.secondary_color?.trim() ||
        legacyBranding.secondary_color
          ? {
              secondary_color:
                brandingRecord?.secondary_color?.trim() ||
                legacyBranding.secondary_color,
            }
          : {}),
      },
    },
  };
}

export async function getRequiredCurrentCompanyId(): Promise<string> {
  const context = await getCurrentCompanyContext();

  if (!context) {
    throw new Error("کاربر وارد نشده است.");
  }

  if (!context.company.is_active) {
    throw new Error("شرکت فعال کاربر غیرفعال است.");
  }

  return context.company.id;
}

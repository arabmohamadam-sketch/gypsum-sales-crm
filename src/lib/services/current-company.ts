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

function parseBranding(
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
        ? branding.display_name
        : DEFAULT_BRANDING.display_name,

    logo_url:
      typeof branding.logo_url === "string" &&
      branding.logo_url.trim()
        ? branding.logo_url
        : DEFAULT_BRANDING.logo_url,

    ...(typeof branding.primary_color === "string" &&
    branding.primary_color.trim()
      ? {
          primary_color:
            branding.primary_color,
        }
      : {}),
  };
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
    throw new Error(
      "شرکت کاربر مشخص نشده است."
    );
  }

  const { data: company, error: companyError } =
    await supabase
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
      .maybeSingle();

  if (companyError) {
    throw companyError;
  }

  if (!company) {
    throw new Error(
      "شرکت کاربر پیدا نشد."
    );
  }

  const metadata =
    company.metadata &&
    typeof company.metadata === "object"
      ? (company.metadata as Record<
          string,
          unknown
        >)
      : {};

  return {
    profile:
      profile as CurrentCompanyProfile,
    company: {
      id: company.id,
      name: company.name,
      legal_name: company.legal_name,
      timezone: company.timezone,
      locale: company.locale,
      is_active: company.is_active,
      metadata,
      branding: parseBranding(metadata),
    },
  };
}

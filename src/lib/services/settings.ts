import {
    getSupabaseClient,
  } from "@/src/lib/supabase";

  export interface CurrentUserProfile {
    id: string;
    company_id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    job_title: string | null;
    employee_code: string | null;
    is_active: boolean;
    last_login_at: string | null;
  }

  export interface UserRole {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    is_system: boolean;
  }

  export interface Company {
    id: string;
    name: string;
    legal_name: string | null;
    timezone: string;
    locale: string;
    is_active: boolean;
  }

  export interface CompanySetting {
    id: string;
    key: string;
    value: Record<string, unknown>;
    description: string | null;
    scope: "system" | "company" | "user";
  }

  export interface SettingsOverview {
    profile: CurrentUserProfile | null;
    roles: UserRole[];
    company: Company | null;
    settings: CompanySetting[];
  }

  export const settingsService = {
    async getOverview(): Promise<SettingsOverview> {
      const supabase = getSupabaseClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        return {
          profile: null,
          roles: [],
          company: null,
          settings: [],
        };
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
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
            is_active,
            last_login_at
          `
        )
        .eq("id", user.id)
        .is("deleted_at", null)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        return {
          profile: null,
          roles: [],
          company: null,
          settings: [],
        };
      }

      const [
        roleResult,
        companyResult,
        settingsResult,
      ] = await Promise.all([
        supabase
          .from("user_roles")
          .select(
            `
              id,
              role:roles (
                id,
                name,
                slug,
                description,
                is_system
              )
            `
          )
          .eq("user_id", user.id)
          .is("deleted_at", null),

        supabase
          .from("companies")
          .select(
            `
              id,
              name,
              legal_name,
              timezone,
              locale,
              is_active
            `
          )
          .eq(
            "id",
            profile.company_id
          )
          .is("deleted_at", null)
          .maybeSingle(),

        supabase
          .from("settings")
          .select(
            `
              id,
              key,
              value,
              description,
              scope
            `
          )
          .eq(
            "company_id",
            profile.company_id
          )
          .eq(
            "scope",
            "company"
          )
          .is("deleted_at", null)
          .order("key", {
            ascending: true,
          }),
      ]);

      if (roleResult.error) {
        throw roleResult.error;
      }

      if (companyResult.error) {
        throw companyResult.error;
      }

      if (settingsResult.error) {
        throw settingsResult.error;
      }

      const roles: UserRole[] =
        (roleResult.data ?? [])
          .map((row) => {
            const role = Array.isArray(row.role)
              ? row.role[0]
              : row.role;

            if (!role) {
              return null;
            }

            return {
              id: role.id,
              name: role.name,
              slug: role.slug,
              description:
                role.description ?? null,
              is_system:
                Boolean(role.is_system),
            };
          })
          .filter(
            (
              role
            ): role is UserRole =>
              role !== null
          );

      return {
        profile:
          profile as CurrentUserProfile,
        roles,
        company:
          (companyResult.data ??
            null) as Company | null,
        settings:
          (settingsResult.data ??
            []) as CompanySetting[],
      };
    },
  };

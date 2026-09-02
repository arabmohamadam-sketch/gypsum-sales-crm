import { getSupabaseClient } from "@/src/lib/supabase";

export interface ManagedUser {
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
  role_id: string | null;
  role_name: string | null;
  role_slug: string | null;
}

export interface ManagedRole {
  id: string;
  company_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
}

interface UserRoleRow {
  user_id: string;
  role:
    | {
        id: string;
        name: string;
        slug: string;
      }
    | {
        id: string;
        name: string;
        slug: string;
      }[]
    | null;
}

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

  return "خطا در انجام عملیات.";
}

export const userManagementService = {
  async getUsers(): Promise<ManagedUser[]> {
    const supabase = getSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {
      throw new Error("کاربر وارد سیستم نشده است.");
    }

    const {
      data: currentProfile,
      error: profileError,
    } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!currentProfile?.company_id) {
      throw new Error("شرکت کاربر مشخص نیست.");
    }

    const [usersResult, userRolesResult] =
      await Promise.all([
        supabase
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
          .eq(
            "company_id",
            currentProfile.company_id
          )
          .is("deleted_at", null)
          .order("full_name", {
            ascending: true,
          }),

        supabase
          .from("user_roles")
          .select(
            `
              user_id,
              role:roles (
                id,
                name,
                slug
              )
            `
          )
          .is("deleted_at", null),
      ]);

    if (usersResult.error) {
      throw usersResult.error;
    }

    if (userRolesResult.error) {
      throw userRolesResult.error;
    }

    const roleMap = new Map<
      string,
      {
        id: string;
        name: string;
        slug: string;
      }
    >();

    for (const row of (userRolesResult.data ??
      []) as UserRoleRow[]) {
      const role = Array.isArray(row.role)
        ? row.role[0]
        : row.role;

      if (role) {
        roleMap.set(row.user_id, role);
      }
    }

    return (usersResult.data ?? []).map(
      (item) => {
        const role = roleMap.get(item.id);

        return {
          ...item,
          role_id: role?.id ?? null,
          role_name: role?.name ?? null,
          role_slug: role?.slug ?? null,
        };
      }
    );
  },

  async getRoles(): Promise<ManagedRole[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("roles")
      .select(
        `
          id,
          company_id,
          name,
          slug,
          description,
          is_system,
          is_active
        `
      )
      .eq("is_system", false)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    return (data ?? []) as ManagedRole[];
  },

  async updateUserStatus(
    userId: string,
    isActive: boolean
  ): Promise<void> {
    const supabase = getSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {
      throw new Error(
        "کاربر وارد سیستم نشده است."
      );
    }

    if (user.id === userId && !isActive) {
      throw new Error(
        "نمی‌توانید حساب کاربری خودتان را غیرفعال کنید."
      );
    }

    const { error } = await supabase
      .from("users")
      .update({
        is_active: isActive,
      })
      .eq("id", userId)
      .is("deleted_at", null);

    if (error) {
      throw new Error(
        getErrorMessage(error)
      );
    }
  },

  async updateUserRole(
    userId: string,
    roleId: string
  ): Promise<void> {
    const supabase = getSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {
      throw new Error(
        "کاربر وارد سیستم نشده است."
      );
    }

    const { data: selectedRole, error: roleError } =
      await supabase
        .from("roles")
        .select(
          `
            id,
            company_id,
            is_system,
            is_active
          `
        )
        .eq("id", roleId)
        .eq("is_system", false)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();

    if (roleError) {
      throw roleError;
    }

    if (!selectedRole) {
      throw new Error(
        "نقش انتخاب‌شده معتبر نیست."
      );
    }

    const {
      data: targetUser,
      error: targetUserError,
    } = await supabase
      .from("users")
      .select("id, company_id")
      .eq("id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (targetUserError) {
      throw targetUserError;
    }

    if (!targetUser) {
      throw new Error(
        "کاربر موردنظر پیدا نشد."
      );
    }

    if (
      targetUser.company_id !==
      selectedRole.company_id
    ) {
      throw new Error(
        "این نقش متعلق به شرکت کاربر نیست."
      );
    }

    const {
      data: currentAssignment,
      error: currentError,
    } = await supabase
      .from("user_roles")
      .select(
        `
          id,
          role_id
        `
      )
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (currentError) {
      throw currentError;
    }

    if (
      currentAssignment?.role_id === roleId
    ) {
      return;
    }

    if (currentAssignment?.id) {
      const {
        error: removeError,
      } = await supabase
        .from("user_roles")
        .update({
          deleted_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          currentAssignment.id
        )
        .is("deleted_at", null);

      if (removeError) {
        throw removeError;
      }
    }

    const {
      error: insertError,
    } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        role_id: roleId,
        assigned_by: user.id,
      });

    if (insertError) {
      throw insertError;
    }
  },
};

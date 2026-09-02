import { getSupabaseClient } from "@/src/lib/supabase";

export interface RolePermissionRole {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
}

export interface RolePermissionItem {
  id: string;
  resource: string;
  action: string;
  slug: string;
  description: string | null;
}

export interface RolePermissionsData {
  roles: RolePermissionRole[];
  permissions: RolePermissionItem[];
  rolePermissionIds: Record<string, string[]>;
}

const FULL_ACCESS_PERMISSION = "admin.full_access";

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

export const rolePermissionsService = {
  async getData(): Promise<RolePermissionsData> {
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
      throw new Error(
        "شرکت کاربر مشخص نیست."
      );
    }

    const [
      rolesResult,
      permissionsResult,
      rolePermissionsResult,
    ] = await Promise.all([
      supabase
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
        .eq(
          "company_id",
          currentProfile.company_id
        )
        .eq("is_system", false)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("permissions")
        .select(
          `
            id,
            resource,
            action,
            slug,
            description
          `
        )
        .is("deleted_at", null)
        .order("resource", {
          ascending: true,
        })
        .order("action", {
          ascending: true,
        }),

      supabase
        .from("role_permissions")
        .select(
          `
            role_id,
            permission_id
          `
        )
        .is("deleted_at", null),
    ]);

    if (rolesResult.error) {
      throw rolesResult.error;
    }

    if (permissionsResult.error) {
      throw permissionsResult.error;
    }

    if (rolePermissionsResult.error) {
      throw rolePermissionsResult.error;
    }

    const companyRoleIds = new Set(
      (rolesResult.data ?? []).map(
        (role) => role.id
      )
    );

    const rolePermissionIds: Record<
      string,
      string[]
    > = {};

    for (const role of rolesResult.data ?? []) {
      rolePermissionIds[role.id] = [];
    }

    for (const item of rolePermissionsResult.data ??
      []) {
      if (
        companyRoleIds.has(item.role_id)
      ) {
        rolePermissionIds[item.role_id].push(
          item.permission_id
        );
      }
    }

    return {
      roles:
        (rolesResult.data ??
          []) as RolePermissionRole[],
      permissions:
        (permissionsResult.data ??
          []) as RolePermissionItem[],
      rolePermissionIds,
    };
  },

  async updateRolePermissions(
    roleId: string,
    permissionIds: string[]
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
      throw new Error(
        "شرکت کاربر مشخص نیست."
      );
    }

    const {
      data: role,
      error: roleError,
    } = await supabase
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
      .eq(
        "company_id",
        currentProfile.company_id
      )
      .eq("is_system", false)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (roleError) {
      throw roleError;
    }

    if (!role) {
      throw new Error(
        "نقش انتخاب‌شده معتبر نیست."
      );
    }

    const normalizedPermissionIds =
      Array.from(
        new Set(
          permissionIds.filter(
            (permissionId) =>
              typeof permissionId ===
                "string" &&
              permissionId.length > 0
          )
        )
      );

    const {
      data: permissions,
      error: permissionsError,
    } = await supabase
      .from("permissions")
      .select(
        `
          id,
          slug
        `
      )
      .in(
        "id",
        normalizedPermissionIds
      )
      .is("deleted_at", null);

    if (permissionsError) {
      throw permissionsError;
    }

    const allowedPermissionIds = (
      permissions ?? []
    )
      .filter(
        (permission) =>
          permission.slug !==
          FULL_ACCESS_PERMISSION
      )
      .map(
        (permission) => permission.id
      );

    const desiredPermissionIds =
      new Set(
        allowedPermissionIds
      );

    const {
      data: existingAssignments,
      error: existingError,
    } = await supabase
      .from("role_permissions")
      .select(
        `
          id,
          permission_id
        `
      )
      .eq("role_id", roleId)
      .is("deleted_at", null);

    if (existingError) {
      throw existingError;
    }

    const existingByPermission =
      new Map(
        (existingAssignments ?? []).map(
          (item) => [
            item.permission_id,
            item.id,
          ]
        )
      );

    const existingPermissionIds =
      new Set(
        existingByPermission.keys()
      );

    const idsToRemove = Array.from(
      existingPermissionIds
    ).filter(
      (permissionId) =>
        !desiredPermissionIds.has(
          permissionId
        )
    );

    if (idsToRemove.length > 0) {
      const assignmentIds =
        idsToRemove
          .map((permissionId) =>
            existingByPermission.get(
              permissionId
            )
          )
          .filter(
            (
              id
            ): id is string =>
              typeof id ===
              "string"
          );

      if (assignmentIds.length > 0) {
        const {
          error: removeError,
        } = await supabase
          .from("role_permissions")
          .update({
            deleted_at:
              new Date().toISOString(),
          })
          .in(
            "id",
            assignmentIds
          );

        if (removeError) {
          throw removeError;
        }
      }
    }

    const idsToAdd = Array.from(
      desiredPermissionIds
    ).filter(
      (permissionId) =>
        !existingPermissionIds.has(
          permissionId
        )
    );

    if (idsToAdd.length > 0) {
      const rows = idsToAdd.map(
        (permissionId) => ({
          role_id: roleId,
          permission_id:
            permissionId,
        })
      );

      const {
        error: insertError,
      } = await supabase
        .from("role_permissions")
        .insert(rows);

      if (insertError) {
        throw new Error(
          getErrorMessage(insertError)
        );
      }
    }
  },
};
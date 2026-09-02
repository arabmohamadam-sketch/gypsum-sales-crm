import { getSupabaseClient } from "@/src/lib/supabase";

export interface Permission {
  id: string;
  resource: string;
  action: string;
  slug: string;
}

const ADMIN_PERMISSION = "admin.full_access";

export const permissionsService = {
  async getCurrentUserPermissions(): Promise<Permission[]> {
    const supabase = getSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      return [];
    }

    const { data: userRoles, error: userRolesError } =
      await supabase
        .from("user_roles")
        .select("role_id")
        .eq("user_id", user.id)
        .is("deleted_at", null);

    if (userRolesError) {
      throw userRolesError;
    }

    const roleIds = Array.from(
      new Set(
        (userRoles ?? [])
          .map((row) => row.role_id)
          .filter(
            (roleId): roleId is string =>
              typeof roleId === "string" &&
              roleId.length > 0
          )
      )
    );

    if (roleIds.length === 0) {
      return [];
    }

    const {
      data: rolePermissions,
      error: rolePermissionsError,
    } = await supabase
      .from("role_permissions")
      .select("permission_id")
      .in("role_id", roleIds)
      .is("deleted_at", null);

    if (rolePermissionsError) {
      throw rolePermissionsError;
    }

    const permissionIds = Array.from(
      new Set(
        (rolePermissions ?? [])
          .map((row) => row.permission_id)
          .filter(
            (permissionId): permissionId is string =>
              typeof permissionId === "string" &&
              permissionId.length > 0
          )
      )
    );

    if (permissionIds.length === 0) {
      return [];
    }

    const {
      data: permissions,
      error: permissionsError,
    } = await supabase
      .from("permissions")
      .select(
        `
          id,
          resource,
          action,
          slug
        `
      )
      .in("id", permissionIds)
      .is("deleted_at", null)
      .order("resource", {
        ascending: true,
      })
      .order("action", {
        ascending: true,
      });

    if (permissionsError) {
      throw permissionsError;
    }

    return (permissions ?? []) as Permission[];
  },

  hasPermission(
    permissions: Permission[],
    permissionSlug: string
  ): boolean {
    return permissions.some(
      (permission) =>
        permission.slug === permissionSlug ||
        permission.slug === ADMIN_PERMISSION
    );
  },
};
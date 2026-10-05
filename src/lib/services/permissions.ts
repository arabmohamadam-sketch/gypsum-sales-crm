import { getSupabaseClient } from "@/src/lib/supabase";

export interface Permission {
  id: string;
  resource: string;
  action: string;
  slug: string;
}

const ADMIN_PERMISSION = "admin.full_access";

/**
 * V2 Canonical Permission Compatibility Layer
 *
 * هدف:
 * - UI و Runtime جدید از Permissionهای Canonical V2 استفاده کنند.
 * - Permissionهای Legacy تا زمان مهاجرت کامل باعث شکستن رفتار موجود نشوند.
 *
 * نکته:
 * این Map فقط در لایه Application استفاده می‌شود.
 * هیچ Permissionای در Database ایجاد، حذف یا تغییر داده نمی‌شود.
 */
const LEGACY_PERMISSION_COMPATIBILITY: Record<
  string,
  readonly string[]
> = {
  "company.branding.manage": [
    "settings.write",
  ],

  "company.settings.view": [
    "settings.read",
  ],

  "company.settings.manage": [
    "settings.write",
  ],

  "roles.view": [
    "settings.read",
  ],

  "roles.create": [
    "settings.write",
  ],

  "roles.edit": [
    "settings.write",
  ],

  "roles.activate": [
    "settings.write",
  ],

  "roles.deactivate": [
    "settings.write",
  ],

  "roles.assign_permission": [
    "settings.write",
  ],

  "roles.revoke_permission": [
    "settings.write",
  ],

  "users.view": [
    "users.read",
  ],

  "users.create": [
    "users.write",
  ],

  "users.edit": [
    "users.write",
  ],

  "users.activate": [
    "users.write",
  ],

  "users.deactivate": [
    "users.write",
  ],

  "users.assign_role": [
    "users.write",
  ],

  "users.revoke_role": [
    "users.write",
  ],

  "users.assign_region": [
    "users.write",
  ],

  "users.remove_region": [
    "users.write",
  ],

  "targets.view": [
    "targets.read",
  ],

  "targets.manage": [
    "targets.write",
  ],

  "targets.remove": [
    "targets.write",
  ],

  "orders.view": [
    "orders.read",
  ],

  "orders.create": [
    "orders.write",
  ],

  "orders.edit": [
    "orders.write",
  ],

  "orders.submit": [
    "orders.write",
  ],
};

function hasExactPermission(
  permissions: Permission[],
  permissionSlug: string
): boolean {
  return permissions.some(
    (permission) =>
      permission.slug === permissionSlug
  );
}

function hasLegacyCompatibilityPermission(
  permissions: Permission[],
  canonicalPermissionSlug: string
): boolean {
  const legacyPermissions =
    LEGACY_PERMISSION_COMPATIBILITY[
      canonicalPermissionSlug
    ];

  if (!legacyPermissions?.length) {
    return false;
  }

  return legacyPermissions.some(
    (legacyPermissionSlug) =>
      hasExactPermission(
        permissions,
        legacyPermissionSlug
      )
  );
}

export const permissionsService = {
  async getCurrentUserPermissions(): Promise<
    Permission[]
  > {
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

    const {
      data: userRoles,
      error: userRolesError,
    } = await supabase
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
          .map(
            (row) => row.permission_id
          )
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
    if (
      hasExactPermission(
        permissions,
        ADMIN_PERMISSION
      )
    ) {
      return true;
    }

    if (
      hasExactPermission(
        permissions,
        permissionSlug
      )
    ) {
      return true;
    }

    return hasLegacyCompatibilityPermission(
      permissions,
      permissionSlug
    );
  },

  hasAnyPermission(
    permissions: Permission[],
    permissionSlugs: readonly string[]
  ): boolean {
    if (
      hasExactPermission(
        permissions,
        ADMIN_PERMISSION
      )
    ) {
      return true;
    }

    return permissionSlugs.some(
      (permissionSlug) =>
        this.hasPermission(
          permissions,
          permissionSlug
        )
    );
  },
};
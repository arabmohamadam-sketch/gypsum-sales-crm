import { getSupabaseClient } from "@/src/lib/supabase";

export interface GovernanceState {
  company_id: string;
  ceo_user_id: string | null;
  ceo_name: string | null;
  ceo_role_name: string | null;
  ceo_assigned_at: string | null;
  ceo_assigned_by: string | null;
  ceo_assigned_by_name: string | null;
  ceo_bootstrap_completed_at: string | null;
  ceo_bootstrap_completed_by: string | null;
  ceo_bootstrap_completed_by_name: string | null;
}

export interface ManagementCapability {
  capability: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface ManagementUser {
  id: string;
  company_id: string;
  full_name: string;
  email: string | null;
  job_title: string | null;
  is_active: boolean;
  role_name: string | null;
  role_slug: string | null;
}

export interface CapabilityDelegation {
  id: string;
  company_id: string;
  user_id: string;
  capability: string;
  granted_by: string;
  granted_at: string;
  revoked_by: string | null;
  revoked_at: string | null;
  grant_reason: string;
  revoke_reason: string | null;
  created_at: string;
  updated_at: string;
  user_name: string;
  granted_by_name: string;
  revoked_by_name: string | null;
}

export interface ManagementConsoleData {
  current_user_id: string;
  company_id: string;
  is_admin: boolean;
  is_ceo: boolean;
  governance: GovernanceState;
  capabilities: ManagementCapability[];
  eligible_ceo_users: ManagementUser[];
  sales_managers: ManagementUser[];
  delegations: CapabilityDelegation[];
}

interface RoleRow {
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

interface UserRow {
  id: string;
  company_id: string;
  full_name: string;
  email: string | null;
  job_title: string | null;
  is_active: boolean;
}

interface GovernanceRow {
  company_id: string;
  ceo_user_id: string | null;
  ceo_assigned_at: string | null;
  ceo_assigned_by: string | null;
  ceo_bootstrap_completed_at: string | null;
  ceo_bootstrap_completed_by: string | null;
}

interface DelegationRow {
  id: string;
  company_id: string;
  user_id: string;
  capability: string;
  granted_by: string;
  granted_at: string;
  revoked_by: string | null;
  revoked_at: string | null;
  grant_reason: string;
  revoke_reason: string | null;
  created_at: string;
  updated_at: string;
}

function getSingleRole(
  role: RoleRow["role"]
): { id: string; name: string; slug: string } | null {
  if (!role) {
    return null;
  }

  return Array.isArray(role) ? role[0] ?? null : role;
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

  return "خطا در مدیریت ساختار سازمانی.";
}

function assertAuthenticatedUser(
  user: { id: string } | null
): asserts user is { id: string } {
  if (!user) {
    throw new Error("کاربر وارد سیستم نشده است.");
  }
}

export const managementGovernanceService = {
  async getConsoleData(): Promise<ManagementConsoleData> {
    const supabase = getSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    assertAuthenticatedUser(user);

    const { data: currentProfile, error: profileError } =
      await supabase
        .from("users")
        .select("id, company_id")
        .eq("id", user.id)
        .is("deleted_at", null)
        .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!currentProfile?.company_id) {
      throw new Error("شرکت کاربر مشخص نیست.");
    }

    const companyId = currentProfile.company_id as string;

    const [
      governanceResult,
      capabilitiesResult,
      usersResult,
      roleAssignmentsResult,
      delegationsResult,
    ] = await Promise.all([
      supabase
        .from("v2_company_governance")
        .select(
          "company_id, ceo_user_id, ceo_assigned_at, ceo_assigned_by, ceo_bootstrap_completed_at, ceo_bootstrap_completed_by"
        )
        .eq("company_id", companyId)
        .maybeSingle(),

      supabase
        .from("v2_management_capabilities")
        .select(
          "capability, description, is_active, created_at"
        )
        .eq("is_active", true)
        .order("capability", { ascending: true }),

      supabase
        .from("users")
        .select(
          "id, company_id, full_name, email, job_title, is_active"
        )
        .eq("company_id", companyId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("full_name", { ascending: true }),

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

      supabase
        .from("v2_management_capability_delegations")
        .select(
          "id, company_id, user_id, capability, granted_by, granted_at, revoked_by, revoked_at, grant_reason, revoke_reason, created_at, updated_at"
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
    ]);

    if (governanceResult.error) {
      throw governanceResult.error;
    }

    if (capabilitiesResult.error) {
      throw capabilitiesResult.error;
    }

    if (usersResult.error) {
      throw usersResult.error;
    }

    if (roleAssignmentsResult.error) {
      throw roleAssignmentsResult.error;
    }

    if (delegationsResult.error) {
      throw delegationsResult.error;
    }

    const users = (usersResult.data ?? []) as UserRow[];
    const roleMap = new Map<string, { name: string; slug: string }>();

    for (const row of (roleAssignmentsResult.data ?? []) as RoleRow[]) {
      const role = getSingleRole(row.role);
      if (!role) {
        continue;
      }

      const existing = roleMap.get(row.user_id);

      if (!existing) {
        roleMap.set(row.user_id, {
          name: role.name,
          slug: role.slug,
        });
        continue;
      }

      if (
        role.slug === "sales_manager" ||
        role.slug === "regional_manager"
      ) {
        roleMap.set(row.user_id, {
          name: role.name,
          slug: role.slug,
        });
      }
    }

    const managedUsers: ManagementUser[] = users.map((item) => {
      const role = roleMap.get(item.id) ?? null;

      return {
        id: item.id,
        company_id: item.company_id,
        full_name: item.full_name,
        email: item.email,
        job_title: item.job_title,
        is_active: item.is_active,
        role_name: role?.name ?? null,
        role_slug: role?.slug ?? null,
      };
    });

    const governanceRow = governanceResult.data as GovernanceRow | null;

    if (!governanceRow) {
      throw new Error(
        "ساختار مدیریت شرکت در دیتابیس پیدا نشد."
      );
    }

    const userLookup = new Map(
      managedUsers.map((item) => [item.id, item])
    );

    const ceoUser = governanceRow.ceo_user_id
      ? userLookup.get(governanceRow.ceo_user_id) ?? null
      : null;

    const assignedBy = governanceRow.ceo_assigned_by
      ? userLookup.get(governanceRow.ceo_assigned_by) ?? null
      : null;

    const bootstrapBy = governanceRow.ceo_bootstrap_completed_by
      ? userLookup.get(governanceRow.ceo_bootstrap_completed_by) ?? null
      : null;

    const delegations: CapabilityDelegation[] = (
      (delegationsResult.data ?? []) as DelegationRow[]
    ).map((item) => ({
      id: item.id,
      company_id: item.company_id,
      user_id: item.user_id,
      capability: item.capability,
      granted_by: item.granted_by,
      granted_at: item.granted_at,
      revoked_by: item.revoked_by,
      revoked_at: item.revoked_at,
      grant_reason: item.grant_reason,
      revoke_reason: item.revoke_reason,
      created_at: item.created_at,
      updated_at: item.updated_at,
      user_name:
        userLookup.get(item.user_id)?.full_name ?? "کاربر نامشخص",
      granted_by_name:
        userLookup.get(item.granted_by)?.full_name ?? "کاربر نامشخص",
      revoked_by_name: item.revoked_by
        ? userLookup.get(item.revoked_by)?.full_name ?? "کاربر نامشخص"
        : null,
    }));

    const currentUser = userLookup.get(user.id) ?? null;
    const isCeo = governanceRow.ceo_user_id === user.id;
    const isAdmin = currentUser?.role_slug === "company_admin";

    return {
      current_user_id: user.id,
      company_id: companyId,
      is_admin: isAdmin,
      is_ceo: isCeo,
      governance: {
        company_id: governanceRow.company_id,
        ceo_user_id: governanceRow.ceo_user_id,
        ceo_name: ceoUser?.full_name ?? null,
        ceo_role_name: ceoUser?.role_name ?? null,
        ceo_assigned_at: governanceRow.ceo_assigned_at,
        ceo_assigned_by: governanceRow.ceo_assigned_by,
        ceo_assigned_by_name: assignedBy?.full_name ?? null,
        ceo_bootstrap_completed_at:
          governanceRow.ceo_bootstrap_completed_at,
        ceo_bootstrap_completed_by:
          governanceRow.ceo_bootstrap_completed_by,
        ceo_bootstrap_completed_by_name:
          bootstrapBy?.full_name ?? null,
      },
      capabilities: (capabilitiesResult.data ?? []) as ManagementCapability[],
      eligible_ceo_users: managedUsers,
      sales_managers: managedUsers.filter(
        (item) =>
          item.role_slug === "sales_manager" &&
          item.is_active
      ),
      delegations,
    };
  },

  async setCompanyCeo(
    companyId: string,
    ceoUserId: string,
    reason: string
  ): Promise<void> {
    const trimmedReason = reason.trim();

    if (!companyId) {
      throw new Error("شناسه شرکت مشخص نیست.");
    }

    if (!ceoUserId) {
      throw new Error("مدیرعامل انتخاب نشده است.");
    }

    if (!trimmedReason) {
      throw new Error("علت این تغییر را وارد کنید.");
    }

    const { error } = await getSupabaseClient().rpc(
      "v2_set_company_ceo",
      {
        p_company_id: companyId,
        p_ceo_user_id: ceoUserId,
        p_reason: trimmedReason,
      }
    );

    if (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  async grantCapability(
    userId: string,
    capability: string,
    reason: string
  ): Promise<void> {
    const trimmedReason = reason.trim();

    if (!userId) {
      throw new Error("مدیر دریافت‌کننده مشخص نشده است.");
    }

    if (!capability) {
      throw new Error("قابلیت مشخص نشده است.");
    }

    if (!trimmedReason) {
      throw new Error("علت واگذاری دسترسی را وارد کنید.");
    }

    const { error } = await getSupabaseClient().rpc(
      "v2_grant_management_capability",
      {
        p_user_id: userId,
        p_capability: capability,
        p_reason: trimmedReason,
      }
    );

    if (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  async revokeCapability(
    userId: string,
    capability: string,
    reason: string
  ): Promise<void> {
    const trimmedReason = reason.trim();

    if (!userId) {
      throw new Error("مدیر دریافت‌کننده مشخص نشده است.");
    }

    if (!capability) {
      throw new Error("قابلیت مشخص نشده است.");
    }

    if (!trimmedReason) {
      throw new Error("علت لغو دسترسی را وارد کنید.");
    }

    const { error } = await getSupabaseClient().rpc(
      "v2_revoke_management_capability",
      {
        p_user_id: userId,
        p_capability: capability,
        p_reason: trimmedReason,
      }
    );

    if (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

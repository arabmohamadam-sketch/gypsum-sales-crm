import { getSupabaseClient } from "@/src/lib/supabase";

export type SalesPortfolioKind =
  | "representative"
  | "territory"
  | "market"
  | "export"
  | "special"
  | "other";

export interface SalesPortfolioManager {
  id: string;
  full_name: string;
  email: string;
  role_slug: "sales_manager" | "regional_manager";
  role_name: string;
  is_active: boolean;
}

export interface ManagedSalesPortfolio {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  portfolio_kind: SalesPortfolioKind;
  description: string | null;
  coverage_description: string | null;
  sort_order: number;
  is_active: boolean;
  plan_area_id: string | null;
  current_manager_id: string | null;
  current_manager_name: string | null;
  current_manager_role: string | null;
  current_effective_from: string | null;
  current_assignment_reason: string | null;
}

export interface SalesPortfolioManagementData {
  canManage: boolean;
  portfolios: ManagedSalesPortfolio[];
  managers: SalesPortfolioManager[];
}

interface UserRow {
  id: string;
  full_name: string;
  email: string;
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

interface PlanAreaRow {
  id: string;
  sales_portfolio_id: string | null;
  area_type: string;
  is_active: boolean;
}

interface AssignmentRow {
  id: string;
  plan_area_id: string;
  manager_user_id: string;
  effective_from: string;
  effective_to: string | null;
  assignment_reason: string;
}

interface UserLookupRow {
  id: string;
  full_name: string;
  email: string;
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

  return "خطا در مدیریت سبدهای فروش.";
}

function getSingleRole(
  value: UserRoleRow["role"]
): { id: string; name: string; slug: string } | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function chooseManagerRole(
  roles: Array<{ name: string; slug: string }>
): { name: string; slug: "sales_manager" | "regional_manager" } | null {
  const salesManager = roles.find(
    (role) => role.slug === "sales_manager"
  );

  if (salesManager) {
    return {
      name: salesManager.name,
      slug: "sales_manager",
    };
  }

  const regionalManager = roles.find(
    (role) => role.slug === "regional_manager"
  );

  if (regionalManager) {
    return {
      name: regionalManager.name,
      slug: "regional_manager",
    };
  }

  return null;
}

async function canManageSalesPortfolios(): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc(
    "v2_can_manage_sales_portfolios"
  );

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return Boolean(data);
}

async function getAssignableManagers(): Promise<
  SalesPortfolioManager[]
> {
  const supabase = getSupabaseClient();

  const {
    data: users,
    error: usersError,
  } = await supabase
    .from("users")
    .select(
      `
        id,
        full_name,
        email,
        is_active
      `
    )
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("full_name", {
      ascending: true,
    });

  if (usersError) {
    throw new Error(getErrorMessage(usersError));
  }

  const activeUsers = (users ?? []) as UserRow[];

  if (activeUsers.length === 0) {
    return [];
  }

  const userIds = activeUsers.map((user) => user.id);

  const {
    data: userRoles,
    error: rolesError,
  } = await supabase
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
    .in("user_id", userIds)
    .is("deleted_at", null);

  if (rolesError) {
    throw new Error(getErrorMessage(rolesError));
  }

  const rolesByUser = new Map<
    string,
    Array<{ name: string; slug: string }>
  >();

  for (const row of (userRoles ?? []) as UserRoleRow[]) {
    const role = getSingleRole(row.role);

    if (!role) {
      continue;
    }

    const current = rolesByUser.get(row.user_id) ?? [];
    current.push({
      name: role.name,
      slug: role.slug,
    });
    rolesByUser.set(row.user_id, current);
  }

  return activeUsers
    .map((user) => {
      const selectedRole = chooseManagerRole(
        rolesByUser.get(user.id) ?? []
      );

      if (!selectedRole) {
        return null;
      }

      return {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role_slug: selectedRole.slug,
        role_name: selectedRole.name,
        is_active: user.is_active,
      };
    })
    .filter(
      (manager): manager is SalesPortfolioManager =>
        manager !== null
    );
}

export const salesPortfoliosService = {
  async getManagementData(): Promise<
    SalesPortfolioManagementData
  > {
    const canManage =
      await canManageSalesPortfolios();

    if (!canManage) {
      return {
        canManage: false,
        portfolios: [],
        managers: [],
      };
    }

    const supabase = getSupabaseClient();

    const {
      data: portfolioRows,
      error: portfoliosError,
    } = await supabase
      .from("v2_sales_portfolios")
      .select(
        `
          id,
          company_id,
          name,
          code,
          portfolio_kind,
          description,
          coverage_description,
          sort_order,
          is_active
        `
      )
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      });

    if (portfoliosError) {
      throw new Error(getErrorMessage(portfoliosError));
    }

    const basePortfolios = (portfolioRows ?? []) as Array<
      Omit<ManagedSalesPortfolio, "plan_area_id" | "current_manager_id" | "current_manager_name" | "current_manager_role" | "current_effective_from" | "current_assignment_reason">
    >;

    if (basePortfolios.length === 0) {
      return {
        canManage: true,
        portfolios: [],
        managers: await getAssignableManagers(),
      };
    }

    const portfolioIds = basePortfolios.map(
      (portfolio) => portfolio.id
    );

    const [planAreasResult, managers] =
      await Promise.all([
        supabase
          .from("v2_plan_areas")
          .select(
            `
              id,
              sales_portfolio_id,
              area_type,
              is_active
            `
          )
          .in("sales_portfolio_id", portfolioIds)
          .eq("area_type", "portfolio")
          .eq("is_active", true)
          .is("deleted_at", null),
        getAssignableManagers(),
      ]);

    if (planAreasResult.error) {
      throw new Error(
        getErrorMessage(planAreasResult.error)
      );
    }

    const planAreas =
      (planAreasResult.data ?? []) as PlanAreaRow[];

    const planAreaIds = planAreas.map(
      (area) => area.id
    );

    let assignmentRows: AssignmentRow[] = [];

    if (planAreaIds.length > 0) {
      const {
        data: assignments,
        error: assignmentsError,
      } = await supabase
        .from(
          "v2_plan_area_manager_assignment_history"
        )
        .select(
          `
            id,
            plan_area_id,
            manager_user_id,
            effective_from,
            effective_to,
            assignment_reason
          `
        )
        .in("plan_area_id", planAreaIds)
        .is("effective_to", null)
        .order("effective_from", {
          ascending: false,
        });

      if (assignmentsError) {
        throw new Error(
          getErrorMessage(assignmentsError)
        );
      }

      assignmentRows =
        (assignments ?? []) as AssignmentRow[];
    }

    const managerIds = Array.from(
      new Set(
        assignmentRows.map(
          (assignment) => assignment.manager_user_id
        )
      )
    );

    const managerLookup = new Map<
      string,
      UserLookupRow
    >();

    if (managerIds.length > 0) {
      const {
        data: managersData,
        error: managersError,
      } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", managerIds)
        .is("deleted_at", null);

      if (managersError) {
        throw new Error(
          getErrorMessage(managersError)
        );
      }

      for (const manager of (managersData ?? []) as UserLookupRow[]) {
        managerLookup.set(manager.id, manager);
      }
    }

    const planAreaByPortfolioId = new Map<
      string,
      PlanAreaRow
    >();

    for (const planArea of planAreas) {
      if (!planArea.sales_portfolio_id) {
        continue;
      }

      planAreaByPortfolioId.set(
        planArea.sales_portfolio_id,
        planArea
      );
    }

    const activeAssignmentByPlanAreaId =
      new Map<string, AssignmentRow>();

    for (const assignment of assignmentRows) {
      if (
        !activeAssignmentByPlanAreaId.has(
          assignment.plan_area_id
        )
      ) {
        activeAssignmentByPlanAreaId.set(
          assignment.plan_area_id,
          assignment
        );
      }
    }

    const portfolios: ManagedSalesPortfolio[] =
      basePortfolios.map((portfolio) => {
        const planArea =
          planAreaByPortfolioId.get(portfolio.id) ??
          null;

        const assignment = planArea
          ? activeAssignmentByPlanAreaId.get(
              planArea.id
            ) ?? null
          : null;

        const manager = assignment
          ? managerLookup.get(
              assignment.manager_user_id
            ) ?? null
          : null;

        const managerRole = assignment
          ? managers.find(
              (item) =>
                item.id === assignment.manager_user_id
            )?.role_name ?? null
          : null;

        return {
          ...portfolio,
          plan_area_id: planArea?.id ?? null,
          current_manager_id:
            assignment?.manager_user_id ?? null,
          current_manager_name:
            manager?.full_name ?? null,
          current_manager_role: managerRole,
          current_effective_from:
            assignment?.effective_from ?? null,
          current_assignment_reason:
            assignment?.assignment_reason ?? null,
        };
      });

    return {
      canManage: true,
      portfolios,
      managers,
    };
  },

  async assignManager(
    portfolioId: string,
    managerUserId: string,
    effectiveFrom: string,
    reason: string
  ): Promise<void> {
    const supabase = getSupabaseClient();

    if (!portfolioId) {
      throw new Error("سبد فروش انتخاب نشده است.");
    }

    if (!managerUserId) {
      throw new Error("مدیر مسئول انتخاب نشده است.");
    }

    if (!effectiveFrom) {
      throw new Error(
        "تاریخ شروع مسئولیت مشخص نشده است."
      );
    }

    if (!reason.trim()) {
      throw new Error("علت واگذاری را وارد کنید.");
    }

    const {
      data: planArea,
      error: planAreaError,
    } = await supabase
      .from("v2_plan_areas")
      .select("id, sales_portfolio_id")
      .eq("sales_portfolio_id", portfolioId)
      .eq("area_type", "portfolio")
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (planAreaError) {
      throw new Error(
        getErrorMessage(planAreaError)
      );
    }

    if (!planArea?.id) {
      throw new Error(
        "Plan Area متناظر با این سبد فروش پیدا نشد."
      );
    }

    const { error } = await supabase.rpc(
      "v2_assign_plan_area_manager",
      {
        p_plan_area_id: planArea.id,
        p_manager_user_id: managerUserId,
        p_effective_from: effectiveFrom,
        p_reason: reason.trim(),
      }
    );

    if (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

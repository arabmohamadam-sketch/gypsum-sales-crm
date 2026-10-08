"use client";

import Link from "next/link";

import { useEffect, useMemo, useState } from "react";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";

import { usePermissions } from "@/src/lib/hooks/usePermissions";

import {
  rolePermissionsService,
  type RolePermissionItem,
  type RolePermissionRole,
} from "@/src/lib/services/role-permissions";

const ROLE_LABELS: Record<string, string> = {
  company_admin: "مدیر کل شرکت",
  regional_manager: "مدیر منطقه",
  sales_manager: "مدیر فروش",
  sales_rep: "کارشناس فروش",
  employee: "کارمند",
  waybill_writer: "حواله نویس",
};

const ROLE_DESCRIPTION_LABELS: Record<
  string,
  string
> = {
  company_admin:
    "مدیریت کامل تنظیمات و دسترسی‌های شرکت",
  regional_manager:
    "مدیریت عملیات و سفارش‌های حوزه منطقه",
  sales_manager:
    "مدیریت فروش و سفارش‌های حوزه فروش",
  sales_rep:
    "ثبت و پیگیری مشتریان و سفارش‌های اختصاص‌یافته",
  employee:
    "نقش پایه برای واگذاری دسترسی‌های عملیاتی",
  waybill_writer:
    "مدیریت عملیاتی حواله‌ها و تنظیم مقدار اقلام برای خودرو",
};

const RESOURCE_LABELS: Record<string, string> = {
  admin: "مدیریت سیستم",
  ai: "هوش مصنوعی",
  audit: "حسابرسی",
  company: "شرکت",
  customers: "مشتریان",
  delivery: "تحویل",
  drivers: "رانندگان",
  governance: "حاکمیت و مدیریت",
  loading: "بارگیری",
  notifications: "اعلان‌ها",
  orders: "سفارش‌ها",
  "orders.items": "اقلام سفارش",
  plan_areas: "مناطق برنامه",
  platform: "پلتفرم",
  products: "محصولات",
  regions: "مناطق",
  reports: "گزارش‌ها",
  roles: "نقش‌ها",
  sales_portfolios: "پرتفوی‌های فروش",
  settings: "تنظیمات قدیمی",
  shipments: "اعلام بار",
  sync: "همگام‌سازی",
  targets: "اهداف فروش",
  users: "کاربران",
  vehicles: "ناوگان",
  waybills: "حواله‌ها",
};

const ACTION_LABELS: Record<string, string> = {
  activate: "فعال‌سازی",
  adjust_quantity: "اصلاح مقدار",
  assign: "واگذاری",
  assign_manager: "تخصیص مدیر",
  assign_permission: "تخصیص دسترسی",
  assign_region: "تخصیص منطقه",
  assign_role: "تخصیص نقش",
  assign_vehicle: "تخصیص خودرو",
  branding_manage: "مدیریت هویت بصری",
  branding_view: "مشاهده هویت بصری",
  cancel: "لغو",
  ceo_assign: "تعیین مدیرعامل",
  ceo_view: "مشاهده مدیرعامل",
  change_ownership_mode: "تغییر نحوه مالکیت",
  confirm: "تأیید",
  create: "ایجاد",
  deactivate: "غیرفعال‌سازی",
  delegate: "واگذاری اختیار",
  edit: "ویرایش",
  export: "خروجی",
  full_access: "دسترسی کامل",
  issue: "صدور",
  manage: "مدیریت",
  manage_catalog: "مدیریت کاتالوگ",
  manage_pricing: "مدیریت قیمت‌گذاری",
  preferences_manage: "مدیریت تنظیمات اعلان",
  print: "چاپ",
  push_manage: "مدیریت Push",
  read: "مشاهده",
  reassign: "تغییر مسئول",
  reissue: "صدور مجدد",
  remove: "حذف کنترل‌شده",
  remove_region: "حذف تخصیص منطقه",
  revoke: "لغو اختیار",
  revoke_permission: "لغو دسترسی",
  revoke_role: "لغو نقش",
  retry: "تلاش مجدد",
  resolve_conflict: "رفع تعارض",
  sales_view: "مشاهده فروش",
  send: "ارسال",
  settings_manage: "مدیریت تنظیمات",
  settings_view: "مشاهده تنظیمات",
  start: "شروع",
  suspend: "تعلیق",
  tenants_activate: "فعال‌سازی مستأجر",
  tenants_create: "ایجاد مستأجر",
  tenants_suspend: "تعلیق مستأجر",
  tenants_view: "مشاهده مستأجران",
  tonnage_adjust_after_confirm:
    "اصلاح تناژ پس از تأیید",
  tonnage_edit: "ویرایش تناژ",
  view: "مشاهده",
  view_history: "مشاهده سوابق",
  view_ai: "مشاهده هوش مصنوعی",
  view_audit: "مشاهده حسابرسی",
  view_company: "مشاهده شرکت",
  view_operational: "مشاهده عملیات",
  view_regional: "مشاهده منطقه",
  view_sales: "مشاهده فروش",
  view_subscription: "مشاهده اشتراک",
  write: "ایجاد و ویرایش",
};

const PERMISSION_DESCRIPTION_LABELS: Record<
  string,
  string
> = {
  "ai.read":
    "مشاهده پیشنهادهای هوشمند فروش",
  "ai.write":
    "مدیریت وظایف و پیشنهادهای هوشمند",

  "audit.export":
    "دریافت خروجی سوابق حسابرسی",
  "audit.view":
    "مشاهده سوابق حسابرسی",

  "company.branding.manage":
    "مدیریت لوگو و هویت بصری شرکت",
  "company.branding.view":
    "مشاهده هویت بصری شرکت",
  "company.edit":
    "ویرایش اطلاعات شرکت",
  "company.settings.manage":
    "مدیریت تنظیمات شرکت",
  "company.settings.view":
    "مشاهده تنظیمات شرکت",
  "company.view":
    "مشاهده اطلاعات شرکت",

  "customers.archive":
    "بایگانی مشتریان",
  "customers.assign":
    "واگذاری مسئول مشتری",
  "customers.change_ownership_mode":
    "تغییر نحوه مالکیت مشتری",
  "customers.create":
    "ایجاد مشتری",
  "customers.edit":
    "ویرایش مشتری",
  "customers.reassign":
    "تغییر مسئول مشتری",
  "customers.view":
    "مشاهده مشتریان در محدوده مجاز",
  "customers.view_history":
    "مشاهده سوابق مالکیت مشتری",

  "delivery.confirm":
    "تأیید تحویل",
  "delivery.edit":
    "ویرایش اطلاعات تحویل",
  "delivery.view":
    "مشاهده وضعیت تحویل",
  "delivery.view_history":
    "مشاهده سوابق تحویل",
  "delivery.proof.upload":
    "بارگذاری مدرک تحویل",
  "delivery.proof.view":
    "مشاهده مدرک تحویل",

  "drivers.activate":
    "فعال‌سازی رانندگان",
  "drivers.create":
    "ایجاد راننده",
  "drivers.deactivate":
    "غیرفعال‌سازی رانندگان",
  "drivers.edit":
    "ویرایش رانندگان",
  "drivers.view":
    "مشاهده رانندگان",

  "governance.ceo.assign":
    "تعیین مدیرعامل شرکت",
  "governance.ceo.view":
    "مشاهده انتصاب مدیرعامل",
  "governance.delegate":
    "واگذاری اختیارات مدیریتی",
  "governance.manage":
    "مدیریت تنظیمات حاکمیتی",
  "governance.revoke":
    "لغو اختیارات واگذار‌شده",
  "governance.view":
    "مشاهده تنظیمات حاکمیتی",

  "loading.cancel":
    "لغو عملیات بارگیری",
  "loading.confirm":
    "تأیید بارگیری",
  "loading.edit":
    "ویرایش بارگیری قبل از تأیید",
  "loading.start":
    "شروع عملیات بارگیری",
  "loading.tonnage_adjust_after_confirm":
    "اصلاح تناژ تأییدشده از مسیر کنترل‌شده",
  "loading.tonnage_edit":
    "ویرایش تناژ واقعی قبل از تأیید",
  "loading.view":
    "مشاهده عملیات بارگیری",
  "loading.view_history":
    "مشاهده سوابق بارگیری",

  "notifications.manage":
    "مدیریت الگو و مسیر اعلان‌ها",
  "notifications.preferences.manage":
    "مدیریت تنظیمات اعلان‌ها",
  "notifications.push.manage":
    "مدیریت ارسال Push",
  "notifications.send":
    "ارسال اعلان‌های مدیریتی",
  "notifications.view":
    "مشاهده اعلان‌ها",

  "orders.cancel":
    "لغو سفارش‌ها",
  "orders.create":
    "ایجاد سفارش",
  "orders.edit":
    "ویرایش سفارش",
  "orders.regional_approve":
    "تأیید سفارش در مرحله منطقه",
  "orders.regional_reject":
    "رد سفارش در مرحله منطقه",
  "orders.regional_return":
    "بازگرداندن سفارش از مرحله منطقه",
  "orders.regional_review":
    "بررسی سفارش در مرحله منطقه",
  "orders.sales_approve":
    "تأیید سفارش در مرحله فروش",
  "orders.sales_reject":
    "رد سفارش در مرحله فروش",
  "orders.sales_return":
    "بازگرداندن سفارش از مرحله فروش",
  "orders.sales_review":
    "بررسی سفارش در مرحله فروش",
  "orders.submit":
    "ارسال سفارش برای بررسی",
  "orders.view":
    "مشاهده سفارش‌ها در محدوده مجاز",
  "orders.view_history":
    "مشاهده سوابق سفارش",

  "orders.items.edit":
    "ویرایش اقلام سفارش",
  "orders.items.remove":
    "حذف اقلام سفارش قبل از قفل",

  "plan_areas.activate":
    "فعال‌سازی مناطق برنامه",
  "plan_areas.assign_manager":
    "تخصیص مدیر منطقه برنامه",
  "plan_areas.create":
    "ایجاد منطقه برنامه",
  "plan_areas.deactivate":
    "غیرفعال‌سازی مناطق برنامه",
  "plan_areas.edit":
    "ویرایش مناطق برنامه",
  "plan_areas.view":
    "مشاهده مناطق برنامه",
  "plan_areas.view_history":
    "مشاهده سوابق تخصیص مناطق برنامه",

  "platform.audit.view":
    "مشاهده حسابرسی پلتفرم",
  "platform.health.view":
    "مشاهده سلامت پلتفرم",
  "platform.subscription.manage":
    "مدیریت اشتراک‌ها",
  "platform.subscription.view":
    "مشاهده اطلاعات اشتراک",
  "platform.tenants.activate":
    "فعال‌سازی مستأجران پلتفرم",
  "platform.tenants.create":
    "ایجاد مستأجر پلتفرم",
  "platform.tenants.suspend":
    "تعلیق مستأجران پلتفرم",
  "platform.tenants.view":
    "مشاهده مستأجران پلتفرم",

  "products.activate":
    "فعال‌سازی محصولات",
  "products.create":
    "ایجاد محصول",
  "products.deactivate":
    "غیرفعال‌سازی محصولات",
  "products.edit":
    "ویرایش محصولات",
  "products.manage_catalog":
    "مدیریت کاتالوگ محصولات",
  "products.manage_pricing":
    "مدیریت قیمت‌گذاری محصولات",
  "products.view":
    "مشاهده محصولات و کاتالوگ",

  "regions.activate":
    "فعال‌سازی مناطق",
  "regions.create":
    "ایجاد منطقه",
  "regions.deactivate":
    "غیرفعال‌سازی مناطق",
  "regions.edit":
    "ویرایش مناطق",
  "regions.reassign":
    "تغییر مسئولیت منطقه",
  "regions.view":
    "مشاهده مناطق",
  "regions.view_history":
    "مشاهده سوابق تخصیص منطقه",

  "reports.audit.view":
    "مشاهده گزارش‌های حسابرسی",
  "reports.company.view":
    "مشاهده گزارش‌های کل شرکت",
  "reports.customer.view":
    "مشاهده گزارش عملکرد مشتریان",
  "reports.fulfillment.view":
    "مشاهده گزارش تحقق فروش",
  "reports.operational.view":
    "مشاهده گزارش‌های عملیاتی",
  "reports.portfolio.view":
    "مشاهده گزارش عملکرد پرتفوی",
  "reports.regional.view":
    "مشاهده گزارش عملکرد منطقه",
  "reports.sales.view":
    "مشاهده گزارش عملکرد فروش",

  "roles.activate":
    "فعال‌سازی نقش",
  "roles.assign_permission":
    "تخصیص Permission به نقش",
  "roles.create":
    "ایجاد نقش",
  "roles.deactivate":
    "غیرفعال‌سازی نقش",
  "roles.edit":
    "ویرایش نقش",
  "roles.revoke_permission":
    "لغو Permission از نقش",
  "roles.view":
    "مشاهده نقش‌ها",

  "sales_portfolios.activate":
    "فعال‌سازی پرتفوی فروش",
  "sales_portfolios.assign_manager":
    "تخصیص مدیر پرتفوی",
  "sales_portfolios.create":
    "ایجاد پرتفوی فروش",
  "sales_portfolios.deactivate":
    "غیرفعال‌سازی پرتفوی فروش",
  "sales_portfolios.edit":
    "ویرایش پرتفوی فروش",
  "sales_portfolios.view":
    "مشاهده پرتفوی‌های فروش",
  "sales_portfolios.view_history":
    "مشاهده سوابق پرتفوی",

  "shipments.adjust_quantity":
    "اصلاح مقدار اعلام بار طبق قوانین",
  "shipments.assign_driver":
    "تخصیص راننده به اعلام بار",
  "shipments.assign_vehicle":
    "تخصیص خودرو به اعلام بار",
  "shipments.cancel":
    "لغو اعلام بار",
  "shipments.confirm":
    "تأیید اعلام بار",
  "shipments.create":
    "ایجاد اعلام بار",
  "shipments.edit":
    "ویرایش اعلام بار",
  "shipments.view":
    "مشاهده اعلام بار در محدوده مجاز",
  "shipments.view_history":
    "مشاهده سوابق اعلام بار",

  "sync.manage":
    "مدیریت تنظیمات و صف‌های همگام‌سازی",
  "sync.resolve_conflict":
    "رفع تعارض‌های همگام‌سازی",
  "sync.retry":
    "تلاش مجدد همگام‌سازی",
  "sync.view":
    "مشاهده وضعیت همگام‌سازی",

  "targets.manage":
    "ایجاد و ویرایش اهداف فروش",
  "targets.remove":
    "حذف کنترل‌شده اهداف فروش",
  "targets.view":
    "مشاهده اهداف فروش",
  "targets.view_history":
    "مشاهده سوابق اهداف فروش",

  "users.activate":
    "فعال‌سازی کاربران شرکت",
  "users.assign_region":
    "تخصیص کاربران به مناطق",
  "users.assign_role":
    "تخصیص نقش به کاربران",
  "users.create":
    "ایجاد کاربر شرکت",
  "users.deactivate":
    "غیرفعال‌سازی کاربران شرکت",
  "users.edit":
    "ویرایش کاربران شرکت",
  "users.remove_region":
    "حذف تخصیص منطقه از کاربر",
  "users.revoke_role":
    "لغو نقش کاربر",
  "users.view":
    "مشاهده کاربران شرکت",

  "vehicles.activate":
    "فعال‌سازی خودروها",
  "vehicles.create":
    "ایجاد خودرو",
  "vehicles.deactivate":
    "غیرفعال‌سازی خودروها",
  "vehicles.edit":
    "ویرایش خودروها",
  "vehicles.view":
    "مشاهده خودروها",

  "waybills.cancel":
    "لغو حواله",
  "waybills.create":
    "ایجاد حواله",
  "waybills.edit":
    "ویرایش حواله",
  "waybills.issue":
    "صدور حواله",
  "waybills.print":
    "چاپ یا خروجی حواله",
  "waybills.reissue":
    "صدور مجدد حواله در فرآیند کنترل‌شده",
  "waybills.view":
    "مشاهده حواله‌ها در محدوده مجاز",
  "waybills.view_history":
    "مشاهده سوابق حواله",
};

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

function getRoleLabel(
  role: RolePermissionRole
): string {
  return (
    ROLE_LABELS[role.slug] ||
    role.name ||
    "نقش شرکت"
  );
}

function getRoleDescription(
  role: RolePermissionRole
): string {
  return (
    ROLE_DESCRIPTION_LABELS[role.slug] ||
    "مدیریت دسترسی‌های این نقش"
  );
}

function getResourceLabel(
  resource: string
): string {
  return (
    RESOURCE_LABELS[resource] ||
    "سایر دسترسی‌ها"
  );
}

function getActionLabel(
  action: string
): string {
  return (
    ACTION_LABELS[action] ||
    "عملیات"
  );
}

function getPermissionDescription(
  permission: RolePermissionItem
): string {
  return (
    PERMISSION_DESCRIPTION_LABELS[
      permission.slug
    ] ||
    `${getResourceLabel(
      permission.resource
    )} - ${getActionLabel(
      permission.action
    )}`
  );
}

export default function SettingsRolesPage() {
  const {
    loading: permissionsLoading,
    error: permissionsError,
    hasPermission,
    hasAnyPermission,
  } = usePermissions();

  const canReadSettings =
    hasPermission("roles.view");

  const canManageSettings =
    hasAnyPermission([
      "roles.assign_permission",
      "roles.revoke_permission",
    ]);

  const [roles, setRoles] =
    useState<RolePermissionRole[]>([]);

  const [permissions, setPermissions] =
    useState<RolePermissionItem[]>([]);

  const [rolePermissionIds, setRolePermissionIds] =
    useState<Record<string, string[]>>({});

  const [selectedRoleId, setSelectedRoleId] =
    useState<string>("");

  const [selectedPermissionIds, setSelectedPermissionIds] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  function fetchRoleData() {
    return rolePermissionsService.getData();
  }

  useEffect(() => {
    if (
      permissionsLoading ||
      !canReadSettings
    ) {
      return;
    }

    let cancelled = false;

    fetchRoleData()
      .then((result) => {
        if (cancelled) {
          return;
        }

        setRoles(result.roles);
        setPermissions(result.permissions);
        setRolePermissionIds(
          result.rolePermissionIds
        );
        setError(null);

        const currentRoleExists =
          selectedRoleId &&
          result.roles.some(
            (role) =>
              role.id === selectedRoleId
          );

        const nextRoleId =
          currentRoleExists
            ? selectedRoleId
            : result.roles[0]?.id ?? "";

        setSelectedRoleId(
          nextRoleId
        );

        setSelectedPermissionIds(
          nextRoleId
            ? result.rolePermissionIds[
                nextRoleId
              ] ?? []
            : []
        );

        setSuccess(null);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }

        console.error(
          "Failed to load role permissions:",
          err
        );

        setError(
          getErrorMessage(err)
        );

        setRoles([]);
        setPermissions([]);
        setRolePermissionIds({});
        setSelectedRoleId("");
        setSelectedPermissionIds([]);
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    permissionsLoading,
    canReadSettings,
    selectedRoleId,
  ]);

  async function loadData() {
    if (!canReadSettings) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const result =
        await rolePermissionsService.getData();

      setRoles(result.roles);
      setPermissions(
        result.permissions
      );

      setRolePermissionIds(
        result.rolePermissionIds
      );

      const currentRoleExists =
        selectedRoleId &&
        result.roles.some(
          (role) =>
            role.id === selectedRoleId
        );

      const nextRoleId =
        currentRoleExists
          ? selectedRoleId
          : result.roles[0]?.id ?? "";

      setSelectedRoleId(
        nextRoleId
      );

      setSelectedPermissionIds(
        nextRoleId
          ? result.rolePermissionIds[
              nextRoleId
            ] ?? []
          : []
      );
    } catch (err) {
      console.error(
        "Failed to load role permissions:",
        err
      );

      setError(
        getErrorMessage(err)
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedRole = useMemo(
    () =>
      roles.find(
        (role) =>
          role.id === selectedRoleId
      ) ?? null,
    [roles, selectedRoleId]
  );

  const groupedPermissions =
    useMemo(() => {
      const groups: Record<
        string,
        RolePermissionItem[]
      > = {};

      for (const permission of permissions) {
        if (
          permission.slug ===
          "admin.full_access"
        ) {
          continue;
        }

        if (
          !groups[
            permission.resource
          ]
        ) {
          groups[
            permission.resource
          ] = [];
        }

        groups[
          permission.resource
        ].push(permission);
      }

      return groups;
    }, [permissions]);

  function handleRoleSelect(
    roleId: string
  ) {
    setSelectedRoleId(roleId);

    setSelectedPermissionIds(
      rolePermissionIds[roleId] ?? []
    );

    setSuccess(null);
    setError(null);
  }

  function togglePermission(
    permissionId: string
  ) {
    if (!canManageSettings) {
      return;
    }

    setSuccess(null);

    setSelectedPermissionIds(
      (current) =>
        current.includes(
          permissionId
        )
          ? current.filter(
              (id) =>
                id !== permissionId
            )
          : [
              ...current,
              permissionId,
            ]
    );
  }

  async function handleSave() {
    if (
      !canManageSettings ||
      !selectedRoleId ||
      !selectedRole
    ) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await rolePermissionsService.updateRolePermissions(
        selectedRoleId,
        selectedPermissionIds
      );

      setRolePermissionIds(
        (current) => ({
          ...current,
          [selectedRoleId]:
            selectedPermissionIds,
        })
      );

      setSuccess(
        `دسترسی‌های نقش «${getRoleLabel(
          selectedRole
        )}» با موفقیت ذخیره شد.`
      );
    } catch (err) {
      setError(
        getErrorMessage(err)
      );
    } finally {
      setSaving(false);
    }
  }

  function isPermissionSelected(
    permissionId: string
  ) {
    return selectedPermissionIds.includes(
      permissionId
    );
  }

  if (permissionsLoading) {
    return (
      <main
        dir="rtl"
        className="flex min-h-[500px] items-center justify-center"
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <Loader2
              size={22}
              className="animate-spin text-blue-600"
            />
          </div>

          <p className="mt-4 text-sm font-bold text-slate-600">
            در حال بررسی سطح دسترسی...
          </p>
        </div>
      </main>
    );
  }

  if (!canReadSettings) {
    return (
      <main
        dir="rtl"
        className="mx-auto max-w-[1100px]"
      >
        <section className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <ShieldCheck size={24} />
            </div>

            <div>
              <h1 className="text-xl font-black text-slate-900">
                دسترسی محدود است
              </h1>

              <p className="mt-2 text-sm leading-7 text-slate-500">
                شما مجوز مشاهده نقش‌ها و سطح دسترسی را ندارید.
              </p>

              {permissionsError && (
                <p className="mt-3 text-xs text-red-500">
                  {permissionsError}
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="flex min-h-[500px] items-center justify-center"
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <Loader2
              size={22}
              className="animate-spin text-blue-600"
            />
          </div>

          <p className="mt-4 text-sm font-bold text-slate-600">
            در حال دریافت نقش‌ها و دسترسی‌ها...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="mx-auto max-w-[1400px] space-y-6"
    >
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/settings"
              className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900"
            >
              <ArrowRight size={17} />
              بازگشت به تنظیمات
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <ShieldCheck size={22} />
              </div>

              <div>
                <h1 className="text-2xl font-black text-slate-900">
                  نقش‌ها و سطح دسترسی
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  مدیریت دسترسی‌های هر نقش در CRM
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadData();
            }}
            disabled={
              saving || loading
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />
            بروزرسانی
          </button>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-black text-slate-900">
              نقش‌ها
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              نقش شرکتی موردنظر را انتخاب کنید.
            </p>
          </div>

          <div className="space-y-2">
            {roles.map((role) => {
              const active =
                role.id ===
                selectedRoleId;

              const permissionCount = (
                rolePermissionIds[
                  role.id
                ] ?? []
              ).length;

              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => {
                    handleRoleSelect(
                      role.id
                    );
                  }}
                  className={`w-full rounded-2xl border p-4 text-right transition ${
                    active
                      ? "border-blue-200 bg-blue-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`text-sm font-black ${
                        active
                          ? "text-blue-800"
                          : "text-slate-800"
                      }`}
                    >
                      {getRoleLabel(role)}
                    </span>

                    {active && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                        <Check size={14} />
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-right text-xs text-slate-500">
                    {getRoleDescription(
                      role
                    )}
                  </p>

                  <p
                    dir="ltr"
                    className="mt-2 text-left text-[10px] text-slate-400"
                  >
                    {role.slug}
                  </p>

                  <div className="mt-3 text-xs font-bold text-slate-500">
                    {permissionCount.toLocaleString(
                      "fa-IR"
                    )}{" "}
                    دسترسی فعال
                  </div>
                </button>
              );
            })}

            {roles.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
                هیچ نقش شرکتی فعالی پیدا نشد.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {selectedRole ? (
            <>
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {getRoleLabel(
                      selectedRole
                    )}
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {getRoleDescription(
                      selectedRole
                    )}
                  </p>
                </div>

                {canManageSettings ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleSave();
                    }}
                    disabled={saving}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <Save size={17} />
                    )}

                    ذخیره دسترسی‌ها
                  </button>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                    فقط مشاهده
                  </span>
                )}
              </div>

              {selectedRole.slug ===
                "company_admin" && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-bold leading-6 text-amber-800">
                    این نقش مدیریتی است. دسترسی
                    `admin.full_access` در سطح سیستمی
                    مدیریت می‌شود و از این صفحه قابل
                    واگذاری یا حذف نیست.
                  </p>
                </div>
              )}

              <div className="mt-6 space-y-6">
                {Object.entries(
                  groupedPermissions
                ).map(
                  ([
                    resource,
                    resourcePermissions,
                  ]) => (
                    <div
                      key={resource}
                      className="overflow-hidden rounded-2xl border border-slate-200"
                    >
                      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                        <h3 className="text-sm font-black text-slate-800">
                          {getResourceLabel(
                            resource
                          )}
                        </h3>
                      </div>

                      <div className="grid gap-3 p-4 md:grid-cols-2">
                        {resourcePermissions.map(
                          (permission) => {
                            const selected =
                              isPermissionSelected(
                                permission.id
                              );

                            return (
                              <label
                                key={
                                  permission.id
                                }
                                className={`flex items-center gap-3 rounded-2xl border p-4 transition ${
                                  selected
                                    ? "border-blue-200 bg-blue-50"
                                    : "border-slate-200 bg-white"
                                } ${
                                  canManageSettings
                                    ? "cursor-pointer hover:bg-slate-50"
                                    : "cursor-default"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    selected
                                  }
                                  disabled={
                                    !canManageSettings
                                  }
                                  onChange={() => {
                                    togglePermission(
                                      permission.id
                                    );
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />

                                <div className="min-w-0">
                                  <p className="text-sm font-black text-slate-800">
                                    {getActionLabel(
                                      permission.action
                                    )}
                                  </p>

                                  <p className="mt-1 text-xs leading-5 text-slate-500">
                                    {getPermissionDescription(
                                      permission
                                    )}
                                  </p>

                                  <p
                                    dir="ltr"
                                    className="mt-1 text-[10px] text-slate-400"
                                  >
                                    {permission.slug}
                                  </p>
                                </div>
                              </label>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </>
          ) : (
            <div className="flex min-h-[400px] items-center justify-center text-sm font-bold text-slate-400">
              یک نقش را برای مدیریت دسترسی انتخاب کنید.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  History,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { useQueryId } from "@/src/lib/hooks/useQueryId";

import {
  formatJalaliDate,
  getTodayJalali,
  gregorianToJalali,
  isValidJalaliDate,
  jalaliToGregorianDate,
} from "@/src/lib/utils/jalali";

import { useOrders } from "@/src/lib/hooks/useOrders";
import { usePermissions } from "@/src/lib/hooks/usePermissions";

import { waybillsService } from "@/src/lib/services/waybills";

import type { Waybill } from "@/src/lib/types/waybill";

import {
  ordersService,
  type OrderApprovalDecision,
  type OrderApprovalHistoryItem,
  type OrderWorkflowSummary,
  type OrderWithRelations,
  type UpdateOrderInput,
} from "@/src/lib/services/orders";

import type { OrderItem } from "@/src/lib/types/order";

type OrderStatus =
  | "draft"
  | "confirmed"
  | "cancelled";

type WorkflowAwareOrder = OrderWithRelations & {
  workflow_version?: "v1" | "v2";
};

function getOrderWorkflowVersion(
  order: WorkflowAwareOrder | null
): "v1" | "v2" {
  return order?.workflow_version === "v2"
    ? "v2"
    : "v1";
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "۰";
  }

  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getApprovalStatusLabel(
  status: string | null | undefined
): string {
  switch (status) {
    case "pending":
      return "در انتظار تأیید";
    case "approved":
      return "تأیید شده";
    case "rejected":
      return "رد شده";
    case "returned":
      return "برگشت داده شده";
    case "cancelled":
      return "لغو شده";
    default:
      return "شروع نشده";
  }
}

function getApprovalStatusClass(
  status: string | null | undefined
): string {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
    case "approved":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
    case "rejected":
      return "bg-red-50 text-red-700 ring-1 ring-red-100";
    case "returned":
      return "bg-orange-50 text-orange-700 ring-1 ring-orange-100";
    case "cancelled":
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
    default:
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  }
}

function getApprovalStageLabel(
  stage: "regional" | "sales"
): string {
  return stage === "regional" ? "مدیر منطقه" : "مدیر فروش";
}

function buildWorkflowSummary(
  order: Pick<
    OrderWithRelations,
    | "approval_status"
    | "fulfillment_status"
    | "delivery_status"
  >,
  approvalHistory: OrderApprovalHistoryItem[]
): OrderWorkflowSummary {
  const latestPendingApproval = approvalHistory
    .filter(
      (item) =>
        !item.deleted_at &&
        item.status === "pending"
    )
    .sort((first, second) => {
      const firstTime = Date.parse(
        first.created_at
      );
      const secondTime = Date.parse(
        second.created_at
      );

      if (secondTime !== firstTime) {
        return secondTime - firstTime;
      }

      return (
        Number(second.cycle_number ?? 0) -
        Number(first.cycle_number ?? 0)
      );
    })[0];

  return {
    approval_status: order.approval_status,
    fulfillment_status: order.fulfillment_status,
    delivery_status: order.delivery_status,
    pending_stage:
      latestPendingApproval?.approval_stage ??
      null,
  };
}

function getApprovalDecisionTitle(
  decision: OrderApprovalDecision
): string {
  switch (decision) {
    case "approve":
      return "تأیید سفارش";
    case "return":
      return "برگشت سفارش برای اصلاح";
    case "reject":
      return "رد سفارش";
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "پیش‌نویس",
    confirmed: "تأیید شده",
    cancelled: "لغو شده",
  };

  return labels[status] ?? status;
}

function getStatusClass(status: string): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";

    case "cancelled":
      return "bg-red-50 text-red-700 ring-1 ring-red-100";

    case "draft":
    default:
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "confirmed":
      return <CheckCircle2 size={15} />;

    case "cancelled":
      return <XCircle size={15} />;

    case "draft":
    default:
      return <FileText size={15} />;
  }
}

function getSourceLabel(
  source: string | null | undefined
): string {
  const labels: Record<string, string> = {
    manual: "ثبت دستی",
    mobile_app: "اپلیکیشن موبایل",
    whatsapp: "واتساپ",
    sms: "پیامک",
    pwa: "PWA",
    api: "API",
  };

  if (!source) {
    return "—";
  }

  return labels[source] ?? source;
}

function getCustomerTypeLabel(
  value: string | null | undefined
): string {
  if (!value) {
    return "—";
  }

  const labels: Record<string, string> = {
    building_material_store: "مصالح‌فروشی",
    building_material_stores: "مصالح‌فروشی",
    contractor: "پیمانکار",
    contractor_company: "پیمانکار",
    employer: "کارفرما",
    employers: "کارفرما",
    plasterer: "گچ‌کار",
    plaster_worker: "گچ‌کار",
    plasterer_company: "گچ‌کار",
    distributor: "توزیع‌کننده",
    retailer: "خرده‌فروشی",
  };

  return labels[value] ?? value;
}

function getWaybillStatusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "پیش‌نویس";

    case "issued":
      return "صادر شده";

    case "loading_confirmed":
      return "بارگیری تأیید شده";

    case "cancelled":
      return "لغو شده";

    default:
      return status;
  }
}

function getWaybillStatusClass(status: string): string {
  switch (status) {
    case "issued":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-100";

    case "loading_confirmed":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";

    case "cancelled":
      return "bg-red-50 text-red-700 ring-1 ring-red-100";

    case "draft":
    default:
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
  }
}

function getLoadingStatusLabel(
  status: string | null | undefined
): string {
  switch (status) {
    case "confirmed":
      return "بارگیری تأیید شده";

    case "cancelled":
      return "بارگیری لغو شده";

    case "pending":
      return "در انتظار بارگیری";

    default:
      return "ثبت نشده";
  }
}

function LoadingBlock({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-7">
      <div className="flex items-center justify-center gap-3 text-sm font-bold text-slate-600">
        <RefreshCw size={17} className="animate-spin text-violet-600" />
        {text}
      </div>
    </div>
  );
}

function ErrorBlock({
  message,
  title = "خطا",
}: {
  message: string;
  title?: string;
}) {
  return (
    <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-right">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm">
          <XCircle size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-red-800">{title}</p>
          <p className="mt-1 text-sm leading-6 text-red-600">{message}</p>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
  tone = "slate",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?:
    | "slate"
    | "blue"
    | "emerald"
    | "violet";
}) {
  const toneClasses = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 transition hover:bg-white hover:shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClasses[tone]}`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">
            {label}
          </p>

          <p className="mt-1 truncate text-sm font-black text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      {eyebrow && (
        <p className="text-xs font-bold text-blue-600">
          {eyebrow}
        </p>
      )}

      <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">
        {title}
      </h2>

      {description && (
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

type OrderEditorProduct = {
  id: string;
  name: string;
  sku: string;
  product_line: string;
  weight_kg: number;
};

type OrderItemEditorDraft = {
  key: string;
  itemId: string | null;
  productId: string;
  quantity: string;
};

function ProductItemEditorCard({
  draft,
  index,
  products,
  onChange,
  onRemove,
}: {
  draft: OrderItemEditorDraft;
  index: number;
  products: OrderEditorProduct[];
  onChange: (key: string, patch: Partial<OrderItemEditorDraft>) => void;
  onRemove: (key: string) => void;
}) {
  const selectedProduct =
    products.find(
      (product) =>
        product.id === draft.productId
    ) ?? null;

  const quantity = Number(draft.quantity);
  const safeQuantity =
    Number.isFinite(quantity) &&
    quantity > 0
      ? quantity
      : 0;
  const weight = Number(
    selectedProduct?.weight_kg ?? 0
  );
  const tonnage =
    safeQuantity * weight / 1000;

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black text-white shadow-sm">
              {formatNumber(index + 1)}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold text-blue-600">
                {draft.itemId
                  ? "ویرایش قلم"
                  : "قلم جدید"}
              </p>

              <h3 className="mt-1 text-base font-black text-slate-900">
                تنظیم مشخصات کالا
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onRemove(draft.key)
            }
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={15} />
            حذف قلم
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <div>
            <label
              htmlFor={`order-item-product-${draft.key}`}
              className="mb-2 block text-xs font-bold text-slate-500"
            >
              محصول
            </label>

            <select
              id={`order-item-product-${draft.key}`}
              value={draft.productId}
              onChange={(event) =>
                onChange(draft.key, {
                  productId:
                    event.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            >
              <option value="">
                انتخاب محصول...
              </option>

              {products.map(
                (product) => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.name} — {formatNumber(Number(product.weight_kg))} کیلو
                  </option>
                )
              )}
            </select>

            {selectedProduct && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                <span>
                  {selectedProduct.product_line ||
                    "محصول"}
                </span>
                {selectedProduct.sku && (
                  <span>
                    کد: {selectedProduct.sku}
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor={`order-item-quantity-${draft.key}`}
              className="mb-2 block text-xs font-bold text-slate-500"
            >
              تعداد کیسه
            </label>

            <input
              id={`order-item-quantity-${draft.key}`}
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={draft.quantity}
              onChange={(event) =>
                onChange(draft.key, {
                  quantity:
                    event.target.value.replace(
                      /[^0-9]/g,
                      ""
                    ),
                })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <div className="rounded-xl border border-emerald-100 bg-white p-4">
            <p className="text-xs font-bold text-emerald-600">
              تناژ محاسباتی
            </p>

            <p className="mt-1 text-lg font-black text-emerald-800">
              {formatNumber(tonnage)} تن
            </p>

            <p className="mt-1 text-[11px] text-slate-400">
              وزن هر کیسه: {formatNumber(weight)} کیلو
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductItemCard({
  item,
  index,
}: {
  item: OrderItem;
  index: number;
}) {
  const quantity = Number(item.quantity ?? 0);

  const weight = Number(
    item.weight_kg_snapshot ??
      item.bag_weight_kg ??
      0
  );

  const tonnage = Number(item.tonnage ?? 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 transition hover:bg-white hover:shadow-sm">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-sm font-black text-white shadow-sm">
            {formatNumber(index + 1)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-black text-slate-900">
                {item.product_name_snapshot ||
                  "بدون نام کالا"}
              </h3>

              {item.product_id && (
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-400 ring-1 ring-slate-200">
                  محصول ثبت‌شده
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-slate-400">
              تعداد کیسه
            </p>

            <p className="mt-1 text-lg font-black text-slate-900">
              {formatNumber(quantity)}{" "}
              <span className="text-xs font-bold text-slate-400">
                کیسه
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-slate-400">
              وزن هر کیسه
            </p>

            <p className="mt-1 text-lg font-black text-slate-900">
              {formatNumber(weight)}{" "}
              <span className="text-xs font-bold text-slate-400">
                کیلو
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-bold text-blue-500">
              وزن کل
            </p>

            <p className="mt-1 text-lg font-black text-blue-800">
              {formatNumber(
                quantity * weight
              )}{" "}
              <span className="text-xs font-bold">
                کیلو
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-bold text-emerald-600">
              تناژ این قلم
            </p>

            <p className="mt-1 text-lg font-black text-emerald-800">
              {formatNumber(tonnage)}{" "}
              <span className="text-xs font-bold">
                تن
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            محاسبه:{" "}
            {formatNumber(quantity)}
            {" × "}
            {formatNumber(weight)}
            {" ÷ ۱۰۰۰"}
          </p>

          <p className="text-sm font-black text-emerald-700">
            {formatNumber(tonnage)} تن
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailsPage() {
  const router = useRouter();

  const orderId = useQueryId();

  const {
    data: orders,
    loading,
    error,
    updateOrder,
    deleteOrder,
    refresh,
  } = useOrders();

  const order =
    (orders.find(
      (item) =>
        item.id === orderId
    ) as
      | WorkflowAwareOrder
      | undefined) ?? null;

  const orderWorkflowVersion =
    getOrderWorkflowVersion(order);
  const isV2Order =
    orderWorkflowVersion === "v2";

  const orderExists = order !== null;
  const orderApprovalStatus =
    order?.approval_status ?? null;
  const orderFulfillmentStatus =
    order?.fulfillment_status ?? null;
  const orderDeliveryStatus =
    order?.delivery_status ?? null;

  const currentJalaliDate =
    order
      ? gregorianToJalali(
          order.order_date
        )
      : null;

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [
    waybillLoading,
    setWaybillLoading,
  ] = useState(Boolean(orderId));

  const [
    waybillCreating,
    setWaybillCreating,
  ] = useState(false);

  const [waybills, setWaybills] =
    useState<Waybill[]>([]);

  const [message, setMessage] =
    useState("");

  const [formError, setFormError] =
    useState("");

  const {
    hasPermission,
    loading: permissionsLoading,
  } = usePermissions();

  const [approvalHistory, setApprovalHistory] =
    useState<OrderApprovalHistoryItem[]>([]);

  const [workflowSummary, setWorkflowSummary] =
    useState<OrderWorkflowSummary | null>(null);

  const [approvalLoading, setApprovalLoading] =
    useState(Boolean(orderId));

  const [approvalBusy, setApprovalBusy] =
    useState(false);

  const [approvalError, setApprovalError] =
    useState<string | null>(null);

  const [approvalDialog, setApprovalDialog] =
    useState<{
      stage: "regional" | "sales";
      decision: OrderApprovalDecision;
    } | null>(null);

  const [approvalReason, setApprovalReason] =
    useState("");

  const [approvalNotes, setApprovalNotes] =
    useState("");

  const [itemEditing, setItemEditing] =
    useState(false);

  const [itemSaving, setItemSaving] =
    useState(false);

  const [itemError, setItemError] =
    useState("");

  const [itemDrafts, setItemDrafts] =
    useState<OrderItemEditorDraft[]>([]);

  const [itemProducts, setItemProducts] =
    useState<OrderEditorProduct[]>([]);

  const [itemProductsLoading, setItemProductsLoading] =
    useState(false);

  const [
    jalaliYear,
    setJalaliYear,
  ] = useState("");

  const [
    jalaliMonth,
    setJalaliMonth,
  ] = useState("");

  const [
    jalaliDay,
    setJalaliDay,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState<
    "" |
      "draft" |
      "confirmed" |
      "cancelled"
  >("");

  const [
    notes,
    setNotes,
  ] = useState("");

  const displayJalaliYear =
    jalaliYear ||
    (currentJalaliDate
      ? String(currentJalaliDate.year)
      : "");

  const displayJalaliMonth =
    jalaliMonth ||
    (currentJalaliDate
      ? String(currentJalaliDate.month)
      : "1");

  const displayJalaliDay =
    jalaliDay ||
    (currentJalaliDate
      ? String(currentJalaliDate.day)
      : "1");

  const displayStatus =
    status ||
    (order?.status as
      | OrderStatus
      | undefined) ||
    "draft";

  const displayNotes =
    notes !== ""
      ? notes
      : order?.notes ?? "";

  const orderItems = (
    order?.items ?? []
  ).filter(
    (item) => !item.deleted_at
  );

  const calculatedItemsTonnage =
    orderItems.reduce(
      (sum, item) =>
        sum +
        Number(item.tonnage ?? 0),
      0
    );

  const canEditV2Order =
    Boolean(
      order &&
        isV2Order &&
        order.status === "draft" &&
        !workflowSummary?.pending_stage &&
        (order.approval_status === null ||
          order.approval_status === "returned" ||
          order.approval_status === "rejected") &&
        hasPermission("orders.edit")
    );

  const canEditOrderDetails =
    !isV2Order || canEditV2Order;

  const canIssueWaybill =
    Boolean(
      order &&
        order.status ===
          "confirmed" &&
        orderItems.length > 0 &&
        waybills.length === 0
    );

  const fetchOrderWaybills =
    useCallback(async () => {
      if (!orderId) {
        return [];
      }

      return waybillsService.getByOrderId(
        orderId
      );
    }, [orderId]);

  const loadOrderWaybills =
    useCallback(async () => {
      if (!orderId) {
        return;
      }

      setWaybillLoading(true);

      try {
        const result =
          await fetchOrderWaybills();

        setWaybills(result);
      } catch (err) {
        console.error(
          "ORDER WAYBILLS LOAD:",
          err
        );

        setWaybills([]);
      } finally {
        setWaybillLoading(false);
      }
    }, [
      orderId,
      fetchOrderWaybills,
    ]);

  useEffect(() => {
    let mounted = true;

    async function loadApprovalWorkflow() {
      if (!orderId || !isV2Order || !orderExists) {
        if (mounted) {
          setApprovalHistory([]);
          setWorkflowSummary(null);
          setApprovalError(null);
          setApprovalLoading(false);
        }
        return;
      }

      try {
        setApprovalLoading(true);
        setApprovalError(null);

        const history =
          await ordersService.getApprovalHistory(
            orderId
          );

        if (!mounted) return;

        setApprovalHistory(history);

        if (orderExists) {
          setWorkflowSummary(
            buildWorkflowSummary(
              {
                approval_status:
                  orderApprovalStatus,
                fulfillment_status:
                  orderFulfillmentStatus,
                delivery_status:
                  orderDeliveryStatus,
              },
              history
            )
          );
        } else {
          setWorkflowSummary(null);
        }
      } catch (err) {
        console.error("ORDER APPROVAL WORKFLOW LOAD:", err);
        if (!mounted) return;
        setApprovalHistory([]);
        setWorkflowSummary(null);
        setApprovalError(
          err instanceof Error
            ? err.message
            : "خطا در دریافت وضعیت تأیید سفارش."
        );
      } finally {
        if (mounted) setApprovalLoading(false);
      }
    }

    void loadApprovalWorkflow();

    return () => {
      mounted = false;
    };
  }, [
    orderId,
    isV2Order,
    order?.updated_at,
    orderExists,
    orderApprovalStatus,
    orderFulfillmentStatus,
    orderDeliveryStatus,
  ]);

  useEffect(() => {
    let cancelled = false;

    if (!orderId) {
      return () => {
        cancelled = true;
      };
    }

    fetchOrderWaybills()
      .then((result) => {
        if (cancelled) {
          return;
        }

        setWaybills(result);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        console.error(
          "ORDER WAYBILLS LOAD:",
          err
        );

        setWaybills([]);
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        setWaybillLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId, fetchOrderWaybills]);

  function openApprovalDialog(
    stage: "regional" | "sales",
    decision: OrderApprovalDecision
  ) {
    setApprovalError(null);
    setApprovalReason("");
    setApprovalNotes("");
    setApprovalDialog({ stage, decision });
  }

  function closeApprovalDialog() {
    if (approvalBusy) return;
    setApprovalDialog(null);
    setApprovalReason("");
    setApprovalNotes("");
  }

  async function loadApprovalWorkflowForPage(
    targetOrderId: string
  ) {
    const history =
      await ordersService.getApprovalHistory(
        targetOrderId
      );

    setApprovalHistory(history);

    if (order?.id === targetOrderId) {
      setWorkflowSummary(
        buildWorkflowSummary(
          order,
          history
        )
      );
    } else {
      setWorkflowSummary(null);
    }
  }

  async function handleSubmitForApproval() {
    if (!order) return;

    if (!isV2Order) {
      setApprovalError("این سفارش متعلق به Workflow V1 است و در چرخه تأیید V2 قرار ندارد.");
      return;
    }

    if (!hasPermission("orders.submit")) {
      setApprovalError("شما مجوز ارسال سفارش برای بررسی را ندارید.");
      return;
    }

    if (order.status !== "draft") {
      setApprovalError("فقط سفارش پیش‌نویس را می‌توان برای بررسی ارسال کرد.");
      return;
    }

    if (workflowSummary?.pending_stage) {
      setApprovalError("این سفارش در حال حاضر در صف تأیید قرار دارد.");
      return;
    }

    try {
      setApprovalBusy(true);
      setApprovalError(null);
      setMessage("");

      await ordersService.submitForApproval({
        order_id: order.id,
      });

      setMessage("سفارش با موفقیت برای بررسی مدیر منطقه ارسال شد.");
      await Promise.all([
        refresh(),
        loadApprovalWorkflowForPage(order.id),
      ]);
    } catch (err) {
      console.error("ORDER SUBMIT FOR APPROVAL:", err);
      setApprovalError(
        err instanceof Error
          ? err.message
          : "خطا در ارسال سفارش برای بررسی."
      );
    } finally {
      setApprovalBusy(false);
    }
  }

  async function handleApprovalDecision() {
    if (!order || !approvalDialog) return;

    if (!isV2Order) {
      setApprovalError("این سفارش متعلق به Workflow V1 است و امکان تصمیم‌گیری V2 برای آن وجود ندارد.");
      return;
    }

    const { stage, decision } = approvalDialog;

    const requiresReason = decision === "reject" || decision === "return";

    if (requiresReason && !approvalReason.trim()) {
      setApprovalError("برای رد یا برگشت سفارش، ثبت دلیل الزامی است.");
      return;
    }

    const permissionByDecision: Record<
      "regional" | "sales",
      Record<OrderApprovalDecision, string>
    > = {
      regional: {
        approve: "orders.regional_approve",
        reject: "orders.regional_reject",
        return: "orders.regional_return",
      },
      sales: {
        approve: "orders.sales_approve",
        reject: "orders.sales_reject",
        return: "orders.sales_return",
      },
    };

    const requiredPermission = permissionByDecision[stage][decision];
    if (!hasPermission(requiredPermission)) {
      setApprovalError("شما مجوز انجام این عملیات را ندارید.");
      return;
    }

    try {
      setApprovalBusy(true);
      setApprovalError(null);
      setMessage("");

      await ordersService.decideApproval({
        order_id: order.id,
        stage,
        decision,
        reason: approvalReason.trim() || null,
        notes: approvalNotes.trim() || null,
      });

      const successMessage =
        decision === "approve"
          ? stage === "regional"
            ? "تأیید مدیر منطقه ثبت شد و سفارش برای مدیر فروش ارسال شد."
            : "تأیید نهایی مدیر فروش ثبت شد و سفارش آماده اجرا شد."
          : decision === "return"
            ? "سفارش برای اصلاح برگشت داده شد."
            : "سفارش رد شد.";

      setMessage(successMessage);
      closeApprovalDialog();

      await Promise.all([
        refresh(),
        loadApprovalWorkflowForPage(order.id),
      ]);
    } catch (err) {
      console.error("ORDER APPROVAL DECISION:", err);
      setApprovalError(
        err instanceof Error
          ? err.message
          : "خطا در ثبت تصمیم تأیید سفارش."
      );
    } finally {
      setApprovalBusy(false);
    }
  }

  function createItemDraft(
    product: OrderEditorProduct,
    itemId: string | null = null,
    quantity = "1",
    key = itemId ?? "new-item"
  ): OrderItemEditorDraft {
    return {
      key,
      itemId,
      productId: product.id,
      quantity,
    };
  }

  async function startItemEditing() {
    if (!order || !canEditV2Order) {
      return;
    }

    setItemError("");
    setItemProductsLoading(true);

    try {
      const products =
        await ordersService.getProducts();

      const normalizedProducts =
        products.map((product) => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
          product_line: product.product_line,
          weight_kg: Number(product.weight_kg),
        }));

      if (normalizedProducts.length === 0) {
        throw new Error(
          "هیچ محصول فعال و قابل انتخابی برای ویرایش سفارش وجود ندارد."
        );
      }

      setItemProducts(
        normalizedProducts
      );

      const missingProductItem =
        orderItems.find(
          (item) =>
            !item.product_id ||
            !normalizedProducts.some(
              (product) =>
                product.id === item.product_id
            )
        );

      if (missingProductItem) {
        throw new Error(
          `محصول «${missingProductItem.product_name_snapshot ?? "بدون نام"}» فعال نیست یا از کاتالوگ حذف شده است. ابتدا وضعیت محصول را اصلاح کنید.`
        );
      }

      const drafts =
        orderItems.map((item) => {
          const existingProduct =
            normalizedProducts.find(
              (product) =>
                product.id === item.product_id
            );

          if (!existingProduct) {
            throw new Error(
              "یکی از محصولات سفارش در کاتالوگ فعال پیدا نشد."
            );
          }

          return createItemDraft(
            existingProduct,
            item.id,
            String(
              Math.max(
                1,
                Math.trunc(
                  Number(item.quantity ?? 1)
                )
              )
            )
          );
        });

      setItemDrafts(drafts);
      setItemEditing(true);
    } catch (err) {
      console.error(
        "START ORDER ITEM EDITING:",
        err
      );
      setItemError(
        err instanceof Error
          ? err.message
          : "خطا در آماده‌سازی ویرایش اقلام سفارش."
      );
    } finally {
      setItemProductsLoading(false);
    }
  }

  function cancelItemEditing() {
    if (itemSaving) return;
    setItemEditing(false);
    setItemDrafts([]);
    setItemError("");
  }

  function addItemDraft() {
    const product = itemProducts[0];
    if (!product) {
      setItemError("محصول فعالی برای افزودن قلم وجود ندارد.");
      return;
    }

    setItemDrafts((current) => [
      ...current,
      createItemDraft(
        product,
        null,
        "1",
        `new-${crypto.randomUUID()}`
      ),
    ]);
    setItemError("");
  }

  function updateItemDraft(
    key: string,
    patch: Partial<OrderItemEditorDraft>
  ) {
    setItemDrafts((current) =>
      current.map((draft) =>
        draft.key === key
          ? { ...draft, ...patch }
          : draft
      )
    );
  }

  function removeItemDraft(key: string) {
    if (itemDrafts.length <= 1) {
      setItemError(
        "سفارش باید حداقل یک قلم فعال داشته باشد."
      );
      return;
    }

    setItemDrafts((current) =>
      current.filter(
        (draft) => draft.key !== key
      )
    );
    setItemError("");
  }

  async function handleSaveItems() {
    if (!order || !canEditV2Order) {
      setItemError(
        "این سفارش در وضعیت فعلی قابل ویرایش نیست."
      );
      return;
    }

    if (itemDrafts.length === 0) {
      setItemError(
        "سفارش باید حداقل یک قلم فعال داشته باشد."
      );
      return;
    }

    const draftItemIds = new Set(
      itemDrafts
        .map((draft) => draft.itemId)
        .filter((id): id is string => Boolean(id))
    );

    for (const draft of itemDrafts) {
      const product =
        itemProducts.find(
          (item) =>
            item.id === draft.productId
        );

      const quantity = Number(
        draft.quantity
      );

      if (!product) {
        setItemError(
          "برای همه اقلام، یک محصول معتبر انتخاب کنید."
        );
        return;
      }

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        setItemError(
          "تعداد کیسه برای همه اقلام باید یک عدد صحیح و بیشتر از صفر باشد."
        );
        return;
      }
    }

    setItemSaving(true);
    setItemError("");
    setMessage("");

    try {
      for (const draft of itemDrafts) {
        const product =
          itemProducts.find(
            (item) =>
              item.id === draft.productId
          );

        if (!product) {
          throw new Error("محصول انتخاب‌شده پیدا نشد.");
        }

        const quantity = Math.trunc(
          Number(draft.quantity)
        );

        const input = {
          product_id: product.id,
          product_name_snapshot: product.name,
          quantity,
          bag_weight_kg: product.weight_kg,
          weight_kg_snapshot: product.weight_kg,
        };

        if (draft.itemId) {
          await ordersService.updateItem(
            draft.itemId,
            input
          );
        } else {
          await ordersService.addItem(
            order.id,
            input
          );
        }
      }

      for (const item of orderItems) {
        if (!draftItemIds.has(item.id)) {
          await ordersService.deleteItem(
            item.id
          );
        }
      }

      await refresh();
      setItemEditing(false);
      setItemDrafts([]);
      setMessage("اقلام سفارش با موفقیت به‌روزرسانی شد.");

      window.setTimeout(() => {
        setMessage("");
      }, 4000);
    } catch (err) {
      console.error("SAVE ORDER ITEMS:", err);
      setItemError(
        err instanceof Error
          ? err.message
          : "خطا در ذخیره اقلام سفارش."
      );
    } finally {
      setItemSaving(false);
    }
  }

  async function handleIssueWaybill() {
    if (!order) {
      return;
    }

    if (order.status !== "confirmed") {
      setFormError(
        "فقط سفارش‌های تأییدشده امکان صدور حواله دارند."
      );
      return;
    }

    if (orderItems.length === 0) {
      setFormError(
        "این سفارش هیچ قلم فعال کالایی برای صدور حواله ندارد."
      );
      return;
    }

    if (waybills.length > 0) {
      setFormError(
        "برای این سفارش قبلاً حواله فعال صادر شده است."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "آیا از صدور حواله برای این سفارش مطمئن هستید؟"
      );

    if (!confirmed) {
      return;
    }

    setWaybillCreating(true);
    setMessage("");
    setFormError("");

    try {
      const today =
        getTodayJalali();

      const waybill =
        await waybillsService.create({
          order_id: order.id,
          waybill_date:
            jalaliToGregorianDate(
              today
            ),
          notes:
            displayNotes.trim() ||
            null,
        });

      setMessage(
        `حواله شماره ${formatNumber(
          Number(
            waybill.waybill_number
          )
        )} با موفقیت صادر شد.`
      );

      await loadOrderWaybills();

      window.setTimeout(() => {
        setMessage("");
      }, 4000);
    } catch (err) {
      console.error(
        "ORDER ISSUE WAYBILL:",
        err
      );

      setFormError(
        err instanceof Error
          ? err.message
          : "خطا در صدور حواله."
      );
    } finally {
      setWaybillCreating(false);
    }
  }

  async function handleSave() {
    if (!order) {
      return;
    }

    setSaving(true);
    setMessage("");
    setFormError("");

    try {
      const year = Number(
        displayJalaliYear
      );

      const month = Number(
        displayJalaliMonth
      );

      const day = Number(
        displayJalaliDay
      );

      const jalaliDate = {
        year,
        month,
        day,
      };

      if (!isValidJalaliDate(jalaliDate)) {
        throw new Error(
          "تاریخ جلالی واردشده معتبر نیست."
        );
      }

      const gregorianDate =
        jalaliToGregorianDate(
          jalaliDate
        );

      const payload: UpdateOrderInput = {
        order_date:
          gregorianDate,
        status:
          displayStatus,
        notes:
          displayNotes.trim() ||
          null,
      };

      await updateOrder(
        order.id,
        payload
      );

      setJalaliYear("");
      setJalaliMonth("");
      setJalaliDay("");
      setStatus("");
      setNotes("");

      setMessage(
        "اطلاعات سفارش با موفقیت ذخیره شد."
      );

      await loadOrderWaybills();

      window.setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "خطا در ذخیره سفارش."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!order) {
      return;
    }

    const confirmed =
      window.confirm(
        "آیا از حذف این سفارش مطمئن هستید؟"
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setFormError("");

    try {
      await deleteOrder(order.id);
      router.push("/orders");
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "خطا در حذف سفارش."
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="mx-auto max-w-[1300px]"
      >
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 animate-pulse bg-gradient-to-r from-slate-900 via-violet-600 to-blue-600" />

          <div className="p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100">
              <Package
                size={28}
                className="animate-pulse text-slate-400"
              />
            </div>

            <p className="mt-5 text-sm font-bold text-slate-600">
              در حال دریافت اطلاعات سفارش...
            </p>

            <div className="mx-auto mt-5 h-2 w-52 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-500" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main
        dir="rtl"
        className="mx-auto max-w-[1300px]"
      >
        <section className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm">
          <div className="h-1.5 bg-red-500" />

          <div className="p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <XCircle size={25} />
            </div>

            <h1 className="mt-5 text-2xl font-black text-slate-900">
              خطا در دریافت سفارش
            </h1>

            <p className="mt-2 text-sm leading-7 text-red-600">
              {error}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  void refresh()
                }
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-blue-600"
              >
                <RefreshCw size={16} />
                تلاش مجدد
              </button>

              <Link
                href="/orders"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                بازگشت
                <ArrowLeft size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!order) {
    return (
      <main
        dir="rtl"
        className="mx-auto max-w-[1300px]"
      >
        <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
            <Package size={28} />
          </div>

          <h1 className="mt-5 text-2xl font-black text-slate-900">
            سفارش پیدا نشد
          </h1>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-slate-500">
            سفارش موردنظر وجود ندارد یا قبلاً حذف شده است.
          </p>

          <Link
            href="/orders"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-blue-600"
          >
            بازگشت به سفارش‌ها
            <ArrowLeft size={16} />
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="mx-auto max-w-[1300px] space-y-6 pb-14"
    >
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-slate-900 via-violet-600 to-blue-600" />

        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-100/40 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl" />

        <div className="relative p-6 md:p-8">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-blue-600"
          >
            <ArrowLeft size={16} />
            بازگشت به سفارش‌ها
          </Link>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-15 w-15 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-slate-900 to-violet-600 text-white shadow-lg">
                <Package size={28} />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                    جزئیات سفارش
                  </h1>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClass(
                      order.status
                    )}`}
                  >
                    {getStatusIcon(
                      order.status
                    )}

                    {getStatusLabel(
                      order.status
                    )}
                  </span>
                </div>

                <p className="mt-2 break-all text-xs text-slate-400">
                  شناسه سفارش: {order.id}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/customers/view?id=${encodeURIComponent(order.customer_id)}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <UserRound size={16} />
                مشاهده مشتری
              </Link>

              {waybills.length > 0 && (
                <Link
                  href={`/waybills/view?id=${encodeURIComponent(waybills[0].id)}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700"
                >
                  <Truck size={16} />
                  مشاهده حواله
                </Link>
              )}

              {canIssueWaybill && (
                <button
                  type="button"
                  onClick={() =>
                    void handleIssueWaybill()
                  }
                  disabled={
                    waybillCreating ||
                    waybillLoading
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {waybillCreating ? (
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Truck size={16} />
                  )}

                  {waybillCreating
                    ? "در حال صدور حواله..."
                    : "صدور حواله"}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  void refresh();
                  void loadOrderWaybills();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw size={16} />
                بروزرسانی
              </button>
            </div>
          </div>
        </div>
      </section>

      {message && (
        <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
          <div className="h-1 bg-emerald-500" />

          <div className="flex items-start gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={18} />
            </div>

            <div>
              <p className="font-black text-emerald-800">
                عملیات موفق
              </p>

              <p className="mt-1 text-sm text-emerald-600">
                {message}
              </p>
            </div>
          </div>
        </section>
      )}

      {formError && (
        <section className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
          <div className="h-1 bg-red-500" />

          <div className="flex items-start gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <XCircle size={18} />
            </div>

            <div>
              <p className="font-black text-red-800">
                خطا در عملیات
              </p>

              <p className="mt-1 text-sm leading-6 text-red-600">
                {formError}
              </p>
            </div>
          </div>
        </section>
      )}

      {isV2Order && (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-l from-slate-50 to-white px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <ShieldCheck size={21} />
                </div>
                <div>
                  <p className="text-xs font-bold text-violet-600">V2 Workflow</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">چرخه تأیید سفارش</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">سفارش پس از تأیید مدیر منطقه به مدیر فروش می‌رسد و فقط پس از تأیید نهایی آماده اجرا خواهد شد.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${getApprovalStatusClass(workflowSummary?.approval_status)}`}>
                تأیید: {getApprovalStatusLabel(workflowSummary?.approval_status)}
              </span>
              <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${workflowSummary?.fulfillment_status === "ready" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"}`}>
                اجرا: {workflowSummary?.fulfillment_status === "ready" ? "آماده اجرا" : "آماده نیست"}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {approvalLoading ? (
            <LoadingBlock text="در حال دریافت وضعیت تأیید سفارش..." />
          ) : (
            <>
              {approvalError && <ErrorBlock message={approvalError} title="خطا در چرخه تأیید" />}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-800">مرحله فعلی</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {workflowSummary?.pending_stage
                        ? `در انتظار تصمیم ${getApprovalStageLabel(workflowSummary.pending_stage)}`
                        : workflowSummary?.approval_status === "approved"
                          ? "تأیید نهایی انجام شده و سفارش آماده اجرا است."
                          : workflowSummary?.approval_status === "rejected"
                            ? "سفارش در چرخه فعلی رد شده است."
                            : workflowSummary?.approval_status === "returned"
                              ? "سفارش برای اصلاح برگشت داده شده است."
                              : "هنوز سفارش برای چرخه تأیید ارسال نشده است."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!workflowSummary?.pending_stage && order.status === "draft" && hasPermission("orders.submit") && (
                      <button type="button" onClick={() => void handleSubmitForApproval()} disabled={approvalBusy || permissionsLoading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-xs font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">
                        {approvalBusy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Send size={15} />}
                        ارسال برای تأیید مدیر منطقه
                      </button>
                    )}

                    {workflowSummary?.pending_stage === "regional" &&
                      hasPermission("orders.regional_approve") && (
                      <button type="button" onClick={() => openApprovalDialog("regional", "approve")} disabled={approvalBusy || permissionsLoading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                        <CheckCircle2 size={15} /> تأیید مدیر منطقه
                      </button>
                    )}
                    {workflowSummary?.pending_stage === "regional" &&
                      hasPermission("orders.regional_return") && (
                      <button type="button" onClick={() => openApprovalDialog("regional", "return")} disabled={approvalBusy || permissionsLoading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs font-black text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50">
                        <RotateCcw size={15} /> برگشت برای اصلاح
                      </button>
                    )}
                    {workflowSummary?.pending_stage === "regional" &&
                      hasPermission("orders.regional_reject") && (
                      <button type="button" onClick={() => openApprovalDialog("regional", "reject")} disabled={approvalBusy || permissionsLoading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-xs font-black text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50">
                        <XCircle size={15} /> رد سفارش
                      </button>
                    )}
                    {workflowSummary?.pending_stage === "sales" &&
                      hasPermission("orders.sales_approve") && (
                      <button type="button" onClick={() => openApprovalDialog("sales", "approve")} disabled={approvalBusy || permissionsLoading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                        <CheckCircle2 size={15} /> تأیید نهایی مدیر فروش
                      </button>
                    )}
                    {workflowSummary?.pending_stage === "sales" &&
                      hasPermission("orders.sales_return") && (
                      <button type="button" onClick={() => openApprovalDialog("sales", "return")} disabled={approvalBusy || permissionsLoading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs font-black text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50">
                        <RotateCcw size={15} /> برگشت برای اصلاح
                      </button>
                    )}
                    {workflowSummary?.pending_stage === "sales" &&
                      hasPermission("orders.sales_reject") && (
                      <button type="button" onClick={() => openApprovalDialog("sales", "reject")} disabled={approvalBusy || permissionsLoading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-xs font-black text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50">
                        <XCircle size={15} /> رد سفارش
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-4">
                  <div className="flex items-center gap-2"><History size={17} className="text-slate-500" /><p className="text-sm font-black text-slate-800">تاریخچه تأییدها</p></div>
                  <span className="text-xs font-bold text-slate-400">{formatNumber(approvalHistory.length)} مورد</span>
                </div>
                {approvalHistory.length === 0 ? (
                  <div className="p-7 text-center text-sm text-slate-500">هنوز هیچ تصمیمی در چرخه تأیید ثبت نشده است.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-right text-sm">
                      <thead className="border-b border-slate-100 bg-white"><tr><th className="whitespace-nowrap px-4 py-3 font-black text-slate-500">مرحله</th><th className="whitespace-nowrap px-4 py-3 font-black text-slate-500">دوره</th><th className="whitespace-nowrap px-4 py-3 font-black text-slate-500">وضعیت</th><th className="whitespace-nowrap px-4 py-3 font-black text-slate-500">زمان</th><th className="px-4 py-3 font-black text-slate-500">دلیل / یادداشت</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {approvalHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/70">
                            <td className="whitespace-nowrap px-4 py-4 font-bold text-slate-700">{getApprovalStageLabel(item.approval_stage)}</td>
                            <td className="whitespace-nowrap px-4 py-4 text-slate-600">{formatNumber(item.cycle_number)}</td>
                            <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1.5 text-xs font-bold ${getApprovalStatusClass(item.status)}`}>{getApprovalStatusLabel(item.status)}</span></td>
                            <td className="whitespace-nowrap px-4 py-4 text-slate-600">{formatJalaliDate(item.acted_at ?? item.created_at)}</td>
                            <td className="max-w-md px-4 py-4 text-slate-600"><div className="space-y-1">{item.rejection_reason && <p>رد: {item.rejection_reason}</p>}{item.return_reason && <p>برگشت: {item.return_reason}</p>}{item.notes && <p>یادداشت: {item.notes}</p>}{!item.rejection_reason && !item.return_reason && !item.notes && <span className="text-slate-400">—</span>}</div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
            )}
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
          <SectionTitle
            eyebrow="مشتری"
            title="اطلاعات مشتری"
            description="مشتری مرتبط با این سفارش"
          />

          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white">
                {order.customer?.name?.charAt(0) ||
                  "م"}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/customers/view?id=${encodeURIComponent(order.customer_id)}`}
                    className="truncate text-lg font-black text-slate-900 transition hover:text-blue-600"
                  >
                    {order.customer?.name ??
                      "مشتری نامشخص"}
                  </Link>

                  {order.customer
                    ?.customer_type && (
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                      {getCustomerTypeLabel(
                        order.customer
                          .customer_type
                      )}
                    </span>
                  )}
                </div>

                {order.customer?.phone && (
                  <p
                    dir="ltr"
                    className="mt-2 text-sm text-slate-500"
                  >
                    {order.customer.phone}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
          <SectionTitle
            eyebrow="مسئول فروش"
            title="اطلاعات بازاریاب"
            description="بازاریاب ثبت‌کننده سفارش"
          />

          <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-lg font-black text-white">
                {order.sales_user
                  ?.full_name?.charAt(
                    0
                  ) || "ب"}
              </div>

              <div className="min-w-0">
                <p className="text-lg font-black text-slate-900">
                  {order.sales_user
                    ?.full_name ??
                    "بازاریاب نامشخص"}
                </p>

                {order.sales_user
                  ?.job_title && (
                  <p className="mt-1 text-sm text-slate-500">
                    {
                      order.sales_user
                        .job_title
                    }
                  </p>
                )}

                {order.sales_user?.phone && (
                  <p
                    dir="ltr"
                    className="mt-2 text-sm text-slate-500"
                  >
                    {order.sales_user.phone}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
        <SectionTitle
          eyebrow="خلاصه سفارش"
          title="اطلاعات اصلی سفارش"
          description="مشخصات اصلی و وضعیت فعلی سفارش"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            label="تاریخ سفارش"
            value={formatJalaliDate(
              order.order_date
            )}
            icon={
              <CalendarDays size={19} />
            }
            tone="blue"
          />

          <InfoCard
            label="تعداد اقلام"
            value={`${formatNumber(
              orderItems.length
            )} قلم`}
            icon={
              <Package size={19} />
            }
            tone="violet"
          />

          <InfoCard
            label="تناژ کل"
            value={`${formatNumber(
              Number(
                order.total_tonnage ??
                  0
              )
            )} تن`}
            icon={
              <CheckCircle2 size={19} />
            }
            tone="emerald"
          />

          <InfoCard
            label="منبع سفارش"
            value={getSourceLabel(
              order.source
            )}
            icon={
              <FileText size={19} />
            }
            tone="slate"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle
            eyebrow="اقلام سفارش"
            title="کالاهای این سفارش"
            description={
              itemEditing
                ? "محصول و تعداد هر قلم را اصلاح کنید. وزن و تناژ از اطلاعات محصول محاسبه می‌شود."
                : "جزئیات هر محصول، وزن کیسه، تعداد کیسه و تناژ محاسبه‌شده"
            }
          />

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3">
              <p className="text-xs font-bold text-emerald-600">
                مجموع تناژ اقلام
              </p>

              <p className="mt-1 text-xl font-black text-emerald-800">
                {formatNumber(
                  calculatedItemsTonnage
                )}{" "}
                تن
              </p>
            </div>

            {canEditV2Order && !itemEditing && (
              <button
                type="button"
                onClick={() => void startItemEditing()}
                disabled={itemProductsLoading || itemSaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {itemProductsLoading ? (
                  <RefreshCw
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Pencil size={16} />
                )}

                {itemProductsLoading
                  ? "در حال آماده‌سازی..."
                  : "ویرایش اقلام"}
              </button>
            )}
          </div>
        </div>

        {itemError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">
            {itemError}
          </div>
        )}

        {itemEditing ? (
          <div className="mt-6 space-y-4">
            {itemDrafts.map((draft, index) => (
              <ProductItemEditorCard
                key={draft.key}
                draft={draft}
                index={index}
                products={itemProducts}
                onChange={updateItemDraft}
                onRemove={removeItemDraft}
              />
            ))}

            <button
              type="button"
              onClick={addItemDraft}
              disabled={itemSaving || itemProductsLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-300 bg-blue-50 px-5 py-4 text-sm font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={17} />
              افزودن قلم جدید
            </button>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={cancelItemEditing}
                disabled={itemSaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw size={16} />
                انصراف از ویرایش
              </button>

              <button
                type="button"
                onClick={() => void handleSaveItems()}
                disabled={itemSaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {itemSaving ? (
                  <RefreshCw
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <CheckCircle2 size={17} />
                )}

                {itemSaving
                  ? "در حال ذخیره اقلام..."
                  : "ذخیره اقلام"}
              </button>
            </div>
          </div>
        ) : orderItems.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
              <Package size={24} />
            </div>

            <h3 className="mt-4 font-black text-slate-800">
              این سفارش هنوز قلم کالایی ندارد
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              اطلاعات اقلام این سفارش در دیتابیس ثبت نشده است.
            </p>

            {canEditV2Order && (
              <button
                type="button"
                onClick={() => void startItemEditing()}
                disabled={itemProductsLoading}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={17} />
                افزودن اولین قلم
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {orderItems.map((item, index) => (
              <ProductItemCard
                key={item.id}
                item={item}
                index={index}
              />
            ))}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-white">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400">
                    جمع نهایی
                  </p>

                  <p className="mt-1 text-base font-black">
                    {formatNumber(
                      orderItems.reduce(
                        (sum, item) =>
                          sum +
                          Number(
                            item.quantity ?? 0
                          ),
                        0
                      )
                    )}{" "}
                    کیسه در{" "}
                    {formatNumber(
                      orderItems.length
                    )}{" "}
                    قلم
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-6 py-4">
                  <p className="text-xs text-emerald-300">
                    تناژ نهایی سفارش
                  </p>

                  <p className="mt-1 text-3xl font-black text-emerald-200">
                    {formatNumber(
                      Number(
                        order.total_tonnage ??
                          calculatedItemsTonnage
                      )
                    )}{" "}
                    <span className="text-base">
                      تن
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
        <SectionTitle
          eyebrow="ویرایش"
          title="ویرایش اطلاعات سفارش"
          description="تاریخ، وضعیت و توضیحات سفارش را اصلاح کنید."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <CalendarDays size={18} />
              </div>

              <div>
                <p className="text-sm font-black text-slate-800">
                  تاریخ سفارش
                </p>

                <p className="mt-0.5 text-xs text-slate-400">
                  تقویم جلالی
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="jalali-year"
                  className="mb-2 block text-xs font-bold text-slate-400"
                >
                  سال
                </label>

                <input
                  id="jalali-year"
                  type="text"
                  inputMode="numeric"
                  value={displayJalaliYear}
                  disabled={!canEditOrderDetails}
                  onChange={(event) => {
                    const value =
                      event.target.value
                        .replace(
                          /[۰-۹]/g,
                          (digit) =>
                            String(
                              "۰۱۲۳۴۵۶۷۸۹".indexOf(
                                digit
                              )
                            )
                        )
                        .replace(
                          /[^\d]/g,
                          ""
                        );

                    setJalaliYear(value);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm font-black text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label
                  htmlFor="jalali-month"
                  className="mb-2 block text-xs font-bold text-slate-400"
                >
                  ماه
                </label>

                <select
                  id="jalali-month"
                  value={displayJalaliMonth}
                  disabled={!canEditOrderDetails}
                  onChange={(event) =>
                    setJalaliMonth(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                >
                  {Array.from(
                    { length: 12 },
                    (_, index) => {
                      const value =
                        index + 1;

                      return (
                        <option
                          key={value}
                          value={value}
                        >
                          {formatNumber(
                            value
                          )}
                        </option>
                      );
                    }
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="jalali-day"
                  className="mb-2 block text-xs font-bold text-slate-400"
                >
                  روز
                </label>

                <select
                  id="jalali-day"
                  value={displayJalaliDay}
                  disabled={!canEditOrderDetails}
                  onChange={(event) =>
                    setJalaliDay(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                >
                  {Array.from(
                    {
                      length: 31,
                    },
                    (_, index) => {
                      const value =
                        index + 1;

                      return (
                        <option
                          key={value}
                          value={value}
                        >
                          {formatNumber(
                            value
                          )}
                        </option>
                      );
                    }
                  )}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
            <label
              htmlFor="order-status"
              className="mb-3 block text-sm font-bold text-slate-700"
            >
              وضعیت سفارش
            </label>

            <select
              id="order-status"
              value={displayStatus}
              disabled={!canEditOrderDetails}
              onChange={(event) =>
                setStatus(
                  event.target
                    .value as OrderStatus
                )
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            >
              <option value="draft">
                پیش‌نویس
              </option>

              {(!isV2Order ||
                order.status === "confirmed" ||
                order.approval_status === "approved") && (
                <option value="confirmed">
                  تأیید شده
                </option>
              )}

              <option value="cancelled">
                لغو شده
              </option>
            </select>

            <div
              className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClass(
                displayStatus
              )}`}
            >
              {getStatusIcon(
                displayStatus
              )}

              وضعیت فعلی:{" "}
              {getStatusLabel(
                displayStatus
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
                <Package size={18} />
              </div>

              <div>
                <p className="text-sm font-black text-slate-800">
                  تناژ سفارش
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  محاسبه‌شده از اقلام سفارش
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-5">
              <p className="text-3xl font-black text-emerald-800">
                {formatNumber(
                  Number(
                    order.total_tonnage ??
                      calculatedItemsTonnage
                  )
                )}{" "}
                <span className="text-base">
                  تن
                </span>
              </p>

              <p className="mt-2 text-xs leading-6 text-slate-400">
                این مقدار توسط اقلام سفارش و Trigger دیتابیس مدیریت می‌شود.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
            <label className="mb-3 block text-sm font-bold text-slate-700">
              منبع سفارش
            </label>

            <div className="flex min-h-[58px] items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700">
              <FileText
                size={17}
                className="ml-2 text-slate-400"
              />

              {getSourceLabel(
                order.source
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label
            htmlFor="order-notes"
            className="mb-3 block text-sm font-bold text-slate-700"
          >
            توضیحات سفارش
          </label>

          <textarea
            id="order-notes"
            value={displayNotes}
            disabled={!canEditOrderDetails}
            onChange={(event) =>
              setNotes(
                event.target.value
              )
            }
            rows={5}
            placeholder="توضیحات مربوط به سفارش..."
            className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
          />
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={
              deleting ||
              saving
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? (
              <>
                <RefreshCw
                  size={16}
                  className="animate-spin"
                />

                در حال حذف...
              </>
            ) : (
              <>
                <Trash2 size={16} />

                حذف سفارش
              </>
            )}
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/orders"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              انصراف
            </Link>

            <button
              type="button"
              onClick={handleSave}
              disabled={
                saving ||
                deleting ||
                !canEditOrderDetails
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-7 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw
                    size={16}
                    className="animate-spin"
                  />

                  در حال ذخیره...
                </>
              ) : (
                <>
                  <CheckCircle2
                    size={17}
                  />

                  ذخیره تغییرات
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
        <SectionTitle
          eyebrow="سیستم"
          title="اطلاعات سیستمی"
          description="اطلاعات ثبت و بروزرسانی سفارش"
        />

        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard
            label="ایجاد شده در"
            value={formatJalaliDate(
              order.created_at
            )}
            icon={
              <CalendarDays size={19} />
            }
            tone="slate"
          />

          <InfoCard
            label="آخرین بروزرسانی"
            value={formatJalaliDate(
              order.updated_at
            )}
            icon={
              <RefreshCw size={19} />
            }
            tone="blue"
          />

          <InfoCard
            label="نسخه همگام‌سازی"
            value={formatNumber(
              Number(
                order.sync_version ?? 0
              )
            )}
            icon={
              <ClipboardList size={19} />
            }
            tone="violet"
          />
        </div>
      </section>
      {isV2Order && approvalDialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="approval-dialog-title"
        >
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 bg-gradient-to-l from-slate-50 to-white px-5 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-violet-600">V2 Workflow</p>
                  <h3 id="approval-dialog-title" className="mt-1 text-xl font-black text-slate-900">
                    {getApprovalDecisionTitle(approvalDialog.decision)}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    مرحله {getApprovalStageLabel(approvalDialog.stage)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeApprovalDialog}
                  disabled={approvalBusy}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="بستن"
                >
                  <XCircle size={19} />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              {approvalError && (
                <ErrorBlock
                  message={approvalError}
                  title="خطا در ثبت تصمیم"
                />
              )}

              {(approvalDialog.decision === "return" ||
                approvalDialog.decision === "reject") && (
                <div>
                  <label
                    htmlFor="approval-reason"
                    className="mb-2 block text-sm font-black text-slate-700"
                  >
                    دلیل <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="approval-reason"
                    value={approvalReason}
                    onChange={(event) => setApprovalReason(event.target.value)}
                    rows={4}
                    disabled={approvalBusy}
                    placeholder="دلیل برگشت یا رد سفارش را وارد کنید..."
                    className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="approval-notes"
                  className="mb-2 block text-sm font-black text-slate-700"
                >
                  یادداشت <span className="font-normal text-slate-400">(اختیاری)</span>
                </label>
                <textarea
                  id="approval-notes"
                  value={approvalNotes}
                  onChange={(event) => setApprovalNotes(event.target.value)}
                  rows={3}
                  disabled={approvalBusy}
                  placeholder="یادداشت تکمیلی..."
                  className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeApprovalDialog}
                  disabled={approvalBusy}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  انصراف
                </button>

                <button
                  type="button"
                  onClick={() => void handleApprovalDecision()}
                  disabled={approvalBusy || permissionsLoading}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    approvalDialog.decision === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : approvalDialog.decision === "return"
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {approvalBusy ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : approvalDialog.decision === "approve" ? (
                    <CheckCircle2 size={16} />
                  ) : approvalDialog.decision === "return" ? (
                    <RotateCcw size={16} />
                  ) : (
                    <XCircle size={16} />
                  )}
                  ثبت تصمیم
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
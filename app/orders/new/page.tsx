"use client";

import Link from "next/link";

import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  FileText,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  JalaliDate,
  getTodayJalali,
  jalaliToGregorianDate,
  isValidJalaliDate,
} from "@/src/lib/utils/jalali";

import { customersService } from "@/src/lib/services/customers";

import {
  usersService,
  type SalesUser,
} from "@/src/lib/services/users";

import {
  ordersService,
  type CreateOrderInput,
  type OrderItemInput,
} from "@/src/lib/services/orders";

import type { Customer } from "@/src/lib/types/customer";

const COMPANY_ID =
  "11111111-1111-1111-1111-111111111111";



type OrderStatus =
  | "draft"
  | "confirmed"
  | "cancelled";

type Product = {
  id: string;
  company_id: string;
  name: string;
  sku: string;
  product_line: string;
  weight_kg: number;
  is_active: boolean;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type OrderItemForm = {
  id: string;
  productId: string;
  productName: string;
  bagWeight: string;
  quantity: string;
  manualProduct: boolean;
};

const DEFAULT_BAG_WEIGHTS = [
  "25",
  "30",
  "40",
];

const MANUAL_PRODUCT_VALUE =
  "__manual__";


function createInitialOrderItem(): OrderItemForm {
  return {
    id: "item-1",
    productId: "",
    productName: "",
    bagWeight: "",
    quantity: "",
    manualProduct: false,
  };
}



function formatNumber(
  value: number
): string {
  if (!Number.isFinite(value)) {
    return "۰";
  }

  return new Intl.NumberFormat(
    "fa-IR",
    {
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function normalizeDigits(
  value: string
): string {
  return value
    .replace(
      /[۰-۹]/g,
      (digit) =>
        String(
          "۰۱۲۳۴۵۶۷۸۹".indexOf(
            digit
          )
        )
    )
    .replace(/٬/g, "")
    .replace(/٫/g, ".")
    .replace(/،/g, ".");
}

function normalizeDecimal(
  value: string
): number {
  const normalized =
    normalizeDigits(
      value
    ).trim();

  if (!normalized) {
    return 0;
  }

  const result =
    Number(normalized);

  return Number.isFinite(result)
    ? result
    : 0;
}

function customerTypeLabel(
  value:
    | string
    | null
    | undefined
): string {
  const labels: Record<
    string,
    string
  > = {
    building_material_store:
      "مصالح‌فروشی",
    building_material_stores:
      "مصالح‌فروشی",
    contractor:
      "پیمانکار",
    contractor_company:
      "پیمانکار",
    employer:
      "کارفرما",
    employers:
      "کارفرما",
    plasterer:
      "گچ‌کار",
    plaster_worker:
      "گچ‌کار",
    plasterer_company:
      "گچ‌کار",
    distributor:
      "توزیع‌کننده",
    retailer:
      "خرده‌فروشی",
  };

  return value
    ? labels[value] ?? value
    : "نامشخص";
}

function OrderStep({
  number,
  title,
  description,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
        {icon}

        <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black">
          {number}
        </span>
      </div>

      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function SectionCard({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md md:p-7">
      {children}
    </section>
  );
}

function SummaryItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? "border-emerald-400/20 bg-emerald-500/10"
          : "border-white/10 bg-white/5"
      }`}
    >
      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p
        className={`mt-2 truncate font-black ${
          highlight
            ? "text-emerald-300"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ProductItemPreview({
  item,
}: {
  item: OrderItemForm;
}) {
  const weight =
    normalizeDecimal(
      item.bagWeight
    );

  const quantity =
    normalizeDecimal(
      item.quantity
    );

  const tonnage =
    weight > 0 &&
    quantity > 0
      ? (weight * quantity) /
        1000
      : 0;

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-800">
            {item.productName ||
              "نام کالا وارد نشده"}
          </p>

          {item.manualProduct && (
            <span className="mt-1 inline-flex rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">
              محصول دستی
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-lg bg-white px-2.5 py-1.5 font-bold text-slate-600 ring-1 ring-slate-200">
            {quantity > 0
              ? `${formatNumber(
                  quantity
                )} کیسه`
              : "تعداد نامشخص"}
          </span>

          <span className="rounded-lg bg-white px-2.5 py-1.5 font-bold text-slate-600 ring-1 ring-slate-200">
            {weight > 0
              ? `${formatNumber(
                  weight
                )} کیلو`
              : "وزن نامشخص"}
          </span>

          <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 font-black text-emerald-700 ring-1 ring-emerald-100">
            {tonnage > 0
              ? `${formatNumber(
                  tonnage
                )} تن`
              : "۰ تن"}
          </span>
        </div>
      </div>
    </div>
  );
}

function NewOrderForm() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const customerIdFromUrl =
    searchParams.get(
      "customerId"
    ) ?? "";

  const [today] =
    useState<JalaliDate>(
      () => getTodayJalali()
    );

  const [jalaliYear, setJalaliYear] =
    useState(
      String(today.year)
    );

  const [jalaliMonth, setJalaliMonth] =
    useState(
      String(today.month)
    );

  const [jalaliDay, setJalaliDay] =
    useState(
      String(today.day)
    );

  const [
    customers,
    setCustomers,
  ] = useState<Customer[]>([]);

  const [
    salesUsers,
    setSalesUsers,
  ] = useState<SalesUser[]>([]);

  const [
    products,
    setProducts,
  ] = useState<Product[]>([]);

  const [
    loadingCustomers,
    setLoadingCustomers,
  ] = useState(true);

  const [
    loadingUsers,
    setLoadingUsers,
  ] = useState(true);

  const [
    loadingProducts,
    setLoadingProducts,
  ] = useState(true);

  const [
    customerSearch,
    setCustomerSearch,
  ] = useState("");

  const [
    showCustomerResults,
    setShowCustomerResults,
  ] = useState(false);

  const [
    selectedCustomer,
    setSelectedCustomer,
  ] = useState<Customer | null>(
    null
  );

  const [
    selectedSalesUser,
    setSelectedSalesUser,
  ] = useState<SalesUser | null>(
    null
  );

  const [
    salesUserSearch,
    setSalesUserSearch,
  ] = useState("");

  const [
    showSalesUsers,
    setShowSalesUsers,
  ] = useState(false);

  const [
    status,
    setStatus,
  ] = useState<OrderStatus>(
    "draft"
  );

  const [
    source,
    setSource,
  ] = useState("manual");

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    items,
    setItems,
  ] = useState<OrderItemForm[]>([
    createInitialOrderItem(),
  ]);

  const itemCounterRef =
    useRef(1);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  /* ========================================================
     LOAD CUSTOMERS
     ======================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadCustomers() {
      try {
        setLoadingCustomers(true);
        setError("");

        const result =
          await customersService.getAll();

        if (!mounted) {
          return;
        }

        setCustomers(
          result
        );

        if (customerIdFromUrl) {
          const customerFromUrl =
            result.find(
              (customer) =>
                customer.id ===
                customerIdFromUrl
            );

          if (customerFromUrl) {
            setSelectedCustomer(
              customerFromUrl
            );

            setCustomerSearch(
              customerFromUrl.name
            );

            setShowCustomerResults(
              false
            );
          } else {
            setSelectedCustomer(null);
            setCustomerSearch("");

            setError(
              "مشتری انتخاب‌شده پیدا نشد."
            );
          }
        }
      } catch (err) {
        if (!mounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "خطا در دریافت مشتریان."
        );
      } finally {
        if (mounted) {
          setLoadingCustomers(false);
        }
      }
    }

    void loadCustomers();

    return () => {
      mounted = false;
    };
  }, [customerIdFromUrl]);

  /* ========================================================
     LOAD SALES USERS
     ======================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      try {
        setLoadingUsers(true);

        const result =
          await usersService.getSalesUsers();

        if (mounted) {
          setSalesUsers(
            result
          );
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "خطا در دریافت بازاریابان."
          );
        }
      } finally {
        if (mounted) {
          setLoadingUsers(false);
        }
      }
    }

    void loadUsers();

    return () => {
      mounted = false;
    };
  }, []);

  /* ========================================================
     LOAD PRODUCTS
     ======================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      try {
        setLoadingProducts(true);

        const result =
          await ordersService.getProducts();

        if (mounted) {
          setProducts(
            result as Product[]
          );
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "خطا در دریافت محصولات."
          );
        }
      } finally {
        if (mounted) {
          setLoadingProducts(false);
        }
      }
    }

    void loadProducts();

    return () => {
      mounted = false;
    };
  }, []);

  /* ========================================================
     CUSTOMER SEARCH
     ======================================================== */

  const filteredCustomers =
    useMemo(() => {
      const query =
        customerSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return customers.slice(
          0,
          12
        );
      }

      return customers
        .filter((customer) => {
          const name =
            customer.name?.toLowerCase() ??
            "";

          const phone =
            customer.phone?.toLowerCase() ??
            "";

          const code =
            customer.code?.toLowerCase() ??
            "";

          return (
            name.includes(query) ||
            phone.includes(query) ||
            code.includes(query)
          );
        })
        .slice(
          0,
          12
        );
    }, [
      customers,
      customerSearch,
    ]);

  /* ========================================================
     SALES USER SEARCH
     ======================================================== */

  const filteredSalesUsers =
    useMemo(() => {
      const query =
        salesUserSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return salesUsers.slice(
          0,
          10
        );
      }

      return salesUsers
        .filter((user) => {
          const name =
            user.full_name?.toLowerCase() ??
            "";

          const phone =
            user.phone?.toLowerCase() ??
            "";

          const code =
            user.employee_code?.toLowerCase() ??
            "";

          return (
            name.includes(query) ||
            phone.includes(query) ||
            code.includes(query)
          );
        })
        .slice(
          0,
          10
        );
    }, [
      salesUsers,
      salesUserSearch,
    ]);

  /* ========================================================
     CUSTOMER
     ======================================================== */

  function selectCustomer(
    customer: Customer
  ) {
    setSelectedCustomer(
      customer
    );

    setCustomerSearch(
      customer.name
    );

    setShowCustomerResults(
      false
    );
  }

  function clearCustomer() {
    setSelectedCustomer(
      null
    );

    setCustomerSearch("");

    setShowCustomerResults(
      true
    );
  }

  /* ========================================================
     SALES USER
     ======================================================== */

  function selectSalesUser(
    user: SalesUser
  ) {
    setSelectedSalesUser(
      user
    );

    setSalesUserSearch(
      user.full_name
    );

    setShowSalesUsers(
      false
    );
  }

  function clearSalesUser() {
    setSelectedSalesUser(
      null
    );

    setSalesUserSearch("");

    setShowSalesUsers(
      true
    );
  }

  /* ========================================================
     ORDER ITEMS
     ======================================================== */

  function updateItem(
    id: string,
    patch: Partial<OrderItemForm>
  ) {
    setItems((current) =>
      current.map(
        (item) =>
          item.id === id
            ? {
                ...item,
                ...patch,
              }
            : item
      )
    );
  }

  function addItem() {
    itemCounterRef.current +=
      1;

    const nextId =
      `item-${itemCounterRef.current}`;

    setItems((current) => [
      ...current,
      {
        id: nextId,
        productId: "",
        productName: "",
        bagWeight: "",
        quantity: "",
        manualProduct: false,
      },
    ]);
  }

  function removeItem(
    id: string
  ) {
    setItems((current) => {
      if (
        current.length ===
        1
      ) {
        return [
          {
            id: current[0].id,
            productId: "",
            productName: "",
            bagWeight: "",
            quantity: "",
            manualProduct: false,
          },
        ];
      }

      return current.filter(
        (item) =>
          item.id !== id
      );
    });
  }

  function handleProductChange(
    id: string,
    value: string
  ) {
    if (
      value ===
      MANUAL_PRODUCT_VALUE
    ) {
      updateItem(
        id,
        {
          productId: "",
          productName: "",
          bagWeight: "",
          quantity: "",
          manualProduct: true,
        }
      );

      return;
    }

    const product =
      products.find(
        (item) =>
          item.id === value
      );

    if (!product) {
      updateItem(
        id,
        {
          productId: "",
          productName: "",
          bagWeight: "",
          manualProduct: false,
        }
      );

      return;
    }

    updateItem(
      id,
      {
        productId:
          product.id,
        productName:
          product.name,
        bagWeight:
          String(
            product.weight_kg
          ),
        manualProduct:
          false,
      }
    );
  }

  function setBagWeight(
    id: string,
    weight: string
  ) {
    updateItem(
      id,
      {
        bagWeight:
          weight,
      }
    );
  }

  const itemCalculations =
    useMemo(() => {
      return items.map(
        (item) => {
          const weight =
            normalizeDecimal(
              item.bagWeight
            );

          const quantity =
            normalizeDecimal(
              item.quantity
            );

          const tonnage =
            weight > 0 &&
            quantity > 0
              ? (weight *
                  quantity) /
                1000
              : 0;

          return {
            id: item.id,
            weight,
            quantity,
            tonnage,
          };
        }
      );
    }, [items]);

  const calculatedTotalTonnage =
    useMemo(() => {
      return itemCalculations.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.tonnage,
        0
      );
    }, [
      itemCalculations,
    ]);

  const filledItems =
    useMemo(() => {
      return items.filter(
        (item) =>
          item.productId.trim() ||
          item.productName.trim() ||
          item.bagWeight.trim() ||
          item.quantity.trim()
      );
    }, [items]);

  /* ========================================================
     SUBMIT
     ======================================================== */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedCustomer) {
      setError(
        "لطفاً مشتری را انتخاب کنید."
      );
      return;
    }

    if (!selectedSalesUser) {
      setError(
        "لطفاً بازاریاب را انتخاب کنید."
      );
      return;
    }

    if (
      !jalaliYear ||
      !jalaliMonth ||
      !jalaliDay
    ) {
      setError(
        "تاریخ سفارش هنوز آماده نشده است."
      );
      return;
    }

    const year =
      Number(
        normalizeDigits(
          jalaliYear
        )
      );

    const month =
      Number(
        normalizeDigits(
          jalaliMonth
        )
      );

    const day =
      Number(
        normalizeDigits(
          jalaliDay
        )
      );

    const jalaliDate: JalaliDate =
      {
        year,
        month,
        day,
      };

    if (
      !isValidJalaliDate(
        jalaliDate
      )
    ) {
      setError(
        "تاریخ جلالی واردشده معتبر نیست."
      );
      return;
    }

    if (
      filledItems.length ===
      0
    ) {
      setError(
        "حداقل یک قلم کالا به سفارش اضافه کنید."
      );
      return;
    }

    for (
      const item of filledItems
    ) {
      if (
        !item.productId &&
        !item.manualProduct
      ) {
        setError(
          "برای هر قلم سفارش یک کالا انتخاب کنید."
        );
        return;
      }

      if (
        item.manualProduct &&
        !item.productName.trim()
      ) {
        setError(
          "برای محصول جدید نام کالا را وارد کنید."
        );
        return;
      }

      const weight =
        normalizeDecimal(
          item.bagWeight
        );

      if (
        !Number.isFinite(
          weight
        ) ||
        weight <= 0
      ) {
        setError(
          `وزن کیسه برای "${item.productName || "این کالا"}" باید بیشتر از صفر باشد.`
        );
        return;
      }

      const quantity =
        normalizeDecimal(
          item.quantity
        );

      if (
        !Number.isFinite(
          quantity
        ) ||
        quantity <= 0
      ) {
        setError(
          `تعداد کیسه برای "${item.productName || "این کالا"}" باید بیشتر از صفر باشد.`
        );
        return;
      }

      if (
        !Number.isInteger(
          quantity
        )
      ) {
        setError(
          `تعداد کیسه برای "${item.productName || "این کالا"}" باید عدد صحیح باشد.`
        );
        return;
      }
    }

    if (
      !Number.isFinite(
        calculatedTotalTonnage
      ) ||
      calculatedTotalTonnage <= 0
    ) {
      setError(
        "تناژ سفارش باید بیشتر از صفر باشد."
      );
      return;
    }

    const orderItems: OrderItemInput[] =
      filledItems.map(
        (item) => ({
          product_id:
            item.productId.trim() ||
            null,

          product_name_snapshot:
            item.productName.trim(),

          quantity:
            Math.trunc(
              normalizeDecimal(
                item.quantity
              )
            ),

          /*
           * سرویس orders این مقدار را
           * برای سازگاری می‌پذیرد؛
           * مقدار واقعی snapshot توسط Trigger
           * دیتابیس تعیین می‌شود.
           */
          weight_kg_snapshot:
            Math.round(
              normalizeDecimal(
                item.bagWeight
              )
            ),

          /*
           * تناژ Generated است و orders.ts
           * آن را در INSERT ارسال نمی‌کند.
           */
          bag_weight_kg:
            normalizeDecimal(
              item.bagWeight
            ),

          /*
           * برای سازگاری TypeScript مقدار می‌دهیم،
           * اما orders.ts آن را به دیتابیس ارسال نمی‌کند.
           */
          tonnage:
            normalizeDecimal(
              item.bagWeight
            ) *
            Math.trunc(
              normalizeDecimal(
                item.quantity
              )
            ) /
            1000,
        })
      );

    setSaving(true);

    try {
      const input:
        CreateOrderInput =
        {
          company_id:
            COMPANY_ID,

          customer_id:
            selectedCustomer.id,

          sales_user_id:
            selectedSalesUser.id,

          order_date:
            jalaliToGregorianDate(
              jalaliDate
            ),

          status,

          /*
           * مجموع اولیه‌ای که در فرم دیده می‌شود.
           * بعد از ثبت order_items، Trigger دیتابیس
           * مقدار نهایی orders.total_tonnage را refresh می‌کند.
           */
          total_tonnage:
            calculatedTotalTonnage,

          notes:
            notes.trim() ||
            null,

          source:
            source.trim() ||
            "manual",

          items:
            orderItems,
        };

      const order =
        await ordersService.create(
          input
        );

      setSuccess(
        "سفارش با موفقیت ثبت شد."
      );

      window.setTimeout(
        () => {
          router.push(
            `/orders/${order.id}`
          );
        },
        500
      );
    } catch (err) {
      console.error(
        "New order submit error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "خطا در ثبت سفارش."
      );
    } finally {
      setSaving(false);
    }
  }

  const submitDisabled =
    Boolean(
      saving ||
        loadingCustomers ||
        loadingUsers ||
        loadingProducts ||
        !selectedCustomer ||
        !selectedSalesUser ||
        !jalaliYear ||
        !jalaliMonth ||
        !jalaliDay
    );

  return (
    <main
      dir="rtl"
      className="mx-auto max-w-[1300px] space-y-6 pb-14"
    >
      {/* =====================================================
          HEADER
          ===================================================== */}

      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-slate-900 via-violet-600 to-blue-600" />

        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-100/40 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl" />

        <div className="relative flex flex-col gap-6 p-6 md:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-violet-600 text-white shadow-lg">
              <ShoppingCart size={25} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                  ثبت سفارش جدید
                </h1>

                {customerIdFromUrl && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                    مشتری از پروفایل
                  </span>
                )}
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500 md:text-base">
                سفارش مشتری را با اطلاعات کامل،
                اقلام کالا و تاریخ جلالی ثبت کنید.
              </p>
            </div>
          </div>

          <Link
            href="/orders"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            بازگشت به سفارش‌ها
            <ArrowLeft size={16} />
          </Link>
        </div>
      </section>

      {/* =====================================================
          ALERTS
          ===================================================== */}

      {error && (
        <section className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
          <div className="h-1 bg-red-500" />

          <div className="flex items-start gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <X size={18} />
            </div>

            <div>
              <p className="font-black text-red-800">
                ثبت سفارش انجام نشد
              </p>

              <p className="mt-1 text-sm leading-6 text-red-600">
                {error}
              </p>
            </div>
          </div>
        </section>
      )}

      {success && (
        <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
          <div className="h-1 bg-emerald-500" />

          <div className="flex items-start gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={19} />
            </div>

            <div>
              <p className="font-black text-emerald-800">
                سفارش با موفقیت ثبت شد
              </p>

              <p className="mt-1 text-sm text-emerald-600">
                در حال انتقال به جزئیات سفارش...
              </p>
            </div>
          </div>
        </section>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* ===================================================
            CUSTOMER
            =================================================== */}

        <SectionCard>
          <OrderStep
            number="۱"
            title="انتخاب مشتری"
            description="نام، شماره تلفن یا کد مشتری را جستجو و انتخاب کنید."
            icon={<Users size={21} />}
          />

          {selectedCustomer ? (
            <div className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white">
              <div className="p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white shadow-sm">
                      {selectedCustomer.name?.charAt(
                        0
                      ) || "م"}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-black text-slate-900">
                          {selectedCustomer.name}
                        </h3>

                        {selectedCustomer.is_vip && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                            ★ VIP
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                        {selectedCustomer.phone && (
                          <span
                            dir="ltr"
                            className="inline-flex items-center gap-1"
                          >
                            📞
                            {
                              selectedCustomer.phone
                            }
                          </span>
                        )}

                        {selectedCustomer.customer_type && (
                          <span>
                            نوع:{" "}
                            {customerTypeLabel(
                              selectedCustomer.customer_type
                            )}
                          </span>
                        )}

                        {selectedCustomer.code && (
                          <span>
                            کد:{" "}
                            {
                              selectedCustomer.code
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={
                      clearCustomer
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    <RefreshCw size={15} />
                    تغییر مشتری
                  </button>
                </div>
              </div>

              {customerIdFromUrl && (
                <div className="border-t border-blue-100 bg-blue-50/60 px-5 py-3 text-xs font-medium text-blue-700">
                  این مشتری از پروفایل مشتری به‌صورت خودکار انتخاب شده است.
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <label
                htmlFor="customer-search"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                مشتری
              </label>

              <div className="relative">
                <Search
                  size={17}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="customer-search"
                  type="text"
                  value={
                    customerSearch
                  }
                  onChange={(event) => {
                    setCustomerSearch(
                      event.target.value
                    );

                    setSelectedCustomer(
                      null
                    );

                    setShowCustomerResults(
                      true
                    );
                  }}
                  onFocus={() =>
                    setShowCustomerResults(
                      true
                    )
                  }
                  placeholder="نام مشتری، شماره تماس یا کد مشتری..."
                  autoComplete="off"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pr-11 pl-14 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />

                {loadingCustomers && (
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    در حال دریافت...
                  </span>
                )}

                {!loadingCustomers &&
                  customerSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerSearch(
                          ""
                        );

                        setSelectedCustomer(
                          null
                        );

                        setShowCustomerResults(
                          true
                        );
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label="پاک کردن جستجو"
                    >
                      <X size={16} />
                    </button>
                  )}
              </div>

              {showCustomerResults && (
                <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="max-h-80 overflow-auto">
                    {filteredCustomers.length ===
                    0 ? (
                      <div className="p-8 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                          <Search size={21} />
                        </div>

                        <p className="mt-3 text-sm font-bold text-slate-700">
                          مشتری پیدا نشد
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          عبارت جستجو را تغییر دهید.
                        </p>
                      </div>
                    ) : (
                      filteredCustomers.map(
                        (customer) => (
                          <button
                            key={
                              customer.id
                            }
                            type="button"
                            onClick={() =>
                              selectCustomer(
                                customer
                              )
                            }
                            className="block w-full border-b border-slate-100 px-5 py-4 text-right transition last:border-b-0 hover:bg-blue-50/60"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-700">
                                {customer.name?.charAt(
                                  0
                                ) || "م"}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-bold text-slate-900">
                                    {
                                      customer.name
                                    }
                                  </p>

                                  {customer.is_vip && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                      VIP
                                    </span>
                                  )}
                                </div>

                                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                                  {customer.phone && (
                                    <span dir="ltr">
                                      {
                                        customer.phone
                                      }
                                    </span>
                                  )}

                                  {customer.code && (
                                    <span>
                                      کد:{" "}
                                      {
                                        customer.code
                                      }
                                    </span>
                                  )}

                                  {customer.customer_type && (
                                    <span>
                                      {
                                        customerTypeLabel(
                                          customer.customer_type
                                        )
                                      }
                                    </span>
                                  )}
                                </div>
                              </div>

                              <ChevronLeft
                                size={18}
                                className="shrink-0 text-slate-300"
                              />
                            </div>
                          </button>
                        )
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* ===================================================
            SALES USER
            =================================================== */}

        <SectionCard>
          <OrderStep
            number="۲"
            title="انتخاب بازاریاب"
            description="بازاریاب مسئول این سفارش را انتخاب کنید."
            icon={
              <UserRound size={21} />
            }
          />

          {selectedSalesUser ? (
            <div className="overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white">
              <div className="p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-lg font-black text-white shadow-sm">
                      {selectedSalesUser.full_name?.charAt(
                        0
                      ) || "ب"}
                    </div>

                    <div>
                      <p className="text-xs font-bold text-violet-600">
                        بازاریاب انتخاب‌شده
                      </p>

                      <h3 className="mt-1 text-lg font-black text-slate-900">
                        {
                          selectedSalesUser.full_name
                        }
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                        {selectedSalesUser.job_title && (
                          <span>
                            {
                              selectedSalesUser.job_title
                            }
                          </span>
                        )}

                        {selectedSalesUser.phone && (
                          <span dir="ltr">
                            {
                              selectedSalesUser.phone
                            }
                          </span>
                        )}

                        {selectedSalesUser.employee_code && (
                          <span>
                            کد:{" "}
                            {
                              selectedSalesUser.employee_code
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={
                      clearSalesUser
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    <RefreshCw size={15} />
                    تغییر بازاریاب
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <label
                htmlFor="sales-user-search"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                بازاریاب
              </label>

              <div className="relative">
                <UserRound
                  size={17}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="sales-user-search"
                  type="text"
                  value={
                    salesUserSearch
                  }
                  onChange={(event) => {
                    setSalesUserSearch(
                      event.target.value
                    );

                    setSelectedSalesUser(
                      null
                    );

                    setShowSalesUsers(
                      true
                    );
                  }}
                  onFocus={() =>
                    setShowSalesUsers(
                      true
                    )
                  }
                  placeholder="نام بازاریاب را جستجو کنید..."
                  autoComplete="off"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pr-11 pl-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-50"
                />

                {loadingUsers && (
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    در حال دریافت...
                  </span>
                )}
              </div>

              {showSalesUsers && (
                <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="max-h-72 overflow-auto">
                    {filteredSalesUsers.length ===
                    0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">
                        بازاریاب فعالی پیدا نشد.
                      </div>
                    ) : (
                      filteredSalesUsers.map(
                        (user) => (
                          <button
                            key={
                              user.id
                            }
                            type="button"
                            onClick={() =>
                              selectSalesUser(
                                user
                              )
                            }
                            className="block w-full border-b border-slate-100 px-5 py-4 text-right transition last:border-b-0 hover:bg-violet-50/60"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-sm font-black text-violet-700">
                                {user.full_name?.charAt(
                                  0
                                ) || "ب"}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-900">
                                  {
                                    user.full_name
                                  }
                                </p>

                                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                                  {user.job_title && (
                                    <span>
                                      {
                                        user.job_title
                                      }
                                    </span>
                                  )}

                                  {user.phone && (
                                    <span dir="ltr">
                                      {
                                        user.phone
                                      }
                                    </span>
                                  )}

                                  {user.employee_code && (
                                    <span>
                                      کد:{" "}
                                      {
                                        user.employee_code
                                      }
                                    </span>
                                  )}
                                </div>
                              </div>

                              <ChevronLeft
                                size={18}
                                className="shrink-0 text-slate-300"
                              />
                            </div>
                          </button>
                        )
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* ===================================================
            ORDER ITEMS
            =================================================== */}

        <SectionCard>
          <OrderStep
            number="۳"
            title="اقلام سفارش"
            description="محصول را از فهرست انتخاب کنید یا محصول جدید را دستی اضافه کنید. سپس وزن کیسه و تعداد کیسه را تعیین کنید."
            icon={
              <Package size={21} />
            }
          />

          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                <Package size={18} />
              </div>

              <div>
                <p className="text-sm font-black text-blue-900">
                  محاسبه خودکار تناژ
                </p>

                <p className="mt-1 text-xs leading-6 text-blue-700">
                  تناژ هر قلم از حاصل‌ضرب تعداد کیسه در وزن هر کیسه محاسبه می‌شود و مجموع آن به‌عنوان تناژ سفارش ثبت خواهد شد.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {items.map(
              (item, index) => {
                const calculation =
                  itemCalculations.find(
                    (
                      entry
                    ) =>
                      entry.id ===
                      item.id
                  );

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5"
                  >
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold text-blue-600">
                          قلم سفارش{" "}
                          {formatNumber(
                            index + 1
                          )}
                        </p>

                        <p className="mt-1 text-sm font-black text-slate-800">
                          مشخصات کالا
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeItem(
                            item.id
                          )
                        }
                        className="inline-flex w-fit items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
                      >
                        <Trash2 size={14} />
                        حذف قلم
                      </button>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px]">
                      {/* Product */}

                      <div>
                        <label
                          htmlFor={`product-${item.id}`}
                          className="mb-2 block text-sm font-bold text-slate-700"
                        >
                          نام کالا
                        </label>

                        <div className="relative">
                          <FileText
                            size={17}
                            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                          />

                          <select
                            id={`product-${item.id}`}
                            value={
                              item.manualProduct
                                ? MANUAL_PRODUCT_VALUE
                                : item.productId
                            }
                            onChange={(
                              event
                            ) =>
                              handleProductChange(
                                item.id,
                                event
                                  .target
                                  .value
                              )
                            }
                            disabled={
                              loadingProducts
                            }
                            className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3.5 pr-11 pl-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                          >
                            <option value="">
                              {loadingProducts
                                ? "در حال دریافت محصولات..."
                                : "انتخاب کالا"}
                            </option>

                            {products.map(
                              (
                                product
                              ) => (
                                <option
                                  key={
                                    product.id
                                  }
                                  value={
                                    product.id
                                  }
                                >
                                  {
                                    product.name
                                  }
                                  {" — "}
                                  {formatNumber(
                                    Number(
                                      product.weight_kg
                                    )
                                  )}
                                  {" کیلو"}
                                </option>
                              )
                            )}

                            <option value="separator">
                              ──────────
                            </option>

                            <option
                              value={
                                MANUAL_PRODUCT_VALUE
                              }
                            >
                              + افزودن محصول جدید
                            </option>
                          </select>
                        </div>

                        {item.manualProduct ? (
                          <div className="mt-3">
                            <label
                              htmlFor={`manual-product-name-${item.id}`}
                              className="mb-2 block text-xs font-bold text-violet-700"
                            >
                              نام محصول جدید
                            </label>

                            <input
                              id={`manual-product-name-${item.id}`}
                              type="text"
                              value={
                                item.productName
                              }
                              onChange={(
                                event
                              ) =>
                                updateItem(
                                  item.id,
                                  {
                                    productName:
                                      event
                                        .target
                                        .value,
                                  }
                                )
                              }
                              placeholder="مثلاً گچ ویژه پروژه ..."
                              className="w-full rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-50"
                            />

                            <p className="mt-2 text-xs leading-5 text-violet-600">
                              این محصول هنگام ثبت سفارش در فهرست محصولات سیستم نیز ایجاد می‌شود.
                            </p>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-slate-400">
                            محصولات فعال موجود در دیتابیس از همین فهرست قابل انتخاب هستند.
                          </p>
                        )}
                      </div>

                      {/* Bag weight */}

                      <div>
                        <label
                          htmlFor={`bag-weight-${item.id}`}
                          className="mb-2 block text-sm font-bold text-slate-700"
                        >
                          وزن هر کیسه
                        </label>

                        <div className="relative">
                          <input
                            id={`bag-weight-${item.id}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            inputMode="decimal"
                            value={
                              item.bagWeight
                            }
                            onChange={(
                              event
                            ) =>
                              setBagWeight(
                                item.id,
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="مثلاً ۲۵"
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pl-16 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                          />

                          <span className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-700">
                            کیلو
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {DEFAULT_BAG_WEIGHTS.map(
                            (
                              weight
                            ) => (
                              <button
                                key={
                                  weight
                                }
                                type="button"
                                onClick={() =>
                                  setBagWeight(
                                    item.id,
                                    weight
                                  )
                                }
                                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                                  item.bagWeight ===
                                  weight
                                    ? "bg-emerald-600 text-white"
                                    : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-700"
                                }`}
                              >
                                {formatNumber(
                                  Number(
                                    weight
                                  )
                                )}{" "}
                                کیلو
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {/* Quantity */}

                      <div>
                        <label
                          htmlFor={`quantity-${item.id}`}
                          className="mb-2 block text-sm font-bold text-slate-700"
                        >
                          تعداد کیسه
                        </label>

                        <div className="relative">
                          <input
                            id={`quantity-${item.id}`}
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={
                              item.quantity
                            }
                            onChange={(
                              event
                            ) =>
                              updateItem(
                                item.id,
                                {
                                  quantity:
                                    event
                                      .target
                                      .value,
                                }
                              )
                            }
                            placeholder="مثلاً ۴۰۰"
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-4 pl-20 text-lg font-black text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                          />

                          <span className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-black text-blue-700">
                            کیسه
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-slate-400">
                          تعداد بسته‌های این کالا را وارد کنید.
                        </p>
                      </div>
                    </div>

                    {/* Calculation */}

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-bold text-slate-400">
                          وزن هر کیسه
                        </p>

                        <p className="mt-1 text-lg font-black text-slate-800">
                          {calculation &&
                          calculation.weight >
                            0
                            ? `${formatNumber(
                                calculation.weight
                              )} کیلو`
                            : "—"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-bold text-slate-400">
                          تعداد
                        </p>

                        <p className="mt-1 text-lg font-black text-slate-800">
                          {calculation &&
                          calculation.quantity >
                            0
                            ? `${formatNumber(
                                calculation.quantity
                              )} کیسه`
                            : "—"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                        <p className="text-xs font-bold text-emerald-600">
                          تناژ این قلم
                        </p>

                        <p className="mt-1 text-lg font-black text-emerald-800">
                          {calculation &&
                          calculation.tonnage >
                            0
                            ? `${formatNumber(
                                calculation.tonnage
                              )} تن`
                            : "۰ تن"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
            )}

            <button
              type="button"
              onClick={addItem}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-300 bg-blue-50/50 px-5 py-4 text-sm font-black text-blue-700 transition hover:border-blue-400 hover:bg-blue-50"
            >
              <Plus size={18} />
              افزودن کالای دیگر
            </button>

            {filledItems.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400">
                      خلاصه اقلام
                    </p>

                    <p className="mt-1 text-sm font-black text-slate-800">
                      {formatNumber(
                        filledItems.length
                      )}{" "}
                      قلم کالا
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3">
                    <p className="text-xs font-bold text-emerald-600">
                      مجموع تناژ
                    </p>

                    <p className="mt-1 text-xl font-black text-emerald-800">
                      {formatNumber(
                        calculatedTotalTonnage
                      )}{" "}
                      تن
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {filledItems.map(
                    (item) => (
                      <ProductItemPreview
                        key={
                          item.id
                        }
                        item={
                          item
                        }
                      />
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ===================================================
            ORDER INFORMATION
            =================================================== */}

        <SectionCard>
          <OrderStep
            number="۴"
            title="اطلاعات سفارش"
            description="تاریخ و وضعیت سفارش را مشخص کنید."
            icon={
              <ClipboardList size={21} />
            }
          />

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Date */}

            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <FileText size={17} />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-800">
                    تاریخ سفارش
                  </label>

                  <span className="text-xs text-slate-400">
                    تقویم جلالی
                  </span>
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
                    inputMode="numeric"
                    value={jalaliYear}
                    onChange={(
                      event
                    ) =>
                      setJalaliYear(
                        normalizeDigits(
                          event
                            .target
                            .value
                        )
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
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
                    value={jalaliMonth}
                    onChange={(
                      event
                    ) =>
                      setJalaliMonth(
                        event
                          .target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  >
                    {Array.from(
                      {
                        length: 12,
                      },
                      (
                        _,
                        index
                      ) => {
                        const value =
                          index +
                          1;

                        return (
                          <option
                            key={
                              value
                            }
                            value={
                              value
                            }
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
                    value={jalaliDay}
                    onChange={(
                      event
                    ) =>
                      setJalaliDay(
                        event
                          .target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  >
                    {Array.from(
                      {
                        length: 31,
                      },
                      (
                        _,
                        index
                      ) => {
                        const value =
                          index +
                          1;

                        return (
                          <option
                            key={
                              value
                            }
                            value={
                              value
                            }
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

              <div className="mt-4 flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-slate-100">
                <span className="text-xs text-slate-500">
                  تاریخ امروز
                </span>

                <span className="text-sm font-black text-slate-800">
                  {formatNumber(
                    today.year
                  )}
                  /
                  {formatNumber(
                    today.month
                  )}
                  /
                  {formatNumber(
                    today.day
                  )}
                </span>
              </div>
            </div>

            {/* Total */}

            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Package size={17} />
                </div>

                <div>
                  <p className="text-sm font-black text-slate-800">
                    تناژ کل سفارش
                  </p>

                  <span className="text-xs text-slate-400">
                    محاسبه‌شده از اقلام سفارش
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-white p-5">
                <p className="text-xs font-bold text-emerald-600">
                  تعداد کل اقلام
                </p>

                <p className="mt-1 text-lg font-black text-slate-800">
                  {formatNumber(
                    filledItems.length
                  )}{" "}
                  قلم
                </p>

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold text-emerald-600">
                    مجموع تناژ
                  </p>

                  <p className="mt-1 text-3xl font-black text-emerald-800">
                    {formatNumber(
                      calculatedTotalTonnage
                    )}{" "}
                    <span className="text-base">
                      تن
                    </span>
                  </p>
                </div>

                <p className="mt-3 text-xs leading-6 text-slate-400">
                  این مقدار از تعداد کیسه و وزن هر کیسه محاسبه شده و در زمان ثبت با محاسبه دیتابیس همگام می‌شود.
                </p>
              </div>
            </div>

            {/* Status */}

            <div>
              <label
                htmlFor="order-status"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                وضعیت سفارش
              </label>

              <select
                id="order-status"
                value={status}
                onChange={(
                  event
                ) =>
                  setStatus(
                    event.target
                      .value as OrderStatus
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              >
                <option value="draft">
                  پیش‌نویس
                </option>

                <option value="confirmed">
                  تأیید شده
                </option>

                <option value="cancelled">
                  لغو شده
                </option>
              </select>
            </div>

            {/* Source */}

            <div>
              <label
                htmlFor="order-source"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                منبع سفارش
              </label>

              <select
                id="order-source"
                value={source}
                onChange={(
                  event
                ) =>
                  setSource(
                    event.target
                      .value
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              >
                <option value="manual">
                  ثبت دستی توسط CRM
                </option>

                <option value="mobile_app">
                  اپلیکیشن موبایل
                </option>

                <option value="whatsapp">
                  واتساپ
                </option>

                <option value="sms">
                  پیامک
                </option>

                <option value="pwa">
                  PWA
                </option>

                <option value="api">
                  API
                </option>
              </select>
            </div>
          </div>

          {/* Notes */}

          <div className="mt-6">
            <label
              htmlFor="order-notes"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              توضیحات سفارش
            </label>

            <textarea
              id="order-notes"
              value={notes}
              onChange={(
                event
              ) =>
                setNotes(
                  event.target
                    .value
                )
              }
              rows={4}
              placeholder="توضیحات مربوط به سفارش، درخواست مشتری یا نکات مهم..."
              className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>
        </SectionCard>

        {/* ===================================================
            FINAL SUMMARY
            =================================================== */}

        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 text-white shadow-xl">
          <div className="p-6 md:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400">
                  پیش‌نمایش
                </p>

                <h2 className="mt-1 text-xl font-black">
                  خلاصه سفارش
                </h2>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-slate-300">
                <ClipboardList size={14} />
                بررسی قبل از ثبت
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryItem
                label="مشتری"
                value={
                  selectedCustomer?.name ??
                  "انتخاب نشده"
                }
              />

              <SummaryItem
                label="بازاریاب"
                value={
                  selectedSalesUser?.full_name ??
                  "انتخاب نشده"
                }
              />

              <SummaryItem
                label="تناژ کل"
                value={
                  calculatedTotalTonnage >
                  0
                    ? `${formatNumber(
                        calculatedTotalTonnage
                      )} تن`
                    : "۰ تن"
                }
                highlight
              />

              <SummaryItem
                label="تعداد اقلام"
                value={`${formatNumber(
                  filledItems.length
                )} قلم`}
              />

              <SummaryItem
                label="تاریخ"
                value={`${formatNumber(
                  Number(
                    jalaliYear
                  )
                )}/${formatNumber(
                  Number(
                    jalaliMonth
                  )
                )}/${formatNumber(
                  Number(
                    jalaliDay
                  )
                )}`}
              />

              <SummaryItem
                label="وضعیت"
                value={
                  status ===
                  "draft"
                    ? "پیش‌نویس"
                    : status ===
                      "confirmed"
                    ? "تأیید شده"
                    : "لغو شده"
                }
              />
            </div>
          </div>
        </section>

        {/* ===================================================
            ACTIONS
            =================================================== */}

        <div className="sticky bottom-4 z-20">
          <div className="flex flex-col-reverse gap-3 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/orders"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              انصراف
            </Link>

            <button
              type="submit"
              disabled={
                submitDisabled
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-8 py-3.5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw
                    size={17}
                    className="animate-spin"
                  />

                  در حال ثبت سفارش...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  ثبت سفارش
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense
      fallback={
        <main
          dir="rtl"
          className="mx-auto max-w-[1300px]"
        >
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 animate-pulse bg-slate-200" />

            <div className="p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ShoppingCart
                  size={25}
                  className="animate-pulse"
                />
              </div>

              <p className="mt-4 text-sm font-bold text-slate-600">
                در حال بارگذاری فرم ثبت سفارش...
              </p>

              <div className="mx-auto mt-5 h-2 w-48 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-500" />
              </div>
            </div>
          </div>
        </main>
      }
    >
      <NewOrderForm />
    </Suspense>
  );
}
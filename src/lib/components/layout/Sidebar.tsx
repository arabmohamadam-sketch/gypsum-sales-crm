"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import {
  Activity,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  LayoutDashboard,
  PanelRightClose,
  PanelRightOpen,
  Phone,
  PlusCircle,
  Settings,
  ShoppingCart,
  Sparkles,
  Target,
  Truck,
  Users,
  X,
} from "lucide-react";

type MenuItem = {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
};

const menus: MenuItem[] = [
  {
    title: "داشبورد",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "مشتریان",
    href: "/customers",
    icon: Users,
  },
  {
    title: "سفارش‌ها",
    href: "/orders",
    icon: ShoppingCart,
  },
  {
    title: "حواله‌ها",
    href: "/waybills",
    icon: Truck,
  },
  {
    title: "فعالیت‌ها",
    href: "/activities",
    icon: Activity,
  },
  {
    title: "اهداف فروش",
    href: "/targets",
    icon: Target,
  },
  {
    title: "گزارش‌ها",
    href: "/reports",
    icon: BarChart3,
  },
  {
    title: "هوش مصنوعی",
    href: "/",
    icon: Bot,
  },
  {
    title: "تنظیمات",
    href: "/settings",
    icon: Settings,
  },
];

const mobileMenus: MenuItem[] = [
  menus[0],
  menus[1],
  menus[2],
  menus[4],
  {
    title: "ثبت سفارش",
    href: "/orders/new",
    icon: PlusCircle,
  },
];

const STORAGE_KEY = "crm-sidebar-collapsed";

function isMenuActive(
  pathname: string,
  href: string,
): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

/**
 * Sidebar collapse state
 *
 * useSyncExternalStore is used so that:
 * - we don't call setState inside an effect
 * - SSR remains stable
 * - localStorage state is preserved
 * - state can update immediately in the current tab
 */
const sidebarCollapsedStore = {
  getSnapshot(): boolean {
    try {
      return (
        window.localStorage.getItem(STORAGE_KEY) ===
        "true"
      );
    } catch {
      return false;
    }
  },

  getServerSnapshot(): boolean {
    return false;
  },

  subscribe(callback: () => void): () => void {
    const handleStorage = (
      event: StorageEvent,
    ) => {
      if (event.key === STORAGE_KEY) {
        callback();
      }
    };

    window.addEventListener(
      "storage",
      handleStorage,
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage,
      );
    };
  },
};

type SidebarContentProps = {
  collapsed?: boolean;
  mobile?: boolean;
  pathname: string;
  onNavigate?: () => void;
  onToggle?: () => void;
};

function SidebarContent({
  collapsed = false,
  mobile = false,
  pathname,
  onNavigate,
  onToggle,
}: SidebarContentProps) {
  const showCompact = !mobile && collapsed;

  return (
    <div className="flex h-full w-full flex-col">
      {/* =========================
          BRAND
      ========================== */}
      <div
        className={`relative overflow-hidden border-b border-white/10 ${
          showCompact
            ? "px-2 pb-4 pt-5"
            : "px-6 pb-5 pt-6"
        }`}
      >
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />

        <div
          className={`relative flex items-center ${
            showCompact
              ? "justify-center"
              : "gap-3"
          }`}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-lg font-black text-slate-950 shadow-lg shadow-amber-500/20">
            گچ
          </div>

          <div
            className={`min-w-0 overflow-hidden transition-all duration-300 ease-out ${
              showCompact
                ? "pointer-events-none max-w-0 -translate-x-2 opacity-0"
                : "max-w-[180px] translate-x-0 opacity-100"
            }`}
          >
            <h1 className="truncate text-lg font-black tracking-tight">
              گچ آهوان
            </h1>

            <p className="mt-1 whitespace-nowrap text-xs text-slate-400">
              CRM مدیریت فروش
            </p>
          </div>
        </div>

        <div
          className={`relative overflow-hidden transition-all duration-300 ease-out ${
            showCompact
              ? "mt-0 max-h-0 -translate-y-2 opacity-0"
              : "mt-4 max-h-20 translate-y-0 opacity-100"
          }`}
        >
          <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.04] px-3 py-2.5">
            <Sparkles
              size={15}
              className="shrink-0 text-amber-400"
            />

            <span className="whitespace-nowrap text-xs font-medium text-slate-300">
              نسخه هوشمند فروش
            </span>

            <span className="mr-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              فعال
            </span>
          </div>
        </div>

        {/* Desktop Collapse Toggle */}
        {!mobile && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={
              collapsed
                ? "باز کردن منوی کناری"
                : "بستن منوی کناری"
            }
            title={
              collapsed
                ? "باز کردن منوی کناری"
                : "بستن منوی کناری"
            }
            className={`absolute top-4 z-20 hidden h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-400 shadow-lg shadow-black/10 transition-all duration-200 hover:bg-white/[0.1] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 lg:flex ${
              collapsed
                ? "left-1/2 -translate-x-1/2"
                : "left-3"
            }`}
          >
            {collapsed ? (
              <PanelRightOpen size={17} />
            ) : (
              <PanelRightClose size={17} />
            )}
          </button>
        )}
      </div>

      {/* =========================
          QUICK ORDER
      ========================== */}
      <div
        className={`transition-all duration-300 ease-out ${
          showCompact
            ? "px-2 py-4"
            : "px-4 py-5"
        }`}
      >
        {showCompact ? (
          <div className="group relative">
            <Link
              href="/orders/new"
              onClick={onNavigate}
              aria-label="ثبت سفارش جدید"
              title="ثبت سفارش جدید"
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-l from-blue-600 via-blue-600 to-cyan-500 shadow-lg shadow-blue-950/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/80"
            >
              <PlusCircle size={19} />
            </Link>

            <div className="pointer-events-none absolute right-full top-1/2 z-50 mr-3 -translate-y-1/2 translate-x-2 whitespace-nowrap rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-white opacity-0 shadow-xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
              ثبت سفارش جدید
            </div>
          </div>
        ) : (
          <Link
            href="/orders/new"
            onClick={onNavigate}
            className="group flex w-full items-center justify-between rounded-2xl bg-gradient-to-l from-blue-600 via-blue-600 to-cyan-500 px-4 py-3.5 shadow-lg shadow-blue-950/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/80"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <PlusCircle size={19} />
              </div>

              <div className="text-right">
                <p className="text-sm font-black">
                  ثبت سفارش جدید
                </p>

                <p className="mt-0.5 text-[11px] text-blue-100">
                  ایجاد سریع سفارش
                </p>
              </div>
            </div>

            <ChevronLeft
              size={17}
              className="transition-transform duration-200 group-hover:-translate-x-1"
            />
          </Link>
        )}
      </div>

      {/* =========================
          NAVIGATION
      ========================== */}
      <div
        className={`flex-1 overflow-y-auto overflow-x-visible pb-5 transition-all duration-300 ${
          showCompact ? "px-2" : "px-4"
        }`}
      >
        <div
          className={`mb-3 flex items-center ${
            showCompact
              ? "justify-center px-0"
              : "justify-between px-3"
          }`}
        >
          <p
            className={`overflow-hidden whitespace-nowrap text-[11px] font-bold tracking-wide text-slate-500 transition-all duration-300 ${
              showCompact
                ? "w-0 max-w-0 opacity-0"
                : "w-auto max-w-full opacity-100"
            }`}
          >
            منوی اصلی
          </p>

          <ClipboardList
            size={14}
            className="shrink-0 text-slate-600"
          />
        </div>

        <nav className="space-y-1.5">
          {menus.map((item) => {
            const Icon = item.icon;
            const active = isMenuActive(
              pathname,
              item.href,
            );
            const isAI = item.title === "هوش مصنوعی";

            {/* Compact desktop */}
            if (showCompact) {
              return (
                <div
                  key={item.title}
                  className="group relative"
                >
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={
                      active ? "page" : undefined
                    }
                    aria-label={item.title}
                    title={item.title}
                    className={`relative flex h-12 w-full items-center justify-center rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/80 ${
                      active
                        ? "bg-white text-slate-950 shadow-lg shadow-black/10"
                        : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    {active && (
                      <span className="absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-l-full bg-blue-500" />
                    )}

                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ${
                        active
                          ? "bg-blue-600 text-white"
                          : isAI
                            ? "bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20 group-hover:text-violet-300"
                            : "bg-white/[0.04] text-slate-400 group-hover:bg-white/[0.08] group-hover:text-white"
                      }`}
                    >
                      <Icon size={18} />
                    </span>
                  </Link>

                  <div className="pointer-events-none absolute right-full top-1/2 z-50 mr-3 -translate-y-1/2 translate-x-2 whitespace-nowrap rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-white opacity-0 shadow-xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                    {item.title}
                  </div>
                </div>
              );
            }

            {/* Full desktop */}
            return (
              <Link
                key={item.title}
                href={item.href}
                onClick={onNavigate}
                aria-current={
                  active ? "page" : undefined
                }
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/80 ${
                  active
                    ? "bg-white text-slate-950 shadow-lg shadow-black/10"
                    : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                {active && (
                  <span className="absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-l-full bg-blue-500" />
                )}

                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                    active
                      ? "bg-blue-600 text-white"
                      : isAI
                        ? "bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20 group-hover:text-violet-300"
                        : "bg-white/[0.04] text-slate-400 group-hover:bg-white/[0.08] group-hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                </span>

                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {item.title}
                </span>

                {isAI && (
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      active
                        ? "bg-violet-100 text-violet-700"
                        : "bg-violet-500/10 text-violet-300"
                    }`}
                  >
                    <CheckCircle2 size={10} />
                    فعال
                  </span>
                )}

                {active && !isAI && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* =========================
            AI SHORTCUT
        ========================== */}
        <div
          className={`relative mt-5 overflow-hidden rounded-2xl border border-violet-500/10 bg-violet-500/[0.04] transition-all duration-300 ${
            showCompact ? "p-2" : "p-3"
          }`}
        >
          {showCompact ? (
            <div className="group relative flex justify-center">
              <Link
                href="/"
                onClick={onNavigate}
                aria-label="پیشنهادهای هوشمند"
                title="پیشنهادهای هوشمند"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300 transition hover:bg-violet-500/20 hover:text-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70"
              >
                <Sparkles size={17} />
              </Link>

              <div className="pointer-events-none absolute right-full top-1/2 z-50 mr-3 -translate-y-1/2 translate-x-2 whitespace-nowrap rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-white opacity-0 shadow-xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                پیشنهادهای هوشمند
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                <Sparkles size={16} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold text-violet-200">
                  پیشنهاد هوشمند فعال است
                </p>

                <p className="mt-1 text-[10px] leading-5 text-slate-500">
                  اولویت تماس مشتریان بر اساس سابقه فروش و فعالیت CRM
                  محاسبه می‌شود.
                </p>

                <Link
                  href="/"
                  onClick={onNavigate}
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-violet-300 transition hover:text-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70"
                >
                  مشاهده پیشنهادها
                  <ChevronLeft size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* =========================
            ACTIVITIES SHORTCUTS
        ========================== */}
        {(pathname.startsWith("/activities") ||
          pathname.startsWith("/customers/")) && (
          <div
            className={`mt-5 overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] transition-all duration-300 ${
              showCompact ? "p-2" : "p-3"
            }`}
          >
            {showCompact ? (
              <div className="space-y-2">
                <div className="group relative flex justify-center">
                  <Link
                    href="/activities/calls/new"
                    onClick={onNavigate}
                    aria-label="ثبت تماس جدید"
                    title="ثبت تماس جدید"
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-blue-400 transition hover:bg-white/[0.06] hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70"
                  >
                    <Phone size={17} />
                  </Link>

                  <div className="pointer-events-none absolute right-full top-1/2 z-50 mr-3 -translate-y-1/2 translate-x-2 whitespace-nowrap rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-white opacity-0 shadow-xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                    ثبت تماس جدید
                  </div>
                </div>

                <div className="group relative flex justify-center">
                  <Link
                    href="/activities/follow-ups/new"
                    onClick={onNavigate}
                    aria-label="ثبت پیگیری جدید"
                    title="ثبت پیگیری جدید"
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-emerald-400 transition hover:bg-white/[0.06] hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
                  >
                    <Target size={17} />
                  </Link>

                  <div className="pointer-events-none absolute right-full top-1/2 z-50 mr-3 -translate-y-1/2 translate-x-2 whitespace-nowrap rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-white opacity-0 shadow-xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                    ثبت پیگیری جدید
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p className="px-2 pb-2 text-[10px] font-bold text-slate-500">
                  دسترسی سریع فعالیت‌ها
                </p>

                <div className="space-y-1">
                  <Link
                    href="/activities/calls/new"
                    onClick={onNavigate}
                    className="flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70"
                  >
                    <Phone
                      size={15}
                      className="text-blue-400"
                    />
                    ثبت تماس جدید
                  </Link>

                  <Link
                    href="/activities/follow-ups/new"
                    onClick={onNavigate}
                    className="flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
                  >
                    <Target
                      size={15}
                      className="text-emerald-400"
                    />
                    ثبت پیگیری جدید
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* =========================
          USER
      ========================== */}
      <div
        className={`border-t border-white/10 transition-all duration-300 ${
          showCompact ? "p-2" : "p-4"
        }`}
      >
        {showCompact ? (
          <div className="group relative flex justify-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-600 text-sm font-black text-white shadow-sm">
              م
            </div>

            <div className="pointer-events-none absolute right-full top-1/2 z-50 mr-3 -translate-y-1/2 translate-x-2 whitespace-nowrap rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-white opacity-0 shadow-xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
              محمد عرب · مدیر فروش
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-600 text-sm font-black text-white shadow-sm">
                م
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">
                  محمد عرب
                </p>

                <p className="mt-1 truncate text-xs text-slate-400">
                  مدیر فروش
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>

              سیستم فعال است
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  const collapsed = useSyncExternalStore(
    sidebarCollapsedStore.subscribe,
    sidebarCollapsedStore.getSnapshot,
    sidebarCollapsedStore.getServerSnapshot,
  );

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const handleDesktopToggle = () => {
    const nextValue = !collapsed;

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        String(nextValue),
      );

      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: String(nextValue),
        }),
      );
    } catch {
      // Ignore localStorage failures.
    }
  };

  const closeMobile = () => {
    setMobileOpen(false);
  };

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [mobileOpen]);

  return (
    <>
      {/* =========================
          DESKTOP SIDEBAR
      ========================== */}
      <aside
        dir="rtl"
        className={`sticky top-0 hidden h-screen shrink-0 overflow-visible border-l border-slate-200 bg-slate-950 text-white transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:flex ${
          collapsed
            ? "w-[76px]"
            : "w-[280px]"
        }`}
      >
        <SidebarContent
          collapsed={collapsed}
          pathname={pathname}
          onToggle={handleDesktopToggle}
        />
      </aside>

      {/* =========================
          MOBILE DRAWER TRIGGER
      ========================== */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="باز کردن منوی اصلی"
        title="منوی اصلی"
        className="fixed bottom-24 right-4 z-[60] flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-2xl shadow-slate-400/40 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 active:scale-95 lg:hidden"
      >
        <PanelRightOpen size={19} />
      </button>

      {/* =========================
          MOBILE DRAWER
      ========================== */}
      <div
        className={`fixed inset-0 z-[100] lg:hidden ${
          mobileOpen
            ? "pointer-events-auto"
            : "pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          onClick={closeMobile}
          aria-label="بستن منوی اصلی"
          className={`absolute inset-0 bg-slate-950/55 backdrop-blur-[2px] transition-opacity duration-300 ease-out ${
            mobileOpen
              ? "opacity-100"
              : "opacity-0"
          }`}
        />

        <aside
          dir="rtl"
          aria-label="منوی اصلی"
          className={`absolute right-0 top-0 flex h-full w-[min(88vw,360px)] flex-col overflow-hidden border-l border-white/10 bg-slate-950 text-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            mobileOpen
              ? "translate-x-0"
              : "translate-x-full"
          }`}
        >
          <div className="absolute left-3 top-4 z-20">
            <button
              type="button"
              onClick={closeMobile}
              aria-label="بستن منوی اصلی"
              title="بستن منوی اصلی"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-400 transition hover:bg-white/[0.1] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 active:scale-95"
            >
              <X size={17} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <SidebarContent
              pathname={pathname}
              mobile
              onNavigate={closeMobile}
            />
          </div>
        </aside>
      </div>

      {/* =========================
          MOBILE BOTTOM NAVIGATION
      ========================== */}
      <div
        dir="rtl"
        className="fixed inset-x-2 bottom-2 z-50 lg:hidden"
      >
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white/95 p-2 shadow-2xl shadow-slate-300/50 backdrop-blur-xl">
          <div className="grid grid-cols-5 gap-1">
            {mobileMenus.map((item) => {
              const Icon = item.icon;

              const active = isMenuActive(
                pathname,
                item.href,
              );

              const isCreateOrder =
                item.href === "/orders/new";

              return (
                <Link
                  key={`${item.href}-${item.title}`}
                  href={item.href}
                  aria-current={
                    active ? "page" : undefined
                  }
                  className={`group flex min-h-[64px] items-center justify-center rounded-2xl px-1.5 py-2 transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 ${
                    isCreateOrder
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                      : active
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex flex-col items-center justify-center">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                        isCreateOrder
                          ? "bg-white/10"
                          : active
                            ? "bg-white/10"
                            : "bg-transparent"
                      }`}
                    >
                      <Icon
                        size={
                          isCreateOrder
                            ? 19
                            : 18
                        }
                      />
                    </span>

                    <span className="mt-1 text-[10px] font-bold leading-none">
                      {item.title}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
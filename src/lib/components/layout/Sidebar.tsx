"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Activity,
  BarChart3,
  Bot,
  ChevronLeft,
  ClipboardList,
  LayoutDashboard,
  Phone,
  PlusCircle,
  Settings,
  ShoppingCart,
  Sparkles,
  Target,
  Truck,
  Users,
} from "lucide-react";

type MenuItem = {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
  comingSoon?: boolean;
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
    href: "#",
    icon: Target,
    comingSoon: true,
  },
  {
    title: "گزارش‌ها",
    href: "#",
    icon: BarChart3,
    comingSoon: true,
  },
  {
    title: "هوش مصنوعی",
    href: "#",
    icon: Bot,
    comingSoon: true,
  },
  {
    title: "تنظیمات",
    href: "#",
    icon: Settings,
    comingSoon: true,
  },
];

function isMenuActive(
  pathname: string,
  href: string
): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

export default function Sidebar() {
  const pathname = usePathname();

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

  return (
    <>
      {/* =========================
          DESKTOP SIDEBAR
      ========================== */}

      <aside
        dir="rtl"
        className="sticky top-0 hidden h-screen w-[280px] shrink-0 overflow-hidden border-l border-slate-200 bg-slate-950 text-white lg:flex"
      >
        <div className="flex h-full w-full flex-col">
          {/* Brand */}

          <div className="relative overflow-hidden border-b border-white/10 px-6 pb-5 pt-6">
            <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />

            <div className="relative flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-lg font-black text-slate-950 shadow-lg shadow-amber-500/20">
                گچ
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-lg font-black tracking-tight">
                  گچ آهوان
                </h1>

                <p className="mt-1 text-xs text-slate-400">
                  CRM مدیریت فروش
                </p>
              </div>
            </div>

            <div className="relative mt-4 flex items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.04] px-3 py-2.5">
              <Sparkles
                size={15}
                className="shrink-0 text-amber-400"
              />

              <span className="text-xs font-medium text-slate-300">
                نسخه هوشمند فروش
              </span>

              <span className="mr-auto rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                فعال
              </span>
            </div>
          </div>

          {/* Quick Order */}

          <div className="px-4 py-5">
            <Link
              href="/orders/new"
              className="group flex w-full items-center justify-between rounded-2xl bg-gradient-to-l from-blue-600 via-blue-600 to-cyan-500 px-4 py-3.5 shadow-lg shadow-blue-950/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
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
          </div>

          {/* Navigation */}

          <div className="flex-1 overflow-y-auto px-4 pb-5">
            <div className="mb-3 flex items-center justify-between px-3">
              <p className="text-[11px] font-bold tracking-wide text-slate-500">
                منوی اصلی
              </p>

              <ClipboardList
                size={14}
                className="text-slate-600"
              />
            </div>

            <nav className="space-y-1.5">
              {menus.map((item) => {
                const Icon = item.icon;

                if (
                  item.comingSoon ||
                  item.href === "#"
                ) {
                  return (
                    <div
                      key={item.title}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-right text-slate-500"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.03] text-slate-500">
                          <Icon size={18} />
                        </span>

                        <span className="text-sm font-medium">
                          {item.title}
                        </span>
                      </span>

                      <span className="rounded-full border border-white/5 bg-white/[0.04] px-2 py-0.5 text-[9px] font-medium text-slate-600">
                        به‌زودی
                      </span>
                    </div>
                  );
                }

                const active = isMenuActive(
                  pathname,
                  item.href
                );

                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 ${
                      active
                        ? "bg-white text-slate-950 shadow-lg shadow-black/10"
                        : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    {active && (
                      <span className="absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-l-full bg-blue-500" />
                    )}

                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                        active
                          ? "bg-blue-600 text-white"
                          : "bg-white/[0.04] text-slate-400 group-hover:bg-white/[0.08] group-hover:text-white"
                      }`}
                    >
                      <Icon size={18} />
                    </span>

                    <span className="flex-1 text-sm font-semibold">
                      {item.title}
                    </span>

                    {active && (
                      <span className="h-2 w-2 rounded-full bg-blue-600" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Activities shortcuts */}

            {(pathname.startsWith("/activities") ||
              pathname.startsWith("/customers/")) && (
              <div className="mt-5 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                <p className="px-2 pb-2 text-[10px] font-bold text-slate-500">
                  دسترسی سریع فعالیت‌ها
                </p>

                <div className="space-y-1">
                  <Link
                    href="/activities/calls/new"
                    className="flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    <Phone
                      size={15}
                      className="text-blue-400"
                    />

                    ثبت تماس جدید
                  </Link>

                  <Link
                    href="/activities/follow-ups/new"
                    className="flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    <Target
                      size={15}
                      className="text-emerald-400"
                    />

                    ثبت پیگیری جدید
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User */}

          <div className="border-t border-white/10 p-4">
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
          </div>
        </div>
      </aside>

      {/* =========================
          MOBILE NAVIGATION
      ========================== */}

      <div
        dir="rtl"
        className="fixed inset-x-2 bottom-2 z-50 lg:hidden"
      >
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white/95 p-2 shadow-2xl shadow-slate-300/50 backdrop-blur-xl">
          <div className="grid grid-cols-5 gap-1">
            {mobileMenus.map((item) => {
              const Icon = item.icon;

              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href ||
                    pathname.startsWith(
                      `${item.href}/`
                    );

              const isCreateOrder =
                item.href ===
                "/orders/new";

              return (
                <Link
                  key={`${item.href}-${item.title}`}
                  href={item.href}
                  aria-current={
                    active
                      ? "page"
                      : undefined
                  }
                  className={`group flex min-h-[64px] items-center justify-center rounded-2xl px-1.5 py-2 transition-all duration-200 active:scale-95 ${
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